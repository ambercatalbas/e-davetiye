// ============================================================
//  aiDavetiyeOner (POST) — AI Davetiye Sihirbazı uç noktası (Gen2)
//  İstemci (web/iOS/Android) Firebase ID token'ıyla çağırır (anonim yeterli):
//    Authorization: Bearer <idToken>
//    { metin, platform: "web"|"ios"|"android", bugun: "YYYY-MM-DD", girdi: "yazi"|"ses" }
//  Yanıt: { ok, sonuc: {tur, dil, tema, stilOzeti, oneriler[], bilgiler, program[], metin, eksikler[]}, kalan }
//  Hatalar: { hata: "kod", mesaj } — 400 kisa|uzun, 401 kimlik, 422 anlasilmadi|uygunsuz,
//           429 kota, 503 kapali|servis
//
//  OpenAI anahtarı Secret Manager'da (ParentAI ile aynı desen):
//    firebase functions:secrets:set OPENAI_API_KEY
//  Kullanıcı metni SAKLANMAZ ve loglanmaz (yalnız uzunluk/süre/token).
//  Aç/kapa + limitler: Firestore config/ai { acik, kullaniciGunluk, ipGunluk, genelGunluk }.
// ============================================================
"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const crypto = require("node:crypto");
const C = require("./cekirdek");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const MODEL = "gpt-4.1-mini";
const CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MOD_URL = "https://api.openai.com/v1/moderations";

// Süre bütçesi: deneme başına 25 sn, toplam 45 sn (fonksiyon zaman aşımı 60 sn'nin altında).
const DENEME_MS = 25_000;
const TOPLAM_MS = 45_000;
const MAKS_DENEME = 2;
const BEKLEME_MS = 500;

const VARSAYILAN_LIMIT = { acik: true, kullaniciGunluk: 10, ipGunluk: 30, genelGunluk: 3000 };

const IZINLI_KOKENLER = [
  /^https:\/\/davet\.ambersf\.com$/,
  /^https:\/\/ambercatalbas\.github\.io$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];

class ApiHata extends Error {
  constructor(durum, kod, mesaj) { super(mesaj); this.durum = durum; this.kod = kod; }
}

function cors(req, res) {
  const koken = req.headers.origin || "";
  if (IZINLI_KOKENLER.some((re) => re.test(koken))) {
    res.set("Access-Control-Allow-Origin", koken);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Max-Age", "3600");
}

async function kimlik(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer (.+)$/);
  if (!m) throw new ApiHata(401, "kimlik", "Oturum bulunamadı.");
  try {
    const t = await admin.auth().verifyIdToken(m[1]);
    return t.uid;
  } catch (e) {
    throw new ApiHata(401, "kimlik", "Oturum doğrulanamadı.");
  }
}

// ---- Günlük kota (Firestore transaction; başarısız çağrıda iade) ----
function gunAnahtari() {
  // İstanbul günü (UTC+3, yaz saati yok)
  return new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
}
function ipAl(req) {
  const xf = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xf || req.ip || "bilinmiyor";
}
async function ayarlarAl(db) {
  try {
    const d = (await db.doc("config/ai").get()).data() || {};
    return { ...VARSAYILAN_LIMIT, ...d };
  } catch (e) { return VARSAYILAN_LIMIT; }
}
async function kotaAyir(db, uid, ip, ayar) {
  const gun = gunAnahtari();
  const ipHash = crypto.createHash("sha256").update("dv-ai:" + ip).digest("hex").slice(0, 24);
  const refler = [
    { ref: db.doc(`aiKota/${gun}_u_${uid}`), limit: ayar.kullaniciGunluk },
    { ref: db.doc(`aiKota/${gun}_i_${ipHash}`), limit: ayar.ipGunluk },
    { ref: db.doc(`aiKota/${gun}_genel`), limit: ayar.genelGunluk },
  ];
  const silinme = Timestamp.fromMillis(Date.now() + 3 * 86400_000); // TTL politikası için
  const kalan = await db.runTransaction(async (tx) => {
    const snaplar = await Promise.all(refler.map((r) => tx.get(r.ref)));
    const sayilar = snaplar.map((s) => (s.exists && s.data().n) || 0);
    if (sayilar[2] >= refler[2].limit) throw new ApiHata(503, "kapali", "AI asistanı bugün yoğun, lütfen yarın tekrar dene.");
    if (sayilar[0] >= refler[0].limit || sayilar[1] >= refler[1].limit) {
      throw new ApiHata(429, "kota", "Bugünlük AI hakkın doldu. Yarın yeniden deneyebilir ya da galeriden seçebilirsin.");
    }
    refler.forEach((r, i) => tx.set(r.ref, { n: sayilar[i] + 1, sil: silinme }, { merge: true }));
    return refler[0].limit - sayilar[0] - 1;
  });
  const iade = () => Promise.all(refler.map((r) => r.ref.set({ n: FieldValue.increment(-1) }, { merge: true }))).catch(() => {});
  return { kalan, iade };
}

