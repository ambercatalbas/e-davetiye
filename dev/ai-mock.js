// Yerel geliştirme için örnek AI yanıtı (studio.html?aiMock=1, yalnız localhost).
// Şekli functions/ai/cekirdek.js sonucuCozumle() çıktısıyla birebir aynıdır.
export default {
  ok: true, kalan: 2,
  sonuc: {
    davetiyeMi: true, tur: "dugun", dil: "tr", tema: "bohem",
    stilOzeti: "Gün batımında bohem kır düğünü",
    oneriler: [
      { sablonId: "dugun-bohem", ad: "Toprak & Rüzgâr", tur: "dugun", tema: "bohem", premium: true, neden: "Toprak tonları ve rüzgârlı kır havası, Bodrum'daki gün batımına çok yakışır." },
      { sablonId: "dugun-botanik", ad: "Yeşil Yemin", tur: "dugun", tema: "botanik", premium: true, neden: "Doğayla iç içe bir kır düğünü için yeşil, botanik bir dil." },
      { sablonId: "dugun-minimal", ad: "Sessiz Zarafet", tur: "dugun", tema: "minimal", premium: false, neden: "Sade ve ferah; ücretsiz ve her havaya uyar." },
    ],
    bilgiler: { isimler: "Elif & Can", tarih: "2027-06-14", saat: null, mekanAd: null, mekanAdres: null, sehir: "Bodrum", kiyafet: null, lcvSonTarih: null, yas: null },
    program: [],
    metin: {
      ustBaslik: "Düğün Davetiyesi", alici: "Sevgili Dostlarımız", baslik: "Gün Batımında Evet Diyoruz",
      giris: "Bodrum'un altın ışığında, denizin kıyısında hayatımızı birleştiriyoruz. Bu güzel günde sevdiklerimizin yanımızda olması en büyük mutluluğumuz olacak.",
      imza: "Sevgiyle,", muhur: "SONSUZA DEK ·",
    },
    eksikler: ["saat", "mekan"],
  },
};
