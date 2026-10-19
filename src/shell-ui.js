// Mount-scoped presentation. Existing save data is read; generator data is untouched.
const immersive=MMSViewport.fullscreen(root,message=>{let note=root.querySelector('.fullscreen-error');if(!note){note=el('p','banner fullscreen-error');note.setAttribute('role','status');root.append(note)}note.textContent=message});
let collectionReturn=null;
function openCollection(){if(practice){window.dispatchEvent(new Event('mms-open-library'));return}if(document.fullscreenElement===root)document.exitFullscreen?.().catch(()=>{});root.hidden=true;collectionReturn=button('← Return to game',()=>{root.hidden=false;collectionReturn.remove();collectionReturn=null},'library-return');host.append(collectionReturn)}
function fullscreenButton(){const b=button('⛶ Fullscreen',immersive.toggle);b.dataset.fullscreen='';queueMicrotask(immersive.sync);return b}
function lastfmControls(){
 const form=el('form','lastfm-connect'),label=el('label','','Your Last.fm username'),input=el('input'),row=el('div','lastfm-row');
 input.name='username';input.autocomplete='username';input.setAttribute('aria-label','Your Last.fm username');input.setAttribute('autocapitalize','none');input.spellcheck=false;input.required=true;input.value=localStorage.getItem('song-creatures:lastfm-username')||'';
 label.append(input);const submit=el('button','accent','Import Last.fm scrobbles');submit.type='submit';row.append(label,submit);form.append(el('h3','','Play with your music'),el('p','muted','Import your listening history to build your creature roster. No Last.fm password needed.'),row);
 form.onsubmit=event=>{event.preventDefault();const username=input.value.trim();if(!username){input.focus();return}openCollection();window.dispatchEvent(new CustomEvent('mms-lastfm-connect',{detail:{username}}))};return form;
}
function playFromHome(){if(practice&&localStorage.getItem('song-creatures:lastfm-username')){openCollection();window.dispatchEvent(new Event('mms-lastfm-play'))}else menu()}
function shellNav(){const nav=el('nav','shell-nav');nav.setAttribute('aria-label','Game navigation');nav.append(button('← Main menu',mainMenu),fullscreenButton());return nav}
function shellPage(title){stop();root.dataset.screen='menu';root.replaceChildren(shellNav());const body=el('div','shell-page');body.append(el('h2','',title));root.append(body);return body}
function mainMenu(){
 stop();enemyStartToken++;root.dataset.screen='home';root.replaceChildren();
 const panel=el('main','home-menu'),title=el('h1','','Music Monster');title.append(el('span','','SURVIVORS · LOST FREQUENCIES'));
 panel.append(el('div','eyebrow','YOUR MUSIC. YOUR MONSTERS.'),title,el('p','home-copy','Build your arsenal. Break the charts. Survive the encore. Every song has a monster waiting to be heard.'));
 panel.append(lastfmControls());
 const actions=el('div','home-actions');actions.append(button('▶ Play',playFromHome,'accent'),button('Achievements',showAchievements),button('Settings',showShellSettings),fullscreenButton());
 actions.append(button('Music collection',openCollection));
 panel.append(actions);difficultySelector(panel,mainMenu);
 const foot=el('footer','shell-footer'),credit=el('span','','Music data powered by '),link=el('a','','Last.fm');link.href='https://www.last.fm';link.target='_blank';link.rel='noopener noreferrer';credit.append(link);
 foot.append(el('span','','WASD / arrows · P pause · V camera · Alt+Enter fullscreen'),credit);panel.append(foot);root.append(panel);
}
function showAchievements(){
 const body=shellPage('Achievements'),highest=MMS_META.data.highestCompletedDifficulty,index=MMSBalance.difficulties.findIndex(t=>t.id===highest);
 body.append(el('p','muted','Milestones from your saved runs. Difficulty achievements are shared across your collection. Stage clears belong to this roster.'));
 for(const [i,t] of MMSBalance.difficulties.entries())body.append(el('div','banner',(index>=i?'✓ ':'🔒 ')+t.name+' encore — complete a full '+t.name+' run'+(index>=i?' · Achieved':'')));
 STAGES.forEach((stage,i)=>body.append(el('div','banner',(progress.cleared[i]?'✓ ':'🔒 ')+stage.name+' — stage clear'+(progress.cleared[i]?' · Achieved':''))));
 const maxLevel=Math.max(1,...Object.values(MMS_META.data.creatures).map(c=>MMSMeta.levelInfo(c.xp).level));
 body.append(el('div','banner',(maxLevel>=25?'✓ ':'🔒 ')+'Rising star — reach creature level 25 · Best level '+maxLevel));
}
function showShellSettings(){
 const body=shellPage('Settings');body.append(comfortControls(),el('h3','','Sound'),musicControls(),el('h3','','Starting camera'));
 const select=el('select');select.setAttribute('aria-label','Starting camera');for(const id of MMSViewMode.MODES){const option=el('option','',MMSViewMode.LABELS[id]);option.value=id;select.append(option)}select.value=MMSViewMode.load(localStorage,'music-monster:view:v1');select.onchange=()=>MMSViewMode.save(localStorage,'music-monster:view:v1',select.value);
 body.append(select,el('p','muted','3D starts when you enter the arena. If WebGL is unavailable, the game uses 2.5D. Rendering adapts to your display with a 2× pixel-ratio and four-million-pixel budget.'),fullscreenButton(),el('h3','','Save data'),button('Export save',exportMetaSave),button('Import save',showMetaImport));
}
function comfortControls(){
 const group=el('fieldset','comfort-settings');group.append(el('legend','','Visual comfort'));
 for(const [key,title,description] of [['shake','Screen shake','Camera movement from hits and explosions, in every view.'],['lights','Impact lighting','Brief, bright dynamic lights in 3D.'],['bloom','Bloom / glow','The bright glow around 3D effects.'],['numbers','Floating damage numbers','Animated damage text above enemies.']]){
  const label=el('label'),input=el('input');input.type='checkbox';input.checked=MMSViewport.comfort[key];input.onchange=()=>MMSViewport.setComfort(key,input.checked);const text=el('span','',title);text.append(el('small','',description));label.append(input,text);group.append(label);
 }
 group.append(el('p','muted','Changes apply immediately and are saved on this browser. Attack warnings remain visible.'));return group;
}
