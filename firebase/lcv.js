// ============================================================
//  LCV (RSVP) web modülü — Firestore'a yazar, davetli anonim giriş yapar.
//  Çoklu dil: lcvBaslat({..., dil}) ile form metinleri TR/EN/RU/DE gösterilir.
//  KVKK rıza DEĞERLERİ (consentVersion vb.) dile bakılmaz — kurallarla sabittir.
//    <script type="module">
//      import { lcvBaslat } from "./firebase/lcv.js";
//      lcvBaslat({ inviteId, firebaseConfig, mount, dil });
//    </script>
// ============================================================
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Görünen metinler (yalnız arayüz; saklanan rıza değerleri sabit kalır)
const LCV_SOZ = {
  tr: { baslik:"Katılım Bildir", ad:"Adınız", geliyorum:"Geliyorum", gelemiyorum:"Gelemiyorum",
        kisi:"Kişi sayısı", not:"Not (isteğe bağlı)", gonder:"Yanıtı Gönder", gonderiliyor:"Gönderiliyor…",
        adUyari:"Lütfen adınızı yazın.", rizaUyari:"Yanıtı iletmek için açık rıza seçimini yapın.",
        tesekkur:"Teşekkürler", gel:"Yanıtınız alındı — sizi görmek için sabırsızız! 🎉",
        yok:"Yanıtınız alındı. Bir dahaki sefere mutlaka. 🤍", hata:"Bir sorun oldu, tekrar deneyin.",
        aydinlatma:'Adınız ve katılım yanıtınız, etkinliği planlayabilmesi için davetiye sahibine iletilir. Ayrıntılar için <a href="./legal.html#lcv" target="_blank" rel="noopener">LCV Aydınlatma Metni</a>.',
        riza:" LCV yanıtımın davetiye sahibine iletilmesine açık rıza veriyorum." },
  en: { baslik:"RSVP", ad:"Your name", geliyorum:"I'm coming", gelemiyorum:"Can't make it",
        kisi:"Guests", not:"Note (optional)", gonder:"Send Response", gonderiliyor:"Sending…",
        adUyari:"Please enter your name.", rizaUyari:"Please consent to send your response.",
        tesekkur:"Thank you", gel:"Your response is received — we can't wait to see you! 🎉",
        yok:"Your response is received. Next time for sure. 🤍", hata:"Something went wrong, please try again.",
        aydinlatma:'Your name and RSVP are shared with the host to help plan the event. Details: <a href="./legal.html#lcv" target="_blank" rel="noopener">privacy notice</a>.',
        riza:" I consent to my RSVP being shared with the host." },
  ru: { baslik:"Подтвердить участие", ad:"Ваше имя", geliyorum:"Приду", gelemiyorum:"Не смогу",
        kisi:"Кол-во гостей", not:"Примечание (необязательно)", gonder:"Отправить", gonderiliyor:"Отправка…",
        adUyari:"Пожалуйста, введите имя.", rizaUyari:"Дайте согласие на отправку ответа.",
        tesekkur:"Спасибо", gel:"Ваш ответ получен — ждём встречи с вами! 🎉",
        yok:"Ваш ответ получен. В следующий раз обязательно. 🤍", hata:"Произошла ошибка, попробуйте снова.",
        aydinlatma:'Ваше имя и ответ будут переданы организатору для планирования события. Подробнее: <a href="./legal.html#lcv" target="_blank" rel="noopener">уведомление о конфиденциальности</a>.',
        riza:" Я согласен(на) на передачу моего ответа организатору." },
  de: { baslik:"Zusagen", ad:"Ihr Name", geliyorum:"Ich komme", gelemiyorum:"Kann nicht",
        kisi:"Personenzahl", not:"Notiz (optional)", gonder:"Antwort senden", gonderiliyor:"Senden…",
        adUyari:"Bitte geben Sie Ihren Namen ein.", rizaUyari:"Bitte stimmen Sie dem Senden zu.",
        tesekkur:"Danke", gel:"Ihre Antwort ist eingegangen — wir freuen uns auf Sie! 🎉",
        yok:"Ihre Antwort ist eingegangen. Beim nächsten Mal bestimmt. 🤍", hata:"Etwas ist schiefgelaufen, bitte erneut versuchen.",
        aydinlatma:'Ihr Name und Ihre Zusage werden zur Planung an die gastgebende Person weitergegeben. Details: <a href="./legal.html#lcv" target="_blank" rel="noopener">Datenschutzhinweis</a>.',
        riza:" Ich stimme zu, dass meine Antwort an die gastgebende Person weitergegeben wird." }
};

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

