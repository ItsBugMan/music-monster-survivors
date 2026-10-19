// ---- View modes -------------------------------------------------------------
// Mode2D and Mode25D keep using the canvas pipelines below (projectedWorld, unchanged).
// Mode3D is an additional WebGL layer (MMSRender3D) fed by the same game state; the
// character generator is only read through the sprite canvases it already produced.
const VIEW_KEY='music-monster:view:v1',coarsePointer=window.matchMedia?.('(pointer: coarse)').matches||false;
const cam3d=window.THREE&&window.MMSRender3D&&MMSRender3D.supported()?new MMSRender3D.Camera3D({width:W,height:H}):null;
let renderer3d=null,glCanvas=null,glLayoutKey='',worldLayer=null,view3dFailed=!cam3d,lastDt=.016,orbit=null;
const viewMode=MMSViewMode.create({initial:MMSViewMode.load(localStorage,VIEW_KEY),available:m=>m!=='3d'||!view3dFailed,
 reducedMotion:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false,onChange:applyView});
const viewButton=button('View: 2D · V',cycleView);
viewButton.setAttribute('aria-label','Cycle camera view: 2D, 2.5D, 3D');
controls.append(viewButton);
const cam3dRow=el('span');cam3dRow.style.cssText='display:none;gap:6px;align-items:center;flex-wrap:wrap';
for(const [text,label,fn] of [['⟲','Rotate camera left',()=>cam3d.rotate(-.35,0)],['⟳','Rotate camera right',()=>cam3d.rotate(.35,0)],['Tilt ▲','Raise camera',()=>cam3d.rotate(0,8)],['Tilt ▼','Lower camera',()=>cam3d.rotate(0,-8)],['＋','Zoom in',()=>cam3d.zoom(.88)],['－','Zoom out',()=>cam3d.zoom(1.14)],['Reset','Reset 3D camera',()=>cam3d.resetUser()]]){
 const b=button(text,()=>{if(cam3d)fn();canvas.focus()});b.setAttribute('aria-label',label);b.title=label;cam3dRow.append(b)}
const cam3dHint=el('small','muted','3D camera: Q/E rotate · R/F tilt · wheel zoom · right-drag orbit · C reset');cam3dRow.append(cam3dHint);controls.append(cam3dRow);

function cycleView(){viewMode.cycle();canvas.focus()}
function toggleView(){cycleView()}
function setView(mode){const changed=viewMode.request(mode);if(!changed&&mode==='3d'&&!viewMode.can('3d'))toast('3D view needs WebGL, which this browser is not providing.');canvas.focus();return changed}
function view3dLive(){return !!renderer3d&&viewMode.blend3d>.5}
function spawnView(){return view3dLive()?cam3d:viewCamera}
function spawnVisible(o,margin){return view3dLive()?cam3d.onScreen(o,margin):projectedVisible(o,margin)}
function hudVisible(o){return view3dLive()?cam3d.onScreen(o,70):visible(o)}
function hudProject(x,y){return view3dLive()?cam3d.project(x,y):viewCamera.project(x,y)}
// WASD / arrows / drag are relative to the 3D camera's heading (identity at yaw 0 and in 2D / 2.5D).
function viewInput(dx,dy){if(!renderer3d||viewMode.blend3d<=.5)return[dx,dy];const c=Math.cos(cam3d.yaw),s=Math.sin(cam3d.yaw);return[dx*c+dy*s,-dx*s+dy*c]}

function refreshViewUi(){
 const mode=viewMode.mode,label=MMSViewMode.LABELS[mode];
 viewButton.textContent='View: '+label+' · V';viewButton.setAttribute('aria-pressed',String(mode!=='2d'));
 cam3dRow.style.display=mode==='3d'?'flex':'none';
 for(const b of arena.querySelectorAll('.view-picker button[data-view]')){const on=b.dataset.view===mode;b.setAttribute('aria-pressed',String(on));b.classList.toggle('accent',on);b.disabled=!viewMode.can(b.dataset.view)}
}
function viewPicker(){
 const row=el('div','view-picker');row.style.cssText='display:flex;gap:8px;justify-content:center;align-items:center;margin-top:14px;flex-wrap:wrap';
 row.append(el('small','muted','Camera view'));
 for(const m of MMSViewMode.MODES){const b=button(MMSViewMode.LABELS[m],()=>{setView(m);refreshViewUi()});b.dataset.view=m;if(m==='3d'&&!viewMode.can('3d'))b.title='3D needs WebGL';row.append(b)}
 queueMicrotask(refreshViewUi);return row;
}

