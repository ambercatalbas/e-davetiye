// ============================================================
//  AI Davetiye Sihirbazı (studio) — "Anlat, biz hazırlayalım"
//  Tembel yüklenir (studio.html → aiAc()). Studio'nun kendi fonksiyonlarını
//  `api` üzerinden kullanır; editör mantığını kopyalamaz.
//
//  Akış:  1) Anlat (yazı / ses)  →  2) Hazırlanıyor  →  3) Sonuç
//         Sonuçta önerilen şablon, kullanıcının bilgileriyle doldurulmuş olarak
//         GERÇEK motorla (index.html#i=) önizlenir; alternatifler tek dokunuşla
//         değişir; eksik bilgi (isim/tarih/saat/mekân) yerinde tamamlanır.
//         "Bununla devam et" → editöre uygulanır (Geri al ile eski taslak döner).
//  Önizleme sırasında editör geçici olarak doldurulur; vazgeçilirse anlık görüntü geri yüklenir.
// ============================================================

const AI_FN = "https://us-central1-e-davetiye-94b6b.cloudfunctions.net/aiDavetiyeOner";
const TASLAK_METIN = "studio.aiMetin.v1";   // yarım kalan anlatım (yalnız bu tarayıcıda)

const TUR_EMOJI = { dugun:"💍", nisan:"💐", kina:"🌙", sunnet:"⭐", bebek:"🍼", dogumgunu:"🎂", yaz:"☀️", "save-the-date":"📅", tesekkur:"🤍", kurumsal:"🏢" };
const TUR_AD = { dugun:"Düğün", nisan:"Nişan", kina:"Kına", sunnet:"Sünnet", bebek:"Bebek", dogumgunu:"Doğum günü", yaz:"Yaz daveti", "save-the-date":"Save the Date", tesekkur:"Teşekkür", kurumsal:"Kurumsal" };
const ORNEKLER = [
  "14 Haziran'da Bodrum'da gün batımında kır düğünü, toprak tonları, Elif & Can",
  "Oğlum Eren'in sünnet düğünü, 12 Ekim Cumartesi 19:00, Kristal Salon, neşeli olsun",
  "Kızımın 5. yaş günü, prenses temalı, pembe, evde bahçe partisi",
  "Şirketimizin yeni ofis açılışı, 3 Kasım 18:30, şık ve kurumsal",
  "Kına gecesi, bordo ve altın, geleneksel ama modern, 20 Eylül",
];
const ADIMLAR = ["Anlattıklarını anlıyorum", "Sana uygun şablonları seçiyorum", "Davetiye metnini yazıyorum"];
const EKSIK = {
  isimler: { etiket:"İsimler", ph:"Ayşe & Mehmet", tip:"text", ikon:"✍️" },
  tarih:   { etiket:"Tarih", tip:"date", ikon:"📅" },
  saat:    { etiket:"Saat", tip:"time", ikon:"🕖" },
  mekan:   { etiket:"Mekân", ph:"Salon / mekân adı", tip:"text", ikon:"📍" },
};
const azHareket = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

let api = null, kok = null, durum = null;