export async function lcvBaslat({ inviteId, firebaseConfig, mount, dil, konuk }) {
  if (!inviteId || !firebaseConfig || !mount) {
    console.warn("lcvBaslat: inviteId / firebaseConfig / mount gerekli");
    return;
  }
  const T = LCV_SOZ[dil] || LCV_SOZ.tr;
  const konukAd = (konuk || "").trim().slice(0, 80); // kişiye özel davet: ismi/hitabı

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  try { await signInAnonymously(auth); } catch (e) { console.warn("Anonim giriş yok:", e); }

  let durum = null; // "geliyorum" | "gelemiyorum"

  const kok = el("div", "lcv-blok");
  kok.append(el("p", "ust", T.baslik));

  const ad = el("input", "lcv-input");
  ad.type = "text"; ad.placeholder = T.ad; ad.maxLength = 80; ad.setAttribute("aria-label", T.ad);
  if (konukAd) ad.value = konukAd; // kişiye özel link: ad önceden dolu
  kok.append(ad);

  const durumSatir = el("div", "rsvp");
  const btnGel = el("button", "btn", T.geliyorum);
  const btnYok = el("button", "btn", T.gelemiyorum);
  btnGel.type = btnYok.type = "button";
  durumSatir.append(btnGel, btnYok);
  kok.append(durumSatir);

  const kisiSatir = el("div", "lcv-kisi");
  kisiSatir.style.display = "none";
  const kisiEtiket = el("span", "lcv-kisi-etiket", T.kisi);
  const kisiInput = el("input", "lcv-input lcv-kisi-input");
  kisiInput.type = "number"; kisiInput.min = "1"; kisiInput.max = "20"; kisiInput.value = "1"; kisiInput.setAttribute("aria-label", T.kisi);
  kisiSatir.append(kisiEtiket, kisiInput);
  kok.append(kisiSatir);

  const not = el("textarea", "lcv-input lcv-not");
  not.placeholder = T.not; not.maxLength = 300; not.setAttribute("aria-label", T.not);
  kok.append(not);

  // Aydınlatma + açık rıza (rıza değerleri sabit, dile bağlı değil)
  const aydinlatma = el("p", "lcv-aydinlatma");
  aydinlatma.innerHTML = T.aydinlatma;
  kok.append(aydinlatma);

  const rizaEtiket = el("label", "lcv-riza");
  const riza = el("input", "lcv-riza-input");
  riza.type = "checkbox"; riza.required = true;
  rizaEtiket.append(riza, document.createTextNode(T.riza));
  kok.append(rizaEtiket);

  const gonder = el("button", "btn olumlu", T.gonder);
  gonder.type = "button"; gonder.disabled = true;
  kok.append(gonder);

  const yanit = el("p", "yanit");
  yanit.setAttribute("aria-live", "polite");
  kok.append(yanit);

  function durumSec(secilen) {
    durum = secilen;
    btnGel.classList.toggle("secili", secilen === "geliyorum");
    btnYok.classList.toggle("secili", secilen === "gelemiyorum");
    kisiSatir.style.display = secilen === "geliyorum" ? "" : "none";
    gonder.disabled = !riza.checked;
  }
  btnGel.addEventListener("click", () => durumSec("geliyorum"));
  btnYok.addEventListener("click", () => durumSec("gelemiyorum"));
  riza.addEventListener("change", () => { gonder.disabled = !durum || !riza.checked; });

  gonder.addEventListener("click", async () => {
    if (!durum) return;
    if (!ad.value.trim()) { yanit.textContent = T.adUyari; yanit.classList.add("gorunur"); return; }
    if (!riza.checked) { yanit.textContent = T.rizaUyari; yanit.classList.add("gorunur"); return; }
    gonder.disabled = true;
    gonder.textContent = T.gonderiliyor;
    try {
      const kayit = {
        ad: ad.value.trim().slice(0, 80),
        durum,
        kisiSayisi: durum === "geliyorum" ? Math.min(20, Math.max(1, parseInt(kisiInput.value || "1", 10))) : 0,
        not: not.value.trim().slice(0, 300),
        consentVersion: "lcv-tr-2026-08-06-v1",
        consentGranted: true,
        privacyNoticeVersion: "privacy-2026-08-06-v1",
        createdAt: serverTimestamp()
      };
      if (konukAd) kayit.konukAnahtari = konukAd; // kişi bazlı takip (davetli tokenı)
      await addDoc(collection(db, "invitations", inviteId, "rsvps"), kayit);
      kok.innerHTML = "";
      kok.append(el("p", "ust", T.tesekkur));
      kok.append(el("p", "giris", durum === "geliyorum" ? T.gel : T.yok));
    } catch (e) {
      console.error(e);
      gonder.disabled = false;
      gonder.textContent = T.gonder;
      yanit.textContent = T.hata;
      yanit.classList.add("gorunur");
    }
  });

  mount.innerHTML = "";
  mount.append(kok);
}
