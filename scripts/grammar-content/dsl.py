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
    17: ['なりません'],
    18: ['こと'],
    20: ['だ', 'じゃない', 'だった', 'じゃなかった', 'ね', 'よ', 'の', '？', 'いけない'],
    21: ['と', 'でしょう', 'でも'],
    23: ['とき', 'と'],
    25: ['ら', 'たら', 'ても', 'でも', 'だったら', 'じゃなかったら'],
    26: ['ん', 'んです', 'んですか', 'んですが', 'いただけませんか', 'いいですか'],
    27: ['しか', 'は'],
    28: ['ながら', 'し'],
    29: ['しまいます', 'しまいました', 'しまいません', 'しまう', 'しまった', 'しまって', 'しまったら', 'しまいたい', 'しまいましょう'],
    30: ['おきます', 'おきました', 'おきましょう', 'おく', 'おいた', 'おいて', 'おかなければ', 'あります', 'ある'],
    31: ['つもり'],
    32: ['かもしれません', 'かもしれない', 'でしょう'],
    33: ['という', 'と'],
    34: ['とおり', 'とおりに', 'あと', 'あとで'],
    35: ['なら', 'ほど'],
    36: ['よう', 'ように'],
    39: ['ので', 'なので'],
    40: ['か', 'かどうか', 'どうか', 'みます', 'みました', 'みましょう', 'みたい', 'みて', 'みる', 'みた', 'みても', 'さ'],
    41: ['くださいませんか', 'やります', 'やりました', 'くださる', 'くださった', 'くださって', 'いただく', 'いただいた', 'いただいて', 'いただける', 'いただきたい', 'いただいたら'],
    42: ['ため', 'ために', 'のに'],
    43: ['そう', 'そうな', 'そうに', 'きます', 'きました', 'きて', 'くる', 'きた', 'きましょう'],
    44: ['すぎ'],
    45: ['場合', 'ばあい', 'のに'],
    46: ['ところ', 'ばかり', 'はず'],
    47: ['よう', 'ようです', 'ような', 'ように', 'そうです'],
    49: ['お', 'ご', 'になります', 'になりました', 'ください', 'いらっしゃる', 'いらっしゃった', 'いらっしゃったら', 'いらっしゃって',
         'おっしゃる', 'おっしゃった', 'なさる', 'なさって', 'なさった', 'ご覧になった', 'ご存じ', '召し上がらない', '召し上がって', '召し上がった'],
    50: ['お', 'ご', 'します', 'しました', 'しましょう', 'しましょうか', 'でございます', 'ございます', '存じて', 'お目にかかった',
         'お目にかかりたい'],
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


GODAN_A = {'う': 'わ', 'く': 'か', 'ぐ': 'が', 'す': 'さ', 'つ': 'た', 'ぬ': 'な', 'ぶ': 'ば', 'む': 'ま', 'る': 'ら'}


def nai_of(dict_form, kind):
    """Thể ない từ thể từ điển (chữ hoặc cách đọc)."""
    if kind == 'v1':
        return dict_form[:-1] + 'ない'
    if kind == 'suru':
        return dict_form[:-2] + 'しない'
    if kind == 'kuru':
        return dict_form[:-2] + ('来ない' if dict_form.endswith('来る') else 'こない')
    if kind == 'v5-aru':
        return dict_form[:-2] + 'ない'
    return dict_form[:-1] + GODAN_A[dict_form[-1]] + 'ない'


# Thể て đã học → thể ます (để biết chỗ [F] là thể て của động từ nào)
TE_FORMS = {}
# Các thể khác (bài 17+): chữ → (tên thể, thể ます, từ, nhiễu)
CONJ_FORMS = {}


GODAN_E = {'う': 'え', 'く': 'け', 'ぐ': 'げ', 'す': 'せ', 'つ': 'て', 'ぬ': 'ね', 'ぶ': 'べ', 'む': 'め', 'る': 'れ'}


