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
