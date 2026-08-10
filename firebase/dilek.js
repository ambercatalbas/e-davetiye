// ============================================================
//  Dilek Defteri (guestbook) — davetli mesaj bırakır, canlı liste.
//  invitations/{id}/guestbook/{gid} ; davetli (anonim) yazar, herkes okur.
//    import { dilekBaslat } from "./firebase/dilek.js";
//    dilekBaslat({ inviteId, firebaseConfig, mount, dil });
// ============================================================
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const SOZ = {
  tr: { baslik:"Dilek Defteri", ad:"Adınız", mesaj:"Dileğiniz / mesajınız…", gonder:"Dilek Bırak",
        gonderiliyor:"Gönderiliyor…", tesekkur:"Dileğiniz için teşekkürler 🤍",
        bos:"İlk dileği siz bırakın 🤍", uyari:"Lütfen adınızı ve mesajınızı yazın.", locale:"tr-TR" },
  en: { baslik:"Guestbook", ad:"Your name", mesaj:"Your wishes / message…", gonder:"Leave a Wish",
        gonderiliyor:"Sending…", tesekkur:"Thank you for your message 🤍",
        bos:"Be the first to leave a message 🤍", uyari:"Please enter your name and message.", locale:"en-US" },
  ru: { baslik:"Книга пожеланий", ad:"Ваше имя", mesaj:"Ваши пожелания / сообщение…", gonder:"Оставить пожелание",
        gonderiliyor:"Отправка…", tesekkur:"Спасибо за пожелание 🤍",
        bos:"Оставьте первое пожелание 🤍", uyari:"Пожалуйста, введите имя и сообщение.", locale:"ru-RU" },
  de: { baslik:"Gästebuch", ad:"Ihr Name", mesaj:"Ihre Wünsche / Nachricht…", gonder:"Nachricht hinterlassen",
        gonderiliyor:"Senden…", tesekkur:"Danke für Ihre Nachricht 🤍",
        bos:"Hinterlassen Sie die erste Nachricht 🤍", uyari:"Bitte Namen und Nachricht eingeben.", locale:"de-DE" }
};

function el(tag, cls, txt){ const n = document.createElement(tag); if(cls) n.className = cls; if(txt != null) n.textContent = txt; return n; }

export async function dilekBaslat({ inviteId, firebaseConfig, mount, dil }){
  if(!inviteId || !firebaseConfig || !mount) return;
  const T = SOZ[dil] || SOZ.tr;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app); const db = getFirestore(app);
  try { await signInAnonymously(auth); } catch(e) {}

  function tarih(ts){ try{ const d = ts && ts.toDate ? ts.toDate() : null; return d ? d.toLocaleDateString(T.locale,{day:"numeric",month:"long"}) : ""; }catch(e){ return ""; } }

  const kok = el("div","dilek-blok");
  kok.append(el("p","ust kucuk",T.baslik));

  const form = el("div","dilek-form");
  const ad = el("input","lcv-input"); ad.type="text"; ad.placeholder=T.ad; ad.maxLength=60;
  const mesaj = el("textarea","lcv-input lcv-not"); mesaj.placeholder=T.mesaj; mesaj.maxLength=500;
  const gonder = el("button","btn olumlu",T.gonder); gonder.type="button";
  const yanit = el("p","yanit"); yanit.setAttribute("aria-live","polite");
  form.append(ad, mesaj, gonder, yanit);
  kok.append(form);

  const liste = el("div","dilek-liste"); kok.append(liste);
  mount.innerHTML = ""; mount.append(kok);

  gonder.addEventListener("click", async ()=>{
    const a = ad.value.trim(), m = mesaj.value.trim();
    if(!a || !m){ yanit.textContent = T.uyari; yanit.classList.add("gorunur"); return; }
    gonder.disabled = true; gonder.textContent = T.gonderiliyor;
    try{
      await addDoc(collection(db,"invitations",inviteId,"guestbook"), { ad:a.slice(0,60), mesaj:m.slice(0,500), createdAt:serverTimestamp() });
      ad.value=""; mesaj.value=""; yanit.textContent=T.tesekkur; yanit.classList.add("gorunur");
    }catch(e){ console.error(e); yanit.textContent="!"; yanit.classList.add("gorunur"); }
    finally{ gonder.disabled=false; gonder.textContent=T.gonder; }
  });

  const q = query(collection(db,"invitations",inviteId,"guestbook"), orderBy("createdAt","desc"), limit(50));
  onSnapshot(q, snap=>{
    liste.innerHTML="";
    if(snap.empty){ liste.append(el("p","dilek-bos",T.bos)); return; }
    snap.forEach(d=>{
      const g = d.data(); const c = el("div","dilek-kart");
      c.append(el("p","dilek-mesaj","“"+g.mesaj+"”"));
      c.append(el("p","dilek-imza","— "+g.ad+(tarih(g.createdAt)?" · "+tarih(g.createdAt):"")));
      liste.append(c);
    });
  }, err=> console.warn("guestbook:", err));
}
