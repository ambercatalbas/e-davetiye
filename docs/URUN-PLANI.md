# E-Davetiye — Ürün Gelişim Planı & Yol Haritası

> Sürüm 1.0 · Ürün: E-Davetiye · Hazırlayan: Ürün ekibi
> Bu belge; mevcut MVP'yi **pazarlanabilir, profesyonel bir ürüne** dönüştürmek
> için stratejiyi, kapsamı, mimariyi, gelir modelini ve fazlı yol haritasını tanımlar.
> Uygulanabilir iş kalemleri GitHub **Issues** olarak açılmıştır (bkz. §14).

---

## 1. Yönetici Özeti

E-Davetiye bugün; **çok zarif tasarımlı ama backend'siz** bir davetiye motorudur.
Web'de tek dosyalık (`index.html`) bir işleyici, iOS (SwiftUI) ve Android (Compose)
native editörleri vardır. İçerik ya koda ya da paylaşım linkinin içine (`#i=base64`)
gömülüdür. Bu mimari "uygulama indirmeden, link/QR ile aç" avantajı sağlar; fakat
**gerçek RSVP toplama, davetli yönetimi, hesap, analitik, para kazanma ve web
üzerinden self-servis oluşturma** yoktur.

Bu plan üç şeyi hedefler:

1. **Satılabilir çekirdek** — bir kullanıcının kendi davetiyesini web/mobilde
   baştan sona kendi kendine oluşturup, gerçek LCV toplayabildiği ürün.
2. **Zenginlik** — Türkiye pazarının tüm davet türleri (düğün, nişan, kına, sünnet,
   mevlüt, bebek, doğum günü, kurumsal…) ve içerik blokları (fotoğraf, harita,
   program, hediye/IBAN, dilek defteri, müzik).
3. **Ölçek & gelir** — freemium + premium şablon + etkinlik başı ödeme,
   analitik, bildirimler, çok dillilik (Antalya turizmi için EN/RU/DE/AR).

**Kuzey Yıldızı metriği:** *Paylaşılan ve en az 1 gerçek LCV alan davetiye sayısı / ay.*

---

## 2. Bugün Neredeyiz? (Mevcut Durum Analizi)

### 2.1 Mimari
- **Web motoru:** `index.html` (tek dosya, harici bağımlılık yok), GitHub Pages'te yayında
  (`ambercatalbas.github.io/e-davetiye`). İçerik `DAVETIYELER` objesinden (`?d=slug`)
  ya da mobilden gelen `#i=<base64url(JSON)>` hash'inden gelir.
- **iOS:** SwiftUI, iOS 17+, yerel depolama (`UserDefaults`), QR + link + WhatsApp paylaşımı.
- **Android:** Jetpack Compose, iOS ile eşdeğer; yerel depolama, ZXing QR.
- **Backend:** **Yok.** Sunucu, veritabanı, hesap yok. Veri cihazda / URL'de yaşar.

### 2.2 Özellikler (var olan)
- 2 tema: `safak` (klasik/altın), `yaz` (Akdeniz). Otomatik açık/koyu mod.
- Canlı geri sayım, vektörel süslemeler, mühür, uçuşan kalpler, ışık animasyonu.
- Alanlar: alıcı, üst başlık, başlık, mesaj, yer, imza, tarih.
- Erişilebilirlik temeli: `prefers-reduced-motion`, `noscript`, yazdırma stilleri.
- QR kod üretimi; WhatsApp/Paylaş sayfası.

### 2.3 Güçlü Yönler (korunacak)
- **El işçiliği kalitesinde tipografi ve animasyon** — rakiplerin çoğunda yok.
- **"Uygulama gerekmez" paylaşım** — link/QR ile anında açılır.
- **Temiz, hafif, çevrimdışı çalışan** motor; i18n'e yapısal olarak uygun.

