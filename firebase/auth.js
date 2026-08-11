// ============================================================
//  Ortak kimlik (Auth) yardımcıları — anonim + Google
//  - Davetli & ilk yayın: anonim giriş (sürtünmesiz).
//  - Ev sahibi isterse Google'a "bağlanır" (linkWithPopup): uid KORUNUR,
//    böylece anonim olarak yayınlanan davetiyeler Google kimliğine geçer
//    ve yanıtlara HER CİHAZDAN erişilir.
//  index.html (davetli) yalnız anonim kullanır; studio.html & yanitlar.html
//  Google girişini de kullanır.
// ============================================================
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged, signOut,
  GoogleAuthProvider, signInWithPopup, linkWithPopup, deleteUser, reauthenticateWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { firebaseConfig } from "./config.js";

export function app(){ return getApps().length ? getApp() : initializeApp(firebaseConfig); }
export function auth(){ return getAuth(app()); }

// Anonim oturum garanti et (yoksa aç).
export async function anonSagla(){
  const a = auth();
  if (!a.currentUser) await signInAnonymously(a);
  return a.currentUser;
}

// Oturum değişimini dinle (giriş/çıkış/anon).
export function kullaniciIzle(cb){ return onAuthStateChanged(auth(), cb); }

// Google ile giriş. Anonim kullanıcı varsa ona BAĞLAR (uid korunur);
// o Google hesabı başka yerde kullanılmışsa o hesaba geçer.
export async function googleGiris(){
  const a = auth();
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  const mevcut = a.currentUser;
  if (mevcut && mevcut.isAnonymous) {
    try {
      const r = await linkWithPopup(mevcut, p);
      return r.user;
    } catch (e) {
      if (e && (e.code === "auth/credential-already-in-use" || e.code === "auth/email-already-in-use")) {
        const r = await signInWithPopup(a, p); // mevcut Google hesabına geç
        return r.user;
      }
      throw e;
    }
  }
  const r = await signInWithPopup(a, p);
  return r.user;
}

export async function cikis(){ await signOut(auth()); }

// KVKK "unutulma hakkı": kimlik hesabını sil (gerekirse yeniden doğrula).
// Not: Firestore/Storage verisini çağıran taraf ayrıca siler; bu yalnız Auth hesabı.
export async function hesabiSil(){
  const a = auth(); const u = a.currentUser; if(!u) return;
  try { await deleteUser(u); }
  catch(e){
    if(e && e.code === "auth/requires-recent-login" && !u.isAnonymous){
      await reauthenticateWithPopup(u, new GoogleAuthProvider());
      await deleteUser(u);
    } else throw e;
  }
}

// Hata kodunu Türkçe, kullanıcıya gösterilebilir metne çevir.
export function authHataMetni(e){
  const c = (e && e.code) || "";
  if (c === "auth/operation-not-allowed") return "Google girişi Firebase konsolunda etkin değil (Authentication → Google → Enable).";
  if (c === "auth/popup-blocked") return "Açılır pencere engellendi. Tarayıcı iznini verip tekrar deneyin.";
  if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "Giriş penceresi kapatıldı.";
  if (c === "auth/network-request-failed") return "Ağ hatası. Bağlantınızı kontrol edin.";
  return "Giriş yapılamadı" + (c ? " (" + c + ")" : "") + ".";
}
