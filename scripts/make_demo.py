"""Create 37 small synthetic one-shots for trying the converter."""
from pathlib import Path
import math
import random
import struct
import wave
base=Path(__file__).resolve().parents[1]/'examples'/'Demo Pack'
for category,count in [('Kicks',20),('Snares',10),('Hi-Hats',7)]:
    for index in range(1,count+1):
        rng=random.Random(index);rate=44100;duration=.35 if category=='Kicks' else .22
        samples=[];phase=0
        for i in range(int(rate*duration)):
            t=i/rate
            if category=='Kicks':
                freq=40+index*1.4+150*math.exp(-t*35)
                phase+=2*math.pi*freq/rate
                val=math.sin(phase)*math.exp(-t*(12+index*.3))
            elif category=='Snares':
                val=(rng.uniform(-1,1)*.7+math.sin(2*math.pi*(160+index*8)*t)*.3)*math.exp(-t*(18+index))
            else:
                val=rng.uniform(-1,1)*math.exp(-t*(35+index*5))*.5
            samples.append(struct.pack('<h',int(val*24000)))
        path=base/category/f'{category[:-1]} {index:02}.wav';path.parent.mkdir(parents=True,exist_ok=True)
        with wave.open(str(path),'wb') as f:
            f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(b''.join(samples))
print(base)
