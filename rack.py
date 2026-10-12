"""Sample pack → native Ableton Drum Rack. Python standard library only."""
from __future__ import annotations
import argparse
import copy
import gzip
import json
import math
import os
from pathlib import Path
import re
import shutil
import struct
import tempfile
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parent
# Fixed MIDI positions: common voices remain in the same place between packs.
TYPES = {
    'kick': ('Kick', 36, 9), 'snare': ('Snare', 38, 16),
    'clap': ('Clap', 39, 17), 'rim': ('Rim / Stick', 37, 18),
    'closed_hat': ('Closed Hat', 42, 26), 'open_hat': ('Open Hat', 46, 27),
    'hat': ('Hi-Hat', 44, 28), 'tom': ('Tom', 45, 32),
    'crash': ('Crash', 49, 45), 'ride': ('Ride', 51, 46),
    'cymbal': ('Cymbal', 50, 47), 'shaker': ('Shaker', 40, 35),
    'tambourine': ('Tambourine', 41, 36), 'perc': ('Percussion', 43, 38),
    'fx': ('FX / Foley', 47, 54), 'other': ('Other', 48, 60),
}
AUDIO = {'.wav', '.aif', '.aiff', '.flac'}
OTHER_AUDIO = {'.mp3', '.ogg', '.m4a', '.aac', '.wma'}


def words(text):
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
    text = re.sub(r'([a-zA-Z])([0-9])', r'\1 \2', text)
    return re.sub(r'[^a-z0-9]+', ' ', text.lower()).strip()


def detect(text):
    t = words(text)
    checks = [
        ('open_hat', r'\b(open(?:ed)?\s*(?:hi\s*)?hats?|ohh?|hho|hats?\s*open)\b'),
        ('closed_hat', r'\b(clos(?:ed|e)\s*(?:hi\s*)?hats?|chh?|hhc|hats?\s*closed|tight\s*hats?)\b'),
        ('kick', r'\b(kicks?|bd|bass\s*drums?)\b'),
        ('snare', r'\b(snares?|snr|sd)\b'),
        ('clap', r'\b(claps?|hand\s*claps?|cp)\b'),
        ('rim', r'\b(rims?|rimshots?|rim\s*shots?|side\s*sticks?|sidesticks?|sticks?)\b'),
        ('hat', r'\b(hats?|hi\s*hats?|hihats?|hh)\b'),
        ('tom', r'\b(toms?|tom\s*toms?)\b'),
        ('crash', r'\b(crash(?:es)?|crashes)\b'),
        ('ride', r'\b(rides?)\b'),
        ('cymbal', r'\b(cymbals?|cym|splash(?:es)?|china)\b'),
        ('shaker', r'\b(shakers?|shk|maracas?)\b'),
        ('tambourine', r'\b(tambourines?|tambs?)\b'),
        ('perc', r'\b(percs?|percussion|congas?|bongos?|cowbells?|claves?|timbales?|woodblocks?|triangles?|bells?|taikos?)\b'),
        ('fx', r'\b(fx|sfx|effects?|foley|impacts?|glitches?)\b'),
    ]
    return next((k for k, pattern in checks if re.search(pattern, t)), None)


def classify(relative: Path):
    # Nearest descriptive folder wins. Filename refines a generic hats/perc folder.
    name_type = detect(relative.stem)
    for folder in reversed(relative.parts[:-1]):
        if words(folder) in {'open', 'opened', 'closed', 'close'} and any(
            detect(p) == 'hat' for p in relative.parts[:-1]
        ):
            return 'open_hat' if words(folder) in {'open', 'opened'} else 'closed_hat'
        folder_type = detect(folder)
        if folder_type:
            if folder_type in {'hat', 'perc', 'cymbal', 'fx'} and name_type:
                return name_type
            return folder_type
    return name_type or 'other'


def natural(path):
    return [ (1,int(x)) if x.isdigit() else (0,x.casefold()) for x in re.split(r'(\d+)', str(path)) ]


