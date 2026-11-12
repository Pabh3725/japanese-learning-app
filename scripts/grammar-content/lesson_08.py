"""Ngữ pháp bài 8 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–8.
Chạy: python3 -I scripts/grammar-content/lesson_08.py  → data/grammar/lesson-08.json
Chưa học thể quá khứ của tính từ (bài 12): mọi câu ở hiện tại.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(8)
A1, C1, D1, E1 = 'g01-01', 'g01-03', 'g01-04', 'g01-05'
B2, D2, F2 = 'g02-02', 'g02-04', 'g02-06'
B4, D4, F4 = 'g04-02', 'g04-04', 'g04-06'
A5, C5, F5 = 'g05-01', 'g05-03', 'g05-06'
A6, C6, D6, E6 = 'g06-01', 'g06-03', 'g06-04', 'g06-05'
C7, D7 = 'g07-03', 'g07-04'
A, B, C, D, E, F = 'g08-01', 'g08-02', 'g08-03', 'g08-04', 'g08-05', 'g08-06'

NA = '[P:の,に,で]な'                 # な-adj な N
TOTEMO = '[W:あまり,どう,どれ]とても'   # あまり chỉ đi với phủ định
AMARI = '[W:どう,どれ,どんな]あまり'
DOU = '[W:どんな,この,その]どう'
DONNA = '[W:どう,どれ,どこ]どんな'
GA = '[P:を,に,の]が'
SOSHITE = '[W:あまり,どう,どれ]そして'


def ip(a):
    """い-adj khẳng định: 高いです."""
    return f'[F:*{a[:-1]}くです,*{a}なです,*{a}だです]{a}です'


def ineg(a):
    """い-adj phủ định: 高くないです (高くありません cũng đúng). いい → よくないです."""
    stem = 'よ' if a == 'いい' else a[:-1]
    return f'[F:*{a}くないです,*{a}じゃありません,*{stem}くないじゃありません/{stem}くありません]{stem}くないです'


def nap(a):
    """な-adj khẳng định: 静かです."""
    return f'[F:*{a}いです,*{a}なです,*{a}だです]{a}です'


def naneg(a):
    """な-adj phủ định: 静かじゃありません (静かではありません cũng đúng)."""
    return f'[F:*{a}くないです,*{a}ないです,*{a}なじゃありません/{a}ではありません]{a}じゃありません'


def iw(a):
    """い-adj đứng trước danh từ: 高い時計."""
    return f'[W:*{a}な,*{a}の,*{a}だ]{a}'


def s(*parts):
    return '|'.join(parts)


def plain(p):
    return p.split('{')[0].split(']')[-1]


def text(parts):
    return ''.join(plain(p) for p in parts)


def ans(parts, meaning, uses, q, qm, wrong):
    return (s(*parts), meaning, uses, (q, qm, wrong))


# ---------------------------------------------------------------------------
Q11 = s('この', '本', 'は', 'おもしろい', 'です', 'か', '。')
Q14 = s('ミラーさん', 'の', '部屋', 'は', 'きれい', 'です', 'か', '。')
Q16 = s('シャンハイ', 'は', 'にぎやか', 'です', 'か', '。')
Q25 = s('あの', '先生', 'は', '有名', 'です', 'か', '。')

p1 = point(8, 1, 'N は い-adj／な-adj です', 'N thì (tính chất)',
    'Tính từ tiếng Nhật có hai loại. Tính từ い kết thúc bằng い: 高い (đắt), おもしろい (thú vị). '
    'Tính từ な: 静か (yên tĩnh), 親切 (tử tế). Khẳng định đều thêm です: 高いです, 静かです. '
    'Phủ định khác nhau: tính từ い bỏ い thêm くないです (高くないです; いい → よくないです); '
    'tính từ な thêm じゃありません như danh từ (静かじゃありません). Nói 高いじゃありません là sai.',
    [
        (s('この', '本', 'は', ip('おもしろい'), '。'), 'Cuốn sách này thú vị.', [A1]),
        (s('この', 'カメラ', 'は', ip('高い'), '。'), 'Cái máy ảnh này đắt.', [A1]),
        (s('ミラーさん', 'は', nap('親切'), '。'), 'Anh Miller tử tế.', [A1]),
        (s('この', '町', 'は', nap('静か'), '。'), 'Thành phố này yên tĩnh.', [A1]),
        (s('この', 'かばん', 'は', ineg('高い'), '。'), 'Cái cặp này không đắt.'),
        (s('日本語', 'は', ineg('難しい'), '。'), 'Tiếng Nhật không khó.'),
        (s('私', 'の', '部屋', 'は', naneg('きれい'), '。'), 'Phòng của tôi không sạch.', [E1]),
        (s('ワンさん', 'は', nap('元気'), '。'), 'Anh Wang khỏe.', [A1]),
        (s('今日', 'は', ip('暑い'), '。'), 'Hôm nay trời nóng.', [A1]),
        (s('この', '辞書', 'は', naneg('便利'), '。'), 'Cuốn từ điển này không tiện.'),
        (s('この', '本', 'は', ip('おもしろい'), 'か', '。'), 'Cuốn sách này có thú vị không?', [C1]),
        ans(['はい', '、', ip('おもしろい'), '。'], 'Vâng, thú vị.', [], Q11, 'Cuốn sách này có thú vị không?',
            ['いいえ、おもしろいです。', 'はい、おもしろくないです。', 'はい、おもしろいですか。']),
        ans(['いいえ', '、', ineg('おもしろい'), '。'], 'Không, không thú vị.', [], Q11, 'Cuốn sách này có thú vị không?',
            ['はい、おもしろくないです。', '*いいえ、おもしろいじゃありません。', 'いいえ、おもしろくないですか。']),
        (s('ミラーさん', 'の', '部屋', 'は', nap('きれい'), 'か', '。'), 'Phòng của anh Miller có sạch không?', [C1, E1]),
        ans(['いいえ', '、', naneg('きれい'), '。'], 'Không, không sạch.', [], Q14, 'Phòng của anh Miller có sạch không?',
            ['はい、きれいじゃありません。', '*いいえ、きれいくないです。', 'いいえ、きれいじゃありませんか。']),
        (s('シャンハイ', 'は', nap('にぎやか'), 'か', '。'), 'Thượng Hải có nhộn nhịp không?', [C1]),
        ans(['はい', '、', nap('にぎやか'), '。'], 'Vâng, nhộn nhịp.', [], Q16, 'Thượng Hải có nhộn nhịp không?',
            ['いいえ、にぎやかです。', '*はい、にぎやかくないです。', 'はい、にぎやかですか。']),
        (s('今日', 'は', ineg('寒い'), '。'), 'Hôm nay trời không lạnh.'),
        (s('この', '車', 'は', ineg('新しい'), '。', '古い', 'です', '。'), 'Chiếc xe này không mới. Nó cũ.'),
        (s('この', '時計', 'は', ineg('いい'), '。'), 'Chiếc đồng hồ này không tốt.'),
        (s('あの', 'レストラン', 'は', ineg('高い'), '。', '安い', 'です', 'よ', '。'), 'Nhà hàng kia không đắt. Rẻ đấy.', [F5]),
        (s('カリナさん', 'は', '今日', naneg('暇'), '。', '会社', 'で', '働きます', '。'), 'Hôm nay chị Karina không rảnh. Chị ấy làm việc ở công ty.', [C6]),
        (s('日本', 'の', '生活', 'は', ip('楽しい'), '。'), 'Cuộc sống ở Nhật vui.', [E1]),
        (s('ミラーさん', 'の', 'カメラ', 'は', '新しい', 'です', '。', '私', 'の', 'カメラ', 'は', ineg('新しい'), '。'), 'Máy ảnh của anh Miller mới. Máy ảnh của tôi không mới.', [E1]),
        (s('あの', '先生', 'は', nap('有名'), 'か', '。'), 'Giáo viên kia có nổi tiếng không?', [C1]),
        ans(['いいえ', '、', 'あの', '先生', 'は', naneg('有名'), '。'], 'Không, giáo viên kia không nổi tiếng.', [B2], Q25, 'Giáo viên kia có nổi tiếng không?',
            ['はい、あの先生は有名じゃありません。', '*いいえ、あの先生は有名くないです。', 'いいえ、あの先生は有名じゃありませんか。']),
        (s('この', 'お茶', 'は', ineg('熱い'), '。', '冷たい', 'です', '。'), 'Trà này không nóng. Nó lạnh.', [B2]),
        (s('あした', 'は', naneg('暇'), '。', '会社', 'へ', '行きます', '。'), 'Ngày mai tôi không rảnh. Tôi đi đến công ty.', [A5]),
        (s('この', '映画', 'は', ineg('おもしろい'), '。', '見ません', '。'), 'Bộ phim này không hay. Tôi không xem.', [B4]),
        (s('ワンさん', 'の', 'お仕事', 'は', ip('忙しい'), 'か', '。'), 'Công việc của anh Wang có bận không?', [C1, E1]),
    ],
    notes='Tính từ い phủ định: ～くないです (hoặc ～くありません). Tính từ な phủ định: ～じゃありません. '
          'Lưu ý きれい, 有名 là tính từ な dù kết thúc bằng い.')

# ---------------------------------------------------------------------------
p2 = point(8, 2, 'な-adj な N／い-adj N', 'N (có tính chất)',
    'Tính từ đứng trước danh từ để bổ nghĩa. Tính từ い giữ nguyên: 高い時計 (đồng hồ đắt), おもしろい本 (sách hay). '
    'Tính từ な thêm な: 静かな町 (thành phố yên tĩnh), 親切な人 (người tử tế). '
    'Không thêm の: 静かの町, 高いの時計 đều sai.',
    [
        (s('ミラーさん', 'は', '親切', NA, '人', 'です', '。'), 'Anh Miller là người tử tế.', [A1]),
        (s('これ', 'は', iw('おもしろい'), '本', 'です', '。'), 'Đây là cuốn sách hay.', [A1]),
        (s('ここ', 'は', '静か', NA, '町', 'です', '。'), 'Đây là thành phố yên tĩnh.', [A1]),
        (s('それ', 'は', iw('高い'), '時計', 'です', '。'), 'Đó là chiếc đồng hồ đắt tiền.', [A1]),
        (s('カリナさん', 'は', 'きれい', NA, '人', 'です', '。'), 'Chị Karina là người đẹp.', [A1]),
        (s('これ', 'は', iw('新しい'), '車', 'です', '。'), 'Đây là chiếc xe mới.', [A1]),
        (s('ワンさん', 'は', '有名', NA, '医者', 'です', '。'), 'Anh Wang là bác sĩ nổi tiếng.', [A1]),
        (s('あれ', 'は', iw('大きい'), '山', 'です', '。'), 'Kia là ngọn núi lớn.', [A1]),
        (s('これ', 'は', '便利', NA, '辞書', 'です', '。'), 'Đây là cuốn từ điển tiện lợi.', [A1]),
        (s('サントスさん', 'は', iw('やさしい'), '人', 'です', '。'), 'Anh Santos là người hiền lành.', [A1]),
        (s('シャンハイ', 'は', 'にぎやか', NA, '町', 'です', '。'), 'Thượng Hải là thành phố nhộn nhịp.', [A1]),
        (s('私', 'は', iw('赤い'), 'かばん', 'を', '買いました', '。'), 'Tôi đã mua một cái cặp màu đỏ.', [A6, B4]),
        (s('ミラーさん', 'は', 'ハンサム', NA, '人', 'です', '。'), 'Anh Miller là người đẹp trai.', [A1]),
        (s('きのう', iw('白い'), 'シャツ', 'を', 'もらいました', '。'), 'Hôm qua tôi đã nhận một chiếc áo sơ mi trắng.', [A6, D7]),
        (s('ここ', 'は', '有名', NA, 'レストラン', 'です', '。'), 'Đây là nhà hàng nổi tiếng.', [A1]),
        (s('あの', iw('黒い'), 'かばん', 'は', 'ミラーさん', 'の', 'です', '。'), 'Cái cặp đen kia là của anh Miller.', [F2]),
        (s('日本', 'の', iw('古い'), '映画', 'を', '見ました', '。'), 'Tôi đã xem một bộ phim cũ của Nhật.', [A6, B4, E1]),
        (s('カリナさん', 'は', '元気', NA, '人', 'です', '。'), 'Chị Karina là người khỏe khoắn.', [A1]),
        (s('私', 'は', '毎晩', iw('冷たい'), 'ビール', 'を', '飲みます', '。'), 'Tối nào tôi cũng uống bia lạnh.', [A6]),
        (s('あれ', 'は', '有名', NA, '桜', 'です', '。'), 'Kia là cây hoa anh đào nổi tiếng.', [A1]),
        (s('ワンさん', 'は', '病院', 'で', '働きます', '。', '親切', NA, '医者', 'です', '。'), 'Anh Wang làm việc ở bệnh viện. Anh ấy là bác sĩ tử tế.', [C6]),
        (s('ここ', 'は', '静か', NA, '所', 'です', '。', 'ここ', 'で', '勉強しましょう', '。'), 'Đây là chỗ yên tĩnh. Cùng học ở đây nhé.', [C6, E6]),
        (s('私', 'は', 'きのう', 'デパート', 'で', iw('青い'), 'ネクタイ', 'を', '買いました', '。'), 'Hôm qua tôi đã mua cà vạt màu xanh ở cửa hàng bách hóa.', [A6, B4, C6]),
        (s('これ', 'は', '日本', 'の', iw('おいしい'), 'お茶', 'です', '。'), 'Đây là loại trà ngon của Nhật.', [E1]),
        (s('カリナさん', 'に', 'きれい', NA, '花', 'を', 'あげました', '。'), 'Tôi đã tặng chị Karina những bông hoa đẹp.', [B4, C7]),
        (s('ミラーさん', 'は', iw('大きい'), '車', 'で', '会社', 'へ', '行きます', '。'), 'Anh Miller đi đến công ty bằng chiếc xe lớn.', [A5, C5]),
        (s('ワンさん', 'の', 'りょう', 'は', '便利', NA, '所', 'です', '。'), 'Ký túc xá của anh Wang ở chỗ tiện lợi.', [E1]),
        (s('あした', 'いっしょに', '有名', NA, 'レストラン', 'で', '晩ごはん', 'を', '食べませんか', '。'), 'Ngày mai cùng ăn tối ở một nhà hàng nổi tiếng không?', [C6, D6]),
        (s('これ', 'は', iw('新しい'), 'パソコン', 'です', 'か', '、', '古い', 'パソコン', 'です', 'か', '。'), 'Đây là máy tính mới hay máy tính cũ?', [D2]),
        (s('私', 'は', '毎晩', iw('難しい'), '本', 'を', '読みます', '。'), 'Tối nào tôi cũng đọc sách khó.', [A6]),
    ],
    notes='Tính từ な: 静かな町. Tính từ い: 静か → không; 高い時計 (không có な, không có の).')

# ---------------------------------------------------------------------------
Q3a = s('この', '映画', 'は', 'おもしろい', 'です', 'か', '。')

p3 = point(8, 3, 'とても／あまり', 'Rất / không … lắm',
    'とても (rất) đứng trước tính từ ở câu khẳng định: とてもおもしろいです. '
    'あまり (không … lắm) chỉ đi với câu phủ định: あまりおもしろくないです (không thú vị lắm), '
    'あまり静かじゃありません. Nói あまりおもしろいです là sai.',
    [
        (s('この', '本', 'は', TOTEMO, 'おもしろい', 'です', '。'), 'Cuốn sách này rất thú vị.', [A]),
        (s('この', 'カメラ', 'は', TOTEMO, '高い', 'です', '。'), 'Cái máy ảnh này rất đắt.', [A]),
        (s('日本語', 'は', AMARI, '難しくない', 'です', '。'), 'Tiếng Nhật không khó lắm.', [A]),
        (s('この', '町', 'は', TOTEMO, '静か', 'です', '。'), 'Thành phố này rất yên tĩnh.', [A]),
        (s('この', 'かばん', 'は', AMARI, '高くない', 'です', '。'), 'Cái cặp này không đắt lắm.', [A]),
        (s('ミラーさん', 'は', TOTEMO, '親切', 'です', '。'), 'Anh Miller rất tử tế.', [A]),
        (s('今日', 'は', AMARI, '寒くない', 'です', '。'), 'Hôm nay trời không lạnh lắm.', [A]),
        (s('この', '辞書', 'は', AMARI, '便利', 'じゃありません', '。'), 'Cuốn từ điển này không tiện lắm.', [A]),
        (s('シャンハイ', 'は', TOTEMO, 'にぎやか', 'です', '。'), 'Thượng Hải rất nhộn nhịp.', [A]),
        (s('この', 'お茶', 'は', TOTEMO, 'おいしい', 'です', '。'), 'Trà này rất ngon.', [A]),
        (s('この', '映画', 'は', ip('おもしろい'), 'か', '。'), 'Bộ phim này có hay không?', [A, C1]),
        ans(['はい', '、', TOTEMO, 'おもしろい', 'です', '。'], 'Vâng, rất hay.', [A], Q3a, 'Bộ phim này có hay không?',
            ['はい、あまりおもしろいです。', 'いいえ、とてもおもしろいです。', 'はい、とてもおもしろいですか。']),
        ans(['いいえ', '、', AMARI, 'おもしろくない', 'です', '。'], 'Không, không hay lắm.', [A], Q3a, 'Bộ phim này có hay không?',
            ['はい、あまりおもしろくないです。', 'いいえ、あまりおもしろいです。', 'いいえ、あまりおもしろくないですか。']),
        (s('ワンさん', 'は', '今', AMARI, '忙しくない', 'です', '。'), 'Bây giờ anh Wang không bận lắm.', [A]),
        (s('あの', 'レストラン', 'は', TOTEMO, '有名', 'です', '。'), 'Nhà hàng kia rất nổi tiếng.', [A]),
        (s('日本', 'の', '食べ物', 'は', TOTEMO, 'おいしい', 'です', '。'), 'Đồ ăn Nhật rất ngon.', [A, E1]),
        (s('この', '車', 'は', AMARI, '新しくない', 'です', '。'), 'Chiếc xe này không mới lắm.', [A]),
        (s('私', 'の', '部屋', 'は', AMARI, 'きれい', 'じゃありません', '。'), 'Phòng của tôi không sạch lắm.', [A, E1]),
        (s('カリナさん', 'は', TOTEMO, '元気', 'です', '。'), 'Chị Karina rất khỏe.', [A]),
        (s('この', 'パソコン', 'は', AMARI, 'よくない', 'です', '。'), 'Máy tính này không tốt lắm.', [A]),
        (s('これ', 'は', TOTEMO, 'おもしろい', '本', 'です', '。'), 'Đây là cuốn sách rất thú vị.', [B]),
        (s('ここ', 'は', AMARI, '静か', 'な', '所', 'じゃありません', '。'), 'Đây không phải chỗ yên tĩnh lắm.', [B]),
        (s('きのう', TOTEMO, 'おいしい', 'お茶', 'を', 'もらいました', '。'), 'Hôm qua tôi đã nhận được loại trà rất ngon.', [A6, B, D7]),
        (s('あの', '山', 'は', AMARI, '高くない', 'です', '。', '小さい', '山', 'です', '。'), 'Ngọn núi kia không cao lắm. Là ngọn núi nhỏ.', [A, B]),
        (s('ミラーさん', 'は', TOTEMO, '親切', 'な', '人', 'です', '。'), 'Anh Miller là người rất tử tế.', [B]),
        (s('日本語', 'の', '勉強', 'は', AMARI, '難しくない', 'です', '。'), 'Việc học tiếng Nhật không khó lắm.', [A, E1]),
        (s('この', '町', 'は', TOTEMO, 'にぎやか', 'です', 'ね', '。'), 'Thành phố này nhộn nhịp quá nhỉ.', [A, F4]),
        (s('今日', 'は', AMARI, '暑くない', 'です', 'ね', '。', 'いっしょに', 'テニス', 'を', 'しませんか', '。'), 'Hôm nay trời không nóng lắm nhỉ. Cùng chơi quần vợt không?', [A, D6, F4]),
        (s('あの', '店', 'は', TOTEMO, '安い', 'です', 'よ', '。'), 'Cửa hàng kia rẻ lắm đấy.', [A, F5]),
        (s('この', 'シャツ', 'は', AMARI, 'すてき', 'じゃありません', '。'), 'Chiếc áo sơ mi này không đẹp lắm.', [A]),
    ],
    notes='とても + khẳng định; あまり + phủ định.')

# ---------------------------------------------------------------------------
def dq(*parts):
    return s(*parts, 'は', DOU, 'です', 'か', '。')


def dqp(*parts):
    return s(*parts, 'は', 'どう', 'です', 'か', '。')


def dans(parts, meaning, uses, ask, qm, wrong):
    return (s(*parts), meaning, uses, (dqp(*ask), qm, wrong))


p4 = point(8, 4, 'N は どうですか', 'N thế nào?',
    'どうですか hỏi cảm nhận, ý kiến về một thứ: 日本の生活はどうですか (cuộc sống ở Nhật thế nào?). '
    'Trả lời bằng tính từ: とても楽しいです. Cũng dùng để mời: お茶はどうですか (bạn dùng trà nhé?).',
    [
        (dq('日本', 'の', '生活'), 'Cuộc sống ở Nhật thế nào?', [E1]),
        (dq('日本語', 'の', '勉強'), 'Việc học tiếng Nhật thế nào?', [E1]),
        (dq('お仕事'), 'Công việc thế nào?'),
        (dq('その', '本'), 'Cuốn sách đó thế nào?', [B2]),
        (dq('りょう'), 'Ký túc xá thế nào?'),
        (dq('日本', 'の', '食べ物'), 'Đồ ăn Nhật thế nào?', [E1]),
        (dq('新しい', 'パソコン'), 'Máy tính mới thế nào?', [B]),
        (dq('シャンハイ'), 'Thượng Hải thế nào?'),
        (dq('その', 'カメラ'), 'Cái máy ảnh đó thế nào?', [B2]),
        (dq('この', '町'), 'Thành phố này thế nào?', [B2]),
        dans(['とても', '楽しい', 'です', '。'], 'Rất vui.', [A, C], ('日本', 'の', '生活'), 'Cuộc sống ở Nhật thế nào?',
             ['はい、とても楽しいです。', 'とても楽しいですか。', 'あまり楽しいです。']),
        dans([AMARI, '難しくない', 'です', '。'], 'Không khó lắm.', [A, C], ('日本語', 'の', '勉強'), 'Việc học tiếng Nhật thế nào?',
             ['はい、あまり難しくないです。', 'あまり難しくないですか。', 'あまり難しいです。']),
        dans([TOTEMO, '忙しい', 'です', '。'], 'Rất bận.', [A, C], ('お仕事',), 'Công việc thế nào?',
             ['はい、とても忙しいです。', 'とても忙しいですか。', 'あまり忙しいです。']),
        dans([TOTEMO, 'おもしろい', 'です', '。'], 'Rất thú vị.', [A, C], ('その', '本'), 'Cuốn sách đó thế nào?',
             ['はい、とてもおもしろいです。', 'とてもおもしろいですか。', 'あまりおもしろいです。']),
        dans(['きれい', 'です', 'よ', '。'], 'Sạch sẽ lắm đấy.', [A, F5], ('りょう',), 'Ký túc xá thế nào?',
             ['はい、きれいですよ。', 'きれいですか。', '*きれいくないです。']),
        dans([TOTEMO, 'おいしい', 'です', '。'], 'Rất ngon.', [A, C], ('日本', 'の', '食べ物'), 'Đồ ăn Nhật thế nào?',
             ['はい、とてもおいしいです。', 'とてもおいしいですか。', 'あまりおいしいです。']),
        dans([TOTEMO, '便利', 'です', '。'], 'Rất tiện.', [A, C], ('新しい', 'パソコン'), 'Máy tính mới thế nào?',
             ['はい、とても便利です。', 'とても便利ですか。', 'あまり便利です。']),
        dans([TOTEMO, 'にぎやか', 'です', '。'], 'Rất nhộn nhịp.', [A, C], ('シャンハイ',), 'Thượng Hải thế nào?',
             ['はい、とてもにぎやかです。', 'とてもにぎやかですか。', 'あまりにぎやかです。']),
        (s('ミラーさん', '、', 'お茶', 'は', DOU, 'です', 'か', '。', 'おいしい', 'です', 'よ', '。'), 'Anh Miller, anh dùng trà nhé? Ngon lắm đấy.', [A, F5]),
        (s('ありがとう', '。', 'いただきます', '。'), 'Cảm ơn. Tôi xin dùng.', [],
         (s('ミラーさん', '、', 'お茶', 'は', 'どう', 'です', 'か', '。', 'おいしい', 'です', 'よ', '。'), 'Anh Miller, anh dùng trà nhé? Ngon lắm đấy.',
          ['いいえ、いただきます。', 'ありがとう。どうですか。', 'はい、お茶です。'])),
        dans([AMARI, 'よくない', 'です', '。'], 'Không tốt lắm.', [A, C], ('その', 'カメラ'), 'Cái máy ảnh đó thế nào?',
             ['はい、あまりよくないです。', 'あまりよくないですか。', 'あまりいいです。']),
        dans([AMARI, 'にぎやか', 'じゃありません', '。'], 'Không nhộn nhịp lắm.', [A, C], ('この', '町'), 'Thành phố này thế nào?',
             ['はい、あまりにぎやかじゃありません。', 'あまりにぎやかじゃありませんか。', 'あまりにぎやかです。']),
        (dq('カリナさん', 'の', '新しい', '部屋'), 'Phòng mới của chị Karina thế nào?', [B, E1]),
        dans(['とても', 'きれい', NA, '部屋', 'です', 'よ', '。'], 'Là căn phòng rất đẹp đấy.', [B, C, F5], ('カリナさん', 'の', '新しい', '部屋'), 'Phòng mới của chị Karina thế nào?',
             ['はい、とてもきれいな部屋ですよ。', 'とてもきれいな部屋ですか。', '*とてもきれいの部屋ですよ。']),
        (s('ワンさん', '、', '日本', 'の', 'お仕事', 'は', DOU, 'です', 'か', '。'), 'Anh Wang, công việc ở Nhật thế nào?', [E1]),
        (s('とても', '忙しい', 'です', '。', '毎日', '9', '時', '[P:の,を,へ]まで', '働きます', '。'), 'Rất bận. Ngày nào tôi cũng làm việc đến 9 giờ.', [C, D4],
         (s('ワンさん', '、', '日本', 'の', 'お仕事', 'は', 'どう', 'です', 'か', '。'), 'Anh Wang, công việc ở Nhật thế nào?',
          ['はい、とても忙しいです。毎日9時まで働きます。', 'とても忙しいですか。毎日9時まで働きますか。', 'あまり忙しいです。毎日9時まで働きます。'])),
        (dq('あの', 'レストラン'), 'Nhà hàng kia thế nào?', [B2]),
        dans(['安い', 'です', '。', TOTEMO, 'おいしい', 'です', 'よ', '。'], 'Rẻ. Lại rất ngon đấy.', [A, C, F5], ('あの', 'レストラン'), 'Nhà hàng kia thế nào?',
             ['はい、安いです。とてもおいしいですよ。', '安いですか。とてもおいしいですか。', '安いです。あまりおいしいですよ。']),
        (dq('日本語', 'の', '先生'), 'Giáo viên tiếng Nhật thế nào?', [E1]),
        dans([TOTEMO, '親切', NA, '先生', 'です', '。'], 'Là giáo viên rất tử tế.', [B, C], ('日本語', 'の', '先生'), 'Giáo viên tiếng Nhật thế nào?',
             ['はい、とても親切な先生です。', 'とても親切な先生ですか。', '*とても親切の先生です。']),
    ],
    notes='Hỏi cảm nhận: どうですか. Mời đồ ăn uống: ～はどうですか (lịch sự hơn: いかがですか).')

# ---------------------------------------------------------------------------
def nq(subj, noun):
    return s(*subj, 'は', DONNA, noun, 'です', 'か', '。')


def nqp(subj, noun):
    return s(*subj, 'は', 'どんな', noun, 'です', 'か', '。')


def nans(parts, meaning, uses, subj, noun, qm):
    t = text(parts)
    wrong = [f'はい、{t}', t[:-1] + 'か。']
    if NA in parts:
        wrong.append('*' + ''.join('の' if p == NA else plain(p) for p in parts))
    else:
        adj = next(plain(p) for p in parts if p.startswith('[W:*'))
        wrong.append('*' + t.replace(adj, adj + 'な', 1))
    return (s(*parts), meaning, uses, (nqp(subj, noun), qm, wrong))


p5 = point(8, 5, 'N1 は どんな N2 ですか', 'N1 là N2 như thế nào?',
    'どんな + danh từ hỏi tính chất, đặc điểm của người hay vật: シャンハイはどんな町ですか '
    '(Thượng Hải là thành phố như thế nào?). Trả lời bằng tính từ + danh từ: にぎやかな町です. '
    'Khác どう: どう đứng một mình (～はどうですか), どんな luôn đi kèm danh từ.',
    [
        (nq(('シャンハイ',), '町'), 'Thượng Hải là thành phố như thế nào?'),
        (nq(('ミラーさん',), '人'), 'Anh Miller là người như thế nào?'),
        (nq(('それ',), '本'), 'Đó là cuốn sách như thế nào?'),
        (nq(('ペキン',), '町'), 'Bắc Kinh là thành phố như thế nào?'),
        (nq(('カリナさん', 'の', '先生'), '人'), 'Giáo viên của chị Karina là người như thế nào?', [E1]),
        (nq(('それ',), '映画'), 'Đó là bộ phim như thế nào?'),
        (nq(('さくら大学',), '大学'), 'Đại học Sakura là trường đại học như thế nào?'),
        (nq(('りょう',), '所'), 'Ký túc xá là chỗ như thế nào?'),
        (nq(('ワンさん',), '医者'), 'Anh Wang là bác sĩ như thế nào?'),
        (nq(('これ',), '車'), 'Đây là chiếc xe như thế nào?'),
        nans(['にぎやか', NA, '町', 'です', '。'], 'Là thành phố nhộn nhịp.', [B], ('シャンハイ',), '町', 'Thượng Hải là thành phố như thế nào?'),
        nans(['親切', NA, '人', 'です', '。'], 'Là người tử tế.', [B], ('ミラーさん',), '人', 'Anh Miller là người như thế nào?'),
        nans([iw('おもしろい'), '本', 'です', '。'], 'Là cuốn sách thú vị.', [B], ('それ',), '本', 'Đó là cuốn sách như thế nào?'),
        nans([iw('古い'), '町', 'です', '。'], 'Là thành phố cổ.', [B], ('ペキン',), '町', 'Bắc Kinh là thành phố như thế nào?'),
        nans([iw('やさしい'), '人', 'です', '。'], 'Là người hiền lành.', [B], ('カリナさん', 'の', '先生'), '人', 'Giáo viên của chị Karina là người như thế nào?'),
        nans(['とても', iw('おもしろい'), '映画', 'です', '。'], 'Là bộ phim rất hay.', [B, C], ('それ',), '映画', 'Đó là bộ phim như thế nào?'),
        nans(['有名', NA, '大学', 'です', '。'], 'Là trường đại học nổi tiếng.', [B], ('さくら大学',), '大学', 'Đại học Sakura là trường đại học như thế nào?'),
        nans(['静か', NA, '所', 'です', '。'], 'Là chỗ yên tĩnh.', [B], ('りょう',), '所', 'Ký túc xá là chỗ như thế nào?'),
        nans([iw('いい'), '医者', 'です', '。'], 'Là bác sĩ giỏi.', [B], ('ワンさん',), '医者', 'Anh Wang là bác sĩ như thế nào?'),
        nans([iw('新しい'), '車', 'です', '。'], 'Là chiếc xe mới.', [B], ('これ',), '車', 'Đây là chiếc xe như thế nào?'),
        (nq(('ミラーさん', 'の', '町'), '町'), 'Thành phố của anh Miller là thành phố như thế nào?', [E1]),
        nans(['とても', iw('大きい'), '町', 'です', '。', 'にぎやか', 'です', 'よ', '。'], 'Là thành phố rất lớn. Nhộn nhịp lắm đấy.', [B, C, F5], ('ミラーさん', 'の', '町'), '町', 'Thành phố của anh Miller là thành phố như thế nào?'),
        (nq(('日本語', 'の', '先生'), '人'), 'Giáo viên tiếng Nhật là người như thế nào?', [E1]),
        nans(['とても', iw('きびしい'), '人', 'です', '。'], 'Là người rất nghiêm khắc.', [B, C], ('日本語', 'の', '先生'), '人', 'Giáo viên tiếng Nhật là người như thế nào?'),
        (s('きのう', DONNA, '映画', 'を', '見ました', 'か', '。'), 'Hôm qua bạn đã xem phim gì?', [A6, B4]),
        (s('日本', 'の', iw('古い'), '映画', 'を', '見ました', '。'), 'Tôi đã xem một bộ phim cũ của Nhật.', [A6, B, B4, E1],
         (s('きのう', 'どんな', '映画', 'を', '見ました', 'か', '。'), 'Hôm qua bạn đã xem phim gì?',
          ['はい、日本の古い映画を見ました。', '日本の古い映画を見ましたか。', '*日本の古いな映画を見ました。'])),
        (s(DONNA, 'かばん', 'を', '買いました', 'か', '。'), 'Bạn đã mua cái cặp như thế nào?', [A6, B4]),
        (s(iw('黒い'), 'かばん', 'を', '買いました', '。', 'あまり', '高くない', 'です', 'よ', '。'), 'Tôi đã mua cái cặp màu đen. Không đắt lắm đâu.', [A6, B, B4, C, F5],
         (s('どんな', 'かばん', 'を', '買いました', 'か', '。'), 'Bạn đã mua cái cặp như thế nào?',
          ['はい、黒いかばんを買いました。あまり高くないですよ。', '黒いかばんを買いましたか。あまり高くないですか。', '*黒いなかばんを買いました。あまり高くないですよ。'])),
        (nq(('ミラーさん', 'の', '会社'), '会社'), 'Công ty của anh Miller là công ty như thế nào?', [E1]),
        nans(['有名', NA, '会社', 'です', '。', 'とても', '大きい', 'です', '。'], 'Là công ty nổi tiếng. Rất lớn.', [B, C], ('ミラーさん', 'の', '会社'), '会社', 'Công ty của anh Miller là công ty như thế nào?'),
    ],
    notes='どんな + N (どんな町); どう đứng một mình (この町はどうですか).')

# ---------------------------------------------------------------------------
Q21 = s('りょう', 'は', 'どう', 'です', 'か', '。')

p6 = point(8, 6, 'S1 が、S2／そして', '… nhưng … / và, thêm nữa',
    'が nối hai câu có ý trái ngược, đặt cuối câu thứ nhất trước dấu phẩy: 日本の食べ物はおいしいですが、高いです '
    '(đồ ăn Nhật ngon nhưng đắt). そして đứng đầu câu thứ hai để nối hai ý cùng chiều: '
    'この町はきれいです。そして、にぎやかです (thành phố này đẹp. Và nhộn nhịp nữa).',
    [
        (s('日本', 'の', '食べ物', 'は', 'おいしい', 'です', GA, '、', ip('高い'), '。'), 'Đồ ăn Nhật ngon nhưng đắt.', [A, E1]),
        (s('この', '部屋', 'は', 'きれい', 'です', GA, '、', ip('小さい'), '。'), 'Căn phòng này sạch nhưng nhỏ.', [A]),
        (s('日本語', 'は', '難しい', 'です', GA, '、', 'おもしろい', 'です', '。'), 'Tiếng Nhật khó nhưng thú vị.', [A]),
        (s('この', '町', 'は', '静か', 'です', GA, '、', 'あまり', '便利', 'じゃありません', '。'), 'Thành phố này yên tĩnh nhưng không tiện lắm.', [A, C]),
        (s('この', 'カメラ', 'は', '古い', 'です', GA, '、', 'いい', 'です', '。'), 'Cái máy ảnh này cũ nhưng tốt.', [A]),
        (s('ミラーさん', 'の', 'お仕事', 'は', '忙しい', 'です', GA, '、', '楽しい', 'です', '。'), 'Công việc của anh Miller bận nhưng vui.', [A, E1]),
        (s('この', '町', 'は', 'きれい', 'です', '。', SOSHITE, '、', nap('にぎやか'), '。'), 'Thành phố này đẹp. Và nhộn nhịp nữa.', [A]),
        (s('カリナさん', 'は', 'きれい', 'です', '。', SOSHITE, '、', '親切', 'です', '。'), 'Chị Karina đẹp. Và tử tế nữa.', [A]),
        (s('この', 'レストラン', 'は', '安い', 'です', '。', SOSHITE, '、', ip('おいしい'), '。'), 'Nhà hàng này rẻ. Và ngon nữa.', [A]),
        (s('この', '車', 'は', '新しい', 'です', '。', SOSHITE, '、', '大きい', 'です', '。'), 'Chiếc xe này mới. Và lớn nữa.', [A]),
        (s('りょう', 'は', '古い', 'です', GA, '、', nap('便利'), '。'), 'Ký túc xá cũ nhưng tiện.', [A]),
        (s('この', '本', 'は', '高い', 'です', GA, '、', 'とても', 'いい', '本', 'です', '。'), 'Cuốn sách này đắt nhưng là cuốn sách rất hay.', [B, C]),
        (s('ワンさん', 'は', '親切', 'な', '医者', 'です', '。', SOSHITE, '、', 'ハンサム', 'です', '。'), 'Anh Wang là bác sĩ tử tế. Và đẹp trai nữa.', [A, B]),
        (s('日本', 'の', '生活', 'は', '忙しい', 'です', GA, '、', '楽しい', 'です', '。'), 'Cuộc sống ở Nhật bận rộn nhưng vui.', [A, E1]),
        (s('この', 'お茶', 'は', '熱い', 'です', GA, '、', 'おいしい', 'です', '。'), 'Trà này nóng nhưng ngon.', [A]),
        (s('シャンハイ', 'は', 'にぎやか', 'です', '。', SOSHITE, '、', '食べ物', 'も', 'おいしい', 'です', '。'), 'Thượng Hải nhộn nhịp. Và đồ ăn cũng ngon.', [A, D1]),
        (s('私', 'の', '部屋', 'は', '小さい', 'です', '。', SOSHITE, '、', '古い', 'です', '。'), 'Phòng của tôi nhỏ. Và cũ nữa.', [A, E1]),
        (s('きのう', '映画', 'を', '見ました', '。', SOSHITE, '、', '晩ごはん', 'を', '食べました', '。'), 'Hôm qua tôi đã xem phim. Và đã ăn tối.', [A6, B4]),
        (s('先生', 'は', 'きびしい', 'です', GA, '、', 'やさしい', 'です', '。'), 'Giáo viên nghiêm khắc nhưng hiền.', [A]),
        (s('この', 'かばん', 'は', '安い', 'です', GA, '、', 'あまり', ineg('いい'), '。'), 'Cái cặp này rẻ nhưng không tốt lắm.', [A, C]),
        (s('とても', '静か', 'です', GA, '、', 'あまり', '便利', 'じゃありません', '。'), 'Rất yên tĩnh nhưng không tiện lắm.', [A, C, D], (Q21, 'Ký túc xá thế nào?',
          ['はい、とても静かですが、あまり便利じゃありません。', 'とても静かですが、あまり便利じゃありませんか。', 'とても静かですが、あまり便利です。'])),
        (s('ミラーさん', 'の', '会社', 'は', '大きい', 'です', '。', SOSHITE, '、', 'とても', '有名', 'です', '。'), 'Công ty của anh Miller lớn. Và rất nổi tiếng.', [A, C, E1]),
        (s('この', 'カメラ', 'は', '小さい', 'です', GA, '、', 'とても', '便利', 'です', '。'), 'Cái máy ảnh này nhỏ nhưng rất tiện.', [A, C]),
        (s('日本語', 'は', '難しい', 'です', GA, '、', '毎日', '勉強します', '。'), 'Tiếng Nhật khó nhưng ngày nào tôi cũng học.', [A, B4]),
        (s('この', '町', 'は', '古い', '町', 'です', '。', SOSHITE, '、', 'とても', '静か', 'です', '。'), 'Đây là thành phố cổ. Và rất yên tĩnh.', [B, C]),
        (s('ペキン', 'は', 'とても', '大きい', '町', 'です', GA, '、', 'あまり', naneg('静か'), '。'), 'Bắc Kinh là thành phố rất lớn nhưng không yên tĩnh lắm.', [B, C]),
        (s('あの', '店', 'は', '安い', 'です', '。', SOSHITE, '、', '店', 'の', '人', 'は', '親切', 'です', '。'), 'Cửa hàng kia rẻ. Và người bán hàng tử tế.', [A, E1]),
        (s('あした', 'は', '休み', 'です', GA, '、', '会社', 'へ', '行きます', '。'), 'Ngày mai là ngày nghỉ nhưng tôi đi đến công ty.', [A1, A5]),
        (s('この', '映画', 'は', '古い', 'です', GA, '、', 'とても', 'おもしろい', 'です', 'よ', '。'), 'Bộ phim này cũ nhưng rất hay đấy.', [A, C, F5]),
        (s('カリナさん', 'の', '誕生日', 'は', 'あした', 'です', '。', SOSHITE, '、', 'ミラーさん', 'の', '誕生日', 'も', 'あした', 'です', '。'), 'Sinh nhật chị Karina là ngày mai. Và sinh nhật anh Miller cũng là ngày mai.', [D1, E1]),
    ],
    notes='が nối hai ý trái ngược (… nhưng …); そして nối hai ý cùng chiều, đứng đầu câu sau.')

# Chủ dự án duyệt bài 8 ngày 2026-11-12
for p in (p1, p2, p3, p4, p5, p6,):
    p['approved'] = True
write(8, [p1, p2, p3, p4, p5, p6])