// ---------------------------------------------------------------- stil
const CSS = `
.ai-ov{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:20px;}
.ai-ov[hidden]{display:none;}
.ai-arka{position:absolute;inset:0;background:rgba(10,12,22,.6);backdrop-filter:blur(4px);animation:aiFade .2s ease;}
.ai-kart{position:relative;z-index:1;width:min(980px,100%);max-height:calc(100dvh - 40px);overflow:auto;
  background:var(--panel);border:1px solid var(--edge);border-radius:18px;box-shadow:0 50px 120px -40px var(--shadow);
  animation:aiUp .28s cubic-bezier(.2,.8,.2,1);}
.ai-kart.dar{width:min(620px,100%);}
@keyframes aiFade{from{opacity:0}} @keyframes aiUp{from{opacity:0;transform:translateY(14px) scale(.985)}}
.ai-bas{display:flex;align-items:center;gap:10px;padding:16px 18px 0;}
.ai-bas .ai-rozet{font-size:.66rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);
  border:1px solid var(--hair);border-radius:20px;padding:4px 10px;}
.ai-kapat{margin-left:auto;width:34px;height:34px;border-radius:50%;border:1px solid var(--edge);background:var(--panel-2);
  color:var(--soft);font-size:1.1rem;cursor:pointer;line-height:1;}
.ai-kapat:hover{color:var(--ink);border-color:var(--gold);}
.ai-govde{padding:10px 26px 26px;}
.ai-h{font-family:var(--f-serif);font-weight:500;font-size:clamp(1.5rem,3.4vw,2rem);line-height:1.15;margin:8px 0 6px;color:var(--ink);}
.ai-alt{color:var(--soft);margin:0 0 18px;font-size:.95rem;line-height:1.5;}
.ai-alan{position:relative;border:1.5px solid var(--field-edge);border-radius:14px;background:var(--field);transition:border-color .15s,box-shadow .15s;}
.ai-alan:focus-within{border-color:var(--gold);box-shadow:0 0 0 4px color-mix(in srgb,var(--gold) 16%,transparent);}
.ai-alan.dinliyor{border-color:var(--coral);box-shadow:0 0 0 4px color-mix(in srgb,var(--coral) 16%,transparent);}
.ai-alan textarea{display:block;width:100%;min-height:132px;resize:vertical;border:0;background:transparent;color:var(--ink);
  font:inherit;font-size:1.02rem;line-height:1.55;padding:16px 16px 52px;outline:none;}
.ai-arac{position:absolute;left:10px;right:10px;bottom:10px;display:flex;align-items:center;gap:8px;}
.ai-mik{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px 0 11px;border-radius:20px;border:1px solid var(--edge);
  background:var(--panel-2);color:var(--ink);font:700 .8rem var(--f-sans);cursor:pointer;}
.ai-mik:hover{border-color:var(--gold);}
.ai-mik .nokta{width:10px;height:10px;border-radius:50%;background:var(--coral);}
.ai-alan.dinliyor .ai-mik{background:var(--coral);color:#fff;border-color:transparent;}
.ai-alan.dinliyor .ai-mik .nokta{background:#fff;animation:aiNabiz 1.1s ease-in-out infinite;}
@keyframes aiNabiz{50%{transform:scale(1.6);opacity:.5}}
.ai-sayac{margin-left:auto;font-size:.72rem;color:var(--faint);font-variant-numeric:tabular-nums;}
.ai-ornek-bas{font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);margin:18px 0 8px;}
.ai-ornekler{display:flex;flex-wrap:wrap;gap:8px;}
.ai-ornek{border:1px solid var(--edge);background:var(--panel-2);color:var(--soft);border-radius:20px;padding:7px 13px;
  font:.8rem/1.3 var(--f-sans);cursor:pointer;text-align:left;transition:border-color .15s,color .15s;}
.ai-ornek:hover{border-color:var(--gold);color:var(--ink);}
.ai-alt-bar{display:flex;align-items:center;gap:12px;margin-top:22px;flex-wrap:wrap;}
.ai-git{display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 22px;border-radius:12px;border:0;cursor:pointer;
  background:var(--gold);color:var(--on-gold);font:800 .95rem var(--f-sans);letter-spacing:.02em;box-shadow:0 12px 30px -14px var(--gold);}
.ai-git:disabled{opacity:.45;cursor:not-allowed;box-shadow:none;}
.ai-git:not(:disabled):hover{filter:brightness(1.06);}
.ai-not{font-size:.74rem;color:var(--faint);line-height:1.45;flex:1;min-width:200px;}
.ai-hata{margin:14px 0 0;padding:11px 14px;border-radius:10px;background:color-mix(in srgb,var(--coral) 12%,transparent);
  color:var(--ink);font-size:.86rem;border:1px solid color-mix(in srgb,var(--coral) 35%,transparent);}
.ai-hata[hidden]{display:none;}
/* Hazırlanıyor */
.ai-yuk{display:grid;place-items:center;text-align:center;padding:26px 8px 12px;}
.ai-kalp{width:92px;height:128px;border-radius:12px;position:relative;overflow:hidden;margin-bottom:22px;
  background:linear-gradient(145deg,var(--panel-2),var(--bg-2));border:1px solid var(--hair);}
.ai-kalp::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,color-mix(in srgb,var(--gold) 35%,transparent) 50%,transparent 70%);
  transform:translateX(-100%);animation:aiParla 1.6s ease-in-out infinite;}
.ai-kalp i{position:absolute;left:14px;right:14px;height:6px;border-radius:3px;background:var(--hair);}
@keyframes aiParla{to{transform:translateX(100%)}}
.ai-adimlar{list-style:none;padding:0;margin:0 auto;display:grid;gap:10px;text-align:left;}
.ai-adimlar li{display:flex;align-items:center;gap:10px;color:var(--faint);font-size:.95rem;transition:color .3s;}
.ai-adimlar li .ik{width:22px;height:22px;border-radius:50%;border:1.5px solid var(--edge);display:grid;place-items:center;font-size:.7rem;flex:none;}
.ai-adimlar li.aktif{color:var(--ink);} .ai-adimlar li.aktif .ik{border-color:var(--gold);border-top-color:transparent;animation:aiDon .8s linear infinite;}
.ai-adimlar li.bitti{color:var(--soft);} .ai-adimlar li.bitti .ik{background:var(--gold);border-color:var(--gold);color:var(--on-gold);}
@keyframes aiDon{to{transform:rotate(360deg)}}
.ai-iptal{margin-top:22px;background:none;border:0;color:var(--soft);text-decoration:underline;cursor:pointer;font:inherit;font-size:.85rem;}
/* Sonuç */
.ai-sonuc{display:grid;grid-template-columns:minmax(0,380px) minmax(0,1fr);gap:26px;align-items:start;}
.ai-telefon{position:sticky;top:0;border-radius:26px;padding:9px;background:linear-gradient(160deg,#1b1f33,#0b0d17);box-shadow:0 30px 60px -30px var(--shadow);}
.ai-telefon iframe{display:block;width:100%;height:min(640px,70dvh);border:0;border-radius:19px;background:#fff;}
.ai-telefon .ai-yenile{position:absolute;inset:9px;border-radius:19px;background:rgba(10,12,22,.35);display:grid;place-items:center;color:#fff;font-size:.8rem;
  opacity:0;pointer-events:none;transition:opacity .2s;}
.ai-telefon.yukleniyor .ai-yenile{opacity:1;}
.ai-bolum{margin-bottom:20px;}
.ai-bolum-bas{font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);margin:0 0 9px;}
.ai-cipler{display:flex;flex-wrap:wrap;gap:7px;}
.ai-cip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;background:var(--panel-2);border:1px solid var(--edge);
  font-size:.84rem;color:var(--ink);}
.ai-eksik-kutu{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
.ai-eksik{display:flex;flex-direction:column;gap:4px;padding:9px 11px;border:1.5px dashed var(--hair);border-radius:12px;background:var(--panel-2);}
.ai-eksik label{font-size:.72rem;font-weight:700;color:var(--soft);}
.ai-eksik input{border:0;background:transparent;color:var(--ink);font:inherit;font-size:.92rem;outline:none;padding:0;min-width:0;}
.ai-eksik:focus-within{border-style:solid;border-color:var(--gold);}
.ai-eksik.dolu{border-style:solid;border-color:var(--edge);}
.ai-secilen{border:1.5px solid var(--gold);border-radius:14px;padding:14px 16px;background:color-mix(in srgb,var(--gold) 6%,var(--panel));}
.ai-secilen .ust{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.ai-secilen h3{font-family:var(--f-serif);font-weight:500;font-size:1.3rem;margin:0;color:var(--ink);}
.ai-etiket{font-size:.64rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:20px;border:1px solid var(--edge);color:var(--soft);}
.ai-etiket.onerilen{background:var(--gold);color:var(--on-gold);border-color:transparent;}
.ai-etiket.premium{border-color:var(--hair);color:var(--gold);}
.ai-secilen p{margin:6px 0 0;color:var(--soft);font-size:.9rem;line-height:1.45;}
.ai-alternatifler{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;}
.ai-alt-kart{text-align:left;border:1px solid var(--edge);border-radius:12px;background:var(--panel-2);padding:0;overflow:hidden;cursor:pointer;color:var(--ink);font:inherit;
  transition:border-color .15s,transform .15s;}
.ai-alt-kart:hover{border-color:var(--gold);transform:translateY(-1px);}
.ai-alt-kart[aria-pressed="true"]{border-color:var(--gold);box-shadow:0 0 0 2px var(--gold) inset;}
.ai-alt-kart .ai-sw{height:44px;}
.ai-alt-kart .ic{padding:8px 10px 10px;}
.ai-alt-kart b{display:block;font-family:var(--f-serif);font-weight:500;font-size:.98rem;}
.ai-alt-kart small{display:block;color:var(--faint);font-size:.72rem;margin-top:2px;}
.ai-eylem{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:6px;}
.ai-ikincil{height:48px;padding:0 16px;border-radius:12px;border:1px solid var(--edge);background:var(--panel-2);color:var(--ink);font:700 .88rem var(--f-sans);cursor:pointer;}
.ai-ikincil:hover{border-color:var(--gold);}
.ai-anlatim{font-size:.8rem;color:var(--faint);font-style:italic;margin:10px 0 0;line-height:1.45;}
/* Geri al bildirimi */
.ai-tost{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:90;display:flex;align-items:center;gap:14px;
  background:var(--ink);color:var(--panel);padding:12px 14px 12px 18px;border-radius:12px;box-shadow:0 20px 50px -20px rgba(0,0,0,.5);
  font-size:.9rem;animation:aiUp .25s ease;max-width:calc(100% - 32px);}
.ai-tost button{background:none;border:1px solid color-mix(in srgb,var(--panel) 40%,transparent);color:var(--panel);border-radius:8px;padding:6px 12px;font:700 .8rem var(--f-sans);cursor:pointer;}
@media (max-width:820px){
  .ai-ov{padding:0;place-items:stretch;}
  .ai-kart,.ai-kart.dar{width:100%;max-height:100%;height:100%;border-radius:0;border:0;}
  .ai-govde{padding:8px 16px 28px;}
  .ai-sonuc{grid-template-columns:1fr;gap:18px;}
  .ai-telefon{position:relative;max-width:360px;margin:0 auto;width:100%;}
  .ai-telefon iframe{height:56dvh;}
  .ai-eylem{position:sticky;bottom:0;background:var(--panel);padding:12px 0 4px;margin:0 -2px;}
  .ai-eylem .ai-git{flex:1;justify-content:center;}
}
@media (prefers-reduced-motion:reduce){ .ai-kart,.ai-arka,.ai-tost{animation:none;} .ai-kalp::after{animation:none;} }
`;