def pot_of(dict_form, kind):
    """Gốc thể khả năng (bài 27): 書け, 食べられ, 勉強でき, 来られ. None nếu không có (ある)."""
    if kind == 'v1':
        return dict_form[:-1] + 'られ'
    if kind == 'suru':
        return dict_form[:-2] + 'でき'
    if kind == 'kuru':
        return dict_form[:-2] + ('来られ' if dict_form.endswith('来る') else 'こられ')
    if kind == 'v5-aru':
        return None
    return dict_form[:-1] + GODAN_E[dict_form[-1]]


def pot_wrong(w):
    """Gốc khả năng chia sai thường gặp (không dùng ら抜き 食べれ vì văn nói vẫn gặp)."""
    d, k, stem = w['dict'], w['kind'], w['expression'][:-2]
    if k == 'v1':
        return [d + 'られ', stem + 'らえ', d + 'れ']
    if k == 'suru':
        return [d[:-2] + 'しられ', d[:-2] + 'すられ', d[:-2] + 'しえ']
    if k == 'kuru':
        return [d + 'られ', stem + 'れれ', d + 'れ']
    return [stem + 'られ', d + 'られ', d + 'れ']


POT_TAILS = ['ます', 'ません', 'ました', 'ませんでした', 'る', 'ない', 'なかった', 'た', 'なくて', 'ても', 'たら']


