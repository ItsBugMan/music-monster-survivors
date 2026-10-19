const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const balance=require('./balance.js');
const html=fs.readFileSync('index.html','utf8').replace(/\r/g,'');
assert.equal(html,fs.readFileSync('Music_Monster_Survivors.html','utf8').replace(/\r/g,''));
assert.ok(html.includes(fs.readFileSync('src/balance.js','utf8').trim()));
// Compile every classic inline script, including the full game integration.
let parsed=0;
for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
 if(!match[1].includes('type="module"'))new vm.Script(match[2]);
 else {const result=require('node:child_process').spawnSync(process.execPath,['--check','--input-type=module'],{input:match[2],encoding:'utf8'});assert.equal(result.status,0,result.stderr)}
 parsed++;
}
function extract(start,end){const a=html.indexOf(start);assert.ok(a>=0,start);const b=html.indexOf(end,a+start.length);assert.ok(b>a,end);return html.slice(a,b)}
const ctx=vm.createContext({MMSBalance:balance,Math,Map,Set,console});
vm.runInContext(extract('(function(scope,factory){const api=factory();if(typeof module', '</script>'),ctx);
const pools=ctx.MMSEnemyPools;
const entries=Array.from({length:100},(_,i)=>({rank:i+1,name:'Song '+i,artist:'Artist',art:{grid:[new Uint8Array([1,0])],palette:['','#fff']}}));
const snapshot=pools.build({entries});
assert.equal(snapshot.entries.length,97);
assert.ok(Object.isFrozen(snapshot.entries[0].art.grid));
for(const minute of [0,4,9,14,19,24])for(let i=0;i<100;i++){
 const entry=pools.pick(snapshot,minute,{random:()=>i/100});
 assert.ok(entry.rank>=4);assert.ok(entry.rank>=pools.brackets[pools.unlocked(minute)].min);
}
for(let rank=100;rank>4;rank--)assert.ok(pools.profile({rank,name:'a',artist:'b'}).hp<pools.profile({rank:rank-1,name:'a',artist:'b'}).hp);
assert.deepEqual(balance.tiers.map(t=>Math.round(t.scale*8)),[4,8,10,12]);
assert.deepEqual([.8,.3,.1,.01].map(r=>balance.roll(0,()=>r)),[0,1,2,3]);
for(let i=0;i<1000;i++)assert.ok(balance.roll(1,()=>i/1000)>=balance.roll(0,()=>i/1000));
assert.ok(balance.chance(.012,balance.luck(.12,5))>balance.chance(.012,balance.luck(.12,0)));
assert.equal(balance.luck(100,100),2);
assert.equal(balance.chance(1,2),.75);
assert.ok(balance.difficulty(29,5,2).hp>balance.difficulty(29,5,1).hp);
assert.ok(balance.difficulty(29,0,0).hp<(1+29*.12+29*29*.004));
vm.runInContext(`function partyBonuses(){return {mods:{LCK:0,HP:0,ATK:0,DEF:0,SPD:0},crit:0}}${extract('function combatProfile(', 'function elementShares(')}`,ctx);
assert.equal(vm.runInContext('combatProfile({base:{LCK:0}}).luck',ctx),0);
assert.equal(vm.runInContext('combatProfile({base:{LCK:100},mods:{LCK:.25}}).luck',ctx),.5);
// Exercise the actual reward grant code, keeping rank and effect independent.
vm.runInContext(`
 const PASSIVE_ITEMS=[{id:'haste'},{id:'luck'},{id:'multi'}];
 const weapons={},mods={haste:0,luck:0,multi:0},potency={haste:0,luck:0,multi:0},rarityHistory={};
 function weaponDef(id){return id==='weapon'?{id}:null}
 function refreshLoadout(){} function runLuck(){return 0}
 ${extract('function grant(', 'function chooseUpgrade(')}
`,ctx);
for(const r of [0,1,2,3])assert.equal(vm.runInContext(`grant('haste',${r})`,ctx),true);
assert.equal(vm.runInContext('mods.haste',ctx),4);
assert.equal(vm.runInContext('potency.haste*.08',ctx),.34);
vm.runInContext("grant('haste',0)",ctx);
assert.equal(vm.runInContext("grant('haste',3)",ctx),false);
assert.equal(vm.runInContext('potency.haste*.08',ctx),.38);
vm.runInContext("grant('weapon',3);grant('weapon',2)",ctx);
assert.equal(vm.runInContext('weapons.weapon.quality',ctx),.2);
assert.equal(vm.runInContext('weapons.weapon.level',ctx),2);
// Real spawn function: generated art comes through the wrapper, rank metadata is preserved.
let generated=0;
const enemyCtx=vm.createContext({MMSBalance:balance,MMSEnemyPools:pools,Math,Map,Set,
 window:{MMS_CHART_BOSSES:{create(info){generated++;return {...info,art:{grid:[[1]],palette:['','#fff']}}}}}});
