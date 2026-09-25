# Draw every atlas frame on a common floor line at game scale, to check facing and size.
import json, sys
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-round1fight/1a8e5212-f130-5791-a0eb-fa4e505c7bb1/scratchpad/'
src=open('assets.js').read(); A=json.loads(src[src.index('{'):src.rindex('}')+1])
for fid in sys.argv[1:]:
    at=Image.open(f'atlas_{fid}.png'); f=A['fighters'][fid]['f']
    names=[n for n in f if n!='head']
    cw=230; im=Image.new('RGB',(cw*12,2*330),(40,40,60)); d=ImageDraw.Draw(im)
    for k,n in enumerate(names):
        x,y,w,h,ax,ay=f[n]; fr=at.crop((x,y,x+w,y+h))
        bx=(k%12)*cw+cw//2; by=(k//12)*330+300
        im.paste(fr,(int(bx-ax),int(by-ay)),fr); d.line((bx-100,by,bx+100,by),fill=(90,90,110)); d.text((bx-100,by+5),n,fill='yellow')
    im.save(S+f'ac_{fid}.png')
