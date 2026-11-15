"""Luyện nghe đợt B (docs/listening-rules.md §V2.4): công cụ soạn hội thoại theo bài.

Mỗi lượt nói: (người nói 'M'/'F', câu, nghĩa tiếng Việt). Trong câu:
  [漢字|よみ]                 cách đọc riêng (bắt buộc với chữ số: [９時|くじ])
  {đáp án/nhiễu/nhiễu/nhiễu}   ô trống: đáp án ở đầu, 3 nhiễu nghe na ná (app xáo); đáp án có thể có [..|..]
Kiểm tra: chỉ dùng từ của bài 1 tới bài đó (+ tên người, địa danh, câu chào), mẫu ngữ pháp ghi kèm thuộc bài ≤ bài đó,
số lượt / số ô đúng loại hội thoại, mỗi ô 4 lựa chọn khác nhau, chữ số có cách đọc.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'jlpt-content'))
sys.path.insert(0, str(HERE.parent / 'grammar-content'))
import dsl  # noqa: E402
import jdsl  # noqa: E402

ROOT = HERE.parents[1]
ERRORS = jdsl.ERRORS
# Câu chào và từ cảm thán dùng trong hội thoại (bài 0 của Minna, không có trong danh sách từ)
GREETINGS = {
    'おはようございます': 'おはようございます', 'こんにちは': 'こんにちは', 'こんばんは': 'こんばんは', 'ありがとうございます': 'ありがとうございます',
    'ありがとうございました': 'ありがとうございました', 'すみません': 'すみません', 'さようなら': 'さようなら', 'おやすみなさい': 'おやすみなさい',
    'じゃ': 'じゃ', 'あ': 'あ', 'ええ': 'ええ', 'はい': 'はい', 'いいえ': 'いいえ', 'そうですか': 'そうですか', 'どうぞ': 'どうぞ', 'どうも': 'どうも', 'いらっしゃいませ': 'いらっしゃいませ',
}
KIND = {'short': {'lines': (6, 8), 'blanks': (4, 6)}, 'long': {'lines': (10, 14), 'blanks': (8, 10)}}

POINTS = {}
for f in (ROOT / 'data' / 'grammar').glob('*.json'):
    d = json.loads(f.read_text())
    for p in d['points']:
        POINTS[p['code']] = (d['lesson'], p['pattern'])

LESSON = 0


def setup(lesson: int):
    """Từ vựng tới bài `lesson`, cộng tên người, địa danh, câu chào."""
    global LESSON
    LESSON = lesson
    dsl.use_lesson(lesson)
    v = dsl.VOCAB
    for word, reading in {**jdsl.NAMES, **jdsl.PLACES, **GREETINGS}.items():
        v.add(v.tokens, word, reading)
    v.tokens.update(jdsl.MARKS)
    v.maxlen = max(v.maxlen, max(len(t) for t in v.tokens))
    jdsl.V = v


def _line(where: str, sp: str, text: str, meaning: str):
    if sp not in ('M', 'F'):
        ERRORS.append(f'{where}: người nói phải là M hoặc F')
    pieces, blanks = [], []
    for part in re.split(r'(\{[^{}]+\})', text):
        if not part:
            continue
        if part.startswith('{'):
            opts = [o.strip() for o in part[1:-1].split('/')]
            if len(opts) != 4 or len(set(opts)) != 4 or not all(opts):
                ERRORS.append(f'{where}: ô trống cần 4 lựa chọn khác nhau: {part}')
            answer = opts[0]
            ans = jdsl.pieces(answer, f'{where} ô "{answer}"')
            reading = ''.join(p.get('r', p['t']) for p in ans)
            piece = {'t': jdsl.plain(answer)}
            if reading != piece['t']:
                piece['r'] = reading
            blanks.append({'piece': len(pieces), 'options': [jdsl.plain(o) for o in opts], 'answer': 0})
            pieces.append(piece)
        else:
            pieces.extend(jdsl.pieces(part, where))
    for p in pieces:
        if re.search(r'[0-9０-９]', p['t']) and 'r' not in p:
            ERRORS.append(f'{where}: chữ số "{p["t"]}" cần cách đọc, ghi [{p["t"]}|...]')
    if not meaning.strip():
        ERRORS.append(f'{where}: thiếu nghĩa tiếng Việt')
    return {'sp': sp, 'pieces': pieces, 'meaning': meaning}, blanks


def conversation(code: str, kind: str, title: str, situation: str, lines: list, patterns: list[str]):
    """Một hội thoại của bài đang `setup`. `lines`: [(M/F, câu, nghĩa)]. `patterns`: mã mẫu ngữ pháp dùng trong hội thoại."""
    rule = KIND[kind]
    out_lines, out_blanks = [], []
    for i, (sp, text, meaning) in enumerate(lines):
        line, blanks = _line(f'{code} lượt {i + 1}', sp, text, meaning)
        out_lines.append(line)
        out_blanks.extend({'line': i, **b} for b in blanks)
    lo, hi = rule['lines']
    if not lo <= len(out_lines) <= hi:
        ERRORS.append(f'{code}: {kind} cần {lo}–{hi} lượt, có {len(out_lines)}')
    lo, hi = rule['blanks']
    if not lo <= len(out_blanks) <= hi:
        ERRORS.append(f'{code}: {kind} cần {lo}–{hi} ô, có {len(out_blanks)}')
    for code_p in patterns:
        if code_p not in POINTS:
            ERRORS.append(f'{code}: không có mẫu {code_p}')
        elif POINTS[code_p][0] > LESSON:
            ERRORS.append(f'{code}: mẫu {code_p} thuộc bài {POINTS[code_p][0]} > {LESSON}')
    return {'code': code, 'lesson': LESSON, 'kind': kind, 'title': title, 'situation': situation, 'lines': out_lines, 'blanks': out_blanks, 'patterns': patterns}


def write(name: str, items: list[dict], approved: bool = False):
    """Ghi parts/<name>.json. `approved`: chủ dự án đã duyệt (app chỉ dùng hội thoại đã duyệt)."""
    for it in items:
        it['approved'] = approved
    if ERRORS:
        print('LỖI:')
        for e in ERRORS:
            print('  ' + e)
        raise SystemExit(1)
    codes = [i['code'] for i in items]
    if len(set(codes)) != len(codes):
        raise SystemExit('mã trùng')
    out = HERE / 'parts' / f'{name}.json'
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(items, ensure_ascii=False, indent=1) + '\n')
    print(f'Đã ghi {out.relative_to(ROOT)}: {len(items)} hội thoại, {sum(len(i["lines"]) for i in items)} lượt, {sum(len(i["blanks"]) for i in items)} ô')


def combine():
    """Gộp parts/*.json thành data/listening/conversations.json (app nhập file này)."""
    items = []
    for f in sorted((HERE / 'parts').glob('*.json')):
        items.extend(json.loads(f.read_text()))
    items.sort(key=lambda i: (i['lesson'], i['code']))
    (ROOT / 'data' / 'listening' / 'conversations.json').write_text(json.dumps(items, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'data/listening/conversations.json: {len(items)} hội thoại')


if __name__ == '__main__':
    combine()
