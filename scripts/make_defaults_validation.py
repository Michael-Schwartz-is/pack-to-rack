"""Temporary diagnostic AMXD; uses exactly the delivered embedded converter."""
from pathlib import Path
import json,struct
base=Path(__file__).resolve().parents[1]
b=(base/'dist/Pack 2 Rack.amxd').read_bytes();p=json.loads(b[32:].rstrip(b'\0'))['patcher']
for wrapper in p['boxes']:
 e=wrapper['box']
 if e['id']=='worker':
  e['code']=e['code'].replace("max.addHandler('verified_macros',(wanted,visible)=>{","let validationResolve=null;\nmax.addHandler('verified_macros',(wanted,visible)=>{")
  e['code']=e['code'].replace("m.live_visible_macro_count=Number(visible);fs.writeFileSync(file,JSON.stringify(m,null,2)+'\\n');","m.live_visible_macro_count=Number(visible);fs.writeFileSync(file,JSON.stringify(m,null,2)+'\\n');if(validationResolve){validationResolve(m);validationResolve=null;}")
  e['code']+=r'''
(async()=>{
 const real=scan('/Users/michael/Downloads/Sample Magic Classic Jungle/drum_hits');
 const baseFile=real.samples.find(s=>s.category==='kick');
 for(const count of [4,12]){
  const categories=count===4?['kick','snare','closed_hat','cymbal']:Object.keys(TYPES).slice(0,12);
  const fixture={...real,samples:categories.map(category=>({...baseFile,category}))};
  const result=build(fixture,'/tmp/pack-to-rack-defaults-verification/exports',{},false,'Macro '+count+' Verification',{layout:count===4?'sequential':'fixed'});
  latest=result.rack;
  const verified=new Promise(resolve=>{validationResolve=resolve;setTimeout(()=>resolve({error:'Live verification timed out'}),15000);});
  max.outlet('built',result.rack,'Macro '+count+' Verification',count);
  const observed=await verified;
  fs.appendFileSync('/tmp/pack-to-rack-defaults-verification/results.jsonl',JSON.stringify({count,rack:result.rack,observed})+'\n');
 }
 status('Validation finished.');
})().catch(e=>status('Validation error: '+e.message));
'''
 if e['id']=='title':e['text']='RACK DEFAULTS CHECK'
raw=(json.dumps({'patcher':p},ensure_ascii=False)+'\n').encode()+b'\0'
out=Path('/tmp/pack-to-rack-defaults-verification');out.mkdir(exist_ok=True)
(out/'Rack Defaults Verify.amxd').write_bytes(b[:28]+struct.pack('<I',len(raw))+raw)
print(out/'Rack Defaults Verify.amxd')
