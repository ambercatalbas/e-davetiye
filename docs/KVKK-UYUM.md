# KVKK / GDPR ürün uyum planı

> Bu belge ürün ve mühendislik kontrol listesidir; somut olay için hukuk danışmanlığı yerine geçmez. Ticari yayından önce şirket unvanı, adresi, iletişim kanalı, altyapı sağlayıcıları ve uluslararası aktarım düzeni hukuk danışmanı tarafından tamamlanmalıdır.

Sürüm: 2026-08-06-v1

## Roller

- Davetiye sahibi, davetli listesinin ve LCV yanıtlarının amaç ve yöntemini belirlediği ölçüde veri sorumlusudur.
- E-Davetiye, davetiye sahibinin talimatıyla barındırma ve iletim sağladığında veri işleyendir; hesap, ödeme, güvenlik ve yasal yükümlülük verilerinde ayrıca veri sorumlusu olabilir.
- Firebase/Google ve ileride seçilecek e-posta, analitik ve ödeme sağlayıcıları alt işleyen olarak sözleşme ve aktarım envanterine alınmalıdır.
- Davetli, verisi işlenen ilgili kişidir. Çocuk adına yanıt veli/vasi tarafından verilmelidir; çocuklardan doğrudan iletişim veya pazarlama verisi toplanmaz.

## Veri envanteri ve amaç sınırı

| Veri | Amaç | Zorunluluk | Varsayılan saklama |
|---|---|---|---|
| Davetli adı, katılım durumu, kişi sayısı | Etkinlik katılım planlama | LCV için gerekli | Etkinlikten 90 gün sonra silme |
| Davetli notu | Beslenme/erişilebilirlik veya ev sahibine mesaj | İsteğe bağlı; özel nitelikli veri yazılmaması uyarısı | Etkinlikten 90 gün sonra silme |
| Açık rıza ve aydınlatma sürümü, zaman damgası | Uyumluluk kanıtı | LCV ile zorunlu | Yanıtla birlikte; gerekli denetim kaydı ayrıca en çok 3 yıl |
| Hesap e-postası ve kimliği | Hesap ve güvenlik | Hizmet için gerekli | Hesap kapanışından 30 gün sonra; yasal kayıtlar hariç |
| Ödeme/fatura kayıtları | Tahsilat ve yasal yükümlülük | Satın almada gerekli | İlgili yasal süre |

Serbest metin alanlarına sağlık, din, biyometri veya çocuk hakkında özel nitelikli veri yazılmaması UX metniyle belirtilmelidir. Ürün; telefon, e-posta, açık adres veya doğum tarihi istemeden temel LCV'yi tamamlayabilmelidir.

## Ürün gereksinimleri

1. Aydınlatma bağlantısı veri girişinden önce görünür; metin veri sorumlusu, amaç, aktarım, yöntem/hukuki sebep ve hak başvuru kanalını içerir.
2. Açık rıza aydınlatmadan ayrı, açık ifadeli, boş ve geri alınabilir bir kontroldür. Pazarlama izni LCV'nin şartı değildir.
3. Kayda `consentVersion`, `privacyNoticeVersion`, `consentGranted` ve sunucu zaman damgası eklenir. Firestore kuralları eksik veya eski sürümlü kaydı reddeder.
4. Ev sahibi CSV/JSON indirme, tek yanıt silme ve tüm etkinlik verisini silme işlemlerine sahip olur. Bu işlemler yönetim paneli issue'sunda uygulanacaktır.
5. Zamanlanmış imha görevi her gün, `eventEndsAt + 90 gün` geçmiş LCV verilerini siler; işlem sayısı ve hata kaydı kişisel veri içermeyen denetim günlüğüne yazılır.
6. İlgili kişi talebi alınca kimlik ve davetiye ilişkisi doğrulanır; erişim/düzeltme/silme süreci yasal süre içinde sonuçlandırılır.
7. Varsayılan analitik çerezsiz ve toplulaştırılmıştır. Zorunlu olmayan çerez/SDK eklenirse çalıştırılmadan önce ayrı tercih katmanı açılır.

## Teknik teslim sırası

- Tamamlandı: LCV amaç bildirimi, ayrı açık rıza, sürümlü kanıt alanları ve Firestore alan doğrulaması.
- Sonraki backend işi: `expiresAt` alanı, zamanlanmış silme fonksiyonu, dışa aktarma/silme endpoint'i ve denetim kaydı.
- Yayın kapısı: şirket bilgileri, başvuru e-postası, alt işleyen listesi, veri merkezi/aktarım mekanizması ve gerçek saklama süreleri doldurulmadan ödeme alınmaz.

## Dayanaklar

- KVKK Madde 10 ve Aydınlatma Yükümlülüğü Rehberi: https://www.kvkk.gov.tr/Icerik/5394/Aydinlatma-Yukumlulugunun-Yerine-Getirilmesi-Rehberi
- KVKK'nın aydınlatma ve açık rızanın ayrı yürütülmesi ilkesi: https://www.kvkk.gov.tr/Icerik/8338/2025-1072
- Silme, yok etme ve anonimleştirme yükümlülüğü: https://www.kvkk.gov.tr/Icerik/2038/kisisel-verilerin-silinmesi-yok-edilmesi-veya-anonim-hale-getirilmesi
- GDPR tam metni, özellikle Madde 5, 7, 12–17 ve 28: https://eur-lex.europa.eu/eli/reg/2016/679/oj
