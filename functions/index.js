// ============================================================
//  E-Davetiye — iyzico ödeme (premium / filigran kaldırma)
//  Sunucu tarafı: secret key yalnız burada; istemciye asla gitmez.
//  - odemeBaslat  (POST): davetiye için iyzico CheckoutForm başlatır → paymentPageUrl
//  - odemeCallback (POST): iyzico dönüşü; ödemeyi DOĞRULAR → invitations/{id}.premium=true
//
//  Test: iyzico SANDBOX örnek anahtarları (herkese açık). CANLI için
//  `firebase functions:config:set iyzico.api_key=... iyzico.secret_key=... iyzico.uri=https://api.iyzipay.com`
//  ya da ortam değişkenleri (IYZICO_API_KEY / IYZICO_SECRET_KEY / IYZICO_URI).
// ============================================================
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const Iyzipay = require("iyzipay");

admin.initializeApp();

let _cfg = {};
try { _cfg = functions.config().iyzico || {}; } catch (e) { _cfg = {}; }

const IYZICO = {
  apiKey: process.env.IYZICO_API_KEY || _cfg.api_key || "sandbox-afXhZPW0MQlE4dCUUlHcEopnMBgXnAZI",
  secretKey: process.env.IYZICO_SECRET_KEY || _cfg.secret_key || "sandbox-wbwpzKIiplZxI3hh5ALI4FJyAcZKL6kq",
  uri: process.env.IYZICO_URI || _cfg.uri || "https://sandbox-api.iyzipay.com",
};
const iyzipay = new Iyzipay(IYZICO);

const PROJE = process.env.GCLOUD_PROJECT || "e-davetiye-94b6b";
const BOLGE = "us-central1";
const CALLBACK_URL = `https://${BOLGE}-${PROJE}.cloudfunctions.net/odemeCallback`;
const SITE = "https://ambercatalbas.github.io/e-davetiye";
const FIYAT = "99.90"; // premium (filigran kaldırma) — TL

function cors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

// --- Ödeme başlat ---
exports.odemeBaslat = functions.region(BOLGE).https.onRequest((req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ hata: "yalnız POST" });

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const inviteId = String(body.inviteId || "").slice(0, 64);
  if (!inviteId) return res.status(400).json({ hata: "inviteId gerekli" });

  const istek = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: inviteId,
    price: FIYAT,
    paidPrice: FIYAT,
    currency: Iyzipay.CURRENCY.TRY,
    basketId: inviteId,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl: CALLBACK_URL,
    enabledInstallments: [1, 2, 3, 6],
    buyer: {
      id: inviteId,
      name: "E-Davetiye",
      surname: "Kullanıcı",
      gsmNumber: "+905350000000",
      email: "premium@e-davetiye.app",
      identityNumber: "11111111111",
      lastLoginDate: "2020-10-05 12:43:35",
      registrationDate: "2020-10-05 12:43:35",
      registrationAddress: "Türkiye",
      ip: req.ip || req.headers["x-forwarded-for"] || "85.34.78.112",
      city: "İstanbul",
      country: "Turkey",
      zipCode: "34000",
    },
    shippingAddress: { contactName: "E-Davetiye", city: "İstanbul", country: "Turkey", address: "Türkiye", zipCode: "34000" },
    billingAddress: { contactName: "E-Davetiye", city: "İstanbul", country: "Turkey", address: "Türkiye", zipCode: "34000" },
    basketItems: [
      { id: "premium-filigran", name: "Premium — Filigransız Davetiye", category1: "Dijital", itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL, price: FIYAT },
    ],
  };

  iyzipay.checkoutFormInitialize.create(istek, (err, result) => {
    if (err || !result || result.status !== "success") {
      console.error("iyzico init hata:", err || (result && result.errorMessage));
      return res.status(502).json({ hata: "ödeme başlatılamadı", detay: (result && result.errorMessage) || String(err) });
    }
    res.json({ paymentPageUrl: result.paymentPageUrl, token: result.token });
  });
});

// --- Ürün analitiği / funnel (#44): gizlilik dostu, olay tabanlı sayaçlar ---
// İstemci yalnız anonim olay tipi gönderir (kişisel veri YOK). Sayaçlar admin SDK
// ile toplanır; okuma yalnız admin e-postasına açıktır (firestore.rules).
const OLAY_TIPLERI = ["kayit", "sablon", "yayin", "paylasim", "lcv"];
exports.olayKaydet = functions.region(BOLGE).https.onRequest(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).json({ hata: "yalnız POST" });

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const tip = String(body.tip || "");
  if (!OLAY_TIPLERI.includes(tip)) return res.status(400).json({ hata: "geçersiz tip" });

  const inc = admin.firestore.FieldValue.increment(1);
  try {
    const db = admin.firestore();
    await db.doc("analitik/funnel").set(
      { [tip]: inc, guncelleme: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    // Şablon performansı (yalnız şablon kimliği; kişisel veri değil).
    const sablon = String(body.sablon || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
    if (sablon && (tip === "sablon" || tip === "yayin")) {
      const alan = tip === "sablon" ? "secildi" : "yayinlandi";
      await db.doc("analitik/sablonlar").set({ s: { [sablon]: { [alan]: inc } } }, { merge: true });
    }
    res.set("Cache-Control", "no-store");
    return res.json({ ok: true });
  } catch (e) {
    console.error("olayKaydet hata:", e);
    return res.status(500).json({ hata: "kaydedilemedi" });
  }
});

// --- iyzico callback: ödemeyi doğrula ve premium'u aç ---
exports.odemeCallback = functions.region(BOLGE).https.onRequest((req, res) => {
  let body = req.body || {};
  if (typeof body === "string") { try { body = require("querystring").parse(body); } catch (e) { body = {}; } }
  const token = body.token || (req.query && req.query.token);
  if (!token) return res.status(400).send("token yok");

  iyzipay.checkoutForm.retrieve({ locale: Iyzipay.LOCALE.TR, token }, async (err, result) => {
    try {
      const basarili = !err && result && result.status === "success" && result.paymentStatus === "SUCCESS";
      if (basarili) {
        const inviteId = result.basketId || result.conversationId;
        if (inviteId) {
          await admin.firestore().doc("invitations/" + inviteId).set(
            {
              premium: true,
              premiumAt: admin.firestore.FieldValue.serverTimestamp(),
              premiumPaymentId: result.paymentId || null,
            },
            { merge: true }
          );
          return res.redirect(302, `${SITE}/?id=${encodeURIComponent(inviteId)}&odeme=ok`);
        }
      }
      console.warn("ödeme başarısız/çözülemedi:", err || (result && result.errorMessage) || (result && result.paymentStatus));
      return res.redirect(302, `${SITE}/?odeme=hata`);
    } catch (e) {
      console.error("callback hata:", e);
      return res.redirect(302, `${SITE}/?odeme=hata`);
    }
  });
});
