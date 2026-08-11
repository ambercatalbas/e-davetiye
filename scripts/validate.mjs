// ============================================================
//  Statik site doğrulama — CI'da bağımlılıksız çalışır (Node yerleşik).
//  - JSON dosyaları geçerli mi?
//  - HTML'de referans verilen yerel varlıklar diskte var mı?
//  - Kritik modüller (firebase/*.js) mevcut ve export'ları yerinde mi?
//  Başarısızlıkta süreç 1 ile çıkar → CI kırmızı olur.
// ============================================================
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const KOK = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hatalar = [];
const uyari = (m) => hatalar.push(m);
const oku = (p) => readFileSync(join(KOK, p), "utf8");

// 1) JSON dosyaları geçerli mi?
const jsonlar = ["templates.json", "manifest.webmanifest", "firebase.json", ".firebaserc"];
for (const f of jsonlar) {
  if (!existsSync(join(KOK, f))) { uyari(`Eksik JSON: ${f}`); continue; }
  try { JSON.parse(oku(f)); } catch (e) { uyari(`Bozuk JSON (${f}): ${e.message}`); }
}

// 1b) templates.json şekli
try {
  const t = JSON.parse(oku("templates.json"));
  if (!Array.isArray(t.templates) || t.templates.length === 0) uyari("templates.json: 'templates' boş/dizi değil.");
  else for (const s of t.templates) {
    if (!s.id || !s.name) { uyari(`templates.json: id/name eksik (${JSON.stringify(s).slice(0,60)}…)`); break; }
  }
} catch { /* yukarıda raporlandı */ }

// 2) HTML'de referans verilen yerel varlıklar var mı?
const htmlDosyalar = ["index.html", "studio.html", "yanitlar.html"];
const yerelRefRe = /(?:src|href)\s*=\s*["']([^"']+)["']/g;
const importRe = /import\([^)]*["'](\.\/[^"']+)["']\)|from\s+["'](\.\/[^"']+)["']/g;
for (const h of htmlDosyalar) {
  if (!existsSync(join(KOK, h))) { uyari(`Eksik HTML: ${h}`); continue; }
  const src = oku(h);
  const refler = new Set();
  let m;
  while ((m = yerelRefRe.exec(src))) refler.add(m[1]);
  while ((m = importRe.exec(src))) refler.add(m[1] || m[2]);
  for (const r of refler) {
    if (/^(https?:)?\/\//.test(r) || r.startsWith("data:") || r.startsWith("#") || r.startsWith("mailto:") || r.startsWith("tel:")) continue;
    const temiz = r.split(/[?#]/)[0];
    if (!temiz) continue;
    if (!existsSync(join(KOK, temiz))) uyari(`${h} → eksik yerel varlık: ${temiz}`);
  }
}

// 3) Kritik modüller ve export'ları
const modulKontrol = [
  ["firebase/qr.js", ["export function qrMatrix", "export function qrCanvas"]],
  ["firebase/lcv.js", ["export async function lcvBaslat"]],
  ["firebase/auth.js", ["export function app", "export async function anonSagla"]],
  ["firebase/config.js", ["export const firebaseConfig"]],
];
for (const [f, imzalar] of modulKontrol) {
  if (!existsSync(join(KOK, f))) { uyari(`Eksik modül: ${f}`); continue; }
  const src = oku(f);
  for (const imza of imzalar) if (!src.includes(imza)) uyari(`${f}: beklenen imza yok → "${imza}"`);
}

// 4) OG görseli ve PWA ikonları
for (const varlik of ["og-kapak.jpg", "icons/icon-192.png", "icons/icon-512.png", "sw.js", "manifest.webmanifest"]) {
  if (!existsSync(join(KOK, varlik))) uyari(`Eksik varlık: ${varlik}`);
}

if (hatalar.length) {
  console.error("✗ Doğrulama başarısız:\n" + hatalar.map((h) => "  - " + h).join("\n"));
  process.exit(1);
}
console.log("✓ Doğrulama geçti: JSON, yerel varlıklar, modül export'ları ve PWA varlıkları tamam.");