// ---------------------------------------------------------------- yardımcılar
function el(tag, cls, metin){ const n=document.createElement(tag); if(cls) n.className=cls; if(metin!=null) n.textContent=metin; return n; }
function bugunIso(){ const d=new Date(), p=x=>String(x).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }
function tarihOkunur(iso){
  try{ return new Date(iso+"T12:00:00").toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric",weekday:"long"}); }catch(e){ return iso; }
}
const RENK_GRAD = { altin:"linear-gradient(135deg,#202747,#B98F38)", turkuaz:"linear-gradient(135deg,#0B4450,#21A9AE 62%,#F07A52)",
  bordo:"linear-gradient(135deg,#3B1021,#8A2443 64%,#C59A4A)", pudra:"linear-gradient(135deg,#765A6D,#D6A9AF 62%,#F0D9CC)",
  krem:"linear-gradient(135deg,#4A4D48,#A8AD9E 58%,#EEE7D8)", yesil:"linear-gradient(135deg,#143A27,#54785B 60%,#C8A0A0)",
  lacivert:"linear-gradient(135deg,#08152D,#284F82 62%,#9DAFD6)", toprak:"linear-gradient(135deg,#513020,#A75C3E 60%,#D8AD7D)",
  siyah:"linear-gradient(135deg,#090807,#2A211A 62%,#B58A56)", mavi:"linear-gradient(135deg,#1E6688,#6CB5D0 60%,#F0C46A)" };

// ---------------------------------------------------------------- iskelet
function kur(){
  if(kok) return;
  const st=document.createElement("style"); st.textContent=CSS; document.head.append(st);
  kok=el("div","ai-ov"); kok.hidden=true;
  kok.innerHTML=`<div class="ai-arka" data-kapat></div>
    <div class="ai-kart dar" role="dialog" aria-modal="true" aria-labelledby="aiBaslik">
      <div class="ai-bas"><span class="ai-rozet">✨ Yapay zekâ ile</span>
        <button class="ai-kapat" type="button" data-kapat aria-label="Kapat">×</button></div>
      <div class="ai-govde" id="aiGovde"></div>
    </div>`;
  document.body.append(kok);
  kok.addEventListener("click", e=>{ if(e.target.closest("[data-kapat]")) kapat(); });
  kok.addEventListener("keydown", e=>{
    if(e.key==="Escape"){ e.stopPropagation(); kapat(); }
    if(e.key==="Tab") odakTuzagi(e);
  });
}
function odakTuzagi(e){
  const f=[...kok.querySelectorAll("button,textarea,input,iframe,[tabindex]")].filter(x=>!x.disabled && x.offsetParent);
  if(!f.length) return;
  const ilk=f[0], son=f[f.length-1];
  if(e.shiftKey && document.activeElement===ilk){ e.preventDefault(); son.focus(); }
  else if(!e.shiftKey && document.activeElement===son){ e.preventDefault(); ilk.focus(); }
}
const govde = ()=> kok.querySelector("#aiGovde");
const kart = ()=> kok.querySelector(".ai-kart");

// ---------------------------------------------------------------- 1) Anlat
function anlatEkrani(hata){
  kart().classList.add("dar");
  const g=govde(); g.replaceChildren();
  g.append(el("h2","ai-h","Nasıl bir davet hayal ediyorsun?"));
  g.lastChild.id="aiBaslik";
  g.append(el("p","ai-alt","Birkaç cümle yeter: ne kutluyorsun, ne zaman, nerede, nasıl bir hava istiyorsun? Sana en uygun şablonu seçip bilgilerinle dolduralım."));

  const alan=el("div","ai-alan");
  const ta=document.createElement("textarea");
  ta.id="aiMetin"; ta.maxLength=1500; ta.setAttribute("aria-label","Davetini anlat");
  ta.placeholder="Örn: "+ORNEKLER[0];
  ta.value=durum.metin||"";
  const arac=el("div","ai-arac");
  const sayac=el("span","ai-sayac");
  const Tanima=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(Tanima){
    const mik=el("button","ai-mik"); mik.type="button";
    mik.append(el("span","nokta"), el("span",null,"Konuşarak anlat"));
    mik.setAttribute("aria-pressed","false");
    mik.addEventListener("click", ()=> sesAcKapa(Tanima, ta, alan, mik));
    arac.append(mik);
  }
  arac.append(sayac); alan.append(ta, arac); g.append(alan);

  g.append(el("p","ai-ornek-bas","İlham lazımsa"));
  const orn=el("div","ai-ornekler");
  ORNEKLER.slice(0,4).forEach(o=>{
    const b=el("button","ai-ornek",o); b.type="button";
    b.addEventListener("click", ()=>{ ta.value=o; ta.dispatchEvent(new Event("input")); ta.focus(); });
    orn.append(b);
  });
  g.append(orn);

  const hataKutu=el("p","ai-hata"); hataKutu.setAttribute("role","alert"); hataKutu.hidden=!hata; if(hata) hataKutu.textContent=hata;
  g.append(hataKutu);

  const bar=el("div","ai-alt-bar");
  const git=el("button","ai-git"); git.type="button"; git.id="aiGit";
  git.append("✨ Davetiyemi hazırla");
  bar.append(git, el("span","ai-not","Anlattıkların yalnız öneri hazırlamak için yapay zekâya (OpenAI) iletilir, saklanmaz. Önerilen her şeyi sonra düzenleyebilirsin."));
  g.append(bar);

  const guncelle=()=>{
    const n=ta.value.trim().length;
    sayac.textContent=n? `${ta.value.length}/1500` : "";
    git.disabled=n<12;
    durum.metin=ta.value;
    try{ localStorage.setItem(TASLAK_METIN, ta.value); }catch(e){}
  };
  ta.addEventListener("input", guncelle);
  ta.addEventListener("keydown", e=>{ if(e.key==="Enter" && (e.metaKey||e.ctrlKey) && !git.disabled){ e.preventDefault(); gonder(); } });
  git.addEventListener("click", gonder);
  guncelle();
  setTimeout(()=> ta.focus(), 30);
}

let tanima=null;
function sesAcKapa(Tanima, ta, alan, mik){
  if(tanima){ tanima.stop(); return; }
  const r=new Tanima();
  r.lang=(navigator.language||"tr-TR").startsWith("tr") ? "tr-TR" : (navigator.language||"tr-TR");
  r.continuous=true; r.interimResults=true;
  const once=ta.value ? ta.value.replace(/\s*$/," ") : "";
  let kesin="";
  r.onresult=e=>{
    let ara="";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t=e.results[i][0].transcript;
      if(e.results[i].isFinal) kesin+=t; else ara+=t;
    }
    ta.value=(once+kesin+ara).slice(0,1500);
    ta.dispatchEvent(new Event("input"));
    durum.girdi="ses";
  };
  const bitir=()=>{ tanima=null; alan.classList.remove("dinliyor"); mik.setAttribute("aria-pressed","false"); mik.lastChild.textContent="Konuşarak anlat"; };
  r.onend=bitir;
  r.onerror=e=>{
    bitir();
    if(e.error==="not-allowed"||e.error==="service-not-allowed") hataGoster("Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verebilir ya da yazarak anlatabilirsin.");
  };
  try{ r.start(); }catch(e){ return; }
  tanima=r; alan.classList.add("dinliyor"); mik.setAttribute("aria-pressed","true"); mik.lastChild.textContent="Dinliyorum… bitince dokun";
}
function sesDurdur(){ if(tanima){ try{ tanima.stop(); }catch(e){} tanima=null; } }
function hataGoster(m){ const h=kok.querySelector(".ai-hata"); if(h){ h.textContent=m; h.hidden=false; } }

