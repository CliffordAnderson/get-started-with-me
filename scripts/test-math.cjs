/* Run the shipped engines directly; no browser or external packages required. */
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
function engine(file,end,exports){
  const source=readFileSync(path.join(root,'lessons',file),'utf8').split('"use strict";')[1].split(end)[0];
  const context=vm.createContext({Math,sig:z=>1/(1+Math.exp(-z)),step:z=>z>=0?1:0,clamp:(v,a,b)=>Math.min(b,Math.max(a,v))});
  vm.runInContext(source+'\nglobalThis.engine={'+exports+'};',context);
  return context.engine;
}
const bp=engine('backprop.html','/* ---------------- painting','makeNet,zeroNet,gradAll,descend,trainTo,XOR');
// A derivative error would invalidate the lesson's central demonstration.
const net=bp.makeNet(37), analytic=bp.gradAll(net,bp.XOR).g;
const keys=[['w',0,0],['w',0,1],['w',1,0],['w',1,1],['bh',0],['bh',1],['v',0],['v',1],['bo']];
function get(o,ks){return ks.reduce((v,k)=>v[k],o);}
function set(o,ks,v){let a=o;for(const k of ks.slice(0,-1))a=a[k];a[ks.at(-1)]=v;}
for(const ks of keys){
  const x=get(net,ks),h=1e-5;
  set(net,ks,x+h);const hi=bp.gradAll(net,bp.XOR).E;
  set(net,ks,x-h);const lo=bp.gradAll(net,bp.XOR).E;set(net,ks,x);
  assert.ok(Math.abs((hi-lo)/(2*h)-get(analytic,ks))<1e-7,'gradient mismatch '+ks);
}
let initialFailures=0,recovered=[];
for(let seed=1;seed<=200;seed++){
 const n=bp.makeNet(seed),r=bp.trainTo(n,2000);
 if(!r.ok){initialFailures++;const later=bp.trainTo(n,18000);if(later.ok)recovered.push({seed,epochs:2000+later.epochs});}
}
assert.equal(initialFailures,41);
assert.deepEqual(recovered,[{seed:16,epochs:3624},{seed:101,epochs:3412}]);
const z=bp.zeroNet(),before=JSON.stringify(z);
for(let i=0;i<4000;i++)bp.descend(z,bp.gradAll(z,bp.XOR).g,2);
assert.equal(JSON.stringify(z),before,'all-zero batch training should preserve symmetry');
const rl=engine('rl.html','/* ==================== painting the grid','baseWorld,blankQ,rng,episode,greedyRun,maxQ,move,START,GOAL,PIT,GAMMA');
const world=rl.baseWorld();
function train(seed){const q=rl.blankQ(),r=rl.rng(seed);for(let i=0;i<200;i++)rl.episode(world,q,r,0,true);return q;}
const q=train(4242);assert.equal(JSON.stringify(q),JSON.stringify(train(4242)),'seeded run must reproduce');
const route=rl.greedyRun(world,q);assert.equal(route.end,rl.GOAL);assert.equal(route.steps,8);
assert.ok(Math.abs(rl.maxQ(q,rl.START)-Math.pow(rl.GAMMA,7))<1e-12);
// A tried action with no propagated reward can remain zero.
const blank=rl.blankQ(),next=rl.move(rl.START,0);
assert.ok(!(next in world));
blank[rl.START][0]=0+rl.GAMMA*rl.maxQ(blank,next);assert.equal(blank[rl.START][0],0);
console.log('PASS: all 9 gradient components, seed repeatability, zero symmetry, 8-move route, discounted value, and tried-zero distinction.');
console.log(JSON.stringify({initialFailures,recovered}));

// Canvas geometry must remain valid while another section is hidden.
// Enforce the browser canvas contract: arc() rejects a negative radius.
const paintContext=vm.createContext({Math});
const palette=readFileSync(path.join(root,'assets/lesson.js'),'utf8').split('const REDUCE')[0];
const paintSource=readFileSync(path.join(root,'lessons/rl.html'),'utf8').split('"use strict";')[1].split('/* ============================ hero')[0];
vm.runInContext(palette+paintSource+'\nglobalThis.paint={drawGrid,geom,START};',paintContext);
const calls=[];
const drawing=new Proxy({}, {
  get(target,key){
    if(key in target)return target[key];
    return (...args)=>{
      for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),'non-finite canvas coordinate');
      if(key==='arc')assert.ok(args[2]>=0,'negative canvas arc radius');
      calls.push(key);
    };
  },
  set(target,key,value){target[key]=value;return true;}
});
for(const size of [0,1,8,16]){
  calls.length=0;
  const p={ctx:drawing,w:size,h:size};
  assert.ok(paintContext.paint.geom(p).cs>=0);
  paintContext.paint.drawGrid(p,{agent:paintContext.paint.START});
  assert.equal(calls.length,0,'hidden or undersized grids must skip drawing');
}
// The hidden grid must not stop the following visible-grid redraw.
let visibleDrawn=false;
[
 ()=>paintContext.paint.drawGrid({ctx:drawing,w:1,h:1},{agent:paintContext.paint.START}),
 ()=>{paintContext.paint.drawGrid({ctx:drawing,w:400,h:400},{Q:q,arrows:true,agent:paintContext.paint.START});visibleDrawn=true;}
].forEach(draw=>draw());
assert.ok(visibleDrawn);
assert.ok(calls.includes('fillRect') && calls.includes('arc'),'visible grid must draw its cells and agent');
console.log('PASS: hidden-grid geometry and subsequent visible-grid rendering.');

