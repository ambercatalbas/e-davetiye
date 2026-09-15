// ============================================================
//  E-Davetiye — iyzico ödeme (kademeli: Filigransız / Premium Etkinlik)
//  Sunucu tarafı: secret key yalnız burada; istemciye asla gitmez.
//  - odemeBaslat  (POST): davetiye + ürün için iyzico CheckoutForm başlatır → paymentPageUrl
//  - odemeCallback (POST): iyzico dönüşü; ödemeyi DOĞRULAR → invitations/{id}.plan + entitlements
//  - olayKaydet   (POST): gizlilik dostu funnel sayaçları (kişisel veri YOK)
//
//  Ürün kataloğu `config/plans.json` ile AYNI olmalıdır (tek doğru kaynak orada).
//  Bu dosyadaki PLANLAR yalnızca satın alınabilir tek seferlik ürünlerin sunucu
//  kopyasıdır; plans.json değişince buradaki price/limits/features güncellenmeli.
//
//  Test: iyzico SANDBOX örnek anahtarları (herkese açık). CANLI için
//  `firebase functions:config:set iyzico.api_key=... iyzico.secret_key=... iyzico.uri=https://api.iyzipay.com`
//  ya da ortam değişkenleri (IYZICO_API_KEY / IYZICO_SECRET_KEY / IYZICO_URI).
// ============================================================
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const Iyzipay = require("iyzipay");

admin.initializeApp();

let _cfg = {};
try { _cfg = functions.config().iyzico || {}; } catch (e) { _cfg = {}; }

// Örnek (herkese açık) sandbox anahtarları — yalnızca test içindir.
const ORNEK_API = "sandbox-afXhZPW0MQlE4dCUUlHcEopnMBgXnAZI";
const ORNEK_SECRET = "sandbox-wbwpzKIiplZxI3hh5ALI4FJyAcZKL6kq";

const IYZICO = {
  apiKey: process.env.IYZICO_API_KEY || _cfg.api_key || ORNEK_API,
  secretKey: process.env.IYZICO_SECRET_KEY || _cfg.secret_key || ORNEK_SECRET,
  uri: process.env.IYZICO_URI || _cfg.uri || "https://sandbox-api.iyzipay.com",
};
const iyzipay = new Iyzipay(IYZICO);

// Güvenlik: örnek sandbox anahtarlarıyla CANLI uca (api.iyzipay.com) gidilemez.
// Yanlış yapılandırmada gerçek para çekilmesini/başarısız işlemleri önler.
const ORNEK_ANAHTAR = IYZICO.apiKey === ORNEK_API || IYZICO.secretKey === ORNEK_SECRET;
const CANLI_UC = /(^|\.)api\.iyzipay\.com/.test(IYZICO.uri) && !/sandbox/.test(IYZICO.uri);
const TEST_MODU = ORNEK_ANAHTAR || !CANLI_UC;
if (ORNEK_ANAHTAR && CANLI_UC) {
  console.error("YAPILANDIRMA HATASI: örnek sandbox anahtarı + canlı uç. Ödeme reddedilecek.");
}

const PROJE = process.env.GCLOUD_PROJECT || "e-davetiye-94b6b";
const BOLGE = "us-central1";
const CALLBACK_URL = `https://${BOLGE}-${PROJE}.cloudfunctions.net/odemeCallback`;
const SITE = process.env.SITE_URL || "https://davet.ambersf.com";

// --- Ürün kataloğu (config/plans.json ile senkron) ---
// price = KDV DAHİL, TRY toplam. rank = yükseltme sırası (asla düşürme yapılmaz).
const PLANLAR = {
  premium_watermark: {
    ad: "Filigransız Davetiye",
    price: 99.9,
    rank: 1,
    features: ["all_templates", "countdown", "whatsapp_share", "qr", "remove_watermark"],
    limits: { activeInvitations: 1, rsvpsPerInvitation: 30, photos: 12, teamMembers: 1, publishDays: 90 },
  },
  premium_event: {
    ad: "Premium Etkinlik",
    price: 499,
    rank: 2,
    features: ["all_templates", "countdown", "whatsapp_share", "qr", "custom_slug", "remove_watermark", "gallery", "music", "schedule", "map", "gift_block", "analytics", "csv_export", "reminders"],
    limits: { activeInvitations: 1, rsvpsPerInvitation: 500, photos: 20, teamMembers: 2, publishDays: 365 },
  },
};
const RANK = { free: 0, premium_watermark: 1, premium_event: 2, pro_monthly: 3 };
const tl = (n) => Number(n).toFixed(2); // iyzico "99.90" biçimi

function cors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