def audio_info(path: Path):
    """Read headers, including float/24-bit WAV, without decoding the audio."""
    with path.open('rb') as f:
        head = f.read(12)
        if head[:4] in {b'RIFF', b'RIFX'} and head[8:] == b'WAVE':
            endian = '<' if head[:4] == b'RIFF' else '>'
            size = path.stat().st_size
            fmt = data_size = None
            while f.tell() + 8 <= size:
                chunk = f.read(8)
                tag, length = chunk[:4], struct.unpack(endian+'I', chunk[4:])[0]
                start = f.tell()
                if start + length > size:
                    raise ValueError('Truncated WAV chunk')
                if tag == b'fmt ': fmt = f.read(min(length, 40))
                if tag == b'data': data_size = length
                f.seek(start + length + (length % 2))
            if fmt is None or len(fmt) < 16 or data_size is None:
                raise ValueError('Missing WAV format/audio data')
            encoding, channels, rate, _, align, bits = struct.unpack(endian+'HHIIHH', fmt[:16])
            if encoding == 65534 and len(fmt) >= 40:
                encoding = struct.unpack(endian+'H', fmt[24:26])[0]
            if encoding not in {1, 3}:
                raise ValueError('Use PCM or float WAV (compressed WAV unsupported)')
            if not align or not rate or not channels: raise ValueError('Invalid WAV header')
            frames = data_size // align
        elif head[:4] == b'FORM' and head[8:] in {b'AIFF', b'AIFC'}:
            frames = rate = channels = 0
            while True:
                chunk = f.read(8)
                if len(chunk) < 8: break
                length = struct.unpack('>I', chunk[4:])[0]
                start = f.tell()
                if chunk[:4] == b'COMM':
                    payload = f.read(min(length, 22))
                    if len(payload) < 18: raise ValueError('Invalid AIFF header')
                    channels, frames, _ = struct.unpack('>HIH', payload[:8])
                    exp, mantissa = struct.unpack('>HQ', payload[8:18])
                    rate = round(math.ldexp(mantissa, (exp & 0x7fff)-16383-63))
                    if exp & 0x8000: rate = -rate
                    if head[8:] == b'AIFC' and payload[18:22] not in {b'NONE',b'sowt',b'fl32',b'FL32',b'fl64',b'FL64'}:
                        raise ValueError('Compressed AIFC unsupported')
                    break
                f.seek(start+length+(length%2))
        elif head[:4] == b'fLaC':
            f.seek(4)
            frames = rate = channels = 0
            while True:
                h = f.read(4)
                if len(h) != 4: break
                length = int.from_bytes(h[1:], 'big')
                payload = f.read(length)
                if h[0] & 127 == 0:
                    if len(payload) < 34: raise ValueError('Invalid FLAC STREAMINFO')
                    packed = int.from_bytes(payload[10:18], 'big')
                    rate, channels, frames = packed >> 44, ((packed >> 41)&7)+1, packed & ((1<<36)-1)
                    break
                if h[0] & 128: break
        else:
            raise ValueError('Unrecognized audio header')
    if not frames or not rate or not channels: raise ValueError('Empty or invalid audio file')
    return {'frames': frames, 'rate': rate, 'channels': channels, 'duration': frames/rate}


def scan(folder, include_loops=False):
    root = Path(folder).expanduser().resolve()
    if not root.is_dir(): raise ValueError('Choose an existing sample pack folder.')
    samples, skipped = [], []
    for path in sorted(root.rglob('*'), key=natural):
        if not path.is_file(): continue
        rel = path.relative_to(root)
        if any(p.startswith('.') or p == '__MACOSX' for p in rel.parts): continue
        if path.suffix.lower() not in AUDIO | OTHER_AUDIO: continue
        if path.suffix.lower() not in AUDIO:
            skipped.append({'path': str(rel), 'reason': 'Unsupported format; use WAV, AIFF or FLAC'})
            continue
        context = words(' '.join(rel.parts))
        if not include_loops and re.search(r'\b(loops?|breaks?|drum\s*beats?)\b', context):
            skipped.append({'path': str(rel), 'reason': 'Loop folder or filename'})
            continue
        try:
            meta = audio_info(path)
        except (ValueError, OSError, struct.error, OverflowError) as e:
            skipped.append({'path': str(rel), 'reason': str(e)})
            continue
        samples.append({'path': str(rel), 'category': classify(rel), **meta})
    return {'folder': str(root), 'name': root.name, 'samples': samples, 'skipped': skipped,
            'types': {k: {'name': v[0], 'note': v[1]} for k,v in TYPES.items()}}


