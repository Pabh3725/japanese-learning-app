"""In mọi cặp chữ Kanji = cách đọc trong một file (để soát furigana)."""
import json
import sys
from pathlib import Path

seen = {}


def walk(x):
    if isinstance(x, dict):
        if 'r' in x and 't' in x:
            seen.setdefault(f"{x['t']}={x['r']}", 0)
            seen[f"{x['t']}={x['r']}"] += 1
        for v in x.values():
            walk(v)
    elif isinstance(x, list):
        for v in x:
            walk(v)


for name in sys.argv[1:]:
    walk(json.loads((Path(__file__).resolve().parent / 'parts' / f'{name}.json').read_text()))
print(' '.join(sorted(seen)))
