import glob, os, sys
from PIL import Image, ImageDraw
names = sys.argv[1:]
rows = []
for n in names:
    fs = sorted(glob.glob(f'frames/{n}_*.png'), key=lambda f: int(f.rsplit('_', 1)[1][:-4]))
    ims = [Image.open(f) for f in fs]
    h = 180; row = Image.new('RGBA', (sum(int(i.width * h / i.height) + 10 for i in ims) + 90, h + 20), (40, 40, 60, 255))
    d = ImageDraw.Draw(row); d.text((4, 4), n, fill='white'); x = 90
    for k, im in enumerate(ims):
        s = h / im.height; im2 = im.resize((max(1, int(im.width * s)), h), Image.NEAREST)
        row.alpha_composite(im2, (x, 16)); d.text((x, 2), str(k), fill='yellow'); x += im2.width + 10
    rows.append(row)
W = max(r.width for r in rows); out = Image.new('RGBA', (W, sum(r.height for r in rows)), (20, 20, 30, 255)); y = 0
for r in rows: out.alpha_composite(r, (0, y)); y += r.height
out.save('contact.png'); print(out.size)
