"""JLPT đợt 2 (docs/jlpt-rules.md): công cụ soạn nội dung. Câu, đoạn văn, hội thoại viết bằng chữ thường; script tách từ,
kiểm tra từ vựng theo cấp (N5: bài 1–25, N4: bài 1–50, dùng Vocab của scripts/grammar-content/dsl.py), gắn furigana.

Cú pháp trong chữ:
  [漢字|よみ]   cách đọc riêng (khi từ điển đọc khác, vd. [人|ひと])
  <...>         phần gạch chân (言い換え, 用法)
  （　）         ô trống (文脈規定)
  ①②③④⑤      ô trống đánh số trong đoạn văn (文章の文法)
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'grammar-content'))
import dsl  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
LESSON = {'N5': 25, 'N4': 50}
# Tên người hay gặp trong đề (không có trong danh sách từ vựng)
NAMES = {'田中': 'たなか', '山田': 'やまだ', '鈴木': 'すずき', '佐藤': 'さとう', '中村': 'なかむら', '木村': 'きむら', '林': 'はやし', '森': 'もり', '川口': 'かわぐち', '高橋': 'たかはし',
         'リン': 'リン', 'ミン': 'ミン', 'キム': 'キム', 'ヤン': 'ヤン', 'マリア': 'マリア', 'アン': 'アン', 'ハナ': 'ハナ'}
# Địa danh hay gặp trong đề
PLACES = {'東京': 'とうきょう', '京都': 'きょうと', '大阪': 'おおさか', '奈良': 'なら', '北海道': 'ほっかいどう', '富士山': 'ふじさん'}
# Từ N5 thông dụng của đề JLPT mà danh sách bài 1–25 thiếu, và từ ghép bị tách sai cách đọc (今晩 ≠ 今+晩)
EXTRA = {
    'N5': {'今晩': 'こんばん', '今年': 'ことし', '今月': 'こんげつ', '今週': 'こんしゅう', '半分': 'はんぶん', '出口': 'でぐち', '入口': 'いりぐち', '暖かい': 'あたたかい',
           '一緒に': 'いっしょに', '大好き': 'だいすき', 'バナナ': 'バナナ', 'まずい': 'まずい', 'おととし': 'おととし',
           '国': 'くに', '今度': 'こんど', '毎週': 'まいしゅう', '映画館': 'えいがかん', '毎月': 'まいつき', '毎年': 'まいとし', '大人': 'おとな', '曜日': 'ようび',
           '色': 'いろ', '何色': 'なにいろ', '白': 'しろ', '青': 'あお', '赤': 'あか', '黒': 'くろ', '白い': 'しろい', '青い': 'あおい', '赤い': 'あかい', '黒い': 'くろい',
           '一つ': 'ひとつ', '二つ': 'ふたつ', '三つ': 'みっつ', '四つ': 'よっつ', '五つ': 'いつつ', '何冊': 'なんさつ', '何匹': 'なんびき', '枚': 'まい', '回': 'かい', '匹': 'ひき', '冊': 'さつ', '台': 'だい', '階': 'かい', '第': 'だい',
           # 起きます (thức dậy, bài 4) thiếu trong dữ liệu từ vựng (chỉ có 起きます "xảy ra" bài 44)
           '仕事': 'しごと', '夕方': 'ゆうがた', '授業': 'じゅぎょう', 'テスト': 'テスト', 'クラス': 'クラス', 'メニュー': 'メニュー', '茶色': 'ちゃいろ', '初め': 'はじめ',
           '会': 'かい', '痛い': 'いたい', '痛かった': 'いたかった', '教科書': 'きょうかしょ', 'すし': 'すし', '財布': 'さいふ', '消しゴム': 'けしゴム',
           'おはようございます': 'おはようございます', 'ありがとうございます': 'ありがとうございます', 'おやすみなさい': 'おやすみなさい', 'いってらっしゃい': 'いってらっしゃい', 'さようなら': 'さようなら', 'ペン': 'ペン',
           'あ': 'あ', '男': 'おとこ', '女': 'おんな', '大学生': 'だいがくせい', 'ポケット': 'ポケット',
           '起きます': 'おきます', '起きました': 'おきました', '起きません': 'おきません', '起きて': 'おきて', '起きる': 'おきる', '起きた': 'おきた'},
    # N4: từ N4 thông dụng của đề mà bài 1–50 thiếu
    'N4': {'計画': 'けいかく', '厳しい': 'きびしい', '残念': 'ざんねん', 'すっかり': 'すっかり', '気をつけて': 'きをつけて', '気をつけます': 'きをつけます',
           'ずつ': 'ずつ', '小学生': 'しょうがくせい', '失礼します': 'しつれいします', '怒られました': 'おこられました', '怒りました': 'おこりました', '怒ります': 'おこります',
           '驚きました': 'おどろきました', '喜びました': 'よろこびました', '都合': 'つごう', '遠慮': 'えんりょ', '世話': 'せわ', '背': 'せ', 'スープ': 'スープ', '空く': 'あく',
           '正月': 'しょうがつ', '何度も': 'なんども', '苦手': 'にがて', '美容院': 'びよういん', '伺って': 'うかがって', '伺います': 'うかがいます', 'よろしい': 'よろしい', '早い': 'はやい', 'おかげで': 'おかげで',
           'ゴミ': 'ゴミ', '工事': 'こうじ', '引っ越し': 'ひっこし', '引っ越します': 'ひっこします', '引っ越しました': 'ひっこしました', 'お風呂': 'おふろ', '料金': 'りょうきん',
           '割引': 'わりびき', '平日': 'へいじつ', '店員': 'てんいん', '留学生': 'りゅうがくせい', '代わり': 'かわり', '一日中': 'いちにちじゅう', '驚いた': 'おどろいた', '時給': 'じきゅう',
           '注文': 'ちゅうもん', '店長': 'てんちょう', 'ラーメン': 'ラーメン', '祭り': 'まつり', '結果': 'けっか', 'やっぱり': 'やっぱり', '初級': 'しょきゅう', '中級': 'ちゅうきゅう',
           'センター': 'センター', '学生証': 'がくせいしょう', 'ランチ': 'ランチ', 'コンビニ': 'コンビニ', '高校生': 'こうこうせい', 'ジム': 'ジム', 'サラダ': 'サラダ', 'ステーキ': 'ステーキ', '週': 'しゅう', '次': 'つぎ', '間違えて': 'まちがえて', '間違える': 'まちがえる', '保険証': 'ほけんしょう', '北口': 'きたぐち', '南口': 'みなみぐち',
           '食後': 'しょくご', '引っ越す': 'ひっこす', '連れて': 'つれて', '看護師': 'かんごし', 'メール': 'メール', 'いっぱい': 'いっぱい', '紙': 'かみ', '切符': 'きっぷ', 'そろそろ': 'そろそろ', 'お大事に': 'おだいじに', 'おめでとう': 'おめでとう', 'けっこう': 'けっこう', '引っ越した': 'ひっこした', '引っ越して': 'ひっこして',
           '決まる': 'きまる', '決まりました': 'きまりました', '決まって': 'きまって', '似合う': 'にあう', '似合います': 'にあいます', '似合いました': 'にあいました', '似合って': 'にあって'},
}
MARKS = ['→', '／', '＋', '（　）', '①', '②', '③', '④', '⑤', '★', '・', '～', '：', '　', '…', '（', '）', '!', '！', '?', '？', '/', '-', '〜', '×', '○', '%', '％', ':', '\n']
KANJI = re.compile(r'[㐀-鿿]')

ERRORS: list[str] = []
V = None


def setup(level: str):
    global V
    ERRORS.clear()
    dsl.use_lesson(LESSON[level])
    V = dsl.VOCAB
    for name, reading in {**NAMES, **PLACES, **EXTRA['N5'], **EXTRA[level]}.items():
        V.add(V.tokens, name, reading)
    V.tokens.update(MARKS)
    V.maxlen = max(V.maxlen, max(len(t) for t in V.tokens))


def pieces(text: str, where: str) -> list[dict]:
    """Chữ → các mảnh {t, r?, u?}: tách từ, gắn cách đọc, đánh dấu gạch chân. Lỗi ghi vào ERRORS."""
    out: list[dict] = []
    underline = False
    for seg in re.split(r'(\[[^\]|]+\|[^\]]+\]|<|>|（　）)', text):
        if not seg:
            continue
        if seg == '（　）':
            out.append({'t': '（　）', 'blank': True})
            continue
        if seg == '<':
            underline = True
            continue
        if seg == '>':
            underline = False
            continue
        m = re.fullmatch(r'\[([^\]|]+)\|([^\]]+)\]', seg)
        if m:
            p = {'t': m.group(1), 'r': m.group(2)}
            if underline:
                p['u'] = True
            out.append(p)
            continue
        tokens = V.split(seg)
        if tokens is None:
            # Chỗ xa nhất tách được từ đầu: từ ngoài cấp nằm ngay sau đó
            reach = max((i for i in range(len(seg) + 1) if V.split(seg[:i]) is not None), default=0)
            bad = seg[reach : reach + 4]
            ERRORS.append(f'{where}: có từ ngoài cấp quanh "{bad}" trong "{seg}"')
            out.append({'t': seg})
            continue
        for tok in tokens:
            p = {'t': tok}
            if KANJI.search(tok):
                r = V.read(tok)
                if r is None:
                    ERRORS.append(f'{where}: không biết cách đọc của "{tok}", ghi [{tok}|...]')
                else:
                    p['r'] = r
            if underline:
                p['u'] = True
            out.append(p)
    fix_readings(out, where)
    return out


FULLWIDTH = str.maketrans('０１２３４５６７８９', '0123456789')
# Số đếm đọc bất quy tắc theo số đứng trước: phải ghi cách đọc tay, vd. [１本|いっぽん]
IRREGULAR = {'本', '階', '杯', '匹', '歳', '冊', '回', 'つ'}
# Từ điển ghi cách đọc khác cách đọc thường gặp
READING_FIX = {'何曜日': 'なんようび'}
IRREGULAR_DAYS = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 20, 24}


def fix_readings(out: list[dict], where: str):
    """Cách đọc theo chữ đứng trước (như fix_counter_readings của grammar, thêm số toàn khổ):
    人 sau số / 何 → にん, sau tên nước → じん, còn lại → ひと; 分 sau số → ふん/ぷん; 日 sau số → にち (ngày bất quy tắc phải ghi tay)."""
    for i, p in enumerate(out):
        prev = out[i - 1]['t'] if i else ''
        n = int(prev.translate(FULLWIDTH)) if re.fullmatch(r'[0-9０-９]+', prev) else None
        t = p['t']
        nxt = out[i + 1]['t'] if i + 1 < len(out) else ''
        if t in READING_FIX:
            p['r'] = READING_FIX[t]
        elif t == '何':
            p['r'] = 'なに' if nxt[:1] in ('を', 'が', 'も', 'に', 'で', 'や') or nxt.startswith('か') else 'なん'
        elif t == '人':
            if n in (1, 2):
                ERRORS.append(f'{where}: {prev}人 đọc bất quy tắc, ghi [{prev}人|{"ひとり" if n == 1 else "ふたり"}]')
            p['r'] = 'にん' if n is not None or prev == '何' else 'じん' if prev in dsl.NATIONALITY else 'ひと'
        elif t == '分' and n is not None:
            p['r'] = 'ぷん' if str(n)[-1] in '134680' else 'ふん'
        elif t == '日':
            if n in IRREGULAR_DAYS:
                ERRORS.append(f'{where}: {prev}日 đọc bất quy tắc, ghi [{prev}日|...]')
            # Sau số: ngày (にち); đứng riêng: 次の日, 休みの日 (ひ)
            p['r'] = 'にち' if n is not None else 'ひ'
        elif t == '月' and n is None:
            p['r'] = 'つき'
        elif t.startswith('月') and n is not None and p.get('r', '').startswith('つき'):
            # １２月に: từ 月に (つきに) đứng sau số là tháng
            p['r'] = 'がつ' + p['r'][2:]
        elif t in IRREGULAR and n is not None:
            ERRORS.append(f'{where}: {prev}{t} có thể đọc bất quy tắc, ghi [{prev}{t}|...]')


def plain(text: str) -> str:
    """Chữ hiển thị (bỏ cú pháp đánh dấu)."""
    return re.sub(r'\[([^\]|]+)\|[^\]]+\]', r'\1', text).replace('<', '').replace('>', '')


def check_options(where: str, options: list[str], answer: int, n: int = 4):
    if len(options) != n:
        ERRORS.append(f'{where}: cần {n} lựa chọn, có {len(options)}')
    if len({plain(o) for o in options}) != len(options):
        ERRORS.append(f'{where}: lựa chọn trùng nhau')
    if not 0 <= answer < len(options):
        ERRORS.append(f'{where}: đáp án {answer} ngoài khoảng')
    for i, o in enumerate(options):
        pieces(o, f'{where} lựa chọn {i + 1}')


def write(level: str, type_: str, items: list[dict], approved: bool = False):
    """Ghi file của một dạng. `approved`: chủ dự án đã duyệt dạng này (app chỉ dùng mục đã duyệt)."""
    for item in items:
        item['approved'] = approved
    if ERRORS:
        print('LỖI:')
        for e in ERRORS:
            print('  ' + e)
        raise SystemExit(1)
    codes = [i['code'] for i in items]
    if len(set(codes)) != len(codes):
        raise SystemExit('mã trùng')
    # Bản theo dạng (để soát, show.py); combine.py gộp thành data/jlpt/<cấp>.json cho app
    path = Path(__file__).resolve().parent / 'parts' / f'{level.lower()}-{type_}.json'
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps({'level': level, 'type': type_, 'items': items}, ensure_ascii=False, indent=1) + '\n')
    n = sum(len(i.get('questions', [None])) for i in items)
    print(f'Đã ghi {path.relative_to(ROOT)}: {len(items)} mục, {n} câu hỏi')


# ---------------------------------------------------------------------------
# Dựng từng loại mục. Đáp án luôn là chỉ số trong `options` (0–3); khi soạn, lựa chọn đúng ghi ở vị trí đầu,
# script xáo vị trí ở app nên không lộ quy luật.
# ---------------------------------------------------------------------------

def contextual(code, sentence, options, answer, note):
    """文脈規定: câu có （　）, 4 từ."""
    if sentence.count('（　）') != 1:
        ERRORS.append(f'{code}: câu cần đúng một （　）')
    check_options(code, options, answer)
    return {'code': code, 'stem': pieces(sentence, code), 'options': [plain(o) for o in options], 'answer': answer, 'explanation': note}


def paraphrase(code, sentence, options, answer, note):
    """言い換え類義: câu có phần <gạch chân>, 4 câu."""
    if '<' not in sentence:
        ERRORS.append(f'{code}: thiếu phần gạch chân <...>')
    check_options(code, options, answer)
    return {'code': code, 'stem': pieces(sentence, code), 'options': [plain(o) for o in options], 'answer': answer, 'explanation': note}


def usage(code, word, options, answer, note):
    """用法: một từ, 4 câu dùng từ đó (gạch chân), một câu dùng đúng."""
    pieces(word, code)
    check_options(code, options, answer)
    return {'code': code, 'word': plain(word), 'options': [pieces(o, f'{code} câu {i + 1}') for i, o in enumerate(options)], 'answer': answer, 'explanation': note}


def passage(code, paragraphs, questions, kind=None, title=None):
    """文章の文法 / 読解: đoạn văn (nhiều đoạn) và các câu hỏi {q?, blank?, options, answer, note}."""
    item = {'code': code, 'passage': [pieces(p, f'{code} đoạn {i + 1}') for i, p in enumerate(paragraphs)], 'questions': []}
    if kind:
        item['kind'] = kind
    if title:
        item['title'] = pieces(title, f'{code} tiêu đề')
    for j, q in enumerate(questions):
        where = f'{code} câu {j + 1}'
        check_options(where, q['options'], q['answer'])
        out = {'options': [plain(o) for o in q['options']], 'answer': q['answer'], 'explanation': q['note']}
        if 'q' in q:
            out['q'] = pieces(q['q'], where)
        if 'blank' in q:
            out['blank'] = q['blank']
        item['questions'].append(out)
    return item


def listening(code, kind, question, script, options, answer, note):
    """聴解 課題理解 (task) / ポイント理解 (point): câu hỏi, lời thoại [(người nói, câu)], 4 lựa chọn."""
    check_options(code, options, answer)
    for sp, _ in script:
        if sp not in ('M', 'F', 'N'):
            ERRORS.append(f'{code}: người nói phải là M, F hoặc N')
    return {
        'code': code,
        'kind': kind,
        'question': pieces(question, f'{code} câu hỏi'),
        'script': [{'sp': sp, 'text': pieces(line, f'{code} lời {i + 1}')} for i, (sp, line) in enumerate(script)],
        'options': [plain(o) for o in options],
        'answer': answer,
        'explanation': note,
    }


def verbal(code, situation, emoji, options, answer, note):
    """発話表現: tình huống (tiếng Việt) thay cho tranh, 3 câu nói."""
    check_options(code, options, answer, 3)
    return {'code': code, 'situation': situation, 'emoji': emoji, 'options': [plain(o) for o in options], 'answer': answer, 'explanation': note}
