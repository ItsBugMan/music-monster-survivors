/* Gameplay policy only. Generator output and chart snapshots remain read-only. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MMSBalance=api})(globalThis,function(){
 'use strict';
 const tiers=Object.freeze([
  {name:'Common',scale:.5,color:'#c9ced8'},
  {name:'Uncommon',scale:1,color:'#99df91'},
  {name:'Rare',scale:1.25,color:'#83baff'},
  {name:'Legendary',scale:1.5,color:'#ffd479'}
 ].map(Object.freeze));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const luck=(base=0,passive=0)=>clamp(base+passive*.08,0,2);
 const chance=(base,luck,cap=.75)=>clamp(base*(1+luck),0,cap);
 function roll(luck=0,random=Math.random){
  const r=random(),l=clamp(luck,0,2);
  return r<.02+l*.03?3:r<.14+l*.12?2:r<.44+l*.18?1:0;
 }
 const roles=Object.freeze({
  assassin:{name:'One-Hit Wonder',hp:.65,speed:1.65,damage:.9,size:.85,color:'#ff997c'},
  tank:{name:'B-Side',hp:1.8,speed:.65,damage:1.1,size:1.25,color:'#b6a0ff'},
  swarm:{name:'Earworm',hp:.55,speed:1.15,damage:.55,size:.72,color:'#a3ed9b'},
  treasure:{name:'Bonus Track',hp:1.6,speed:1.6,damage:0,size:.9,color:'#ffd479'}
 });
 function role(minute,random=Math.random){const r=random();return minute<1?null:r<.12?'assassin':r<.20&&minute>=3?'tank':r<.30&&minute>=2?'swarm':null}
 function difficulty(minute,stage,cycle){return {
  minute,cycle,hp:(1+minute*.095+minute*minute*.0032)*(1+stage*.20)*(1+cycle*.85),
  damage:(1+minute*.012)*(1+stage*.14)*(1+cycle*.30),
  speed:1+Math.min(.40,minute*.005+cycle*.045),spawn:1+Math.min(2.5,cycle*.25)
 }}
 return {tiers,roles,luck,chance,roll,role,difficulty};
});
