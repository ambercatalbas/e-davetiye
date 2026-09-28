// ============================================================
//  AI şablon kataloğu üretici — functions/ai/katalog.json
//  Cloud Functions yalnız functions/ klasörünü yükler; templates.json'a
//  oradan erişilemez. Bu betik AI'ın seçebileceği şablonları (web + mobil)
//  sade bir kataloğa döker. templates.json değişince yeniden çalıştır:
//    node scripts/ai-katalog.mjs        (firebase.json predeploy da çalıştırır)
//  validate.mjs kataloğun güncel olduğunu denetler.
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const KOK = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Mobil (iOS Sablonlar.swift / Android Sablonlar.kt) şablonları — iki platformda
// birebir aynı id'ler. Açıklamalar yalnız AI seçimi içindir (kullanıcıya gösterilmez).
const MOBIL = [
  { id: "dugun-klasik", tur: "dugun", ad: "Klasik Düğün", tema: "safak", aciklama: "Zarif serif, altın tonlar, zamansız klasik düğün." },
  { id: "dugun-minimal", tur: "dugun", ad: "Minimal Düğün", tema: "minimal", aciklama: "Sade, krem-bej, az süslü modern minimal düğün/nikâh." },
  { id: "nisan-pudra", tur: "nisan", ad: "Pudra Nişan", tema: "pudra", aciklama: "Romantik pudra pembe nişan / söz." },
  { id: "kina-bohem", tur: "kina", ad: "Bohem Kına", tema: "bohem", aciklama: "Toprak tonlu, sıcak, geleneksel-bohem kına gecesi." },
  { id: "sunnet-cocuk", tur: "sunnet", ad: "Çocuk Sünnet", tema: "cocuk", aciklama: "Neşeli mavi tonlu sünnet düğünü / mevlüt." },
  { id: "bebek-pudra", tur: "bebek", ad: "Bebek Hoş Geldin", tema: "pudra", aciklama: "Yumuşak tonlu bebek hoş geldin, baby shower, bebek mevlüdü." },
  { id: "dogumgunu-cocuk", tur: "dogumgunu", ad: "Doğum Günü", tema: "cocuk", aciklama: "Renkli, eğlenceli doğum günü partisi (çocuk ya da yetişkin)." },
  { id: "kurumsal-modern", tur: "kurumsal", ad: "Kurumsal", tema: "modern", aciklama: "Açılış, lansman, gala, konferans gibi kurumsal etkinlikler." },
  { id: "std-gece", tur: "save-the-date", ad: "Save the Date", tema: "gece", aciklama: "Tarihi önceden duyuran zarif 'tarihi ayırın' kartı." },
  { id: "tesekkur-luks", tur: "tesekkur", ad: "Teşekkür", tema: "luks", aciklama: "Etkinlik sonrası katılım için teşekkür kartı." },
];

export function katalogUret() {
  const t = JSON.parse(readFileSync(join(KOK, "templates.json"), "utf8"));
  const web = t.templates.map((s) => ({
    id: s.id, tur: s.type, ad: s.name, stil: s.style, renk: s.colorLabel,
    tema: s.theme, premium: !!s.premium, aciklama: s.description,
  }));
  return { surum: t.version || 1, web, mobil: MOBIL };
}

export const KATALOG_YOLU = join(KOK, "functions", "ai", "katalog.json");

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(dirname(KATALOG_YOLU), { recursive: true });
  const k = katalogUret();
  writeFileSync(KATALOG_YOLU, JSON.stringify(k, null, 1) + "\n");
  console.log(`AI kataloğu yazıldı: web ${k.web.length}, mobil ${k.mobil.length} şablon`);
}
