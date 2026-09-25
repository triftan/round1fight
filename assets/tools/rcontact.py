from PIL import Image, ImageDraw
import sys
S='/tmp/claude-0/-home-user-round1fight/1a8e5212-f130-5791-a0eb-fa4e505c7bb1/scratchpad/'
for id in sys.argv[1:]:
    cell=200; im=Image.new('RGB',(cell*10,(cell+14)*2),(40,40,60)); d=ImageDraw.Draw(im)
    k=0
    for r in range(1,6):
        for i in range(4):
            p=Image.open(f'frames/R{r}_{id}_{i}.png'); p.thumbnail((cell-4,cell-4))
            x,y=(k%10)*cell+2,(k//10)*(cell+14)+2
            im.paste(p,(x,y),p); d.text((x+2,y+cell-4),f'R{r}.{i}',fill='yellow'); k+=1
    im.save(S+f'cs_{id}.png')
