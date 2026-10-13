const max=require('max-api');
const os=require('os');
const {execFile}=require('child_process');
function userLibrary(){
 const home=os.homedir();
 const fallback=path.join(home,process.platform==='win32'?'Documents':'Music','Ableton','User Library');
 const preferences=process.platform==='win32'?path.join(process.env.APPDATA||path.join(home,'AppData','Roaming'),'Ableton'):path.join(home,'Library','Preferences','Ableton');
 try{
  const configs=fs.readdirSync(preferences).filter(n=>/^Live 12\./.test(n)).map(n=>path.join(preferences,n,'Library.cfg')).filter(f=>fs.existsSync(f)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
  for(const file of configs){
   try{
    const project=find(parseXml(fs.readFileSync(file,'utf8')),'ContentLibrary/UserLibrary/LibraryProject');
    const parent=find(project,'ProjectPath')?.attrs.Value,name=find(project,'ProjectName')?.attrs.Value;
    if(parent&&name&&path.isAbsolute(parent))return path.join(parent,name);
   }catch(e){/* Older or incomplete settings: try the next installed Live 12. */}
  }
 }catch(e){/* Live has not written settings yet; use its platform default. */}
 return fallback;
}
function outputDirectory(){return path.join(userLibrary(),'Presets','Instruments','Drum Rack','Pack to Rack');}
let folder='',rackName='',copySamples=true,sequential=false,busy=false,latest='';
function status(s){max.outlet('status',s);}
function uiBox(name,attribute,...values){max.outlet('ui','script','sendbox',name,attribute,...values);}
const DROP_DECORATIONS=[];
function readyField(ready){
 // Native show/hide avoids sending box attributes to the live.text object.
 for(const name of ['drop_target','drop_hint','drop_background','drop_icon','drop_title','drop_caption',...DROP_DECORATIONS])max.outlet('ui','script',ready?'hide':'show',name);
 max.outlet('ui','script',ready?'show':'hide','build_rack');
 max.outlet('ui','script',ready?'show':'hide','build_background');
 max.outlet('ui','script',ready?'show':'hide','choose_pack');
 uiBox('rack_name','readonly',ready?0:1);
 for(const name of ['rack_name','rack_name_label'])max.outlet('ui','script',ready?'show':'hide',name);
 if(ready){
  max.outlet('ui','script','bringtofront','build_background');
  max.outlet('ui','script','bringtofront','build_rack');
 }
 else {
  max.outlet('ui','script','bringtofront','drop_target');
  for(const name of ['drop_icon','drop_title','drop_caption',...DROP_DECORATIONS])max.outlet('ui','script','bringtofront',name);
  max.outlet('ui','script','bringtofront','drop_hint');
 }
 uiBox('choose_pack','text',ready?'Change folder…':'Browse…');
 uiBox('choose_pack','texton',ready?'Change folder…':'Browse…');
}
function normalize(p){
 // Max uses volume:/path on macOS and E:/path on Windows. Keep drive roots.
 return /^[A-Za-z]:[\\/]/.test(p)?p:p.replace(/^[^:/]+:(\/.*)$/,'$1');
}
function defaultName(p){const base=path.basename(p);return /^(drum[ _-]*(hits|one[ _-]*shots)|one[ _-]*shots)$/i.test(base)?path.basename(path.dirname(p)):base;}
function cleanName(s){return s.replace(/[/:\\\x00-\x1f]/g,'-').replace(/^[ .]+|[ .]+$/g,'');}
function suggestedName(p){const name=cleanName(defaultName(p))||'Sample Pack';return name.startsWith('p2r_')?name:'p2r_'+name;}
function nextTurn(){return new Promise(resolve=>setImmediate(resolve));}
async function scanFolder(p){
 if(busy){status('Please wait for the current scan/build.');return;}
 busy=true;max.outlet('active',0);folder='';max.outlet('ui','script','send','rack_name','set');readyField(false);max.outlet('folder','Scanning…');status('Scanning one-shots…');await nextTurn();
 try{const next=normalize(p),plan=scan(next);if(!plan.samples.length)throw Error('No readable WAV, AIFF or FLAC one-shots found.');folder=next;rackName=suggestedName(next);max.outlet('ui','script','send','rack_name','set',rackName);max.outlet('folder',plan.name);uiBox('pack_folder_label','annotation',plan.folder);readyField(true);const counts={};plan.samples.forEach(s=>counts[s.category]=(counts[s.category]||0)+1);status(plan.samples.length+' samples · '+Object.keys(counts).length+' pads'+(plan.skipped.length?' · '+plan.skipped.length+' skipped':''));}
 catch(e){max.outlet('folder','WAV · AIFF · FLAC');status('Error: '+e.message);}finally{busy=false;max.outlet('active',1);}
}
max.addHandler('folder',(...args)=>scanFolder(args.join(' ')));
max.addHandler('name',(...args)=>{if(!busy)rackName=cleanName(args.join(' '));});
max.addHandler('copy',v=>{copySamples=!!Number(v);});
max.addHandler('sequential',v=>{sequential=!!Number(v);});
max.addHandler('build',async()=>{
 if(busy)return;if(!folder){status('Choose a sample-pack or drum_hits folder first.');return;}
 busy=true;max.outlet('active',0);status('Building Drum Rack'+(copySamples?' and copying samples…':'…'));await nextTurn();
 try{const name=rackName||suggestedName(folder);max.outlet('ui','script','send','rack_name','set',name);const result=build(scan(folder),outputDirectory(),{},copySamples,name,{layout:sequential?'sequential':'fixed'});latest=result.rack;uiBox('statuslabel','annotation','Saved preset: '+latest);max.post('Saved preset: '+latest);status('Built '+result.pads.length+' pads / '+result.samples+' sounds. Loading in Live…');max.outlet('built',result.rack,name,result.pads.length,process.platform==='darwin'?1:0);}
 catch(e){status('Error: '+e.message);}finally{busy=false;max.outlet('active',1);}
});
max.addHandler('load',(...args)=>{
 const file=args.join(' ');if(!latest||file!==latest||!fs.existsSync(file)){status('No completed rack to load.');return;}
 if(process.platform!=='darwin'){status('Rack saved. Drag this preset into Live: '+file);return;}
 execFile('/usr/bin/open',['-a','Ableton Live 12 Suite',file],e=>{if(e)status('Rack saved at '+file+'; automatic loading failed: '+e.message);});
});
max.addHandler('verified_macros',(wanted,visible,gridCount)=>{
 if(!latest)return;
 try{const file=path.join(path.dirname(latest),'manifest.json'),m=JSON.parse(fs.readFileSync(file,'utf8'));m.live_requested_macro_count=Number(wanted);m.live_visible_macro_count=Number(visible);if(gridCount!==undefined)m.live_visible_pad_count=Number(gridCount);fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');}catch(e){max.post('Macro verification could not be recorded: '+e.message);}
});
readyField(false);status('');
