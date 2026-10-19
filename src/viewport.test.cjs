const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const viewport=require('./viewport.js'),html=fs.readFileSync('index.html','utf8').replace(/\r/g,'');
for(const [w,h] of [[390,844],[844,390],[1280,720],[1920,1080],[3840,2160],[5120,1440]])for(const dpr of [1,1.25,2,3]){
 const s=viewport.measure(w,h,dpr);assert.ok(s.bufferWidth*s.bufferHeight<=4000000);
 assert.ok(s.ratio<=2&&s.ratio<=dpr);assert.ok(s.logicalWidth<=1280.0001&&s.logicalHeight<=800.0001);
 assert.ok(Math.abs(s.logicalWidth/s.logicalHeight-w/h)<1e-9);
 const p=viewport.point({clientX:20+w*.5,clientY:30+h*.5},{left:20,top:30,width:w,height:h},s.logicalWidth,s.logicalHeight);
 assert.ok(Math.abs(p.x-s.logicalWidth*.5)<1e-9);assert.ok(Math.abs(p.y-s.logicalHeight*.5)<1e-9);
}
// Lifecycle: resize/fullscreen/DPR changes coalesce; teardown removes all hooks.
function events(){const listeners=new Map();return {listeners,addEventListener(k,fn){if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(fn)},removeEventListener(k,fn){listeners.get(k)?.delete(fn)},emit(k,e={}){for(const fn of [...(listeners.get(k)||[])])fn(e)}}}
const win=events(),doc=events(),visual=events(),media=events();let queued=null,disconnected=false,applied=[];
Object.assign(win,{devicePixelRatio:2,document:doc,visualViewport:visual,requestAnimationFrame(fn){queued=fn;return 1},cancelAnimationFrame(){queued=null},matchMedia:()=>media,ResizeObserver:class{observe(){}disconnect(){disconnected=true}}});
let rect={width:1280,height:720};const release=viewport.observe({getBoundingClientRect:()=>rect},s=>applied.push(s),win);
assert.equal(applied.length,1);queued();queued=null;rect={width:390,height:844};win.emit('resize');doc.emit('fullscreenchange');assert.ok(queued);queued();queued=null;assert.equal(applied.at(-1).width,390);
win.devicePixelRatio=1;media.emit('change');queued();queued=null;assert.equal(applied.at(-1).ratio,1);
release();assert.equal(disconnected,true);assert.equal(win.listeners.get('resize').size,0);assert.equal(doc.listeners.get('fullscreenchange').size,0);assert.equal(media.listeners.get('change').size,0);
// Use the shipped Three.js camera math, not camera mocks.
const context=vm.createContext({console});
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
vm.runInContext(scripts.find(s=>s.includes('/* three.js r149')),context);
vm.runInContext(fs.readFileSync('src/render3d.js','utf8'),context);
vm.runInContext(scripts.find(s=>s.includes('/* Music Monster camera engine.')),context);
const camera3d=new context.MMSRender3D.Camera3D(),camera2d=new context.MMSCamera.CameraController();
for(const [w,h] of [[390,844],[844,390],[1920,1080]]){
 const size=viewport.measure(w,h,2);camera3d.resize(size.logicalWidth,size.logicalHeight);camera3d.setPosition(2400,1800);camera3d.apply();
 assert.ok(Math.abs(camera3d.camera.aspect-w/h)<1e-9);
 const q=camera3d.project(2450,1830),p=camera3d.screenToGround(q.x,q.y);assert.ok(Math.abs(p.x-2450)<1e-6&&Math.abs(p.y-1830)<1e-6);
 camera2d.resize(size.logicalWidth,size.logicalHeight);camera2d.setPosition(2400,1800);
 for(const progress of [0,1]){camera2d.setProgress(progress);const a=camera2d.project(2450,1830),b=camera2d.screenToGround(a.x,a.y);assert.ok(Math.abs(b.x-2450)<1e-6&&Math.abs(b.y-1830)<1e-6)}
}
// Renderer.resize must resize projection and buffers together, including non-16:10 screens.
const calls=[];context.MMSRender3D.Renderer3D.prototype.resize.call({cam:{resize:(w,h)=>calls.push(['camera',w,h])},renderer:{setPixelRatio:r=>calls.push(['ratio',r]),setSize:(w,h)=>calls.push(['buffer',w,h])}},390,844,369,800);
assert.deepEqual(calls[0],['camera',369,800]);assert.deepEqual(calls[2],['buffer',390,844]);
for(const file of ['viewport.js','shell-ui.js','viewport-run.js'])assert.ok(html.includes(fs.readFileSync('src/'+file,'utf8').replace(/\r/g,'').trim()),file+' bundle drift');
assert.ok(html.includes('releaseViewport();dispose3d()'));assert.ok(html.includes('immersive.dispose()'));
assert.ok(html.includes('mainMenu();loadChartBosses();'));
assert.ok(!html.includes('drawWorldLayers();ctx.fillStyle="#161321"'),'HUD must not be painted into the world canvas');
// Fullscreen toggles the complete game shell and handles denial without an unhandled promise.
(async()=>{
 const env=events(),document=events();env.document=document;document.fullscreenEnabled=true;let presses=0,errors=[];
 const b={setAttribute(k,v){this[k]=v}},root={querySelectorAll:()=>[b],async requestFullscreen(){presses++;document.fullscreenElement=root}};
 document.exitFullscreen=async()=>{document.fullscreenElement=null};const full=viewport.fullscreen(root,m=>errors.push(m),env);
 await full.toggle();assert.equal(document.fullscreenElement,root);assert.equal(b.textContent,'Exit fullscreen');
 await full.toggle();assert.equal(document.fullscreenElement,null);assert.equal(b.textContent,'⛶ Fullscreen');
 root.requestFullscreen=async()=>{throw Error('Denied')};await full.toggle();assert.deepEqual(errors,['Denied']);
 full.dispose();assert.equal(env.listeners.get('keydown').size,0);assert.equal(document.listeners.get('fullscreenchange').size,0);assert.equal(presses,1);
 console.log('Passed viewport sizing, pixel budgets, all camera projection/input round-trips, resize cleanup, fullscreen handling and bundle checks.');
})().catch(error=>{console.error(error);process.exitCode=1});
