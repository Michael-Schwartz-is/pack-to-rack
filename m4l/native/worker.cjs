const max=require('max-api');
const {execFile}=require('child_process');
let folder='',rackName='',copySamples=true,sequential=false,busy=false,awaitingDestination=false,latest='';
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
 if(/^[A-Za-z]:[\\/]/.test(p))return p;
 const match=p.match(/^([^:/]+):(\/.*)$/);
 if(!match)return p;
 if(process.platform==='darwin'){
  const volume=path.join('/Volumes',match[1]);
  if(fs.existsSync(volume))return path.join(volume,match[2]);
  if(!fs.existsSync(match[2]))return path.join(volume,match[2]);
 }
 return match[2];
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
function finishBuild(){busy=false;awaitingDestination=false;max.outlet('active',1);uiBox('rack_name','readonly',0);}
max.addHandler('build',()=>{
 if(busy)return;if(!folder){status('Choose a sample folder first.');return;}
 busy=true;awaitingDestination=true;max.outlet('active',0);uiBox('rack_name','readonly',1);
 status('Choose where to save the rack…');max.outlet('choose_destination','bang');
});
max.addHandler('cancel_export',()=>{
 if(!awaitingDestination)return;
 finishBuild();status('Export cancelled. Your source folder is still selected.');
});
max.addHandler('export',async(...args)=>{
 if(!awaitingDestination)return;
 awaitingDestination=false;
 try{
  const destination=normalize(args.join(' '));
  if(!path.isAbsolute(destination))throw Error('Choose a full folder path for the export.');
  status('Building Drum Rack'+(copySamples?' and copying samples…':'…'));await nextTurn();
  const name=rackName||suggestedName(folder);max.outlet('ui','script','send','rack_name','set',name);
  const result=build(scan(folder),destination,{},copySamples,name,{layout:sequential?'sequential':'fixed'});
  latest=result.rack;uiBox('statuslabel','annotation','Saved preset: '+latest);max.post('Saved preset: '+latest);
  status('Built '+result.pads.length+' pads / '+result.samples+' sounds. Loading in Live…');max.outlet('built',result.rack,name,result.pads.length,process.platform==='darwin'?1:0);
 }catch(e){status('Error: '+e.message);}finally{finishBuild();}
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
readyField(false);status('v'+VERSION+' · Choose a sample folder.');
