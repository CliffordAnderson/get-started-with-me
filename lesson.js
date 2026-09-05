/* getstartedwith.me — shared lesson machinery */

const C = {
  ink:"#22262C", ink2:"#5B6067", rule:"#C7C4B6", field:"#EFEDE5",
  grid:"#D7D4C7", off:"#274B8F", on:"#8A5206", alert:"#A8382B"
};
const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const redraws = [];
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
const clamp = (v,a,b) => v<a?a:(v>b?b:v);
const lerp  = (a,b,t) => a + (b-a)*t;
const sig   = z => 1/(1+Math.exp(-z));
const step  = z => z >= 0 ? 1 : 0;
const num   = (v,d=2) => (v<0?"\u2212":"") + Math.abs(v).toFixed(d);
const signed = (v,d=2) => (v<0?"\u2212 ":"+ ") + Math.abs(v).toFixed(d);
const plural = (n,word) => n + " " + word +
  (n === 1 ? "" : /(s|x|ch|sh)$/.test(word) ? "es" : "s");

function Plot(canvas, view){
  const o = { cv:canvas, ctx:canvas.getContext("2d"), view:view.slice(), w:1, h:1 };
  o.fit = function(){
    const r = canvas.getBoundingClientRect();
    const d = dpr();
    o.w = Math.max(1, r.width);
    o.h = Math.max(1, r.height || r.width);
    canvas.width  = Math.round(o.w * d);
    canvas.height = Math.round(o.h * d);
    o.ctx.setTransform(d,0,0,d,0,0);
  };
  o.X = v => (v - o.view[0]) / (o.view[1]-o.view[0]) * o.w;
  o.Y = v => o.h - (v - o.view[2]) / (o.view[3]-o.view[2]) * o.h;
  o.iX = px => o.view[0] + px / o.w * (o.view[1]-o.view[0]);
  o.iY = py => o.view[2] + (o.h-py) / o.h * (o.view[3]-o.view[2]);
  o.fit();
  return o;
}

function pointerPos(p, ev){
  const r = p.cv.getBoundingClientRect();
  return [p.iX(ev.clientX - r.left), p.iY(ev.clientY - r.top)];
}

function field(p, xlab, ylab){
  const g = p.ctx;
  g.clearRect(0,0,p.w,p.h);
  g.fillStyle = C.field; g.fillRect(0,0,p.w,p.h);

  // quarter grid across the visible domain
  g.strokeStyle = C.grid; g.lineWidth = 1;
  const q = 0.25;
  g.beginPath();
  for(let v = Math.ceil(p.view[0]/q)*q; v <= p.view[1]; v += q){
    const x = Math.round(p.X(v)) + .5; g.moveTo(x,0); g.lineTo(x,p.h);
  }
  for(let v = Math.ceil(p.view[2]/q)*q; v <= p.view[3]; v += q){
    const y = Math.round(p.Y(v)) + .5; g.moveTo(0,y); g.lineTo(p.w,y);
  }
  g.stroke();

  // axes through the origin
  g.strokeStyle = C.rule; g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(0, Math.round(p.Y(0))+.5); g.lineTo(p.w, Math.round(p.Y(0))+.5);
  g.moveTo(Math.round(p.X(0))+.5, 0); g.lineTo(Math.round(p.X(0))+.5, p.h);
  g.stroke();

  if(xlab){
    g.fillStyle = C.ink2;
    g.font = '500 12px "IBM Plex Mono", monospace';
    g.textAlign = "left"; g.textBaseline = "bottom";
    g.fillText(xlab, p.w-26, p.h-8);
    g.fillText(ylab, 10, 20);
  }
}

/* polygon of {w1 x + w2 y + b >= 0} clipped to the view rectangle */
function halfPlane(view, w1, w2, b){
  let poly = [[view[0],view[2]],[view[1],view[2]],[view[1],view[3]],[view[0],view[3]]];
  const f = p => w1*p[0] + w2*p[1] + b;
  const out = [];
  for(let i=0;i<poly.length;i++){
    const a = poly[i], c = poly[(i+1)%poly.length];
    const fa = f(a), fc = f(c);
    if(fa >= 0) out.push(a);
    if((fa >= 0) !== (fc >= 0)){
      const t = fa/(fa-fc);
      out.push([a[0]+t*(c[0]-a[0]), a[1]+t*(c[1]-a[1])]);
    }
  }
  return out;
}