// Alıcı bilgisini doğrula — mesafeli satış/fatura için gerçek kimlik gerekir.
// Sahte/sabit değerler (ör. 11111111111) reddedilir.
function aliciDogrula(a) {
  a = a || {};
  const s = (v) => String(v == null ? "" : v).trim();
  const ad = s(a.name), soyad = s(a.surname), email = s(a.email);
  const gsm = s(a.gsm).replace(/[^\d+]/g, "");
  const tckn = s(a.identityNumber).replace(/\D/g, "");
  const sehir = s(a.city), adres = s(a.address);
  if (ad.length < 2 || soyad.length < 2) return { hata: "ad ve soyad gerekli" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { hata: "geçerli e-posta gerekli" };
  if (gsm.replace(/\D/g, "").length < 10) return { hata: "geçerli telefon gerekli" };
  if (tckn.length !== 11 || /^(\d)\1{10}$/.test(tckn) || tckn[0] === "0") return { hata: "geçerli T.C. kimlik no gerekli" };
  if (sehir.length < 2 || adres.length < 5) return { hata: "il ve adres gerekli" };
  return {
    ok: true,
    buyer: { name: ad, surname: soyad, email, gsm, identityNumber: tckn, city: sehir, address: adres },
  };
}

// --- Ödeme başlat ---
exports.odemeBaslat = functions.region(BOLGE).https.onRequest(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ hata: "yalnız POST" });

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const inviteId = String(body.inviteId || "").slice(0, 64);
  if (!inviteId) return res.status(400).json({ hata: "inviteId gerekli" });

  // Ürün seç (geriye dönük: eski istemci ürün göndermezse Filigransız).
  const urunId = String(body.urun || body.planId || "premium_watermark");
  const urun = PLANLAR[urunId];
  if (!urun) return res.status(400).json({ hata: "geçersiz ürün" });

  const d = aliciDogrula(body.buyer);
  if (d.hata) return res.status(400).json({ hata: d.hata });
  const b = d.buyer;

  const fiyat = tl(urun.price);
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const istek = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: inviteId,
    price: fiyat,
    paidPrice: fiyat, // KDV dahil toplam
    currency: Iyzipay.CURRENCY.TRY,
    basketId: inviteId,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl: CALLBACK_URL,
    enabledInstallments: [1, 2, 3, 6],
    buyer: {
      id: inviteId,
      name: b.name,
      surname: b.surname,
      gsmNumber: b.gsm.startsWith("+") ? b.gsm : "+90" + b.gsm.replace(/^0/, ""),
      email: b.email,
      identityNumber: b.identityNumber,
      lastLoginDate: now,
      registrationDate: now,
      registrationAddress: b.address,
      ip: req.ip || req.headers["x-forwarded-for"] || "85.34.78.112",
      city: b.city,
      country: "Turkey",
      zipCode: "34000",
    },
    shippingAddress: { contactName: b.name + " " + b.surname, city: b.city, country: "Turkey", address: b.address, zipCode: "34000" },
    billingAddress: { contactName: b.name + " " + b.surname, city: b.city, country: "Turkey", address: b.address, zipCode: "34000" },
    basketItems: [
      { id: urunId, name: urun.ad, category1: "Dijital", itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL, price: fiyat },
    ],
  };

  iyzipay.checkoutFormInitialize.create(istek, async (err, result) => {
    if (err || !result || result.status !== "success") {
      console.error("iyzico init hata:", err || (result && result.errorMessage));
      return res.status(502).json({ hata: "ödeme başlatılamadı", detay: (result && result.errorMessage) || String(err) });
    }
    // Sipariş kaydı (order_id + idempotency). Kişisel veri minimumda: TCKN saklanmaz.
    try {
      await admin.firestore().doc("orders/" + result.token).set({
        inviteId, planId: urunId, price: urun.price, currency: "TRY",
        durum: "beklemede", test: TEST_MODU,
        aliciAd: b.name + " " + b.surname, aliciEmail: b.email,
        olusturma: FieldValue.serverTimestamp(),
      });
    } catch (e) { console.warn("sipariş kaydı:", e); }
    res.json({ paymentPageUrl: result.paymentPageUrl, token: result.token, price: fiyat, planId: urunId });
  });
});