def conj_forms(w, lesson):
    """Các thể (chữ, cách đọc, tên thể, nhiễu) của động từ w đã mở tới bài lesson."""
    out = []
    d, dr, k = w['dict'], w['dictReading'], w['kind']
    masu, stem = w['expression'], w['expression'][:-2]
    nai, nair = nai_of(d, k), nai_of(dr, k)
    te = te_of(d, k)
    ta, tar = ta_of(d, k), ta_of(dr, k)
    if lesson >= 17:
        out += [
            (nai, nair, 'thể ない', [stem + 'ない', d + 'ない', stem + 'らない', d + 'らない']),
            (nai[:-1] + 'ければ', nair[:-1] + 'ければ', 'なければ', [stem + 'なければ', d + 'なければ', nai + 'ければ', stem + 'らなければ']),
            (nai[:-1] + 'くても', nair[:-1] + 'くても', 'なくても', [stem + 'なくても', d + 'なくても', nai + 'ても', stem + 'らなくても']),
        ]
    if lesson >= 18:
        # Thể た chưa học ở bài 18: nhiễu là thể ます, thể て và dạng chia sai (書くる)
        out.append((d, dr, 'thể từ điển', ['=' + masu, '=' + te, stem + 'る', d + 'る']))
    if lesson >= 19:
        out += [
            (ta, tar, 'thể た', [stem + 'た', d + 'た', stem + 'った', '=' + te]),
            (ta + 'り', tar + 'り', 'thể たり', [stem + 'たり', d + 'たり', te + 'り', stem + 'ったり']),
        ]
    if lesson >= 20:
        out.append((nai[:-1] + 'かった', nair[:-1] + 'かった', 'thể なかった', [stem + 'なかった', d + 'なかった', nai + 'かった', stem + 'らなかった']))
    if lesson >= 25:
        ter = te_of(dr, k)
        out += [
            (ta + 'ら', tar + 'ら', 'thể たら', [stem + 'たら', d + 'たら', te + 'ら', stem + 'ったら']),
            (te + 'も', ter + 'も', 'thể ても', [stem + 'ても', d + 'ても', ta + 'も', stem + 'っても']),
            (nai[:-1] + 'かったら', nair[:-1] + 'かったら', 'thể なかったら', [stem + 'なかったら', d + 'なかったら', nai + 'かったら', stem + 'らなかったら']),
        ]
    if lesson >= 27:
        ps, psr = pot_of(d, k), pot_of(dr, k)
        if ps:
            for tail in POT_TAILS:
                out.append((ps + tail, psr + tail, 'khả năng', [x + tail for x in pot_wrong(w)]))
            out.append((ps + 'て', psr + 'て', 'khả năng (て)', [x + 'て' for x in pot_wrong(w)]))
    if lesson >= 28:
        out.append((stem + 'ながら', w['reading'][:-2] + 'ながら', 'ながら', [d + 'ながら', te + 'ながら', ta + 'ながら']))
    if lesson >= 31 and k != 'v5-aru':
        out.append((vol_of(d, k), vol_of(dr, k), 'ý chí', vol_wrong(w)))
    if lesson >= 33 and k != 'v5-aru':
        out += [
            (imp_of(d, k), imp_of(dr, k), 'mệnh lệnh', imp_wrong(w)),
            (d + 'な', dr + 'な', 'cấm (な)', [d + 'るな', stem + 'るな', stem + 'ろな', stem + 'らな']),
        ]
    if lesson >= 34:
        out.append((nai + 'で', nair + 'で', 'ないで', [stem + 'ないで', d + 'ないで', nai + 'て', stem + 'らないで']))
    if lesson >= 35:
        out.append((ba_of(d, k), ba_of(dr, k), 'thể ば', ba_wrong(w)))
    if lesson >= 37 and k != 'v5-aru':
        ps, psr = pass_of(d, k), pass_of(dr, k)
        for tail in PASS_TAILS:
            out.append((ps + tail, psr + tail, 'bị động', [x + tail for x in pass_wrong(w)]))
    if lesson >= 39:
        out.append((nai[:-1] + 'くて', nair[:-1] + 'くて', 'なくて', [stem + 'なくて', d + 'なくて', nai + 'て', stem + 'らなくて']))
    rstem = w['reading'][:-2]
    if lesson >= 43:
        # Không dùng 降るそう, 降ったそう (nghe nói, bài 47), 降らなそう (văn nói) làm nhiễu
        out.append((stem + 'そう', rstem + 'そう', 'そう (trông có vẻ)', [d + 'りそう', stem + 'さそう', d + 'さそう']))
    if lesson >= 44:
        for tail in ('ます', 'ました', 'ません', 'て', 'る', 'た', 'ない', 'たら'):
            out.append((stem + 'すぎ' + tail, rstem + 'すぎ' + tail, 'すぎます', [d + 'すぎ' + tail, te + 'すぎ' + tail, stem + 'りすぎ' + tail]))
        for tail in ('やすい', 'にくい', 'やすく', 'にくく', 'やすかった', 'にくかった'):
            out.append((stem + tail, rstem + tail, tail[:3] if tail.startswith('やす') else tail[:3], [d + tail, te + tail, stem + 'り' + tail]))
    if lesson >= 48 and k != 'v5-aru':
        cs, csr = caus_of(d, k), caus_of(dr, k)
        for tail in CAUS_TAILS:
            out.append((cs + tail, csr + tail, 'sai khiến', [x + tail for x in caus_wrong(w)]))
    if lesson >= 49 and k in ('v5', 'v5-iku', 'v1'):
        for tail in ('になります', 'になりました', 'ください', 'します', 'しました', 'しましょうか', 'になって', 'になった', 'になったら', 'になる', 'になりますか', 'しましょう', 'する', 'した'):
            out.append(('お' + stem + tail, 'お' + rstem + tail, ('khiêm nhường (お～)' if tail.startswith('し') or tail in ('する', 'した') else 'kính ngữ (お～)'), ['お' + d + tail, 'お' + te + tail, 'お' + stem + 'り' + tail]))
    return out


CAUS_TAILS = ['ます', 'ません', 'ました', 'る', 'た', 'て', 'ない', 'てください', 'たい', 'よう']


