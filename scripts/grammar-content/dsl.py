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
    ('P', 'を'): (['へ', 'の', 'か'], [], None, None),  # không dùng に: 手紙に書きます, 朝ごはんに食べます vẫn đúng
    ('P', 'が'): (['を', 'に', 'の'], [], None, None),
    ('P', 'や'): (['を', 'に', 'で'], [], None, None),
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
    6: ['を', 'ましょう'],
    7: ['語', 'ご'],
    8: ['な', 'が'],
    9: ['が', 'から'],
    10: ['や', 'に'],
    12: ['でした', 'より', 'ほう'],
    15: ['いけません'],
}
# Tính từ い (bài 8+): thêm thể phủ định ～くない. いい → よくない. きれい là tính từ な nên không có ở đây.
I_ADJ = {'みにくい', '大きい', '小さい', '新しい', '古い', '悪い', '熱い', '冷たい', '暑い', '寒い', '難しい', 'きびしい', 'やさしい',
         '高い', '安い', '低い', 'おもしろい', 'おいしい', '忙しい', '楽しい', '白い', '黒い', '赤い', '青い'}
NA_ADJ = {'ハンサム', 'きれい', '静か', '賑やか', 'にぎやか', '有名', '親切', '元気', '暇', '便利', 'すてき', '好き', '嫌い', '上手', '下手', 'いろいろ'}
I_ADJ_NEG = {'いい': ('よくない', 'よくない'), 'いい2': ('よくありません', 'よくありません')}

# Nhóm động từ / tính từ (G5, JMdict): chia thể て, ～たい, quá khứ tính từ đúng theo nhóm.
# Cùng cách viết có thể là hai từ (降ります: ふります / おります): duyệt VERB_LIST, tra VERBS lấy từ đầu tiên
VERB_LIST = json.load(open(ROOT / 'data' / 'n5' / 'verbs.json', encoding='utf-8'))['words']
VERBS = {}
for _w in VERB_LIST:
    VERBS.setdefault(_w['expression'], _w)
I_ADJ |= {w['expression'] for w in VERB_LIST if w['kind'] == 'adj-i'}
NA_ADJ |= {w['expression'] for w in VERB_LIST if w['kind'] == 'adj-na'}
VERB_KINDS = ('v5', 'v1', 'suru', 'kuru', 'v5-iku', 'v5-aru')
GODAN_TE = {'う': 'って', 'つ': 'って', 'る': 'って', 'む': 'んで', 'ぶ': 'んで', 'ぬ': 'んで', 'く': 'いて', 'ぐ': 'いで', 'す': 'して'}


def te_of(dict_form, kind):
    """Thể て từ thể từ điển (chữ hoặc cách đọc)."""
    if kind == 'v1':
        return dict_form[:-1] + 'て'
    if kind == 'suru':
        return dict_form[:-2] + 'して'
    if kind == 'kuru':
        return dict_form[:-2] + ('来て' if dict_form.endswith('来る') else 'きて')
    if kind == 'v5-iku':
        return dict_form[:-1] + 'って'
    return dict_form[:-1] + GODAN_TE[dict_form[-1]]


def ta_of(dict_form, kind):
    te = te_of(dict_form, kind)
    return te[:-1] + ('だ' if te.endswith('で') else 'た')


# Thể て đã học → thể ます (để biết chỗ [F] là thể て của động từ nào)
TE_FORMS = {}


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
                # Động từ thể ます: thêm 3 thể còn lại (bài 6+: thêm ～ましょう)
                if expr.endswith('ます') and lesson >= 4:
                    suffixes = [x for x, _ in VERB_FORMS[1:]] + (['ましょう'] if lesson >= 6 else [])
                    for suffix in suffixes:
                        tokens.update([expr[:-2] + suffix, kana[:-2] + suffix])
                        self.reading.setdefault(expr[:-2] + suffix, kana[:-2] + suffix)
                # Tính từ い: thêm ～くない
                if lesson >= 8 and int(r['lesson']) >= 7 and kana.endswith('い') and kana != 'きれい' and r['expression'] not in ('いい',) and self.is_adj(r):
                    for tail in ('くない', 'くありません'):
                        neg_t, neg_r = expr[:-1] + tail, kana[:-1] + tail
                        tokens.update([neg_t, neg_r])
                        self.reading.setdefault(neg_t, neg_r)
        # Bài 12+: quá khứ tính từ い (～かった, ～くなかった, ～くありませんでした)
        # Bài 13+: ～たい và gốc động từ (買いに行きます). Bài 14+: thể て.
        for w in VERB_LIST:
            expr = w['expression']
            if w['lesson'] > lesson:
                continue
            kana = w['reading']
            if lesson >= 12 and w['kind'] in ('adj-i', 'adj-ii'):
                st, sr = (expr[:-2] + 'よ', kana[:-2] + 'よ') if w['kind'] == 'adj-ii' else (expr[:-1], kana[:-1])
                for tail in ('かった', 'くなかった', 'くありませんでした'):
                    self.add(tokens, st + tail, sr + tail)
            if w['kind'] in VERB_KINDS and expr.endswith('ます'):
                if lesson >= 13:
                    self.add(tokens, expr[:-2], kana[:-2])
                    # Danh từ của động từ ～します dùng một mình: 散歩に行きます, 食事に行きます
                    if w['kind'] == 'suru' and len(expr) > 3:
                        self.add(tokens, expr[:-3], kana[:-3])
                    for tail in ('たい', 'たくない', 'たかった', 'たくなかった'):
                        self.add(tokens, expr[:-2] + tail, kana[:-2] + tail)
                if lesson >= 14:
                    te_w, te_r = te_of(w['dict'], w['kind']), te_of(w['dictReading'], w['kind'])
                    self.add(tokens, te_w, te_r)
                    TE_FORMS.setdefault(te_w, (expr, w))
        if lesson >= 8:
            for neg_t, neg_r in I_ADJ_NEG.values():
                tokens.update([neg_t, neg_r])
                self.reading.setdefault(neg_t, neg_r)
        self.tokens = tokens
        self.maxlen = max(len(t) for t in tokens)
        self.errors = []

    def add(self, tokens, written, reading):
        tokens.update([written, reading])
        self.reading.setdefault(written, reading)

    @staticmethod
    def is_adj(r):
        # Tính từ い của bài 7–8 (nghĩa là tính chất, không phải danh từ/câu chào kết thúc bằng い)
        return r['expression'] in I_ADJ

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
            # Số; từ Latin (đáp án của 「～」は英語で何ですか, bài 7+)
            m = re.match(r'[0-9０-９,]+', text[i:]) or (re.match(r"[A-Za-zÀ-ỹ'’.!?]+", text[i:]) if self.lesson >= 7 else None)
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


