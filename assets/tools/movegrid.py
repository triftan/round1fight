# One image per group of moves: rows = moves, columns = fighters, all at the same scale, facing right.
import json, sys
from PIL import Image, ImageDraw
S='/tmp/claude-0/-home-user-round1fight/1a8e5212-f130-5791-a0eb-fa4e505c7bb1/scratchpad/'
src=open('assets.js').read(); A=json.loads(src[src.index('{'):src.rindex('}')+1])
ids=['tramp','mask','xi','dario','sam','jensen','zuck','wong','xing']
groups=[['upper','sweep','clowkick'],['jkick','jpunch','jump'],['hit','dizzy','throw'],['walk','block','victory'],['jab','cross','roundhouse'],['lowkick','crouch','cjab']]
for gi,moves in enumerate(groups):
    cw,ch=220,250; im=Image.new('RGB',(cw*9,ch*len(moves)),(40,40,60)); d=ImageDraw.Draw(im)
    for r,m in enumerate(moves):
        for c,fid in enumerate(ids):
            at=Image.open(f'atlas_{fid}.png'); x,y,w,h,ax,ay=A['fighters'][fid]['f'][m]
            fr=at.crop((x,y,x+w,y+h)); fr.thumbnail((cw-10,ch-24))
            im.paste(fr,(c*cw+5,r*ch+2),fr); d.text((c*cw+5,r*ch+ch-18),f'{m} {fid}',fill='yellow')
    im.save(S+f'mg{gi}.png')
