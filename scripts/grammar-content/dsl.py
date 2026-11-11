"""Soạn nội dung ngữ pháp bằng cú pháp gọn, xuất data/grammar/lesson-NN.json (định dạng lib/grammar/types.ts).

Một câu: mảnh cách nhau bằng '|'.
- Cách đọc: mảnh là từ trong lộ trình thì tự lấy cách đọc từ data/n5/vocabularies.csv; động từ đã chia (寝ません) tự suy
  từ thể ます. Mảnh khác có Kanji thì ghi cách đọc trong {}: 7時{しちじ}.
- Chỗ được hỏi: [P] trợ từ, [F] dạng です/động từ, [W] từ/hậu tố. Đáp án nhiễu lấy từ bảng DISTRACTORS, hoặc ghi ngay:
  [P:の,と,か/に]へ  → nhiễu の, と, か; に cũng đúng (accepted). Động từ [F] tự lấy 3 thể còn lại của cùng động từ.
- Từ vựng: mọi chữ (câu, câu hỏi, đáp án nhiễu, câu đáp sai) phải tách được thành từ của bài ≤ bài đang soạn,
  trợ từ/đuôi đã học, tên nhân vật hoặc số. Không tách được là LỖI (chủ dự án: chỉ dùng từ đã học).
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# (loại, đáp án) -> (đáp án nhiễu, cách viết khác cũng đúng, thể, dạng từ điển)
DISTRACTORS = {
    ('P', 'は'): (['も', 'の', 'か'], [], None, None),
    ('P', 'も'): (['は', 'の', 'か'], [], None, None),
    ('P', 'の'): (['は', 'も', 'か'], [], None, None),
    ('P', 'か'): (['は', 'も', 'の'], [], None, None),
    ('F', 'です'): (['じゃありません', 'ですか', 'じゃ'], [], 'khẳng định', 'です'),
    ('F', 'じゃありません'): (['です', 'ですか', 'じゃ'], ['ではありません'], 'phủ định', 'です'),
    ('F', 'ですか'): (['です', 'じゃありません', 'じゃ'], [], 'nghi vấn', 'です'),
    ('W', 'さん'): (['人', '歳', 'の'], [], None, None),
    ('W', '人'): (['さん', '歳', 'の'], [], None, None),
    ('W', '歳'): (['人', 'さん', 'の'], [], None, None),
    ('W', 'これ'): (['それ', 'あれ', 'この'], [], None, None),
    ('W', 'それ'): (['これ', 'あれ', 'その'], [], None, None),
    ('W', 'あれ'): (['これ', 'それ', 'あの'], [], None, None),
    ('W', 'この'): (['これ', 'その', 'あの'], [], None, None),
    ('W', 'その'): (['それ', 'この', 'あの'], [], None, None),
    ('W', 'あの'): (['あれ', 'この', 'その'], [], None, None),
    ('W', 'ここ'): (['そこ', 'あそこ', 'どこ'], [], None, None),
    ('W', 'そこ'): (['ここ', 'あそこ', 'どこ'], [], None, None),
    ('W', 'あそこ'): (['ここ', 'そこ', 'どこ'], [], None, None),
    ('W', 'こちら'): (['そちら', 'あちら', 'どちら'], [], None, None),
    ('W', 'そちら'): (['こちら', 'あちら', 'どちら'], [], None, None),
    ('W', 'あちら'): (['こちら', 'そちら', 'どちら'], [], None, None),
    ('W', 'どこ'): (['ここ', 'そこ', 'あそこ'], [], None, None),
    ('W', 'どちら'): (['こちら', 'そちら', 'あちら'], [], None, None),
    ('W', 'いくら'): (['どこ', '何', '誰'], [], None, None),
    ('W', '円'): (['歳', '人', '階'], [], None, None),
    ('P', 'に'): (['の', 'か', 'と'], [], None, None),
    ('P', 'と'): (['の', 'は', 'に'], [], None, None),
    ('P', 'ね'): (['か', 'は', 'も'], [], None, None),
    ('P', 'から'): (['に', 'の', 'も'], [], None, None),
    ('P', 'まで'): (['の', 'も', 'か'], [], None, None),
    ('W', '時'): (['分', '半', '歳'], [], None, None),
    ('W', '分'): (['時', '半', '歳'], [], None, None),
    ('W', '半'): (['時', '分', '歳'], [], None, None),
    ('W', 'いつ'): (['どこ', '何', '誰'], [], None, None),
    ('P', 'よ'): (['か', 'は', 'も'], [], None, None),
}
KIND = {'P': 'particle', 'F': 'form', 'W': 'word'}
PIECE = re.compile(r'^(?:\[(P|F|W)(?::([^\]]*))?\])?([^{}]+?)(?:\{([^{}]+)\})?$')
KANJI = re.compile(r'[一-鿿㐀-䶿々〆]')
VERB_FORMS = [('ます', 'khẳng định'), ('ません', 'phủ định'), ('ました', 'quá khứ'), ('ませんでした', 'quá khứ phủ định')]

# Tên nhân vật (không phải từ vựng) và trợ từ/đuôi theo bài (cộng dồn)
NAMES = ['ミラー', 'サントス', 'カリナ', 'ワン', 'タワポン', 'シュミット', 'マリア', 'イー', 'グプタ', 'テレサ', 'たろう']
FUNCTION = {
    1: ['は', 'も', 'の', 'か', 'です', 'じゃ', 'ありません', 'では', '、', '。', 'さん', 'ちゃん', 'くん', '人', 'じん', '歳', 'さい'],
    2: ['そう', '「', '」'],
    3: ['円', 'えん'],
    4: ['に', 'から', 'まで', 'と', 'ね', 'ます', 'ません', 'ました', 'ませんでした', '時', 'じ', '分', 'ふん', 'ぷん', '半', 'はん'],
    5: ['へ', 'で', 'よ', '月', 'がつ', '日', 'にち', 'か'],
}


class Vocab:
    def __init__(self, lesson):
        self.lesson = lesson
        self.reading = {}
        tokens = set(NAMES)
        for n, words in FUNCTION.items():
            if n <= lesson:
                tokens.update(words)
        with open(ROOT / 'data' / 'n5' / 'vocabularies.csv', encoding='utf-8') as f:
            for r in csv.DictReader(f):
                if int(r['lesson']) > lesson:
                    continue
                expr, kana = r['expression'], r['reading_kana']
                self.reading.setdefault(expr, kana)
                tokens.update([expr, kana])
                # Động từ thể ます: thêm 3 thể còn lại
                if expr.endswith('ます') and lesson >= 4:
                    for suffix, _ in VERB_FORMS[1:]:
                        tokens.update([expr[:-2] + suffix, kana[:-2] + suffix])
                        self.reading.setdefault(expr[:-2] + suffix, kana[:-2] + suffix)
        self.tokens = tokens
        self.maxlen = max(len(t) for t in tokens)
        self.errors = []

    def read(self, text):
        """Cách đọc của mảnh có Kanji: tra từ vựng, hoặc tách thành các từ rồi ghép cách đọc."""
        if text in self.reading:
            return self.reading[text]
        parts = self.split(text)
        if parts is None:
            return None
        out = []
        for p in parts:
            if KANJI.search(p):
                if p not in self.reading:
                    return None
                out.append(self.reading[p])
            else:
                out.append(p)
        return ''.join(out)

    def split(self, text):
        """Tách chữ thành các từ đã học (quy hoạch động). None nếu không tách được."""
        text = text.replace(' ', '').replace('　', '')
        n = len(text)
        best = [None] * (n + 1)
        best[0] = []
        for i in range(n):
            if best[i] is None:
                continue
            m = re.match(r'[0-9０-９,]+', text[i:])
            if m:
                j = i + len(m.group(0))
                if best[j] is None:
                    best[j] = best[i] + [m.group(0)]
            for j in range(min(n, i + self.maxlen), i, -1):
                if best[j] is None and text[i:j] in self.tokens:
                    best[j] = best[i] + [text[i:j]]
        return best[n]

    def check(self, where, text):
        if self.split(text) is None:
            self.errors.append(f'{where}: "{text}" có từ chưa học (bài ≤ {self.lesson})')


VOCAB = None


def use_lesson(lesson):
    global VOCAB
    VOCAB = Vocab(lesson)


def verb_slot(text):
    for suffix, form in sorted(VERB_FORMS, key=lambda x: -len(x[0])):
        if text.endswith(suffix):
            stem = text[: -len(suffix)]
            others = [stem + s for s, _ in VERB_FORMS if s != suffix]
            return others, form, stem + 'ます'
    return None


def parse(src, where):
    pieces, slots = [], []
    for i, raw in enumerate(src.split('|')):
        m = PIECE.match(raw)
        if not m:
            raise ValueError(f'mảnh sai: {raw!r} trong {src!r}')
        mark, inline, text, reading = m.groups()
        piece = {'t': text}
        if KANJI.search(text):
            reading = reading or VOCAB.read(text)
            if not reading:
                raise ValueError(f'{where}: không biết cách đọc của "{text}", ghi {{...}}')
            piece['r'] = reading
        pieces.append(piece)
        VOCAB.check(where, text)
        if mark:
            accepted, form, dict_form = [], None, None
            if inline is not None:
                d, _, acc = inline.partition('/')
                distractors = [x for x in d.split(',') if x]
                accepted = [x for x in acc.split(',') if x]
            elif (mark, text) in DISTRACTORS:
                distractors, accepted, form, dict_form = DISTRACTORS[(mark, text)]
            elif mark == 'F' and verb_slot(text):
                distractors, form, dict_form = verb_slot(text)
            else:
                raise ValueError(f'{where}: chưa có đáp án nhiễu cho {(mark, text)}')
            if mark == 'F' and form is None and verb_slot(text):
                _, form, dict_form = verb_slot(text)
            for d in distractors + accepted:
                VOCAB.check(f'{where} nhiễu', d)
            slot = {'kind': KIND[mark], 'piece': i, 'distractors': list(distractors)}
            if accepted:
                slot['accepted'] = list(accepted)
            if form:
                slot['form'] = form
                slot['dict'] = dict_form
            slots.append(slot)
    return pieces, slots


def sentence(point_code, n, level, src, meaning, uses=None, prompt=None, sample=False):
    code = f'{point_code}-s{n:02d}'
    pieces, slots = parse(src, code)
    s = {'code': code, 'level': level, 'pieces': pieces, 'meaning': meaning}
    if uses:
        s['uses'] = uses
    if slots:
        s['slots'] = slots
    if prompt:
        p_src, p_meaning, wrong = prompt
        p_pieces, _ = parse(p_src, f'{code} câu hỏi')
        for w in wrong:
            VOCAB.check(f'{code} câu đáp sai', w)
        s['prompt'] = {'pieces': p_pieces, 'meaning': p_meaning, 'distractors': wrong}
    if sample:
        s['sample'] = True
    return s


def point(lesson, order, pattern, meaning, explanation, rows, notes=None, approved=False, samples=(1, 6, 12, 18, 25)):
    """rows: [(src, meaning, uses?, prompt?)], 30 dòng; mức 1 = dòng 1–10, mức 2 = 11–20, mức 3 = 21–30."""
    code = f'g{lesson:02d}-{order:02d}'
    if len(rows) != 30:
        raise ValueError(f'{code}: có {len(rows)} câu, cần 30')
    sentences = []
    for i, row in enumerate(rows, start=1):
        src, mean = row[0], row[1]
        uses = row[2] if len(row) > 2 else None
        prompt = row[3] if len(row) > 3 else None
        level = 1 if i <= 10 else 2 if i <= 20 else 3
        sentences.append(sentence(code, i, level, src, mean, uses, prompt, i in samples))
    p = {'code': code, 'order': order, 'pattern': pattern, 'meaning': meaning, 'explanation': explanation, 'approved': approved, 'sentences': sentences}
    if notes:
        p['notes'] = notes
    return p


def write(lesson, points):
    if VOCAB.errors:
        raise SystemExit('Từ chưa học:\n  ' + '\n  '.join(VOCAB.errors))
    path = ROOT / 'data' / 'grammar' / f'lesson-{lesson:02d}.json'
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'lesson': lesson, 'points': points}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'Đã ghi {path.relative_to(ROOT)}: {len(points)} mẫu, {sum(len(p["sentences"]) for p in points)} câu')