### 2.4 Kritik Boşluklar (pazarlanabilirliğin önündeki engeller)
| # | Boşluk | Etki |
|---|--------|------|
| 1 | Backend yok → **RSVP hiçbir yere kaydolmuyor** | Ürünün en temel değeri eksik |
| 2 | **Self-servis web oluşturucu yok** | Kullanıcı kendi davetiyesini yapamıyor |
| 3 | Yalnız 2 tema, sınırlı davet türü | Pazarın %90'ı (düğün/sünnet/kına…) karşılanmıyor |
| 4 | Fotoğraf, harita, program, hediye, müzik **blokları yok** | "Zengin davetiye" beklentisi karşılanmıyor |
| 5 | Hesap / bulut / davetli listesi yok | Tekrar kullanım, takip, kişiselleştirme yok |
| 6 | Para kazanma yok | Sürdürülebilir değil |
| 7 | Uzun URL'e gömülü veri | Düzenlenemez, iptal edilemez, izlenemez |
| 8 | Analitik yok | Kim açtı, kim geldi bilinmiyor |
| 9 | KVKK/yasal yok | Davetli verisi toplamak için zorunlu |

---

## 3. Vizyon & Konumlandırma

> **Vizyon:** Türkiye'nin en zarif ve en kolay dijital davetiye platformu olmak —
> düğünden sünnete, her özel gün için dakikalar içinde profesyonel, canlı, LCV
> toplayan davetiyeler.

**Konumlandırma cümlesi:**
*"Canva'nın kolaylığı, matbaa davetiyesinin zarafeti, WhatsApp'ın hızıyla —
üstelik kimin geleceğini de sana söyleyen dijital davetiye."*

**Farklılaştırıcılar:**
- **Tasarım kalitesi** (folyo hissi tipografi, animasyon) — "ucuz şablon" algısını kırar.
- **Türkiye'ye özgü davet türleri** — sünnet, kına, mevlüt, asker uğurlama (global rakiplerde yok).
- **WhatsApp-öncelikli** paylaşım + kişiye özel link.
- **Gerçek LCV + davetli paneli** — Instagram'da davetiye satan atölyelerde yok.
- **Çok dilli** (Antalya/turizm düğünleri: EN/RU/DE/AR).

---

## 4. Pazar & Rekabet

**Pazar:** Türkiye'de yılda milyonlarca düğün/nişan/sünnet/kına/mevlüt yapılır.
Halihazırda büyük bir "Instagram/Etsy üzerinden elde yapılan dijital davetiye"
kayıt dışı ekonomisi var (adet başı ~50–300 TL). "Video davetiye" trend.

**Rakip kümeleri:**
- **Yerli atölyeler (Instagram/Etsy):** ucuz ama elle, self-servis değil, LCV yok. → Bizim otomasyon + LCV üstünlüğümüz.
- **Yerli siteler (davetiye/organizasyon):** çoğu baskı odaklı; dijital tarafı zayıf.
- **Global (Paperless Post, Greenvelope, Zola, Greetings Island, Canva):**
  güçlü ama Türkçe/Türk gelenekleri, WhatsApp, IBAN/altın hediye kültürü, sünnet/kına yok.

**Boşluk (fırsat):** *Türkçe-öncelikli, gelenek-farkında, tasarımı güçlü, gerçek LCV
toplayan, WhatsApp ile dağıtılan self-servis SaaS.* Bu kesişimde güçlü bir yerli oyuncu yok.

---

## 5. Hedef Kitle & Personalar

| Persona | İhtiyaç | Öncelikli davet türü | Ödeme isteği |
|---------|---------|----------------------|--------------|
| **Gelin/Damat (24–34)** | Zarif, program (kına→nikah→düğün), LCV, harita | Düğün, nişan, kına | Yüksek |
| **Anne/Baba (30–45)** | Hızlı, sevimli, çok davetli | Sünnet, mevlüt, bebek | Orta-Yüksek |
| **Genç ebeveyn** | Eğlenceli, temalı | Doğum günü, baby shower | Orta |
| **Kurumsal/organizatör** | Marka, RSVP, toplu gönderim | Açılış, kurumsal, davet | Yüksek (B2B) |
| **Turizm düğünü (Antalya)** | Çok dilli (EN/RU/DE), harita, konaklama | Düğün | Yüksek |
| **Gündelik ev sahibi** | 2 dakikada davet | Yemek, buluşma | Düşük (freemium) |

---

## 6. Ürün Direkleri (Epics)