function drawBoundary(p, w1, w2, b, opts){
  opts = opts || {};
  const g = p.ctx;
  if(Math.abs(w1) < 1e-9 && Math.abs(w2) < 1e-9) return;

  const poly = halfPlane(p.view, w1, w2, b);
  if(poly.length > 2){
    g.fillStyle = opts.tint || "rgba(138,82,6,.075)";
    g.beginPath();
    poly.forEach((pt,i) => i ? g.lineTo(p.X(pt[0]), p.Y(pt[1])) : g.moveTo(p.X(pt[0]), p.Y(pt[1])));
    g.closePath(); g.fill();
  }

  // the line itself, extended to the view edges
  const pts = [];
  const [x0,x1,y0,y1] = p.view;
  if(Math.abs(w2) > 1e-9){
    pts.push([x0, -(w1*x0+b)/w2], [x1, -(w1*x1+b)/w2]);
  } else {
    pts.push([-(w2*y0+b)/w1, y0], [-(w2*y1+b)/w1, y1]);
  }
  g.strokeStyle = opts.color || C.ink;
  g.lineWidth = opts.width || 2;
  if(opts.dash) g.setLineDash(opts.dash);
  g.beginPath();
  g.moveTo(p.X(pts[0][0]), p.Y(pts[0][1]));
  g.lineTo(p.X(pts[1][0]), p.Y(pts[1][1]));
  g.stroke();
  g.setLineDash([]);
}

function drawPoint(p, x, y, cls, wrong, label, r){
  const g = p.ctx, px = p.X(x), py = p.Y(y);
  r = r || 8;
  if(cls === 1){
    g.fillStyle = C.on;
    g.beginPath();
    if(g.roundRect) g.roundRect(px-r, py-r, 2*r, 2*r, 2.5);
    else g.rect(px-r, py-r, 2*r, 2*r);
    g.fill();
  } else {
    g.fillStyle = C.field; g.strokeStyle = C.off; g.lineWidth = 2.6;
    g.beginPath(); g.arc(px, py, r, 0, Math.PI*2); g.fill(); g.stroke();
  }
  if(wrong){
    g.strokeStyle = C.alert; g.lineWidth = 1.8;
    g.beginPath(); g.arc(px, py, r+5.5, 0, Math.PI*2); g.stroke();
    const sx = px > p.w - 34 ? -1 : 1, sy = py < 34 ? -1 : 1;
    const cx = px + sx*(r+12), cy = py - sy*(r+12);
    g.beginPath();
    g.moveTo(cx-3.5, cy-3.5); g.lineTo(cx+3.5, cy+3.5);
    g.moveTo(cx+3.5, cy-3.5); g.lineTo(cx-3.5, cy+3.5);
    g.stroke();
  }
  if(label){
    g.fillStyle = C.ink2;
    g.font = '400 11px "IBM Plex Mono", monospace';
    g.textAlign = "center"; g.textBaseline = "top";
    g.fillText(label, px, py + r + 6);
  }
}

/* Best straight line over a set of points. For each direction only the
   midpoints between neighbouring projections can be optimal, so this is exact
   up to the angular resolution; ties break toward the widest margin. */
function bestLine(pts, labels){
  let best = { score:-1, margin:-1, w1:1, w2:0, b:0 };
  const N = 720;
  for(let i=0;i<N;i++){
    const th = 2*Math.PI*i/N, w1 = Math.cos(th), w2 = Math.sin(th);
    const proj = pts.map(q => w1*q[0] + w2*q[1]);
    const sorted = proj.slice().sort((a,b) => a-b);
    const cuts = [sorted[0] - 0.35];
    for(let k=1;k<sorted.length;k++) cuts.push((sorted[k-1]+sorted[k])/2);
    cuts.push(sorted[sorted.length-1] + 0.35);
    for(let c=0;c<cuts.length;c++){
      let s = 0, m = Infinity;
      for(let k=0;k<pts.length;k++){
        const d = proj[k] - cuts[c];
        if(step(d) === labels[k]) s++;
        if(Math.abs(d) < m) m = Math.abs(d);
      }
      if(s > best.score || (s === best.score && m > best.margin))
        best = { score:s, margin:m, w1:w1, w2:w2, b:-cuts[c] };
    }
  }
  return best;
}

