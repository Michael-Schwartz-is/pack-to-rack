// Run the actual code stored inside the deliverable, without sidecar files or Python.
const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),assert=require('assert'),zlib=require('zlib');
const root=path.resolve(__dirname,'..'),raw=fs.readFileSync(path.join(root,'dist','Pack 2 Rack.amxd'));
assert.equal(raw.readUInt32LE(28),raw.length-32);
const patch=JSON.parse(raw.subarray(32).toString().replace(/\0$/,'')).patcher;
assert.deepEqual(patch.dependency_cache,[]);
const code=patch.boxes.find(x=>x.box.id==='worker').box.code;
assert(!/python|rack\.py|node_modules|require\(['"]\./i.test(code),'External runtime dependency found');
const home=fs.mkdtempSync(path.join(os.tmpdir(),'rack-single-')),events=[],handlers={};
const fakeMax={post:()=>{},addHandler:(k,f)=>handlers[k]=f,outlet:(...a)=>events.push(a)};
const context=vm.createContext({require:n=>n==='max-api'?fakeMax:n==='os'?{homedir:()=>home}:n==='child_process'?{execFile:()=>{throw Error('No external process allowed in this test');}}:require(n),Buffer,process,setImmediate,console});
vm.runInContext(code,context);
function run(s){return vm.runInContext(s,context);}
assert.equal(run('VERSION'),fs.readFileSync(path.join(root,'VERSION'),'utf8').trim());
assert(events.some(e=>e[0]==='status'&&e[1].startsWith('v'+run('VERSION')+' ·')));
(async()=>{
 try{
  await handlers.folder(path.join(root,'examples','Demo Pack'));await handlers.build();
  let built=events.findLast(e=>e[0]==='built');assert(built&&fs.existsSync(built[1]));
  let m=JSON.parse(fs.readFileSync(path.join(path.dirname(built[1]),'manifest.json')));
  assert.equal(m.pads.length,3);assert.equal(m.pads.reduce((n,p)=>n+p.samples.length,0),37);
  const pack=path.join(home,'Bank & XML Pack'),kick=path.join(pack,'Kicks');fs.mkdirSync(kick,{recursive:true});
  const wav=fs.readFileSync(path.join(root,'examples','Demo Pack','Kicks','Kick 01.wav'));
  for(let i=0;i<257;i++)fs.writeFileSync(path.join(kick,'kick <&> '+i+'.wav'),wav);
  await handlers.folder(pack);await handlers.build();built=events.findLast(e=>e[0]==='built');
  const xml=zlib.gunzipSync(fs.readFileSync(built[1])).toString();context.testXml=xml;
  const r=run('parseXml(testXml)');context.testRack=r;
  assert.equal(run("all(testRack,'DrumBranchPreset').length"),1);assert.equal(run("all(testRack,'MultiSampler').length"),3);assert.equal(run("all(testRack,'MultiSamplePart').length"),257);
  assert.equal(run("find(all(testRack,'DrumBranchPreset')[0],'ZoneSettings/ReceivingNote').attrs.Value"),'92');
  assert.equal(run("find(all(testRack,'MultiSamplePart')[0],'Name').attrs.Value"),'kick <&> 0');
  context.bankSamples=run("all(testRack,'MultiSamplePart')");
  for(const sampler of run("all(testRack,'MultiSampler')")){
   context.testSampler=sampler;const parts=run("find(testSampler,'Player/MultiSampleMap/SampleParts').children");
   for(let n=0;n<128;n++)assert.equal(parts.filter(p=>{const s=p.children.find(c=>c.tag==='SelectorRange');return Number(s.children.find(c=>c.tag==='Min').attrs.Value)<=n&&n<=Number(s.children.find(c=>c.tag==='Max').attrs.Value);}).length,1);
  }
  for(const part of context.bankSamples){const ref=part.children.find(c=>c.tag==='SampleRef').children.find(c=>c.tag==='FileRef');assert(fs.existsSync(ref.children.find(c=>c.tag==='Path').attrs.Value));}
  await handlers.build();assert.notEqual(events.findLast(e=>e[0]==='built')[1],built[1]);
  await handlers.folder('/nonexistent');await handlers.build();assert.match(events.at(-1)[1],/Choose/);
  console.log('Embedded AMXD: 37-sample kit, 257-sample banks, all selector positions, receive notes, XML escaping, copied paths, no overwrite, invalid input passed. No Python or sidecar loaded.');
 }finally{fs.rmSync(home,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
