# E-Davetiye 💌

Sevdiklerinize özel, zarif ve **yeniden kullanılabilir** dijital davetiye sistemi.
Tek bir `index.html` dosyası — harici bağımlılık yok, internet gerekmez.
İçerik `DAVETIYELER` objesinden gelir; yeni davetiye eklemek oraya bir giriş
eklemekten ibarettir.

## Canlı davetiyeler

Site GitHub Pages'te yayında (giriş gerektirmez, doğrudan paylaşılabilir):

| Davetiye | Kim | Tarih | Link |
|----------|-----|-------|------|
| Kahvaltı (şaka) | Şifa | Her sabah 10.00 | https://ambercatalbas.github.io/e-davetiye/ |
| Yaz Tatili | Eren & Yasemin | 9 Ağustos | https://ambercatalbas.github.io/e-davetiye/?d=eren |
| Yaz Tatili | Yasin & Tuba + çocuklar | 25 Ağustos | https://ambercatalbas.github.io/e-davetiye/?d=yasin |

## İki tema

- **`safak`** (varsayılan) — gece indigosundan şafağa; altın folyo. Kahvaltı davetiyesi bunu kullanır.
- **`yaz`** — Akdeniz turkuazı + gün batımı mercan; deniz köpüğü zemin. Yaz davetiyeleri bunu kullanır.

Her tema hem açık hem koyu modda ayrı ayrı tasarlandı; görüntüleyenin telefonu
hangi moddaysa ona göre görünür.

## Güncelleme / yeniden yayınlama

Dosyayı düzenleyip şu komutu çalıştırın; site 1–2 dakikada kendini yeniler:

```bash
git -C /Users/ambercatalbas/E-davetiye commit -am "güncelleme" && git -C /Users/ambercatalbas/E-davetiye push
```

## Yeni davetiye ekleme

`index.html` içindeki `DAVETIYELER` objesine yeni bir anahtar ekleyin, linke
`?d=anahtar` koyun. **Zorunlu alan yoktur** — verdiğiniz bölümler görünür,
vermediğiniz (örn. `sartlar` ya da `ikramlar`) otomatik gizlenir.

```js
dugun: {
  belgeBaslik: "Düğün Daveti",
  tema: "yaz",                 // "safak" | "yaz"
  tepeSusu: "deniz",           // "gunes" | "deniz"  (en üstteki süsleme)
  sayacSusu: "bardak",         // "cup"   | "bardak" (geri sayım süslemesi)
  ustBaslik: "Düğün Daveti",
  alici: "Sevgili Misafirler",
  baslik: "Mutluluğumuza Ortak Olun",
  girisMetni: "...",
  zaman: { tarih: "2026-09-12", saat: 18, dakika: 0,
           bittiMetni: "Başladı — hoş geldiniz!" },   // tarih yoksa her gün o saate sayar
  detaylar: [
    { etiket: "Tarih", deger: "{{tarih}}" },           // {{tarih}} otomatik dolar
    { etiket: "Saat",  deger: "18.00" },
    { etiket: "Yer",   deger: "..." },
    { etiket: "Kıyafet", deger: "..." }
  ],
  geriSayimBaslik: "Törene kalan süre",
  // İsteğe bağlı bölümler:
  ikramlar: [                                           // menü (yaz konseptine uygun)
    { grup: "İkramlar", ogeler: ["...", "..."] }
  ],
  ikramlarBaslik: "Sizi Bekleyen Sofra",
  ikramlarNot: "...",
  sartlar: ["...", "..."],                              // "ince yazı" maddeleri
  sartlarBaslik: "İnce Yazı",
  muhurYazi: "...",                                      // yuvarlak mühür yazısı
  rsvp: {
    olumlu:  { etiket: "Geliyorum", cevap: "Harika! 🎉" },
    olumsuz: { etiket: "Gelemeyeceğim", cevap: "Çok yazık. 🤍" }
  },
  imza: "Sevgiyle,",
  imzaKurum: "Amber, Şifa, Mahir & Emir"
}
```

## Yerel önizleme

`index.html` dosyasına çift tıklayın ya da bu klasörde:

```bash
python3 -m http.server 8788
```

Sonra: `http://127.0.0.1:8788/index.html?d=eren`

## Tasarım notları

- Tipografi: başlık için yüksek kontrastlı serif (Hoefler/Baskerville), alıcı & imza
  için el yazısı (Snell Roundhand), etiketler için aralıklı sans. Apple cihazlarda
  kusursuz, diğer platformlarda zarifçe alternatiflere düşer.
- Canlı geri sayım, kavisli yazılı mühür, tıklanınca uçuşan kalpler, ışık animasyonu.
  Hepsi `prefers-reduced-motion`'a saygılıdır; JavaScript kapalıysa temel metin görünür.

Tüm kod tek dosyada, yorumlar Türkçe. İyi eğlenceler! ☀️🌊
