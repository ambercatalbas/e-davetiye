// ============================================================
//  qr.js — Bağımsız (harici bağımlılık yok) QR kod üreticisi
//  Nayuki "QR Code generator" algoritmasının (MIT) sade byte-modu portu.
//  Kullanım:
//    import { qrMatrix, qrCanvas, qrDataURL } from "./qr.js";
//    const m = qrMatrix("https://...", "M");   // { size, modules:[[bool]] }
//    const canvas = qrCanvas("https://...", { scale:12, kenar:4, ecl:"M" });
//  Sadece byte modu; sürüm 1–40 otomatik; maske otomatik (en düşük ceza).
// ============================================================
"use strict";

const ECC = { L:0, M:1, Q:2, H:3 };

const ECC_CODEWORDS_PER_BLOCK = [
  [-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
  [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
  [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30]
];
const NUM_ECC_BLOCKS = [
  [-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
  [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
  [-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
  [-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81]
];

function utf8Bytes(str){
  const out = [];
  for(const ch of unescape(encodeURIComponent(str))) out.push(ch.charCodeAt(0));
  return out;
}

function numRawDataModules(ver){
  let result = (16*ver + 128)*ver + 64;
  if(ver >= 2){
    const numAlign = Math.floor(ver/7) + 2;
    result -= (25*numAlign - 10)*numAlign - 55;
    if(ver >= 7) result -= 36;
  }
  return result;
}
function numDataCodewords(ver, ecl){
  return Math.floor(numRawDataModules(ver)/8)
    - ECC_CODEWORDS_PER_BLOCK[ecl][ver] * NUM_ECC_BLOCKS[ecl][ver];
}

// Galois alanı GF(256), üretici 0x11D
function reedSolomonDivisor(degree){
  const result = new Uint8Array(degree); result[degree-1] = 1;
  let root = 1;
  for(let i=0;i<degree;i++){
    for(let j=0;j<result.length;j++){
      result[j] = gfMul(result[j], root);
      if(j+1 < result.length) result[j] ^= result[j+1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}
function reedSolomonRemainder(data, divisor){
  const result = new Uint8Array(divisor.length);
  for(const b of data){
    const factor = b ^ result[0];
    result.copyWithin(0,1); result[result.length-1] = 0;
    for(let i=0;i<result.length;i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
}
function gfMul(x, y){
  let z = 0;
  for(let i=7;i>=0;i--){
    z = (z<<1) ^ ((z>>>7)*0x11D);
    z ^= ((y>>>i)&1)*x;
  }
  return z & 0xFF;
}

function addEcc(dataCodewords, ver, ecl){
  const numBlocks = NUM_ECC_BLOCKS[ecl][ver];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl][ver];
  const rawCodewords = Math.floor(numRawDataModules(ver)/8);
  const numShortBlocks = numBlocks - rawCodewords % numBlocks;
  const shortBlockLen = Math.floor(rawCodewords/numBlocks);
  const blocks = [];
  const divisor = reedSolomonDivisor(blockEccLen);
  let k = 0;
  for(let i=0;i<numBlocks;i++){
    const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
    const dat = Array.from(dataCodewords.slice(k, k+datLen)); k += datLen;
    const ecc = reedSolomonRemainder(dat, divisor);
    if(i < numShortBlocks) dat.push(0);
    blocks.push(dat.concat(Array.from(ecc)));
  }
  const result = [];
  for(let i=0;i<blocks[0].length;i++){
    for(let j=0;j<blocks.length;j++){
      if(i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(blocks[j][i]);
    }
  }
  return result;
}

function alignPatternPositions(ver){
  if(ver === 1) return [];
  const numAlign = Math.floor(ver/7) + 2;
  const step = Math.floor((ver*8 + numAlign*3 + 5) / (numAlign*4 - 4)) * 2;
  const result = [6];
  for(let pos = ver*4 + 10; result.length < numAlign; pos -= step) result.splice(1,0,pos);
  return result;
}

function buildMatrix(ver, ecl, allCodewords){
  const size = ver*4 + 17;
  const modules = [], isFunc = [];
  for(let i=0;i<size;i++){ modules.push(new Array(size).fill(false)); isFunc.push(new Array(size).fill(false)); }
  const setF = (x,y,dark)=>{ if(x>=0&&x<size&&y>=0&&y<size){ modules[y][x]=dark; isFunc[y][x]=true; } };

  // Zamanlama desenleri
  for(let i=0;i<size;i++){ setF(6,i, i%2===0); setF(i,6, i%2===0); }
  // Bulucu desenleri + ayraç
  const finder = (cx,cy)=>{
    for(let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++){
      const d = Math.max(Math.abs(dx),Math.abs(dy));
      setF(cx+dx, cy+dy, d!==2 && d!==4);
    }
  };
  finder(3,3); finder(size-4,3); finder(3,size-4);
  // Hizalama desenleri
  const ap = alignPatternPositions(ver), n = ap.length;
  for(let i=0;i<n;i++) for(let j=0;j<n;j++){
    if((i===0&&j===0)||(i===0&&j===n-1)||(i===n-1&&j===0)) continue;
    const cx = ap[i], cy = ap[j];
    for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++)
      setF(cx+dx, cy+dy, Math.max(Math.abs(dx),Math.abs(dy)) !== 1);
  }

  // Format/sürüm alanlarını rezerve et (geçici)
  drawFormat(modules, isFunc, size, ecl, 0, true);
  drawVersion(modules, isFunc, size, ver);

  // Veri kelimelerini yerleştir (zikzak)
  let i = 0;
  for(let right = size-1; right >= 1; right -= 2){
    if(right === 6) right = 5;
    for(let vert = 0; vert < size; vert++){
      for(let k = 0; k < 2; k++){
        const x = right - k;
        const upward = ((right+1) & 2) === 0;
        const y = upward ? size-1-vert : vert;
        if(!isFunc[y][x] && i < allCodewords.length*8){
          modules[y][x] = ((allCodewords[i>>>3] >>> (7 - (i&7))) & 1) !== 0;
          i++;
        }
      }
    }
  }

  // En iyi maske
  let bestMask = 0, minPenalty = Infinity;
  for(let mask=0; mask<8; mask++){
    applyMask(modules, isFunc, size, mask);
    drawFormat(modules, isFunc, size, ecl, mask, false);
    const p = penalty(modules, size);
    if(p < minPenalty){ minPenalty = p; bestMask = mask; }
    applyMask(modules, isFunc, size, mask); // geri al
  }
  applyMask(modules, isFunc, size, bestMask);
  drawFormat(modules, isFunc, size, ecl, bestMask, false);

  return { size, modules };
}

function drawFormat(modules, isFunc, size, ecl, mask, reserveOnly){
  const eclBits = [1,0,3,2][ecl]; // L=01,M=00,Q=11,H=10
  const data = (eclBits << 3) | mask;
  let rem = data;
  for(let i=0;i<10;i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const set = (x,y,dark)=>{ modules[y][x] = reserveOnly ? modules[y][x] : dark; isFunc[y][x] = true; };
  const getBit = i => ((bits >>> i) & 1) !== 0;
  // sol-üst çevresi
  for(let i=0;i<=5;i++) set(8, i, getBit(i));
  set(8,7,getBit(6)); set(8,8,getBit(7)); set(7,8,getBit(8));
  for(let i=9;i<15;i++) set(14-i, 8, getBit(i));
  // sağ-üst ve sol-alt
  for(let i=0;i<8;i++) set(size-1-i, 8, getBit(i));
  for(let i=8;i<15;i++) set(8, size-15+i, getBit(i));
  set(8, size-8, true); // her zaman koyu modül
}

function drawVersion(modules, isFunc, size, ver){
  if(ver < 7) return;
  let rem = ver;
  for(let i=0;i<12;i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
  const bits = (ver << 12) | rem;
  for(let i=0;i<18;i++){
    const bit = ((bits >>> i) & 1) !== 0;
    const a = size-11 + i%3, b = Math.floor(i/3);
    modules[a][b] = bit; isFunc[a][b] = true;
    modules[b][a] = bit; isFunc[b][a] = true;
  }
}

function applyMask(modules, isFunc, size, mask){
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    if(isFunc[y][x]) continue;
    let invert = false;
    switch(mask){
      case 0: invert = (x+y)%2===0; break;
      case 1: invert = y%2===0; break;
      case 2: invert = x%3===0; break;
      case 3: invert = (x+y)%3===0; break;
      case 4: invert = (Math.floor(x/3)+Math.floor(y/2))%2===0; break;
      case 5: invert = (x*y)%2 + (x*y)%3===0; break;
      case 6: invert = ((x*y)%2 + (x*y)%3)%2===0; break;
      case 7: invert = ((x+y)%2 + (x*y)%3)%2===0; break;
    }
    if(invert) modules[y][x] = !modules[y][x];
  }
}

function penalty(modules, size){
  let result = 0;
  // Kural 1: satır/sütun ardışık aynı renk
  for(let y=0;y<size;y++){
    let run=1;
    for(let x=1;x<size;x++){
      if(modules[y][x]===modules[y][x-1]){ run++; if(run===5) result+=3; else if(run>5) result++; }
      else run=1;
    }
  }
  for(let x=0;x<size;x++){
    let run=1;
    for(let y=1;y<size;y++){
      if(modules[y][x]===modules[y-1][x]){ run++; if(run===5) result+=3; else if(run>5) result++; }
      else run=1;
    }
  }
  // Kural 2: 2x2 aynı renk bloklar
  for(let y=0;y<size-1;y++) for(let x=0;x<size-1;x++){
    const c = modules[y][x];
    if(c===modules[y][x+1] && c===modules[y+1][x] && c===modules[y+1][x+1]) result+=3;
  }
  // Kural 3: bulucu-benzeri desen
  const pattern = (arr)=>{
    for(let i=0;i+11<=arr.length;i++){
      const s = arr.slice(i,i+11).join("");
      if(s==="10111010000"||s==="00001011101") result+=40;
    }
  };
  for(let y=0;y<size;y++) pattern(modules[y].map(v=>v?1:0));
  for(let x=0;x<size;x++){ const col=[]; for(let y=0;y<size;y++) col.push(modules[y][x]?1:0); pattern(col); }
  // Kural 4: koyu oran
  let dark=0; for(let y=0;y<size;y++) for(let x=0;x<size;x++) if(modules[y][x]) dark++;
  const total = size*size;
  const k = Math.floor(Math.abs(dark*20 - total*10)/total);
  result += k*10;
  return result;
}

// ---- Genel API ----
export function qrMatrix(text, eclName){
  const ecl = ECC[eclName] != null ? ECC[eclName] : ECC.M;
  const data = utf8Bytes(text);
  let ver = 1;
  for(; ver<=40; ver++){
    const capBits = numDataCodewords(ver, ecl) * 8;
    const cc = ver < 10 ? 8 : 16;
    if(4 + cc + data.length*8 <= capBits) break;
    if(ver === 40) throw new Error("QR: veri çok uzun");
  }
  const capBits = numDataCodewords(ver, ecl) * 8;
  const bits = [];
  const append = (val, len)=>{ for(let i=len-1;i>=0;i--) bits.push((val>>>i)&1); };
  append(4, 4);                        // byte modu
  append(data.length, ver < 10 ? 8 : 16);
  for(const b of data) append(b, 8);
  append(0, Math.min(4, capBits - bits.length)); // sonlandırıcı
  while(bits.length % 8 !== 0) bits.push(0);
  for(let pad=0xEC; bits.length < capBits; pad ^= 0xEC ^ 0x11) append(pad, 8);
  const dataCodewords = new Uint8Array(bits.length/8);
  for(let i=0;i<bits.length;i++) dataCodewords[i>>>3] |= bits[i] << (7 - (i&7));
  const all = addEcc(dataCodewords, ver, ecl);
  return buildMatrix(ver, ecl, all);
}

// Canvas'a çiz (yüksek çözünürlük — baskıya uygun).
export function qrCanvas(text, opts){
  opts = opts || {};
  const scale = opts.scale || 10;         // modül başına piksel
  const kenar = opts.kenar != null ? opts.kenar : 4; // sessiz bölge (modül)
  const koyu = opts.koyu || "#0b1020";
  const acik = opts.acik || "#ffffff";
  const { size, modules } = qrMatrix(text, opts.ecl || "M");
  const px = (size + kenar*2) * scale;
  const c = document.createElement("canvas"); c.width = px; c.height = px;
  const g = c.getContext("2d");
  g.fillStyle = acik; g.fillRect(0,0,px,px);
  g.fillStyle = koyu;
  for(let y=0;y<size;y++) for(let x=0;x<size;x++)
    if(modules[y][x]) g.fillRect((x+kenar)*scale, (y+kenar)*scale, scale, scale);
  return c;
}

export function qrDataURL(text, opts){
  return qrCanvas(text, opts).toDataURL("image/png");
}
