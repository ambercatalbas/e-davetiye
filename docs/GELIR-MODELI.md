# Gelir modeli, paketleme ve fiyat deneyi

Sürüm: 2026-08-06-v1 · Durum: uygulanacak ürün kararı

## Karar

Ana model **ücretsiz deneme + etkinlik başına tek ödeme**dir. Kullanıcı tasarımı ve ilk paylaşımı risk almadan deneyebilir; değer yoğun düğün/sünnet gibi etkinlikte Premium alır. Pro abonelik, tekrar tekrar etkinlik üreten organizatör ve işletmeler içindir. Hakların makine tarafından okunabilir kaynağı `config/plans.json` dosyasıdır.

## Paket matrisi

| Özellik | Ücretsiz | Premium Etkinlik | Pro |
|---|---:|---:|---:|
| Fiyat hipotezi | ₺0 | ₺499 / etkinlik | ₺1.490 / ay |
| Yayın | 30 gün | 12 ay | 20 aktif etkinlik |
| LCV | 30 | 500 | etkinlik başı 5.000 |
| Şablon | Temel | Tümü | Tümü |
| Filigran | Var | Yok | Yok + marka kiti |
| Özel kısa link | — | Var | Var |
| Fotoğraf | — | 20 | etkinlik başı 100 |
| Müzik, program, harita, hediye | — | Var | Var |
| Analitik ve CSV | — | Var | Var |
| Hatırlatma | — | Var | Var / toplu |
| Ekip | 1 kişi | 2 kişi | 5 kişi |
| Destek | Standart | Öncelikli | Öncelikli |

SMS/WhatsApp Business gönderim ücretleri pakete gömülmez; sağlayıcı maliyeti + açık hizmet bedeliyle kontör olarak satılır. Böylece yüksek hacimli bir müşterinin marjı bozması engellenir.

## Fiyat hipotezi

2026 Ağustos masa başı karşılaştırmasında Türkiye'deki görünen etkinlik başı teklifler yaklaşık ₺449–₺999 bandında; bir örnekte standart paket ₺599,90, diğerinde tek etkinlik ₺449 ve başka bir sağlayıcıda ₺499/₺699/₺999 katmanları görülmektedir. E-Davetiye'nin ilk giriş fiyatı ₺499, premium tasarım + gerçek LCV değerini korurken deneme bariyerini düşük tutar.

Kaynaklar (fiyatlar tarihe ve kampanyaya göre değişebilir):

- https://edijitaldavetiye.com/fiyatlandirma
- https://edavetim.com.tr/pricing
- https://dijitaldavetiyeweb.com/fiyatlar

## Deney planı

### Deney A — fiyat esnekliği

- Kitle: ücretsiz davetiyesini oluşturup yayın adımına gelen yeni kullanıcılar.
- Varyantlar: A ₺399, B ₺499 (kontrol), C ₺699.
- Birincil metrik: 7 gün içinde ödeme dönüşümü.
- Koruma metrikleri: iade oranı, destek talebi, yayınlanan ve ≥1 LCV alan davetiye oranı.
- Süre/örnek: varyant başına en az 200 nitelikli paywall görüntülemesi ve en az 2 tam hafta; daha erken karar yok.
- Karar: kullanıcı başına net gelir en yüksek varyant; dönüşümde %20'den fazla göreli düşüş varsa daha pahalı fiyat reddedilir.

### Deney B — değer anlatımı

- A: “Filigranı kaldır, tüm premium tasarımları aç.”
- B: “Davetlilerini tek panelden yönet; 500 LCV, özel link ve tüm tasarımlar.”
- Hipotez: sonuç odaklı B mesajı satın alma başlangıcını artırır.
- Segmentler: düğün/nişan ile sünnet/doğum günü ayrı raporlanır.

### Deney C — ödeme zamanı

- A: premium şablona tıklayınca erken paywall.
- B: tasarım serbest, yalnız yayınlarken paywall.
- Beklenti: B daha çok emek yatırımı/önizleme sağladığı için net yayın gelirini artırır; kullanıcı hayal kırıklığı görev tamamlama metriğiyle izlenir.

## Paywall ve yükseltme noktaları

| Nokta | Davranış | Mesaj ilkesi |
|---|---|---|
| Premium şablon seçimi | Önizleme serbest, kullan/yayın öncesi kilit | Tasarımı göstermeden para isteme |
| 31. LCV geldiğinde | Yanıt kaybolmaz; ev sahibi panelinde kilitli sayaç | Veriyi rehin alma; 7 günlük erişim toleransı |
| Özel slug, filigran kaldırma | İşlem anında plan sayfası | Açılacak faydayı somut göster |
| Fotoğraf/müzik/analitik | Blok ekleme veya rapor açmada bağlamsal modal | Kullanıcının kaldığı işi koru |
| Yayınlama | Son özet + tek ödeme | Fiyat, süre, vergi ve iade şartını sürprizsiz göster |
| Pro limitleri | 2. aktif etkinlik veya ekip üyesinde | Etkinlik başı ile Pro toplam maliyetini karşılaştır |

Paywall kapatıldığında içerik ve form verisi kaybolmaz. Kullanıcı paket sayfasını yeni sekmede inceleyip editöre dönebilir. “Sınırsız” ifadesi teknik/adil kullanım sınırı varsa kullanılmaz.

## Ölçüm olayları

`paywall_viewed`, `plan_selected`, `checkout_started`, `checkout_completed`, `checkout_failed`, `upgrade_dismissed`, `entitlement_blocked`. Tüm olaylarda `plan_id`, `trigger`, `invitation_type`, `experiment_variant`; ödeme olayında sunucu taraflı `order_id` bulunur. Kişisel davetli verisi analitiğe gönderilmez.

## Yerel ödeme gereksinimleri

- TRY ve KDV dahil toplamın ödeme öncesi görünmesi; 3D Secure, yerel kartlar ve güvenilir PSP.
- Kart bilgisi platform sunucusuna uğramaz; PSP'nin barındırdığı alan/checkout kullanılır.
- Başarılı webhook gelmeden hak açılmaz; tekrar eden webhook idempotent işlenir.
- Mesafeli satış/ön bilgilendirme, fatura, iptal-iade akışı ve destek kanalı ticari yayının kapısıdır.
