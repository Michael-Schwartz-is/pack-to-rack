// Node for Max worker. No server or browser; Python runs only during scan/build.
const max = require('max-api');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {execFile} = require('child_process');
const ENGINE = path.join(__dirname, 'engine', 'rack.py');
const PYTHON = ['/opt/homebrew/bin/python3','/usr/local/bin/python3'].find(p=>fs.existsSync(p)) || 'python3';
const OUTPUT = path.join(os.homedir(),'Music','Ableton','User Library','Presets','Instruments','Drum Rack','Pack to Rack');
let folder = '', copySamples = true, busy = false, latest = '';
function status(s){max.outlet('status',s);}
function normalize(p){return p.replace(/^[^:/]+:(\/.*)$/, '$1');}
function run(args){return new Promise((resolve,reject)=>execFile(PYTHON,[ENGINE,...args],{maxBuffer:32*1024*1024},(e,out,err)=>{if(e)return reject(Error(err.trim()||e.message));try{resolve(JSON.parse(out));}catch(e){reject(Error('Converter returned an invalid result.'));}}));}
async function scanFolder(p){
 if(busy){status('Please wait for the current scan/build.');return;}
 busy=true; max.outlet('active',0); folder=''; status('Scanning one-shots…');
 try{
   const next=normalize(p); const plan=await run([next,'--scan']);
   if(!plan.samples.length)throw Error('No readable WAV, AIFF or FLAC one-shots found.');
   folder=next; max.outlet('folder',plan.folder);
   const counts={};plan.samples.forEach(s=>counts[s.category]=(counts[s.category]||0)+1);
   status(plan.samples.length+' sounds • '+Object.entries(counts).map(([k,n])=>plan.types[k].name+' '+n).join(' / ')+(plan.skipped.length?' • '+plan.skipped.length+' skipped':''));
 }catch(e){status('Error: '+e.message);}finally{busy=false;max.outlet('active',1);}
}
max.addHandler('folder',(...args)=>scanFolder(args.join(' ')));
max.addHandler('copy',value=>{copySamples=!!Number(value);});
max.addHandler('build',async()=>{
 if(busy)return;
 if(!folder){status('Choose a sample-pack or drum_hits folder first.');return;}
 busy=true;max.outlet('active',0);status('Building Drum Rack'+(copySamples?' and copying samples…':'…'));
 try{
   const base=path.basename(folder), name=/^(drum[ _-]*(hits|one[ _-]*shots)|one[ _-]*shots)$/i.test(base)?path.basename(path.dirname(folder)):base;
   const args=[folder,'--output',OUTPUT,'--name',name];if(!copySamples)args.push('--reference');
   const result=await run(args); latest=result.rack;
   status('Built '+result.pads.length+' pads / '+result.samples+' sounds. Loading in Live…');
   max.outlet('built',result.rack,name);
 }catch(e){status('Error: '+e.message);}finally{busy=false;max.outlet('active',1);}
});
max.addHandler('load',(...args)=>{
 const file=args.join(' ');
 if(!latest || file!==latest || !fs.existsSync(file)){status('No completed rack to load.');return;}
 if(process.platform!=='darwin'){status('Rack saved. Load it from User Library → Drum Rack → Pack to Rack.');return;}
 execFile('/usr/bin/open',['-a','Ableton Live 12 Suite',file],e=>{if(e)status('Rack saved; automatic loading failed: '+e.message);});
});
status('Ready. Choose a pack or drop a folder onto the device.');