// The state machine reports a change; this is where each state's camera is configured.
function applyView(next,prev,info={}){
 if(next==='3d'&&!ensureRenderer3d()){
  view3dFailed=true;const back=prev&&prev!=='3d'?prev:'2d';viewMode.force(back);
  if(info.initial)viewCamera.setProgress(back==='2.5d'?1:0);else toast('3D view needs WebGL — staying in '+MMSViewMode.LABELS[back]+'.');
  refreshViewUi();return;
 }
 if(next==='3d'){
  cam3d.setPosition(p.x,p.y);
  if(info.initial){viewCamera.setProgress(1);cam3d.snapToUserPose()}
  else{viewCamera.setProgress(viewCamera.progress);cam3d.snapToCanvasPose(viewCamera.progress);cam3d.useUserPose()}
 }else if(info.initial)viewCamera.setProgress(next==='2.5d'?1:0);
 else if(prev==='3d'){const to=next==='2d'?0:1;viewCamera.setProgress(to);cam3d.matchCanvasPose(to)}
 else viewCamera.transitionTo(next,{duration:1.4});
 MMSViewMode.save(localStorage,VIEW_KEY,next);refreshViewUi();
}

function ensureRenderer3d(){
 if(renderer3d)return true;if(!cam3d)return false;
 try{
  glCanvas=document.createElement('canvas');glCanvas.setAttribute('aria-hidden','true');
  glCanvas.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;display:none;pointer-events:none';
  arena.insertBefore(glCanvas,canvas);canvas.style.position='relative';
  renderer3d=new MMSRender3D.Renderer3D({canvas:glCanvas,width:W,height:H,camera:cam3d,shadowSize:coarsePointer?1024:2048,
   world:{MW,MH,stage,zone,obstacles,landmarks},art:{floor:bakeFloor,colors:COLORS,pickupColors,elementOf:vfxElement}});
  return true;
 }catch(err){console.warn('Music Monster: 3D renderer unavailable',err);glCanvas?.remove();glCanvas=null;renderer3d=null;return false}
}
// The generator's decor/landmark art stays authoritative: the 3D floor is those same drawers rasterised once.
function bakeFloor(){
 const scale=coarsePointer?.5:.75,c=document.createElement('canvas');c.width=Math.round(MW*scale);c.height=Math.round(MH*scale);
 const g=c.getContext('2d'),prev=ctx;ctx=g;
 try{
  g.scale(scale,scale);g.fillStyle=zone.bg;g.fillRect(0,0,MW,MH);
  for(let y=0;y<MH;y+=80)for(let x=0;x<MW;x+=80){const road=onRoad(x+40,y+40);g.fillStyle=road?['#293036','#302b41','#39252c'][stage]:((x/80+y/80)%2===0?'#ffffff03':'#00000006');g.fillRect(x+1,y+1,78,78);if(road){g.strokeStyle='#ffffff07';g.lineWidth=1;g.strokeRect(x+6,y+6,68,68)}}
  for(const d of decor)if(!onRoad(d.x,d.y))drawDecorOriginal(d);
  for(const l of landmarks)drawLandmarkOriginal(l);
 }finally{ctx=prev}
 return c;
}
function syncGlLayout(){
 const l=canvas.offsetLeft,t=canvas.offsetTop,w=canvas.offsetWidth,h=canvas.offsetHeight,key=[l,t,w,h,window.devicePixelRatio].join();
 if(key===glLayoutKey||!w||!h)return;glLayoutKey=key;
 Object.assign(glCanvas.style,{left:l+'px',top:t+'px',width:w+'px',height:h+'px'});renderer3d.resize(w,h);
}
function dropRenderer3d(message){
 view3dFailed=true;try{renderer3d?.dispose()}catch{}renderer3d=null;glCanvas?.remove();glCanvas=null;glLayoutKey='';
 if(viewMode.mode==='3d'){viewMode.force('2.5d');viewCamera.setProgress(1)}viewMode.blend3d=0;refreshViewUi();if(message)toast(message);
}
function drawWorldLayers(){
 const blend=renderer3d?viewMode.blend3d:0;
 if(blend<=0){
  if(glCanvas&&glCanvas.style.display!=='none')glCanvas.style.display='none';
  ctx.save();ctx.translate(shake?rand(-shake,shake):0,shake?rand(-shake,shake):0);projectedWorld();ctx.restore();return;
 }
 glCanvas.style.display='block';syncGlLayout();
 cam3d.follow(p.x,p.y,lastDt);cam3d.update(lastDt);
 const ok=renderer3d.render({time:state.time,player:p,playerSprite:sprites.get(lead.key),heroColor:color,enemies,shots,fields,hazards,fx,gems,pickups,crates,turrets,shake});
 if(!ok||renderer3d.lost){dropRenderer3d('The 3D view lost its graphics context — switched to 2.5D.');ctx.save();projectedWorld();ctx.restore();return}
 ctx.clearRect(0,0,W,H);
 if(blend<1){ // cross-fade: the unchanged canvas world is drawn off-screen, then blended over the 3D layer
  if(!worldLayer){worldLayer=document.createElement('canvas');worldLayer.width=W;worldLayer.height=H}
  const main=ctx;ctx=worldLayer.getContext('2d');ctx.clearRect(0,0,W,H);
  try{ctx.save();ctx.translate(shake?rand(-shake,shake):0,shake?rand(-shake,shake):0);projectedWorld();ctx.restore()}finally{ctx=main}
  ctx.globalAlpha=1-blend;ctx.drawImage(worldLayer,0,0);ctx.globalAlpha=1;
 }
 overlay3D(blend);
}
// Bars, labels and damage numbers stay crisp 2D, positioned by the 3D camera's projection.
function overlay3D(alpha){
 ctx.save();ctx.globalAlpha=alpha;
 const q=cam3d.project(p.x,p.y,0);
 if(q){const w=50*q.scale,x=q.x-w/2,y=q.y+12;ctx.fillStyle="#3c263e";ctx.fillRect(x,y,w,5);ctx.fillStyle="#b8f475";ctx.fillRect(x,y,w*Math.max(0,p.hp)/p.max,5)}
 for(const e of enemies){
  if(e.hp<=0||(e.type!=="elite"&&e.type!=="boss"&&!e.role))continue;
  const a=cam3d.project(e.x,e.y,(e.bossSize||e.enemySize||e.r*2)+10);if(!a)continue;
  if(e.role){ctx.font="11px system-ui";ctx.textAlign="center";ctx.fillStyle=MMSBalance.roles[e.role].color;ctx.fillText(MMSBalance.roles[e.role].name+(e.windup>0?" · DASH!":""),a.x,a.y-(e.type==='elite'?26:12))}
  const col=e.type==="boss"?"#fa6384":"#f6c16e",w=Math.max(28,50*a.scale*(e.type==="boss"?1.5:1)),x=a.x-w/2;
  ctx.fillStyle="#321c33";ctx.fillRect(x,a.y-5,w,5);ctx.fillStyle=col;ctx.fillRect(x,a.y-5,w*Math.max(0,e.hp/e.max),5);
  if(e.type==="elite"&&e.chartEnemy){ctx.font="10px system-ui";ctx.textAlign="center";ctx.fillStyle="#ffe6a5";ctx.fillText("#"+e.chartEnemy.rank+" "+e.chartEnemy.name.slice(0,22),a.x,a.y-10)}
 }
 for(const d of damageTexts){const a=cam3d.project(d.x,d.y+20,38+(.65-d.t)*60);if(!a)continue;ctx.font="bold 16px system-ui";ctx.fillStyle="#ffe69d";ctx.textAlign="center";ctx.fillText(d.text,a.x,a.y)}
 ctx.restore();
}