def caus_of(dict_form, kind):
    """Gốc sai khiến (bài 48): 行かせ, 食べさせ, させ, 来させ."""
    if kind == 'v1':
        return dict_form[:-1] + 'させ'
    if kind == 'suru':
        return dict_form[:-2] + 'させ'
    if kind == 'kuru':
        return dict_form[:-2] + ('来させ' if dict_form.endswith('来る') else 'こさせ')
    return dict_form[:-1] + GODAN_A[dict_form[-1]] + 'せ'


def caus_wrong(w):
    d, k, stem = w['dict'], w['kind'], w['expression'][:-2]
    if k == 'v1':
        return [d + 'させ', stem + 'せ', stem + 'らせ']
    if k == 'suru':
        return [d[:-2] + 'しさせ', d[:-2] + 'するさせ', d[:-2] + 'させさせ']
    if k == 'kuru':
        return [d + 'させ', stem + 'せ', stem + 'らせ']
    return [stem + 'させ', d + 'させ', stem + 'せ']


GODAN_O = {'う': 'お', 'く': 'こ', 'ぐ': 'ご', 'す': 'そ', 'つ': 'と', 'ぬ': 'の', 'ぶ': 'ぼ', 'む': 'も', 'る': 'ろ'}
PASS_TAILS = ['ます', 'ません', 'ました', 'ませんでした', 'る', 'た', 'て', 'ない', 'ても', 'たら']


def _godan(dict_form, kind):
    return kind in ('v5', 'v5-iku', 'v5-aru')


def vol_of(dict_form, kind):
    """Thể ý chí (bài 31): 行こう, 食べよう, しよう, 来よう."""
    if kind == 'v1':
        return dict_form[:-1] + 'よう'
    if kind == 'suru':
        return dict_form[:-2] + 'しよう'
    if kind == 'kuru':
        return dict_form[:-2] + ('来よう' if dict_form.endswith('来る') else 'こよう')
    return dict_form[:-1] + GODAN_O[dict_form[-1]] + 'う'


def vol_wrong(w):
    d, k, stem = w['dict'], w['kind'], w['expression'][:-2]
    if k == 'v1':
        return [d + 'よう', stem + 'ろう', stem + 'おう']
    if k == 'suru':
        return [d + 'よう', d[:-2] + 'しろう', d[:-2] + 'すろう']
    if k == 'kuru':
        return [d + 'よう', stem + 'ろう', stem + 'おう']
    return [stem + 'よう', d + 'よう', stem + 'ろう']


def imp_of(dict_form, kind):
    """Thể mệnh lệnh (bài 33): 行け, 食べろ, しろ, 来い."""
    if kind == 'v1':
        return dict_form[:-1] + 'ろ'
    if kind == 'suru':
        return dict_form[:-2] + 'しろ'
    if kind == 'kuru':
        return dict_form[:-2] + ('来い' if dict_form.endswith('来る') else 'こい')
    return dict_form[:-1] + GODAN_E[dict_form[-1]]


def imp_wrong(w):
    # Không dùng 食べれ (văn nói vùng Kansai), すれ
    d, k, stem = w['dict'], w['kind'], w['expression'][:-2]
    if k == 'v1':
        return [d + 'ろ', stem + 'え', stem + 'り']
    if k == 'suru':
        return [d[:-2] + 'すろ', d[:-2] + 'しえ', d[:-2] + 'するろ']
    if k == 'kuru':
        return [d + 'ろ', stem + 'ろ', d + 'い']
    return [stem + 'ろ', d + 'ろ', stem + 'え']


def ba_of(dict_form, kind):
    """Thể ば (bài 35): 行けば, 食べれば, すれば, 来れば, あれば."""
    if kind == 'v1':
        return dict_form[:-1] + 'れば'
    if kind == 'suru':
        return dict_form[:-2] + 'すれば'
    if kind == 'kuru':
        return dict_form[:-2] + ('来れば' if dict_form.endswith('来る') else 'くれば')
    return dict_form[:-1] + GODAN_E[dict_form[-1]] + 'ば'


