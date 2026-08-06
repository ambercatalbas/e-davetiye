# Tema Sistemi

E-Davetiye renderer'ı bütün görsel varyantları aynı semantik CSS token sözleşmesiyle üretir. Şablon içeriği `templates.json` içinde, görsel tema token'ları `index.html` içinde tutulur.

## Token sözleşmesi

| Token | Rol |
|---|---|
| `--sky-1`, `--sky-2` | Sahne arka plan gradyanı |
| `--glow` | Alt atmosfer ışığı |
| `--card`, `--card-edge` | Davetiye kartı ve kenarı |
| `--ink`, `--ink-soft` | Ana ve ikincil metin |
| `--gold`, `--gold-bright` | Vurgu, CTA, mühür ve süsleme |
| `--coral` | İkincil sıcak vurgu |
| `--hairline` | İnce çizgi ve bölüm ayırıcıları |
| `--on-gold` | Vurgu yüzeyi üzerindeki metin |
| `--shadow` | Kart gölgesi |

Her tema üç durumda eksiksiz tanımlanır:

1. Açık sistem modu / varsayılan tema seçimi
2. Koyu sistem modu (`prefers-color-scheme: dark`)
3. Studio veya ilerideki tema düğmesinden zorlanan `data-theme="light|dark"`

## Düğün koleksiyonu

| Tema kimliği | Şablon | Tasarım dili | Ana renk | Paket |
|---|---|---|---|---|
| `safak` | Altın Vaat | Klasik / altın folyo | Altın | Ücretsiz |
| `minimal` | Sessiz Zarafet | Fildişi / adaçayı | Krem | Ücretsiz |
| `botanik` | Yeşil Yemin | Orman / gül / kır düğünü | Yeşil | Premium |
| `modern` | Mavi Çizgi | İnci / şehir / geometrik | Lacivert | Ücretsiz |
| `bohem` | Toprak & Rüzgâr | Kum / terakota / doğal | Toprak | Premium |
| `yaz` | Akdeniz Nikâhı | Turkuaz / mercan / sahil | Turkuaz | Premium |
| `gece` | Gece Yarısı | Safir / ay ışığı | Lacivert | Premium |
| `luks` | Maison d'Or | Oniks / şampanya / gala | Siyah | Premium |

## Sünnet & Mevlüt koleksiyonu

| Tema kimliği | Şablon | Tasarım dili | Paket |
|---|---|---|---|
| `safak` | Maşallah | Klasik mevlüt / altın | Ücretsiz |
| `cocuk` | Bulutlarda Şenlik | Çocuk / gökyüzü / neşeli | Ücretsiz |
| `luks` | Küçük Prens | Prens / şampanya / gala | Premium |
| `bohem` | Şehzade Alayı | Osmanlı / sancak / sıcak tonlar | Premium |
| `modern` | İlk Cesaret | Minimal / şehir / lacivert | Ücretsiz |
| `gece` | Ay & Yıldız | Mevlüt gecesi / safir | Premium |

## Erişilebilirlik bütçesi

- `--ink` / `--card`: WCAG AA normal metin için en az **4.5:1**.
- `--ink-soft` / `--card`: WCAG AA normal metin için en az **4.5:1**.
- `--on-gold` / `--gold`: CTA metni için en az **4.5:1**.
- Tema yalnız renkle anlam taşımaz; premium, tür ve stil metin etiketiyle de belirtilir.
- Hareketler `prefers-reduced-motion` tercihine uyar.

Sekiz düğün temasının açık ve koyu paletleri bu eşiklere karşı otomatik olarak doğrulanmıştır.

## Yeni tema ekleme kontrol listesi

1. `index.html` içinde tüm semantik token'ları açık, sistem koyu ve zorlanmış koyu durumları için tanımla.
2. `studio.html` tema seçeneğini ve galeri renk önizlemesini ekle.
3. `templates.json` kaydında benzersiz `id`, `theme`, `style`, `color`, `blocks`, `copyOptions` ve `preset` alanlarını doldur.
4. Ana/ikincil/CTA kontrastlarını hem açık hem koyu palette AA eşiğine karşı test et.
5. 390 px mobil görünümde yatay taşma olmadığını ve gerçek iframe renderer'ını doğrula.
