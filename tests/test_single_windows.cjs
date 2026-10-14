// Exercise the delivered device with Windows path semantics and mocked Live settings.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const patch=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/Pack 2 Rack.amxd')).subarray(32).toString().replace(/\0$/,'')).patcher;
const code=patch.boxes.find(x=>x.box.id==='worker').box.code;
const home='C:\\Users\\Tester',prefs=path.win32.join(home,'AppData','Roaming','Ableton');
let config='',events=[],handlers={},scanned=[],outputs=[],preferencesRead=[];
const fakeFs={readdirSync:p=>{preferencesRead.push(p);return ['Live 12.4.6'];},existsSync:()=>true,statSync:()=>({mtimeMs:1}),readFileSync:()=>config};
const context=vm.createContext({require:n=>n==='max-api'?{post:()=>{},outlet:(...a)=>events.push(a),addHandler:(n,f)=>handlers[n]=f}:n==='path'?path.win32:n==='fs'?fakeFs:n==='os'?{homedir:()=>home}:n==='child_process'?{execFile:()=>{throw Error('Windows must use manual loading');}}:require(n),process:{platform:'win32',env:{}},Buffer,setImmediate,console});
vm.runInContext(code,context);
const run=s=>vm.runInContext(s,context);
for(const p of ['E:/Samples_Type','C:/Temp/My Kick Folder','D:\\Packs\\My Kit','\\\\server\\share\\Kit']){
 context.input=p;assert.equal(run('normalize(input)'),p);
}
context.input='Macintosh HD:/Users/test/Kit';assert.equal(run('normalize(input)'),'/Users/test/Kit');
assert.equal(run('userLibrary()'),path.win32.join(home,'Documents','Ableton','User Library'));
config='<Ableton><ContentLibrary><UserLibrary><LibraryProject><ProjectPath Value="E:/Music &amp; Sounds"/><ProjectName Value="Custom Library"/></LibraryProject></UserLibrary></ContentLibrary></Ableton>';
assert.equal(run('userLibrary()'),'E:\\Music & Sounds\\Custom Library');
assert.equal(run('outputDirectory()'),'E:\\Music & Sounds\\Custom Library\\Presets\\Instruments\\Drum Rack\\Pack to Rack');
assert(preferencesRead.every(p=>p===prefs));
// APPDATA can itself be redirected independently of samples and the User Library.
context.process.env.APPDATA='F:\\Settings\\Roaming';
run('userLibrary()');assert.equal(preferencesRead.at(-1),'F:\\Settings\\Roaming\\Ableton');
context.scan=p=>{scanned.push(p);return {samples:[{category:'kick'}],skipped:[],name:'My Kit',folder:p};};
context.build=(plan,output)=>{outputs.push(output);return {rack:path.win32.join(output,'p2r_My Kit','p2r_My Kit.adg'),pads:[{}],samples:1};};
run('scan=globalThis.scan;build=globalThis.build;');
(async()=>{
 await handlers.folder('E:/Samples_Type');await handlers.build();
 assert.deepEqual(scanned,['E:/Samples_Type','E:/Samples_Type']);
 assert.equal(outputs[0],run('outputDirectory()'));
 const built=events.findLast(e=>e[0]==='built');assert.equal(built[4],0);
 assert(events.some(e=>e.includes('annotation')&&e.at(-1).includes(built[1])));
 await handlers.load(built[1]);assert(events.at(-1)[1].includes(built[1]));
 // Re-read settings on every build, including custom network library locations.
 for(const libraryParent of ['F:\\Audio\\Libraries','\\\\studio-server\\sounds']){
  config='<Ableton><ContentLibrary><UserLibrary><LibraryProject><ProjectPath Value="'+libraryParent+'"/><ProjectName Value="My Library"/></LibraryProject></UserLibrary></ContentLibrary></Ableton>';
  await handlers.build();
  assert.equal(outputs.at(-1),path.win32.join(libraryParent,'My Library','Presets','Instruments','Drum Rack','Pack to Rack'));
  assert.equal(scanned.at(-1),'E:/Samples_Type');
 }
 for(const destination of ['D:/Dropbox/My Racks','F:\\Drums & Kits','\\\\studio-server\\racks']){
  handlers.destination(destination);await handlers.build();
  assert.equal(outputs.at(-1),destination,'Custom destination must be used exactly, without appending a User Library tree');
 }
 handlers.destination('my/racks');const prior=outputs.length;await handlers.build();
 assert.equal(outputs.length,prior);assert.match(events.findLast(e=>e[0]==='status')[1],/full folder path/);
 handlers.destination('User Library');assert.equal(run('outputDirectory()'),path.win32.join('\\\\studio-server\\sounds','My Library','Presets','Instruments','Drum Rack','Pack to Rack'));
 config='invalid settings';assert.equal(run('userLibrary()'),path.win32.join(home,'Documents','Ableton','User Library'));
 console.log('Windows embedded worker: drive/UNC paths, default/custom library, explicit destination override, invalid destination rejection and saved path passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
