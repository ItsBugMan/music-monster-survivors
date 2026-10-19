// Synchronize presentation modules without replacing the richer bundled 3D renderer.
const fs=require('fs');let html=fs.readFileSync('index.html','utf8').replace(/\r/g,'');
function block(start,end,file){const a=html.indexOf(start),b=html.indexOf(end,a);if(a<0||b<0)throw Error('Missing '+start);html=html.slice(0,a)+fs.readFileSync(file,'utf8').replace(/\r/g,'')+'\n'+html.slice(b)}
block('/* Presentation only: viewport sizing,','</script>','src/viewport.js');
block('// Mount-scoped presentation.', 'let chartBosses=', 'src/shell-ui.js');
block('// Run-scoped HTML overlay', '\nfunction projectedVisible(', 'src/viewport-run.js');
// CSS is a quoted string in the host game's existing stylesheet assembly.
const a=html.indexOf('css.textContent+="/* Native-game shell.'),b=html.indexOf(';document.head.append(css)',a);if(a<0||b<0)throw Error('Missing viewport CSS');
html=html.slice(0,a)+'css.textContent+='+JSON.stringify(fs.readFileSync('src/viewport.css','utf8').replace(/\r/g,''))+html.slice(b);
for(const f of ['index.html','Music_Monster_Survivors.html']){fs.writeFileSync(f+'.tmp',html);fs.renameSync(f+'.tmp',f)}