def special_slot(text):
    """Thể của bài 6+ (đáp án nhiễu là thể quá khứ: câu phải có từ chỉ tương lai như あした, 来週).
    - ～ませんか (mời), ～ましょう (rủ): nhiễu là 3 dạng quá khứ của cùng động từ.
    - ～くない (phủ định tính từ い): nhiễu là dạng sai thường gặp, soạn trong câu.
    """
    if text.endswith('ませんか'):
        stem = text[:-4]
        return [stem + 'ましたか', stem + 'ませんでしたか', stem + 'ましたよ'], 'lời mời (ませんか)', stem + 'ます'
    if text.endswith('ましょう'):
        stem = text[:-4]
        return [stem + 'ました', stem + 'ませんでした', stem + 'ましたか'], 'rủ (ましょう)', stem + 'ます'
    for tail, label in (('たくない', 'không muốn (たくない)'), ('たい', 'muốn (たい)')):
        if text.endswith(tail) and text[:-len(tail)] + 'ます' in VERBS:
            stem = text[:-len(tail)]
            w = VERBS[stem + 'ます']
            # Câu luôn có です sau chỗ này: 食べますです, 食べたくです, 食べるたいです đều sai
            return [stem + 'ます', '*' + stem + 'たく', '*' + w['dict'] + 'たい'], label, stem + 'ます'
    if text in TE_FORMS:
        masu, w = TE_FORMS[text]
        return te_distractors(text, masu, w), 'thể て', masu
    return None


def te_distractors(te, masu, w):
    """Thể て sai thường gặp: gốc ます + て (書きて), và các đuôi て của nhóm I khác (書って, 書んで)."""
    stem = masu[:-2]
    base = w['dict'][:-1]
    wrong = [w['dict'] + 'て', stem + 'て', stem + 'って'] + [base + e for e in ('って', 'んで', 'いて', 'して')]
    out = []
    for x in wrong:
        if x != te and x not in out:
            out.append(x)
    return ['*' + x for x in out[:3]]


def adj_form(text):
    """Thể và dạng từ điển của tính từ ở chỗ [F] (bài 8+): 高いです, 高くないです, 静かです, 静かじゃありません."""
    if text == 'でした':
        return 'quá khứ', 'です'
    if text == 'じゃありませんでした':
        return 'quá khứ phủ định', 'です'
    body = text[:-2] if text.endswith('です') and not text.endswith('じゃありません') else text
    # Tra danh sách tính từ để không nhầm với ～たかった của động từ (食べたかった), và vẫn đúng với 冷たかった
    for tail, label in (('くなかった', 'quá khứ phủ định'), ('かった', 'quá khứ')):
        if body.endswith(tail):
            st = body[:-len(tail)]
            if st == 'よ':
                return label, 'いい'
            if st + 'い' in I_ADJ:
                return label, st + 'い'
    if body in ('よくない',):
        return 'phủ định', 'いい'
    if body.endswith('くない') and body[:-3] + 'い' in I_ADJ:
        return 'phủ định', body[:-3] + 'い'
    if body in I_ADJ or body == 'いい':
        return 'khẳng định', body
    if body.endswith('じゃありません') and body[:-7] in NA_ADJ:
        return 'phủ định', body[:-7]
    if body in NA_ADJ:
        return 'khẳng định', body
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
            elif mark == 'F' and special_slot(text):
                distractors, form, dict_form = special_slot(text)
            elif mark == 'F' and verb_slot(text):
                distractors, form, dict_form = verb_slot(text)
            else:
                raise ValueError(f'{where}: chưa có đáp án nhiễu cho {(mark, text)}')
            # Tính từ xét trước động từ: きれいじゃありません không phải động từ ～ません
            if mark == 'F' and form is None and adj_form(text):
                form, dict_form = adj_form(text)
            if mark == 'F' and form is None and special_slot(text):
                _, form, dict_form = special_slot(text)
            if mark == 'F' and form is None and verb_slot(text):
                _, form, dict_form = verb_slot(text)
            if mark == 'F' and form is None:
                raise ValueError(f'{where}: chỗ [F] "{text}" không suy được thể; ghi thể vào bảng hoặc dùng [W]')
            # Nhiễu bắt đầu bằng * là dạng sai cố ý (高いじゃありません): không kiểm tra từ vựng
            for d in [x for x in distractors if not x.startswith('*')] + accepted:
                VOCAB.check(f'{where} nhiễu', d)
            distractors = [x.lstrip('*') for x in distractors]
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
            if not w.startswith('*'):  # * là câu sai dạng cố ý (いいえ、きれいくないです。)
                VOCAB.check(f'{code} câu đáp sai', w)
        wrong = [w.lstrip('*') for w in wrong]
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
