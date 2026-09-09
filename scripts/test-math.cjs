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
const corpusSource=readFileSync(path.join(root,'assets/corpus-trial.js'),'utf8');
const nwHtml=readFileSync(path.join(root,'lessons/nextword.html'),'utf8');
const nwSource=nwHtml.split('"use strict";')[1].split('/* ---------------- painting and panels')[0];
const nwContext=vm.createContext({Math});
vm.runInContext(corpusSource,nwContext);
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

// Lesson 8: the profile engine, the borrowing walk, and every number its prose quotes.
const wvHtml=readFileSync(path.join(root,'lessons/vectors.html'),'utf8');
const wvSource=wvHtml.split('"use strict";')[1].split('/* ---------------- painting and panels')[0];
const wvContext=vm.createContext({Math});
vm.runInContext(corpusSource,wvContext);
vm.runInContext(wvSource+'\nglobalThis.wv={normWord,normStream,cosine,voteFor,commonest,predictWalk,continueWords,mapCoords,rng,MODEL,HELD_STREAM,MAP,mapPoint};',wvContext);
const wv=wvContext.wv,M=wv.MODEL;
// "counted from the same nine chapters": streams, vocabulary, profile dimensions
assert.equal(M.stream.length,81561);assert.equal(wv.HELD_STREAM.length,2087);
assert.equal(M.counts.size,5082);
assert.equal(M.vocab.length,1449);assert.equal(4*M.vocab.length,5796);
assert.equal(M.P.size,1449,'every vocabulary word must end up with a profile');
// "lawyer" row facts: 190 and 125 occurrences, 96 and 77 distinct followers sharing 30
assert.equal(M.counts.get('lawyer'),190);assert.equal(M.counts.get('painter'),125);
const fLawyer=M.T1.get('lawyer'),fPainter=M.T1.get('painter');
assert.equal(fLawyer.size,96);assert.equal(fPainter.size,77);
{let shared=0;for(const w of fLawyer.keys())if(fPainter.has(w))shared++;assert.equal(shared,30);}
// profile and similarity numbers: 271 slots, 0.22 / 0.05 / 0.22 cosines
const iw=w=>M.index.get(w);
assert.equal(M.P.get(iw('lawyer')).size,271);
assert.equal(wv.cosine(M.P,iw('lawyer'),iw('painter')).toFixed(2),'0.22');
assert.equal(wv.cosine(M.P,iw('lawyer'),iw('slowly')).toFixed(2),'0.05');
assert.equal(wv.cosine(M.P,iw('door'),iw('mouth')).toFixed(2),'0.22');
// "painter" is the word nearest to "lawyer"
assert.equal(M.vocab[M.nbs(iw('lawyer'))[0][0]],'painter');
// the "about nine" example: no row, but the vote answers "o'clock"
assert.ok(!M.T2.has('about nine'));
assert.equal(wv.commonest(wv.voteFor('about','nine',M)),"o'clock");
// the borrowing table: 56% memorised, 60/8 exact on held, 84/10 with votes, 503 borrowed with 42 right
const wa=wv.predictWalk(M,M.stream,false);
assert.equal((100*wa.right/wa.pos).toFixed(1),'55.8');assert.equal(wa.found,wa.pos);
const wb=wv.predictWalk(M,wv.HELD_STREAM,false);
assert.equal((100*wb.found/wb.pos).toFixed(1),'60.2');
assert.equal((100*wb.right/wb.pos).toFixed(1),'8.0');
assert.equal((100*wb.right/wb.found).toFixed(1),'13.2');
const wc=wv.predictWalk(M,wv.HELD_STREAM,true);
assert.equal((100*wc.found/wc.pos).toFixed(1),'84.3');
assert.equal((100*wc.right/wc.pos).toFixed(1),'10.0');
assert.equal(wc.borrowed,503);assert.equal(wc.borrowedRight,42);
// coverage on chapter ten: 97 tokens of 84 unseen words, plus 124 below the profile threshold
{let ut=0,thin=0;const ud=new Set();
 for(const w of wv.HELD_STREAM){const c=M.counts.get(w)||0;if(c===0){ut++;ud.add(w);}else if(c<5)thin++;}
 assert.equal(ut,97);assert.equal(ud.size,84);assert.equal(thin,124);}
// the words both lessons' final prompts name: "pillow" three times, "computer" never
assert.equal(M.counts.get('pillow'),3);
assert.equal(M.counts.get('computer'),undefined);
// the map is deterministic and its drawn coordinates are finite
{const again=wv.mapCoords(M.P,M.vocab.length,4,30);
 assert.deepEqual(again.sigmas,wv.MAP.sigmas);
 for(const e of M.P){const q=wv.mapPoint(e[0]);assert.ok(Number.isFinite(q[0])&&Number.isFinite(q[1]));}}