// Free camera: Q/E yaw, R/F pitch, +/- (or wheel) zoom, C reset, right-drag orbit. Only while 3D is the target.
function cameraKeys(dt){
 if(!cam3d||viewMode.mode!=='3d')return;
 const yaw=(keys.has('e')?1:0)-(keys.has('q')?1:0),tilt=(keys.has('r')?1:0)-(keys.has('f')?1:0),zoom=(keys.has('=')||keys.has('+')?1:0)-(keys.has('-')||keys.has('_')?1:0);
 if(yaw||tilt)cam3d.rotate(yaw*1.7*dt,tilt*38*dt);if(zoom)cam3d.zoom(Math.exp(-zoom*1.2*dt));
 if(keys.has('c')){cam3d.resetUser();keys.delete('c')}
}
function orbitDown(e){if(viewMode.mode!=='3d'||e.button!==2)return;e.preventDefault();orbit={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId)}
function orbitMove(e){if(!orbit||e.pointerId!==orbit.id)return;cam3d.rotate(-(e.clientX-orbit.x)*.006,(e.clientY-orbit.y)*.25);orbit.x=e.clientX;orbit.y=e.clientY}
function orbitUp(e){if(orbit&&e.pointerId===orbit.id)orbit=null}
function wheel3d(e){if(viewMode.mode!=='3d')return;e.preventDefault();cam3d.zoom(Math.exp(e.deltaY*.0012))}
function noMenu3d(e){if(viewMode.mode==='3d')e.preventDefault()}
canvas.addEventListener('pointerdown',orbitDown);canvas.addEventListener('pointermove',orbitMove);canvas.addEventListener('pointerup',orbitUp);canvas.addEventListener('pointercancel',orbitUp);
canvas.addEventListener('wheel',wheel3d,{passive:false});canvas.addEventListener('contextmenu',noMenu3d);
function dispose3d(){
 canvas.removeEventListener('pointerdown',orbitDown);canvas.removeEventListener('pointermove',orbitMove);canvas.removeEventListener('pointerup',orbitUp);canvas.removeEventListener('pointercancel',orbitUp);
 canvas.removeEventListener('wheel',wheel3d);canvas.removeEventListener('contextmenu',noMenu3d);
 try{renderer3d?.dispose()}catch{}renderer3d=null;glCanvas?.remove();glCanvas=null;
}
viewMode.start();
