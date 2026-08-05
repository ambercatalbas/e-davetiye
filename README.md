# E-Davetiye 💌

Sevdiklerinize özel, zarif ve **yeniden kullanılabilir** dijital davetiye sistemi.
Tek bir `index.html` dosyası — harici bağımlılık yok, internet gerekmez.

İlk davetiye: sürekli kahvaltıya geç kalan eşe, bir gala davetiyesi ciddiyetinde
hazırlanmış şaka bir **"Resmî Kahvaltı Davetiyesi"**. Şakanın espirisi, tasarımın
ciddiyeti ile konunun sululuğu (kahvaltıya zamanında gelmek) arasındaki tezatta. 😄

---

## Nasıl açılır / önizlenir

En kolayı: `index.html` dosyasına çift tıklayın — tarayıcıda açılır.

Sunucuyla denemek isterseniz (bu klasörde):

```bash
python3 -m http.server 8787
```

Sonra tarayıcıdan: `http://127.0.0.1:8787/index.html`

---

## Eşinize nasıl gönderirsiniz

**Yol 1 — Paylaşılabilir link (önerilen):**
Bu davetiye bir Claude Artifact olarak yayınlandı. Link **varsayılan olarak
özeldir**; göndermek için Artifact sayfasındaki **paylaş** menüsünden linki
paylaşın, sonra eşinize iletin.

**Yol 2 — Dosya olarak:**
`index.html` dosyasını doğrudan gönderebilirsiniz (WhatsApp, e-posta, AirDrop).
Karşı taraf çift tıklayıp açar; internet gerekmez.

---

## Kahvaltı davetiyesini kişiselleştirme

Her şey `index.html` içindeki **`DAVETIYELER`** objesinde. Kod bilmeden
düzenleyebilirsiniz — tırnak içindeki yazıları değiştirmeniz yeterli.

| Alan | Ne işe yarar |
|------|--------------|
| `alici` | "Sevgili Eşim" — buraya eşinizin adını yazabilirsiniz (örn. "Sevgili Ayşe") |
| `baslik` | Büyük başlık |
| `girisMetni` | Davet metni |
| `zaman` | `{ saat: 9, dakika: 0 }` — geri sayım hedefi (her sabahki bir sonraki 09.00) |
| `detaylar` | Tarih / Saat / Yer / Kıyafet kutuları. Değeri `"{{tarih}}"` olan alan otomatik tarihe dönüşür |
| `sartlar` | "İnce yazı" — şakacı ceza maddeleri |
| `rsvp` | İki butonun yazısı ve tıklanınca çıkan cevap |
| `imza` / `imzaKurum` | Alttaki imza |

> İpucu: Belirli bir güne davet için `zaman`'a tarih ekleyin:
> `zaman: { tarih: "2026-08-14", saat: 9, dakika: 0 }` — o zaman geri sayım
> tek seferlik o tarihe işler.

---

## Yeni davetiye ekleme (aynı yapı, farklı davet)

Sistem config güdümlü. Örnek olarak zaten bir **akşam yemeği daveti** ekli.
Görmek için: `index.html?d=yemek`

Kendi davetinizi eklemek için `DAVETIYELER` objesine yeni bir anahtar ekleyin:

```js
const DAVETIYELER = {
  kahvalti: { /* ... */ },
  yemek:    { /* ... */ },

  dogumgunu: {                              // yeni davetiye
    belgeBaslik: "Doğum Günü Daveti",
    ustBaslik: "Doğum Günü Daveti",
    alici: "Sevgili Dostlar",
    baslik: "Kutlamaya Bekliyoruz",
    girisMetni: "Birlikte bir yaş daha...",
    zaman: { tarih: "2026-09-01", saat: 19, dakika: 30 },
    detaylar: [
      { etiket: "Tarih", deger: "{{tarih}}" },
      { etiket: "Saat",  deger: "19.30" },
      { etiket: "Yer",   deger: "..." },
      { etiket: "Kıyafet", deger: "..." }
    ],
    geriSayimBaslik: "Partiye kalan süre",
    rsvp: {
      olumlu:  { etiket: "Geliyorum!",  cevap: "Harika, seni bekliyoruz! 🎉" },
      olumsuz: { etiket: "Gelemeyeceğim", cevap: "Çok yazık, özleyeceğiz. 🤍" }
    },
    imza: "Sevgiyle,",
    imzaKurum: "..."
  }
};
```

Sonra linke `?d=dogumgunu` ekleyin: `index.html?d=dogumgunu`

**Kural:** Zorunlu alan yoktur. Verdiğiniz bölümler görünür, vermediğiniz
(örn. `sartlar`) otomatik gizlenir. `yemek` örneğinde ince yazı ve mühür yoktur —
çünkü o davetiyede tanımlı değiller.

---

## Tasarım sistemi ("Şafak")

- **Renk:** Gece indigosundan şafağa; antika altın folyo + mercan vurgu.
  Açık tema "gün doğumu", koyu tema "şafaktan önce" — ikisi de özenle tasarlandı.
- **Tipografi:** Başlık için yüksek kontrastlı serif (Hoefler/Baskerville),
  alıcı & imza için el yazısı (Snell Roundhand), etiketler için aralıklı sans.
  Apple cihazlarda kusursuz görünür, diğer platformlarda zarifçe alternatiflere düşer.
- **Detaylar:** Canlı geri sayım, kavisli yazılı "mühür", tıklanınca uçuşan
  kalpler, şafak ışığı animasyonu. Hepsi `prefers-reduced-motion`'a saygılıdır.
- **Erişilebilirlik:** Renk kontrastı AA hedefli, klavye odağı görünür,
  JavaScript kapalıysa bile temel metin görünür (`<noscript>`).

Her şey tek dosyada, yorumlar Türkçe. İyi eğlenceler! ☕