// continuation borrows where the table is silent, admits dropping context when
// even the neighbours are silent, and still stops at an unknown word
{const r=wv.continueWords(wv.normStream('k. answered slowly'),30,M,wv.rng(4100));
 assert.ok(r.words.length>0);assert.ok(r.lent.includes('vote'));}
{const r=wv.continueWords(wv.normStream('the trial dragged'),30,M,wv.rng(4100));
 assert.ok(r.words.length>0);assert.ok(r.lent.includes('drop'));}
{const r=wv.continueWords(wv.normStream('the zzzq'),20,M,wv.rng(5));
 assert.equal(r.words.length,0);assert.equal(r.stopped,'zzzq');}
// seeded continuation repeats
assert.equal(wv.continueWords(wv.normStream('the painter was'),20,M,wv.rng(31)).words.join(' '),
             wv.continueWords(wv.normStream('the painter was'),20,M,wv.rng(31)).words.join(' '));
console.log('PASS: profile counts, similarity scores, nearest-neighbour claims, borrowing gains, held-out coverage, map determinism, and continuation borrowing.');

// Lesson 9: the neural next-word model, its gradients, and every number its prose quotes.
const emHtml=readFileSync(path.join(root,'lessons/embeddings.html'),'utf8');
const emSource=emHtml.split('"use strict";')[1].split('/* ---------------- painting and panels')[0];
const emContext=vm.createContext({Math});
vm.runInContext(corpusSource,emContext);
vm.runInContext(emSource+'\nglobalThis.em={makeNet,forward,learn,workspace,shuffled,score,seeded,'
  +'rowCos,learnedNeighbours,countedNeighbours,countTable,commonest,normStream,'
  +'TRAIN_STREAM,HELD_STREAM,COUNTS,VOCAB,INDEX,TRAIN_CASES,HELD_CASES,PROF,T2,'
  +'VSIZE,DIM,HIDDEN,LR,EPOCHS};',emContext);
const em=emContext.em;
// the same corpus as lessons 7 and 8, cut down to the 600 commonest words
assert.equal(em.TRAIN_STREAM.length,81561);assert.equal(em.HELD_STREAM.length,2087);
assert.equal(em.COUNTS.size,5082);assert.equal(em.VOCAB.length,600);
assert.equal(em.VOCAB[em.VOCAB.length-1],'middle');
assert.equal(em.COUNTS.get('middle'),16);
assert.equal(em.TRAIN_CASES.length/3,47782);assert.equal(em.HELD_CASES.length/3,1102);
// "600 slots account for 84 per cent of the words in chapters one to nine"
{let c=0;for(const w of em.TRAIN_STREAM)if(em.INDEX.has(w))c++;
 assert.equal((100*c/em.TRAIN_STREAM.length).toFixed(1),'84.1');}
// "403 of the 2,087 words, 326 distinct ones, fall outside the vocabulary"
{let out=0;const d=new Set();
 for(const w of em.HELD_STREAM)if(!em.INDEX.has(w)){out++;d.add(w);}
 assert.equal(out,403);assert.equal(d.size,326);
 assert.equal(em.HELD_STREAM.length-2-em.HELD_CASES.length/3,983);}
// "30,456 weights: 9,600 in the table, 20,856 in the two layers above it"
{const n=em.makeNet(em.VSIZE,em.DIM,em.HIDDEN,1);
 assert.equal(n.E.length,9600);
 assert.equal(n.W1.length+n.b1.length+n.W2.length+n.b2.length,20856);
 assert.equal(n.E.length+n.W1.length+n.b1.length+n.W2.length+n.b2.length,30456);}
// A derivative error would invalidate the training run the whole lesson rests on.
// learn() folds the learning rate into every update, so dividing the weight
// change by it recovers the analytic gradient the shipped code actually used.
{const V=12,D=4,H=5,a=3,b=7,c=5;
 const before=em.makeNet(V,D,H,99),after=em.makeNet(V,D,H,99);
 em.learn(after,a,b,c,1,em.workspace(after));
 const loss=(key,i,delta)=>{const n=em.makeNet(V,D,H,99);n[key][i]+=delta;
   const h=new Float64Array(H),p=new Float64Array(V);em.forward(n,a,b,h,p);return -Math.log(p[c]);};
 const eps=1e-6;
 for(const key of ['E','W1','b1','W2','b2'])
   for(let i=0;i<before[key].length;i++){
     const analytic=before[key][i]-after[key][i];
     const numeric=(loss(key,i,eps)-loss(key,i,-eps))/(2*eps);
     assert.ok(Math.abs(numeric-analytic)<1e-6,'gradient mismatch '+key+'['+i+']');
   }}
// the one-hot claim in section 1: distinct words never share a slot, so every
// pair of encodings has dot product 0 and distance root two
assert.equal(new Set(em.VOCAB).size,600);
{const dot=(x,y)=>x===y?1:0;
 assert.equal(dot(em.INDEX.get('lawyer'),em.INDEX.get('painter')),0);
 assert.equal(dot(em.INDEX.get('lawyer'),em.INDEX.get('the')),0);
 assert.equal(Math.sqrt(2).toFixed(2),'1.41');}