// ---------------------------------------------------------------- 2) Hazırlanıyor
let iptal=null, adimZaman=[];
function yukleniyorEkrani(){
  const g=govde(); g.replaceChildren();
  const k=el("div","ai-yuk");
  const kalp=el("div","ai-kalp"); [26,42,58,86,100].forEach((t,i)=>{ const c=el("i"); c.style.top=t+"px"; if(i===0){c.style.right="36px";} kalp.append(c); });
  const h=el("h2","ai-h","Davetiyen hazırlanıyor"); h.id="aiBaslik";
  const ul=el("ul","ai-adimlar"); ul.setAttribute("aria-live","polite");
  ADIMLAR.forEach(a=>{ const li=el("li"); li.append(el("span","ik"), el("span",null,a)); ul.append(li); });
  const vaz=el("button","ai-iptal","Vazgeç"); vaz.type="button";
  vaz.addEventListener("click", ()=>{ if(iptal) iptal.abort(); anlatEkrani(); });
  k.append(kalp,h,ul,vaz); g.append(k);
  const lis=[...ul.children];
  const ilerle=i=>{ lis.forEach((li,j)=>{ li.classList.toggle("bitti", j<i); li.classList.toggle("aktif", j===i); if(j<i) li.firstChild.textContent="✓"; }); };
  ilerle(0);
  adimZaman=[setTimeout(()=>ilerle(1),1300), setTimeout(()=>ilerle(2),2900)];
  return ()=>{ adimZaman.forEach(clearTimeout); ilerle(3); };
}