// Lesson 7: the n-gram engine, its corpus split, and every number its prose quotes.
const nwHtml=readFileSync(path.join(root,'lessons/nextword.html'),'utf8');
const corpus={};
for(const m of nwHtml.matchAll(/<script id="(corpus-[a-z]+)" type="text\/plain">\n([\s\S]*?)\n<\/script>/g))corpus[m[1]]=m[2];
const nwSource=nwHtml.split('"use strict";')[1].split('/* ---------------- painting and panels')[0];
const nwContext=vm.createContext({Math,document:{getElementById:id=>({textContent:corpus[id]})}});
vm.runInContext(nwSource+'\nglobalThis.nw={tokenize,wordTable,topFollowers,generateWords,charTable,generateChars,forcedShare,windowSet,verbatimShare,predictShare,continueFrom,rng,TRAIN,HELD,TOKENS,HELD_TOKENS,TABLES,sentenceStart};',nwContext);
const nw=nwContext.nw;
assert.equal(nw.TRAIN.length,437868);assert.equal(nw.HELD.length,11154);
assert.ok(!nw.TRAIN.includes(nw.HELD.slice(0,80)),'held-out chapter must not appear in the training text');
assert.equal(nw.TOKENS.length,81571);assert.equal(nw.HELD_TOKENS.length,2087);
assert.equal(new Set(nw.TOKENS).size,8671);
assert.deepEqual([1,2,3,4].map(k=>nw.TABLES[k].size),[8670,44143,71449,79503]);
assert.equal(nw.TABLES[1].get('the').length,4341);
assert.equal(JSON.stringify(nw.topFollowers(nw.TABLES[1].get('the'),3)),JSON.stringify([['lawyer',94],['door',88],['court',82]]));
assert.equal(new Set(nw.TRAIN).size,66);
assert.equal(nw.charTable(nw.TRAIN,1).size,66);
assert.equal(nw.charTable(nw.TRAIN,3).size,5893);
assert.equal(nw.charTable(nw.TRAIN,7).size,149419);
// "81 per cent of two-word contexts were only ever followed by one thing; 94 at three; 98.5 at four"
assert.deepEqual([1,2,3,4].map(k=>{const f=nw.forcedShare(nw.TABLES[k]);return (100*f.forced/f.contexts).toFixed(1);}),['56.0','81.1','93.6','98.5']);
// "about nine times in ten" on read text; "once in seven" and "once in fifty" on chapter ten
const p3a=nw.predictShare(nw.TABLES[3],3,nw.TOKENS),p3b=nw.predictShare(nw.TABLES[3],3,nw.HELD_TOKENS);
assert.equal((100*p3a.right/p3a.positions).toFixed(1),'89.9');
assert.equal((100*p3b.known/p3b.positions).toFixed(1),'15.3');
assert.equal((100*p3b.right/p3b.positions).toFixed(1),'2.0');
// "almost none / about a fifth / roughly five in six / nearly all" verbatim six-word windows
const seen6=nw.windowSet(nw.TOKENS,6);
assert.deepEqual([1,2,3,4].map(k=>{
  const r=nw.rng(9000);
  return nw.verbatimShare(seen6,nw.generateWords(nw.TOKENS,nw.TABLES[k],k,2000,r,nw.sentenceStart(r)),6).hits;
}),[1,448,1637,1960]);
// the hero's caption: every three-word run of a two-word-context sample is in the novel
const seen3=nw.windowSet(nw.TOKENS,3);
for(let seed=11;seed<=30;seed++){
  const r=nw.rng(seed);
  const g=nw.generateWords(nw.TOKENS,nw.TABLES[2],2,60,r,nw.sentenceStart(r));
  const v=nw.verbatimShare(seen3,g,3);
  assert.equal(v.hits,v.total,'three-word-run claim, seed '+seed);
}
// 172 of chapter ten's words occur nowhere in chapters one to nine
{const vocab=new Set(nw.TOKENS);let u=0;for(const w of nw.HELD_TOKENS)if(!vocab.has(w))u++;assert.equal(u,172);}
// seeded generation repeats; the continue box backs off and can come up empty-handed
assert.equal(nw.generateWords(nw.TOKENS,nw.TABLES[3],3,50,nw.rng(42),100).join(' '),
             nw.generateWords(nw.TOKENS,nw.TABLES[3],3,50,nw.rng(42),100).join(' '));
assert.equal(nw.continueFrom(nw.tokenize('he opened the door'),5,nw.rng(5)).k,3);
assert.equal(nw.continueFrom(nw.tokenize('completely absurd nonsense here'),5,nw.rng(5)).k,1);
assert.equal(nw.continueFrom(nw.tokenize('zzzq'),5,nw.rng(5)).k,0);
console.log('PASS: corpus split, table sizes, forced shares, held-out collapse, verbatim shares, hero claim, and continuation backoff.');
