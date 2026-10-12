// Live reports a count, not a zero-based index. Exercise the embedded loader.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const p=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/Pack 2 Rack.amxd')).subarray(32).toString().replace(/\0$/,'')).patcher;
const code=p.boxes.find(x=>x.box.id==='livejs').box.code;
for(const start of [4,3,5]){
 let count=start,calls=[],messages=[],scheduled;
 const device={get:key=>key==='class_name'?['DrumGroupDevice']:key==='view'?['id',3]:key==='visible_macro_count'?[count]:key==='visible_drum_pads'?Array.from({length:16},(_,i)=>['id',i]).flat():[],call:m=>{calls.push(m);count+=m==='add_macro'?1:-1;}};
 function LiveAPI(p){if(p==='id 2')return device;if(p==='id 3')return {get:()=>[9]};return {get:()=>['id',2]};}
 const ctx=vm.createContext({LiveAPI,outlet:(...m)=>messages.push(m)});vm.runInContext(code,ctx);ctx.ownedTrack=1;ctx.expectedPads=3;ctx.loadTask={schedule:()=>{scheduled=true;}};
 for(let n=0;n<5;n++){scheduled=false;ctx.checkloaded();if(!scheduled)break;}
 assert.equal(count,4);assert.deepEqual(calls,start===4?[]:start===3?['add_macro']:['remove_macro']);
 assert(messages.some(m=>m[1]==='verified_macros'&&m[2]===4&&m[3]===4));
}
console.log('Live loader: exact counts preserved, missing knob added, surplus knob removed; reports real count.');
// Live's preset opener owns track creation; the loader must only find that track.
{
 let opened=false,available=false,scheduled=[],messages=[],changes=[];
 const song={get:key=>key==='tracks'?(opened?['id',10,'id',20,'id',30]:['id',10]):[],call:()=>{throw Error('Loader must not create a track');}};
 const target={get:key=>key==='devices'&&available?['id',2]:[],set:(...a)=>changes.push(['target',...a])};
 const other={get:key=>key==='devices'?['id',4]:[],set:()=>{throw Error('Unrelated track must remain untouched');}};
 const rack={get:key=>({class_name:['DrumGroupDevice'],name:['Test Kit'],view:['id',3],visible_macro_count:[4],visible_drum_pads:Array.from({length:16},(_,i)=>['id',i]).flat()}[key]||[])};
 function LiveAPI(p){return p==='live_set'?song:p==='live_set view'?{set:(...a)=>changes.push(['view',...a])}:p==='id 20'?target:p==='id 30'?other:p==='id 2'?rack:p==='id 3'?{get:()=>[9]}:p==='id 4'?{get:key=>key==='class_name'?['DrumGroupDevice']:['Other Kit']}:{get:()=>[]};}
 function Task(fn){this.schedule=()=>scheduled.push(fn);this.cancel=()=>{};}
 const ctx=vm.createContext({LiveAPI,Task,outlet:(...m)=>{messages.push(m);if(m[1]==='load')opened=true;}});
 vm.runInContext(code,ctx);ctx.built('/tmp/Test Kit.adg','Test Kit',3);
 assert.equal(messages.filter(m=>m[1]==='load').length,1);
 scheduled.shift()();assert.equal(ctx.ownedTrack,0);assert.equal(scheduled.length,1);
 available=true;scheduled.shift()();assert.equal(ctx.ownedTrack,20);
 assert.deepEqual(changes,[['target','name','Test Kit'],['view','selected_track','id',20]]);
 assert(messages.some(m=>m[1]==='verified_macros'));
 console.log('Preset load regression passed: no empty track created; discovers and selects the new rack track, ignores unrelated racks.');
}
