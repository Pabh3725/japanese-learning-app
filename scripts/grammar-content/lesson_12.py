"""Ngữ pháp bài 12 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–12.
Chạy: python3 -I scripts/grammar-content/lesson_12.py  → data/grammar/lesson-12.json
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(12)
A1, C1, D1, E1 = 'g01-01', 'g01-03', 'g01-04', 'g01-05'
B4, D4, E4 = 'g04-02', 'g04-04', 'g04-05'
A5, B5, C5, F5 = 'g05-01', 'g05-02', 'g05-03', 'g05-06'
A6, E6 = 'g06-01', 'g06-05'
A8, B8, C8, D8, F8 = 'g08-01', 'g08-02', 'g08-03', 'g08-04', 'g08-06'
A9, B9, C9, D9 = 'g09-01', 'g09-02', 'g09-03', 'g09-04'
A10, D10 = 'g10-01', 'g10-04'
A, B, C, D, E = 'g12-01', 'g12-02', 'g12-03', 'g12-04', 'g12-05'

DESHITA = '[F:です,じゃありません,ですか]でした'      # câu luôn có từ chỉ quá khứ
JANAKATTA = '[F:じゃありません,でした,*じゃないでした/ではありませんでした]じゃありませんでした'
YORI = '[P:から,まで,と]より'
DOCHIRA = '[W:どれ,どこ,誰]どちら'
NO = '[P:が,は,を]の'                              # N のほうが
DOCHIRAMO = '[W:どれも,どこも,誰も]どちらも'
ICHIBAN = '[W:とても,ずっと,よく]いちばん'
NAKADE = '[P:を,と,へ]で'                          # ～の中で


def stem(a):
    return 'よ' if a == 'いい' else a[:-1]


def ipast(a):
    """い-adj quá khứ: 寒かったです. Nhiễu: 寒いでした, 寒くでした (sai dạng), 寒いです (hiện tại, sai nghĩa)."""
    st = stem(a)
    return f'[F:*{a}でした,*{st}くでした,{a}です]{st}かったです'


def ipastneg(a):
    """い-adj quá khứ phủ định: 寒くなかったです (寒くありませんでした cũng đúng)."""
    st = stem(a)
    return f'[F:*{a}じゃありませんでした,*{st}くないでした,{st}くないです/{st}くありませんでした]{st}くなかったです'


def s(*parts):
    return '|'.join(parts)


def plain(p):
    return p.split('{')[0].split(']')[-1]


def text(parts):
    return ''.join(plain(p) for p in parts)


def ans(parts, meaning, uses, q, qm, wrong):
    return (s(*parts), meaning, uses, (q, qm, wrong))


# ---------------------------------------------------------------------------
Q1a = s('きのう', 'は', '雨', 'でした', 'か', '。')
Q1b = s('試験', 'は', 'どう', 'でした', 'か', '。')
Q1c = s('旅行', 'は', 'どう', 'でした', 'か', '。')
Q1d = s('お祭り', 'は', '何曜日', 'でした', 'か', '。')

p1 = point(12, 1, 'N／な-adj でした／じゃありませんでした', 'Đã là … / đã không phải là …',
    'Thì quá khứ của danh từ và tính từ な: です → でした, じゃありません → じゃありませんでした. '
    'きのうは雨でした (hôm qua trời mưa), 試験は簡単でした (bài thi đã dễ), パーティーはにぎやかじゃありませんでした '
    '(bữa tiệc đã không nhộn nhịp). ではありませんでした là cách nói trang trọng hơn.',
    [
        (s('きのう', 'は', '雨', DESHITA, '。'), 'Hôm qua trời mưa.'),
        (s('きのう', 'は', '日曜日', DESHITA, '。'), 'Hôm qua là chủ nhật.'),
        (s('先週', 'の', '試験', 'は', '簡単', DESHITA, '。'), 'Bài thi tuần trước đã dễ.', [E1]),
        (s('きのう', 'は', '休み', DESHITA, '。'), 'Hôm qua là ngày nghỉ.'),
        (s('お祭り', 'は', 'にぎやか', DESHITA, '。'), 'Lễ hội đã rất nhộn nhịp.'),
        (s('きのう', 'は', 'いい', '天気', DESHITA, '。'), 'Hôm qua thời tiết đẹp.', [B8]),
        (s('おととい', 'は', '雪', DESHITA, '。'), 'Hôm kia có tuyết.'),
        (s('パーティー', 'は', 'とても', 'すてき', DESHITA, '。'), 'Bữa tiệc đã rất tuyệt.', [C8]),
        (s('きのう', 'は', '雨', JANAKATTA, '。'), 'Hôm qua trời không mưa.'),
        (s('先週', 'の', '試験', 'は', '簡単', JANAKATTA, '。'), 'Bài thi tuần trước đã không dễ.', [E1]),
        (s('きのう', 'は', '雨', DESHITA, 'か', '。'), 'Hôm qua trời có mưa không?', [C1]),
        ans(['いいえ', '、', '雨', JANAKATTA, '。', '曇り', 'でした', '。'], 'Không, trời không mưa. Trời nhiều mây.', [], Q1a, 'Hôm qua trời có mưa không?',
            ['はい、雨じゃありませんでした。曇りでした。', 'いいえ、雨じゃありません。曇りです。', '*いいえ、雨じゃないでした。曇りでした。']),
        (s('ホテル', 'は', '静か', DESHITA, '。'), 'Khách sạn đã yên tĩnh.'),
        (s('試験', 'は', 'どう', DESHITA, 'か', '。'), 'Bài thi thế nào?', [D8]),
        ans(['とても', '簡単', DESHITA, '。'], 'Rất dễ.', [C8], Q1b, 'Bài thi thế nào?',
            ['はい、とても簡単でした。', 'とても簡単でしたか。', 'あまり簡単でした。']),
        (s('きのう', 'の', 'パーティー', 'は', 'にぎやか', JANAKATTA, '。'), 'Bữa tiệc hôm qua đã không nhộn nhịp.', [E1]),
        (s('ワンさん', 'は', '去年', 'まで', '学生', DESHITA, '。'), 'Anh Wang là sinh viên đến năm ngoái.', [D4]),
        (s('先月', 'は', 'とても', '暇', DESHITA, '。'), 'Tháng trước tôi rất rảnh.', [C8]),
        (s('きのう', 'は', '元気', JANAKATTA, '。', 'でも', '、', '今日', 'は', '元気', 'です', '。'), 'Hôm qua tôi không khỏe. Nhưng hôm nay thì khỏe.', [A8]),
        (s('その', '映画', 'は', '有名', JANAKATTA, '。'), 'Bộ phim đó đã không nổi tiếng.'),
        (s('旅行', 'は', 'どう', DESHITA, 'か', '。'), 'Chuyến du lịch thế nào?', [D8]),
        ans(['とても', 'すてき', DESHITA, '。', '海', 'が', 'きれい', 'でした', '。'], 'Rất tuyệt. Biển rất đẹp.', [C8], Q1c, 'Chuyến du lịch thế nào?',
            ['はい、とてもすてきでした。海がきれいでした。', 'とてもすてきでしたか。海がきれいでしたか。', 'あまりすてきでした。海がきれいでした。']),
        (s('きのう', 'は', '雨', DESHITA, 'から', '、', 'どこ', 'へ', 'も', '行きませんでした', '。'), 'Vì hôm qua trời mưa nên tôi đã không đi đâu cả.', [B4, B5, D9]),
        (s('おととい', 'は', '土曜日', DESHITA, 'が', '、', '会社', 'へ', '行きました', '。'), 'Hôm kia là thứ bảy nhưng tôi đã đi đến công ty.', [A5, B4, F8]),
        (s('去年', 'の', 'お祭り', 'は', 'にぎやか', DESHITA, '。', '人', 'が', 'たくさん', 'いました', '。'), 'Lễ hội năm ngoái rất nhộn nhịp. Có rất nhiều người.', [A10, C9, E1]),
        (s('ミラーさん', 'は', '先月', 'まで', '銀行員', DESHITA, '。'), 'Anh Miller là nhân viên ngân hàng đến tháng trước.', [D4]),
        (s('ホテル', 'は', '駅', 'の', '近く', DESHITA, 'から', '、', '便利', 'でした', '。'), 'Vì khách sạn ở gần ga nên rất tiện.', [D9, D10]),
        (s('きのう', 'の', '試験', 'は', '簡単', JANAKATTA, '。', 'でも', '、', 'たくさん', '書きました', '。'), 'Bài thi hôm qua không dễ. Nhưng tôi đã viết được nhiều.', [B4, C9, E1]),
        (s('お祭り', 'は', '何曜日', DESHITA, 'か', '。'), 'Lễ hội là vào thứ mấy?', [C1]),
        ans(['土曜日', 'と', '日曜日', DESHITA, '。'], 'Là thứ bảy và chủ nhật.', [E4], Q1d, 'Lễ hội là vào thứ mấy?',
            ['はい、土曜日と日曜日でした。', '土曜日と日曜日でしたか。', '土曜日と日曜日です。']),
    ],
    notes='Câu có từ chỉ quá khứ (きのう, 先週) thì dùng でした, không dùng です.')

# ---------------------------------------------------------------------------
Q2a = s('旅行', 'は', 'どう', 'でした', 'か', '。')
Q2b = s('きのう', 'の', '試験', 'は', '難しかった', 'です', 'か', '。')
Q2c = s('ホンコン', 'は', 'どう', 'でした', 'か', '。')
Q2d = s('ミラーさん', 'の', '新しい', '車', 'は', '高かった', 'です', 'か', '。')

p2 = point(12, 2, 'い-adj かったです／くなかったです', 'Đã (tính chất) / đã không …',
    'Tính từ い ở quá khứ: bỏ い thêm かったです: 寒い → 寒かったです (đã lạnh); いい → よかったです. '
    'Phủ định quá khứ: bỏ い thêm くなかったです: 寒くなかったです (cũng nói 寒くありませんでした). '
    'Không dùng でした với tính từ い: 寒いでした là sai.',
    [
        (s('きのう', 'は', ipast('寒い'), '。'), 'Hôm qua trời lạnh.'),
        (s('旅行', 'は', ipast('楽しい'), '。'), 'Chuyến du lịch đã vui.'),
        (s('試験', 'は', ipast('難しい'), '。'), 'Bài thi đã khó.'),
        (s('映画', 'は', ipast('おもしろい'), '。'), 'Bộ phim đã hay.'),
        (s('おすし', 'は', ipast('おいしい'), '。'), 'Sushi đã ngon.'),
        (s('きのう', 'は', ipastneg('暑い'), '。'), 'Hôm qua trời không nóng.'),
        (s('ホテル', 'は', ipastneg('高い'), '。'), 'Khách sạn đã không đắt.'),
        (s('きのう', 'は', '天気', 'が', ipast('いい'), '。'), 'Hôm qua thời tiết đẹp.'),
        (s('その', '映画', 'は', ipastneg('おもしろい'), '。'), 'Bộ phim đó đã không hay.'),
        (s('先週', 'は', ipast('忙しい'), '。'), 'Tuần trước tôi bận.'),
        (s('旅行', 'は', 'どう', 'でした', 'か', '。'), 'Chuyến du lịch thế nào?', [A, D8]),
        ans(['とても', ipast('楽しい'), '。'], 'Rất vui.', [C8], Q2a, 'Chuyến du lịch thế nào?',
            ['はい、とても楽しかったです。', '*とても楽しいでした。', 'あまり楽しかったです。']),
        (s('きのう', 'の', '試験', 'は', ipast('難しい'), 'か', '。'), 'Bài thi hôm qua có khó không?', [C1, E1]),
        ans(['いいえ', '、', 'あまり', ipastneg('難しい'), '。'], 'Không, không khó lắm.', [C8], Q2b, 'Bài thi hôm qua có khó không?',
            ['はい、あまり難しくなかったです。', '*いいえ、あまり難しいじゃありませんでした。', 'いいえ、とても難しくなかったです。']),
        (s('去年', 'の', '冬', 'は', 'とても', ipast('寒い'), '。'), 'Mùa đông năm ngoái rất lạnh.', [C8, E1]),
        (s('その', '荷物', 'は', ipast('重い'), '。'), 'Hành lý đó đã nặng.'),
        (s('すき焼き', 'は', ipast('甘い'), '。'), 'Món sukiyaki đã ngọt.'),
        (s('カレー', 'は', 'あまり', ipastneg('辛い'), '。'), 'Cơm cà ri đã không cay lắm.', [C8]),
        (s('きのう', 'は', '天気', 'が', ipastneg('いい'), '。'), 'Hôm qua thời tiết không đẹp.'),
        (s('昼ごはん', 'は', ipast('安い'), '。'), 'Bữa trưa đã rẻ.'),
        (s('ホンコン', 'は', 'どう', 'でした', 'か', '。'), 'Hồng Kông thế nào?', [D8]),
        ans(['人', 'が', ipast('多い'), '。', 'そして', '、', '食べ物', 'も', 'おいしかった', 'です', '。'], 'Đông người. Và đồ ăn cũng ngon.', [D1, F8], Q2c, 'Hồng Kông thế nào?',
            ['はい、人が多かったです。そして、食べ物もおいしかったです。', '*人が多いでした。そして、食べ物もおいしいでした。', '人が多かったですか。そして、食べ物もおいしかったですか。']),
        (s('きのう', 'の', 'パーティー', 'は', ipast('楽しい'), 'が', '、', 'とても', '疲れました', '。'), 'Bữa tiệc hôm qua vui nhưng rất mệt.', [C8, E1, F8]),
        (s('先週', 'は', ipast('忙しい'), 'から', '、', 'どこ', 'へ', 'も', '行きませんでした', '。'), 'Vì tuần trước bận nên tôi đã không đi đâu cả.', [B4, B5, D9]),
        (s('去年', 'の', '夏', 'は', ipastneg('暑い'), '。', '涼しかった', 'です', '。'), 'Mùa hè năm ngoái không nóng. Trời mát.', [E1]),
        (s('あの', 'レストラン', 'の', '料理', 'は', ipast('おいしい'), 'が', '、', '高かった', 'です', '。'), 'Món ăn ở nhà hàng kia ngon nhưng đắt.', [E1, F8]),
        (s('きのう', 'は', '雨', 'でした', 'から', '、', ipast('寒い'), '。'), 'Vì hôm qua trời mưa nên lạnh.', [A, D9]),
        (s('初めて', 'おすし', 'を', '食べました', '。', 'とても', ipast('おいしい'), '。'), 'Lần đầu tiên tôi ăn sushi. Rất ngon.', [A6, B4, C8]),
        (s('ミラーさん', 'の', '新しい', '車', 'は', ipast('高い'), 'か', '。'), 'Chiếc xe mới của anh Miller có đắt không?', [B8, C1, E1]),
        ans(['いいえ', '、', 'あまり', ipastneg('高い'), 'よ', '。'], 'Không, không đắt lắm đâu.', [C8, F5], Q2d, 'Chiếc xe mới của anh Miller có đắt không?',
            ['はい、あまり高くなかったですよ。', '*いいえ、あまり高いじゃありませんでしたよ。', 'いいえ、とても高くなかったですよ。']),
    ],
    notes='Tính từ い quá khứ: ～かったです; tính từ な và danh từ: ～でした.')

# ---------------------------------------------------------------------------
p3 = point(12, 3, 'N1 は N2 より adj です', 'N1 (tính chất) hơn N2',
    'より đứng sau vật được đem ra so sánh: 電車はバスより速いです (tàu điện nhanh hơn xe buýt). '
    'Chủ đề (vật hơn) đi với は, vật bị so đi với より. Nhấn mạnh "hơn hẳn" bằng ずっと: ずっと速いです.',
    [
        (s('ペキン', 'は', 'ホンコン', YORI, '大きい', 'です', '。'), 'Bắc Kinh lớn hơn Hồng Kông.', [A8]),
        (s('今日', 'は', 'きのう', YORI, '寒い', 'です', '。'), 'Hôm nay lạnh hơn hôm qua.', [A8]),
        (s('この', 'かばん', 'は', 'あの', 'かばん', YORI, '軽い', 'です', '。'), 'Cái cặp này nhẹ hơn cái cặp kia.', [A8]),
        (s('電車', 'は', 'バス', YORI, '速い', 'です', '。'), 'Tàu điện nhanh hơn xe buýt.', [A8]),
        (s('日本語', 'は', '英語', YORI, '難しい', 'です', '。'), 'Tiếng Nhật khó hơn tiếng Anh.', [A8]),
        (s('春', 'は', '冬', YORI, '温かい', 'です', '。'), 'Mùa xuân ấm hơn mùa đông.', [A8]),
        (s('新幹線', 'は', '電車', YORI, '速い', 'です', '。'), 'Tàu Shinkansen nhanh hơn tàu điện.', [A8]),
        (s('この', 'ホテル', 'は', 'あの', 'ホテル', YORI, '高い', 'です', '。'), 'Khách sạn này đắt hơn khách sạn kia.', [A8]),
        (s('夏', 'は', '春', YORI, '暑い', 'です', '。'), 'Mùa hè nóng hơn mùa xuân.', [A8]),
        (s('自転車', 'は', '車', YORI, '遅い', 'です', '。'), 'Xe đạp chậm hơn ô tô.', [A8]),
        (s('駅', 'は', '学校', YORI, '近い', 'です', '。'), 'Nhà ga gần hơn trường học.', [A8]),
        (s('この', 'カメラ', 'は', 'あの', 'カメラ', YORI, 'ずっと', 'いい', 'です', '。'), 'Cái máy ảnh này tốt hơn hẳn cái kia.', [A8]),
        (s('秋', 'は', '夏', YORI, '涼しい', 'です', '。'), 'Mùa thu mát hơn mùa hè.', [A8]),
        (s('すき焼き', 'は', 'てんぷら', YORI, '甘い', 'です', '。'), 'Sukiyaki ngọt hơn tempura.', [A8]),
        (s('カレー', 'は', 'すき焼き', YORI, '辛い', 'です', '。'), 'Cơm cà ri cay hơn sukiyaki.', [A8]),
        (s('ホンコン', 'は', 'シンガポール', YORI, '人', 'が', '多い', 'です', '。'), 'Hồng Kông đông người hơn Singapore.', [A8]),
        (s('きのう', 'は', '今日', YORI, '暑かった', 'です', '。'), 'Hôm qua nóng hơn hôm nay.', [B]),
        (s('飛行機', 'は', '新幹線', YORI, '速い', 'です', 'が', '、', '高い', 'です', '。'), 'Máy bay nhanh hơn Shinkansen nhưng đắt.', [A8, F8]),
        (s('この', '町', 'は', '私', 'の', '町', YORI, '静か', 'です', '。'), 'Thành phố này yên tĩnh hơn thành phố của tôi.', [A8, E1]),
        (s('私', 'の', 'うち', 'は', 'ミラーさん', 'の', 'うち', YORI, '駅', 'から', '遠い', 'です', '。'), 'Nhà tôi xa ga hơn nhà anh Miller.', [A8, E1]),
        (s('タイ', 'の', '夏', 'は', '日本', 'の', '夏', YORI, '暑い', 'です', '。'), 'Mùa hè ở Thái Lan nóng hơn mùa hè ở Nhật.', [A8, E1]),
        (s('ことし', 'の', '冬', 'は', '去年', 'の', '冬', YORI, '寒い', 'です', '。'), 'Mùa đông năm nay lạnh hơn mùa đông năm ngoái.', [A8, E1]),
        (s('バス', 'は', '電車', YORI, '安い', 'です', 'から', '、', 'いつも', 'バス', 'で', '行きます', '。'), 'Vì xe buýt rẻ hơn tàu điện nên tôi luôn đi bằng xe buýt.', [A5, C5, D9]),
        (s('今週', 'の', '試験', 'は', '先週', 'の', '試験', YORI, 'ずっと', '簡単', 'でした', '。'), 'Bài thi tuần này dễ hơn hẳn bài thi tuần trước.', [A, E1]),
        (s('ワンさん', 'は', '私', YORI, '料理', 'が', '上手', 'です', '。'), 'Anh Wang nấu ăn giỏi hơn tôi.', [B9]),
        (s('この', 'スーパー', 'は', 'あの', 'デパート', YORI, 'ずっと', '安い', 'です', 'よ', '。'), 'Siêu thị này rẻ hơn hẳn cửa hàng bách hóa kia đấy.', [A8, F5]),
        (s('ミラーさん', 'は', 'カリナさん', YORI, '日本語', 'が', 'よく', 'わかります', '。'), 'Anh Miller hiểu tiếng Nhật rõ hơn chị Karina.', [A9, C9]),
        (s('てんぷら', 'は', 'おすし', YORI, 'おいしかった', 'です', '。'), 'Tempura ngon hơn sushi.', [B]),
        (s('空港', 'は', '駅', YORI, '遠い', 'です', 'から', '、', 'タクシー', 'で', '行きましょう', '。'), 'Vì sân bay xa hơn nhà ga nên chúng ta đi tắc-xi nhé.', [A5, C5, D9, E6]),
        (s('秋', 'は', '夏', YORI, '涼しい', 'です', '。', 'そして', '、', '紅葉', 'が', 'きれい', 'です', '。'), 'Mùa thu mát hơn mùa hè. Và lá đỏ rất đẹp.', [A8, F8]),
    ],
    notes='A は B より ～: A hơn B. Không nói A は B から ～.')

# ---------------------------------------------------------------------------
QD = {
    1: (s('サッカー', 'と', '野球', 'と', 'どちら', 'が', '好き', 'です', 'か', '。'), 'Bạn thích bóng đá hay bóng chày hơn?'),
    2: (s('バス', 'と', '電車', 'と', 'どちら', 'が', '速い', 'です', 'か', '。'), 'Xe buýt và tàu điện, cái nào nhanh hơn?'),
    3: (s('春', 'と', '秋', 'と', 'どちら', 'が', '好き', 'です', 'か', '。'), 'Bạn thích mùa xuân hay mùa thu hơn?'),
    4: (s('すき焼き', 'と', 'てんぷら', 'と', 'どちら', 'が', 'おいしい', 'です', 'か', '。'), 'Sukiyaki và tempura, món nào ngon hơn?'),
    5: (s('ペキン', 'と', 'シャンハイ', 'と', 'どちら', 'が', '大きい', 'です', 'か', '。'), 'Bắc Kinh và Thượng Hải, nơi nào lớn hơn?'),
    6: (s('この', 'かばん', 'と', 'あの', 'かばん', 'と', 'どちら', 'が', '軽い', 'です', 'か', '。'), 'Cái cặp này và cái cặp kia, cái nào nhẹ hơn?'),
    7: (s('夏', 'と', '冬', 'と', 'どちら', 'が', '好き', 'です', 'か', '。'), 'Bạn thích mùa hè hay mùa đông hơn?'),
    8: (s('日本語', 'と', '英語', 'と', 'どちら', 'が', '難しい', 'です', 'か', '。'), 'Tiếng Nhật và tiếng Anh, tiếng nào khó hơn?'),
    9: (s('コーヒー', 'と', '紅茶', 'と', 'どちら', 'が', '好き', 'です', 'か', '。'), 'Bạn thích cà phê hay trà đen hơn?'),
    10: (s('駅', 'と', '空港', 'と', 'どちら', 'が', '近い', 'です', 'か', '。'), 'Nhà ga và sân bay, nơi nào gần hơn?'),
    11: (s('タクシー', 'と', '地下鉄', 'と', 'どちら', 'が', '速い', 'です', 'か', '。'), 'Tắc-xi và tàu điện ngầm, cái nào nhanh hơn?'),
    12: (s('ミラーさん', 'と', 'カリナさん', 'と', 'どちら', 'が', '日本語', 'が', '上手', 'です', 'か', '。'), 'Anh Miller và chị Karina, ai giỏi tiếng Nhật hơn?'),
    13: (s('旅行', 'は', '春', 'と', '秋', 'と', 'どちら', 'が', 'いい', 'です', 'か', '。'), 'Đi du lịch thì mùa xuân hay mùa thu tốt hơn?'),
    14: (s('きのう', 'と', 'おととい', 'と', 'どちら', 'が', '寒かった', 'です', 'か', '。'), 'Hôm qua và hôm kia, ngày nào lạnh hơn?'),
    15: (s('海', 'と', '山', 'と', 'どちら', 'が', '好き', 'です', 'か', '。'), 'Bạn thích biển hay núi hơn?'),
}


def dq(n, uses=()):
    qs, qm = QD[n]
    return (qs.replace('どちら', DOCHIRA, 1), qm, [*uses])


def da(n, parts, meaning, uses=()):
    qs, qm = QD[n]
    t = text(parts)
    if NO in parts:
        third = '*' + ''.join('が' if p == NO else plain(p) for p in parts)
    else:
        third = t.replace('どちらも', 'どれも', 1)
    return (s(*parts), meaning, [*uses], (qs, qm, [f'はい、{t}', t[:-1] + 'か。', third]))


p4 = point(12, 4, 'N1 と N2 と どちらが adj ですか — N のほうが adj です', 'Cái nào hơn? — N hơn',
    'So sánh hai thứ: N1 と N2 と どちらが ～ですか (N1 và N2, cái nào ～ hơn?). Dùng どちら cho hai lựa chọn, kể cả người, '
    'nơi chốn. Trả lời: N のほうが ～です (N thì ～ hơn); bằng nhau: どちらも ～です (cả hai đều ～).',
    [
        dq(1, [B9]), dq(2, [A8]), dq(3, [B9]), dq(4, [A8]), dq(5, [A8]),
        dq(6, [A8]), dq(7, [B9]), dq(8, [A8]), dq(9, [B9]), dq(10, [A8]),
        da(1, ['サッカー', NO, 'ほう', 'が', '好き', 'です', '。'], 'Tôi thích bóng đá hơn.', [B9]),
        da(2, ['電車', NO, 'ほう', 'が', '速い', 'です', '。'], 'Tàu điện nhanh hơn.', [A8]),
        da(3, ['秋', NO, 'ほう', 'が', '好き', 'です', '。'], 'Tôi thích mùa thu hơn.', [B9]),
        da(4, [DOCHIRAMO, 'おいしい', 'です', '。'], 'Cả hai đều ngon.', [A8]),
        da(5, ['シャンハイ', NO, 'ほう', 'が', '大きい', 'です', '。'], 'Thượng Hải lớn hơn.', [A8]),
        da(6, ['この', 'かばん', NO, 'ほう', 'が', '軽い', 'です', '。'], 'Cái cặp này nhẹ hơn.', [A8]),
        da(7, ['夏', NO, 'ほう', 'が', '好き', 'です', '。', '海', 'へ', '行きます', 'から', '。'], 'Tôi thích mùa hè hơn. Vì được đi biển.', [A5, B9]),
        da(8, ['日本語', NO, 'ほう', 'が', 'ずっと', '難しい', 'です', '。'], 'Tiếng Nhật khó hơn hẳn.', [A8, C]),
        da(9, [DOCHIRAMO, '好き', 'です', '。'], 'Tôi thích cả hai.', [B9]),
        da(10, ['駅', NO, 'ほう', 'が', '近い', 'です', '。'], 'Nhà ga gần hơn.', [A8]),
        dq(11, [A8]),
        da(11, ['地下鉄', NO, 'ほう', 'が', '速い', 'です', 'よ', '。'], 'Tàu điện ngầm nhanh hơn đấy.', [A8, F5]),
        dq(12, [B9]),
        da(12, ['カリナさん', NO, 'ほう', 'が', '上手', 'です', '。'], 'Chị Karina giỏi hơn.', [B9]),
        dq(13, [A8]),
        da(13, ['秋', NO, 'ほう', 'が', 'いい', 'です', '。', '紅葉', 'が', 'きれい', 'です', 'から', '。'], 'Mùa thu tốt hơn. Vì lá đỏ đẹp.', [A8, D9]),
        dq(14, [B]),
        da(14, ['おととい', NO, 'ほう', 'が', '寒かった', 'です', '。'], 'Hôm kia lạnh hơn.', [B]),
        dq(15, [B9]),
        da(15, [DOCHIRAMO, '好き', 'です', 'が', '、', '海', 'の', 'ほう', 'が', 'ずっと', '好き', 'です', '。'], 'Tôi thích cả hai nhưng thích biển hơn hẳn.', [B9, C, F8]),
    ],
    notes='Hai thứ: どちら; ba thứ trở lên: 何／どこ／誰 + いちばん (mẫu sau).')

# ---------------------------------------------------------------------------
QI = {
    1: (s('季節', 'の', '中', 'で', 'いつ', 'が', 'いちばん', '好き', 'です', 'か', '。'), 'Trong các mùa, bạn thích mùa nào nhất?'),
    2: (s('家族', 'の', '中', 'で', '誰', 'が', 'いちばん', '料理', 'が', '上手', 'です', 'か', '。'), 'Trong gia đình, ai nấu ăn giỏi nhất?'),
    3: (s('スポーツ', 'の', '中', 'で', '何{なに}', 'が', 'いちばん', 'おもしろい', 'です', 'か', '。'), 'Trong các môn thể thao, môn nào thú vị nhất?'),
    4: (s('世界', 'で', 'どこ', 'が', 'いちばん', '好き', 'です', 'か', '。'), 'Trên thế giới, bạn thích nơi nào nhất?'),
    5: (s('日本', 'の', '料理', 'の', '中', 'で', '何{なに}', 'が', 'いちばん', 'おいしい', 'です', 'か', '。'), 'Trong các món Nhật, món nào ngon nhất?'),
    6: (s('この', '中', 'で', 'どれ', 'が', 'いちばん', '安い', 'です', 'か', '。'), 'Trong số này, cái nào rẻ nhất?'),
    7: (s('1', '年', 'で', 'いつ', 'が', 'いちばん', '寒い', 'です', 'か', '。'), 'Trong một năm, lúc nào lạnh nhất?'),
    8: (s('飲み物', 'の', '中', 'で', '何{なに}', 'が', 'いちばん', '好き', 'です', 'か', '。'), 'Trong các đồ uống, bạn thích gì nhất?'),
    9: (s('会社', 'で', '誰', 'が', 'いちばん', '忙しい', 'です', 'か', '。'), 'Ở công ty, ai bận nhất?'),
    10: (s('この', '町', 'で', 'どこ', 'が', 'いちばん', 'にぎやか', 'です', 'か', '。'), 'Trong thành phố này, nơi nào nhộn nhịp nhất?'),
    11: (s('この', '店', 'の', '料理', 'の', '中', 'で', '何{なに}', 'が', 'いちばん', '安い', 'です', 'か', '。'), 'Trong các món của quán này, món nào rẻ nhất?'),
    12: (s('果物', 'の', '中', 'で', '何{なに}', 'が', 'いちばん', '好き', 'です', 'か', '。'), 'Trong các loại hoa quả, bạn thích loại nào nhất?'),
}


def iq(n, uses=()):
    qs, qm = QI[n]
    return (qs.replace('|で|', '|' + NAKADE + '|', 1).replace('いちばん', ICHIBAN, 1), qm, [*uses])


def ia(n, parts, meaning, uses=()):
    qs, qm = QI[n]
    t = text(parts)
    return (s(*parts), meaning, [*uses], (qs, qm, [f'はい、{t}', t[:-1] + 'か。', t.replace('が', 'を', 1)]))


p5 = point(12, 5, 'N の中で 何／どこ／誰／いつ が いちばん adj ですか', 'Trong số …, cái gì … nhất?',
    'So sánh trong một nhóm (ba thứ trở lên): N の中で + từ để hỏi + が いちばん ～ですか. '
    'Từ để hỏi theo loại: 何 (vật), どこ (nơi chốn), 誰 (người), いつ (thời gian). Phạm vi là nơi chốn hay khoảng thời gian thì '
    'không cần の中: 世界で, 1年で. Trả lời: N が いちばん ～です. Sau từ để hỏi luôn dùng が, không dùng は.',
    [
        iq(1, [B9]), iq(2, [B9]), iq(3, [A8]), iq(4, [B9]), iq(5, [A8]),
        iq(6, [A8]), iq(7, [A8]), iq(8, [B9]), iq(9, [A8]), iq(10, [A8]),
        ia(1, ['秋', 'が', ICHIBAN, '好き', 'です', '。'], 'Tôi thích mùa thu nhất.', [B9]),
        ia(2, ['母', 'が', ICHIBAN, '上手', 'です', '。'], 'Mẹ tôi giỏi nhất.', [B9]),
        ia(3, ['サッカー', 'が', ICHIBAN, 'おもしろい', 'です', '。'], 'Bóng đá thú vị nhất.', [A8]),
        ia(4, ['シンガポール', 'が', ICHIBAN, '好き', 'です', '。'], 'Tôi thích Singapore nhất.', [B9]),
        ia(5, ['てんぷら', 'が', ICHIBAN, 'おいしい', 'です', '。'], 'Tempura ngon nhất.', [A8]),
        ia(6, ['これ', 'が', ICHIBAN, '安い', 'です', '。'], 'Cái này rẻ nhất.', [A8]),
        ia(7, ['2', '月', 'が', ICHIBAN, '寒い', 'です', '。'], 'Tháng 2 lạnh nhất.', [A8]),
        ia(8, ['お茶', 'が', ICHIBAN, '好き', 'です', '。'], 'Tôi thích trà nhất.', [B9]),
        ia(9, ['ミラーさん', 'が', ICHIBAN, '忙しい', 'です', '。'], 'Anh Miller bận nhất.', [A8]),
        ia(10, ['駅', 'の', '近く', 'が', ICHIBAN, 'にぎやか', 'です', '。'], 'Khu gần nhà ga nhộn nhịp nhất.', [A8, D10]),
        (s('私', 'は', '季節', 'の', '中', NAKADE, '春', 'が', ICHIBAN, '好き', 'です', '。', '桜', 'が', 'きれい', 'です', 'から', '。'), 'Trong các mùa tôi thích mùa xuân nhất. Vì hoa anh đào đẹp.', [B9, D9]),
        (s('世界', NAKADE, ICHIBAN, '大きい', '町', 'は', 'どこ', 'です', 'か', '。'), 'Thành phố lớn nhất thế giới là ở đâu?', [B8]),
        (s('カリナさん', 'は', '学生', 'の', '中', NAKADE, ICHIBAN, '日本語', 'が', '上手', 'です', '。'), 'Trong các sinh viên, chị Karina giỏi tiếng Nhật nhất.', [B9]),
        iq(11, [A8, E1]),
        ia(11, ['カレー', 'が', ICHIBAN, '安い', 'です', '。', '500', '円', 'です', '。'], 'Cơm cà ri rẻ nhất. Giá 500 yên.', [A8]),
        (s('パーティー', 'の', '料理', 'の', '中', NAKADE, 'おすし', 'が', ICHIBAN, 'おいしかった', 'です', '。'), 'Trong các món ở bữa tiệc, sushi ngon nhất.', [B, E1]),
        (s('1', '年', NAKADE, '8', '月', 'が', ICHIBAN, '暑い', 'です', 'から', '、', '海', 'へ', '行きます', '。'), 'Trong một năm tháng 8 nóng nhất nên tôi đi biển.', [A5, D9]),
        (s('日本語', 'の', '勉強', 'の', '中', NAKADE, '漢字', 'が', ICHIBAN, '難しい', 'です', '。'), 'Trong việc học tiếng Nhật, chữ Hán khó nhất.', [A8, E1]),
        iq(12, [B9]),
        ia(12, ['りんご', 'が', ICHIBAN, '好き', 'です', '。', 'みかん', 'も', '好き', 'です', '。'], 'Tôi thích táo nhất. Tôi cũng thích quýt.', [B9, D1]),
    ],
    notes='Ba thứ trở lên: いちばん; hai thứ: どちら … のほうが. Sau từ để hỏi dùng が.')

# Chủ dự án duyệt bài 12 ngày 2026-11-12
for _p in (p1, p2, p3, p4, p5,):
    _p['approved'] = True
write(12, [p1, p2, p3, p4, p5])
