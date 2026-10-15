// Test source and export dialogs with Windows and macOS path semantics.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const patch=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/Pack 2 Rack.amxd')).subarray(32).toString().replace(/\0$/,'')).patcher;
const code=patch.boxes.find(x=>x.box.id==='worker').box.code;
function fixture(platform,exists=()=>true){
 const events=[],handlers={},scanned=[],outputs=[],paths=platform==='win32'?path.win32:path.posix;
 const fakeFs={existsSync:exists,readdirSync:()=>{throw Error('Must not discover a User Library');}};
 const context=vm.createContext({require:n=>n==='max-api'?{post:()=>{},outlet:(...a)=>events.push(a),addHandler:(n,f)=>handlers[n]=f}:n==='path'?paths:n==='fs'?fakeFs:n==='child_process'?{execFile:()=>{throw Error('No external application should open during this test');}}:require(n),process:{platform,env:{}},Buffer,setImmediate,console});
 vm.runInContext(code,context);
 context.scan=p=>{scanned.push(p);return {samples:[{category:'folder:Kicks'}],skipped:[],name:'My Kit',folder:p};};
 context.build=(plan,output)=>{outputs.push(output);return {rack:paths.join(output,'p2r_My Kit','p2r_My Kit.adg'),pads:[{}],samples:1};};
 vm.runInContext('scan=globalThis.scan;build=globalThis.build;',context);
 return {events,handlers,scanned,outputs,context,normalize:p=>{context.input=p;return vm.runInContext('normalize(input)',context);}};
}
(async()=>{
 const f=fixture('win32');
 for(const p of ['E:/Samples_Type','C:/Temp/My Kick Folder','D:\\Packs\\My Kit','\\\\server\\share\\Kit'])assert.equal(f.normalize(p),p);
 await f.handlers.folder('E:/Samples_Type');
 for(const dest of ['D:/Dropbox/My Racks','F:\\Drums & Kits','\\\\studio-server\\racks']){
  const prior=f.outputs.length;
  await f.handlers.build();assert.equal(f.outputs.length,prior);assert.equal(f.events.at(-1)[0],'choose_destination');
  await f.handlers.export(dest);assert.equal(f.outputs.at(-1),dest);
  assert.equal(f.scanned.at(-1),'E:/Samples_Type');
 }
 await f.handlers.build();f.handlers.cancel_export();const before=f.outputs.length;
 await f.handlers.export('D:/must-not-export');assert.equal(f.outputs.length,before);
 await f.handlers.build();await f.handlers.export('relative/folder');assert.equal(f.outputs.length,before);
 assert.match(f.events.findLast(e=>e[0]==='status')[1],/full folder path/);
 const built=f.events.findLast(e=>e[0]==='built');assert.equal(built[4],0);
 await f.handlers.load(built[1]);assert(f.events.findLast(e=>e[0]==='status')[1].includes(built[1]));
 const mac=fixture('darwin',p=>['/Volumes/Sample SSD','/Volumes/Backup Drive','/Users/test/Kit'].includes(p));
 assert.equal(mac.normalize('Sample SSD:/Kicks'),'/Volumes/Sample SSD/Kicks');
 assert.equal(mac.normalize('Macintosh HD:/Users/test/Kit'),'/Users/test/Kit');
 assert.equal(mac.normalize('/Volumes/Sample SSD/Kicks'),'/Volumes/Sample SSD/Kicks');
 await mac.handlers.folder('Sample SSD:/Kicks');await mac.handlers.build();await mac.handlers.export('Backup Drive:/Exports');
 assert.equal(mac.scanned.at(-1),'/Volumes/Sample SSD/Kicks');assert.equal(mac.outputs.at(-1),'/Volumes/Backup Drive/Exports');
 console.log('Dialog export: selection every build, cancellation, invalid paths, Windows drives/UNC and macOS external source/export volumes passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
