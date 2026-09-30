"""Converte os sprites originais (assets-src/sprites/classicos-v2-png) em WebP recortados e reduzidos.

Uso: pip install pillow && python scripts/process_sprites.py
Saída: src/assets/sprites/<nome>.webp — embutidos no build de arquivo único.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'sprites' / 'classicos-v2-png'
OUT = ROOT / 'src' / 'assets' / 'sprites'
MAX_W = {'muralha': 1100}  # o anel da muralha cobre a cena inteira
DEFAULT_W = 380

OUT.mkdir(parents=True, exist_ok=True)


def group(stem: str) -> str:
    """Estágios do mesmo edifício compartilham o recorte para manter a escala relativa."""
    return stem.split('-tier-')[0] if '-tier-' in stem else stem.split('-')[0]


images = {f.stem: Image.open(f).convert('RGBA') for f in sorted(SRC.glob('*.png'))}
boxes: dict[str, list[int]] = {}
for stem, im in images.items():
    b = im.getchannel('A').getbbox() or (0, 0, im.width, im.height)
    g = boxes.setdefault(group(stem), [10**9, 10**9, 0, 0])
    g[0], g[1] = min(g[0], b[0]), min(g[1], b[1])
    g[2], g[3] = max(g[2], b[2]), max(g[3], b[3])

total = 0
for stem, im in images.items():
    im = im.crop(tuple(boxes[group(stem)]))
    w = next((v for k, v in MAX_W.items() if stem.startswith(k)), DEFAULT_W)
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    dst = OUT / (stem + '.webp')
    im.save(dst, 'WEBP', quality=86, method=4)
    total += dst.stat().st_size
    print(f'{stem:28s} {im.width}x{im.height} {dst.stat().st_size // 1024} KB')
print(f'total {total // 1024} KB')
