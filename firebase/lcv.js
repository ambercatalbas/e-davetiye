// ============================================================
//  LCV (RSVP) web modülü — TASLAK
//  Davetiye sayfasına "Geliyorum / Gelemiyorum" formu ekler,
//  yanıtı Firestore'a yazar. Davetli anonim olarak giriş yapar.
//
//  Firebase config kullanıcının projesinden gelecek; index.html'e
//  şöyle bağlanır:
//    <script type="module">
//      import { lcvBaslat } from "./firebase/lcv.js";
//      lcvBaslat({
//        inviteId,                 // ?id= ile gelen Firestore davetiye kimliği
//        firebaseConfig: {...},    // Firebase web config
//        mount: document.getElementById("lcv")
//      });
//    </script>
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Küçük DOM yardımcıları
function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

export async function lcvBaslat({ inviteId, firebaseConfig, mount }) {
  if (!inviteId || !firebaseConfig || !mount) {
    console.warn("lcvBaslat: inviteId / firebaseConfig / mount gerekli");
    return;
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  // Davetli anonim giriş yapar (kurallar auth ister). Kapalıysa form yine görünür.
  try { await signInAnonymously(auth); } catch (e) { console.warn("Anonim giriş yok:", e); }

  let durum = null; // "geliyorum" | "gelemiyorum"

  const kok = el("div", "lcv-blok");
  kok.append(el("p", "ust", "Katılım Bildir"));

  // Ad
  const ad = el("input", "lcv-input");
  ad.type = "text";
  ad.placeholder = "Adınız";
  ad.maxLength = 80;
  kok.append(ad);

  // Durum butonları
  const durumSatir = el("div", "rsvp");
  const btnGel = el("button", "btn", "Geliyorum");
  const btnYok = el("button", "btn", "Gelemiyorum");
  btnGel.type = btnYok.type = "button";
  durumSatir.append(btnGel, btnYok);
  kok.append(durumSatir);

  // Kişi sayısı (yalnız "geliyorum")
  const kisiSatir = el("div", "lcv-kisi");
  kisiSatir.style.display = "none";
  const kisiEtiket = el("span", "lcv-kisi-etiket", "Kişi sayısı");
  const kisiInput = el("input", "lcv-input lcv-kisi-input");
  kisiInput.type = "number"; kisiInput.min = "1"; kisiInput.max = "20"; kisiInput.value = "1";
  kisiSatir.append(kisiEtiket, kisiInput);
  kok.append(kisiSatir);

  // Not
  const not = el("textarea", "lcv-input lcv-not");
  not.placeholder = "Not (isteğe bağlı)";
  not.maxLength = 300;
  kok.append(not);

  // Gönder
  const gonder = el("button", "btn olumlu", "Yanıtı Gönder");
  gonder.type = "button";
  gonder.disabled = true;
  kok.append(gonder);

  const yanit = el("p", "yanit");
  yanit.setAttribute("aria-live", "polite");
  kok.append(yanit);

  function durumSec(secilen) {
    durum = secilen;
    btnGel.classList.toggle("secili", secilen === "geliyorum");
    btnYok.classList.toggle("secili", secilen === "gelemiyorum");
    kisiSatir.style.display = secilen === "geliyorum" ? "" : "none";
    gonder.disabled = false;
  }
  btnGel.addEventListener("click", () => durumSec("geliyorum"));
  btnYok.addEventListener("click", () => durumSec("gelemiyorum"));

  gonder.addEventListener("click", async () => {
    if (!durum) return;
    if (!ad.value.trim()) { yanit.textContent = "Lütfen adınızı yazın."; yanit.classList.add("gorunur"); return; }
    gonder.disabled = true;
    gonder.textContent = "Gönderiliyor…";
    try {
      await addDoc(collection(db, "invitations", inviteId, "rsvps"), {
        ad: ad.value.trim().slice(0, 80),
        durum,
        kisiSayisi: durum === "geliyorum" ? Math.min(20, Math.max(1, parseInt(kisiInput.value || "1", 10))) : 0,
        not: not.value.trim().slice(0, 300),
        createdAt: serverTimestamp()
      });
      // Teşekkür durumu
      kok.innerHTML = "";
      kok.append(el("p", "ust", "Teşekkürler"));
      kok.append(el("p", "giris",
        durum === "geliyorum"
          ? "Yanıtınız alındı — sizi görmek için sabırsızız! 🎉"
          : "Yanıtınız alındı. Bir dahaki sefere mutlaka. 🤍"));
    } catch (e) {
      console.error(e);
      gonder.disabled = false;
      gonder.textContent = "Yanıtı Gönder";
      yanit.textContent = "Bir sorun oldu, tekrar deneyin.";
      yanit.classList.add("gorunur");
    }
  });

  mount.innerHTML = "";
  mount.append(kok);
}
