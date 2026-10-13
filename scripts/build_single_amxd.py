"""Embed converter code, Live API code and templates in one AMXD; no runtime files."""
from pathlib import Path
import json,struct,gzip,base64
BASE=Path(__file__).resolve().parents[1]
source=BASE/'m4l/Pack to Rack/Pack to Rack.amxd'
stock=source.read_bytes();p=json.loads(stock[32:].rstrip(b'\0'))['patcher']
templates={}
for key,name in [('drum','drum-rack.adg'),('instrument','instrument-rack.adg')]:templates[key]=base64.b64encode((BASE/'templates'/name).read_bytes()).decode()
templates['sample']=base64.b64encode(gzip.compress((BASE/'templates/sample-part.xml').read_bytes(),mtime=0)).decode()
license=(BASE/'templates/LICENSE').read_text()
code='/* Bundled Ableton templates: '+license.replace('*/','* /')+' */\nconst TEMPLATES='+json.dumps(templates)+';\n'+(BASE/'m4l/native/engine.cjs').read_text()+'\n'+(BASE/'m4l/native/worker.cjs').read_text()
for wrapped in p['boxes']:
 b=wrapped['box']
 if b['id']=='worker':
  b.pop('text',None);b.update(maxclass='node.codebox',code=code,numinlets=1,numoutlets=2,outlettype=['',''],patching_rect=[120,420,600,300],saved_object_attributes={'autostart':1,'defer':1,'watch':0})
 if b['id']=='livejs':
  b.pop('text',None);b.update(maxclass='v8.codebox',code=(BASE/'m4l/pack_to_rack_live.js').read_text(),filename='none',numinlets=1,numoutlets=2,outlettype=['',''],patching_rect=[320,760,500,240],saved_object_attributes={'parameter_enable':0})
 if b['id']=='statuslabel':b['text']='Starting embedded converter…'
# Fixed geometry shared by both the drop and ready states.
ACTION_RECT=[12,48,240,64]
p.update(devicewidth=420,openrect=[0,0,420,169],bgcolor=[.16,.16,.16,1])
boxes={x['box']['id']:x['box'] for x in p['boxes']}
for b in boxes.values():
 if b.get('maxclass')=='comment': b.update(fontname='Arial',textcolor=[.86,.86,.86,1],ignoreclick=1)
boxes['title'].update(presentation=0)
boxes['subtitle'].update(presentation=0)
boxes['folderlabel'].update(presentation=0)
boxes['statuslabel'].update(varname='statuslabel',text='',fontsize=10,presentation_rect=[112,138,296,20],textcolor=[.68,.68,.68,1])
boxes['choose'].update(hidden=1)
boxes['choose'].update(activebgcolor=[.25,.25,.25,1],activebgoncolor=[.34,.34,.34,1],activetextcolor=[.68,.68,.68,1],activetextoncolor=[.86,.86,.86,1],rounded=.05,bordercolor=[.39,.39,.39,1],text='Browse…',texton='Browse…',fontsize=10,textjustification=1,presentation_rect=[12,136,92,20],bgcolor=[.25,.25,.25,1],bgoncolor=[.24,.24,.24,1],textcolor=[.68,.68,.68,1])
boxes['build'].update(text='Build Rack',texton='Build Rack',activebgcolor=[1,.65,.32,0],activebgoncolor=[1,.75,.48,.12],activetextcolor=[.12,.12,.12,1],activetextoncolor=[.12,.12,.12,1],bordercolor=[0,0,0,0],focusbordercolor=[0,0,0,0],rounded=0,presentation=1,hidden=1,presentation_rect=ACTION_RECT,fontsize=14,bgcolor=[1,.65,.32,0],bgoncolor=[1,.75,.48,.12],textcolor=[.12,.12,.12,1],textoncolor=[.12,.12,.12,1])
boxes['drop'].update(varname='drop_target',presentation_rect=ACTION_RECT,border=0,bordercolor=[.37,.37,.37,0],rounded=0,ignoreclick=1)
copy=boxes['copy']
for key in ['text','texton','mode','fontsize']:copy.pop(key,None)
copy_help=('ON\nCopy samples beside the exported rack. Your original pack stays unchanged.\n\n'
           'OFF\nUse the original files without copying. Keep them in their original location.')
sequential_help=('ON\nPlace drum types on consecutive pads: C1, C#1, D1…\n\n'
                 'OFF\nUse fixed notes for each drum type: kick on C1, snare on D1…\n\n'
                 'Each pad has a selector to choose its sample.')
copy.update(maxclass='live.text',appearance=1,mode=1,text='Copy samples',texton='Copy samples',fontsize=11,numoutlets=2,outlettype=['int',''],presentation_rect=[274,56,134,20],annotation_name='Copy samples',annotation=copy_help,labeltextcolor=[.86,.86,.86,1])
boxes['route'].update(text='route status folder built active ui',numoutlets=6,outlettype=['']*6)
def add(id,kind,rect=None,**attrs):
 b={'id':id,'maxclass':kind,'patching_rect':[600,400,150,20],**attrs}
 if rect:b.update(presentation=1,presentation_rect=rect)
 p['boxes'].append({'box':b})
