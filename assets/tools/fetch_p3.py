"""Download the Phase 3 raw sheets listed in raw/urls_p3.txt into raw/ (webp)."""
import os, io, urllib.request
from PIL import Image
RAW = os.path.join(os.path.dirname(__file__), '..', 'raw')
for line in open(os.path.join(RAW, 'urls_p3.txt')):
    if not line.strip() or line.startswith('#'): continue
    name, url = line.split()
    p = os.path.join(RAW, name + '.webp')
    if os.path.exists(p): continue
    data = urllib.request.urlopen(url).read()
    Image.open(io.BytesIO(data)).convert('RGB').save(p, 'WEBP', quality=92, method=6)
    print(name, Image.open(p).size)
