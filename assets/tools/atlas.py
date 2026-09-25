"""Pack sliced frames into one atlas per fighter + a props atlas + backgrounds, emit assets.js."""
import os, json, base64, io
import numpy as np
from PIL import Image

A = ['stance', 'punch', 'kick', 'crouch', 'jump', 'hit', 'down', 'victory']
B = ['walk', 'block', 'upper', 'sweep', 'jkick', 'throw', 'dizzy', 'jpunch']
# Per fighter: game sc (sets height), sheet-A index order where it differs, and frames drawn facing left.
F = {
  'tramp':  dict(sc=1.2,  flipA=[2, 6, 7], flipB=[4]),
  'mask':   dict(sc=1.18, flipA=[2, 4, 6], flipB=[]),
  'xi':     dict(sc=1.16, flipA=[2, 6, 7], flipB=[]),
  'dario':  dict(sc=1.13, flipA=[2, 5],    flipB=[4]),
  'sam':    dict(sc=1.1,  flipA=[5],       flipB=[]),
  'jensen': dict(sc=1.16, flipA=[2, 5, 6], flipB=[], orderA=[0, 1, 2, 3, 4, 6, 5, 7]),
  'zuck':   dict(sc=1.13, flipA=[6],       flipB=[5]),
  'wong':   dict(sc=1.08, flipA=[5, 6],    flipB=[]),
  'xing':   dict(sc=1.3,  flipA=[1, 2],    flipB=None,
                 fromA={'walk': 'stance', 'block': 'crouch', 'upper': 'victory', 'sweep': 'crouch', 'jkick': 'kick', 'throw': 'punch', 'dizzy': 'hit', 'jpunch': 'jump'}),
}
Z = 2.5
def load(n): return Image.open(f'frames/{n}.png').convert('RGBA')
def measure(im):
    a = np.asarray(im)[..., 3] > 0
    ys, xs = np.nonzero(a)
    return xs.mean(), ys.max()
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
    orderA = cfg.get('orderA', list(range(8)))
    raw = {}
    for slot, name in enumerate(A):
        im = load(f'A_{fid}_{orderA[slot]}')
        raw[name] = im.transpose(Image.FLIP_LEFT_RIGHT) if orderA[slot] in cfg['flipA'] else im
    kA = 80 * cfg['sc'] * Z / raw['stance'].height
    fr = {n: scale(im, kA) for n, im in raw.items()}
    if cfg['flipB'] is None:
        for n, src in cfg['fromA'].items(): fr[n] = fr[src]
    else:
        rb = {}
        for i, name in enumerate(B):
            im = load(f'B_{fid}_{i}')
            rb[name] = im.transpose(Image.FLIP_LEFT_RIGHT) if i in cfg['flipB'] else im
        kB = 84 * cfg['sc'] * Z / rb['walk'].height
        for n, im in rb.items(): fr[n] = scale(im, kB)
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
