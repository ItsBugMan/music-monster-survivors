const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const balance=require('./balance.js'),html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('(function(scope,factory){const api=factory();if(typeof module',html.indexOf('scope.MMSEnemyPools=api')+1);
assert.ok(start>0);
const context=vm.createContext({module:{exports:{}},MMSBalance:balance});
vm.runInContext(html.slice(start,html.indexOf('</script>',start)),context);
const meta=context.module.exports;
function storage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i],get length(){return map.size}}}
const disk=storage(),store=meta.createStore(disk);
const run=(tier='normal',mode='normal')=>store.begin('Test song','Test artist',tier,mode);
const credit=(id,extra={})=>store.credit(id,'Test song','Test artist',{seconds:1800,kills:100,gold:100,final:true,won:true,...extra});
assert.equal(store.data.highestCompletedDifficulty,null);
assert.equal(balance.unlocked('normal',null),true);
assert.equal(balance.unlocked('hard',null),false);
assert.equal(balance.unlocked('dumb','normal'),false);
assert.equal(balance.unlocked('bogus','dumb'),false);
assert.throws(()=>run('hard'),/locked/);
assert.throws(()=>run('dumb'),/locked/);
credit(run(),{seconds:1799});assert.equal(store.data.highestCompletedDifficulty,null);
credit(run(),{won:false});assert.equal(store.data.highestCompletedDifficulty,null);
credit(run('normal','endless'));assert.equal(store.data.highestCompletedDifficulty,null);
const id=run();credit(id,{seconds:300,final:false,won:false});
const beforeXP=store.info('Test song','Test artist').xp,beforeGold=store.data.gold;
const normal=credit(id);assert.equal(normal.xp,3150);assert.equal(normal.gold,495);
assert.equal(store.data.highestCompletedDifficulty,'normal');
const xp=store.info('Test song','Test artist').xp,gold=store.data.gold;
credit(id);assert.equal(store.info('Test song','Test artist').xp,xp);assert.equal(store.data.gold,gold);
assert.ok(xp>beforeXP&&gold>beforeGold);
assert.equal(meta.createStore(disk).data.highestCompletedDifficulty,'normal');
assert.throws(()=>run('dumb'),/locked/);
const hardID=run('hard');
credit(hardID,{seconds:900,won:false,final:false});const checkpoint=store.data.runs[hardID];
credit(hardID,{seconds:900,won:false,final:false});assert.equal(store.data.runs[hardID].gold,checkpoint.gold);
const hard=credit(hardID);assert.equal(hard.xp,Math.floor(3150*1.25));assert.equal(hard.gold,Math.floor(495*1.5));
assert.equal(store.data.highestCompletedDifficulty,'hard');
const dumb=credit(run('dumb'));assert.equal(dumb.xp,6300);assert.equal(dumb.gold,Math.floor(495*2.5));
assert.equal(store.data.highestCompletedDifficulty,'dumb');
credit(run());assert.equal(store.data.highestCompletedDifficulty,'dumb');
// Round-trip difficulty, checkpoints and progression for all six existing stages.
disk.setItem('music-monster:survivors:v1:practice',JSON.stringify({unlocked:5,gold:0,cleared:{5:true}}));
const exported=store.exportText(),restored=meta.createStore(storage());restored.importText(exported);
assert.equal(restored.data.highestCompletedDifficulty,'dumb');
assert.equal(restored.data.runs[hardID].difficulty,'hard');
const legacy=JSON.parse(exported);delete legacy.meta.highestCompletedDifficulty;
for(const r of Object.values(legacy.meta.runs)){delete r.difficulty;delete r.mode}
restored.importText(JSON.stringify(legacy));assert.equal(restored.data.highestCompletedDifficulty,null);
for(const bad of ['impossible',3,{},false]){const pack=JSON.parse(exported);pack.meta.highestCompletedDifficulty=bad;assert.throws(()=>restored.parse(JSON.stringify(pack)),/difficulty/)}
const badRun=JSON.parse(exported);badRun.meta.runs[hardID].difficulty='nightmare';assert.throws(()=>restored.parse(JSON.stringify(badRun)),/difficulty/);
// Stage/minute/Endless factors compose once with the selected difficulty.
for(const minute of [0,15,29])for(const stage of [0,5])for(const cycle of [0,3]){
 const n=balance.difficulty(minute,stage,cycle);
 for(const t of balance.difficulties){const d=balance.difficulty(minute,stage,cycle,t.id);assert.equal(d.hp,n.hp*t.hp);assert.equal(d.damage,n.damage*t.damage);assert.equal(d.spawn,n.spawn*t.density);assert.equal(d.maxEnemies,500*t.density)}
}
const count=id=>{const result={assassin:0,tank:0,swarm:0};for(let i=0;i<10000;i++){const role=balance.role(5,()=>i/10000,id);if(role)result[role]++}return result};
const n=count('normal'),h=count('hard'),d=count('dumb');
assert.ok(h.assassin>n.assassin&&h.tank>n.tank);
assert.ok(d.assassin>h.assassin&&d.tank>h.tank&&d.swarm>h.swarm);
// Verify the actual game wiring uses the snapshotted difficulty and scaled caps.
assert.ok(html.includes('MMS_META.begin(lead.name,lead.artist,runDifficulty.id,mode)'));
assert.ok(html.includes('MMSBalance.difficulty(minute,stage,cycle,runDifficulty.id)'));
assert.ok(html.includes('MMSBalance.role(d.minute,Math.random,runDifficulty.id)'));
assert.ok(html.includes('Math.min(d.maxBatch,'));assert.ok(!html.includes('enemies.length<500'));
assert.ok(html.indexOf('function difficultySelector(body,')>html.indexOf('window.MMS={mount('),'Setup selector must be inside the game mount, not the audio controller');
console.log('Passed sequential unlocks, victory gates, checkpoint rewards, save migration/round-trip, tier scaling and archetype distribution.');