def put(node, path, value):
    el = node.find(path)
    if el is None: raise ValueError(f'Template is missing {path}')
    el.set('Value', str(value))


def range_values(node, low, high):
    for key, value in [('Min',low),('Max',high),('CrossfadeMin',low),('CrossfadeMax',high)]: put(node,key,value)


def clear_maps(node):
    for parent in node.iter():
        for child in list(parent):
            if child.tag == 'KeyMidi': parent.remove(child)


def map_macro(parameter, index, maximum=127):
    key = ET.Element('KeyMidi')
    for tag,value in [('PersistentKeyString',''),('IsNote','false'),('Channel',16),
                      ('NoteOrController',index),('LowerRangeNote',-1),('UpperRangeNote',-1),('ControllerMapMode',0)]:
        ET.SubElement(key,tag,Value=str(value))
    parameter.insert(1,key)
    put(parameter,'Manual',0)
    put(parameter,'MidiControllerRange/Min',0)
    put(parameter,'MidiControllerRange/Max',maximum)


def reset_macros(device, names):
    for i in range(16):
        put(device,f'MacroDisplayNames.{i}',names[i] if i<len(names) else f'Macro {i+1}')
        put(device,f'MacroDefaults.{i}',0 if i<len(names) else -1)
        put(device,f'MacroControls.{i}/Manual',0)
    put(device,'NumVisibleMacroControls',max(1,len(names)))
    put(device,'AreMacroControlsVisible','true')


def load_template(name):
    return ET.fromstring(gzip.decompress((BASE/'templates'/name).read_bytes()))