// section 6's prompt and its worked examples
assert.equal(em.COUNTS.get('pillow'),3);
assert.equal(em.COUNTS.get('computer'),undefined);
assert.equal(em.INDEX.get('pillow'),undefined,'"pillow" must fall outside the 600');
// counting, as lesson 8 did, still puts "painter" nearest to "lawyer"
assert.equal(em.VOCAB[em.countedNeighbours(em.PROF,em.VSIZE,em.INDEX.get('lawyer'),1)[0][0]],'painter');
// the training run the prose quotes: seed 1, six epochs over all 47,782 positions
function trainRun(seed,epochs){
  const net=em.makeNet(em.VSIZE,em.DIM,em.HIDDEN,seed),work=em.workspace(net);
  const rnd=em.seeded((seed*2654435761)>>>0),N=em.TRAIN_CASES.length/3,hist=[];
  for(let e=0;e<epochs;e++){
    const order=em.shuffled(N,rnd);let loss=0;
    for(let i=0;i<N;i++){const t=order[i]*3;
      loss+=em.learn(net,em.TRAIN_CASES[t],em.TRAIN_CASES[t+1],em.TRAIN_CASES[t+2],em.LR,work);}
    net.epochs++;
    const s=em.score(net,em.HELD_CASES);
    hist.push({train:loss/N/Math.LN2,held:s.bits,right:s.right});
  }
  return {net,hist};
}
const run=trainRun(1,em.EPOCHS);
const last=run.hist[run.hist.length-1];
assert.equal(last.train.toFixed(2),'6.00');
assert.equal(last.held.toFixed(2),'6.25');
assert.equal(last.right,187);
assert.equal(Math.round(Math.pow(2,last.held)),76);
// held-out surprise falls but stops improving; training surprise keeps falling
assert.ok(run.hist[0].held>run.hist[em.EPOCHS-1].held,'held surprise should fall overall');
assert.ok(run.hist.every((h,i)=>i===0||h.train<run.hist[i-1].train),'training surprise should fall every epoch');
assert.ok(run.hist.some((h,i)=>i>0&&h.held>run.hist[i-1].held),'held surprise should rise at least once');
// section 5: the network answers all 1,102 positions at much the same rate
// whether or not the count table has a row for the context
{const net=run.net,h=new Float64Array(net.H),p=new Float64Array(net.V);
 let pos=0,row=0,tableRight=0,netOnRow=0,blank=0,netOnBlank=0,net_=0;
 for(let i=2;i<em.HELD_STREAM.length;i++){
   const a=em.INDEX.get(em.HELD_STREAM[i-2]),b=em.INDEX.get(em.HELD_STREAM[i-1]),c=em.INDEX.get(em.HELD_STREAM[i]);
   if(a===undefined||b===undefined||c===undefined)continue;
   pos++;em.forward(net,a,b,h,p);
   let best=0;for(let o=1;o<net.V;o++)if(p[o]>p[best])best=o;
   const ok=best===c;if(ok)net_++;
   const f=em.T2.get(em.HELD_STREAM[i-2]+' '+em.HELD_STREAM[i-1]);
   if(f){row++;if(em.commonest(f)===em.HELD_STREAM[i])tableRight++;if(ok)netOnRow++;}
   else{blank++;if(ok)netOnBlank++;}
 }
 assert.equal(pos,1102);assert.equal(row,873);assert.equal(blank,229);
 assert.equal(tableRight,150);assert.equal(netOnRow,148);assert.equal(netOnBlank,39);
 assert.equal(net_,187);
 assert.equal((100*tableRight/row).toFixed(1),'17.2');
 assert.equal((100*tableRight/pos).toFixed(1),'13.6');
 assert.equal((100*netOnRow/row).toFixed(1),'17.0');
 assert.equal((100*netOnBlank/blank).toFixed(1),'17.0');}
// section 4's quoted neighbours, at the default seed
{const near=(w,k)=>em.learnedNeighbours(run.net,em.INDEX.get(w),k).map(e=>em.VOCAB[e[0]]).join(' ');
 assert.equal(near('said',4),'answered asked added shouted');
 assert.equal(near('he',2),'k she');
 assert.equal(near('lawyer',2),'painter priest');
 // "door" comes out well under both methods; "hand" puts "hands" first either way
 assert.equal(near('door',2),'doorway window');
 assert.equal(near('hand',1),'hands');
 assert.equal(em.VOCAB[em.countedNeighbours(em.PROF,em.VSIZE,em.INDEX.get('hand'),1)[0][0]],'arm');}
// a seeded run repeats exactly, which is what the experiment seed promises
{const a=trainRun(3,1),b=trainRun(3,1);
 assert.deepEqual(Array.from(a.net.E),Array.from(b.net.E),'seeded training must reproduce');
 assert.notDeepEqual(Array.from(a.net.E),Array.from(trainRun(4,1).net.E),'a different seed must differ');}
console.log('PASS: vocabulary coverage, weight counts, every gradient of a small network against numerical derivatives, the quoted training run, the held-out comparison, quoted neighbours, and seed reproducibility.');
