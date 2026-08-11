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

// 5) Statik erişilebilirlik (a11y) kontrolleri — WCAG 2.1 AA yapısal alt kümesi.
//    Tarayıcı gerektirmez; yanlış-pozitif riskini düşürmek için yalnız yüksek
//    güvenli kurallar (dinamik/sarmalı-label alanlar bilinçle kapsam dışı).
const etiketlenebilir = /^(text|email|tel|url|number|date|time|search|password|)$/;
for (const h of htmlDosyalar) {
  if (!existsSync(join(KOK, h))) continue;
  const src = oku(h);
  if (!/<html[^>]*\blang=/i.test(src)) uyari(`a11y ${h}: <html lang> yok (WCAG 3.1.1)`);
  const vp = src.match(/<meta[^>]*name=["']viewport["'][^>]*>/i);
  if (vp && /user-scalable\s*=\s*no|maximum-scale\s*=\s*["']?1(?!\d)/i.test(vp[0]))
    uyari(`a11y ${h}: viewport yakınlaştırmayı engelliyor (WCAG 1.4.4)`);
  const posTab = src.match(/tabindex=["']([1-9]\d*)["']/i);
  if (posTab) uyari(`a11y ${h}: pozitif tabindex (${posTab[1]}) odak sırasını bozar (WCAG 2.4.3)`);
  for (const img of src.match(/<img\b[^>]*>/gi) || [])
    if (!/\balt=/i.test(img)) uyari(`a11y ${h}: <img> alt eksik (WCAG 1.1.1) → ${img.slice(0, 60)}`);
  const alanRe = /<(input|textarea|select)\b([^>]*)>/gi;
  let a;
  while ((a = alanRe.exec(src))) {
    const tag = a[1].toLowerCase(), attrs = a[2];
    const type = (attrs.match(/\btype=["']([^"']*)["']/i) || [, ""])[1].toLowerCase();
    if (tag === "input" && !etiketlenebilir.test(type)) continue; // hidden/checkbox/radio/file/button: kapsam dışı
    if (/\baria-label(?:ledby)?=/i.test(attrs)) continue;
    const id = (attrs.match(/\bid=["']([^"']+)["']/) || [, ""])[1];
    if (id && new RegExp('for=["\']' + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '["\']').test(src)) continue;
    uyari(`a11y ${h}: ${tag}${id ? " #" + id : ""} için erişilebilir ad yok — label[for]/aria-label (WCAG 3.3.2/4.1.2)`);
  }
}

if (hatalar.length) {
  console.error("✗ Doğrulama başarısız:\n" + hatalar.map((h) => "  - " + h).join("\n"));
  process.exit(1);
}
console.log("✓ Doğrulama geçti: JSON, yerel varlıklar, modül export'ları, PWA varlıkları ve statik a11y (lang, viewport, tabindex, img alt, form etiketleri) tamam.");
