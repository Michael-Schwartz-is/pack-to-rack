// Exercise the real worker and Python engine without requiring Max to be open.
const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),home=fs.mkdtempSync(path.join(os.tmpdir(),'rack-m4l-'));
const handlers={},events=[];
const mock={addHandler:(name,fn)=>handlers[name]=fn,outlet:(...args)=>events.push(args)};
const dir=path.join(root,'m4l','Pack to Rack');
vm.runInNewContext(fs.readFileSync(path.join(dir,'pack_to_rack_worker.js'),'utf8'),{
 require:name=>name==='max-api'?mock:name==='os'?{homedir:()=>home}:require(name),__dirname:dir,process,
});
(async()=>{
 try{
  await handlers.build();assert.match(events.at(-1)[1],/Choose/);
  await handlers.folder(path.join(root,'examples','Demo Pack'));
  assert(events.some(e=>e[0]==='status'&&e[1].includes('37 sounds')));
  await handlers.build();const event=events.findLast(e=>e[0]==='built');assert(event);
  assert(fs.existsSync(event[1]));
  const manifest=JSON.parse(fs.readFileSync(path.join(path.dirname(event[1]),'manifest.json')));
  assert.equal(manifest.pads.length,3);assert.equal(manifest.pads.reduce((n,p)=>n+p.samples.length,0),37);
  await handlers.folder('/nonexistent/sample-pack');assert.match(events.at(-2)[1],/Error:/);
  await handlers.build();assert.match(events.at(-1)[1],/Choose/);
  console.log('M4L worker: folder scan, export, paths, counts and error handling passed.');
 }finally{fs.rmSync(home,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
