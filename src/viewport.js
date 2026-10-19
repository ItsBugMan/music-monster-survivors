/* Presentation only: viewport sizing, input coordinates and lifecycle. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MMSViewport=api})(globalThis,function(){
 'use strict';
 function measure(width,height,dpr=1){
  width=Math.max(1,Number(width)||1);height=Math.max(1,Number(height)||1);
  // Keep world-space framing bounded on ultrawide/4K screens. No stretched axes.
  const scale=Math.max(width/1280,height/800),ratio=Math.min(2,Math.max(.5,Number(dpr)||1),Math.sqrt(4000000/(width*height)));
  return {width,height,logicalWidth:width/scale,logicalHeight:height/scale,ratio,
   bufferWidth:Math.max(1,Math.floor(width*ratio)),bufferHeight:Math.max(1,Math.floor(height*ratio))};
 }
 function point(event,rect,width,height){return {x:(event.clientX-rect.left)*width/Math.max(1,rect.width),y:(event.clientY-rect.top)*height/Math.max(1,rect.height)}}
 function observe(element,apply,env=globalThis){
  let frame=0,disposed=false,media=null;
  const resize=()=>{if(disposed)return;const r=element.getBoundingClientRect();if(r.width&&r.height)apply(measure(r.width,r.height,env.devicePixelRatio))};
  const schedule=()=>{if(!disposed&&!frame)frame=env.requestAnimationFrame(()=>{frame=0;resize()})};
  const watchDpr=()=>{media?.removeEventListener?.('change',watchDpr);media=env.matchMedia?.('(resolution: '+(env.devicePixelRatio||1)+'dppx)');media?.addEventListener?.('change',watchDpr);schedule()};
  const observer=env.ResizeObserver?new env.ResizeObserver(schedule):null;observer?.observe(element);
  env.addEventListener('resize',schedule);env.visualViewport?.addEventListener('resize',schedule);env.document.addEventListener('fullscreenchange',schedule);watchDpr();resize();
  return ()=>{disposed=true;if(frame)env.cancelAnimationFrame(frame);observer?.disconnect();media?.removeEventListener?.('change',watchDpr);env.removeEventListener('resize',schedule);env.visualViewport?.removeEventListener('resize',schedule);env.document.removeEventListener('fullscreenchange',schedule)};
 }
 function fullscreen(root,onError=()=>{},env=globalThis){
  const doc=env.document,supported=!!root.requestFullscreen&&doc.fullscreenEnabled!==false;
  const sync=()=>{for(const b of root.querySelectorAll('[data-fullscreen]')){b.disabled=!supported;b.textContent=doc.fullscreenElement?'Exit fullscreen':'⛶ Fullscreen';b.setAttribute('aria-pressed',String(!!doc.fullscreenElement));b.title=supported?'Fullscreen · Alt+Enter / F11':'Fullscreen is unavailable in this browser'}};
  async function toggle(){try{if(!supported)throw Error('Fullscreen is unavailable in this browser.');if(doc.fullscreenElement)await doc.exitFullscreen();else await root.requestFullscreen();sync()}catch(error){onError(error.message||'Fullscreen could not be started.')}}
  function key(event){if(root.hidden||root.isConnected===false||event.repeat||['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName))return;if(event.key==='F11'||(event.altKey&&event.key==='Enter')){event.preventDefault();toggle()}}
  env.addEventListener('keydown',key);doc.addEventListener('fullscreenchange',sync);
  return {toggle,sync,dispose(){env.removeEventListener('keydown',key);doc.removeEventListener('fullscreenchange',sync)}};
 }
 const comfortKey='music-monster:comfort:v1',defaults={shake:true,lights:true,bloom:true,numbers:true};
 let saved={};try{saved=JSON.parse(globalThis.localStorage?.getItem(comfortKey)||'{}')||{}}catch{}
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const comfort=Object.fromEntries(Object.entries(defaults).map(([key,value])=>[key,typeof saved[key]==='boolean'?saved[key]:reduced?false:value]));
 function setComfort(key,value){if(!(key in defaults))return;comfort[key]=!!value;try{globalThis.localStorage?.setItem(comfortKey,JSON.stringify(comfort))}catch{}}
 return {measure,point,observe,fullscreen,comfort,setComfort};
});
