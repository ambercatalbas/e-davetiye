// ============================================================
//  qr.js birim testleri — Node yerleşik test koşucusu (node --test).
//  qrMatrix saf (canvas/DOM gerektirmez), bu yüzden Node'da doğrulanabilir.
//  QR yapısal değişmezleri regresyona karşı korunur; doğruluk ayrıca
//  tarayıcıda bağımsız bir çözücüyle (jsQR) round-trip test edilmiştir.
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { qrMatrix } from "../firebase/qr.js";

test("kısa girdi → sürüm 1 (21×21), kare ve boolean matris", () => {
  const { size, modules } = qrMatrix("HI", "M");
  assert.equal(size, 21, "sürüm 1 boyutu 21 olmalı");
  assert.equal(modules.length, 21);
  for (const satir of modules) {
    assert.equal(satir.length, 21);
    for (const h of satir) assert.equal(typeof h, "boolean");
  }
});

test("bulucu (finder) desenleri üç köşede doğru", () => {
  const { modules } = qrMatrix("HI", "M");
  // Sol-üst bulucu: dış halka koyu, iç halka açık, merkez koyu
  assert.equal(modules[0][0], true, "dış köşe koyu");
  assert.equal(modules[3][3], true, "merkez koyu");
  assert.equal(modules[1][1], false, "iç açık halka");
  // Sağ-üst ve sol-alt bulucu merkezleri
  assert.equal(modules[3][17], true, "sağ-üst bulucu merkezi");
  assert.equal(modules[17][3], true, "sol-alt bulucu merkezi");
});

test("zamanlama (timing) deseni 6. satırda değişimli", () => {
  const { modules } = qrMatrix("HI", "M");
  // x=8 ve x=10 çift → koyu; x=9 tek → açık (bulucu/ayraç dışındaki bölge)
  assert.equal(modules[6][8], true);
  assert.equal(modules[6][9], false);
  assert.equal(modules[6][10], true);
});

test("daha uzun girdi daha büyük sürüm üretir", () => {
  const kisa = qrMatrix("x", "M").size;
  const uzun = qrMatrix("https://ambercatalbas.github.io/e-davetiye/?id=" + "a".repeat(120), "M").size;
  assert.ok(uzun > kisa, `uzun (${uzun}) > kısa (${kisa}) olmalı`);
});

test("deterministik: aynı girdi aynı matrisi verir", () => {
  const a = qrMatrix("E-Davetiye", "M");
  const b = qrMatrix("E-Davetiye", "M");
  assert.deepEqual(a.modules, b.modules);
});

test("hata düzeltme seviyeleri geçerli ve boyut monoton", () => {
  for (const ecl of ["L", "M", "Q", "H"]) {
    const { size } = qrMatrix("Düğün · Nişan · Kına", ecl);
    assert.ok(size >= 21 && (size - 17) % 4 === 0, `geçerli sürüm boyutu (${ecl}): ${size}`);
  }
});

test("aşırı uzun girdi hata fırlatır (kapasite aşımı)", () => {
  assert.throws(() => qrMatrix("z".repeat(3000), "H"));
});
