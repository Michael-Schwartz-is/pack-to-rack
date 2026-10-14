const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),p=JSON.parse(fs.readFileSync(path.join(root,'dist','Pack 2 Rack.amxd')).subarray(32).toString().replace(/\0$/,'')).patcher;
const home=fs.mkdtempSync(path.join(os.tmpdir(),'rack-layout-')),handlers={},events=[];
const ctx=vm.createContext({require:n=>n==='max-api'?{addHandler:(k,f)=>handlers[k]=f,outlet:(...a)=>events.push(a),post:()=>{}}:n==='os'?{homedir:()=>home}:require(n),Buffer,process,setImmediate});
vm.runInContext(p.boxes.find(x=>x.box.id==='worker').box.code,ctx);
(async()=>{
 try{
  await handlers.folder(path.join(root,'examples','Demo Pack'));
  assert(events.some(e=>e[0]==='ui'&&e[2]==='send'&&e[3]==='rack_name'&&e[4]==='set'&&e[5]==='p2r_Demo Pack'));
  await handlers.build();assert.equal(events.findLast(e=>e[0]==='built')[2],'p2r_Demo Pack');
  for(const sequential of [1,0]){
   handlers.name(...(sequential?['My','Custom','Kit']:['  My/Kit:  ']));
   await handlers.build();const f=events.findLast(e=>e[0]==='built');assert(f);assert.equal(f[3],3);
   assert.equal(f[2],sequential?'My Custom Kit':'My-Kit-');assert.equal(path.basename(f[1]),f[2]+'.adg');
   const mpath=path.join(path.dirname(f[1]),'manifest.json'),m=JSON.parse(fs.readFileSync(mpath));
   assert.equal(m.layout,'sequential');assert.deepEqual(m.pads.map(p=>p.note),[36,37,38]);assert.deepEqual(m.pads.map(p=>p.name),['Hi-Hats','Kicks','Snares']);
   handlers.verified_macros(3,3);const verified=JSON.parse(fs.readFileSync(mpath));assert.equal(verified.live_visible_macro_count,3);
  }
  handlers.name('   ');await handlers.build();assert.equal(events.findLast(e=>e[0]==='built')[2],'p2r_Demo Pack');
  console.log('Embedded worker: folder labels and consecutive pads preserved; rack naming and verification metadata persisted.');
 }finally{fs.rmSync(home,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
