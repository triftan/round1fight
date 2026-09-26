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
  'sam':    dict(sc=1.1,  flip=['1.3', '2.3', '4.0', '4.3']),
  'jensen': dict(sc=1.16, flip=['3.0', '4.2']),
  'zuck':   dict(sc=1.13, flip=['3.2', '4.2', '4.3', '5.3']),
  'wong':   dict(sc=1.08, flip=['2.1', '2.3', '4.3', '5.3']),
  'xing':   dict(sc=1.3,  flip=['1.3', '4.3']),
}
Z = 2.5
SKIP_W = {'mask', 'xing'}
SKIP_K = {'xing'}
SKIP_J = set()
JFLIP = {}  # fid -> list of J_<fid>_<i> indices (0=pw0,1=pf1,2=hit2,3=jup) drawn facing left
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
    # Animation sheets: W = 4-frame walk cycle, K = uppercut wind-up, rise, peak and roundhouse chamber.
    # Walk frames are upright, so their height sets the scale. K frames are matched by head size to the stance.
    # Sheets that came out off-model (colour or style drift) are skipped and fall back to existing poses.
    if fid in SKIP_W:
        for i in range(4): fr[f'walk{i}'] = fr['walk' if i % 2 else 'stance']
    else:
        for i in range(4): fr[f'walk{i}'] = scale(load(f'W_{fid}_{i}'), H / load(f'W_{fid}_{i}').height)
    if fid in SKIP_K:
        fr.update(up0=fr['crouch'], up1=fr['crouch'], up2=fr['upper'], rh0=fr['lowkick'])
    else:
        kk = [load(f'K_{fid}_{i}') for i in range(4)]
        pk = H / kk[3].height
        kK = float(np.clip(k['1'] * hw / head_w(kk[3]), pk * .85, pk * 1.15))
        for i, n in enumerate(['up0', 'up1', 'up2', 'rh0']): fr[n] = scale(kk[i], kK)
    # Sheet J = punch wind-up, punch follow-through, hit reaction, jump rise.
    # Matched by head width like K, with a prior from the follow-through frame's own height.
    if fid in SKIP_J:
        fr.update(pw0=fr['stance'], pf1=fr['cross'], hit2=fr['hit'], jup=fr['jump'])
    else:
        jflip = JFLIP.get(fid, [])
        jj = [load(f'J_{fid}_{i}') for i in range(4)]
        jj = [im.transpose(Image.FLIP_LEFT_RIGHT) if i in jflip else im for i, im in enumerate(jj)]
        pj = H / jj[1].height
        kJ = float(np.clip(k['1'] * hw / head_w(jj[1]), pj * .85, pj * 1.15))
        for i, n in enumerate(['pw0', 'pf1', 'hit2', 'jup']): fr[n] = scale(jj[i], kJ)
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
# Crowd: per stage, 4 spectators as [idle, cheer] frame pairs (index into crowd_<stage>_<n>.png)
CROWD = {'beach': [(0, 1), (2, 3), (4, 5), (6, 7)], 'valley': [(0, 1), (2, 2), (4, 3), (5, 6)],
         'night': [(0, 1), (2, 3), (4, 5), (6, 7)], 'data': [(0, 1), (2, 3), (4, 5), (6, 7)],
         'mars': [(0, 1), (2, 3), (4, 5), (6, 7)]}
cf, cmeta = {}, {}
for b, pairs in CROWD.items():
    for j, (i0, i1) in enumerate(pairs):
        idle = load(f'crowd_{b}_{i0}'); kk = 150 / idle.height
        cf[f'{b}{j}a'] = scale(idle, kk); cf[f'{b}{j}b'] = scale(load(f'crowd_{b}_{i1}'), kk)
atlas, meta = pack(cf); u, n = uri(atlas); total += n; print('crowd', n // 1024)
out['crowd'] = {'src': u, 'f': meta}
for b in ['beach', 'valley', 'night', 'data', 'mars']:
    im = Image.open(f'raw/bg_{b}.webp').convert('RGB'); im = im.resize((round(im.width * 540 / im.height), 540), Image.LANCZOS)
    u, n = uri(im, 84); total += n; out['bg'][b] = u; print(b, n // 1024)
open('assets.js', 'w').write('const ASSETS = ' + json.dumps(out, separators=(',', ':'), default=int) + ';\n')
print('total KB', total // 1024)
