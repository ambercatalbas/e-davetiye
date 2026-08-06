# Firebase Yol Haritası (Davetiye)

Kapsam: **Firestore (LCV) · Auth · FCM (bildirim) · Analytics** — iOS + Android + Web.

Bu klasördeki hazır taslaklar:
- `firestore.rules` — güvenlik kuralları (dağıtıma hazır).
- `firebase.json` — Firebase CLI yapılandırması.
- `firebase/lcv.js` — web LCV formu (anonim giriş + Firestore'a yazma).

---

## 1) Sizde olan adım: proje + config dosyaları
[console.firebase.google.com](https://console.firebase.google.com) → **Proje oluştur** (`Davetiye`, Analytics açık). Sonra:

| Uygulama | Kimlik | İnen dosya | Konum |
|---|---|---|---|
| iOS | `com.amber.davetiye` | `GoogleService-Info.plist` | `DavetiyeIOS/Sources/` |
| Android | `com.amber.davetiye` | `google-services.json` | `DavetiyeAndroid/app/` |
| Web (`</>`) | — | `firebaseConfig` (metin) | bana verin |

Konsolda aç: **Firestore Database**, **Authentication → Google + Anonim**, **Cloud Messaging**, **Analytics**.

> ⚠️ `google-services.json` ve `GoogleService-Info.plist` **gizli sayılır** — repo'ya koymayın. `.gitignore`'a eklenecek.

---

## 2) Veri modeli
```
invitations/{id}
  { ownerUid, temaId, ustBaslik, alici, baslik, mesaj, yer,
    etkinlik: <timestamp?>, createdAt: <timestamp> }

invitations/{id}/rsvps/{rid}
  { ad, durum: "geliyorum"|"gelemiyorum", kisiSayisi, not, createdAt }
```

## 3) Mimari değişiklik — paylaşım linki
Şu an link tüm veriyi URL'e gömüyor (`#i=`). LCV için link, Firestore'daki davetiyeyi işaret etmeli:

```
https://ambercatalbas.github.io/e-davetiye/?id=<inviteId>
```
- Web sayfası `?id=` ile davetiyeyi Firestore'dan çeker, render eder ve altına **LCV formunu** koyar (`firebase/lcv.js`).
- Uygulamalar "Kaydet" anında davetiyeyi Firestore'a yazıp `id` alır; paylaş linki bu `id`yi taşır.
- Geriye dönük: `#i=` linkleri (offline/eski) çalışmaya devam eder; sadece LCV olmaz.

## 4) Uygulama entegrasyonu (config gelince ben yaparım)
**iOS (SPM):** `firebase-ios-sdk` → `FirebaseCore, FirebaseAuth, FirebaseFirestore, FirebaseMessaging, FirebaseAnalytics`. `App` içinde `FirebaseApp.configure()`. Depo → Firestore. "Yanıtlar" ekranı (canlı `snapshot` dinleyici).

**Android (Gradle):** `com.google.gms.google-services` eklentisi + `firebase-bom` → `auth, firestore, messaging, analytics`. `Depo` → Firestore. "Yanıtlar" ekranı (`addSnapshotListener`).

**Auth:** açılışta anonim; "Google ile giriş" ile hesaba yükselt → davetiyeler `ownerUid`'e bağlı, cihazlar arası senkron.

**Analytics olayları:** `davetiye_olustur`, `davetiye_paylas`, `davetiye_ac`, `lcv_gonder`.

## 5) FCM — LCV gelince host'a bildirim (Cloud Function taslağı)
`functions/index.js`:
```js
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore } = require("firebase-admin/firestore");
require("firebase-admin").initializeApp();

exports.lcvBildir = onDocumentCreated("invitations/{id}/rsvps/{rid}", async (event) => {
  const rsvp = event.data.data();
  const inv = await getFirestore().doc(`invitations/${event.params.id}`).get();
  const token = inv.get("ownerFcmToken");
  if (!token) return;
  await getMessaging().send({
    token,
    notification: {
      title: "Yeni LCV",
      body: `${rsvp.ad} — ${rsvp.durum === "geliyorum" ? "Geliyorum" : "Gelemiyorum"}`
    }
  });
});
```
(Uygulamalar açılışta kendi FCM token'ını davetiye/kullanıcı belgesine yazar.)

## 6) Dağıtım komutları
```bash
npm i -g firebase-tools
firebase login
firebase use --add            # projeyi seç (.firebaserc oluşur)
firebase deploy --only firestore:rules
firebase deploy --only functions   # FCM fonksiyonu için (functions/ hazırlanınca)
```

## 7) LCV formu için eklenecek CSS (index.html)
`firebase/lcv.js` şu sınıfları kullanır:
```css
.lcv-blok { width:100%; display:flex; flex-direction:column; align-items:center; gap:14px; }
.lcv-input { width:100%; max-width:340px; font-family:var(--f-serif); font-size:1rem;
             color:var(--ink); background:var(--card); border:1px solid var(--hairline);
             border-radius:6px; padding:12px 14px; }
.lcv-not { min-height:70px; resize:vertical; }
.lcv-kisi { display:flex; align-items:center; gap:10px; }
.lcv-kisi-etiket { font-family:var(--f-sans); font-size:.7rem; letter-spacing:.16em;
                   text-transform:uppercase; color:var(--ink-soft); }
.lcv-kisi-input { width:90px; text-align:center; }
```

---
Bu taslaklar config'i beklemeden hazır. Projeyi oluşturup dosyaları verdiğinizde entegrasyona başlıyorum.
