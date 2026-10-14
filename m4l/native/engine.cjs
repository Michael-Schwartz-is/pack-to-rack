// Native converter: only Node standard-library modules, available in Node for Max.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const TYPES = {
 kick:['Kick',36,9],snare:['Snare',38,16],clap:['Clap',39,17],rim:['Rim / Stick',37,18],
 closed_hat:['Closed Hat',42,26],open_hat:['Open Hat',46,27],hat:['Hi-Hat',44,28],tom:['Tom',45,32],
 crash:['Crash',49,45],ride:['Ride',51,46],cymbal:['Cymbal',50,47],shaker:['Shaker',40,35],
 tambourine:['Tambourine',41,36],perc:['Percussion',43,38],fx:['FX / Foley',47,54],other:['Other',48,60]
};
const AUDIO=new Set(['.wav','.aif','.aiff','.flac']);
const OTHER_AUDIO=new Set(['.mp3','.ogg','.m4a','.aac','.wma']);
const sortNames=(a,b)=>a.localeCompare(b,'en',{numeric:true,sensitivity:'base'});
function audioInfo(file){
 const fd=fs.openSync(file,'r'),size=fs.fstatSync(fd).size;
 function read(at,n){if(at<0||n<0||at+n>size)throw Error('Truncated audio header');const b=Buffer.alloc(n);if(fs.readSync(fd,b,0,n,at)!==n)throw Error('Truncated audio header');return b;}
 let frames=0,rate=0,channels=0;
 try{
  const h=read(0,12),magic=h.toString('ascii',0,4);
  if(['RIFF','RIFX'].includes(magic)&&h.toString('ascii',8,12)==='WAVE'){
   const big=magic==='RIFX',u16=(b,o)=>big?b.readUInt16BE(o):b.readUInt16LE(o),u32=(b,o)=>big?b.readUInt32BE(o):b.readUInt32LE(o);
   let fmt=null,dataSize=null;
   for(let offset=12;offset+8<=size;){const c=read(offset,8),tag=c.toString('ascii',0,4),len=u32(c,4);offset+=8;if(offset+len>size)throw Error('Truncated WAV chunk');if(tag==='fmt ')fmt=read(offset,Math.min(len,40));if(tag==='data')dataSize=len;offset+=len+len%2;}
   if(!fmt||fmt.length<16||dataSize===null)throw Error('Missing WAV format/audio data');
   let encoding=u16(fmt,0);channels=u16(fmt,2);rate=u32(fmt,4);const align=u16(fmt,12);if(encoding===65534&&fmt.length>=40)encoding=u16(fmt,24);
   if(![1,3].includes(encoding))throw Error('Use PCM or float WAV (compressed WAV unsupported)');if(!align)throw Error('Invalid WAV block alignment');frames=Math.floor(dataSize/align);
  }else if(magic==='FORM'&&['AIFF','AIFC'].includes(h.toString('ascii',8,12))){
   for(let offset=12;offset+8<=size;){const c=read(offset,8),len=c.readUInt32BE(4);offset+=8;if(offset+len>size)throw Error('Truncated AIFF chunk');if(c.toString('ascii',0,4)==='COMM'){
    const b=read(offset,Math.min(len,22));if(b.length<18)throw Error('Invalid AIFF header');channels=b.readUInt16BE(0);frames=b.readUInt32BE(2);const exp=b.readUInt16BE(8);rate=Math.round(Number(b.readBigUInt64BE(10))*Math.pow(2,(exp&32767)-16383-63));if(exp&32768)rate=-rate;
    if(h.toString('ascii',8,12)==='AIFC'&&!['NONE','sowt','fl32','FL32','fl64','FL64'].includes(b.toString('ascii',18,22)))throw Error('Compressed AIFC unsupported');break;
   }offset+=len+len%2;}
  }else if(magic==='fLaC'){
   for(let offset=4;offset+4<=size;){const h=read(offset,4),len=h.readUIntBE(1,3);offset+=4;if((h[0]&127)===0){const b=read(offset,len);if(b.length<34)throw Error('Invalid FLAC STREAMINFO');const packed=b.readBigUInt64BE(10);rate=Number(packed>>44n);channels=Number((packed>>41n)&7n)+1;frames=Number(packed&((1n<<36n)-1n));break;}offset+=len;if(h[0]&128)break;}
  }else throw Error('Unrecognized audio header');
  if(!frames||!channels||!Number.isFinite(rate)||rate<=0)throw Error('Empty or invalid audio file');
  return {frames,rate,channels,duration:frames/rate};
 }finally{fs.closeSync(fd);}
}
function scan(folder){
 const root=fs.realpathSync(folder);if(!fs.statSync(root).isDirectory())throw Error('Choose an existing sample-pack folder.');const samples=[],skipped=[];
 function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>sortNames(a.name,b.name))){
  if(entry.name.startsWith('.')||entry.name==='__MACOSX')continue;
  const file=path.join(dir,entry.name);if(entry.isDirectory()){visit(file);continue;}if(!entry.isFile())continue;
  const ext=path.extname(file).toLowerCase(),relative=path.relative(root,file);if(!AUDIO.has(ext)&&!OTHER_AUDIO.has(ext))continue;
  if(!AUDIO.has(ext)){skipped.push({path:relative,reason:'Unsupported format; use WAV, AIFF or FLAC'});continue;}
  const parent=path.relative(root,dir).split(path.sep).join('/');
  try{samples.push({path:relative,category:'folder:'+parent,...audioInfo(file)});}catch(e){skipped.push({path:relative,reason:e.message});}
 }}visit(root);
 const types={};
 for(const s of samples){
  if(types[s.category])continue;
  const relative=s.category.slice(7),index=Object.keys(types).length;
  types[s.category]={name:relative?relative.split('/').at(-1):path.basename(root),note:36+index,color:[9,16,17,26,27,32,45,47,54,35,36,38,60,28,18,48][index%16]};
 }
 return {folder:root,name:path.basename(root),samples,skipped,types};
}
// Small XML DOM for bundled Ableton templates. User input is escaped on output.
function unescapeXml(s){return s.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi,e=>{const m={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};return m[e]??String.fromCodePoint(e.startsWith('&#x')?parseInt(e.slice(3,-1),16):parseInt(e.slice(2,-1),10));});}
function escapeXml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function parseXml(xml){
 const root={tag:'root',attrs:{},children:[]},stack=[root];
 for(const token of xml.match(/<[^>]*>/g)||[]){if(token.startsWith('<?')||token.startsWith('<!'))continue;if(token.startsWith('</')){const close=token.slice(2,-1).trim();if(stack.length<2||stack.pop().tag!==close)throw Error('Invalid template XML');continue;}
 const tag=token.match(/^<([^\s/>]+)/)?.[1];if(!tag)throw Error('Invalid template tag');const attrs={};for(const m of token.matchAll(/([^\s=]+)\s*=\s*"([^"]*)"/g))attrs[m[1]]=unescapeXml(m[2]);const e={tag,attrs,children:[]};stack.at(-1).children.push(e);if(!/\/\s*>$/.test(token))stack.push(e);
 }if(stack.length!==1||root.children.length!==1)throw Error('Invalid template XML');return root.children[0];
}
function serialize(e){const a=Object.entries(e.attrs).map(([k,v])=>' '+k+'="'+escapeXml(v)+'"').join('');return e.children.length?'<'+e.tag+a+'>'+e.children.map(serialize).join('')+'</'+e.tag+'>':'<'+e.tag+a+' />';}
const clone=e=>JSON.parse(JSON.stringify(e));
function find(e,p){for(const tag of p.split('/')){e=e?.children.find(x=>x.tag===tag);if(!e)return null;}return e;}
function all(e,tag){return (e.tag===tag?[e]:[]).concat(...e.children.map(c=>all(c,tag)));}
function put(e,p,v){const x=find(e,p);if(!x)throw Error('Missing template field: '+p);x.attrs.Value=String(v);}
function ranges(e,low,high){for(const [k,v]of [['Min',low],['Max',high],['CrossfadeMin',low],['CrossfadeMax',high]])put(e,k,v);}
function clearMaps(e){e.children=e.children.filter(c=>c.tag!=='KeyMidi');e.children.forEach(clearMaps);}
function mapMacro(e,index,max=127){
 const km={tag:'KeyMidi',attrs:{},children:[['PersistentKeyString',''],['IsNote','false'],['Channel',16],['NoteOrController',index],['LowerRangeNote',-1],['UpperRangeNote',-1],['ControllerMapMode',0]].map(([tag,value])=>({tag,attrs:{Value:String(value)},children:[]}))};
 e.children.splice(1,0,km);put(e,'Manual',0);put(e,'MidiControllerRange/Min',0);put(e,'MidiControllerRange/Max',max);
}
// Live's rack layout needs complete macro columns / supported display banks.
function macroSlots(count){return count<=2?Math.max(1,count):count<=8?Math.ceil(count/2)*2:count<=12?12:16;}
function resetMacros(e,names){for(let i=0;i<16;i++){put(e,'MacroDisplayNames.'+i,names[i]||'Macro '+(i+1));put(e,'MacroDefaults.'+i,i<names.length?0:-1);put(e,'MacroControls.'+i+'/Manual',0);}put(e,'NumVisibleMacroControls',macroSlots(names.length));put(e,'AreMacroControlsVisible','true');}
function loadTemplate(n){return parseXml(zlib.gunzipSync(Buffer.from(TEMPLATES[n],'base64')).toString('utf8'));}
function samplePart(file,relative,meta,index,count){
 const p=loadTemplate('sample');p.attrs.Id=String(index);put(p,'LomId',0);put(p,'Name',path.parse(file).name);put(p,'Selection',index===0?'true':'false');
 ranges(find(p,'KeyRange'),60,60);ranges(find(p,'VelocityRange'),1,127);ranges(find(p,'SelectorRange'),Math.floor(index*128/count),Math.floor((index+1)*128/count)-1);
 put(p,'RootKey',60);put(p,'Volume',1);put(p,'SampleStart',0);put(p,'SampleEnd',meta.frames-1);
 for(const l of ['SustainLoop','ReleaseLoop']){put(p,l+'/Start',0);put(p,l+'/End',meta.frames-1);put(p,l+'/Mode',l==='SustainLoop'?0:3);}
 const s=fs.statSync(file),ref=find(p,'SampleRef');put(ref,'FileRef/Path',file);put(ref,'FileRef/RelativePath',relative);put(ref,'FileRef/RelativePathType',0);put(ref,'FileRef/Type',2);put(ref,'FileRef/OriginalFileSize',s.size);put(ref,'FileRef/OriginalCrc',0);put(ref,'LastModDate',Math.floor(s.mtimeMs/1000));put(ref,'DefaultDuration',meta.frames);put(ref,'DefaultSampleRate',meta.rate);all(p,'WarpMarkers').forEach(e=>e.children=[]);return p;
}
function fillSampler(preset,entries,name,macro){const s=all(preset,'MultiSampler')[0];put(s,'UserName',name);put(s,'VolumeAndPan/Volume/Manual',-12);put(s,'VolumeAndPan/VolumeVelScale/Manual',.35);find(s,'Player/MultiSampleMap/SampleParts').children=entries.map(([file,rel,meta],i)=>samplePart(file,rel,meta,i,entries.length));mapMacro(find(s,'Player/SampleSelector'),macro);return s;}
// Pad-level controls live on an Instrument Rack, independent of outer selectors.
const PAD_CONTROLS=[
 ['Attack','VolumeAndPan/Envelope/AttackTime',.1,1000,'log'],
 ['Decay','VolumeAndPan/Envelope/DecayTime',1,60000,'log'],
 ['Sustain','VolumeAndPan/Envelope/SustainLevel',.0003162277571,1,'log'],
 ['Release','VolumeAndPan/Envelope/ReleaseTime',1,60000,'log'],
 ['Tune','Pitch/TransposeKey',-24,24,'linear'],
 ['Level','VolumeAndPan/Volume',-36,6,'linear'],
 ['Velocity','VolumeAndPan/VolumeVelScale',0,1,'linear']
];
function mapPadControls(s,rackDevice){
 PAD_CONTROLS.forEach(([name,field,min,max,scale],i)=>{
  const parameter=find(s,field),value=Number(find(parameter,'Manual').attrs.Value),index=i+1;
  mapMacro(parameter,index,max);put(parameter,'MidiControllerRange/Min',min);put(parameter,'Manual',value);
  const normalized=scale==='log'?Math.log(value/min)/Math.log(max/min):(value-min)/(max-min);
  const knob=Math.max(0,Math.min(127,normalized*127));
  put(rackDevice,'MacroControls.'+index+'/Manual',knob);put(rackDevice,'MacroDefaults.'+index,knob);
 });
}
function padRack(donor,loaded,label,outerMacro){
 const inner=find(loadTemplate('instrument'),'GroupDevicePreset');clearMaps(inner);
 const device=find(inner,'Device/InstrumentGroupDevice'),banks=Math.ceil(loaded.length/128);
 put(device,'UserName',label);resetMacros(device,['Sample Select',...PAD_CONTROLS.map(c=>c[0]),...(banks>1?['Bank']:[])]);
 mapMacro(find(device,'MacroControls.0'),outerMacro);
 put(device,'AreDevicesVisible','false');
 if(banks>1)mapMacro(find(device,'ChainSelector'),8,banks-1);
 const branches=find(inner,'BranchPresets'),branchDonor=clone(branches.children[0]);branches.children=[];
 for(let bank=0;bank<banks;bank++){
  const branch=clone(branchDonor);branch.attrs.Id=String(bank);put(branch,'Name',banks>1?'Bank '+(bank+1):label);
  ranges(find(branch,'BranchSelectorRange'),bank,bank);
  const samplerPreset=clone(find(donor,'DevicePresets').children[0]);
  const sampler=fillSampler(samplerPreset,loaded.slice(bank*128,(bank+1)*128),label,0);mapPadControls(sampler,device);
  find(branch,'DevicePresets').children=[samplerPreset];branches.children.push(branch);
 }
 inner.attrs.Id='0';return inner;
}
function validate(rack,count){
 const pads=find(rack,'GroupDevicePreset/BranchPresets').children,notes=pads.map(p=>128-Number(find(p,'ZoneSettings/ReceivingNote').attrs.Value));if(new Set(notes).size!==notes.length)throw Error('Duplicate pad notes');let actual=0;
 for(const sampler of all(rack,'MultiSampler')){const parts=find(sampler,'Player/MultiSampleMap/SampleParts').children;actual+=parts.length;const coverage=Array(128).fill(0);for(const p of parts){for(let n=Number(find(p,'SelectorRange/Min').attrs.Value);n<=Number(find(p,'SelectorRange/Max').attrs.Value);n++)coverage[n]++;if(!fs.statSync(find(p,'SampleRef/FileRef/Path').attrs.Value).isFile())throw Error('Missing sample');}if(coverage.some(n=>n!==1))throw Error('Selector gaps or overlaps');}
 if(actual!==count)throw Error('Output sample count mismatch');
}
function build(plan,outputDir,assignments={},copySamples=true,givenName,options={}){
 const layout=options.layout||'fixed';if(!['fixed','sequential'].includes(layout))throw Error('Unknown pad layout: '+layout);
 const root=fs.realpathSync(plan.folder),name=(givenName||plan.name).replace(/[/:\\\x00-\x1f]/g,'-').replace(/^[ .]+|[ .]+$/g,'')||'Sample Pack',output=path.resolve(outputDir),groups={};
 const types={...TYPES};for(const [id,t]of Object.entries(plan.types||{})){if(!types[id])types[id]=[t.name,t.note,t.color??60];}
 for(const [cat]of Object.entries(types)){
  const entries=[];for(const s of plan.samples){const c=assignments[s.path]||s.category;if(c==='skip')continue;if(!types[c])throw Error('Unknown category: '+c);if(c!==cat)continue;const file=fs.realpathSync(path.resolve(root,s.path)),rel=path.relative(root,file);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('Sample outside chosen folder');entries.push([file,s.path,audioInfo(file)]);}
  if(entries.length>16384)throw Error(types[cat][0]+' exceeds 16,384 samples; split this folder.');if(entries.length)groups[cat]=entries;
 }
 if(!Object.keys(groups).length)throw Error('No samples selected.');if(Object.keys(groups).length>16)throw Error('More than 16 sound groups; choose a smaller folder.');fs.mkdirSync(output,{recursive:true});const stage=fs.mkdtempSync(path.join(output,'.rack-build-'));let target=path.join(output,name),suffix=2;while(fs.existsSync(target))target=path.join(output,name+' '+suffix++);
 const rack=loadTemplate('drum'),preset=find(rack,'GroupDevicePreset'),bp=find(preset,'BranchPresets'),donor=clone(bp.children[0]),device=find(preset,'Device/DrumGroupDevice');bp.children=[];clearMaps(rack);
 const names=Object.keys(groups).map(k=>types[k][0]);
 resetMacros(device,names);put(device,'UserName',name);put(device,'PadScrollPosition',19);put(device,'ArePadsVisible','true');put(device,'AreDevicesVisible','true');
 const manifest={name,source:root,copy_samples:copySamples,layout,pad_grid_size:16,pad_grid_first_note:36,outer_macro_slots:macroSlots(names.length),sampler_output_db:-12,velocity_to_volume:.35,sample_gain_db:0,pads:[],skipped:plan.skipped};let macro=0;
 try{
  for(const [cat,entries]of Object.entries(groups)){
   const [label,fixedNote,color]=types[cat],note=layout==='sequential'?36+macro:fixedNote,pad=clone(donor);pad.attrs.Id=String(macro);put(pad,'Name',label);put(pad,'DocumentColorIndex',color);put(pad,'AutoColored','false');put(pad,'ZoneSettings/ReceivingNote',128-note);put(pad,'ZoneSettings/SendingNote',60);put(pad,'ZoneSettings/ChokeGroup',['closed_hat','open_hat','hat'].includes(cat)?1:0);put(device,'MacroColor.'+macro,color);
   const loaded=entries.map(([file,rel,meta])=>{if(!copySamples)return [file,rel,meta];const destRel=path.join('Samples',rel),dest=path.join(stage,destRel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);return [dest,destRel,meta];});
   find(pad,'DevicePresets').children=[padRack(donor,loaded,label,macro)];
   bp.children.push(pad);manifest.pads.push({type:cat,name:label,note,samples:entries.map(([,rel])=>rel),banks:Math.ceil(entries.length/128),controls:['Sample Select',...PAD_CONTROLS.map(c=>c[0]),...(entries.length>128?['Bank']:[])],macro:macro+1});macro++;
  }
  const count=Object.values(groups).reduce((n,v)=>n+v.length,0);validate(rack,count);
  if(copySamples)for(const part of all(rack,'MultiSamplePart')){const p=find(part,'SampleRef/FileRef/Path');p.attrs.Value=path.join(target,path.relative(stage,p.attrs.Value));}
  const rackfile=name+'.adg';fs.writeFileSync(path.join(stage,rackfile),zlib.gzipSync('<?xml version="1.0" encoding="utf-8"?>\n'+serialize(rack)));
  fs.writeFileSync(path.join(stage,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(path.join(stage,'HOW TO USE.txt'),'Load the .adg in Live 12 with Sampler. Turn Select macros to choose samples.\nFor categories over 128 samples, use Bank and Select.\nSamples use absolute paths. After moving an export, locate its Samples folder in Live and resave, or Collect All and Save your Live project.\n');fs.renameSync(stage,target);
  return {rack:path.join(target,rackfile),directory:target,pads:manifest.pads,samples:count};
 }catch(e){fs.rmSync(stage,{recursive:true,force:true});throw e;}
}
