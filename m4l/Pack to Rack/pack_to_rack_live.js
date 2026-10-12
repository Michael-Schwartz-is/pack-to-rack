// Runs inside Max's JS environment, where LiveAPI is available.
autowatch = 1;
inlets = 1;
outlets = 2; // 0: worker commands; 1: display messages
var loadTask = null;
var ownedTrack = 0;
var attempts = 0;
function ui(s){outlet(1,'status',s);}
function built(file,name){
 try{
  if(loadTask){loadTask.cancel();loadTask=null;}
  var song=new LiveAPI('live_set');
  song.call('create_midi_track',-1);
  var ids=song.get('tracks');
  ownedTrack=Number(ids[ids.length-1]);
  if(!ownedTrack)throw new Error('Live did not create a target track.');
  var target=new LiveAPI('id '+ownedTrack);
  target.set('name',name);
  var view=new LiveAPI('live_set view');
  view.set('selected_track','id',ownedTrack);
  attempts=0;
  loadTask=new Task(function(){
   try{
    var selected=new LiveAPI('live_set view').get('selected_track');
    if(Number(selected[selected.length-1])!==ownedTrack){
     if(++attempts<10){loadTask.schedule(100);return;}
     ui('Rack saved. Select its preset in User Library → Drum Rack → Pack to Rack.');return;
    }
    outlet(0,'load',file);
    attempts=0;
    loadTask=new Task(checkloaded,this);loadTask.schedule(400);
   }catch(e){ui('Rack saved. Live could not select the new track: '+e.message);}
  },this);
  loadTask.schedule(150);
 }catch(e){ui('Rack saved. Automatic loading unavailable: '+e.message);}
}
function checkloaded(){
 try{
  var track=new LiveAPI('id '+ownedTrack);var ids=track.get('devices');
  for(var i=1;i<ids.length;i+=2){
   var device=new LiveAPI('id '+ids[i]);
   if(String(device.get('class_name'))==='DrumGroupDevice'){
    ui('Ready on a new MIDI track. Program a beat and turn the Select knobs.');return;
   }
  }
  if(++attempts<20){loadTask.schedule(250);return;}
  ui('Rack saved. Load it from User Library → Drum Rack → Pack to Rack.');
 }catch(e){ui('Rack saved; loading could not be verified. Use its User Library preset.');}
}