def ba_wrong(w):
    d, k, stem = w['dict'], w['kind'], w['expression'][:-2]
    if k == 'v1':
        return [d + 'ば', d + 'れば', stem + 'ば']
    if k == 'suru':
        return [d[:-2] + 'すりば', d[:-2] + 'するば', d[:-2] + 'しれれば']
    if k == 'kuru':
        return [d + 'ば', d + 'れば', stem + 'ば']
    return [stem + 'ば', d + 'ば', stem + 'れば']


def pass_of(dict_form, kind):
    """Gốc bị động (bài 37): 書かれ, 食べられ, され, 来られ."""
    if kind == 'v1':
        return dict_form[:-1] + 'られ'
    if kind == 'suru':
        return dict_form[:-2] + 'され'
    if kind == 'kuru':
        return dict_form[:-2] + ('来られ' if dict_form.endswith('来る') else 'こられ')
    return dict_form[:-1] + GODAN_A[dict_form[-1]] + 'れ'


def pass_wrong(w):
    d, k, stem = w['dict'], w['kind'], w['expression'][:-2]
    if k == 'v1':
        return [d + 'られ', d + 'れ', stem + 'さられ']
    if k == 'suru':
        return [d[:-2] + 'しられ', d[:-2] + 'すられ', d[:-2] + 'しれ']
    if k == 'kuru':
        return [d + 'られ', stem + 'れれ', d + 'れ']
    return [stem + 'れ', d + 'れ', stem + 'られ']