/* arrow from a to b in data coordinates */
function drawArrow(p, ax, ay, bx, by, color){
  const g = p.ctx, x0 = p.X(ax), y0 = p.Y(ay), x1 = p.X(bx), y1 = p.Y(by);
  const a = Math.atan2(y1-y0, x1-x0), h = 9;
  g.strokeStyle = g.fillStyle = color || C.ink;
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1 - Math.cos(a)*h*0.8, y1 - Math.sin(a)*h*0.8); g.stroke();
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x1 - Math.cos(a-0.4)*h, y1 - Math.sin(a-0.4)*h);
  g.lineTo(x1 - Math.cos(a+0.4)*h, y1 - Math.sin(a+0.4)*h);
  g.closePath(); g.fill();
}

/* ---- panel controller: call initPanels([[id,label],...]) once, last ---- */

function initPanels(LIST){
  const rail = document.getElementById("rail");
  const anchor = document.getElementById("rail-top");
  const secs = LIST.map(x => document.getElementById(x[0]));
  const tabs = [];
  let at = 0;

  /* An about:srcdoc document (an embedded preview, for instance) rejects
     replaceState, so deep links are used only where the URL can carry them. */
  const CAN_LINK = (function(){
    try { history.replaceState(history.state, "", location.href); return true; }
    catch(err){ return false; }
  })();

  document.body.classList.add("js-panels");

  LIST.forEach((item, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.id = "tab-" + item[0];
    b.setAttribute("role", "tab");
    b.setAttribute("aria-controls", item[0]);
    b.appendChild(Object.assign(document.createElement("span"), { className:"n", textContent:String(i+1) }));
    b.appendChild(document.createTextNode(item[1]));
    b.addEventListener("click", () => show(i, true));
    rail.appendChild(b);
    tabs.push(b);
  });

  secs.forEach((sec, i) => {
    const nav = document.createElement("nav");
    nav.className = "pager";
    const prev = document.createElement("button"), next = document.createElement("button");
    prev.type = next.type = "button";
    prev.className = next.className = "btn";
    if(i > 0){
      prev.textContent = "\u2039  " + LIST[i-1][1];
      prev.addEventListener("click", () => show(i-1, true));
    } else { prev.style.visibility = "hidden"; prev.textContent = "\u2039"; }
    if(i < LIST.length-1){
      next.textContent = LIST[i+1][1] + "  \u203a";
      next.addEventListener("click", () => show(i+1, true));
    } else { next.style.visibility = "hidden"; next.textContent = "\u203a"; }
    nav.appendChild(prev); nav.appendChild(next);
    sec.appendChild(nav);
  });

  function show(i, move){
    at = i;
    secs.forEach((n,k) => n.classList.toggle("is-on", k === i));
    tabs.forEach((t,k) => {
      t.setAttribute("aria-selected", String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    redraws.forEach(f => f());
    document.dispatchEvent(new CustomEvent("panelshow", { detail: LIST[i][0] }));
    if(move){
      if(CAN_LINK){
        try { history.replaceState(null, "", "#" + LIST[i][0]); } catch(err){}
      }
      const t = tabs[i];
      rail.scrollLeft = Math.max(0, t.offsetLeft - rail.clientWidth/2 + t.offsetWidth/2);
      try { anchor.scrollIntoView({ block:"start", behavior: REDUCE ? "auto" : "smooth" }); }
      catch(err){ anchor.scrollIntoView(true); }
    }
  }

  rail.addEventListener("keydown", e => {
    let n = null;
    if(e.key === "ArrowRight") n = (at+1) % LIST.length;
    else if(e.key === "ArrowLeft") n = (at-1+LIST.length) % LIST.length;
    else if(e.key === "Home") n = 0;
    else if(e.key === "End") n = LIST.length-1;
    if(n === null) return;
    e.preventDefault();
    show(n, true);
    tabs[n].focus();
  });

  document.addEventListener("click", e => {
    const a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if(!a) return;
    const k = LIST.findIndex(x => "#" + x[0] === a.getAttribute("href"));
    if(k < 0) return;
    e.preventDefault();
    show(k, true);
  });

  if(CAN_LINK) window.addEventListener("hashchange", () => {
    const k = LIST.findIndex(x => "#" + x[0] === location.hash);
    if(k >= 0 && k !== at) show(k, true);
  });

  const start = CAN_LINK ? LIST.findIndex(x => "#" + x[0] === location.hash) : -1;
  show(start >= 0 ? start : 0, false);
  if(start >= 0) anchor.scrollIntoView(true);
}

/* ---- boot ---- */

let rz;
window.addEventListener("resize", () => {
  clearTimeout(rz);
  rz = setTimeout(() => redraws.forEach(f => f()), 120);
});
window.addEventListener("load", () => redraws.forEach(f => f()));
if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => redraws.forEach(f => f()));