1. **Strateji & Dokümantasyon** — vizyon, marka, ölçüm.
2. **Backend & Hesap Altyapısı** — API, veritabanı, kimlik, medya, kısa link.
3. **Web Oluşturucu (Creator Studio)** — self-servis WYSIWYG editör.
4. **Şablon Galerisi & Davet Türleri** — tüm occasion'lar, kategori/arama.
5. **İçerik Blokları & Zenginleştirme** — foto, harita, program, hediye, müzik, guestbook.
6. **RSVP & Davetli Yönetimi** — gerçek LCV, davetli listesi, kişiselleştirme.
7. **Paylaşım & Bildirimler** — WhatsApp/SMS/e-posta, QR, hatırlatma.
8. **Analitik & Panel** — görüntülenme, LCV, açılma oranı.
9. **Gelir Modeli & Ödeme** — freemium, premium, ödeme entegrasyonu.
10. **Mobil Uygulamalar** — iOS/Android eşitlik + bulut senkron.
11. **Uluslararasılaşma & Erişilebilirlik** — i18n, a11y, PWA.
12. **Tasarım Sistemi & Marka** — token'lar, landing, SEO.
13. **Hukuk & KVKK Uyumu** — aydınlatma, açık rıza, şartlar.
14. **Kalite, Test & DevOps** — CI/CD, izleme, performans.

---

## 7. Davetiye Türleri (Kapsam)

**Faz 1 (öncelik):** Düğün · Nişan/Söz · Kına · Sünnet · Bebek/Baby shower/Mevlüt · Doğum günü
**Faz 2:** Nikah · Asker uğurlama · Kurumsal/Açılış · Mezuniyet · Yıldönümü · İftar daveti · Save the Date · Teşekkür kartı
**Faz 3:** Cinsiyet partisi · Vaftiz (i18n) · Özel/serbest tasarım

Her tür için: uygun motifler, hazır metin şablonları (temenni/ayet/şiir seçenekleri),
uygun bloklar (ör. düğünde program + harita + hediye; sünnette çocuk teması + mevlüt saati).

---

## 8. İçerik Blokları (Zenginleştirme)

