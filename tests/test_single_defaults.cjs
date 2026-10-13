const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),assert=require('assert'),zlib=require('zlib');
const root=path.resolve(__dirname,'..'),raw=fs.readFileSync(path.join(root,'dist','Pack 2 Rack.amxd'));
const p=JSON.parse(raw.subarray(32).toString().replace(/\0$/,'')).patcher;
const home=fs.mkdtempSync(path.join(os.tmpdir(),'rack-defaults-')),handlers={};
const ctx=vm.createContext({require:n=>n==='max-api'?{addHandler:(k,f)=>handlers[k]=f,outlet:()=>{}}:n==='os'?{homedir:()=>home}:require(n),Buffer,process,setImmediate});
vm.runInContext(p.boxes.find(x=>x.box.id==='worker').box.code,ctx);
const run=s=>vm.runInContext(s,ctx);
function tree(file){ctx.xml=zlib.gunzipSync(fs.readFileSync(file)).toString();ctx.r=run('parseXml(xml)');return ctx.r;}
try{
 const pack=path.join(home,'All Types');fs.mkdirSync(pack);const wav=fs.readFileSync(path.join(root,'examples','Demo Pack','Kicks','Kick 01.wav'));
 const cats=run('Object.keys(TYPES)');for(const c of cats)fs.writeFileSync(path.join(pack,c+'.wav'),wav);
 ctx.input=pack;ctx.output=path.join(home,'output');run('var plan=scan(input); for(var i=0;i<plan.samples.length;i++)plan.samples[i].category=path.parse(plan.samples[i].path).name;');
 for(const n of [4,12]){
  ctx.n=n;run('var smaller={...plan,samples:plan.samples.filter(s=>Object.keys(TYPES).slice(0,n).includes(s.category))};');
  for(const layout of ['fixed','sequential']){
   ctx.layout=layout;const result=run("build(smaller,output,{},true,n+' '+layout,{layout})");tree(result.rack);
   assert.equal(result.pads.length,n);assert.equal(Number(run("find(r,'GroupDevicePreset/Device/DrumGroupDevice/NumVisibleMacroControls').attrs.Value")),n);
   assert.equal(run("all(r,'MultiSamplePart').length"),n);
   for(let i=0;i<n;i++)assert.equal(result.pads[i].note,layout==='sequential'?36+i:run('TYPES')[result.pads[i].type][1]);
   for(const sp of run("all(r,'MultiSampler')")){ctx.sp=sp;assert.equal(run("find(sp,'VolumeAndPan/Volume/Manual').attrs.Value"),'-12');assert.equal(run("find(sp,'VolumeAndPan/VolumeVelScale/Manual').attrs.Value"),'0.35');}
   // Every pad has its own editable rack, with selectors routed through macro 0.
   for(const pad of run("find(r,'GroupDevicePreset/BranchPresets').children")){
    ctx.pad=pad;const inner=run("find(pad,'DevicePresets/GroupDevicePreset')");assert(inner,'Pad Sampler must be wrapped');ctx.inner=inner;
    assert.equal(run("find(inner,'Device/InstrumentGroupDevice/NumVisibleMacroControls').attrs.Value"),'8');
    const names=Array.from({length:8},(_,i)=>{ctx.i=i;return run("find(inner,'Device/InstrumentGroupDevice/MacroDisplayNames.'+i).attrs.Value");});
    assert.deepEqual(names,['Sample Select','Attack','Decay','Sustain','Release','Tune','Level','Velocity']);
    for(const sampler of run("all(inner,'MultiSampler')")){
     ctx.sp=sampler;
     const fields=['Player/SampleSelector','VolumeAndPan/Envelope/AttackTime','VolumeAndPan/Envelope/DecayTime','VolumeAndPan/Envelope/SustainLevel','VolumeAndPan/Envelope/ReleaseTime','Pitch/TransposeKey','VolumeAndPan/Volume','VolumeAndPan/VolumeVelScale'];
     fields.forEach((field,i)=>{ctx.field=field;assert.equal(Number(run("find(sp,field+'/KeyMidi/NoteOrController').attrs.Value")),i);});
     assert.equal(run("find(sp,'VolumeAndPan/Envelope/AttackTime/Manual').attrs.Value"),'0.1');
     assert.equal(run("find(sp,'VolumeAndPan/Envelope/ReleaseTime/Manual').attrs.Value"),'60000');
    }
   }
   for(const part of run("all(r,'MultiSamplePart')")){ctx.part=part;const gain=Number(run("find(part,'Volume').attrs.Value"));assert(Math.abs(20*Math.log10(gain))<1e-9);assert(Math.abs(20*Math.log10(gain*Math.pow(10,-12/20))+12)<1e-9);}
  }
 }
 // Odd category counts must not create partial native macro columns.
 for(const n of [3,5,7,9,11,13,15,16]){
  ctx.n=n;const result=run("build({...plan,samples:plan.samples.slice(0,n)},output,{},false,'Layout '+n)");tree(result.rack);
  const slots=n<=8?Math.ceil(n/2)*2:n<=12?12:16;
  assert.equal(Number(run("find(r,'GroupDevicePreset/Device/DrumGroupDevice/NumVisibleMacroControls').attrs.Value")),slots);
  assert.equal(result.pads.length,n);
  for(let i=0;i<n;i++){ctx.i=i;assert(run("find(r,'GroupDevicePreset/Device/DrumGroupDevice/MacroDisplayNames.'+i).attrs.Value").endsWith(' Select'));}
 }
 // A large category still gets exactly one outer macro; Bank stays inside the pad.
 run("var bankPlan={...plan,samples:Array(129).fill({...plan.samples[0],category:'kick'})};");
 const bank=run("build(bankPlan,output,{},false,'Bank test')");tree(bank.rack);
 assert.equal(run("find(r,'GroupDevicePreset/Device/DrumGroupDevice/NumVisibleMacroControls').attrs.Value"),'1');
 assert.equal(run("all(r,'MultiSampler').length"),2);
 assert.equal(run("find(r,'GroupDevicePreset/BranchPresets').children[0].children.find(c=>c.tag==='DevicePresets').children[0].children.find(c=>c.tag==='Device').children[0].children.find(c=>c.tag==='NumVisibleMacroControls').attrs.Value"),'12');
 for(const inner of run("all(r,'InstrumentGroupDevice')")){ctx.inner=inner;assert.equal(run("find(inner,'ChainSelector/KeyMidi/NoteOrController').attrs.Value"),'8');}

 const outer=run("find(r,'GroupDevicePreset/Device/DrumGroupDevice')");assert.equal(outer.children.find(x=>x.tag==='MacroDisplayNames.1').attrs.Value,'Macro 2');
 assert(p.boxes.some(x=>x.box.id==='sequential'&&x.box.maxclass==='live.text'&&x.box.mode===1&&x.box.parameter_enable===1));
 console.log('Wrapped pad controls and updated defaults passed: 4/12 pads, sequential/fixed MIDI maps, -12 dB Sampler + 0 dB layers, one outer selector per pad including banked categories.');
}finally{fs.rmSync(home,{recursive:true,force:true});}