async function gonder(){
  const metin=(durum.metin||"").trim();
  if(metin.length<12) return;
  sesDurdur();
  const adimBitir=yukleniyorEkrani();
  const basla=Date.now();
  iptal=new AbortController();
  try{
    const veri=await istekAt({ metin, platform:"web", bugun:bugunIso(), girdi:durum.girdi||"yazi" }, iptal.signal);
    // Çok hızlı yanıtlarda adımlar göz kırpmasın: en az ~1.6 sn göster.
    await new Promise(r=>setTimeout(r, Math.max(0, 1600-(Date.now()-basla))));
    adimBitir();
    await new Promise(r=>setTimeout(r, azHareket()?0:350));
    durum.sonuc=veri.sonuc; durum.kalan=veri.kalan; durum.secili=0; durum.ekler={};
    sonucEkrani();
  }catch(e){
    adimBitir();
    if(e.name==="AbortError") return;
    anlatEkrani(e.mesaj || "Bir sorun oldu. İnternet bağlantını kontrol edip tekrar dener misin?");
  }finally{ iptal=null; }
}

async function istekAt(govdeVeri, signal){
  if(api.mock) return api.mock(govdeVeri);
  const token=await api.idToken();
  let r;
  try{
    r=await fetch(AI_FN,{ method:"POST", signal, headers:{ "Content-Type":"application/json", Authorization:"Bearer "+token }, body:JSON.stringify(govdeVeri) });
  }catch(e){ if(e.name==="AbortError") throw e; const h=new Error("ag"); h.mesaj="Bağlantı kurulamadı. İnternetini kontrol edip tekrar dener misin?"; throw h; }
  const j=await r.json().catch(()=>({}));
  if(!r.ok || !j.ok){ const h=new Error(j.hata||"servis"); h.mesaj=j.mesaj; throw h; }
  return j;
}

