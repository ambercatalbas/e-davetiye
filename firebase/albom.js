// ============================================================
//  Misafir Foto Albümü — davetliler etkinlik fotoğrafı yükler, herkes görür.
//  Storage: albums/{inviteId}/... (davetli yükler, herkes okur — storage.rules).
//    import { albomBaslat } from "./firebase/albom.js";
//    albomBaslat({ inviteId, firebaseConfig, mount, dil });
// ============================================================
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const SOZ = {
  tr: { baslik:"Fotoğraf Albümü", yukle:"📷 Fotoğraf Ekle", yukleniyor:"Yükleniyor…", bos:"İlk fotoğrafı siz ekleyin 📷" },
  en: { baslik:"Photo Album", yukle:"📷 Add Photo", yukleniyor:"Uploading…", bos:"Be the first to add a photo 📷" },
  ru: { baslik:"Фотоальбом", yukle:"📷 Добавить фото", yukleniyor:"Загрузка…", bos:"Добавьте первое фото 📷" },
  de: { baslik:"Fotoalbum", yukle:"📷 Foto hinzufügen", yukleniyor:"Hochladen…", bos:"Erstes Foto hinzufügen 📷" }
};

function el(tag, cls, txt){ const n = document.createElement(tag); if(cls) n.className = cls; if(txt != null) n.textContent = txt; return n; }

function kucult(file, max, kalite){
  return new Promise((res, rej)=>{
    const img = new Image();
    img.onload = ()=>{
      let w = img.naturalWidth, h = img.naturalHeight; const m = Math.max(w, h);
      if(m > max){ const o = max / m; w = Math.round(w*o); h = Math.round(h*o); }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(img.src);
      c.toBlob(b => b ? res(b) : rej(new Error("blob")), "image/jpeg", kalite || 0.85);
    };
    img.onerror = ()=>{ URL.revokeObjectURL(img.src); rej(new Error("okunamadı")); };
    img.src = URL.createObjectURL(file);
  });
}

export async function albomBaslat({ inviteId, firebaseConfig, mount, dil }){
  if(!inviteId || !firebaseConfig || !mount) return;
  const T = SOZ[dil] || SOZ.tr;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app); const storage = getStorage(app);
  try { await signInAnonymously(auth); } catch(e) {}

  const kok = el("div","albom-blok");
  kok.append(el("p","ust kucuk",T.baslik));
  const inp = el("input"); inp.type="file"; inp.accept="image/*"; inp.multiple=true; inp.hidden=true;
  const ekle = el("button","btn albom-ekle",T.yukle); ekle.type="button";
  ekle.addEventListener("click", ()=> inp.click());
  kok.append(ekle, inp);
  const grid = el("div","albom-grid"); kok.append(grid);
  mount.innerHTML = ""; mount.append(kok);

  async function listele(){
    try{
      const res = await listAll(ref(storage, "albums/" + inviteId));
      grid.innerHTML = "";
      if(!res.items.length){ grid.append(el("p","dilek-bos",T.bos)); return; }
      for(const it of res.items){
        try{ const url = await getDownloadURL(it); const im = el("img"); im.src = url; im.alt = ""; im.loading = "lazy"; grid.append(im); }
        catch(e){}
      }
    }catch(e){ console.warn("albom liste:", e); }
  }

  inp.addEventListener("change", async ()=>{
    const files = [...(inp.files || [])]; inp.value = ""; if(!files.length) return;
    ekle.textContent = T.yukleniyor; ekle.disabled = true;
    for(const f of files){
      try{
        const blob = await kucult(f, 1600, 0.85);
        const ad = Date.now() + "-" + Math.random().toString(36).slice(2,8) + ".jpg";
        await uploadBytes(ref(storage, "albums/" + inviteId + "/" + ad), blob, { contentType: "image/jpeg" });
      }catch(e){ console.error(e); }
    }
    ekle.textContent = T.yukle; ekle.disabled = false;
    listele();
  });

  listele();
}
