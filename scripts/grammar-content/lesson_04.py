"""Ngữ pháp bài 4 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–4.
Chạy: python3 -I scripts/grammar-content/lesson_04.py  → data/grammar/lesson-04.json
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(4)
A1, B1, C1, D1, E1 = 'g01-01', 'g01-02', 'g01-03', 'g01-04', 'g01-05'
B2, C2, D2 = 'g02-02', 'g02-03', 'g02-04'
B3, E3 = 'g03-02', 'g03-05'
A, B, C, D, E = 'g04-01', 'g04-02', 'g04-03', 'g04-04', 'g04-05'

# Cách đọc của 分 theo số đứng trước
FUN = {5: 'ふん', 10: 'ぷん', 15: 'ふん', 20: 'ぷん', 25: 'ふん', 30: 'ぷん', 40: 'ぷん', 45: 'ふん', 50: 'ぷん'}


def s(*parts):
    return '|'.join(parts)


def t(h, m=None, half=False, slot=None):
    """Mảnh giờ: 7時, 10時半, 2時15分. slot: 'h', 'm', 'half' để hỏi chỗ đó."""
    out = [str(h), ('[W]' if slot == 'h' else '') + '時']
    if half:
        out.append(('[W]' if slot == 'half' else '') + '半')
    if m:
        out += [str(m), ('[W]' if slot == 'm' else '') + f'分{{{FUN[m]}}}']
    return out


def tt(h, m=None, half=False):
    """Chữ của giờ (để viết câu đáp sai)."""
    return f'{h}時' + ('半' if half else '') + (f'{m}分' if m else '')


def short(text_parts, meaning, uses, q, qm, ans):
    return (s(*text_parts), meaning, uses, (q, qm, [f'はい、{ans}', ans.replace('。', 'か。'), ans.replace('時', '歳', 1)]))


# ---------------------------------------------------------------------------
p1 = point(4, 1, '今 ～時～分 です', 'Bây giờ là ~ giờ ~ phút',
    'Nói giờ bằng số + 時 (じ, giờ) và số + 分 (ふん/ぷん, phút); 半 (はん) là rưỡi. 午前 là sáng (trước 12 giờ trưa), 午後 là chiều/tối. '
    'Hỏi giờ: 今何時ですか (bây giờ là mấy giờ?). Lưu ý cách đọc: 4時 よじ, 7時 しちじ, 9時 くじ; 分 đọc ふん hay ぷん tùy số (5分 ごふん, 10分 じゅっぷん).',
    [
        (s('今', *t(7, slot='h'), 'です', '。'), 'Bây giờ là 7 giờ.'),
        (s('今', *t(9, slot='h'), 'です', '。'), 'Bây giờ là 9 giờ.'),
        (s('今', *t(4, slot='h'), 'です', '。'), 'Bây giờ là 4 giờ.'),
        (s('今', *t(10, half=True, slot='half'), 'です', '。'), 'Bây giờ là 10 giờ rưỡi.'),
        (s('今', *t(2, 15, slot='m'), 'です', '。'), 'Bây giờ là 2 giờ 15 phút.'),
        (s('今', *t(3, 45, slot='m'), 'です', '。'), 'Bây giờ là 3 giờ 45 phút.'),
        (s('今', *t(6, 10, slot='m'), 'です', '。'), 'Bây giờ là 6 giờ 10 phút.'),
        (s('今', '午前', *t(8, slot='h'), 'です', '。'), 'Bây giờ là 8 giờ sáng.'),
        (s('今', '午後', *t(5, half=True, slot='half'), 'です', '。'), 'Bây giờ là 5 giờ rưỡi chiều.'),
        (s('今', *t(12, slot='h'), 'です', '。'), 'Bây giờ là 12 giờ.'),
        (s('今', '何時', 'ですか', '。'), 'Bây giờ là mấy giờ?', [C1]),
        short([*t(1, 20, slot='m'), 'です', '。'], 'Là 1 giờ 20 phút.', [A1], s('今', '何時', 'ですか', '。'), 'Bây giờ là mấy giờ?', f'{tt(1, 20)}です。'),
        (s('ニューヨーク', '[P]は', '今', '何時', 'ですか', '。'), 'Ở New York bây giờ là mấy giờ?', [C1]),
        short(['午前', *t(7, slot='h'), 'です', '。'], 'Là 7 giờ sáng.', [A1], s('ニューヨーク', 'は', '今', '何時', 'ですか', '。'), 'Ở New York bây giờ là mấy giờ?', f'午前{tt(7)}です。'),
        (s('ロンドン', '[P]は', '今', '午後', *t(3, slot='h'), 'です', '。'), 'Ở London bây giờ là 3 giờ chiều.', [A1]),
        (s('ペキン', '[P]は', '今', '何時', 'ですか', '。'), 'Ở Bắc Kinh bây giờ là mấy giờ?', [C1]),
        short(['午後', *t(9, slot='h'), 'です', '。'], 'Là 9 giờ tối.', [A1], s('ペキン', 'は', '今', '何時', 'ですか', '。'), 'Ở Bắc Kinh bây giờ là mấy giờ?', f'午後{tt(9)}です。'),
        (s('バンコク', '[P]は', '今', '午前', *t(11, slot='h'), 'です', '。'), 'Ở Bangkok bây giờ là 11 giờ sáng.', [A1]),
        (s('今', '何時', '何分', 'ですか', '。'), 'Bây giờ là mấy giờ mấy phút?', [C1]),
        short([*t(8, 50, slot='m'), 'です', '。'], 'Là 8 giờ 50 phút.', [A1], s('今', '何時', '何分', 'ですか', '。'), 'Bây giờ là mấy giờ mấy phút?', f'{tt(8, 50)}です。'),
        (s('ロサンゼルス', 'も', '今', '午前', *t(6, slot='h'), 'ですか', '。'), 'Ở Los Angeles bây giờ cũng là 6 giờ sáng à?', [C1, D1]),
        (s('はい', '、', 'そう', 'です', '。', *t(6, slot='h'), 'です', '。'), 'Vâng, đúng vậy. Là 6 giờ.', [C2],
         (s('今', *t(6), 'ですか', '。'), 'Bây giờ là 6 giờ phải không?', ['いいえ、そうです。6時です。', 'はい、違います。6時です。', 'はい、そうです。6歳です。'])),
        short([*t(9, half=True, slot='half'), 'です', '。'], 'Là 9 giờ rưỡi.', [A1], s('今', '何時', 'ですか', '。'), 'Bây giờ là mấy giờ?', f'{tt(9, half=True)}です。'),
        (s('ニューヨーク', 'は', '今', '午前', *t(7), 'です', 'か', '、', '午後', *t(7, slot='h'), 'です', 'か', '。'), 'Ở New York bây giờ là 7 giờ sáng hay 7 giờ tối?', [D2]),
        short(['午後', *t(7, slot='h'), 'です', '。'], 'Là 7 giờ tối.', [A1],
              s('ニューヨーク', 'は', '今', '午前', *t(7), 'です', 'か', '、', '午後', *t(7), 'です', 'か', '。'), 'Ở New York bây giờ là 7 giờ sáng hay 7 giờ tối?', f'午後{tt(7)}です。'),
        (s('ロンドン', '[P]は', '今', '何時', 'ですか', '。'), 'Ở London bây giờ là mấy giờ?', [C1]),
        short(['午前', *t(2, slot='h'), 'です', '。'], 'Là 2 giờ sáng.', [A1], s('ロンドン', 'は', '今', '何時', 'ですか', '。'), 'Ở London bây giờ là mấy giờ?', f'午前{tt(2)}です。'),
        (s('私', 'の', '時計', '[P]は', '今', *t(3, 10, slot='m'), 'です', '。'), 'Đồng hồ của tôi bây giờ là 3 giờ 10 phút.', [E1]),
        (s('この', '時計', 'も', '今', *t(5, slot='h'), 'です', '。'), 'Cái đồng hồ này bây giờ cũng chỉ 5 giờ.', [B2, D1]),
        (s('いいえ', '、', '今', *t(4), 'じゃありません', '。', *t(4, half=True, slot='half'), 'です', '。'), 'Không, bây giờ không phải 4 giờ. Là 4 giờ rưỡi.', [B1, C1],
         (s('今', *t(4), 'ですか', '。'), 'Bây giờ là 4 giờ phải không?', ['はい、今4時じゃありません。4時半です。', 'いいえ、今4時です。4時半です。', 'いいえ、今4時じゃありません。4歳半です。'])),
    ],
    notes='Đọc giờ: 4時 よじ, 7時 しちじ, 9時 くじ. 分: 1, 3, 4, 6, 8, 10 → ぷん; 2, 5, 7, 9 → ふん.')

# ---------------------------------------------------------------------------
def v(subj, time, verb):
    parts = [subj, 'は'] if subj else []
    return s(*parts, time, f'[F]{verb}', '。')


def yesno(q, qm, ans, ans_vi, wrong):
    return (s(*ans), ans_vi, [C1], (q, qm, wrong))


p2 = point(4, 2, 'V ます／ません／ました／ませんでした', 'Động từ lịch sự: hiện tại, phủ định, quá khứ, quá khứ phủ định',
    'Động từ thể lịch sự đổi đuôi theo thì và khẳng định/phủ định: 働きます (làm việc, cả hiện tại và tương lai), '
    '働きません (không làm việc), 働きました (đã làm việc), 働きませんでした (đã không làm việc). '
    'Câu hỏi thêm か: 働きましたか. Trả lời: はい、働きました / いいえ、働きませんでした.',
    [
        (v('私', '毎日', '勉強します'), 'Hằng ngày tôi học.'),
        (v('私', '毎晩', '寝ます'), 'Tối nào tôi cũng ngủ.'),
        (v('私', '毎日', '働きます'), 'Ngày nào tôi cũng làm việc.'),
        (v('私', 'あした', '休みます'), 'Ngày mai tôi nghỉ.'),
        (v('私', 'あした', '働きません'), 'Ngày mai tôi không làm việc.'),
        (v('私', '今日', '勉強しません'), 'Hôm nay tôi không học.'),
        (v('私', 'きのう', '勉強しました'), 'Hôm qua tôi đã học.'),
        (v('私', 'きのう', '働きませんでした'), 'Hôm qua tôi đã không làm việc.'),
        (v('私', 'おととい', '休みました'), 'Hôm kia tôi đã nghỉ.'),
        (v('私', 'ゆうべ', '勉強しませんでした'), 'Tối qua tôi đã không học.'),
        (v('ミラーさん', '毎日', '働きます'), 'Anh Miller làm việc hằng ngày.'),
        (v('カリナさん', 'きのう', '休みました'), 'Hôm qua chị Karina đã nghỉ.'),
        (v('ワンさん', '毎晩', '勉強します'), 'Tối nào anh Wang cũng học.'),
        (v('サントスさん', '今日', '働きません'), 'Hôm nay anh Santos không làm việc.'),
        (v('タワポンさん', 'ゆうべ', '勉強しませんでした'), 'Tối qua anh Thawaphon đã không học.'),
        (v('銀行', 'あした', '休みます'), 'Ngày mai ngân hàng nghỉ.'),
        (v('図書館', '今日', '休みません'), 'Hôm nay thư viện không nghỉ.'),
        (s('昼休み', 'は', '[F]終わりました', '。'), 'Giờ nghỉ trưa đã kết thúc.', [A1]),
        (s('あなた', 'は', '毎晩', '[F]勉強しますか', '。'.replace('。', '。')).replace('[F]勉強しますか', '[F]勉強します|か'), 'Tối nào bạn cũng học à?', [C1]),
        yesno(s('毎晩', '勉強します', 'か', '。'), 'Tối nào bạn cũng học à?', ['はい', '、', '[F]勉強します', '。'], 'Vâng, tôi có học.',
              ['いいえ、勉強します。', 'はい、勉強しません。', 'はい、勉強しませんでした。']),
        (s('きのう', '[F]働きました', 'か', '。'), 'Hôm qua bạn có làm việc không?', [C1]),
        yesno(s('きのう', '働きました', 'か', '。'), 'Hôm qua bạn có làm việc không?', ['いいえ', '、', '[F]働きませんでした', '。'], 'Không, tôi đã không làm việc.',
              ['はい、働きませんでした。', 'いいえ、働きました。', 'いいえ、働きません。']),
        (s('私', 'は', 'きのう', '休みました', '。', '今日', 'も', '[F]休みます', '。'), 'Hôm qua tôi đã nghỉ. Hôm nay tôi cũng nghỉ.', [D1]),
        (s('ミラーさん', 'は', '毎日', '働きます', '。', 'あした', 'も', '[F]働きます', '。'), 'Anh Miller làm việc hằng ngày. Ngày mai anh ấy cũng làm việc.', [D1]),
        (s('カリナさん', 'は', 'おととい', '勉強しませんでした', '。', 'きのう', 'も', '[F]勉強しませんでした', '。'), 'Hôm kia chị Karina đã không học. Hôm qua chị ấy cũng không học.', [D1]),
        (s('あした', '[F]休みます', 'か', '。'), 'Ngày mai bạn có nghỉ không?', [C1]),
        yesno(s('あした', '休みます', 'か', '。'), 'Ngày mai bạn có nghỉ không?', ['はい', '、', '[F]休みます', '。'], 'Vâng, tôi nghỉ.',
              ['いいえ、休みます。', 'はい、休みません。', 'はい、休みました。']),
        (s('毎朝', '勉強します', 'か', '、', '毎晩', '[F]勉強します', 'か', '。'), 'Bạn học vào mỗi sáng hay mỗi tối?', [D2]),
        (s('昼休み', 'は', '[F]終わりました', 'か', '。'), 'Giờ nghỉ trưa đã kết thúc chưa?', [C1]),
        yesno(s('昼休み', 'は', '終わりました', 'か', '。'), 'Giờ nghỉ trưa đã kết thúc chưa?', ['はい', '、', '[F]終わりました', '。'], 'Vâng, đã kết thúc rồi.',
              ['いいえ、終わりました。', 'はい、終わりませんでした。', 'はい、終わります。']),
    ],
    notes='Thể ます dùng cho cả hiện tại (thói quen) và tương lai; thời điểm do từ chỉ thời gian quyết định.')

# ---------------------------------------------------------------------------
def at(subj, time_parts, verb):
    parts = [subj, 'は'] if subj else []
    return s(*parts, *time_parts, '[P]に', verb, '。')


p3 = point(4, 3, 'N (thời điểm) に V', 'Làm V vào lúc N',
    'に đứng sau mốc thời gian có con số hoặc ngày trong tuần để chỉ lúc hành động xảy ra: 6時におきます (dậy lúc 6 giờ), '
    '日曜日に休みます (nghỉ vào chủ nhật). Các từ thời gian tương đối như 今日, あした, きのう, 毎朝, 毎晩, 今 KHÔNG dùng に. '
    'Hỏi bằng 何時に, 何曜日に.',
    [
        (at('私', t(6), 'おきます'), 'Tôi thức dậy lúc 6 giờ.'),
        (at('私', t(11), '寝ます'), 'Tôi đi ngủ lúc 11 giờ.'),
        (at('私', t(8), '勉強します'), 'Tôi học lúc 8 giờ.'),
        (at('銀行', t(3), '終わります'), 'Ngân hàng đóng cửa lúc 3 giờ.'),
        (at('図書館', t(5), '終わります'), 'Thư viện đóng cửa lúc 5 giờ.'),
        (at('ミラーさん', t(7, half=True), 'おきます'), 'Anh Miller thức dậy lúc 7 giờ rưỡi.'),
        (at('カリナさん', t(10), '寝ます'), 'Chị Karina đi ngủ lúc 10 giờ.'),
        (at('私', ['日曜日'], '休みます'), 'Tôi nghỉ vào chủ nhật.'),
        (at('美術館', ['月曜日'], '休みます'), 'Bảo tàng nghỉ vào thứ hai.'),
        (at('私', ['土曜日'], '働きます'), 'Tôi làm việc vào thứ bảy.'),
        (s('きのう', '私', 'は', *t(12), '[P]に', '寝ました', '。'), 'Hôm qua tôi đã đi ngủ lúc 12 giờ.', [B]),
        (s('今朝', '私', 'は', *t(5), '[P]に', 'おきました', '。'), 'Sáng nay tôi đã thức dậy lúc 5 giờ.', [B]),
        (s('毎朝', '何時', '[P]に', 'おきます', 'か', '。'), 'Mỗi sáng bạn thức dậy lúc mấy giờ?', [C1]),
        (s(*t(6, half=True), '[P]に', 'おきます', '。'), 'Tôi thức dậy lúc 6 giờ rưỡi.', [A],
         (s('毎朝', '何時', 'に', 'おきます', 'か', '。'), 'Mỗi sáng bạn thức dậy lúc mấy giờ?', ['はい、6時半におきます。', '6時半のおきます。', '6時半におきますか。'])),
        (s('何曜日', '[P]に', '休みます', 'か', '。'), 'Bạn nghỉ vào thứ mấy?', [C1]),
        (s('水曜日', '[P]に', '休みます', '。'), 'Tôi nghỉ vào thứ tư.', [A1],
         (s('何曜日', 'に', '休みます', 'か', '。'), 'Bạn nghỉ vào thứ mấy?', ['はい、水曜日に休みます。', '水曜日の休みます。', '水曜日に休みますか。'])),
        (s('郵便局', 'は', '何時', '[P]に', '終わります', 'か', '。'), 'Bưu điện đóng cửa lúc mấy giờ?', [C1]),
        (s(*t(5), '[P]に', '終わります', '。'), 'Đóng cửa lúc 5 giờ.', [A1],
         (s('郵便局', 'は', '何時', 'に', '終わります', 'か', '。'), 'Bưu điện đóng cửa lúc mấy giờ?', ['はい、5時に終わります。', '5時の終わります。', '5時に終わりますか。'])),
        (s('私', 'は', '土曜日', '[P]に', '働きませんでした', '。'), 'Thứ bảy tôi đã không làm việc.', [B]),
        (s('ワンさん', 'は', '午後', *t(2), '[P]に', '休みました', '。'), 'Anh Wang đã nghỉ lúc 2 giờ chiều.', [B]),
        (s('私', 'は', '毎朝', *t(6), '[P]に', 'おきます', '。'), 'Mỗi sáng tôi thức dậy lúc 6 giờ.', [A]),
        (s('あした', 'は', '何時', '[P]に', 'おきます', 'か', '。'), 'Ngày mai bạn thức dậy lúc mấy giờ?', [C1]),
        (s(*t(7), '[P]に', 'おきます', '。'), 'Tôi sẽ thức dậy lúc 7 giờ.', [A1],
         (s('あした', 'は', '何時', 'に', 'おきます', 'か', '。'), 'Ngày mai bạn thức dậy lúc mấy giờ?', ['はい、7時におきます。', '7時のおきます。', '7時におきますか。'])),
        (s('私', 'は', 'きのう', *t(11), 'に', '寝ました', '。', '今日', 'も', *t(11), '[P]に', '寝ます', '。'), 'Hôm qua tôi đi ngủ lúc 11 giờ. Hôm nay tôi cũng đi ngủ lúc 11 giờ.', [B, D1]),
        (s('昼休み', 'は', *t(12), '[P]に', '終わります', '。'), 'Giờ nghỉ trưa kết thúc lúc 12 giờ.', [A]),
        (s('カリナさん', 'は', '日曜日', '[P]に', '勉強しません', '。'), 'Chị Karina không học vào chủ nhật.', [B]),
        (s('土曜日', '[P]に', '働きます', 'か', '。'), 'Bạn có làm việc vào thứ bảy không?', [B, C1]),
        (s('いいえ', '、', '土曜日', '[P]に', '働きません', '。'), 'Không, tôi không làm việc vào thứ bảy.', [B, C1],
         (s('土曜日', 'に', '働きます', 'か', '。'), 'Bạn có làm việc vào thứ bảy không?', ['はい、土曜日に働きません。', 'いいえ、土曜日に働きます。', 'いいえ、土曜日の働きません。'])),
        (s('ミラーさん', 'の', '会社', 'は', *t(5, half=True), '[P]に', '終わります', '。'), 'Công ty của anh Miller tan làm lúc 5 giờ rưỡi.', [A, E1]),
        (s('私', 'は', '毎晩', *t(10), '[P]に', '勉強します', '。'), 'Mỗi tối tôi học lúc 10 giờ.', [A]),
    ],
    notes='Không nói 毎朝に, あしたに, きのうに: các từ này không đi với に.')

# ---------------------------------------------------------------------------
def frm(subj, a, b, tail, slot='kara'):
    k = '[P]から' if slot == 'kara' else 'から'
    m = '[P]まで' if slot == 'made' else 'まで'
    return s(subj, 'は', *a, k, *b, m, *tail, '。')


p4 = point(4, 4, 'N1 から N2 まで', 'Từ N1 đến N2',
    'から chỉ điểm bắt đầu, まで chỉ điểm kết thúc, dùng cho thời gian (và nơi chốn ở bài sau): 9時から5時まで働きます. '
    'Có thể dùng riêng từng từ: 9時からです (bắt đầu từ 9 giờ), 8時までです (đến 8 giờ). '
    'Nói giờ mở cửa: 銀行は9時から3時までです.',
    [
        (frm('私', t(9), t(5), ['働きます']), 'Tôi làm việc từ 9 giờ đến 5 giờ.'),
        (frm('銀行', t(9), t(3), ['です'], 'made'), 'Ngân hàng mở cửa từ 9 giờ đến 3 giờ.', [A1]),
        (frm('図書館', t(9), t(6), ['です']), 'Thư viện mở cửa từ 9 giờ đến 6 giờ.', [A1]),
        (frm('昼休み', t(12), t(1), ['です'], 'made'), 'Giờ nghỉ trưa từ 12 giờ đến 1 giờ.', [A1]),
        (frm('私', ['月曜日'], ['金曜日'], ['働きます']), 'Tôi làm việc từ thứ hai đến thứ sáu.'),
        (frm('デパート', t(10), t(8), ['です'], 'made'), 'Cửa hàng bách hóa mở cửa từ 10 giờ đến 8 giờ.', [A1]),
        (s('私', 'は', '毎晩', *t(7), '[P]から', *t(9), 'まで', '勉強します', '。'), 'Mỗi tối tôi học từ 7 giờ đến 9 giờ.'),
        (frm('郵便局', t(9), t(5), ['です'], 'made'), 'Bưu điện mở cửa từ 9 giờ đến 5 giờ.', [A1]),
        (frm('美術館', ['火曜日'], ['日曜日'], ['です']), 'Bảo tàng mở cửa từ thứ ba đến chủ nhật.', [A1]),
        (frm('休み', ['土曜日'], ['月曜日'], ['です'], 'made'), 'Kỳ nghỉ từ thứ bảy đến thứ hai.', [A1]),
        (s('銀行', 'は', '何時', '[P]から', '何時', 'まで', 'ですか', '。'), 'Ngân hàng mở cửa từ mấy giờ đến mấy giờ?', [C1]),
        (s(*t(9), 'から', *t(3), '[P]まで', 'です', '。'), 'Từ 9 giờ đến 3 giờ.', [A1],
         (s('銀行', 'は', '何時', 'から', '何時', 'まで', 'ですか', '。'), 'Ngân hàng mở cửa từ mấy giờ đến mấy giờ?', ['はい、9時から3時までです。', '9時から3時までですか。', '9時に3時までです。'])),
        (frm('ミラーさん', t(9), t(5), ['働きます'], 'made'), 'Anh Miller làm việc từ 9 giờ đến 5 giờ.'),
        (s('きのう', '私', 'は', *t(8), '[P]から', *t(10), 'まで', '勉強しました', '。'), 'Hôm qua tôi đã học từ 8 giờ đến 10 giờ.', [B]),
        (s('カリナさん', 'は', '午後', *t(1), 'から', *t(3), '[P]まで', '休みました', '。'), 'Chị Karina đã nghỉ từ 1 giờ đến 3 giờ chiều.', [B]),
        (s('デパート', 'は', '何時', '[P]まで', 'ですか', '。'), 'Cửa hàng bách hóa mở cửa đến mấy giờ?', [C1]),
        (s(*t(8), '[P]まで', 'です', '。'), 'Đến 8 giờ.', [A1],
         (s('デパート', 'は', '何時', 'まで', 'ですか', '。'), 'Cửa hàng bách hóa mở cửa đến mấy giờ?', ['はい、8時までです。', '8時までですか。', '8時のです。'])),
        (s('図書館', 'は', *t(9), '[P]から', 'です', '。'), 'Thư viện mở cửa từ 9 giờ.', [A1]),
        (s('私', 'は', '朝', '[P]から', '晩', 'まで', '働きます', '。'), 'Tôi làm việc từ sáng đến tối.'),
        (s('ワンさん', 'は', '月曜日', 'から', '水曜日', '[P]まで', '休みます', '。'), 'Anh Wang nghỉ từ thứ hai đến thứ tư.'),
        (s('銀行', 'は', *t(9), 'から', *t(3), '[P]まで', 'です', '。', '土曜日', 'は', '休み', 'です', '。'), 'Ngân hàng mở cửa từ 9 giờ đến 3 giờ. Thứ bảy nghỉ.', [A1]),
        (s('私', 'は', '毎日', *t(9), '[P]から', *t(5), 'まで', '働きます', '。', 'きのう', 'も', '働きました', '。'), 'Ngày nào tôi cũng làm việc từ 9 giờ đến 5 giờ. Hôm qua tôi cũng đã làm việc.', [B, D1]),
        (s('昼休み', 'は', '何時', '[P]から', 'ですか', '。'), 'Giờ nghỉ trưa bắt đầu từ mấy giờ?', [C1]),
        (s(*t(12), '[P]から', 'です', '。'), 'Từ 12 giờ.', [A1],
         (s('昼休み', 'は', '何時', 'から', 'ですか', '。'), 'Giờ nghỉ trưa bắt đầu từ mấy giờ?', ['はい、12時からです。', '12時からですか。', '12時にです。'])),
        (s('美術館', 'は', '月曜日', '[P]から', '金曜日', 'まで', 'ですか', '。'), 'Bảo tàng mở cửa từ thứ hai đến thứ sáu à?', [C1]),
        (s('いいえ', '、', '火曜日', 'から', '日曜日', '[P]まで', 'です', '。'), 'Không, từ thứ ba đến chủ nhật.', [C1],
         (s('美術館', 'は', '月曜日', 'から', '金曜日', 'まで', 'ですか', '。'), 'Bảo tàng mở cửa từ thứ hai đến thứ sáu à?',
          ['はい、火曜日から日曜日までです。', 'いいえ、月曜日から金曜日までです。', 'いいえ、火曜日に日曜日までです。'])),
        (s('ミラーさん', 'の', '会社', 'は', *t(9), '[P]から', *t(6), 'まで', 'です', '。'), 'Công ty của anh Miller làm việc từ 9 giờ đến 6 giờ.', [E1]),
        (s('きのう', 'は', '何時', 'から', '何時', '[P]まで', '働きました', 'か', '。'), 'Hôm qua bạn đã làm việc từ mấy giờ đến mấy giờ?', [B, C1]),
        (s(*t(9), 'から', *t(7), '[P]まで', '働きました', '。'), 'Tôi đã làm việc từ 9 giờ đến 7 giờ.', [B],
         (s('きのう', 'は', '何時', 'から', '何時', 'まで', '働きました', 'か', '。'), 'Hôm qua bạn đã làm việc từ mấy giờ đến mấy giờ?',
          ['はい、9時から7時まで働きました。', '9時から7時まで働きましたか。', '9時に7時まで働きました。'])),
        (s('この', 'デパート', 'は', *t(10), 'から', 'です', '。', 'あの', 'デパート', 'も', *t(10), '[P]から', 'です', '。'), 'Cửa hàng bách hóa này mở từ 10 giờ. Cửa hàng bách hóa kia cũng mở từ 10 giờ.', [B2, D1]),
    ])

# ---------------------------------------------------------------------------
def to(*parts):
    return s(*parts)


p5 = point(4, 5, 'N1 と N2', 'N1 và N2',
    'と nối hai (hoặc nhiều) danh từ ngang hàng, nghĩa là "và": 月曜日と水曜日 (thứ hai và thứ tư), ミラーさんとサントスさん. '
    'と chỉ nối danh từ, không nối hai câu.',
    [
        (to('私', 'は', '月曜日', '[P]と', '水曜日', 'に', '勉強します', '。'), 'Tôi học vào thứ hai và thứ tư.', [C]),
        (to('私', 'は', '金曜日', '[P]と', '土曜日', 'に', '休みます', '。'), 'Tôi nghỉ vào thứ sáu và thứ bảy.', [C]),
        (to('銀行', 'の', '休み', 'は', '土曜日', '[P]と', '日曜日', 'です', '。'), 'Ngày nghỉ của ngân hàng là thứ bảy và chủ nhật.', [A1, E1]),
        (to('美術館', '[P]と', '図書館', 'は', '月曜日', 'に', '休みます', '。'), 'Bảo tàng và thư viện nghỉ vào thứ hai.', [C]),
        (to('郵便局', '[P]と', '銀行', 'は', *t(5), 'に', '終わります', '。'), 'Bưu điện và ngân hàng đóng cửa lúc 5 giờ.', [C]),
        (to('ミラーさん', '[P]と', 'サントスさん', 'は', '会社員', 'です', '。'), 'Anh Miller và anh Santos là nhân viên công ty.', [A1]),
        (to('これ', '[P]と', 'それ', 'は', '私', 'の', '本', 'です', '。'), 'Cái này và cái đó là sách của tôi.', [E1]),
        (to('私', 'は', '火曜日', '[P]と', '木曜日', 'に', '働きます', '。'), 'Tôi làm việc vào thứ ba và thứ năm.', [C]),
        (to('カリナさん', '[P]と', 'タワポンさん', 'は', '学生', 'です', '。'), 'Chị Karina và anh Thawaphon là sinh viên.', [A1]),
        (to('銀行', '[P]と', 'デパート', 'は', *t(9), 'から', 'です', '。'), 'Ngân hàng và cửa hàng bách hóa mở cửa từ 9 giờ.', [D]),
        (to('朝', '[P]と', '晩', 'に', '勉強します', '。'), 'Tôi học vào buổi sáng và buổi tối.'),
        (to('きのう', '[P]と', 'おととい', '休みました', '。'), 'Hôm qua và hôm kia tôi đã nghỉ.', [B]),
        (to('何曜日', 'に', '休みます', 'か', '。'), 'Bạn nghỉ vào những thứ mấy?', [C, C1]),
        (to('土曜日', '[P]と', '日曜日', 'に', '休みます', '。'), 'Tôi nghỉ vào thứ bảy và chủ nhật.', [C],
         (s('何曜日', 'に', '休みます', 'か', '。'), 'Bạn nghỉ vào những thứ mấy?', ['はい、土曜日と日曜日に休みます。', '土曜日の日曜日に休みます。', '土曜日と日曜日に休みますか。'])),
        (to('ミラーさん', '[P]と', 'カリナさん', 'は', 'あした', '休みます', '。'), 'Ngày mai anh Miller và chị Karina nghỉ.', [B]),
        (to('この', '時計', '[P]と', 'その', '時計', 'は', 'スイス', 'の', '時計', 'です', '。'), 'Cái đồng hồ này và cái đồng hồ đó là đồng hồ Thụy Sĩ.', [B2, E1]),
        (to('図書館', '[P]と', '美術館', 'は', '何時', 'まで', 'ですか', '。'), 'Thư viện và bảo tàng mở cửa đến mấy giờ?', [C1, D]),
        (to('私', '[P]と', 'ミラーさん', 'は', '毎晩', '勉強します', '。'), 'Tôi và anh Miller tối nào cũng học.', [B]),
        (to('ワイン', '[P]と', 'たばこ', 'は', '地下', 'です', '。'), 'Rượu vang và thuốc lá ở tầng hầm.', [B3]),
        (to('コーヒー', '[P]と', 'チョコレート', 'は', '1000', '円', 'です', '。'), 'Cà phê và sô-cô-la giá 1.000 yên.', [E3]),
        (to('私', 'は', '月曜日', '[P]と', '水曜日', 'と', '金曜日', 'に', '勉強します', '。'), 'Tôi học vào thứ hai, thứ tư và thứ sáu.', [C]),
        (to('銀行', 'と', '郵便局', 'は', '土曜日', '[P]と', '日曜日', 'に', '休みます', '。'), 'Ngân hàng và bưu điện nghỉ vào thứ bảy và chủ nhật.', [C]),
        (to('ミラーさん', '[P]と', '私', 'は', 'さくら大学', 'の', '学生', 'じゃありません', '。'), 'Anh Miller và tôi không phải là sinh viên trường đại học Sakura.', [B1, E1]),
        (to('あした', '[P]と', 'あさって', '働きます', 'か', '。'), 'Ngày mai và ngày mốt bạn có làm việc không?', [B, C1]),
        (to('いいえ', '、', 'あした', '[P]と', 'あさって', 'は', '休みます', '。'), 'Không, ngày mai và ngày mốt tôi nghỉ.', [B, C1],
         (s('あした', 'と', 'あさって', '働きます', 'か', '。'), 'Ngày mai và ngày mốt bạn có làm việc không?',
          ['はい、あしたとあさっては休みます。', 'いいえ、あしたとあさっては働きます。', 'いいえ、あしたのあさっては休みます。'])),
        (to('この', 'かばん', '[P]と', 'その', 'かばん', 'は', 'いくら', 'ですか', '。'), 'Cái cặp này và cái cặp đó bao nhiêu tiền?', [B2, E3]),
        (to('カリナさん', '[P]と', 'イーさん', 'は', *t(9), 'から', *t(5), 'まで', '勉強します', '。'), 'Chị Karina và chị Lee học từ 9 giờ đến 5 giờ.', [D]),
        (to('銀行', '[P]と', '郵便局', 'は', *t(9), 'から', 'です', '。'), 'Ngân hàng và bưu điện mở cửa từ 9 giờ.', [D]),
        (to('ワンさん', '[P]と', 'シュミットさん', 'の', '部屋', 'は', '3階{さんがい}', 'です', '。'), 'Phòng của anh Wang và ông Schmidt ở tầng 3.', [B3, E1]),
        (to('今日', '[P]と', 'あした', 'は', '休み', 'です', '。'), 'Hôm nay và ngày mai là ngày nghỉ.', [A1]),
    ])

# ---------------------------------------------------------------------------
def ne(*parts):
    return s(*parts, '[P]ね', '。')


p6 = point(4, 6, '～ね', '~ nhỉ / ~ nhé',
    'ね đặt cuối câu khi người nói mong người nghe đồng tình, hoặc xác nhận điều cả hai đều biết: 大変ですね (vất vả nhỉ), '
    'あしたは休みですね (ngày mai là ngày nghỉ nhỉ). Khác か là hỏi điều chưa biết.',
    [
        (ne('毎日', '働きます'), 'Ngày nào bạn cũng làm việc nhỉ.'),
        (ne('毎晩', '勉強します'), 'Tối nào bạn cũng học nhỉ.'),
        (ne('この', '時計', 'は', 'スイス', 'の', '時計', 'です'), 'Cái đồng hồ này là đồng hồ Thụy Sĩ nhỉ.', [B2]),
        (ne('あした', 'は', '休み', 'です'), 'Ngày mai là ngày nghỉ nhỉ.', [A1]),
        (ne('ここ', 'は', '図書館', 'です'), 'Đây là thư viện nhỉ.', [A1]),
        (ne('今', *t(3), 'です'), 'Bây giờ là 3 giờ nhỉ.', [A]),
        (ne('銀行', 'は', *t(3), 'まで', 'です'), 'Ngân hàng mở cửa đến 3 giờ nhỉ.', [D]),
        (ne('ミラーさん', 'は', 'アメリカ人', 'です'), 'Anh Miller là người Mỹ nhỉ.', [A1]),
        (ne('この', 'ワイン', 'は', '2000', '円', 'です'), 'Chai rượu vang này giá 2.000 yên nhỉ.', [E3]),
        (ne('今朝', *t(6), 'に', 'おきました'), 'Sáng nay bạn thức dậy lúc 6 giờ nhỉ.', [C]),
        (ne('デパート', 'は', *t(8), 'まで', 'です'), 'Cửa hàng bách hóa mở cửa đến 8 giờ nhỉ.', [D]),
        (ne('あの人', 'は', '先生', 'です'), 'Người kia là giáo viên nhỉ.', [A1]),
        (ne('毎朝', *t(5), 'に', 'おきます'), 'Mỗi sáng bạn thức dậy lúc 5 giờ nhỉ.', [C]),
        (ne('カリナさん', 'は', 'さくら大学', 'の', '学生', 'です'), 'Chị Karina là sinh viên trường đại học Sakura nhỉ.', [E1]),
        (ne('今日', 'は', '月曜日', 'です'), 'Hôm nay là thứ hai nhỉ.', [A1]),
        (ne('図書館', 'は', '土曜日', 'も', '休みます'), 'Thư viện thứ bảy cũng nghỉ nhỉ.', [D1]),
        (ne('これ', 'は', 'イタリア', 'の', '靴', 'です'), 'Đây là giày Ý nhỉ.', [E1]),
        (ne('会議室', 'は', '3階{さんがい}', 'です'), 'Phòng họp ở tầng 3 nhỉ.', [B3]),
        (ne('ワンさん', 'は', '毎日', *t(9), 'まで', '働きます'), 'Anh Wang ngày nào cũng làm việc đến 9 giờ nhỉ.', [D]),
        (ne('あした', 'は', '日曜日', 'です'), 'Ngày mai là chủ nhật nhỉ.', [A1]),
        (ne('ミラーさん', 'は', *t(9), 'から', *t(7), 'まで', '働きます'), 'Anh Miller làm việc từ 9 giờ đến 7 giờ nhỉ.', [D]),
        (ne('銀行', 'と', '郵便局', 'は', '土曜日', 'に', '休みます'), 'Ngân hàng và bưu điện nghỉ vào thứ bảy nhỉ.', [C, E]),
        (ne('この', 'コンピュータ', 'は', '98000', '円', 'です'), 'Cái máy vi tính này giá 98.000 yên nhỉ.', [E3]),
        (ne('ロンドン', 'は', '今', '午前', *t(6), 'です'), 'Ở London bây giờ là 6 giờ sáng nhỉ.', [A]),
        (ne('あの', 'デパート', 'は', '毎日', *t(10), 'から', 'です'), 'Cửa hàng bách hóa kia ngày nào cũng mở từ 10 giờ nhỉ.', [D]),
        (ne('カリナさん', 'も', '毎晩', '勉強します'), 'Chị Karina cũng tối nào cũng học nhỉ.', [D1]),
        (ne('トイレ', 'は', 'あそこ', 'です'), 'Nhà vệ sinh ở đằng kia nhỉ.', [B3]),
        (ne('あの方', 'は', 'シュミットさん', 'です'), 'Vị kia là ông Schmidt nhỉ.', [A1]),
        (ne('きのう', 'は', *t(5), 'に', '終わりました'), 'Hôm qua kết thúc lúc 5 giờ nhỉ.', [C]),
        (ne('昼休み', 'は', *t(12), 'から', *t(1), 'まで', 'です'), 'Giờ nghỉ trưa từ 12 giờ đến 1 giờ nhỉ.', [D]),
    ],
    notes='ね mong người nghe đồng tình; か hỏi điều chưa biết. Câu đáp quen thuộc: 大変ですね (vất vả nhỉ).')

# Chủ dự án duyệt bài 4 ngày 2026-11-12
for p in (p1, p2, p3, p4, p5, p6):
    p['approved'] = True
write(4, [p1, p2, p3, p4, p5, p6])