// ---------------------------------------------------------------- 3) Sonuç
function sonucEkrani(){
  kart().classList.remove("dar");
  const s=durum.sonuc;
  const g=govde(); g.replaceChildren();
  const h=el("h2","ai-h", s.stilOzeti ? `İşte senin için: ${s.stilOzeti.toLocaleLowerCase("tr")}` : "İşte sana uygun davetiye"); h.id="aiBaslik";
  g.append(h);
  g.append(el("p","ai-alt","Önizleme senin bilgilerinle dolduruldu. Beğenmediğin her şeyi sonra editörde değiştirebilirsin."));

  const izgara=el("div","ai-sonuc");
  const tel=el("div","ai-telefon");
  const ifr=document.createElement("iframe"); ifr.title="Davetiye önizlemesi"; ifr.id="aiOnizleme";
  ifr.addEventListener("load", ()=> tel.classList.remove("yukleniyor"));
  tel.append(ifr, el("div","ai-yenile","Güncelleniyor…"));
  const sag=el("div");
  izgara.append(tel, sag); g.append(izgara);

  // Anladıklarım
  const b=s.bilgiler;
  const ciplerB=el("div","ai-bolum"); ciplerB.append(el("p","ai-bolum-bas","Anladıklarım"));
  const cipler=el("div","ai-cipler");
  const cip=(ikon,m)=>{ const c=el("span","ai-cip"); c.append(ikon+" ", m); cipler.append(c); };
  cip(TUR_EMOJI[s.tur]||"✨", TUR_AD[s.tur]||s.tur);
  if(b.isimler) cip("✍️", b.isimler);
  if(b.yas) cip("🎈", b.yas+" yaş");
  if(b.tarih) cip("📅", tarihOkunur(b.tarih));
  if(b.saat) cip("🕖", b.saat);
  if(b.mekanAd||b.mekanAdres||b.sehir) cip("📍", [b.mekanAd, b.sehir].filter(Boolean).join(", ") || b.mekanAdres);
  if(b.kiyafet) cip("👗", b.kiyafet);
  if(s.dil && s.dil!=="tr") cip("🌐", s.dil.toUpperCase());
  ciplerB.append(cipler);
  if(durum.metin) ciplerB.append(el("p","ai-anlatim","“"+durum.metin.trim().slice(0,160)+(durum.metin.trim().length>160?"…":"")+"”"));
  sag.append(ciplerB);

  // Eksikler — yerinde tamamla
  if(s.eksikler && s.eksikler.length){
    const eb=el("div","ai-bolum"); eb.append(el("p","ai-bolum-bas","Eksik kalanlar — istersen şimdi ekle"));
    const kutu=el("div","ai-eksik-kutu");
    s.eksikler.forEach(k=>{
      const t=EKSIK[k]; if(!t) return;
      const w=el("div","ai-eksik"); const id="aiEk_"+k;
      const lab=el("label",null,t.ikon+" "+t.etiket); lab.htmlFor=id;
      const inp=document.createElement("input"); inp.id=id; inp.type=t.tip; if(t.ph) inp.placeholder=t.ph;
      if(t.tip==="date") inp.min=bugunIso();
      inp.value=durum.ekler[k]||"";
      inp.addEventListener("input", ()=>{ durum.ekler[k]=inp.value.trim(); w.classList.toggle("dolu", !!inp.value); onizleGecikmeli(); });
      w.append(lab, inp); kutu.append(w);
    });
    eb.append(kutu); sag.append(eb);
  }

  // Seçilen + alternatifler
  const sb=el("div","ai-bolum"); sb.id="aiSecilen"; sag.append(sb);
  const ab=el("div","ai-bolum"); ab.append(el("p","ai-bolum-bas","Öneriler — dokunarak karşılaştır"));
  const alts=el("div","ai-alternatifler"); alts.id="aiAlternatifler"; ab.append(alts);
  if(s.oneriler.length>1) sag.append(ab);

  // Eylemler
  const ey=el("div","ai-eylem");
  const devam=el("button","ai-git","Bu davetiyeyle devam et →"); devam.type="button";
  devam.addEventListener("click", kabulEt);
  const tekrar=el("button","ai-ikincil","↺ Yeniden anlat"); tekrar.type="button";
  tekrar.addEventListener("click", ()=>{ geriYukle(); anlatEkrani(); });
  ey.append(devam, tekrar); sag.append(ey);
  if(typeof durum.kalan==="number" && durum.kalan<=3)
    sag.append(el("p","ai-not", durum.kalan>0 ? `Bugün ${durum.kalan} AI önerisi hakkın kaldı.` : "Bugünlük AI hakkın bitti; bu öneriyle devam edebilirsin."));

  secimCiz();
  setTimeout(()=> devam.focus({preventScroll:true}), 40);
}