- **Kapak/Zarf açılışı** (envelope reveal animasyonu)
- **Hero görsel + Fotoğraf galerisi**
- **Harita & yol tarifi** (Google/Apple Maps deep link, "Yol tarifi al")
- **Çoklu etkinlik / Program akışı** (kına 18:00 → nikah 20:00 → düğün)
- **Geri sayım** *(var)*
- **Arka plan müziği** (aç/kapa, otomatik-sessiz uyumlu)
- **Hediye / dilek listesi** — IBAN, altın/takı, balayı fonu
- **Dilek defteri / mesajlar** (guestbook)
- **Etkinlik sonrası ortak foto albümü** (misafir yükleme, mekân QR'ı)
- **Konaklama & ulaşım bilgisi** (şehir dışı misafir)
- **Kıyafet kodu, hava durumu, iletişim (ara/WhatsApp)**
- **Canlı yayın linki** (uzaktan katılım)
- **Masa/oturma planı** (ileri)

---

## 9. Mimari Evrim

**Bugün:** İstemci-only, veri URL'de/cihazda. **Hedef:** İnce backend + mevcut zarif işleyicinin korunması.

```
İstemci (Web Studio / iOS / Android)
        │  oluştur / düzenle
        ▼
   API (REST/GraphQL)  ──►  Veritabanı (etkinlik, blok, davetli, RSVP)
        │                         │
        ├──► Medya deposu + CDN (foto/müzik)
        ├──► Kısa link servisi (davet.link/slug)
        ├──► Bildirim servisi (e-posta/SMS/WhatsApp)
        └──► Analitik toplama
        ▼
   Yayın işleyici (mevcut index.html'in backend'den beslenen v2'si) ──► Davetli tarayıcısı
```

**İlkeler:**
- Mevcut "linkle aç, uygulama gerekmez" deneyimi korunur (davetli tarafı hâlâ hafif).
- Geriye dönük uyum: `#i=` hash yayın modu bir süre desteklenir.
- Aşamalı: önce hesap + RSVP DB + kısa link; sonra medya; sonra bildirim/analitik.
- Teknoloji önerisi (değerlendirilecek): TypeScript API (ör. Node/Hono veya Next.js
  route handlers) + Postgres + obje deposu (S3/R2) + Cloudflare. *Karar Issue #3'te.*

---

## 10. Gelir Modeli

**Freemium + etkinlik başı + premium içerik** karması:

- **Ücretsiz:** temel şablonlar, geri sayım, 30 davetliye kadar LCV, "E-Davetiye ile yapıldı" filigranı.
- **Premium (etkinlik başı, tek seferlik):** premium şablonlar, sınırsız davetli, filigran kaldırma,
  fotoğraf galerisi, müzik, program, hediye/IBAN, analitik, özel slug.
- **Pro/abonelik (organizatör/kurumsal):** çoklu etkinlik, marka kiti, toplu SMS/WhatsApp, ekip.
- **Ek gelir (Faz 3):** baskılı davetiye siparişi (matbaa), tedarikçi pazar yeri komisyonu, video davetiye.

Fiyatlandırma hipotezleri ve A/B testi Issue'larda ele alınır (bkz. `epic:gelir`).

---

## 11. Yol Haritası (Fazlar / Milestones)

| Faz | Ad | Amaç | Ana çıktı |
|-----|----|------|-----------|
| **Faz 0** | Temel | Altyapıyı kur | Backend, hesap, veri modeli, tasarım sistemi, KVKK, CI/CD |
| **Faz 1** | Satılabilir Çekirdek | Ürünü satılabilir yap | Web oluşturucu, şablon galerisi + ana türler, gerçek RSVP, temel bloklar, ödeme v1 |
| **Faz 2** | Büyüme | Elde tut & yay | Bildirimler, analitik panel, i18n, guestbook, foto albümü, PWA, landing/SEO |
| **Faz 3** | Ölçek & Ekosistem | Genişle | Pazar yeri, baskı, video davetiye, AI içerik, oturma planı, iş birlikçi düzenleme |

---

## 12. Başarı Metrikleri (KPI)

- **Kuzey Yıldızı:** Paylaşılıp ≥1 gerçek LCV alan davetiye / ay.
- **Aktivasyon:** Kayıt → ilk davetiye yayınlama oranı.
- **Dönüşüm:** Ücretsiz → premium etkinlik oranı; ARPU.
- **Yayılım (viral):** Davetiye başına açılış (davetli görüntülenme) & LCV sayısı; K-faktörü.
- **Elde tutma:** İkinci etkinlik oranı (aynı kullanıcı yeni davet).
- **Kalite:** Core Web Vitals, çökme oranı, LCV tamamlama oranı.

---

## 13. Riskler & Önlemler

| Risk | Önlem |
|------|-------|
| Backend maliyeti / karmaşıklık | İnce backend, yönetilen servisler, aşamalı geçiş |
| KVKK ihlali (davetli verisi) | Faz 0'da aydınlatma + açık rıza + veri minimizasyonu |
| Şablon "ucuz" algısı | Tasarım sistemi + editoryal kalite kontrol |
| WhatsApp/SMS gönderim politikaları | Onaylı şablon + opt-in + servis sağlayıcı uyumu |
| Sezonluk talep (düğün sezonu) | Sünnet/mevlüt/doğum günü ile yıla yay |
| Tek kişilik ekip yük | Fazlı öncelik, otomasyon, net "done" tanımı |

---

## 14. Issue Haritası (Epic → Issue)

Tüm iş kalemleri `ambercatalbas/e-davetiye` deposunda **Issue** olarak açıldı;
`epic:*`, `type:*`, `priority:*`, `platform:*` etiketleri ve Faz milestone'ları ile
etiketlendi. Grupları GitHub'da şu filtrelerle görebilirsiniz:

- Faz: `is:issue milestone:"Faz 1 — Satılabilir Çekirdek"`
- Epic: `is:issue label:epic:studio`
- Öncelik: `is:issue label:priority:P0`

Ayrıntılı liste ve durum: **GitHub Issues** ve **Projects** panosu (E-Davetiye Yol Haritası).

---

*Bu belge yaşayan bir dokümandır; kararlar ilgili Issue'larda güncellenir.*
