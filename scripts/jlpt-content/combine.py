"""Gộp parts/<cấp>-<dạng>.json (sinh từ các script n5_*.py, n4_*.py) thành data/jlpt/<cấp>.json (app nhập file này).
Chạy sau mỗi lần soạn:  for f in n5_*.py n4_*.py; do python3 $f; done && python3 combine.py"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
for level in ('n5', 'n4'):
    out = {}
    for f in sorted((HERE / 'parts').glob(f'{level}-*.json')):
        data = json.loads(f.read_text())
        out[data['type']] = data['items']
    (ROOT / 'data' / 'jlpt' / f'{level}.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(level, {k: len(v) for k, v in out.items()})
