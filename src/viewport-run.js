// Run-scoped HTML overlay and responsive render buffers. Simulation is read-only.
const hudLayer=el('div','hud-layer');arena.append(hudLayer);
hud.classList.add('run-hud');foot.classList.add('run-loadout');controls.classList.add('hud-actions');
hudLayer.append(hud,controls,foot);legend.remove();chartRunNote.remove();bossPanel.remove();
const hpMeter=el('progress'),xpMeter=el('progress');hpMeter.setAttribute('aria-label','Health');xpMeter.setAttribute('aria-label','Experience');hud.append(hpMeter,xpMeter);
const mini=el('aside','minimap');mini.setAttribute('aria-label','World minimap');mini.innerHTML='<svg viewBox="0 0 135 102" role="img" aria-label="Your position, view, landmarks and chests"></svg><small>WORLD · GOLD = CACHE</small>';hudLayer.append(mini);
const noticeLabel=el('div','run-notice'),bossLabel=el('div','boss-overlay'),bossName=el('span'),bossHealth=el('progress');bossLabel.append(bossName,bossHealth);bossHealth.setAttribute('aria-label','Boss health');hudLayer.append(noticeLabel,bossLabel);
function updateOverlayHud(){
 hpMeter.max=p.max;hpMeter.value=Math.max(0,p.hp);xpMeter.max=state.need;xpMeter.value=state.xp;
 noticeLabel.hidden=notice.time<=0;noticeLabel.textContent=notice.text;bossLabel.hidden=!bossRef||bossRef.hp<=0;
 if(!bossLabel.hidden){bossName.textContent=bossRef.chart?(bossRef.chart.name+' — '+bossRef.chart.artist):['THE THORNKEEPER','THE DISSONANT CHOIR','THE SILENCER','THE GRIDLOCK KING','THE TIDEBREAKER','THE SCARECROW KING'][stage];bossHealth.max=bossRef.max;bossHealth.value=Math.max(0,bossRef.hp)}
 const dot=(x,y,r,color)=>'<circle cx="'+(x/MW*135).toFixed(2)+'" cy="'+(y/MH*102).toFixed(2)+'" r="'+r+'" fill="'+color+'"/>';
 let marks='<rect width="135" height="102" fill="#0a1524" stroke="#486175"/>';
 for(const l of landmarks)marks+=dot(l.x,l.y,3,zone.color);
 for(const c of pickups)if(c.type==='chest')marks+=dot(c.x,c.y,2,'#ffda87');
 if(bossRef&&bossRef.hp>0)marks+=dot(bossRef.x,bossRef.y,3,'#ff7396');
 marks+='<polygon points="'+viewFootprint().map(v=>(clamp(v.x,0,MW)/MW*135).toFixed(2)+','+(clamp(v.y,0,MH)/MH*102).toFixed(2)).join(' ')+'" fill="none" stroke="#aacdc4" stroke-width=".7"/>'+dot(p.x,p.y,3,'#b8ffba');mini.querySelector('svg').innerHTML=marks;
}
function showRunSettings(){if(state.status==='playing')togglePause();if(state.status!=='paused')return;const panel=show('Settings','Sound, camera and display');panel.append(comfortControls(),musicControls(),viewPicker(),cam3dRow,fullscreenButton(),button('Resume',togglePause,'accent'))}
function resizeViewport(size){
 W=size.logicalWidth;H=size.logicalHeight;
 canvas.width=size.bufferWidth;canvas.height=size.bufferHeight;
 viewCamera.resize(W,H);cam3d?.resize(W,H);
 if(cam3d?.following==='match')cam3d.matchCanvasPose(viewCamera.progress);
 if(worldLayer){worldLayer.width=size.bufferWidth;worldLayer.height=size.bufferHeight}
 glLayoutKey='';if(renderer3d)syncGlLayout();
 pointer=null;pointerId=null;orbit=null;keys.clear();lastHud=-1;
}
const releaseViewport=MMSViewport.observe(arena,resizeViewport);