def wire(a,b,out=0):p['lines'].append({'patchline':{'source':[a,out],'destination':[b,0]}})
add('build_background','panel',ACTION_RECT,varname='build_background',hidden=1,bgcolor=[1,.65,.32,1],border=1,bordercolor=[1,.65,.32,1],rounded=0,ignoreclick=1)
add('rack_name_label','comment',[12,15,64,20],varname='rack_name_label',hidden=1,text='Pack name',fontsize=11,fontname='Arial',textcolor=[.68,.68,.68,1],ignoreclick=1)
add('rack_name','textedit',[78,14,330,20],varname='rack_name',hidden=1,readonly=1,text='',fontsize=12,fontname='Arial',textcolor=[.94,.94,.94,1],bgcolor=[.19,.20,.21,1],border=1,bordercolor=[.36,.38,.39,1],rounded=4,lines=1,wordwrap=0,keymode=1,bangmode=0,outputmode=1,nosymquotes=1,numinlets=1,numoutlets=3,outlettype=['','',''],annotation='Pack name — click to edit before building.')
add('name_route','newobj',text='route text')
add('name_pre','newobj',text='prepend name')
wire('rack_name','name_route');wire('name_route','name_pre');wire('name_pre','worker')
# Read the current text even when the user clicks Build without pressing Enter.
boxes['build_sel'].update(text='t b b',numoutlets=2,outlettype=['bang','bang'])
wire('build_sel','rack_name',1)
add('drop_background','panel',ACTION_RECT,varname='drop_background',bgcolor=[.19,.20,.21,1],border=1,bordercolor=[.36,.38,.39,1],rounded=0,ignoreclick=1)
# Background first in draw order; dropfile remains the hit target.
p['boxes'].insert(0,p['boxes'].pop())
add('drop_hint','live.text',ACTION_RECT,varname='drop_hint',text='',texton='',bgcolor=[.23,.25,.26,0],bgoncolor=[.65,.72,.76,.12],activebgcolor=[.23,.25,.26,0],activebgoncolor=[.65,.72,.76,.12],bordercolor=[0,0,0,0],rounded=0,mode=0,parameter_enable=1,parameter_mappable=0,saved_attribute_attributes={'valueof':{'parameter_longname':'Choose sample folder','parameter_shortname':'Choose folder','parameter_type':2,'parameter_enum':['Idle','Choose']}},numinlets=1,numoutlets=2,outlettype=['int',''])
wire('drop_hint','choose_sel')
add('drop_title','comment',[74,65,167,21],varname='drop_title',text='Drop sample folder here',fontsize=12,fontname='Arial',textcolor=[.94,.94,.94,1],ignoreclick=1)
add('drop_caption','comment',[74,87,167,18],varname='drop_caption',text='or click to browse',fontsize=10,fontname='Arial',textcolor=[.64,.67,.69,1],ignoreclick=1)
# Native outline strokes keep the folder icon sharp and embedded in the AMXD.
drop_decorations=[]
for rect in [[30,69,13,2],[30,69,2,27],[41,69,2,7],[41,74,22,2],[61,74,2,22],[30,94,33,2]]:
 name='drop_icon' if not drop_decorations else 'drop_icon_stroke_'+str(len(drop_decorations))
 drop_decorations.append(name)
 add(name,'panel',rect,varname=name,bgcolor=[1,.70,.38,1],border=0,rounded=1,ignoreclick=1)
boxes['worker']['code']=boxes['worker']['code'].replace('const DROP_DECORATIONS=[];', 'const DROP_DECORATIONS='+json.dumps(drop_decorations)+';')
add('sequential','live.text',[274,85,134,20],appearance=1,mode=1,text='Sequential pads',texton='Sequential pads',fontsize=11,labeltextcolor=[.86,.86,.86,1],numinlets=1,numoutlets=2,outlettype=['int',''],parameter_enable=1,varname='sequential_pads',annotation_name='Sequential pads',annotation=sequential_help,saved_attribute_attributes={'valueof':{'parameter_longname':'Sequential pads','parameter_shortname':'Sequential','parameter_type':2,'parameter_enum':['Fixed map','Sequential'],'parameter_initial_enable':1,'parameter_initial':[0]}})
add('sequential_pre','newobj',text='prepend sequential')
add('sequential_init','newobj',text='loadmess 0')
add('uipatcher','newobj',text='thispatcher')
wire('sequential','sequential_pre');wire('sequential_pre','worker');wire('sequential_init','sequential');wire('route','uipatcher',4)
# Disable checkbox changes during conversion, along with the existing buttons.
wire('active','copy');wire('active','sequential');wire('active','drop_hint')
p['dependency_cache']=[]
p['appversion']={'major':9,'minor':1,'revision':4,'architecture':'arm64','modernui':1}
p['project']['contents']={'patchers':{}}
p['project']['searchpath']={}
p['project']['autoorganize']=0
raw=(json.dumps({'patcher':p},indent=2,ensure_ascii=False)+'\n').encode()+b'\0'
out=BASE/'dist/Pack 2 Rack.amxd';out.parent.mkdir(exist_ok=True);out.write_bytes(stock[:28]+struct.pack('<I',len(raw))+raw)
print(out, len(out.read_bytes()),'bytes; external dependency count:',len(p['dependency_cache']))
