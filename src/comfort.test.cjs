const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('src/viewport.js','utf8');
function load(saved,reduced=false){const writes=[];const env={localStorage:{getItem:()=>saved,setItem:(k,v)=>writes.push([k,v])},matchMedia:()=>({matches:reduced})};vm.runInNewContext(source,env);return{api:env.MMSViewport,writes}}
let {api,writes}=load(null,true);assert.ok(Object.values(api.comfort).every(v=>v===false));
api.setComfort('shake',true);assert.equal(api.comfort.shake,true);assert.equal(JSON.parse(writes[0][1]).shake,true);
let restored=load(writes[0][1],true).api;assert.equal(restored.comfort.shake,true);assert.equal(restored.comfort.bloom,false);
assert.ok(Object.values(load('{bad').api.comfort).every(v=>v===true));
assert.equal(load('{"shake":"false"}').api.comfort.shake,true);
const html=fs.readFileSync('index.html','utf8');
assert.ok(html.includes('comfort.shake===false ? 0 : (f.shake || 0) + this.kick'));
assert.ok(html.includes('comfort.lights===false ? null : lightCand[i]'));
assert.ok(html.includes('this.post && globalThis.MMSViewport?.comfort.bloom!==false'));
assert.ok(html.includes('const shake=MMSViewport.comfort.shake?engineShake():0'));
assert.equal((html.match(/MMSViewport.comfort.numbers\?damageTexts/g)||[]).length,2);
console.log('Passed comfort defaults, reduced motion, persistence, invalid saves and all rendering gates.');
