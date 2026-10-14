// Runs inside Max's JS environment, where LiveAPI is available.
autowatch = 1;
inlets = 1;
outlets = 2; // 0: worker commands; 1: display messages
var loadTask = null;
var ownedTrack = 0;
var previousTracks = [];
var expectedName = "";
var attempts = 0;
var expectedPads = 0;
var savedFile = "";
function saved(message){ui(message+" Drag this preset into Live: "+savedFile);}
function ui(s){outlet(1,'status',s);}
function built(file,name,padCount,autoLoad){
 try{
  if(loadTask){loadTask.cancel();loadTask=null;}
  savedFile=String(file);
  if(Number(autoLoad)===0){saved("Rack saved.");return;}
  var song=new LiveAPI('live_set');
  var ids=song.get('tracks');
  previousTracks=[];
  for(var i=1;i<ids.length;i+=2)previousTracks.push(Number(ids[i]));
  ownedTrack=0;
  expectedName=String(name);
  attempts=0;
  expectedPads=Number(padCount)||0;
  // Opening an ADG creates its own MIDI track. Do not pre-create an empty one.
  outlet(0,'load',file);
  loadTask=new Task(checkloaded,this);loadTask.schedule(400);
 }catch(e){saved('Rack saved. Automatic loading unavailable: '+e.message);}
}
function checkloaded(){
 try{
  if(!ownedTrack){
   var tracks=new LiveAPI('live_set').get('tracks');
   for(var t=1;t<tracks.length;t+=2){
    var trackId=Number(tracks[t]);
    if(previousTracks.indexOf(trackId)!==-1)continue;
    var candidate=new LiveAPI('id '+trackId);
    var devices=candidate.get('devices');
    for(var d=1;d<devices.length;d+=2){
     var rack=new LiveAPI('id '+devices[d]);
     if(String(rack.get('class_name'))==='DrumGroupDevice'&&String(rack.get('name'))===expectedName){
      ownedTrack=trackId;
      candidate.set('name',expectedName);
      new LiveAPI('live_set view').set('selected_track','id',ownedTrack);
      break;
     }
    }
    if(ownedTrack)break;
   }
   if(!ownedTrack){
    if(++attempts<20){loadTask.schedule(250);return;}
    saved('Rack saved.');return;
   }
  }
  var track=new LiveAPI('id '+ownedTrack);var ids=track.get('devices');
  for(var i=1;i<ids.length;i+=2){
   var device=new LiveAPI('id '+ids[i]);
   if(String(device.get('class_name'))==='DrumGroupDevice'){
    var viewIds=device.get('view');
    var rackView=new LiveAPI('id '+Number(viewIds[viewIds.length-1]));
    if(Number(rackView.get('drum_pads_scroll_position')[0])!==9&&attempts<32){
     attempts++;rackView.set('drum_pads_scroll_position',9);
     loadTask.schedule(100);return;
    }
    var selectors=expectedPads||device.get('chains').length/2;
    var wanted=selectors<=2?Math.max(1,selectors):selectors<=8?Math.ceil(selectors/2)*2:selectors<=12?12:16;
    // Live reports the number of knobs directly.
    var visible=Number(device.get('visible_macro_count')[0]);
    if(visible!==wanted&&attempts<32){
     attempts++;
     device.call(visible>wanted?'remove_macro':'add_macro');
     // Live applies this asynchronously. Verify it on the next scheduler turn.
     loadTask.schedule(100);return;
    }
    var gridPads=device.get('visible_drum_pads');
    var gridCount=gridPads.length/2;
    outlet(0,'verified_macros',wanted,visible,gridCount);
    if(visible!==wanted){ui('Rack loaded; macro display count could not be corrected.');return;}
    ui('Ready: '+selectors+' folders / '+visible+' macro slots.');return;
   }
  }
  if(++attempts<20){loadTask.schedule(250);return;}
  saved('Rack saved.');
 }catch(e){saved('Rack saved; loading could not be verified.');}
}
