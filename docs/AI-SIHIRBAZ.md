# AI Davetiye Sihirbazı — "Anlat, biz hazırlayalım"

Kullanıcı hayalindeki davetiyeyi yazarak ya da konuşarak anlatır; AI etkinliği anlar,
katalogdan en uygun 3 şablonu seçer, bilgileri (isim, tarih, saat, mekân…) yakalar,
davetiye metnini yazar ve kullanıcıyı doldurulmuş editöre götürür.

## Mimari

```
İstemci (web / iOS / Android)
  │  Firebase ID token (anonim yeterli)
  ▼
aiDavetiyeOner  (Cloud Functions Gen2, us-central1, functions/ai/)
  ├─ verifyIdToken → günlük kota (uid 10 · IP 30 · genel 3000; config/ai ile değişir)
  ├─ OpenAI moderasyon (omni-moderation-latest)  ┐ paralel
  └─ OpenAI gpt-4.1-mini, strict JSON Schema     ┘
       · şablon id'leri platform kataloğundan ENUM → model uyduramaz
       · sunucu çıktıyı ayrıca doğrular (tarih/saat, tür eşleşmesi, web'de ≥1 ücretsiz seçenek)
```

- Anahtar Secret Manager'da: `firebase functions:secrets:set OPENAI_API_KEY` (ParentAI ile aynı desen).
- Kullanıcı metni saklanmaz/loglanmaz; log yalnız uzunluk, süre, token ve tahmini maliyet (`ai_oneri`).
- Katalog: `functions/ai/katalog.json` ← `node scripts/ai-katalog.mjs` (predeploy otomatik; `validate.mjs` senkronu denetler).
  Web 42 şablon `templates.json`'dan; mobil 10 şablon betikteki `MOBIL` listesinden (iOS/Android `Sablonlar` ile aynı id'ler).
- Aç/kapa: Firestore `config/ai` → `{ acik: false }` anında kapatır (503 `kapali`).
- `aiKota/*` dokümanlarında `sil` alanı var → Firestore TTL politikası bu alana açılabilir.

## Sözleşme

`POST https://us-central1-e-davetiye-94b6b.cloudfunctions.net/aiDavetiyeOner`
`Authorization: Bearer <Firebase ID token>`

```json
{ "metin": "…(8–1500 karakter)", "platform": "web|ios|android", "bugun": "YYYY-MM-DD", "girdi": "yazi|ses" }
```

Başarılı yanıt:

```json
{ "ok": true, "kalan": 7, "sonuc": {
  "tur": "dugun", "dil": "tr", "tema": "bohem", "stilOzeti": "Gün batımında bohem kır düğünü",
  "oneriler": [ { "sablonId": "dugun-bohem", "ad": "Toprak & Rüzgâr", "tur": "dugun", "tema": "bohem", "premium": true, "neden": "…" } ],
  "bilgiler": { "isimler": "Elif & Can", "tarih": "2027-06-14", "saat": null, "mekanAd": null, "mekanAdres": null,
                "sehir": "Bodrum", "kiyafet": null, "lcvSonTarih": null, "yas": null },
  "program": [ { "saat": "17:00", "baslik": "Nikâh", "yer": null } ],
  "metin": { "ustBaslik": "…", "alici": "…", "baslik": "…", "giris": "…", "imza": "…", "muhur": "… ·" },
  "eksikler": ["saat", "mekan"]
} }
```

Hatalar `{ hata, mesaj }` — `mesaj` kullanıcıya doğrudan gösterilebilir (Türkçe):
400 `kisa|uzun` · 401 `kimlik` · 422 `anlasilmadi|uygunsuz` · 429 `kota` · 503 `kapali|servis`.
Başarısız çağrılar kotadan düşülmez (`uygunsuz` hariç).

- `oneriler[0]` en uygunu; her zaman `tur` ile eşleşir (katalogda o tür varsa). Mobilde `tema`
  modelin önerdiği renk temasıdır (tek şablon/tür olduğu için havayı tema taşır); web'de şablonun kendi teması.
- `null` = kullanıcı söylemedi. İstemci uydurmaz; `eksikler`'i yerinde sorar.

## UX akışı (web — `ai-sihirbaz.js`)

1. **Anlat** — büyük metin alanı, "Konuşarak anlat" (Web Speech API; desteklenmeyen tarayıcıda gizli),
   örnek çipler, ⌘/Ctrl+Enter, yarım metin yerelde korunur, gizlilik notu.
2. **Hazırlanıyor** — 3 adımlı ilerleme (en az ~1.6 sn, göz kırpmasın), Vazgeç.
3. **Sonuç** — telefon çerçevesinde GERÇEK motorla önizleme; "Anladıklarım" çipleri; eksikler için
   yerinde alanlar (yazdıkça önizleme tazelenir); 3 öneri kartıyla karşılaştırma; premium etiketi.
   "Bu davetiyeyle devam et" → editöre uygulanır + "Geri al" bildirimi. Kapatınca editör eski hâline döner.

Girişler: studio galerisinin üstündeki kart, açılış sayfası hero düğmesi (`studio.html#ai`).
Yerel deneme: `studio.html?aiMock=1` (yalnız localhost; `dev/ai-mock.js`).
Analitik: `ai_acildi`, `ai_kabul` (istemci), `ai_oneri` (sunucu) → `analitik/funnel`.

## Mobil plan (iOS + Android, birebir parite)

| Adım | iOS | Android |
|---|---|---|
| Giriş | `AnaView` "＋ Yeni davetiye" altına ikincil "✨ Anlat, hazırlayalım" | `AnaView` `DolguButon` altına `CizgiliButon` |
| Rota | `Rota.aiSihirbaz` (DavetiyelerViewModel) | `Rota.AiSihirbaz` (Rota.kt) |
| Ağ | `FirestoreREST.aiOner()` — `oturum()` idToken + URLSession | `FirestoreREST.aiOner()` — `httpJson` + `oturum()` |
| Ses | `SFSpeechRecognizer` (cihaz üstü, `requiresOnDeviceRecognition` destekliyse) + `NSMicrophoneUsageDescription`/`NSSpeechRecognitionUsageDescription` (project.yml) | `SpeechRecognizer` + `RECORD_AUDIO` + `<queries>` RecognitionService |
| Uygula | `SABLONLAR.first{id}.yap()` → `temaId=oneri.tema` + metin/bilgi alanları → `aktif=…`, `yol=[.duzenle]` | aynı; `etkinlikMillis` ISO'dan |
| Sonuç | `KartView` önizleme + öneri şeridi + eksik alanlar | `KartView` + aynı |

Ses cihaz üstünde metne çevrilir; sunucuya yalnız metin gider (ses yükleme yok, maliyet yok).
App Check mobilde Firebase SDK olmadığı için yok; koruma = ID token + uid/IP/genel kota + kill switch.