function secimCiz(){
  const s=durum.sonuc, o=s.oneriler[durum.secili], t=api.sablon(o.sablonId);
  const sb=kok.querySelector("#aiSecilen"); sb.replaceChildren();
  sb.append(el("p","ai-bolum-bas", durum.secili===0 ? "Sana önerdiğimiz" : "Seçtiğin"));
  const k=el("div","ai-secilen");
  const ust=el("div","ust"); ust.append(el("h3",null,t?t.name:o.ad));
  if(durum.secili===0) ust.append(el("span","ai-etiket onerilen","En uygun"));
  ust.append(el("span","ai-etiket"+(o.premium?" premium":""), o.premium?"🔒 Premium":"Ücretsiz"));
  k.append(ust);
  k.append(el("p",null, o.neden || (t && t.description) || ""));
  if(o.premium) k.append(el("p",null,"Premium şablonu ücretsiz düzenleyip önizleyebilirsin; filigransız yayın için paket gerekir."));
  sb.append(k);

  const alts=kok.querySelector("#aiAlternatifler");
  if(alts){
    alts.replaceChildren();
    s.oneriler.forEach((x,i)=>{
      const ts=api.sablon(x.sablonId);
      const b=el("button","ai-alt-kart"); b.type="button"; b.setAttribute("aria-pressed", String(i===durum.secili));
      const sw=el("div","ai-sw"); sw.style.background=RENK_GRAD[ts&&ts.color]||RENK_GRAD.altin;
      const ic=el("div","ic"); ic.append(el("b",null, ts?ts.name:x.ad), el("small",null, [ts&&ts.style, x.premium?"Premium":"Ücretsiz"].filter(Boolean).join(" · ")));
      b.append(sw, ic);
      if(x.neden) b.title=x.neden;
      b.addEventListener("click", ()=>{ if(durum.secili===i) return; durum.secili=i; secimCiz(); });
      alts.append(b);
    });
  }
  onizle();
}