def sample_part(path, rel, meta, index, count):
    part = ET.parse(BASE/'templates/sample-part.xml').getroot()
    part.set('Id',str(index))
    put(part,'LomId',0); put(part,'Name',path.stem); put(part,'Selection','true' if index==0 else 'false')
    range_values(part.find('KeyRange'),60,60)
    range_values(part.find('VelocityRange'),1,127)
    range_values(part.find('SelectorRange'),index*128//count,(index+1)*128//count-1)
    put(part,'RootKey',60); put(part,'SampleStart',0); put(part,'SampleEnd',meta['frames']-1)
    for name in ['SustainLoop','ReleaseLoop']:
        put(part,name+'/Start',0); put(part,name+'/End',meta['frames']-1)
        put(part,name+'/Mode',0 if name=='SustainLoop' else 3)
    ref = part.find('SampleRef')
    put(ref,'FileRef/Path',str(path)); put(ref,'FileRef/RelativePath',rel)
    # Absolute path is authoritative. Copy mode keeps all referenced samples together.
    put(ref,'FileRef/RelativePathType',0); put(ref,'FileRef/Type',2)
    put(ref,'FileRef/OriginalFileSize',path.stat().st_size); put(ref,'FileRef/OriginalCrc',0)
    put(ref,'LastModDate',int(path.stat().st_mtime))
    put(ref,'DefaultDuration',meta['frames']); put(ref,'DefaultSampleRate',meta['rate'])
    for el in part.findall('.//WarpMarkers'): el.clear()
    return part


def fill_sampler(preset, entries, name, macro):
    sampler = preset.find('.//MultiSampler')
    put(sampler,'UserName',name)
    sampler.find('Player/MultiSampleMap/SampleParts').clear()
    for i,(path,rel,meta) in enumerate(entries):
        sampler.find('Player/MultiSampleMap/SampleParts').append(sample_part(path,rel,meta,i,len(entries)))
    map_macro(sampler.find('Player/SampleSelector'),macro)
    return sampler


def validate(rack, expected_count):
    pads = rack.findall('./GroupDevicePreset/BranchPresets/DrumBranchPreset')
    notes = [128-int(p.find('ZoneSettings/ReceivingNote').get('Value')) for p in pads]
    if len(notes)!=len(set(notes)): raise ValueError('Duplicate pad MIDI notes')
    count = 0
    for pad in pads:
        for sampler in pad.findall('.//MultiSampler'):
            parts = sampler.findall('Player/MultiSampleMap/SampleParts/MultiSamplePart')
            count += len(parts)
            for selector in range(128):
                matches = [p for p in parts if int(p.find('SelectorRange/Min').get('Value')) <= selector <= int(p.find('SelectorRange/Max').get('Value'))]
                if len(matches)!=1: raise ValueError('Selector has a gap or overlapping samples')
            for part in parts:
                path=Path(part.find('SampleRef/FileRef/Path').get('Value'))
                if not path.is_file(): raise ValueError(f'Missing sample: {path}')
    if count != expected_count: raise ValueError('Output sample count does not match input')


def build(plan, output_dir, assignments=None, copy_samples=True, name=None):
    root = Path(plan['folder']).resolve()
    name = re.sub(r'[/:\\\x00-\x1f]', '-', name or plan['name']).strip(' .') or 'Sample Pack'
    output = Path(output_dir).expanduser().resolve()
    assignments = assignments or {}
    groups = {k:[] for k in TYPES}
    for sample in plan['samples']:
        category = assignments.get(sample['path'], sample['category'])
        if category=='skip': continue
        if category not in TYPES: raise ValueError(f'Unknown category: {category}')
        path = (root/sample['path']).resolve()
        if not path.is_relative_to(root): raise ValueError('Sample is outside the selected folder')
        groups[category].append((path,sample['path'],audio_info(path)))
    groups = {k:v for k,v in groups.items() if v}
    if not groups: raise ValueError('No samples selected. Choose a folder with WAV, AIFF or FLAC one-shots.')
    for cat,entries in groups.items():
        if len(entries)>16384: raise ValueError(f'{TYPES[cat][0]} has more than 16,384 samples; split this folder.')
    output.mkdir(parents=True,exist_ok=True)
    # Unique export directories prevent overwrites, and staging prevents partial racks.
    stage=Path(tempfile.mkdtemp(prefix='.rack-build-',dir=output))
    target=output/name
    suffix=2
    while target.exists(): target=output/f'{name} {suffix}'; suffix+=1
    rack=load_template('drum-rack.adg')
    preset=rack.find('GroupDevicePreset'); bp=preset.find('BranchPresets'); donor=copy.deepcopy(bp[0]); bp.clear()
    device=preset.find('Device/DrumGroupDevice')
    clear_maps(rack)
    names=[TYPES[k][0]+' Select' for k in groups]
    bank_macros={}
    for k,v in groups.items():
        if len(v)>128 and len(names)<16:
            bank_macros[k]=len(names); names.append(TYPES[k][0]+' Bank')
    reset_macros(device,names)
    # Live's serialized pad-scroll index counts from the highest notes down.
    put(device,'UserName',name); put(device,'PadScrollPosition',19)
    put(device,'AreDevicesVisible','true')
    manifest={'name':name,'source':str(root),'copy_samples':copy_samples,'pads':[],'skipped':plan['skipped']}
    try:
        for macro,(cat,entries) in enumerate(groups.items()):
            label,note,color=TYPES[cat]
            pad=copy.deepcopy(donor); pad.set('Id',str(macro)); put(pad,'Name',label)
            put(pad,'DocumentColorIndex',color); put(pad,'AutoColored','false')
            # ReceivingNote stores the reverse-ordered chooser index, not MIDI.
            # SendingNote stores an actual MIDI note, so keep C3 (60) unchanged.
            put(pad,'ZoneSettings/ReceivingNote',128-note); put(pad,'ZoneSettings/SendingNote',60)
            put(device,f'MacroColor.{macro}',color)
            put(pad,'ZoneSettings/ChokeGroup',1 if cat in {'closed_hat','open_hat','hat'} else 0)
            loaded=[]
            for src,rel,meta in entries:
                if copy_samples:
                    dest_rel=Path('Samples')/Path(rel)
                    dest=stage/dest_rel; dest.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dest)
                    # Stage exists for validation; references are repointed after validation.
                    loaded.append((dest,str(dest_rel),meta))
                else: loaded.append((src,rel,meta))
            dp=pad.find('DevicePresets')
            if len(loaded)<=128:
                fill_sampler(dp[0],loaded,label,macro)
            else:
                inner=load_template('instrument-rack.adg').find('GroupDevicePreset')
                clear_maps(inner)
                idevice=inner.find('Device/InstrumentGroupDevice')
                put(idevice,'UserName',label+' Banks'); reset_macros(idevice,['Sample Select','Bank'])
                map_macro(idevice.find('MacroControls.0'),macro)
                if cat in bank_macros: map_macro(idevice.find('MacroControls.1'),bank_macros[cat])
                banks=math.ceil(len(loaded)/128)
                map_macro(idevice.find('ChainSelector'),1,banks-1)
                ibp=inner.find('BranchPresets'); ibdonor=copy.deepcopy(ibp[0]); ibp.clear()
                for bank in range(banks):
                    branch=copy.deepcopy(ibdonor); branch.set('Id',str(bank)); put(branch,'Name',f'Bank {bank+1}')
                    range_values(branch.find('BranchSelectorRange'),bank,bank)
                    branch_dp=branch.find('DevicePresets'); branch_dp.clear()
                    sampler_preset=copy.deepcopy(donor.find('DevicePresets')[0])
                    fill_sampler(sampler_preset,loaded[bank*128:(bank+1)*128],f'{label} {bank+1}',0)
                    branch_dp.append(sampler_preset); ibp.append(branch)
                dp.clear(); inner.set('Id','0'); dp.append(inner)
            bp.append(pad)
            manifest['pads'].append({'type':cat,'name':label,'note':note,'samples':[rel for _,rel,_ in entries],
                'banks':math.ceil(len(entries)/128),'macro':macro+1})
        validate(rack,sum(len(v) for v in groups.values()))
        if copy_samples:
            for el in rack.findall('.//MultiSamplePart/SampleRef/FileRef/Path'):
                el.set('Value',str(target/Path(el.get('Value')).relative_to(stage)))
        data=ET.tostring(rack,encoding='utf-8',xml_declaration=True)
        (stage/f'{name}.adg').write_bytes(gzip.compress(data,mtime=0))
        (stage/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
        (stage/'HOW TO USE.txt').write_text('Drag the .adg onto a MIDI track in Ableton Live 12 Suite (or Live with Sampler).\nProgram a beat and turn the named Select macros to audition sounds.\nFor categories over 128 samples, change Bank then Sample Select.\nCopied samples use absolute paths; after moving this folder, use Live\'s missing-file search on its Samples folder and resave the rack, or Collect All and Save your Live project.\n')
        stage.rename(target)
    except Exception:
        shutil.rmtree(stage); raise
    result={'rack':str(target/f'{name}.adg'),'directory':str(target),'pads':manifest['pads'],
            'samples':sum(len(v) for v in groups.values())}
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder',help='Sample pack root directory')
    parser.add_argument('-o','--output',default=str(BASE/'exports'),help='Export parent directory')
    parser.add_argument('--name',help='Rack name')
    parser.add_argument('--scan',action='store_true',help='Preview classification as JSON')
    parser.add_argument('--include-loops',action='store_true')
    parser.add_argument('--reference',action='store_true',help='Reference originals instead of copying samples')
    parser.add_argument('--assignments',type=Path,help='JSON object mapping relative sample paths to categories or skip')
    args=parser.parse_args()
    try:
        plan=scan(args.folder,args.include_loops)
        if args.scan: print(json.dumps(plan,indent=2,ensure_ascii=False)); return
        assignments=json.loads(args.assignments.read_text()) if args.assignments else None
        print(json.dumps(build(plan,args.output,assignments,not args.reference,args.name),indent=2,ensure_ascii=False))
    except (ValueError,OSError,ET.ParseError) as e: parser.exit(1,f'Error: {e}\n')

if __name__=='__main__': main()
