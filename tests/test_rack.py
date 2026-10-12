import gzip
import json
from pathlib import Path
import shutil
import struct
import tempfile
import unittest
import wave
import xml.etree.ElementTree as ET
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from rack import scan, build, classify, audio_info


def wav(path, frames=4410):
    path.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(path),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(44100);f.writeframes(b'\x01\x00'*frames)


class RackTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.root=Path(self.tmp.name)/'Pack';self.out=Path(self.tmp.name)/'Out'
        self.root.mkdir()
    def tearDown(self): self.tmp.cleanup()
    def test_example_pack_and_all_selector_positions(self):
        for folder,count in [('Kicks',20),('Snares',10),('Hi-Hats',7)]:
            for i in range(1,count+1): wav(self.root/folder/f'hit{i}.wav')
        wav(self.root/'Loops'/'kick_loop.wav')
        (self.root/'Kicks'/'broken.wav').write_bytes(b'not audio')
        plan=scan(self.root); self.assertEqual(len(plan['samples']),37);self.assertEqual(len(plan['skipped']),2)
        result=build(plan,self.out)
        r=ET.fromstring(gzip.decompress(Path(result['rack']).read_bytes()))
        pads=r.findall('.//DrumBranchPreset');self.assertEqual(len(pads),3)
        self.assertEqual(result['samples'],37)
        for pad in pads:
            parts=pad.findall('.//MultiSamplePart')
            for pos in range(128):
                matching=[p for p in parts if int(p.find('SelectorRange/Min').get('Value'))<=pos<=int(p.find('SelectorRange/Max').get('Value'))]
                self.assertEqual(len(matching),1)
            self.assertEqual(pad.find('ZoneSettings/SendingNote').get('Value'),'60')
            expected={'Kick':36,'Snare':38,'Hi-Hat':44}[pad.find('Name').get('Value')]
            self.assertEqual(128-int(pad.find('ZoneSettings/ReceivingNote').get('Value')),expected)
            for p in parts:
                path=Path(p.find('SampleRef/FileRef/Path').get('Value'))
                self.assertTrue(path.is_file());self.assertTrue(path.is_relative_to(self.out.resolve()))
                self.assertEqual(p.find('SampleEnd').get('Value'),'4409')
        ordered=[p.find('Name').get('Value') for p in pads[0].findall('.//MultiSamplePart')]
        self.assertEqual(ordered,[f'hit{i}' for i in range(1,21)])
        self.assertFalse(any('Ben' in e.get('Value','') for e in r.findall('.//Path')))
        # Exporting twice cannot overwrite an existing kit.
        second=build(plan,self.out);self.assertNotEqual(result['directory'],second['directory'])
    def test_banks_preserve_all_samples(self):
        for i in range(257): wav(self.root/'Kicks'/f'kick{i}.wav',10)
        result=build(scan(self.root),self.out,copy_samples=False)
        r=ET.fromstring(gzip.decompress(Path(result['rack']).read_bytes()))
        self.assertEqual(len(r.findall('.//DrumBranchPreset')),1)
        self.assertEqual(len(r.findall('.//MultiSampler')),3)
        self.assertEqual(len(r.findall('.//MultiSamplePart')),257)
        self.assertEqual(result['pads'][0]['banks'],3)
        branches=r.findall('.//InstrumentBranchPreset')
        self.assertEqual([b.find('BranchSelectorRange/Min').get('Value') for b in branches],['0','1','2'])
        self.assertEqual(r.find('.//InstrumentGroupDevice/ChainSelector/MidiControllerRange/Max').get('Value'),'2')
    def test_classification(self):
        cases={'One Shots/Kicks/a.wav':'kick','Drums/HH/Open/pack_OHH_01.wav':'open_hat',
               'Snares/808_snare.wav':'snare','Hi-Hats/pack_ClosedHat2.wav':'closed_hat',
               'KickSnarePack/One Shots/Claps/hit.wav':'clap',
               'pack/somewhere/BD_12.WAV':'kick','One Shots/Percussion/conga.wav':'perc',
               'pack/hat_snake.wav':'hat','unknown.wav':'other'}
        for p,cat in cases.items(): self.assertEqual(classify(Path(p)),cat,p)
    def test_assignments_and_escaping(self):
        wav(self.root/'x & y'/'hit<&>.WAV');wav(self.root/'kick.wav')
        p=scan(self.root);res=build(p,self.out,{'x & y/hit<&>.WAV':'snare','kick.wav':'skip'},name='My / Kit')
        self.assertEqual(res['samples'],1)
        r=ET.fromstring(gzip.decompress(Path(res['rack']).read_bytes()))
        self.assertEqual(r.find('.//MultiSamplePart/Name').get('Value'),'hit<&>')
        self.assertEqual(res['pads'][0]['type'],'snare')
    def test_float_wav_and_flac_headers(self):
        fmt=struct.pack('<HHIIHH',3,2,48000,384000,8,32)
        body=b'fmt '+struct.pack('<I',16)+fmt+b'data'+struct.pack('<I',800)+b'\x00'*800
        p=self.root/'float.wav';p.write_bytes(b'RIFF'+struct.pack('<I',len(body)+4)+b'WAVE'+body)
        self.assertEqual(audio_info(p)['frames'],100)
        meta=bytearray(34);meta[10:18]=((44100<<44)|(1<<41)|(15<<36)|4410).to_bytes(8,'big')
        p=self.root/'x.flac';p.write_bytes(b'fLaC\x80\x00\x00\x22'+meta)
        self.assertEqual(audio_info(p)['duration'],.1)
    def test_empty_folder_fails_without_export(self):
        with self.assertRaises(ValueError):build(scan(self.root),self.out)
        self.assertFalse(self.out.exists())

if __name__=='__main__': unittest.main()
