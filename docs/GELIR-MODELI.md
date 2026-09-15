# Gelir modeli, paketleme ve fiyat deneyi

Sürüm: 2026-09-14-v2 · Durum: uygulandı (kademeli tek ödeme)

## Karar

Ana model **ücretsiz deneme + kademeli, etkinlik başına tek ödeme**dir. Kullanıcı tasarımı ve ilk paylaşımı risk almadan dener; ardından bütçesine göre iki tek-ödeme ürününden birini alır: düşük bariyerli **Filigransız (₺99,90)** ya da değer yoğun etkinlik için **Premium Etkinlik (₺499)**. İki ürün her bütçeye hitap ederek dönüşümü genişletir ve fiyat esnekliği testine (Deney A) doğal zemin hazırlar. **Pro** abonelik, tekrar tekrar etkinlik üreten organizatör ve işletmeler için yol haritasındadır (yinelenen tahsilat henüz uygulanmadı; sayfada "Yakında"). Hakların makine tarafından okunabilir kaynağı `config/plans.json` dosyasıdır; sunucu (`functions/index.js`) ödeme doğrulanınca bu haklardan bir anlık görüntüyü `invitations/{id}.entitlements` alanına yazar.

## Paket matrisi

| Özellik | Ücretsiz | Filigransız | Premium Etkinlik | Pro (yakında) |
|---|---:|---:|---:|---:|
| Fiyat hipotezi | ₺0 | ₺99,90 tek ödeme | ₺499 tek ödeme | ₺1.490 / ay |
| Yayın | 30 gün | 90 gün | 12 ay | 20 aktif etkinlik |
| LCV | 30 | 30 | 500 | etkinlik başı 5.000 |
| Şablon | Temel | Tümü | Tümü | Tümü |
| Filigran | Var | Yok | Yok | Yok + marka kiti |
| Özel kısa link | — | — | Var | Var |
| Fotoğraf | 12 | 12 | 20 | etkinlik başı 100 |
| Müzik, program, harita, hediye | — | — | Var | Var |
| Analitik ve CSV | — | — | Var | Var |
| Hatırlatma | — | — | Var | Var / toplu |
| Ekip | 1 kişi | 1 kişi | 2 kişi | 5 kişi |
| Destek | Standart | Standart | Öncelikli | Öncelikli |

Filigransız, "sadece filigranı kaldır" isteyen düşük bütçeli kullanıcıyı yakalar ve Premium Etkinlik'e yükseltme köprüsüdür (satın alanlara studio içinde ₺499 yükseltme sunulur; sistem asla plan düşürmez). LCV limitleri **yumuşak**tır: 30/500 aşımında yanıt kaybolmaz, ev sahibi panelinde sayaç kilitlenir ve yükseltme önerilir.

SMS/WhatsApp Business gönderim ücretleri pakete gömülmez; sağlayıcı maliyeti + açık hizmet bedeliyle kontör olarak satılır. Böylece yüksek hacimli bir müşterinin marjı bozması engellenir.

## Fiyat hipotezi

2026 Ağustos masa başı karşılaştırmasında Türkiye'deki görünen etkinlik başı teklifler yaklaşık ₺449–₺999 bandında; bir örnekte standart paket ₺599,90, diğerinde tek etkinlik ₺449 ve başka bir sağlayıcıda ₺499/₺699/₺999 katmanları görülmektedir. E-Davetiye kademeli konumlanır: **₺99,90** giriş (yalnız filigran + tüm şablonlar) deneme bariyerini rakiplerin altına indirir; **₺499** tam paket premium tasarım + gerçek LCV değerini bandın ortasında karşılar. Nihai fiyatlar Deney A ile doğrulanır.

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

Uygulanan olay adları (Türkçe; `functions/index.js` → `olayKaydet` ve `odemeCallback`): `paywall_goruntulendi`, `plan_secildi`, `odeme_baslatildi`, `odeme_tamamlandi`, `odeme_basarisiz`, `yukseltme_kapatildi`. Sayaçlar `analitik/funnel`, plan kırılımı `analitik/planlar` altında toplanır. `odeme_tamamlandi`/`odeme_basarisiz` sunucu tarafında (callback doğrulaması sonrası) artırılır; sipariş kimliği (`order_id` = iyzico paymentId) `orders/{token}` ve `invitations/{id}.orderId` alanında tutulur. Kişisel davetli verisi analitiğe gönderilmez.

## Yerel ödeme gereksinimleri

- TRY ve KDV dahil toplamın ödeme öncesi görünmesi; 3D Secure, yerel kartlar ve güvenilir PSP.
- Kart bilgisi platform sunucusuna uğramaz; PSP'nin barındırdığı alan/checkout kullanılır.
- Başarılı webhook gelmeden hak açılmaz; tekrar eden webhook idempotent işlenir.
- Mesafeli satış/ön bilgilendirme, fatura, iptal-iade akışı ve destek kanalı ticari yayının kapısıdır.