def adj_conj(w, lesson):
    """Thể nối ～くて (bài 16) và phó từ ～く (bài 19) của tính từ い."""
    expr, kana = w['expression'], w['reading']
    st, sr = (expr[:-2] + 'よ', kana[:-2] + 'よ') if w['kind'] == 'adj-ii' else (expr[:-1], kana[:-1])
    out = []
    if lesson >= 16:
        out.append((st + 'くて', sr + 'くて', 'nối (くて)', [expr + 'て', expr + 'で', st + 'くで']))
    if lesson >= 19:
        out.append((st + 'く', sr + 'く', 'phó từ (く)', [expr + 'く', st + 'に', '=' + expr]))
    if lesson >= 25:
        out += [
            (st + 'かったら', sr + 'かったら', 'thể たら', [expr + 'たら', expr + 'かったら', st + 'くたら']),
            (st + 'くても', sr + 'くても', 'thể ても', [expr + 'ても', expr + 'でも', st + 'かっても']),
            (st + 'くなかったら', sr + 'くなかったら', 'thể なかったら', [expr + 'なかったら', st + 'なかったら', expr + 'くなかったら']),
        ]
    if lesson >= 35:
        out.append((st + 'ければ', sr + 'ければ', 'thể ば', [expr + 'ば', expr + 'ければ', st + 'くば']))
    if lesson >= 40 and w['kind'] == 'adj-i':
        out.append((st + 'さ', sr + 'さ', 'danh từ (さ)', [expr + 'さ', st + 'くさ', st + 'さい']))
    if lesson >= 43:
        sou, soum = (('よさそう', 'よさそう') if w['kind'] == 'adj-ii' and expr == 'いい' else (st + 'そう', sr + 'そう'))
        if w['kind'] == 'adj-ii' and expr != 'いい':
            sou, soum = expr[:-2] + 'よさそう', kana[:-2] + 'よさそう'
        # Không dùng 高いそう (nghe nói, bài 47) làm nhiễu
        out.append((sou, soum, 'そう (trông có vẻ)', [st + 'くそう', st + 'さいそう', expr + 'さそう']))
    if lesson >= 44:
        for tail in ('すぎます', 'すぎました', 'すぎて', 'すぎる', 'すぎた'):
            out.append((st + tail, sr + tail, 'すぎます', [expr + tail, st + 'く' + tail, st + 'さ' + tail]))
    return out


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
        potential = []
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
                for written, reading, form, wrong in conj_forms(w, lesson):
                    # Thể khả năng thêm sau cùng: 入れて của 入れます (いれて) không bị cách đọc はいれて của 入ります che mất
                    if form.startswith('khả năng') or form in ('bị động', 'sai khiến'):
                        potential.append((written, reading, form, expr, wrong))
                        continue
                    self.add(tokens, written, reading)
                    CONJ_FORMS.setdefault(written, (form, expr, wrong))
                # Viết bằng kana (わかる cho 分かる): tra được thể, nhiễu cũng bằng kana
                if kana != expr:
                    kw = {**w, 'expression': kana, 'dict': w['dictReading']}
                    for written, _reading, form, wrong in conj_forms(kw, lesson):
                        CONJ_FORMS.setdefault(written, (form, kana, wrong))
            if w['kind'] in ('adj-i', 'adj-ii'):
                for written, reading, form, wrong in adj_conj(w, lesson):
                    self.add(tokens, written, reading)
                    CONJ_FORMS.setdefault(written, (form, expr, wrong))
        for written, reading, form, expr, wrong in potential:
            self.add(tokens, written, reading)
            old = CONJ_FORMS.get(written)
            # Nhóm II: 食べられます vừa là khả năng vừa là bị động (bài 37+)
            if old and old[0] != form and {old[0], form} == {'khả năng', 'bị động'}:
                CONJ_FORMS[written] = ('khả năng / bị động', expr, old[2])
            elif old and form == 'sai khiến' and old[0] == 'khả năng':
                # させます: sai khiến của します trùng khả năng của さします (che ô, bài 47); ưu tiên sai khiến
                CONJ_FORMS[written] = (form, expr, wrong)
            else:
                CONJ_FORMS.setdefault(written, (form, expr, wrong))
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
    if text in CONJ_FORMS:
        form, base, wrong = CONJ_FORMS[text]
        # Nhiễu có '=' là thể có thật (chỉ sai trong câu này); còn lại là dạng chia sai: đánh * để không kiểm tra từ vựng
        out = []
        for x in wrong:
            real = x.startswith('=')
            x = x.lstrip('=')
            if x != text and x not in [o.lstrip('*') for o in out]:
                out.append(x if real else '*' + x)
        return out[:3], form, base
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
    # Thể thông thường của です (bài 20)
    plain = {'だ': 'thông thường', 'じゃない': 'thông thường phủ định', 'だった': 'thông thường quá khứ', 'じゃなかった': 'thông thường quá khứ phủ định'}
    if text in plain:
        return plain[text], 'です'
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
                # Ghi lỗi rồi chạy tiếp, để write() báo một lần mọi chỗ sai
                VOCAB.errors.append(f'{where}: không biết cách đọc của "{text}", ghi {{...}}')
                reading = '?'
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
                distractors = not_real(text, distractors)
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
    fix_counter_readings(pieces)
    return pieces, slots


NATIONALITY = {'アメリカ', 'イギリス', 'インド', 'インドネシア', 'ドイツ', 'フランス', 'ブラジル', '中国', '日本', '韓国', 'ベトナム', 'タイ', '外国'}


