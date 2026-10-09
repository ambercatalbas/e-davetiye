"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("./cekirdek");

const BUGUN = "2026-09-28";

test("istek doğrulama: kısa/uzun/platform/bugün", () => {
  assert.equal(C.istekDogrula({ metin: "düğün" }).hata, "kisa");
  assert.equal(C.istekDogrula({ metin: "x".repeat(1501) }).hata, "uzun");
  const i = C.istekDogrula({ metin: "  Haziranda   kır düğünü  ", platform: "hack", bugun: "2026-02-30" });
  assert.equal(i.metin, "Haziranda kır düğünü");
  assert.equal(i.platform, "web");
  assert.match(i.bugun, /^\d{4}-\d{2}-\d{2}$/);
  assert.notEqual(i.bugun, "2026-02-30");
});

test("şema: platforma göre şablon enum'u, strict", () => {
  const w = C.semaKur("web").json_schema, m = C.semaKur("ios").json_schema;
  assert.equal(w.strict, true);
  assert.equal(w.schema.properties.oneriler.items.properties.sablonId.enum.length, C.KATALOG.web.length);
  assert.deepEqual(m.schema.properties.oneriler.items.properties.sablonId.enum, C.KATALOG.mobil.map((s) => s.id));
  // strict: her nesnede tüm alanlar required + additionalProperties false
  const gez = (s) => {
    if (s.type === "object") {
      assert.equal(s.additionalProperties, false);
      assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort());
      Object.values(s.properties).forEach(gez);
    }
    if (s.type === "array") gez(s.items);
  };
  gez(w.schema);
});

test("sistem mesajı platform başına sabit (önbellek) ve katalogu içerir", () => {
  assert.equal(C.sistemMesaji("web"), C.sistemMesaji("web"));
  assert.ok(C.sistemMesaji("web").includes("dugun-bohem"));
  assert.ok(!C.sistemMesaji("android").includes("dugun-bohem"));
  const m = C.mesajlarKur({ metin: "test metni", platform: "web", bugun: BUGUN });
  assert.ok(m[1].content.includes("2026-09-28 (Pazartesi)"));
});

test("öneriler: geçersiz id atılır, ilk öneri türle eşleşir, 3'e tamamlanır", () => {
  const s = C.sonucuCozumle({
    davetiyeMi: true, tur: "kina", oneriler: [
      { sablonId: "dugun-bohem", neden: "a" }, { sablonId: "yok-boyle", neden: "b" },
      { sablonId: "kina-bordo", neden: "c" }, { sablonId: "kina-bordo", neden: "d" },
    ],
  }, { platform: "web", bugun: BUGUN });
  assert.equal(s.oneriler[0].sablonId, "kina-bordo");
  assert.equal(s.oneriler.length, 3);
  assert.equal(new Set(s.oneriler.map((o) => o.sablonId)).size, 3);
});

test("web: hepsi premium ise bir ücretsiz seçenek eklenir", () => {
  const s = C.sonucuCozumle({
    tur: "dugun", oneriler: [{ sablonId: "dugun-luks" }, { sablonId: "dugun-gece" }, { sablonId: "dugun-bohem" }],
  }, { platform: "web", bugun: BUGUN });
  assert.equal(s.oneriler[0].sablonId, "dugun-luks");
  assert.ok(s.oneriler.some((o) => !o.premium));
});

test("mobil: model teması öneriye geçer, web'de şablonun teması kalır", () => {
  const m = C.sonucuCozumle({ tur: "kina", tema: "luks", oneriler: [{ sablonId: "kina-bohem" }] }, { platform: "ios", bugun: BUGUN });
  assert.equal(m.oneriler[0].tema, "luks");
  const w = C.sonucuCozumle({ tur: "kina", tema: "yaz", oneriler: [{ sablonId: "kina-bordo" }] }, { platform: "web", bugun: BUGUN });
  assert.equal(w.oneriler[0].tema, "luks"); // kina-bordo'nun kendi teması
});

test("tarih/saat: geçmiş yıl ileri alınır, geçersizler null, lcv etkinlikten sonra olamaz", () => {
  const s = C.sonucuCozumle({
    tur: "dugun",
    bilgiler: { tarih: "2026-06-14", saat: "7:30", lcvSonTarih: "2027-07-01", isimler: "  Ayşe & Mehmet ", mekanAd: null },
  }, { platform: "web", bugun: BUGUN });
  assert.equal(s.bilgiler.tarih, "2027-06-14");
  assert.equal(s.bilgiler.saat, "07:30");
  assert.equal(s.bilgiler.lcvSonTarih, null);
  assert.equal(s.bilgiler.isimler, "Ayşe & Mehmet");
  assert.deepEqual(s.eksikler, ["mekan"]);
  assert.equal(C._test.saatDuzelt("25:00"), null);
  assert.equal(C._test.tarihDuzelt("2031-01-01", BUGUN), null); // 3 yıldan uzak
});

test("davetiye değilse davetiyeMi=false korunur; bozuk girdi çökmez", () => {
  assert.equal(C.sonucuCozumle({ davetiyeMi: false }, { platform: "web", bugun: BUGUN }).davetiyeMi, false);
  const s = C.sonucuCozumle(null, { platform: "android", bugun: BUGUN });
  assert.equal(s.tur, "dugun");
  assert.equal(s.oneriler[0].sablonId, "dugun-klasik");
  assert.deepEqual(s.eksikler, ["isimler", "tarih", "saat", "mekan"]);
});

test("program: tek adım atılır, iki adım kalır", () => {
  const tek = C.sonucuCozumle({ tur: "kurumsal", program: [{ saat: "18:30", baslik: "Kokteyl", yer: null }] }, { platform: "web", bugun: BUGUN });
  assert.deepEqual(tek.program, []);
  const iki = C.sonucuCozumle({ tur: "sunnet", program: [{ saat: null, baslik: "Mevlüt", yer: "Ev" }, { saat: "19.00", baslik: "Kutlama", yer: null }] }, { platform: "web", bugun: BUGUN });
  assert.equal(iki.program.length, 2);
  assert.equal(iki.program[1].saat, "19:00");
});

test("gün belirtilmemişse model tarihi atılır (\"Haziranda\" → uydurma gün)", () => {
  const g = C._test.gunBelirtilmis;
  for (const e of ["14 Haziran'da düğün", "12 ekim cumartesi", "14.06.2027", "gelecek cumartesi", "yarın akşam",
    "June 14th", "on the 3rd of May", "Saturday party", "2027-06-14", "15 июня", "am Samstag", "20 eylülde", "14/06"]) assert.ok(g(e), e);
  for (const h of ["Haziranda Bodrum'da düğün", "next June in Istanbul", "hafta sonu mevlüt", "yakında nişan", "18:00 nikâh 19:30 yemek", "saat 19.30'da", "19.10'da başlıyor"]) assert.ok(!g(h), h);
  const s = C.sonucuCozumle({ tur: "dugun", bilgiler: { tarih: "2027-06-05", lcvSonTarih: "2027-05-20" } },
    { platform: "web", bugun: BUGUN, metin: "Haziranda Bodrum'da kır düğünü" });
  assert.equal(s.bilgiler.tarih, null);
  assert.ok(s.eksikler.includes("tarih"));
  const k = C.sonucuCozumle({ tur: "dugun", bilgiler: { tarih: "2027-06-14" } }, { platform: "web", bugun: BUGUN, metin: "14 Haziran'da düğün" });
  assert.equal(k.bilgiler.tarih, "2027-06-14");
});
