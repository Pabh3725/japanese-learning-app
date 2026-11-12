"""Ngữ pháp bài 9 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–9.
Chạy: python3 -I scripts/grammar-content/lesson_09.py  → data/grammar/lesson-09.json
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(9)
D1, E1 = 'g01-04', 'g01-05'
B4, C4 = 'g04-02', 'g04-03'
A5, B5, F5 = 'g05-01', 'g05-02', 'g05-06'
A6, B6, C6, D6, E6 = 'g06-01', 'g06-02', 'g06-03', 'g06-04', 'g06-05'
A7, D7 = 'g07-01', 'g07-04'
A8, B8, C8, E8, F8 = 'g08-01', 'g08-02', 'g08-03', 'g08-05', 'g08-06'
A, B, C, D, E = 'g09-01', 'g09-02', 'g09-03', 'g09-04', 'g09-05'

GA = '[P:を,の,へ]が'          # 日本語をわかります, 料理を好きです là sai
POS = '[W:全然,あまり,どう]'   # nhiễu cho từ chỉ mức độ ở câu khẳng định
NEG = '[W:だいたい,たくさん,とても]'  # nhiễu cho あまり／全然 ở câu phủ định
YOKU, DAITAI, TAKUSAN, SUKOSHI = POS + 'よく', POS + 'だいたい', POS + 'たくさん', POS + '少し'
AMARI, ZENZEN = NEG + 'あまり', NEG + '全然'
KARA = '[P:を,に,の]から'
DS = '[W:どれ,どこ,どんな]どうして'


def s(*parts):
    return '|'.join(parts)


def plain(p):
    return p.split('{')[0].split(']')[-1]


def text(parts):
    return ''.join(plain(p) for p in parts)


def ans(parts, meaning, uses, q, qm, wrong=None):
    """Câu đáp. Câu đáp sai mặc định: thêm はい; biến thành câu hỏi; thay trợ từ được hỏi bằng đáp án nhiễu đầu tiên."""
    t = text(parts)
    if wrong is None:
        swapped = ''.join(p.split(':')[1].split(',')[0] if p.startswith('[P:') or p.startswith('[W:') else plain(p) for p in parts)
        wrong = [f'はい、{t}', t[:-1] + 'か。', swapped]
    return (s(*parts), meaning, uses, (q, qm, wrong))


# ---------------------------------------------------------------------------
Q1a = s('ミラーさん', 'は', '日本語', 'が', 'わかります', 'か', '。')
Q1b = s('細かいお金', 'が', 'あります', 'か', '。')
Q1c = s('すみません', '、', '今', '時間', 'が', 'あります', 'か', '。', 'いっしょに', 'お茶', 'を', '飲みませんか', '。')
Q1d = s('この', '漢字', 'が', 'わかります', 'か', '。')

p1 = point(9, 1, 'N が あります／わかります', 'Có N / hiểu N',
    'あります (có) và わかります (hiểu) dùng が, không dùng を: 私は車があります (tôi có ô tô), '
    'ミラーさんは日本語がわかります (anh Miller hiểu tiếng Nhật). Người có / người hiểu đi với は. '
    'Phủ định: ありません, わかりません. あります ở đây là "sở hữu" (có tiền, có thời gian, có hẹn).',
    [
        (s('私', 'は', '車', GA, 'あります', '。'), 'Tôi có ô tô.'),
        (s('私', 'は', 'お金', GA, 'あります', '。'), 'Tôi có tiền.'),
        (s('ミラーさん', 'は', '日本語', GA, 'わかります', '。'), 'Anh Miller hiểu tiếng Nhật.'),
        (s('私', 'は', '英語', GA, 'わかります', '。'), 'Tôi hiểu tiếng Anh.'),
        (s('私', 'は', '時間', GA, 'あります', '。'), 'Tôi có thời gian.'),
        (s('カリナさん', 'は', 'カメラ', GA, 'あります', '。'), 'Chị Karina có máy ảnh.'),
        (s('私', 'は', '約束', GA, 'あります', '。'), 'Tôi có hẹn.'),
        (s('私', 'は', '用事', GA, 'あります', '。'), 'Tôi có việc bận.'),
        (s('サントスさん', 'は', 'ひらがな', GA, 'わかります', '。'), 'Anh Santos hiểu chữ Hiragana.'),
        (s('私', 'は', 'チケット', GA, 'あります', '。'), 'Tôi có vé.'),
        (s('私', 'は', '漢字', GA, 'わかりません', '。'), 'Tôi không hiểu chữ Hán.', [B4]),
        (s('今日', 'は', '時間', GA, 'ありません', '。'), 'Hôm nay tôi không có thời gian.', [B4]),
        (s('ミラーさん', 'は', '日本語', GA, 'わかります', 'か', '。'), 'Anh Miller có hiểu tiếng Nhật không?'),
        ans(['はい', '、', '日本語', GA, 'わかります', '。'], 'Vâng, anh ấy hiểu tiếng Nhật.', [], Q1a, 'Anh Miller có hiểu tiếng Nhật không?',
            ['いいえ、日本語がわかります。', 'はい、日本語をわかります。', 'はい、日本語がわかりますか。']),
        (s('細かいお金', GA, 'あります', 'か', '。'), 'Bạn có tiền lẻ không?'),
        ans(['いいえ', '、', '細かいお金', GA, 'ありません', '。'], 'Không, tôi không có tiền lẻ.', [B4], Q1b, 'Bạn có tiền lẻ không?',
            ['はい、細かいお金がありません。', 'いいえ、細かいお金をありません。', 'いいえ、細かいお金がありませんか。']),
        (s('私', 'は', 'ローマ字', GA, 'わかります', 'が', '、', '漢字', 'が', 'わかりません', '。'), 'Tôi hiểu chữ La-tinh nhưng không hiểu chữ Hán.', [B4, F8]),
        (s('あした', 'は', '約束', GA, 'あります', '。'), 'Ngày mai tôi có hẹn.'),
        (s('カリナさん', 'は', 'かたかな', GA, 'わかります', '。'), 'Chị Karina hiểu chữ Katakana.'),
        (s('私', 'は', '今', 'お金', GA, 'ありません', '。'), 'Bây giờ tôi không có tiền.', [B4]),
        (s('すみません', '、', '今', '時間', GA, 'あります', 'か', '。', 'いっしょに', 'お茶', 'を', '飲みませんか', '。'), 'Xin lỗi, bây giờ bạn có thời gian không? Cùng uống trà nhé?', [D6]),
        ans(['ええ', '、', '時間', GA, 'あります', 'よ', '。'], 'Vâng, tôi có thời gian đấy.', [F5], Q1c, 'Xin lỗi, bây giờ bạn có thời gian không? Cùng uống trà nhé?',
            ['いいえ、時間がありますよ。', 'ええ、時間をありますよ。', 'ええ、時間がありますか。']),
        (s('あした', 'は', '用事', GA, 'あります', '。', 'いっしょに', '行きません', '。'), 'Ngày mai tôi có việc bận. Tôi không đi cùng được.', [B4]),
        (s('ミラーさん', 'は', '英語', 'と', '日本語', GA, 'わかります', '。'), 'Anh Miller hiểu tiếng Anh và tiếng Nhật.', ['g04-05']),
        (s('この', '漢字', GA, 'わかります', 'か', '。'), 'Bạn có hiểu chữ Hán này không?', ['g02-02']),
        ans(['いいえ', '、', 'この', '漢字', GA, 'わかりません', '。'], 'Không, tôi không hiểu chữ Hán này.', [B4], Q1d, 'Bạn có hiểu chữ Hán này không?',
            ['はい、この漢字がわかりません。', 'いいえ、この漢字をわかりません。', 'いいえ、この漢字がわかりませんか。']),
        (s('私', 'は', '新しい', '車', GA, 'あります', '。'), 'Tôi có một chiếc ô tô mới.', [B8]),
        (s('あさって', 'は', 'コンサート', 'の', 'チケット', GA, 'あります', '。', 'いっしょに', '行きませんか', '。'), 'Ngày mốt tôi có vé buổi hòa nhạc. Cùng đi không?', [D6, E1]),
        (s('ワンさん', 'は', '中国語', GA, 'わかります', '。', '日本語', 'も', 'わかります', '。'), 'Anh Wang hiểu tiếng Trung Quốc. Anh ấy cũng hiểu tiếng Nhật.', [D1]),
        (s('今日', 'は', '細かいお金', GA, 'ありません', '。', 'すみません', '。'), 'Hôm nay tôi không có tiền lẻ. Xin lỗi.', [B4]),
    ],
    notes='Với あります, わかります dùng が: 日本語がわかります (không nói 日本語をわかります).')

# ---------------------------------------------------------------------------
Q2a = s('どんな', 'スポーツ', 'が', '好き', 'です', 'か', '。')
Q2b = s('どんな', '飲み物', 'が', '好き', 'です', 'か', '。')
Q2c = s('ワンさん', 'は', '料理', 'が', '上手', 'です', 'か', '。')
Q2d = s('どんな', '音楽', 'が', '好き', 'です', 'か', '。')
Q2e = s('ご主人', 'は', '日本', 'の', '料理', 'が', '上手', 'です', 'か', '。')

p2 = point(9, 2, 'N が 好きです／嫌いです／上手です／下手です', 'Thích / ghét / giỏi / kém N',
    '好き (thích), 嫌い (ghét), 上手 (giỏi), 下手 (kém) là tính từ な; thứ được thích, thứ mình giỏi đi với が: '
    '私は料理が好きです (tôi thích nấu ăn), カリナさんは絵が上手です (chị Karina vẽ giỏi). '
    'Hỏi loại nào bằng どんな: どんなスポーツが好きですか. 上手 dùng để khen người khác, không tự khen mình.',
    [
        (s('私', 'は', '料理', GA, '好き', 'です', '。'), 'Tôi thích nấu ăn.'),
        (s('私', 'は', '音楽', GA, '好き', 'です', '。'), 'Tôi thích âm nhạc.'),
        (s('ミラーさん', 'は', 'スポーツ', GA, '好き', 'です', '。'), 'Anh Miller thích thể thao.'),
        (s('カリナさん', 'は', '絵', GA, '上手', 'です', '。'), 'Chị Karina vẽ giỏi.'),
        (s('私', 'は', '歌', GA, '下手', 'です', '。'), 'Tôi hát kém.'),
        (s('私', 'は', 'お酒', GA, '嫌い', 'です', '。'), 'Tôi ghét rượu.'),
        (s('サントスさん', 'は', 'サッカー', GA, '上手', 'です', '。'), 'Anh Santos chơi bóng đá giỏi.'),
        (s('私', 'は', 'ダンス', GA, '下手', 'です', '。'), 'Tôi nhảy kém.'),
        (s('イーさん', 'は', 'ジャズ', GA, '好き', 'です', '。'), 'Chị Lee thích nhạc jazz.'),
        (s('私', 'は', '野菜', GA, '嫌い', 'です', '。'), 'Tôi ghét rau.'),
        (s('私', 'は', '魚', GA, 'あまり', '好き', 'じゃありません', '。'), 'Tôi không thích cá lắm.', [C8]),
        (s('どんな', 'スポーツ', GA, '好き', 'です', 'か', '。'), 'Bạn thích môn thể thao nào?', [E8]),
        ans(['野球', GA, '好き', 'です', '。'], 'Tôi thích bóng chày.', [], Q2a, 'Bạn thích môn thể thao nào?'),
        (s('どんな', '飲み物', GA, '好き', 'です', 'か', '。'), 'Bạn thích đồ uống nào?', [E8]),
        ans(['コーヒー', GA, '好き', 'です', '。'], 'Tôi thích cà phê.', [], Q2b, 'Bạn thích đồ uống nào?'),
        (s('ミラーさん', 'は', '日本語', GA, 'とても', '上手', 'です', '。'), 'Anh Miller rất giỏi tiếng Nhật.', [C8]),
        (s('私', 'は', 'カラオケ', GA, '嫌い', 'です', '。'), 'Tôi ghét karaoke.'),
        (s('ワンさん', 'は', '料理', GA, '上手', 'です', 'か', '。'), 'Anh Wang có nấu ăn giỏi không?'),
        ans(['いいえ', '、', '料理', GA, '下手', 'です', '。'], 'Không, anh ấy nấu ăn kém.', [], Q2c, 'Anh Wang có nấu ăn giỏi không?',
            ['はい、料理が下手です。', 'いいえ、料理を下手です。', 'いいえ、料理が下手ですか。']),
        (s('父', 'は', '歌舞伎', GA, '好き', 'です', '。'), 'Bố tôi thích kịch Kabuki.'),
        (s('私', 'は', '日本', 'の', '食べ物', GA, '好き', 'です', 'が', '、', 'お酒', 'は', '嫌い', 'です', '。'), 'Tôi thích đồ ăn Nhật nhưng ghét rượu.', [E1, F8]),
        (s('カリナさん', 'は', '絵', GA, 'とても', '上手', 'です', '。', 'そして', '、', '字', 'も', 'きれい', 'です', '。'), 'Chị Karina vẽ rất giỏi. Và chữ cũng đẹp.', [C8, F8]),
        (s('妻', 'は', 'クラシック', GA, '好き', 'です', 'が', '、', '私', 'は', 'ジャズ', 'が', '好き', 'です', '。'), 'Vợ tôi thích nhạc cổ điển nhưng tôi thích nhạc jazz.', [F8]),
        (s('どんな', '音楽', GA, '好き', 'です', 'か', '。'), 'Bạn thích loại nhạc nào?', [E8]),
        ans(['クラシック', GA, '好き', 'です', '。', 'ジャズ', 'も', '好き', 'です', '。'], 'Tôi thích nhạc cổ điển. Tôi cũng thích nhạc jazz.', [D1], Q2d, 'Bạn thích loại nhạc nào?'),
        (s('サントスさん', 'は', 'サッカー', GA, 'とても', '上手', 'です', 'よ', '。'), 'Anh Santos chơi bóng đá rất giỏi đấy.', [C8, F5]),
        (s('ご主人', 'は', '日本', 'の', '料理', GA, '上手', 'です', 'か', '。'), 'Chồng chị có nấu món Nhật giỏi không?', [E1]),
        ans(['いいえ', '、', '主人', 'は', '日本', 'の', '料理', GA, '下手', 'です', '。'], 'Không, chồng tôi nấu món Nhật kém.', [E1], Q2e, 'Chồng chị có nấu món Nhật giỏi không?',
            ['はい、主人は日本の料理が下手です。', 'いいえ、主人は日本の料理を下手です。', 'いいえ、ご主人は日本の料理が下手です。']),
        (s('私', 'は', '野菜', GA, 'あまり', '好き', 'じゃありません', 'が', '、', '果物', 'は', '好き', 'です', '。'), 'Tôi không thích rau lắm nhưng thích trái cây.', [C8, F8]),
        (s('ミラーさん', 'は', '歌', GA, '上手', 'です', 'ね', '。', 'いっしょに', 'カラオケ', 'へ', '行きませんか', '。'), 'Anh Miller hát hay nhỉ. Cùng đi karaoke không?', [A5, D6, 'g04-06']),
    ],
    notes='Nói về chồng/vợ người khác: ご主人, 奥さん; của mình: 主人 (夫), 家内 (妻).')

# ---------------------------------------------------------------------------
Q3a = s('ミラーさん', 'は', '日本語', 'が', 'わかります', 'か', '。')
Q3b = s('クラシック', 'が', '好き', 'です', 'か', '。')

p3 = point(9, 3, 'よく／だいたい／たくさん／少し／あまり／全然', 'Mức độ, số lượng',
    'Các phó từ đứng trước động từ để chỉ mức độ: よくわかります (hiểu rõ), だいたいわかります (hiểu đại khái), '
    '少しわかります (hiểu một chút); chỉ số lượng: お金がたくさんあります (có nhiều tiền), 少しあります. '
    'あまり (không … lắm) và 全然 (hoàn toàn không) chỉ đi với phủ định: あまりわかりません, 全然わかりません. '
    'よく đi với động từ còn có nghĩa "thường xuyên": よく聞きます.',
    [
        (s('ミラーさん', 'は', '日本語', 'が', YOKU, '[F]わかります', '。'), 'Anh Miller hiểu tiếng Nhật rõ.', [A]),
        (s('私', 'は', '英語', 'が', DAITAI, '[F]わかります', '。'), 'Tôi hiểu tiếng Anh đại khái.', [A]),
        (s('私', 'は', '漢字', 'が', SUKOSHI, 'わかります', '。'), 'Tôi hiểu chữ Hán một chút.', [A]),
        (s('私', 'は', 'かたかな', 'が', ZENZEN, '[F]わかりません', '。'), 'Tôi hoàn toàn không hiểu chữ Katakana.', [A]),
        (s('私', 'は', 'お金', 'が', TAKUSAN, '[F]あります', '。'), 'Tôi có nhiều tiền.', [A]),
        (s('今日', 'は', '時間', 'が', SUKOSHI, 'あります', '。'), 'Hôm nay tôi có một chút thời gian.', [A]),
        (s('私', 'は', 'フランス語', 'が', AMARI, '[F]わかりません', '。'), 'Tôi không hiểu tiếng Pháp lắm.', [A]),
        (s('カリナさん', 'は', '漢字', 'が', YOKU, 'わかります', '。'), 'Chị Karina hiểu chữ Hán rõ.', [A]),
        (s('私', 'は', 'お金', 'が', ZENZEN, 'ありません', '。'), 'Tôi hoàn toàn không có tiền.', [A]),
        (s('今日', 'は', '用事', 'が', TAKUSAN, 'あります', '。'), 'Hôm nay tôi có nhiều việc bận.', [A]),
        (s('ミラーさん', 'は', '日本語', 'が', 'わかります', 'か', '。'), 'Anh Miller có hiểu tiếng Nhật không?', [A]),
        ans(['はい', '、', YOKU, 'わかります', '。'], 'Vâng, anh ấy hiểu rõ.', [A], Q3a, 'Anh Miller có hiểu tiếng Nhật không?',
            ['はい、全然わかります。', 'いいえ、よくわかります。', 'はい、よくわかりますか。']),
        ans(['いいえ', '、', ZENZEN, 'わかりません', '。'], 'Không, anh ấy hoàn toàn không hiểu.', [A], Q3a, 'Anh Miller có hiểu tiếng Nhật không?',
            ['はい、全然わかりません。', 'いいえ、全然わかります。', 'いいえ、たくさんわかりません。']),
        (s('私', 'は', 'ひらがな', 'が', DAITAI, 'わかります', 'が', '、', '漢字', 'は', ZENZEN, 'わかりません', '。'), 'Tôi hiểu chữ Hiragana đại khái nhưng hoàn toàn không hiểu chữ Hán.', [A, F8]),
        (s('細かいお金', 'が', SUKOSHI, 'あります', '。'), 'Tôi có một ít tiền lẻ.', [A]),
        (s('カリナさん', 'は', 'ジャズ', 'が', AMARI, '好き', 'じゃありません', '。'), 'Chị Karina không thích nhạc jazz lắm.', [B]),
        (s('私', 'は', 'お酒', 'を', SUKOSHI, '[F]飲みます', '。'), 'Tôi uống rượu một chút.', [A6]),
        (s('サントスさん', 'は', '毎日', 'ビール', 'を', TAKUSAN, '[F]飲みます', '。'), 'Ngày nào anh Santos cũng uống nhiều bia.', [A6]),
        (s('ワンさん', 'は', '英語', 'が', YOKU, 'わかります', '。'), 'Anh Wang hiểu tiếng Anh rõ.', [A]),
        (s('私', 'は', '歌舞伎', 'が', ZENZEN, 'わかりません', '。'), 'Tôi hoàn toàn không hiểu kịch Kabuki.', [A]),
        (s('イーさん', 'は', '漢字', 'が', YOKU, 'わかります', '。', 'そして', '、', '字', 'も', 'きれい', 'です', '。'), 'Chị Lee hiểu chữ Hán rõ. Và chữ viết cũng đẹp.', [A, F8]),
        (s('私', 'は', '日本語', 'が', SUKOSHI, 'わかります', 'が', '、', '英語', 'は', ZENZEN, 'わかりません', '。'), 'Tôi hiểu tiếng Nhật một chút nhưng hoàn toàn không hiểu tiếng Anh.', [A, F8]),
        (s('今週', 'は', '用事', 'が', TAKUSAN, 'あります', '。', 'あまり', '暇', 'じゃありません', '。'), 'Tuần này tôi có nhiều việc bận. Không rảnh lắm.', [A, C8]),
        (s('ミラーさん', 'は', '料理', 'が', AMARI, '[F:*上手くないです,*上手ないです,*上手なじゃありません/上手ではありません]上手じゃありません', '。'), 'Anh Miller nấu ăn không giỏi lắm.', [B]),
        (s('すみません', '、', '今', '細かいお金', 'が', ZENZEN, 'ありません', '。'), 'Xin lỗi, bây giờ tôi hoàn toàn không có tiền lẻ.', [A]),
        (s('クラシック', 'が', '好き', 'です', 'か', '。'), 'Bạn có thích nhạc cổ điển không?', [B]),
        ans(['ええ', '、', YOKU, '聞きます', '。'], 'Có, tôi thường nghe.', [B], Q3b, 'Bạn có thích nhạc cổ điển không?',
            ['いいえ、よく聞きます。', 'ええ、全然聞きます。', 'ええ、よく聞きますか。']),
        (s('私', 'は', '時々', 'お茶', 'を', '飲みます', 'が', '、', 'コーヒー', 'は', ZENZEN, '飲みません', '。'), 'Thỉnh thoảng tôi uống trà nhưng hoàn toàn không uống cà phê.', [A6, F8]),
        (s('今日', 'は', '時間', 'が', AMARI, 'ありません', '。', 'あした', '会いましょう', '。'), 'Hôm nay tôi không có nhiều thời gian. Ngày mai gặp nhau nhé.', [A, E6]),
        (s('日本', 'の', '歌', 'が', DAITAI, 'わかります', '。', '毎日', 'ラジオ', 'で', '聞きます', '。'), 'Tôi hiểu đại khái các bài hát Nhật. Ngày nào tôi cũng nghe qua đài.', [A, A7, E1]),
    ],
    notes='あまり, 全然 + phủ định. よく, だいたい, 少し, たくさん + khẳng định.')

# ---------------------------------------------------------------------------
p4 = point(9, 4, 'S1 から、S2', 'Vì S1 nên S2',
    'から đặt cuối câu thứ nhất để nêu lý do, câu thứ hai là kết quả: 時間がありませんから、新聞を読みません '
    '(vì không có thời gian nên tôi không đọc báo). Thứ tự luôn là lý do trước, kết quả sau. '
    'Khác から ở bài 4 (từ … đến): ở đây から đứng sau cả một câu.',
    [
        (s('時間', 'が', '[F]ありません', KARA, '、', '新聞', 'を', '読みません', '。'), 'Vì không có thời gian nên tôi không đọc báo.', [A]),
        (s('暑い', 'です', KARA, '、', '冷たい', 'ビール', 'を', '飲みます', '。'), 'Vì trời nóng nên tôi uống bia lạnh.', [B8]),
        (s('用事', 'が', 'あります', KARA, '、', '早く', '[F]帰ります', '。'), 'Vì có việc bận nên tôi về sớm.', [A],
         (s('どうして', '早く', '帰ります', 'か', '。'), 'Tại sao bạn về sớm?', ['はい、用事がありますから、早く帰ります。', '用事がありますから、早く帰りますか。', '*用事がありますを、早く帰ります。'])),
        (s('日本語', 'が', 'わかりません', KARA, '、', '英語', 'で', '書きます', '。'), 'Vì không hiểu tiếng Nhật nên tôi viết bằng tiếng Anh.', [A, A7]),
        (s('お金', 'が', 'ありません', KARA, '、', '何{なに}', 'も', '[F]買いません', '。'), 'Vì không có tiền nên tôi không mua gì cả.', [A, B6]),
        (s('あした', 'は', '休み', 'です', KARA, '、', '映画', 'を', '見ます', '。'), 'Vì ngày mai là ngày nghỉ nên tôi xem phim.', [A6]),
        (s('この', '本', 'は', 'おもしろい', 'です', KARA, '、', '毎日', '読みます', '。'), 'Vì cuốn sách này thú vị nên ngày nào tôi cũng đọc.', [A8]),
        (s('寒い', 'です', KARA, '、', 'うち', 'で', 'テレビ', 'を', '見ます', '。'), 'Vì trời lạnh nên tôi xem tivi ở nhà.', [C6]),
        (s('約束', 'が', 'あります', KARA, '、', '5', '時', 'に', '[F]帰ります', '。'), 'Vì có hẹn nên tôi về lúc 5 giờ.', [A, C4]),
        (s('この', '店', 'は', '安い', 'です', KARA, '、', 'いつも', 'ここ', 'で', '買います', '。'), 'Vì cửa hàng này rẻ nên tôi luôn mua ở đây.', [A8, C6]),
        (s('私', 'は', '音楽', 'が', '好き', 'です', KARA, '、', '毎日', 'ラジオ', 'を', '[F]聞きます', '。'), 'Vì thích âm nhạc nên ngày nào tôi cũng nghe đài.', [B],
         (s('どうして', '毎日', 'ラジオ', 'を', '聞きます', 'か', '。'), 'Tại sao ngày nào bạn cũng nghe đài?', ['はい、音楽が好きですから、毎日ラジオを聞きます。', '音楽が好きですから、毎日ラジオを聞きますか。', '*音楽が好きですを、毎日ラジオを聞きます。'])),
        (s('お金', 'が', 'たくさん', 'あります', KARA, '、', '新しい', '車', 'を', '買います', '。'), 'Vì có nhiều tiền nên tôi mua ô tô mới.', [B8, C]),
        (s('子ども', 'の', '誕生日', 'です', KARA, '、', '早く', '帰ります', '。'), 'Vì là sinh nhật con nên tôi về sớm.', [E1]),
        (s('日本', 'の', '料理', 'が', '好き', 'です', KARA, '、', 'よく', '日本', 'の', 'レストラン', 'へ', '行きます', '。'), 'Vì thích món ăn Nhật nên tôi thường đi nhà hàng Nhật.', [A5, B, C]),
        (s('あした', 'は', '約束', 'が', 'あります', KARA, '、', '今日', '宿題', 'を', 'します', '。'), 'Vì ngày mai có hẹn nên hôm nay tôi làm bài tập.', [A, A6]),
        (s('漢字', 'が', '[F]わかりません', KARA, '、', 'ミラーさん', 'に', '聞きます', '。'), 'Vì không hiểu chữ Hán nên tôi hỏi anh Miller.', [A]),
        (s('この', 'カメラ', 'は', '小さい', 'です', KARA, '、', '便利', 'です', '。'), 'Vì cái máy ảnh này nhỏ nên tiện.', [A8]),
        (s('時間', 'が', 'あります', KARA, '、', 'いっしょに', 'お茶', 'を', '飲みませんか', '。'), 'Vì có thời gian nên cùng uống trà không?', [A, D6]),
        (s('ミラーさん', 'は', '日本語', 'が', '上手', 'です', KARA, '、', 'ミラーさん', 'に', '習います', '。'), 'Vì anh Miller giỏi tiếng Nhật nên tôi học với anh ấy.', [B, D7]),
        (s('あの', 'レストラン', 'は', '高い', 'です', KARA, '、', 'あまり', '[F]行きません', '。'), 'Vì nhà hàng kia đắt nên tôi không hay đi.', [A8, C],
         (s('どうして', 'あの', 'レストラン', 'へ', '行きません', 'か', '。'), 'Tại sao bạn không đi nhà hàng kia?', ['はい、あのレストランは高いですから、あまり行きません。', 'あのレストランは高いですから、あまり行きませんか。', '*あのレストランは高いですを、あまり行きません。'])),
        (s('今日', 'は', 'とても', '寒い', 'です', KARA, '、', 'どこ', 'へ', 'も', '行きません', '。'), 'Vì hôm nay trời rất lạnh nên tôi không đi đâu cả.', [B5, C8]),
        (s('あした', 'は', '妻', 'の', '誕生日', 'です', KARA, '、', 'きのう', 'デパート', 'で', '花', 'を', '買いました', '。'), 'Vì ngày mai là sinh nhật vợ nên hôm qua tôi đã mua hoa ở cửa hàng bách hóa.', [B4, C6, E1]),
        (s('この', '映画', 'は', 'おもしろくない', 'です', KARA, '、', '見ません', '。'), 'Vì bộ phim này không hay nên tôi không xem.', [A8]),
        (s('父', 'は', 'お酒', 'が', '嫌い', 'です', KARA, '、', '全然', '[F]飲みません', '。'), 'Vì bố ghét rượu nên ông hoàn toàn không uống.', [B, C]),
        (s('9', '時', 'に', '約束', 'が', 'あります', KARA, '、', '7', '時', 'に', 'おきます', '。'), 'Vì có hẹn lúc 9 giờ nên tôi dậy lúc 7 giờ.', [A, C4]),
        (s('ワンさん', 'は', '親切', 'な', '医者', 'です', KARA, '、', 'いつも', 'ワンさん', 'の', '病院', 'へ', '行きます', '。'), 'Vì anh Wang là bác sĩ tử tế nên tôi luôn đến bệnh viện của anh ấy.', [A5, B8]),
        (s('この', '町', 'は', '静か', 'です', KARA, '、', '好き', 'です', '。'), 'Vì thành phố này yên tĩnh nên tôi thích.', [A8, B]),
        (s('日本語', 'の', '新聞', 'は', '難しい', 'です', KARA, '、', '英語', 'の', '新聞', 'を', '読みます', '。'), 'Vì báo tiếng Nhật khó nên tôi đọc báo tiếng Anh.', [A8, E1]),
        (s('きのう', 'は', '用事', 'が', 'ありました', KARA, '、', '学校', 'へ', '[F]行きませんでした', '。'), 'Vì hôm qua có việc bận nên tôi đã không đi học.', [A, A5, B4],
         (s('どうして', 'きのう', '学校', 'へ', '行きませんでした', 'か', '。'), 'Tại sao hôm qua bạn không đi học?', ['はい、きのうは用事がありましたから、学校へ行きませんでした。', 'きのうは用事がありましたから、学校へ行きませんでしたか。', '*きのうは用事がありましたを、学校へ行きませんでした。'])),
        (s('細かいお金', 'が', 'ありません', KARA, '、', 'カード', 'で', '買います', '。'), 'Vì không có tiền lẻ nên tôi mua bằng thẻ.', [A, A7]),
    ],
    notes='Lý do + から、kết quả. Không đảo thứ tự: 新聞を読みませんから、時間がありません là sai nghĩa.')

# ---------------------------------------------------------------------------
QW = {
    1: (s('どうして', '早く', '帰ります', 'か', '。'), 'Tại sao bạn về sớm?'),
    2: (s('どうして', '新聞', 'を', '読みません', 'か', '。'), 'Tại sao bạn không đọc báo?'),
    3: (s('どうして', '日本語', 'を', '勉強します', 'か', '。'), 'Tại sao bạn học tiếng Nhật?'),
    4: (s('どうして', 'お酒', 'を', '飲みません', 'か', '。'), 'Tại sao bạn không uống rượu?'),
    5: (s('どうして', 'きのう', '学校', 'へ', '行きませんでした', 'か', '。'), 'Tại sao hôm qua bạn không đi học?'),
    6: (s('どうして', '毎日', 'ラジオ', 'を', '聞きます', 'か', '。'), 'Tại sao ngày nào bạn cũng nghe đài?'),
    7: (s('ミラーさん', 'は', 'どうして', '来ません', 'か', '。'), 'Tại sao anh Miller không đến?'),
    8: (s('どうして', 'この', '店', 'で', '買います', 'か', '。'), 'Tại sao bạn mua ở cửa hàng này?'),
    9: (s('どうして', 'あの', '映画', 'を', '見ません', 'か', '。'), 'Tại sao bạn không xem bộ phim đó?'),
    10: (s('どうして', '新しい', '車', 'を', '買います', 'か', '。'), 'Tại sao bạn mua ô tô mới?'),
    11: (s('カリナさん', 'は', 'どうして', '日本', 'へ', '来ました', 'か', '。'), 'Tại sao chị Karina đến Nhật?'),
    12: (s('どうして', 'きのう', '会社', 'を', '休みました', 'か', '。'), 'Tại sao hôm qua bạn nghỉ làm?'),
    13: (s('どうして', '毎晩', '漢字', 'を', '勉強します', 'か', '。'), 'Tại sao tối nào bạn cũng học chữ Hán?'),
    14: (s('ミラーさん', '、', 'どうして', '何{なに}', 'も', '食べません', 'か', '。'), 'Anh Miller, tại sao anh không ăn gì cả?'),
    15: (s('どうして', 'あの', 'レストラン', 'へ', '行きません', 'か', '。'), 'Tại sao bạn không đi nhà hàng kia?'),
}


def wq(n, uses=()):
    """Câu hỏi どうして với chỗ hỏi ở どうして."""
    qs, qm = QW[n]
    return (qs.replace('どうして', DS, 1), qm, [*uses])


def why(n, parts, meaning, uses=()):
    """Câu đáp ～から。 Câu đáp sai: thêm はい / いいえ; bỏ から thay bằng を."""
    qs, qm = QW[n]
    t = text(parts)
    return (s(*parts), meaning, [*uses], (qs, qm, [f'はい、{t}', f'いいえ、{t}', '*' + t.replace('から。', 'を。')]))


p5 = point(9, 5, 'どうして ～か — ～から', 'Tại sao? — Vì …',
    'どうして hỏi lý do: どうして早く帰りますか (tại sao bạn về sớm?). Trả lời bằng lý do + から: '
    '用事がありますから (vì tôi có việc bận). Câu trả lời có thể bỏ phần kết quả, chỉ giữ lý do + から.',
    [
        wq(1), wq(2, [A6]), wq(3, [A6]), wq(4, [A6]), wq(5, [A5, B4]), wq(6, [A6]), wq(7), wq(8, [C6]), wq(9, [A6]), wq(10, [A6, B8]),
        why(1, ['用事', 'が', 'あります', KARA, '。'], 'Vì tôi có việc bận.', [A]),
        why(2, ['時間', 'が', 'ありません', KARA, '。'], 'Vì tôi không có thời gian.', [A]),
        why(3, ['日本', 'の', '会社', 'で', '働きます', KARA, '。'], 'Vì tôi làm việc ở công ty Nhật.', [C6, E1]),
        why(4, ['お酒', 'が', '嫌い', 'です', KARA, '。'], 'Vì tôi ghét rượu.', [B]),
        why(5, ['約束', 'が', 'ありました', KARA, '。'], 'Vì tôi đã có hẹn.', [A]),
        why(6, ['音楽', 'が', '好き', 'です', KARA, '。'], 'Vì tôi thích âm nhạc.', [B]),
        why(7, ['今日', 'は', '忙しい', 'です', KARA, '。'], 'Vì hôm nay anh ấy bận.', [A8]),
        why(8, ['安い', 'です', KARA, '。'], 'Vì rẻ.', [A8]),
        why(9, ['あまり', 'おもしろくない', 'です', KARA, '。'], 'Vì không hay lắm.', [C8]),
        why(10, ['今', 'の', '車', 'は', 'とても', '古い', 'です', KARA, '。'], 'Vì chiếc xe bây giờ rất cũ.', [C8]),
        wq(11, [A5]),
        why(11, ['日本', 'の', '絵', 'が', '好き', 'です', KARA, '。'], 'Vì chị ấy thích tranh Nhật.', [B, E1]),
        wq(12, [A6]),
        why(12, ['ちょっと', '用事', 'が', 'ありました', KARA, '。'], 'Vì tôi có chút việc bận.', [A]),
        wq(13, [A6]),
        why(13, ['漢字', 'が', '全然', 'わかりません', KARA, '。'], 'Vì tôi hoàn toàn không hiểu chữ Hán.', [A, C]),
        wq(14, [B6]),
        why(14, ['今朝', 'たくさん', '食べました', KARA, '。'], 'Vì sáng nay tôi đã ăn nhiều.', [B4, C]),
        wq(15, [A5]),
        why(15, ['高い', 'です', KARA, '。', 'そして', '、', 'あまり', 'おいしくない', 'です', '。'], 'Vì đắt. Mà cũng không ngon lắm.', [C8, F8]),
    ],
    notes='Trả lời どうして bằng ～から. Câu hỏi và câu trả lời phải cùng nói về một việc.')

# Chủ dự án duyệt bài 9 ngày 2026-11-12
for p in (p1, p2, p3, p4, p5,):
    p['approved'] = True
write(9, [p1, p2, p3, p4, p5])
