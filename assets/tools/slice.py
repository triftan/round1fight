"""Cut AI-generated sprite sheets (magenta background) into clean RGBA frames."""
import sys, json, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

RAW = os.path.join(os.path.dirname(__file__), '..', 'raw')
OUT = os.path.join(os.path.dirname(__file__), '..', 'frames')
os.makedirs(OUT, exist_ok=True)

def key_out(img):
    a = np.asarray(img.convert('RGB')).astype(np.int32)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(-1))
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    pinkish = (r - g > 70) & (b - g > 40) & (r > 150)
    fg = (dist > 70) & ~pinkish
    fg = nd.binary_opening(fg, iterations=1)
    return a, fg, bg

def comp(m):
    ys, xs = np.nonzero(m)
    return dict(mask=m, area=int(m.sum()), x0=xs.min(), x1=xs.max(), y0=ys.min(), y1=ys.max(), cx=xs.mean())

def split_erode(c):
    """Separate two touching figures: erode until the blob breaks, then grow the seeds back."""
    m = c['mask']
    for k in range(1, 25):
        er = nd.binary_erosion(m, iterations=k)
        lab, n = nd.label(er, structure=np.ones((3, 3)))
        sizes = nd.sum(er, lab, range(1, n + 1))
        keep = [i + 1 for i, v in enumerate(sizes) if v > max(250, .2 * max(sizes))]
        if len(keep) >= 2:
            seeds = np.zeros_like(lab)
            for j, i in enumerate(keep): seeds[lab == i] = j + 1
            _, (iy, ix) = nd.distance_transform_edt(seeds == 0, return_indices=True)
            owner = seeds[iy, ix]
            return [comp(m & (owner == j + 1)) for j in range(len(keep)) if (m & (owner == j + 1)).sum() > 500]
    return [c]

def components(fg, n_expected=8, min_area=2500):
    lab, n = nd.label(fg, structure=np.ones((3, 3)))
    big, small = [], []
    for i in range(1, n + 1):
        m = lab == i
        (big if m.sum() >= min_area else small).append(comp(m))
    for s_ in small:  # stray bits (shoes, fists, hair tufts) join the nearest big blob
        if s_['area'] < 20 or not big: continue
        def d(b):
            dx = max(b['x0'] - s_['x1'], s_['x0'] - b['x1'], 0); dy = max(b['y0'] - s_['y1'], s_['y0'] - b['y1'], 0)
            return dx + dy
        j = min(range(len(big)), key=lambda i: d(big[i]))
        if d(big[j]) < 40: big[j] = comp(big[j]['mask'] | s_['mask'])
    for _ in range(6):
        if len(big) >= n_expected: break
        med = np.median([c['x1'] - c['x0'] for c in big])
        c = max(big, key=lambda c: (c['x1'] - c['x0']) / med + c['area'] / 1e6)
        parts = split_erode(c)
        if len(parts) < 2: break
        big = [b for b in big if b is not c] + parts
    big.sort(key=lambda c: c['cx'])
    return big

def crop_rgba(a, m, bg):
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgb = a[y0:y1, x0:x1].copy()
    mm = m[y0:y1, x0:x1]
    # defringe: edge pixels still leaning toward the key colour become a dark outline tone
    edge = mm & ~nd.binary_erosion(mm, iterations=2)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    rgb[edge & (r - g > 50) & (b - g > 30)] = [38, 20, 30]
    out = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    out[..., :3] = np.clip(rgb, 0, 255)
    out[..., 3] = mm * 255
    return Image.fromarray(out, 'RGBA')

if __name__ == '__main__':
    report = {}
    for f in sorted(glob.glob(os.path.join(RAW, '[AB]_*.webp')) + [os.path.join(RAW, 'props.webp')]):
        name = os.path.basename(f)[:-5]
        a, fg, bg = key_out(Image.open(f))
        comps = components(fg, 10 if name == 'props' else 8)
        if name == 'props': comps.sort(key=lambda c: (c['y0'] > fg.shape[0] * .45, c['cx']))
        report[name] = len(comps)
        for i, c in enumerate(comps):
            crop_rgba(a, c['mask'], bg).save(os.path.join(OUT, f'{name}_{i}.png'))
    print(json.dumps(report))