// Öneriyi editöre uygula (geçici) ve gerçek motorla önizle.
function uygula(){
  const s=durum.sonuc, o=s.oneriler[durum.secili], t=api.sablon(o.sablonId);
  if(!t) return;
  api.sablonUygula(t);
  const b={...s.bilgiler}, e=durum.ekler||{};
  if(e.isimler) b.isimler=e.isimler;
  if(e.tarih) b.tarih=e.tarih;
  if(e.saat) b.saat=e.saat;
  if(e.mekan) b.mekanAd=e.mekan;
  const m=s.metin, sv=api.setVal, sc=api.setChk;
  if(m.ustBaslik) sv("inUst", m.ustBaslik);
  if(m.alici) sv("inAlici", m.alici);
  if(m.baslik) sv("inBaslik", m.baslik);
  if(m.giris) sv("taGiris", m.giris);
  if(m.imza) sv("inImza", m.imza);
  if(m.muhur && api.chk("chkMuhur")) sv("inMuhur", m.muhur);
  if(s.dil) sv("selDil", s.dil==="tr" ? "tr" : s.dil);
  if(b.isimler){ sv("inKurum", b.isimler); sv("inKapakIsim", b.isimler); }
  if(b.tarih){ sv("inTarih", b.tarih); sc("chkTarih", true); }
  if(b.saat) sv("inSaat", b.saat);
  if(b.lcvSonTarih) sv("inLcvSonTarih", b.lcvSonTarih);
  // Detaylar yalnız bilinen gerçeklerden kurulur: şablonun örnek satırları ("Nikâh: 18.00")
  // kullanıcının verdiği saatle çelişebilir. Tarih satırını motor kendisi ekler.
  const yer=[b.mekanAd, b.sehir].filter(Boolean).join(", ") || b.mekanAdres;
  const satirlar=[];
  if(b.saat) satirlar.push(`Saat: ${b.saat}`);
  if(yer) satirlar.push(`Yer: ${yer}`);
  if(b.kiyafet) satirlar.push(`Kıyafet: ${b.kiyafet}`);
  sv("taDetaylar", satirlar.join("\n"));
  if(b.mekanAd||b.mekanAdres){
    api.haritaAyarla([{ ad:b.mekanAd||"", adres:b.mekanAdres || [b.mekanAd,b.sehir].filter(Boolean).join(", "), url:"" }]);
    sc("chkHarita", true);
  }
  if(s.program && s.program.length){
    sv("taProgram", s.program.map(p=>[p.saat||"", p.baslik, p.yer||""].join(" | ")).join("\n"));
    sc("chkProgram", true);
  }
  api.syncBodies();
}

let onizZaman=null;
function onizleGecikmeli(){ clearTimeout(onizZaman); onizZaman=setTimeout(onizle, 380); }
function onizle(){
  uygula();
  const ifr=kok.querySelector("#aiOnizleme"); if(!ifr) return;
  const src=api.render + "?ac=1#i=" + api.b64url(api.cfgKur());
  if(ifr.dataset.src===src) return;
  ifr.dataset.src=src;
  ifr.closest(".ai-telefon").classList.add("yukleniyor");
  ifr.src=src;
}

// ---------------------------------------------------------------- kabul / vazgeç
function geriYukle(){
  if(durum.anlik) anlikGeriYukle(durum.anlik);
}
// sablonUygula(t) preseti_uygula ile formu ezer; bu yüzden önce şablon, sonra anlık görüntü.
function anlikGeriYukle(a){
  api.sablonUygula(a.sablon);
  api.durumUygula(a.durum);
}
function kabulEt(){
  uygula();
  const o=durum.sonuc.oneriler[durum.secili];
  api.olay("sablon", o.sablonId);
  api.olay("ai_kabul");
  const onceki=durum.anlik;
  durum.anlik=null;               // kapatırken geri yükleme yapılmasın
  try{ localStorage.removeItem(TASLAK_METIN); }catch(e){}
  durum.metin="";
  kapat();
  api.planla();
  api.editoreOdaklan();
  tost("✨ Davetiyen hazır — dilediğin gibi düzenle", "Geri al", ()=>{
    anlikGeriYukle(onceki); api.planla();
  });
}
function tost(m, dugme, fn){
  document.querySelectorAll(".ai-tost").forEach(x=>x.remove());
  const t=el("div","ai-tost"); t.setAttribute("role","status");
  t.append(el("span",null,m));
  const b=el("button",null,dugme); b.type="button";
  b.addEventListener("click", ()=>{ fn(); t.remove(); });
  t.append(b); document.body.append(t);
  setTimeout(()=> t.remove(), 9000);
}

let oncekiOdak=null;
function kapat(){
  sesDurdur();
  if(iptal) iptal.abort();
  if(durum && durum.anlik){ geriYukle(); durum.anlik=null; }
  kok.hidden=true;
  document.documentElement.style.overflow="";
  if(location.hash==="#ai") history.replaceState(null,"",location.pathname+location.search);
  if(oncekiOdak && oncekiOdak.focus) oncekiOdak.focus({preventScroll:true});
}

// ---------------------------------------------------------------- giriş
export async function ac(studioApi){
  api=studioApi; kur();
  await api.galeriHazir;
  let metin=""; try{ metin=localStorage.getItem(TASLAK_METIN)||""; }catch(e){}
  durum={ metin, girdi:"yazi", sonuc:null, secili:0, ekler:{},
    anlik:{ durum:api.durumTopla(), sablon:api.aktifSablon() } };
  oncekiOdak=document.activeElement;
  kok.hidden=false;
  document.documentElement.style.overflow="hidden";
  api.olay("ai_acildi");
  anlatEkrani();
}