vm.runInContext(`
 let runEnemyChart=MMSEnemyPools.build(),enemies=[],uid=1,bossRef=null;
 const p={x:2400,y:1800},MW=4800,MH=3600,W=960,H=640,stage=0,enemySpriteCache=new Map();
 const difficulty=()=>MMSBalance.difficulty(3,0,0),rand=(a,b)=>(a+b)/2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const spawnView=()=>({progress:0}),moveBody=()=>{},attachChartBoss=()=>{},sprite=c=>c.art;
 ${extract("function enemy(type=",'const wavePatterns=')}
`,enemyCtx);
for(const role of Object.keys(balance.roles)){
 const e=vm.runInContext(`enemy('drifter','${role}')`,enemyCtx);
 assert.equal(e.role,role);assert.ok(e.enemySprite);assert.equal(e.chartEnemy,undefined);
 if(role==='treasure')assert.equal(e.contact,0);
}
assert.equal(generated,4);
vm.runInContext("enemy('drifter','tank')",enemyCtx);assert.equal(generated,4);
enemyCtx.testSnapshot=pools.build({entries:[entries[95]]});
vm.runInContext('runEnemyChart=testSnapshot',enemyCtx);
const ranked=vm.runInContext("enemy('drifter','tank')",enemyCtx);
assert.equal(ranked.chartEnemy.rank,96);assert.equal(ranked.role,'tank');assert.equal(generated,4);
enemyCtx.testSnapshot=pools.build({entries:[entries[3]]});
vm.runInContext('runEnemyChart=testSnapshot',enemyCtx);
const elite=vm.runInContext("enemy('drifter','treasure')",enemyCtx);
assert.equal(elite.chartEnemy.rank,4);assert.equal(elite.type,'elite');assert.equal(elite.role,'treasure');assert.equal(elite.contact,0);
assert.equal(vm.runInContext("enemy('elite','tank').role",enemyCtx),undefined);
// Exercise the actual movement loop: non-stacking debuff, committed dash, escape.
const movement=extract('for(let e of enemies){if(e.hp<=0)continue;e.hit=', 'rebuildGrid();if(state.status');
vm.runInContext(`
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);let dt=.1,state={time:10},contacts=0;
 function damagePlayer(){contacts++}function toast(){}function bossAction(){}function addShot(){}
 p.shield=0;p.earworm=0;
 function step(){${movement}}
`,enemyCtx);
vm.runInContext("enemies=[];runEnemyChart=MMSEnemyPools.build();let swarm=enemy('drifter','swarm');swarm.x=p.x+30;swarm.y=p.y;step()",enemyCtx);
assert.equal(vm.runInContext('p.earworm',enemyCtx),1.5);
vm.runInContext('step();step()',enemyCtx);assert.equal(vm.runInContext('p.earworm',enemyCtx),1.5);
vm.runInContext('p.earworm=0;p.shield=1;step()',enemyCtx);assert.equal(vm.runInContext('p.earworm',enemyCtx),0);
vm.runInContext("enemies=[];let assassin=enemy('drifter','assassin');assassin.x=p.x+50;assassin.y=p.y;assassin.roleCD=0;step()",enemyCtx);
assert.equal(vm.runInContext('assassin.windup',enemyCtx),.65);
vm.runInContext('for(let i=0;i<7;i++)step()',enemyCtx);assert.equal(vm.runInContext('assassin.dashTime',enemyCtx),.4);
vm.runInContext("enemies=[];let treasure=enemy('drifter','treasure');treasure.x=p.x;treasure.y=p.y;contacts=0;step()",enemyCtx);
assert.equal(vm.runInContext('contacts',enemyCtx),0);
vm.runInContext('treasure.age=28;step()',enemyCtx);assert.equal(vm.runInContext('treasure.hp',enemyCtx),0);
// Shield damage and reporting use the same reduced value; multiple tanks never stack.
vm.runInContext(`
 const report={damage:0,hits:0,criticals:0,byWeapon:{}},damageTexts=[];let weaponContext=null;
 ${extract('function hit(e,', 'function areaDamage(')}
 enemies=[{hp:100,role:'tank',r:30,x:0,y:0},{hp:100,role:'tank',r:30,x:0,y:0}];
 let victim={hp:100,r:10,x:10,y:0};hit(victim,10);
`,enemyCtx);
assert.equal(vm.runInContext('victim.hp',enemyCtx),93);
assert.equal(vm.runInContext('report.damage',enemyCtx),7);
vm.runInContext("victim={hp:100,r:40,x:10,y:0,type:'boss'};hit(victim,10)",enemyCtx);
assert.equal(vm.runInContext('victim.hp',enemyCtx),90);
console.log(`Passed balance, reward, Luck, spawn, chart and entry-point checks; parsed ${parsed} scripts.`);
