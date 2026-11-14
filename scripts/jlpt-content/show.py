"""In nội dung một dạng để soát: chữ kèm cách đọc 漢字(よみ), gạch chân «…», đáp án ✓.
Dùng: python3 show.py n5-contextual [--md]  (--md: định dạng Markdown cho docs/jlpt-review-v2.md)"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(pieces, furigana=True):
    out = []
    for p in pieces:
        s = p['t'] + (f"({p['r']})" if furigana and p.get('r') else '')
        out.append(f'«{s}»' if p.get('u') else s)
    return ''.join(out)


def opts(options, answer):
    return ' / '.join(('✓' if i == answer else '') + (o if isinstance(o, str) else text(o)) for i, o in enumerate(options))


def show(name):
    data = json.loads((Path(__file__).resolve().parent / 'parts' / f'{name}.json').read_text())
    lines = [f"## {data['level']} · {data['type']} ({len(data['items'])} mục)", '']
    for it in data['items']:
        code = it['code']
        if 'stem' in it:
            lines += [f"- **{code}** {text(it['stem'])}", f"  - {opts(it['options'], it['answer'])}", f"  - {it['explanation']}"]
        elif 'word' in it:
            lines += [f"- **{code}** {it['word']}"] + [f"  - {'✓' if i == it['answer'] else '　'} {text(o)}" for i, o in enumerate(it['options'])] + [f"  - {it['explanation']}"]
        elif 'passage' in it:
            lines += [f"- **{code}**" + (f" [{it['kind']}]" if it.get('kind') else '') + (f" {text(it['title'])}" if it.get('title') else '')]
            lines += [f"  > {text(p)}" for p in it['passage']]
            for j, q in enumerate(it['questions']):
                lines += [f"  - Câu {j + 1}" + (f" (ô {q['blank']})" if q.get('blank') else '') + (f": {text(q['q'])}" if q.get('q') else '') + f" — {opts(q['options'], q['answer'])}", f"    - {q['explanation']}"]
        elif 'script' in it:
            lines += [f"- **{code}** [{it['kind']}] {text(it['question'])}"] + [f"  - {l['sp']}: {text(l['text'])}" for l in it['script']]
            lines += [f"  - {opts(it['options'], it['answer'])}", f"  - {it['explanation']}"]
        else:
            lines += [f"- **{code}** {it['emoji']} {it['situation']}", f"  - {opts(it['options'], it['answer'])}", f"  - {it['explanation']}"]
    return '\n'.join(lines)


if __name__ == '__main__':
    print(show(sys.argv[1]))
