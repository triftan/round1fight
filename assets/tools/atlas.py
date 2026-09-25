"""Pack sliced frames into one atlas per fighter + a props atlas + backgrounds, emit assets.js."""
import os, json, base64, io
import numpy as np
from PIL import Image

# Every fighter has five 4-pose sheets (R1..R5), all drawn in the same arcade style.
R = {'stance': '1.0', 'jab': '1.1', 'cross': '1.2', 'down': '1.3',
     'lowkick': '2.0', 'roundhouse': '2.1', 'crouch': '2.2', 'cjab': '2.3',
     'jump': '3.0', 'jkick': '3.1', 'jpunch': '3.2', 'hit': '3.3',
     'walk': '4.0', 'block': '4.1', 'upper': '4.2', 'sweep': '4.3',
     'victory': '5.0', 'dizzy': '5.1', 'throw': '5.2', 'clowkick': '5.3'}
# Per fighter: game scale, frames the generator drew facing left, and per-fighter overrides.
F = {
  'tramp':  dict(sc=1.2,  flip=['5.3'], over={'cross': '6.0', 'down': '6.1'}),
  'mask':   dict(sc=1.18, flip=['1.3', '2.1', '2.3', '3.1', '5.3']),
  'xi':     dict(sc=1.16, flip=['1.3', '2.1', '3.2', '4.3', '5.3']),
  'dario':  dict(sc=1.13, flip=['4.3']),
  'sam':    dict(sc=1.1,  flip=['1.3', '2.3', '4.3']),
  'jensen': dict(sc=1.16, flip=['3.0']),
  'zuck':   dict(sc=1.13, flip=['3.2', '4.3', '5.3']),
  'wong':   dict(sc=1.08, flip=['2.1', '2.3', '4.3', '5.3']),
  'xing':   dict(sc=1.3,  flip=['1.3', '4.3']),
}
Z = 2.5
FALLBACK = dict(punch='jab', kick='roundhouse', spinkick='jkick', taunt='victory')
def load(n): return Image.open(f'frames/{n}.png').convert('RGBA')
def measure(im):
    a = np.asarray(im)[..., 3] > 0
    ys, xs = np.nonzero(a)
    return xs.mean(), ys.max()
def head_w(im):
    a = np.asarray(im)[..., 3] > 0; ys, _ = np.nonzero(a); top = ys.min()
    band = a[top + int(im.height * .03): top + int(im.height * .09)]
    return float(np.median([np.ptp(r.nonzero()[0]) + 1 for r in band if r.any()]))
def scale(im, k):
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.BOX)
def pack(frames, pad=2):
    W = sum(f.width + pad for f in frames.values()); H = max(f.height for f in frames.values())
    atlas = Image.new('RGBA', (W, H)); meta = {}; x = 0
    for name, f in frames.items():
        atlas.paste(f, (x, 0)); cx, by = measure(f)
        ax = f.width / 2 if name == 'down' else cx
        meta[name] = [x, 0, f.width, f.height, round(ax), by + 1]; x += f.width + pad
    return atlas, meta
def uri(im, q=90):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, alpha_quality=100, method=6); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), len(b.getvalue())

out = {'fighters': {}, 'props': {}, 'bg': {}}; total = 0
for fid, cfg in F.items():
    over = cfg.get('over', {})
    raw, sheet = {}, {}
    for name, key in R.items():
        key = over.get(name, key); r, i = key.split('.')
        im = load(f'R{r}_{fid}_{i}')
        raw[name] = im.transpose(Image.FLIP_LEFT_RIGHT) if key in cfg['flip'] else im
        sheet[name] = r if name not in over else 'x'
    H = 80 * cfg['sc'] * Z
    k = {'1': H / raw['stance'].height, '2': H / raw['lowkick'].height, '4': H / raw['walk'].height}
    hw = head_w(raw['stance'])
    # Sheets 3 and 5 have no neutral pose. Guess from head width, but stay near a simple prior
    # (sheet-3 figures are drawn at about the average size of the others; a raised fist adds a fifth).
    p3, p5 = (k['1'] + k['2'] + k['4']) / 3, H * 1.2 / raw['victory'].height
    k['3'] = float(np.clip(k['1'] * hw / head_w(raw['jump']), p3 * .85, p3 * 1.15))
    k['5'] = float(np.clip(np.median([p5, k['1'] * hw / head_w(raw['dizzy']), k['1'] * hw / head_w(raw['throw'])]), p5 * .88, p5 * 1.12))
    if over: k['x'] = H / raw['cross'].height  # extra sheet: its standing cross sets the scale
    fr = {n: scale(im, k[sheet[n]]) for n, im in raw.items()}
    for n, fb in FALLBACK.items():
        if n not in fr: fr[n] = fr[fb]
    atlas, meta = pack(fr)
    st = fr['stance']; a = np.asarray(st)[..., 3] > 0; ys, xs = np.nonzero(a)
    top = ys.min(); band = a[top:top + int(st.height * .3)]; bys, bxs = np.nonzero(band)
    s = int(st.height * .36); hx = int(bxs.mean()); 
    meta['head'] = [meta['stance'][0] + max(0, hx - s // 2), top + max(0, int(st.height * .01)), s, s]
    u, n = uri(atlas); total += n; print(fid, n // 1024)
    out['fighters'][fid] = {'src': u, 'f': meta}
    atlas.save(f'atlas_{fid}.png')
props = ['wall', 'fire', 'orb', 'chip', 'tag', 'dog', 'rocket', 'gpu', 'clip', 'spark']
ph = {'wall': 100, 'fire': 70, 'orb': 44, 'chip': 30, 'tag': 34, 'dog': 70, 'rocket': 190, 'gpu': 120, 'clip': 170, 'spark': 70}
pf = {p: scale(load(f'props_{i}'), ph[p] / load(f'props_{i}').height) for i, p in enumerate(props)}
atlas, meta = pack(pf); u, n = uri(atlas); total += n
out['props'] = {'src': u, 'f': meta}
for b in ['beach', 'valley', 'night', 'data', 'mars']:
    im = Image.open(f'raw/bg_{b}.webp').convert('RGB'); im = im.resize((round(im.width * 540 / im.height), 540), Image.LANCZOS)
    u, n = uri(im, 84); total += n; out['bg'][b] = u; print(b, n // 1024)
open('assets.js', 'w').write('const ASSETS = ' + json.dumps(out, separators=(',', ':'), default=int) + ';\n')
print('total KB', total // 1024)