// ---- OpenAI ----
async function gonder(url, govde, anahtar, etiket, deadline) {
  const kalan = () => deadline - Date.now();
  for (let deneme = 1; ; deneme++) {
    const tekrarOlur = () => deneme < MAKS_DENEME && kalan() > BEKLEME_MS + 3_000;
    let yanit;
    try {
      yanit = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${anahtar}` },
        body: JSON.stringify(govde),
        signal: AbortSignal.timeout(Math.max(1, Math.min(DENEME_MS, kalan()))),
      });
    } catch (e) {
      if (tekrarOlur()) { await bekle(BEKLEME_MS); continue; }
      logger.error(`${etiket} ulaşılamadı`, { hata: String(e && e.name), deneme });
      throw new ApiHata(503, "servis", "AI servisine şu an ulaşılamıyor.");
    }
    if (yanit.ok) return { json: await yanit.json(), deneme };
    await yanit.text().catch(() => ""); // gövdeyi istemciye asla sızdırma
    const gecici = yanit.status === 429 || yanit.status >= 500;
    if (gecici && tekrarOlur()) { await bekle(BEKLEME_MS); continue; }
    logger.error(`${etiket} hata`, { durum: yanit.status, deneme });
    throw new ApiHata(503, "servis", "AI servisi şu an yanıt veremiyor.");
  }
}
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function moderasyon(metin, anahtar, deadline) {
  try {
    const { json } = await gonder(MOD_URL, { model: "omni-moderation-latest", input: metin }, anahtar, "moderasyon", deadline);
    return !!(json.results && json.results[0] && json.results[0].flagged);
  } catch (e) {
    return false; // moderasyon ulaşılamazsa akışı kesme (çıktı zaten şemayla sınırlı)
  }
}

async function oner(istek, anahtar) {
  const deadline = Date.now() + TOPLAM_MS;
  const govde = {
    model: MODEL,
    messages: C.mesajlarKur(istek),
    temperature: 0.6,
    max_tokens: 1400,
    response_format: C.semaKur(istek.platform),
  };
  const [bayrak, cevap] = await Promise.all([
    moderasyon(istek.metin, anahtar, deadline),
    gonder(CHAT_URL, govde, anahtar, "öneri", deadline),
  ]);
  if (bayrak) throw new ApiHata(422, "uygunsuz", "Bu anlatımla davetiye hazırlayamıyoruz. Lütfen farklı ifade et.");
  const icerik = cevap.json.choices && cevap.json.choices[0] && cevap.json.choices[0].message;
  if (icerik && icerik.refusal) throw new ApiHata(422, "uygunsuz", "Bu anlatımla davetiye hazırlayamıyoruz.");
  let ham;
  try { ham = JSON.parse((icerik && icerik.content) || ""); } catch (e) {
    throw new ApiHata(503, "servis", "AI yanıtı okunamadı, tekrar dener misin?");
  }
  return { sonuc: C.sonucuCozumle(ham, istek), kullanim: cevap.json.usage || {}, deneme: cevap.deneme };
}

// gpt-4.1-mini: $0.40 / $0.10 (önbellekli) / $1.60 — 1M token başına
function maliyetMikroUsd(u) {
  const giris = u.prompt_tokens || 0, onbellek = (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) || 0;
  return Math.round((giris - onbellek) * 0.4 + onbellek * 0.1 + (u.completion_tokens || 0) * 1.6);
}

exports.aiDavetiyeOner = onRequest(
  { region: "us-central1", secrets: [OPENAI_API_KEY], timeoutSeconds: 60, memory: "256MiB", maxInstances: 10 },
  async (req, res) => {
    cors(req, res);
    res.set("Cache-Control", "no-store");
    if (req.method === "OPTIONS") return res.status(204).send("");
    if (req.method !== "POST") return res.status(405).json({ hata: "yontem", mesaj: "Yalnız POST." });

    const basla = Date.now();
    let iade = null;
    try {
      let body = req.body || {};
      if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      const istek = C.istekDogrula(body);
      if (istek.hata === "kisa") throw new ApiHata(400, "kisa", "Biraz daha anlatır mısın? Tür, tarih ya da havası yeterli.");
      if (istek.hata === "uzun") throw new ApiHata(400, "uzun", `En fazla ${C.METIN_UST_SINIR} karakter yazabilirsin.`);

      const uid = await kimlik(req);
      const db = admin.firestore();
      const ayar = await ayarlarAl(db);
      if (!ayar.acik) throw new ApiHata(503, "kapali", "AI asistanı şu an kapalı. Galeriden seçebilirsin.");
      const kota = await kotaAyir(db, uid, ipAl(req), ayar);
      iade = kota.iade;

      const { sonuc, kullanim, deneme } = await oner(istek, OPENAI_API_KEY.value());
      if (!sonuc.davetiyeMi) {
        await iade(); iade = null;
        throw new ApiHata(422, "anlasilmadi", "Bunu bir davet olarak anlayamadım. Örneğin: “Haziranda Bodrum'da gün batımında kır düğünü”.");
      }
      logger.info("ai_oneri", {
        prompt: C.PROMPT_SURUMU, platform: istek.platform, girdi: istek.girdi, uzunluk: istek.metin.length,
        tur: sonuc.tur, ilk: sonuc.oneriler[0] && sonuc.oneriler[0].sablonId, eksik: sonuc.eksikler.length,
        ms: Date.now() - basla, deneme, girisToken: kullanim.prompt_tokens, onbellekToken: kullanim.prompt_tokens_details && kullanim.prompt_tokens_details.cached_tokens,
        cikisToken: kullanim.completion_tokens, maliyetMikroUsd: maliyetMikroUsd(kullanim),
      });
      admin.firestore().doc("analitik/funnel").set({ ai_oneri: FieldValue.increment(1) }, { merge: true }).catch(() => {});
      return res.json({ ok: true, sonuc, kalan: kota.kalan });
    } catch (e) {
      if (iade && !(e instanceof ApiHata && e.kod === "uygunsuz")) await iade();
      if (e instanceof ApiHata) {
        if (e.durum >= 500) logger.warn("ai_oneri_hata", { kod: e.kod, ms: Date.now() - basla });
        return res.status(e.durum).json({ hata: e.kod, mesaj: e.message });
      }
      logger.error("ai_oneri beklenmeyen", e);
      return res.status(500).json({ hata: "servis", mesaj: "Beklenmeyen bir hata oldu, tekrar dener misin?" });
    }
  }
);