def fix_counter_readings(pieces):
    """Cách đọc theo chữ đứng trước:
    人: sau số / 何 → にん, sau tên nước → じん, còn lại → ひと (あの人). 分: sau số tận cùng 1,3,4,6,8,0 → ぷん.
    日: sau số → にち (1日で = いちにち). 1人, 2人 đọc bất quy tắc: viết 一人, 二人."""
    for i, piece in enumerate(pieces):
        prev = pieces[i - 1]['t'] if i else ''
        digit = re.fullmatch(r'[0-9]+', prev)
        if piece['t'] == '人':
            if digit and prev in ('1', '2'):
                raise ValueError(f'{prev}人 đọc bất quy tắc: viết 一人／二人')
            piece['r'] = 'にん' if digit or prev == '何' else 'じん' if prev in NATIONALITY else 'ひと'
        elif piece['t'] == '分' and digit:
            piece['r'] = 'ぷん' if prev[-1] in '134680' else 'ふん'
        elif piece['t'] == '日' and digit:
            piece['r'] = 'にち'


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
    """rows: [(src, meaning, uses?, prompt?)].
    30 dòng (bài 1–20): mức 1 = dòng 1–10, mức 2 = 11–20, mức 3 = 21–30.
    40 dòng (bài 21+, chủ dự án 2026-11-13): mức 1 = dòng 1–13, mức 2 = 14–27, mức 3 = 28–40; câu tiêu biểu 1, 8, 16, 23, 33."""
    code = f'g{lesson:02d}-{order:02d}'
    if len(rows) not in (30, 40):
        raise ValueError(f'{code}: có {len(rows)} câu, cần 30 hoặc 40')
    cut = (10, 20) if len(rows) == 30 else (13, 27)
    if len(rows) == 40 and samples == (1, 6, 12, 18, 25):
        samples = (1, 8, 16, 23, 33)
    sentences = []
    for i, row in enumerate(rows, start=1):
        src, mean = row[0], row[1]
        uses = row[2] if len(row) > 2 else None
        prompt = row[3] if len(row) > 3 else None
        level = 1 if i <= cut[0] else 2 if i <= cut[1] else 3
        sentences.append(sentence(code, i, level, src, mean, uses, prompt, i in samples))
    p = {'code': code, 'order': order, 'pattern': pattern, 'meaning': meaning, 'explanation': explanation, 'approved': approved, 'sentences': sentences}
    if notes:
        p['notes'] = notes
    return p


def add_uses(points, extra):
    """Bổ sung mẫu cũ mà câu (theo mã) có dùng nhưng chưa ghi: {'g16-01-s29': ['g06-03']}."""
    found = set()
    for p in points:
        for sen in p['sentences']:
            if sen['code'] in extra:
                sen['uses'] = list(dict.fromkeys([*sen.get('uses', []), *extra[sen['code']]]))
                found.add(sen['code'])
    missing = set(extra) - found
    if missing:
        raise ValueError(f'add_uses: không có câu {sorted(missing)}')


def write(lesson, points):
    if VOCAB.errors:
        raise SystemExit('Từ chưa học:\n  ' + '\n  '.join(VOCAB.errors))
    path = ROOT / 'data' / 'grammar' / f'lesson-{lesson:02d}.json'
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'lesson': lesson, 'points': points}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'Đã ghi {path.relative_to(ROOT)}: {len(points)} mẫu, {sum(len(p["sentences"]) for p in points)} câu')


def lemma(text):
    """Từ gốc (cách đọc thể ます) của một dạng chia: 見ました → みます, 寒く → 寒い, わかって → わかります.
    Không tra được thì là chính nó."""
    base = text
    if text in CONJ_FORMS:
        base = CONJ_FORMS[text][1]
    elif text in TE_FORMS:
        base = TE_FORMS[text][0]
    else:
        te_kana = {te_of(w['dictReading'], w['kind']): w['reading'] for w in VERB_LIST if w['kind'] in VERB_KINDS}
        if text in te_kana:
            return te_kana[text]
        for tail in ('ませんでした', 'ましょう', 'ました', 'ません', 'たくなかった', 'たくない', 'たかった', 'たい'):
            if text.endswith(tail):
                base = text[:-len(tail)] + 'ます'
                break
    return VOCAB.reading.get(base, base)


# Kana của thể chia các từ hay trùng với nhiễu chia sai của する／いる: 知る (しって…), 吸う (すって), 行く (いった)
REAL_LATER = {'しって', 'しった', 'しったり', 'しったら', 'しる', 'しらない', 'しらなければ', 'すって', 'いった'}