// --- Ürün analitiği / funnel (#44): gizlilik dostu, olay tabanlı sayaçlar ---
// İstemci yalnız anonim olay tipi gönderir (kişisel veri YOK). Sayaçlar admin SDK
// ile toplanır; okuma yalnız admin e-postasına açıktır (firestore.rules).
const OLAY_TIPLERI = [
  "kayit", "sablon", "yayin", "paylasim", "lcv",
  // Paywall / ödeme funnel'i (GELIR-MODELI.md):
  "paywall_goruntulendi", "plan_secildi", "odeme_baslatildi",
  "odeme_tamamlandi", "odeme_basarisiz", "yukseltme_kapatildi",
];
async function funnelArtir(alanlar) {
  const db = admin.firestore();
  const veri = { guncelleme: FieldValue.serverTimestamp() };
  const inc = FieldValue.increment(1);
  for (const a of alanlar) veri[a] = inc;
  await db.doc("analitik/funnel").set(veri, { merge: true });
}
exports.olayKaydet = functions.region(BOLGE).https.onRequest(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ hata: "yalnız POST" });

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const tip = String(body.tip || "");
  if (!OLAY_TIPLERI.includes(tip)) return res.status(400).json({ hata: "geçersiz tip" });

  try {
    const db = admin.firestore();
    await funnelArtir([tip]);
    // Plan bazlı funnel (yalnız plan kimliği; kişisel veri değil).
    const plan = String(body.plan || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 40);
    if (plan && RANK[plan] != null) {
      await db.doc("analitik/planlar").set({ p: { [plan]: { [tip]: FieldValue.increment(1) } } }, { merge: true });
    }
    // Şablon performansı (yalnız şablon kimliği; kişisel veri değil).
    const sablon = String(body.sablon || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
    if (sablon && (tip === "sablon" || tip === "yayin")) {
      const alan = tip === "sablon" ? "secildi" : "yayinlandi";
      await db.doc("analitik/sablonlar").set({ s: { [sablon]: { [alan]: FieldValue.increment(1) } } }, { merge: true });
    }
    res.set("Cache-Control", "no-store");
    return res.json({ ok: true });
  } catch (e) {
    console.error("olayKaydet hata:", e);
    return res.status(500).json({ hata: "kaydedilemedi" });
  }
});

// --- iyzico callback: ödemeyi doğrula ve planı/hakları aç ---
exports.odemeCallback = functions.region(BOLGE).https.onRequest((req, res) => {
  let body = req.body || {};
  if (typeof body === "string") { try { body = require("querystring").parse(body); } catch (e) { body = {}; } }
  const token = body.token || (req.query && req.query.token);
  if (!token) return res.status(400).send("token yok");

  iyzipay.checkoutForm.retrieve({ locale: Iyzipay.LOCALE.TR, token }, async (err, result) => {
    const db = admin.firestore();
    const siparisRef = db.doc("orders/" + token);
    try {
      const basarili = !err && result && result.status === "success" && result.paymentStatus === "SUCCESS";
      const siparis = (await siparisRef.get()).data() || {};

      // Idempotency: aynı callback tekrar gelirse haklar bir kez daha açılmaz.
      if (siparis.durum === "odendi") {
        return res.redirect(302, `${SITE}/?id=${encodeURIComponent(siparis.inviteId || "")}&odeme=ok`);
      }

      if (basarili) {
        const inviteId = siparis.inviteId || result.basketId || result.conversationId;
        const planId = siparis.planId && PLANLAR[siparis.planId] ? siparis.planId
          : (result.basketItems && result.basketItems[0] && PLANLAR[result.basketItems[0].id] ? result.basketItems[0].id : "premium_watermark");
        const plan = PLANLAR[planId];
        if (inviteId && plan) {
          const invRef = db.doc("invitations/" + inviteId);
          const mevcut = (await invRef.get()).data() || {};
          const mevcutRank = RANK[mevcut.plan] || (mevcut.premium ? RANK.premium_watermark : 0);
          const yeniRank = RANK[planId] || 0;
          // Asla düşürme: yalnızca daha üst plan hakları yazılır.
          if (yeniRank >= mevcutRank) {
            await invRef.set({
              plan: planId,
              entitlements: { features: plan.features, limits: plan.limits },
              planAt: FieldValue.serverTimestamp(),
              orderId: result.paymentId || null,
              premium: true, // geriye dönük uyum (filigran + premium şablon kilidi)
            }, { merge: true });
          }
          await siparisRef.set({
            durum: "odendi", paymentId: result.paymentId || null,
            odemeTarihi: FieldValue.serverTimestamp(),
          }, { merge: true });
          await funnelArtir(["odeme_tamamlandi"]);
          return res.redirect(302, `${SITE}/?id=${encodeURIComponent(inviteId)}&odeme=ok`);
        }
      }

      console.warn("ödeme başarısız/çözülemedi:", err || (result && result.errorMessage) || (result && result.paymentStatus));
      await siparisRef.set({ durum: "basarisiz", guncelleme: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
      await funnelArtir(["odeme_basarisiz"]).catch(() => {});
      return res.redirect(302, `${SITE}/?odeme=hata`);
    } catch (e) {
      console.error("callback hata:", e);
      return res.redirect(302, `${SITE}/?odeme=hata`);
    }
  });
});
