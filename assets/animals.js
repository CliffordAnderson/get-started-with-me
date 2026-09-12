/* getstartedwith.me — the 12×12 animals shared by lessons 2 and 5.

   Lesson 2 trains one 144-weight template on these pictures and lesson 5
   trains a convolutional detector on the same ones, so the two lessons'
   numbers are only comparable if the pictures are identical. They are
   generated here, from a seed, rather than copied into either page.

   Nothing is precomputed: a seed goes in and a Float64Array of 144
   brightnesses comes out, in the browser, every time. Painting needs
   C, clamp and lerp from lesson.js, so this file loads after it. */
"use strict";

const N = 12, NP = N*N;
const BG = 0.06;                    /* what an empty pixel looks like */

/* ---------------- pictures ---------------- */

/* xorshift, so every picture is reproducible from its seed */
function rng(seed){
  let x = (seed * 2654435761) >>> 0 || 1;
  return function(){
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;  x >>>= 0;
    return x / 4294967296;
  };
}

/* An ellipse for a head, two eyes, and the one thing that distinguishes the
   classes: cats get triangles on top, dogs get lobes at the sides. Position,
   size, ear shape and exposure vary; everything else is shared. */
function draw(cls, seed){
  const r = rng(seed);
  const px = new Float64Array(NP);
  const cx   = 0.50 + (r()-0.5)*0.12;
  const cy   = 0.46 + (r()-0.5)*0.12;
  const size = 0.88 + r()*0.24;
  const lum  = 0.84 + r()*0.16;
  const rx = (cls === 0 ? 0.25 : 0.28) * size;
  const ry = (cls === 0 ? 0.28 : 0.25) * size;
  const ear  = 0.82 + r()*0.36;
  const lean = (r()-0.5)*0.05;

  for(let i=0;i<N;i++) for(let j=0;j<N;j++){
    const u = (j+0.5)/N, v = 1 - (i+0.5)/N;
    let val = 0.04 + r()*0.10;

    const hd = Math.hypot((u-cx)/rx, (v-cy)/ry);
    if(hd < 1) val = Math.max(val, 0.55 + 0.12*(1-hd));

    for(const s of [-1,1]){
      const d = Math.hypot(u - (cx + s*0.105*size), v - (cy + 0.075*size));
      if(d < 0.075*size) val = Math.max(val, 0.98);
    }

    if(cls === 0){
      for(const s of [-1,1]){
        const bx = cx + s*0.155*size + lean, by = cy + ry*0.60;
        const du = (u-bx)/(0.115*ear*size), dv = (v-by)/(0.20*ear*size);
        if(dv > 0 && dv < 1 && Math.abs(du) < (1-dv)) val = Math.max(val, 0.95);
      }
    } else {
      for(const s of [-1,1]){
        const bx = cx + s*0.26*size + lean, by = cy - 0.04*size;
        const d = Math.hypot((u-bx)/(0.095*ear*size), (v-by)/(0.20*ear*size));
        if(d < 1) val = Math.max(val, 0.95);
      }
    }
    px[i*N+j] = Math.min(1, val*lum);
  }
  return px;
}

/* a set of n cats and n dogs, interleaved so training alternates classes */
function makeSet(n, base){
  const out = [];
  for(let i=0;i<n;i++){
    out.push({ x: draw(0, base+i),      y:0 });
    out.push({ x: draw(1, base+2000+i), y:1 });
  }
  return out;
}

/* ---------------- transformations ---------------- */

function shift(px, dx, dy){
  const o = new Float64Array(NP);
  for(let i=0;i<N;i++) for(let j=0;j<N;j++){
    const si = i - dy, sj = j - dx;
    o[i*N+j] = (si>=0 && si<N && sj>=0 && sj<N) ? px[si*N+sj] : BG;
  }
  return o;
}
function mirror(px){
  const o = new Float64Array(NP);
  for(let i=0;i<N;i++) for(let j=0;j<N;j++) o[i*N+j] = px[i*N + (N-1-j)];
  return o;
}
const invert = px => Float64Array.from(px, v => 1-v);
const expose = (px,f) => Float64Array.from(px, v => clamp(v*f, 0, 1));

/* ---------------- painting a 12×12 grid ---------------- */


const HEX = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const FIELD = HEX(C.field), INK = HEX(C.ink), OFF = HEX(C.off), ON = HEX(C.on);
const mix = (a,b,t) => "rgb(" + Math.round(lerp(a[0],b[0],t)) + "," +
  Math.round(lerp(a[1],b[1],t)) + "," + Math.round(lerp(a[2],b[2],t)) + ")";

/* brightness 0..1 as ink density on the page's paper */
const shade = v => mix(FIELD, INK, clamp(v,0,1));
/* signed value in -1..1: blue for cat evidence, brown for dog evidence */
const diverge = t => t >= 0 ? mix(FIELD, ON, clamp(t,0,1)) : mix(FIELD, OFF, clamp(-t,0,1));

function peak(a){
  let m = 0;
  for(let k=0;k<a.length;k++) m = Math.max(m, Math.abs(a[k]));
  return m || 1;
}

/* one N×N picture filling the box at (x0,y0,side) */
function paint(g, px, x0, y0, side, opts){
  opts = opts || {};
  const c = side / N;
  const sc = opts.signed ? peak(px) : 1;
  for(let i=0;i<N;i++) for(let j=0;j<N;j++){
    g.fillStyle = opts.signed ? diverge(px[i*N+j]/sc) : shade(px[i*N+j]);
    g.fillRect(x0 + j*c, y0 + i*c, Math.ceil(c)+0.5, Math.ceil(c)+0.5);
  }
  if(opts.grid !== false && c > 7){
    g.strokeStyle = "rgba(34,38,44,.10)"; g.lineWidth = 1;
    g.beginPath();
    for(let k=1;k<N;k++){
      g.moveTo(Math.round(x0+k*c)+.5, y0); g.lineTo(Math.round(x0+k*c)+.5, y0+side);
      g.moveTo(x0, Math.round(y0+k*c)+.5); g.lineTo(x0+side, Math.round(y0+k*c)+.5);
    }
    g.stroke();
  }
  g.strokeStyle = C.rule; g.lineWidth = 1;
  g.strokeRect(x0+.5, y0+.5, side-1, side-1);
}

/* a single picture centred in its own canvas */
function paintOne(p, px, opts){
  const g = p.ctx;
  g.clearRect(0,0,p.w,p.h);
  g.fillStyle = C.field; g.fillRect(0,0,p.w,p.h);
  const pad = 10, side = Math.min(p.w, p.h) - 2*pad;
  paint(g, px, (p.w-side)/2, (p.h-side)/2, side, opts);
  return { x0:(p.w-side)/2, y0:(p.h-side)/2, side:side };
}