def not_real(text, wrong):
    """Bỏ nhiễu tình cờ là một từ có thật (しって = 知って, しらない = 知らない, いった = 行った),
    rồi bù bằng dạng sai rõ ràng cho đủ 3. Bài 1–30 (đã duyệt): giữ nhiễu là thể khác của cùng từ
    (見ました cho 見ましょう, 寒く cho 寒い), chỉ bỏ từ có thật của từ khác."""
    if VOCAB.lesson < 31:
        # REAL_LATER: từ có thật nhưng chưa học tới ở bài này nên VOCAB.tokens chưa có (しって ở bài 14, 知ります bài 15)
        keep = [x for x in wrong if x.lstrip('*') not in REAL_LATER and (x.lstrip('*') not in VOCAB.tokens or lemma(x.lstrip('*')) == lemma(text))]
    else:
        keep = [x for x in wrong if x.lstrip('*') not in VOCAB.tokens and x.lstrip('*') != text]
    extras = (text + 'る', text + 'た', text + 'ら', text + 'て')
    if VOCAB.lesson < 31:
        # してる／してた là thể nói tắt có thật của している: bù bằng dạng sai rõ ràng (しりて, したりり)
        extras = (text[:-1] + 'り' + text[-1], text + 'ら', text + 'り', text + 'る')
    for extra in extras:
        if len(keep) >= 3:
            break
        if extra not in VOCAB.tokens and '*' + extra not in keep and extra not in keep:
            keep.append('*' + extra)
    return keep


def plain(text, te=True):
    """Chỗ hỏi [F] ở thể thông thường (bài 21+: と思います, でしょう, んです…): nhiễu là dạng chia sai,
    không bao giờ là thể ます (行きますでしょう, 行きますと思います tuy lạ nhưng có người dùng)."""
    wrong = []
    if text in CONJ_FORMS:
        _form, base, ws = CONJ_FORMS[text]
        # Dạng chia sai trước, thể có thật (thể て) sau: 行ってんです là dạng nói tắt của 行っているんです
        # te=False: bỏ thể て (押して、音が… vẫn đúng ngữ pháp trong câu ～と)
        ws = [x for x in ws if not x.startswith('=')] + ([x for x in ws if x.startswith('=')] if te else [])
        wrong = [x.lstrip('=') for x in ws if not x.lstrip('=').endswith('ます') and x.lstrip('=') != text]
        stem = base[:-2]
        wrong += [stem + 'った', base[:-2] + 'る', text + 'た', text + 'る']
        # Không lấy thể có thật làm nhiễu dự phòng: gốc ます + る của động từ nhóm II là thể từ điển (忘れる)
        w = VERBS.get(base)
        if w:
            real = {w['dict'], te_of(w['dict'], w['kind']), ta_of(w['dict'], w['kind']), nai_of(w['dict'], w['kind'])}
            wrong = [x for x in wrong if x not in real]
    else:
        neg = text.endswith('くない') and not text.endswith('じゃない')
        if text.endswith('くなかった'):
            st = text[:-5]
            wrong = [st + 'いくなかった', st + 'くないかった', text + 'だ']
        elif text.endswith('かった') and text != 'よかった':
            st = text[:-3]
            wrong = [st + 'いだった', st + 'いかった', text + 'だ']
        elif text == 'よかった':
            wrong = ['いいだった', 'いいかった', 'よかっただ']
        elif text == 'よくない':
            wrong = ['いいくない', 'いいじゃない', 'よくないだ']
        elif neg:
            st = text[:-3]
            wrong = [st + 'いくない', st + 'いじゃない', text + 'だ']
        elif text == 'いい':
            wrong = ['いいだ', 'よく', 'よくて']
        elif text in I_ADJ:
            wrong = [text + 'だ', text[:-1] + 'く', text[:-1] + 'くて']
        else:
            raise ValueError(f'plain: chưa biết nhiễu cho "{text}"')
    out = []
    for x in wrong:
        if x != text and x not in out:
            out.append(x)
    out = [x.lstrip('*') for x in not_real(text, ['*' + x for x in out])]
    return f"[F:{','.join('*' + x for x in out[:3])}]{text}"
