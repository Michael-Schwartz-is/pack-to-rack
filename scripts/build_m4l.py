"""Build a local, unfrozen Max for Live package using the stock AMXD container."""
from pathlib import Path
import json, shutil, struct
BASE=Path(__file__).resolve().parents[1]
OUT=BASE/'m4l'/'Pack to Rack'
OUT.mkdir(parents=True,exist_ok=True)
engine=OUT/'engine';engine.mkdir(exist_ok=True)
shutil.copy2(BASE/'rack.py',engine/'rack.py')
shutil.copytree(BASE/'templates',engine/'templates',dirs_exist_ok=True)
for name in ['pack_to_rack_worker.js','pack_to_rack_live.js']:shutil.copy2(BASE/'m4l'/name,OUT/name)
stock=Path('/Applications/Ableton Live 12 Suite.app/Contents/App-Resources/Misc/Max Devices/Max MIDI Effect.amxd').read_bytes()
p=json.loads(stock[32:].rstrip(b'\0'))['patcher']
p.update(title='Pack to Rack',openinpresentation=1,devicewidth=480,rect=[0,0,800,600],openrect=[0,0,480,169],bgcolor=[.12,.13,.11,1],boxes=[],lines=[],dependency_cache=[])
p['project']['autoorganize']=0
boxes=p['boxes'];lines=p['lines']
def box(id,kind,text=None,xy=(0,0,100,20),present=None,**kwargs):
 b={'id':id,'maxclass':kind,'patching_rect':list(xy),**kwargs}
 if text is not None:b['text']=text
 if present is not None:b.update(presentation=1,presentation_rect=list(present))
 boxes.append({'box':b})
def wire(a,b,out=0,inp=0):lines.append({'patchline':{'source':[a,out],'destination':[b,inp]}})
box('midiin','newobj','midiin',xy=(20,300,50,20));box('midiout','newobj','midiout',xy=(20,350,50,20));wire('midiin','midiout')
box('title','comment','PACK → RACK',present=(14,8,300,22),fontsize=17,fontface=1,textcolor=[.85,.94,.51,1])
box('subtitle','comment','Sample pack → Sampler selector Drum Rack',present=(14,32,440,18),fontsize=11,textcolor=[.7,.73,.66,1])
button={'mode':0,'parameter_enable':1,'parameter_mappable':0,'numinlets':1,'numoutlets':2,'outlettype':['int',''],'bgcolor':[.22,.26,.17,1],'bgoncolor':[.85,.94,.51,1],'textcolor':[.95,.96,.90,1],'fontsize':12}
box('choose','live.text','Choose pack…',present=(14,58,132,28),texton='Choose pack…',varname='choose_pack',saved_attribute_attributes={'valueof':{'parameter_longname':'Choose pack','parameter_shortname':'Choose pack','parameter_type':2,'parameter_enum':['Idle','Choose']}},**button)
box('build','live.text','Build Rack',present=(156,58,116,28),texton='Build Rack',varname='build_rack',saved_attribute_attributes={'valueof':{'parameter_longname':'Build Rack','parameter_shortname':'Build Rack','parameter_type':2,'parameter_enum':['Idle','Build']}},**button)
box('copy','live.text','Reference originals',present=(282,58,184,28),texton='Copy samples ✓',varname='copy_samples',mode=1,numinlets=1,numoutlets=2,outlettype=['int',''],parameter_enable=1,saved_attribute_attributes={'valueof':{'parameter_longname':'Copy samples','parameter_shortname':'Copy samples','parameter_type':2,'parameter_enum':['Reference originals','Copy samples'],'parameter_initial_enable':1,'parameter_initial':[1]}},fontsize=11)
box('folderlabel','comment','No folder chosen',present=(14,92,452,18),varname='pack_folder_label',ignoreclick=1,fontsize=10,textcolor=[.7,.73,.66,1])
box('statuslabel','comment','Starting converter…',present=(14,114,452,44),varname='pack_status_label',fontsize=11,textcolor=[.91,.93,.84,1])
box('drop','dropfile',present=(14,92,452,18),xy=(320,310,110,70),numinlets=1,numoutlets=2,types=['fold']);box('choose_sel','newobj','t b',xy=(120,200,50,20));box('build_sel','newobj','t b',xy=(180,200,50,20));box('dialog','newobj','opendialog fold',xy=(120,250,100,20));box('folder_pre','newobj','prepend folder',xy=(220,380,100,20));box('copy_pre','newobj','prepend copy',xy=(340,230,100,20));box('build_msg','message','build',xy=(180,250,50,20))
box('worker','newobj','node.script pack_to_rack_worker.js @autostart 1 @defer 1',xy=(120,420,350,20));box('route','newobj','route status folder built active',xy=(120,460,190,20));box('setstatus','newobj','prepend set',xy=(120,500,90,20));box('setfolder','newobj','prepend set',xy=(220,500,90,20));box('builtpre','newobj','prepend built',xy=(320,500,90,20));box('livejs','newobj','js pack_to_rack_live.js',xy=(320,540,160,20));box('uistatus','newobj','route status',xy=(500,540,90,20));box('active','newobj','prepend active',xy=(530,480,90,20));box('loadcopy','newobj','loadmess 1',xy=(430,230,90,20))
wire('choose','choose_sel');wire('choose_sel','dialog');wire('dialog','folder_pre');wire('drop','folder_pre');wire('folder_pre','worker');wire('copy','copy_pre');wire('copy_pre','worker');wire('loadcopy','copy');wire('build','build_sel');wire('build_sel','build_msg');wire('build_msg','worker');wire('worker','route');wire('route','setstatus',0);wire('setstatus','statuslabel');wire('route','setfolder',1);wire('setfolder','folderlabel');wire('route','builtpre',2);wire('builtpre','livejs');wire('livejs','worker',0);wire('livejs','uistatus',1);wire('uistatus','setstatus');wire('route','active',3);wire('active','choose');wire('active','build')
for name,typ in [('pack_to_rack_worker.js','TEXT'),('pack_to_rack_live.js','TEXT')]:p['dependency_cache'].append({'name':name,'bootpath':str(OUT),'patcherrelativepath':'.','type':typ,'implicit':1})
data=(json.dumps({'patcher':p},indent=2,ensure_ascii=False)+'\n').encode()+b'\0'
(OUT/'Pack to Rack.maxpat').write_bytes(data.rstrip(b'\0'))
(OUT/'Pack to Rack.amxd').write_bytes(stock[:28]+struct.pack('<I',len(data))+data)
print(OUT/'Pack to Rack.amxd')
