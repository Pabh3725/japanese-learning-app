"""Ngữ pháp bài 7 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–7.
Chạy: python3 -I scripts/grammar-content/lesson_07.py  → data/grammar/lesson-07.json
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(7)
A1, C1, D1, E1 = 'g01-01', 'g01-03', 'g01-04', 'g01-05'
B2 = 'g02-02'
B4, C4, D4, E4, F4 = 'g04-02', 'g04-03', 'g04-04', 'g04-05', 'g04-06'
A5, C5, D5, F5 = 'g05-01', 'g05-03', 'g05-04', 'g05-06'
A6, B6, C6, D6, E6 = 'g06-01', 'g06-02', 'g06-03', 'g06-04', 'g06-05'
A, B, C, D, E = 'g07-01', 'g07-02', 'g07-03', 'g07-04', 'g07-05'

DE = '[P:の,に,へ]で'          # dụng cụ, ngôn ngữ
DL = '[P:に,を,へ]で'          # ～語で
NANI = '何{なに}'
NAN_W = '[W:どこ,誰,いつ]何{なん}'
NI = '[P:を,で,から]に'        # người nhận (あげます, 貸します, 教えます, 送ります)
NIF = '[P:を,で,へ/から]に'    # người cho (もらいます, 借ります, 習います): から cũng đúng
FROM = '[P:を,で,へ/に]から'
FROM_ORG = '[P:を,で,へ]から'  # công ty, tổ chức: chỉ dùng から
MOU = '[W:まだ,いつ,どこ]もう'   # câu trả lời はい、もう～ました
MADA = '[W:もう,いつ,どこ]まだ'  # câu trả lời いいえ、まだです
MOU_Q = '[W:まだ,どこ,誰]もう'  # câu hỏi (không dùng いつ: いつ来ましたか vẫn đúng)


def s(*parts):
    return '|'.join(parts)


def text(parts):
    return ''.join(p.split('{')[0].split(']')[-1] for p in parts)


def ans(parts, meaning, uses, q, qm, wrong=None):
    """Câu đáp. Câu đáp sai mặc định: thêm はい; biến thành câu hỏi; thay trợ từ được hỏi bằng đáp án nhiễu đầu tiên."""
    t = text(parts)
    if wrong is None:
        swapped = ''.join(p.split(':')[1].split(',')[0] if p.startswith('[P:') else p.split('{')[0].split(']')[-1] for p in parts)
        wrong = [f'はい、{t}', t[:-1] + 'か。', swapped]
    return (s(*parts), meaning, uses, (q, qm, wrong))


# ---------------------------------------------------------------------------
p1 = point(7, 1, 'N (dụng cụ, cách thức) で V', 'Làm V bằng N',
    'で đứng sau dụng cụ hoặc cách thức dùng để làm việc: はしでごはんを食べます (ăn cơm bằng đũa), '
    'パソコンでレポートを書きます (viết báo cáo bằng máy tính). Ngôn ngữ cũng dùng で: 日本語で手紙を書きます '
    '(viết thư bằng tiếng Nhật). Hỏi bằng 何で (なにで): 何でごはんを食べますか.',
    [
        (s('私', 'は', 'はし', DE, 'ごはん', 'を', '食べます', '。'), 'Tôi ăn cơm bằng đũa.', [A6]),
        (s('私', 'は', 'ナイフ', DE, '肉', 'を', '切ります', '。'), 'Tôi cắt thịt bằng dao.', [A6]),
        (s('私', 'は', 'はさみ', DE, 'かみ', 'を', '切ります', '。'), 'Tôi cắt giấy bằng kéo.', [A6]),
        (s('私', 'は', 'ボールペン', DE, '手紙', 'を', '書きます', '。'), 'Tôi viết thư bằng bút bi.', [A6]),
        (s('私', 'は', 'スプーン', DE, '卵', 'を', '食べます', '。'), 'Tôi ăn trứng bằng thìa.', [A6]),
        (s('私', 'は', 'パソコン', DE, 'レポート', 'を', '書きます', '。'), 'Tôi viết báo cáo bằng máy tính.', [A6]),
        (s('ミラーさん', 'は', '日本語', DE, '手紙', 'を', '書きます', '。'), 'Anh Miller viết thư bằng tiếng Nhật.', [A6]),
        (s('私', 'は', 'カメラ', DE, '写真', 'を', '撮ります', '。'), 'Tôi chụp ảnh bằng máy ảnh.', [A6]),
        (s('私', 'は', 'ファクス', DE, 'レポート', 'を', '送ります', '。'), 'Tôi gửi báo cáo bằng máy fax.', [A6]),
        (s('サントスさん', 'は', '手', DE, 'パン', 'を', '食べます', '。'), 'Anh Santos ăn bánh mì bằng tay.', [A6]),
        (s(NANI, DE, 'ごはん', 'を', '食べます', 'か', '。'), 'Bạn ăn cơm bằng gì?', [A6, C1]),
        ans(['はし', DE, '食べます', '。'], 'Tôi ăn bằng đũa.', [], s(NANI, 'で', 'ごはん', 'を', '食べます', 'か', '。'), 'Bạn ăn cơm bằng gì?'),
        (s('私', 'は', '英語', DE, 'レポート', 'を', '書きました', '。'), 'Tôi đã viết báo cáo bằng tiếng Anh.', [A6, B4]),
        (s('カリナさん', 'は', '鉛筆', DE, '手紙', 'を', '書きました', '。'), 'Chị Karina đã viết thư bằng bút chì.', [A6, B4]),
        (s('私', 'は', 'ワープロ', DE, '手紙', 'を', '書きません', '。', 'パソコン', 'で', '書きます', '。'), 'Tôi không viết thư bằng máy đánh chữ. Tôi viết bằng máy tính.', [A6, B4]),
        (s('私', 'は', '日本語', DE, '電話', 'を', 'かけます', '。'), 'Tôi gọi điện thoại bằng tiếng Nhật.', [A6]),
        (s(NANI, DE, '手紙', 'を', '書きます', 'か', '。'), 'Bạn viết thư bằng gì?', [A6, C1]),
        ans(['ボールペン', DE, '書きます', '。'], 'Tôi viết bằng bút bi.', [], s(NANI, 'で', '手紙', 'を', '書きます', 'か', '。'), 'Bạn viết thư bằng gì?'),
        (s('私', 'は', '毎日', 'パソコン', DE, '日本語', 'を', '勉強します', '。'), 'Ngày nào tôi cũng học tiếng Nhật bằng máy tính.', [A6]),
        (s('ミラーさん', 'は', 'はし', DE, '食べません', '。', 'フォーク', 'で', '食べます', '。'), 'Anh Miller không ăn bằng đũa. Anh ấy ăn bằng nĩa.', [B4]),
        (s('私', 'は', 'きのう', 'カメラ', DE, '花', 'の', '写真', 'を', '撮りました', '。'), 'Hôm qua tôi đã chụp ảnh hoa bằng máy ảnh.', [A6, B4, E1]),
        (s('きのう', 'ファクス', DE, 'レポート', 'を', '会社', 'へ', '送りました', '。'), 'Hôm qua tôi đã gửi báo cáo đến công ty bằng fax.', [A5, A6, B4]),
        (s('私', 'は', '毎晩', 'パソコン', DE, '日本', 'の', '映画', 'を', '見ます', '。'), 'Tối nào tôi cũng xem phim Nhật bằng máy tính.', [A6, E1]),
        (s('カリナさん', 'は', '日本語', 'と', '英語', DE, 'レポート', 'を', '書きました', '。'), 'Chị Karina đã viết báo cáo bằng tiếng Nhật và tiếng Anh.', [A6, B4, E4]),
        (s(NANI, DE, 'その', '写真', 'を', '撮りました', 'か', '。'), 'Bạn đã chụp bức ảnh đó bằng gì?', [A6, B2, B4]),
        ans(['この', 'カメラ', DE, '撮りました', '。'], 'Tôi đã chụp bằng máy ảnh này.', [B2, B4], s(NANI, 'で', 'その', '写真', 'を', '撮りました', 'か', '。'), 'Bạn đã chụp bức ảnh đó bằng gì?'),
        (s('あした', '電車', 'で', '会社', 'へ', '行きます', '。', 'パソコン', DE, 'レポート', 'を', '書きます', '。'), 'Ngày mai tôi đi đến công ty bằng tàu điện. Tôi viết báo cáo bằng máy tính.', [A5, A6, C5]),
        (s('あした', 'いっしょに', 'はし', DE, '晩ごはん', 'を', '食べましょう', '。'), 'Ngày mai cùng ăn tối bằng đũa nhé.', [A6, E6]),
        (s('ワンさん', 'は', '毎朝', 'ラジオ', DE, '英語', 'を', '勉強します', '。'), 'Mỗi sáng anh Wang học tiếng Anh qua đài.', [A6]),
        (s('ミラーさん', 'は', 'スペイン語', DE, '手紙', 'を', '書きました', 'か', '。'), 'Anh Miller đã viết thư bằng tiếng Tây Ban Nha à?', [A6, B4, C1]),
    ],
    notes='Phương tiện đi lại cũng dùng で (bài 5: 電車で行きます). 何で đọc là なにで khi hỏi dụng cụ.')

# ---------------------------------------------------------------------------
# Từ được hỏi đứng trong 「」, ngoặc là mảnh riêng (mảnh có Kanji chỉ được chứa chữ đọc được)
def q(word, lang):
    return s('「', word.strip('「」'), '」', 'は', lang, DL, '何{なん}', 'です', 'か', '。')


def qw(word, lang):
    return s('「', word.strip('「」'), '」', 'は', lang, 'で', NAN_W, 'です', 'か', '。')


def qq(word, lang):
    return s('「', word.strip('「」'), '」', 'は', lang, 'で', '何{なん}', 'です', 'か', '。')


def reply(word, lang, ask, uses=None, tail=(), yo=False):
    """Câu đáp 「X」です(よ) cho câu hỏi 「ask」は lang で何ですか."""
    t = ''.join(x.split('{')[0] for x in tail)
    end = 'よ。' if yo else '。'
    body = ('「', word, '」', 'です', *(('よ',) if yo else ()), '。', *tail)
    return (s(*body), f'Là "{word}".' if not tail else None, [*(uses or []), *((F5,) if yo else ())],
            (qq(ask, lang), f'"{ask}" trong {LANG[lang]} là gì?',
             [f'はい、「{word}」です{end}{t}', f'「{word}」ですか。{t}', f'{lang}です{end}']))


LANG = {'英語': 'tiếng Anh', '日本語': 'tiếng Nhật', 'フランス語': 'tiếng Pháp', 'スペイン語': 'tiếng Tây Ban Nha', 'ドイツ語': 'tiếng Đức'}


def r(row, meaning):
    return (row[0], meaning, row[2], row[3])


p2 = point(7, 2, '「từ / câu」は ～語で 何ですか', '"…" trong tiếng ~ là gì?',
    'Dùng để hỏi một từ hay một câu nói bằng ngôn ngữ khác thế nào: 「ありがとう」は英語で何ですか '
    '("ありがとう" trong tiếng Anh là gì?). で ở đây là "bằng (ngôn ngữ)", giống で ở mẫu trước. '
    'Trả lời: 「Thank you」です. Từ được hỏi đặt trong ngoặc 「」.',
    [
        (q('「ありがとう」', '英語'), '"ありがとう" trong tiếng Anh là gì?', [A]),
        (qw('「すみません」', '英語'), '"すみません" trong tiếng Anh là gì?', [A]),
        (q('「はさみ」', '英語'), '"はさみ" trong tiếng Anh là gì?', [A]),
        (qw('「はし」', '英語'), '"はし" trong tiếng Anh là gì?', [A]),
        (q('「手紙」', '英語'), '"手紙" trong tiếng Anh là gì?', [A]),
        (qw('「花」', '英語'), '"花" trong tiếng Anh là gì?', [A]),
        (q('「本」', '英語'), '"本" trong tiếng Anh là gì?', [A]),
        (qw('「水」', '英語'), '"水" trong tiếng Anh là gì?', [A]),
        (q('「友達」', '英語'), '"友達" trong tiếng Anh là gì?', [A]),
        (qw('「先生」', '英語'), '"先生" trong tiếng Anh là gì?', [A]),
        r(reply('Thank you', '英語', 'ありがとう'), 'Là "Thank you".'),
        r(reply('Excuse me', '英語', 'すみません'), 'Là "Excuse me".'),
        r(reply('scissors', '英語', 'はさみ'), 'Là "scissors".'),
        r(reply('chopsticks', '英語', 'はし'), 'Là "chopsticks".'),
        r(reply('letter', '英語', '手紙'), 'Là "letter".'),
        (q('「book」', '日本語'), '"book" trong tiếng Nhật là gì?', [A]),
        r(reply('本', '日本語', 'book'), 'Là "本".'),
        (qw('「flower」', '日本語'), '"flower" trong tiếng Nhật là gì?', [A]),
        r(reply('花', '日本語', 'flower'), 'Là "花".'),
        (q('「water」', '日本語'), '"water" trong tiếng Nhật là gì?', [A]),
        (q('「ありがとう」', 'フランス語'), '"ありがとう" trong tiếng Pháp là gì?', [A]),
        r(reply('Merci', 'フランス語', 'ありがとう', yo=True), 'Là "Merci" đấy.'),
        (qw('「ありがとう」', 'スペイン語'), '"ありがとう" trong tiếng Tây Ban Nha là gì?', [A]),
        r(reply('Gracias', 'スペイン語', 'ありがとう', yo=True), 'Là "Gracias" đấy.'),
        (q('「ありがとう」', 'ドイツ語'), '"ありがとう" trong tiếng Đức là gì?', [A]),
        r(reply('Danke', 'ドイツ語', 'ありがとう', yo=True), 'Là "Danke" đấy.'),
        (q('「chopsticks」', '日本語'), '"chopsticks" trong tiếng Nhật là gì?', [A]),
        r(reply('はし', '日本語', 'chopsticks', [A], ('はし', 'で', 'ごはん', 'を', '食べます', '。')), 'Là "はし". Người ta ăn cơm bằng đũa.'),
        (s('ミラーさん', '、', '「', 'Christmas', '」', 'は', '日本語', DL, '何{なん}', 'です', 'か', '。'), 'Anh Miller ơi, "Christmas" trong tiếng Nhật là gì?', [A]),
        r(reply('クリスマス', '日本語', 'Christmas', yo=True), 'Là "クリスマス" đấy.'),
    ],
    notes='Hỏi bằng 何ですか (なんですか), không dùng どう. Từ trong ngoặc 「」 là từ được hỏi.')

# Câu cuối: đáp có よ (báo cho biết) và câu hỏi gọi tên ミラーさん
last = p2['sentences'][-1]
last['prompt']['pieces'] = p2['sentences'][-2]['pieces']
last['prompt']['meaning'] = 'Anh Miller ơi, "Christmas" trong tiếng Nhật là gì?'

# ---------------------------------------------------------------------------
p3 = point(7, 3, 'N (người) に あげます／貸します／教えます／送ります', 'Cho / tặng / cho mượn / dạy / gửi cho N',
    'に đứng sau người nhận khi hành động hướng từ mình (hoặc người khác) sang họ: ミラーさんに花をあげます '
    '(tặng hoa cho anh Miller), 友達に本を貸します (cho bạn mượn sách), ワンさんに日本語を教えます (dạy tiếng Nhật cho anh Wang). '
    'Mẫu đầy đủ: [người cho] は [người nhận] に [vật] を V. Hỏi người nhận bằng 誰に.',
    [
        (s('私', 'は', 'ミラーさん', NI, '花', 'を', 'あげます', '。'), 'Tôi tặng hoa cho anh Miller.', [A6]),
        (s('私', 'は', '友達', NI, 'プレゼント', 'を', 'あげます', '。'), 'Tôi tặng quà cho bạn.', [A6]),
        (s('私', 'は', 'カリナさん', NI, '本', 'を', '貸します', '。'), 'Tôi cho chị Karina mượn sách.', [A6]),
        (s('私', 'は', 'ワンさん', NI, '日本語', 'を', '教えます', '。'), 'Tôi dạy tiếng Nhật cho anh Wang.', [A6]),
        (s('私', 'は', '母', NI, '手紙', 'を', '送ります', '。'), 'Tôi gửi thư cho mẹ.', [A6]),
        (s('私', 'は', '父', NI, 'シャツ', 'を', 'あげます', '。'), 'Tôi tặng áo sơ mi cho bố.', [A6]),
        (s('サントスさん', 'は', 'イーさん', NI, '傘', 'を', '貸します', '。'), 'Anh Santos cho chị Lee mượn ô.', [A6]),
        (s('私', 'は', '友達', NI, 'お土産', 'を', 'あげます', '。'), 'Tôi tặng quà lưu niệm cho bạn.', [A6]),
        (s('先生', 'は', '学生', NI, '英語', 'を', '教えます', '。'), 'Giáo viên dạy tiếng Anh cho học sinh.', [A6]),
        (s('私', 'は', '母', NI, '花', 'を', '送ります', '。'), 'Tôi gửi hoa cho mẹ.', [A6]),
        (s('私', 'は', 'きのう', 'カリナさん', NI, 'チョコレート', 'を', 'あげました', '。'), 'Hôm qua tôi đã tặng sô-cô-la cho chị Karina.', [A6, B4]),
        (s('誰', NI, 'その', 'プレゼント', 'を', 'あげます', 'か', '。'), 'Bạn tặng món quà đó cho ai?', [A6, B2, C1]),
        ans(['ミラーさん', NI, 'あげます', '。'], 'Tôi tặng cho anh Miller.', [], s('誰', 'に', 'その', 'プレゼント', 'を', 'あげます', 'か', '。'), 'Bạn tặng món quà đó cho ai?'),
        (s('私', 'は', 'ワンさん', NI, 'お金', 'を', '貸しました', '。'), 'Tôi đã cho anh Wang mượn tiền.', [A6, B4]),
        (s('ミラーさん', 'は', '友達', NI, '日本語', 'の', '本', 'を', 'あげました', '。'), 'Anh Miller đã tặng bạn một cuốn sách tiếng Nhật.', [A6, B4, E1]),
        (s('誰', NI, '英語', 'を', '教えます', 'か', '。'), 'Bạn dạy tiếng Anh cho ai?', [A6, C1]),
        ans(['会社', 'の', '人', NI, '教えます', '。'], 'Tôi dạy cho người trong công ty.', [E1], s('誰', 'に', '英語', 'を', '教えます', 'か', '。'), 'Bạn dạy tiếng Anh cho ai?'),
        (s('私', 'は', '土曜日', 'に', 'イーさん', NI, '英語', 'を', '教えます', '。'), 'Thứ bảy tôi dạy tiếng Anh cho chị Lee.', [A6, C4]),
        (s('クリスマス', 'に', '家族', NI, 'プレゼント', 'を', '送ります', '。'), 'Vào lễ Giáng sinh tôi gửi quà cho gia đình.', [A6, C4]),
        (s('私', 'は', 'きのう', '父', NI, 'ファクス', 'を', '送りました', '。'), 'Hôm qua tôi đã gửi fax cho bố.', [A6, B4]),
        (s('私', 'は', '先週', 'デパート', 'で', 'ネクタイ', 'を', '買いました', '。', '父', NI, 'あげます', '。'), 'Tuần trước tôi đã mua cà vạt ở cửa hàng bách hóa. Tôi sẽ tặng bố.', [A6, B4, C6]),
        (s('ミラーさん', 'は', 'カリナさん', NI, 'ボールペン', 'と', 'ノート', 'を', '貸しました', '。'), 'Anh Miller đã cho chị Karina mượn bút bi và vở.', [A6, B4, E4]),
        (s('あした', 'ワンさん', NI, '花', 'を', 'あげませんか', '。'), 'Ngày mai mình tặng hoa cho anh Wang nhé?', [A6, D6]),
        (s('私', 'は', '毎晩', '8', '時', 'から', '9', '時', 'まで', '友達', NI, '日本語', 'を', '教えます', '。'), 'Tối nào tôi cũng dạy tiếng Nhật cho bạn từ 8 giờ đến 9 giờ.', [A6, D4]),
        (s('誰', NI, 'その', '写真', 'を', '送りました', 'か', '。'), 'Bạn đã gửi bức ảnh đó cho ai?', [A6, B2, B4]),
        ans(['家族', NI, '送りました', '。'], 'Tôi đã gửi cho gia đình.', [B4], s('誰', 'に', 'その', '写真', 'を', '送りました', 'か', '。'), 'Bạn đã gửi bức ảnh đó cho ai?'),
        (s('クリスマス', 'に', '母', NI, '花', 'を', '送りました', '。', '父', 'に', 'も', 'シャツ', 'を', '送りました', '。'), 'Vào lễ Giáng sinh tôi đã gửi hoa cho mẹ. Tôi cũng đã gửi áo sơ mi cho bố.', [A6, B4, C4, D1]),
        (s('きのう', 'カリナさん', 'は', 'ワンさん', NI, 'お土産', 'を', 'あげました', '。'), 'Hôm qua chị Karina đã tặng quà lưu niệm cho anh Wang.', [A6, B4]),
        (s('私', 'は', 'パソコン', 'で', '友達', NI, '写真', 'を', '送りました', '。'), 'Tôi đã gửi ảnh cho bạn bằng máy tính.', [A, A6, B4]),
        (s('あした', 'いっしょに', 'ミラーさん', NI, 'プレゼント', 'を', 'あげましょう', '。'), 'Ngày mai cùng tặng quà cho anh Miller nhé.', [A6, E6]),
    ],
    notes='あげます không dùng khi người khác cho chính mình (cách nói đó học ở bài sau).')

# ---------------------------------------------------------------------------
p4 = point(7, 4, 'N (người) に／から もらいます／借ります／習います', 'Nhận / mượn / học từ N',
    'Ngược với mẫu trước: người nhận làm chủ ngữ, người cho đi với に hoặc から: ミラーさんに花をもらいます '
    '(nhận hoa từ anh Miller), 友達に本を借ります (mượn sách của bạn), 先生に日本語を習います (học tiếng Nhật với thầy). '
    'Khi người cho là công ty, trường học… thì chỉ dùng から: 会社からお金をもらいます.',
    [
        (s('私', 'は', 'ミラーさん', NIF, '花', 'を', 'もらいます', '。'), 'Tôi nhận hoa từ anh Miller.', [A6]),
        (s('私', 'は', '友達', NIF, 'プレゼント', 'を', 'もらいました', '。'), 'Tôi đã nhận quà từ bạn.', [A6, B4]),
        (s('私', 'は', 'カリナさん', NIF, '本', 'を', '借ります', '。'), 'Tôi mượn sách của chị Karina.', [A6]),
        (s('私', 'は', 'ミラーさん', NIF, '英語', 'を', '習います', '。'), 'Tôi học tiếng Anh với anh Miller.', [A6]),
        (s('私', 'は', '先生', NIF, '日本語', 'を', '習います', '。'), 'Tôi học tiếng Nhật với giáo viên.', [A6]),
        (s('私', 'は', '父', NIF, 'お金', 'を', 'もらいます', '。'), 'Tôi nhận tiền từ bố.', [A6]),
        (s('イーさん', 'は', 'サントスさん', NIF, '傘', 'を', '借ります', '。'), 'Chị Lee mượn ô của anh Santos.', [A6]),
        (s('私', 'は', '母', NIF, 'シャツ', 'を', 'もらいました', '。'), 'Tôi đã nhận áo sơ mi từ mẹ.', [A6, B4]),
        (s('私', 'は', '図書館', 'で', '本', '[P]を', '借ります', '。'), 'Tôi mượn sách ở thư viện.', [C6]),
        (s('カリナさん', 'は', '友達', FROM, '手紙', 'を', 'もらいました', '。'), 'Chị Karina đã nhận thư từ bạn.', [A6, B4]),
        (s('誰', NIF, 'その', '時計', 'を', 'もらいました', 'か', '。'), 'Bạn đã nhận chiếc đồng hồ đó từ ai?', [A6, B2, B4]),
        ans(['父', NIF, 'もらいました', '。'], 'Tôi đã nhận từ bố.', [B4], s('誰', 'に', 'その', '時計', 'を', 'もらいました', 'か', '。'), 'Bạn đã nhận chiếc đồng hồ đó từ ai?'),
        (s('私', 'は', 'クリスマス', 'に', '家族', FROM, 'プレゼント', 'を', 'もらいました', '。'), 'Vào lễ Giáng sinh tôi đã nhận quà từ gia đình.', [A6, B4, C4]),
        (s('誰', NIF, '日本語', 'を', '習いました', 'か', '。'), 'Bạn đã học tiếng Nhật với ai?', [A6, B4]),
        ans(['カリナさん', NIF, '習いました', '。'], 'Tôi đã học với chị Karina.', [B4], s('誰', 'に', '日本語', 'を', '習いました', 'か', '。'), 'Bạn đã học tiếng Nhật với ai?'),
        (s('私', 'は', 'きのう', 'ワンさん', NIF, '傘', 'を', '借りました', '。'), 'Hôm qua tôi đã mượn ô của anh Wang.', [A6, B4]),
        (s('ミラーさん', 'は', '会社', FROM_ORG, 'お金', 'を', 'もらいます', '。'), 'Anh Miller nhận tiền từ công ty.', [A6]),
        (s('私', 'は', '土曜日', 'に', '先生', NIF, '日本語', 'を', '習います', '。'), 'Thứ bảy tôi học tiếng Nhật với giáo viên.', [A6, C4]),
        (s('誰', NIF, 'その', '本', 'を', '借りました', 'か', '。'), 'Bạn đã mượn cuốn sách đó của ai?', [A6, B2, B4]),
        ans(['イーさん', NIF, '借りました', '。'], 'Tôi đã mượn của chị Lee.', [B4], s('誰', 'に', 'その', '本', 'を', '借りました', 'か', '。'), 'Bạn đã mượn cuốn sách đó của ai?'),
        (s('私', 'は', '先週', 'ミラーさん', NIF, '英語', 'の', '辞書', 'を', '借りました', '。'), 'Tuần trước tôi đã mượn từ điển tiếng Anh của anh Miller.', [A6, B4, E1]),
        (s('きのう', '友達', NIF, '花', 'と', 'チョコレート', 'を', 'もらいました', '。'), 'Hôm qua tôi đã nhận hoa và sô-cô-la từ bạn.', [A6, B4, E4]),
        (s('カリナさん', 'は', '毎晩', '7', '時', 'から', '8', '時', 'まで', '先生', NIF, '日本語', 'を', '習います', '。'), 'Tối nào chị Karina cũng học tiếng Nhật với giáo viên từ 7 giờ đến 8 giờ.', [A6, D4]),
        (s('すてきですね', '。', '誰', NIF, 'もらいました', 'か', '。'), 'Đẹp quá nhỉ. Bạn đã nhận từ ai vậy?', [B4]),
        ans(['母', NIF, 'もらいました', '。'], 'Tôi đã nhận từ mẹ.', [B4], s('すてきですね', '。', '誰', 'に', 'もらいました', 'か', '。'), 'Đẹp quá nhỉ. Bạn đã nhận từ ai vậy?'),
        (s('ミラーさん', NIF, '英語', 'を', '習いました', '。', 'それから', 'カリナさん', 'に', '日本語', 'を', '教えました', '。'), 'Tôi đã học tiếng Anh với anh Miller. Sau đó tôi đã dạy tiếng Nhật cho chị Karina.', [A6, B4, C]),
        (s('私', 'は', 'イーさん', FROM, '韓国', 'の', 'お土産', 'を', 'もらいました', '。'), 'Tôi đã nhận quà lưu niệm Hàn Quốc từ chị Lee.', [A6, B4, E1]),
        (s('あした', '図書館', 'で', '本', 'を', '[F]借りましょう', '。'), 'Ngày mai cùng mượn sách ở thư viện nhé.', [A6, C6, E6]),
        (s('サントスさん', 'は', 'ブラジル', 'の', '家族', FROM, '荷物', 'を', 'もらいました', '。'), 'Anh Santos đã nhận hàng từ gia đình ở Brazil.', [A6, B4, E1]),
        (s('私', 'は', 'ワンさん', NIF, 'お金', 'を', '借りました', '。', 'それから', '銀行', 'へ', '行きました', '。'), 'Tôi đã mượn tiền của anh Wang. Sau đó tôi đã đi ngân hàng.', [A5, A6, B4]),
    ],
    notes='Người cho đi với に hoặc から; công ty, trường học chỉ dùng から. Không nói 先生を習います.')

# ---------------------------------------------------------------------------
def mq(*parts):
    return s('もう', *parts, 'か', '。')


Q = {
    1: (mq('昼ごはん', 'を', '食べました'), 'Bạn đã ăn trưa chưa?'),
    2: (mq('レポート', 'を', '書きました'), 'Bạn đã viết báo cáo chưa?'),
    3: (mq('荷物', 'を', '送りました'), 'Bạn đã gửi hàng chưa?'),
    4: (mq('宿題', 'を', 'しました'), 'Bạn đã làm bài tập chưa?'),
    5: (mq('新聞', 'を', '読みました'), 'Bạn đã đọc báo chưa?'),
    6: (mq('きっぷ', 'を', '買いました'), 'Bạn đã mua vé chưa?'),
    7: (s('ミラーさん', 'は', 'もう', 'うち', 'へ', '帰りました', 'か', '。'), 'Anh Miller đã về nhà chưa?'),
    8: (s('カリナさん', 'は', 'もう', '来ました', 'か', '。'), 'Chị Karina đã đến chưa?'),
    9: (mq('ミラーさん', 'に', 'お土産', 'を', 'あげました'), 'Bạn đã tặng quà lưu niệm cho anh Miller chưa?'),
    10: (mq('図書館', 'で', '本', 'を', '借りました'), 'Bạn đã mượn sách ở thư viện chưa?'),
    11: (s('もう', '9', '時', 'です', 'よ', '。', '宿題', 'は', 'もう', 'しました', 'か', '。'), 'Đã 9 giờ rồi đấy. Bài tập con đã làm chưa?'),
    12: (s('クリスマス', 'の', 'プレゼント', 'は', 'もう', '買いました', 'か', '。'), 'Bạn đã mua quà Giáng sinh chưa?'),
    13: (mq('お花見', 'を', 'しました'), 'Bạn đã đi ngắm hoa anh đào chưa?'),
}


def yes(n, verb, meaning, uses=(), tail=()):
    qs, qm = Q[n]
    t = ''.join(x.split('{')[0] for x in tail)
    return (s('はい', '、', MOU, verb, '。', *tail), meaning, [*uses],
            (qs, qm, [f'いいえ、もう{verb}。{t}', 'はい、まだです。', f'はい、もう{verb}か。']))


def no(n, neg, meaning, uses=(), tail=()):
    qs, qm = Q[n]
    t = ''.join(x.split('{')[0] for x in tail)
    return (s('いいえ', '、', MADA, 'です', '。', *tail), meaning, [*uses],
            (qs, qm, [f'いいえ、まだ{neg}。', 'はい、まだです。' + t, f'いいえ、もう{neg[:-6]}ました。']))


p5 = point(7, 5, 'もう V ました／まだです', 'Đã … rồi / Chưa',
    'もう V ましたか hỏi việc gì đó đã làm chưa: もう昼ごはんを食べましたか (bạn đã ăn trưa chưa?). '
    'Đã làm: はい、もう食べました. Chưa làm: いいえ、まだです (chưa). Không trả lời bằng ～ませんでした, '
    'vì ～ませんでした nghĩa là "đã không làm" (việc đã qua), còn まだです là "chưa, nhưng sẽ làm".',
    [
        (s('もう', '昼ごはん', '[P]を', '食べました', 'か', '。'), 'Bạn đã ăn trưa chưa?', [A6]),
        (s('もう', 'レポート', '[P]を', '書きました', 'か', '。'), 'Bạn đã viết báo cáo chưa?', [A6]),
        (s('もう', '荷物', '[P]を', '送りました', 'か', '。'), 'Bạn đã gửi hàng chưa?', [A6]),
        (s('もう', '宿題', '[P]を', 'しました', 'か', '。'), 'Bạn đã làm bài tập chưa?', [A6]),
        (s('もう', '新聞', '[P]を', '読みました', 'か', '。'), 'Bạn đã đọc báo chưa?', [A6]),
        (s('もう', 'きっぷ', '[P]を', '買いました', 'か', '。'), 'Bạn đã mua vé chưa?', [A6]),
        (s('もう', 'お土産', '[P]を', '買いました', 'か', '。'), 'Bạn đã mua quà lưu niệm chưa?', [A6]),
        (s('もう', '手紙', '[P]を', '書きました', 'か', '。'), 'Bạn đã viết thư chưa?', [A6]),
        (s('もう', '晩ごはん', '[P]を', '食べました', 'か', '。'), 'Bạn đã ăn tối chưa?', [A6]),
        (s('もう', 'その', '映画', '[P]を', '見ました', 'か', '。'), 'Bạn đã xem bộ phim đó chưa?', [A6, B2]),
        yes(1, '食べました', 'Vâng, tôi đã ăn rồi.'),
        no(2, '書きませんでした', 'Chưa, tôi chưa viết.'),
        yes(3, '送りました', 'Vâng, tôi đã gửi rồi.'),
        no(4, 'しませんでした', 'Chưa. Bây giờ tôi sẽ làm.', tail=('これから', 'します', '。')),
        yes(5, '読みました', 'Vâng, tôi đã đọc rồi.'),
        no(6, '買いませんでした', 'Chưa. Bây giờ tôi sẽ mua.', tail=('これから', '買います', '。')),
        (s('ミラーさん', 'は', 'もう', 'うち', '[P:を,の,で/に]へ', '帰りました', 'か', '。'), 'Anh Miller đã về nhà chưa?', [A5]),
        yes(7, '帰りました', 'Vâng, anh ấy đã về rồi.', [A5]),
        (s('カリナさん', 'は', MOU_Q, '来ました', 'か', '。'), 'Chị Karina đã đến chưa?', [B4]),
        no(8, '来ませんでした', 'Chưa. Chị ấy sắp đến bây giờ.', tail=('これから', '来ます', '。')),
        (s('もう', 'ミラーさん', NI, 'お土産', 'を', 'あげました', 'か', '。'), 'Bạn đã tặng quà lưu niệm cho anh Miller chưa?', [C]),
        no(9, 'あげませんでした', 'Chưa. Ngày mai tôi sẽ tặng.', [C], ('あした', 'あげます', '。')),
        (s('もう', '図書館', 'で', '本', '[P]を', '借りました', 'か', '。'), 'Bạn đã mượn sách ở thư viện chưa?', [C6, D]),
        yes(10, '借りました', 'Vâng, tôi đã mượn rồi.', [D]),
        (s('もう', '9', '時', 'です', 'よ', '。', '宿題', 'は', 'もう', 'しました', 'か', '。'), 'Đã 9 giờ rồi đấy. Bài tập con đã làm chưa?', [A6, F5]),
        no(11, 'しませんでした', 'Chưa ạ. Con làm ngay từ bây giờ.', [D4], ('今', 'から', 'します', '。')),
        (s('クリスマス', 'の', 'プレゼント', 'は', MOU_Q, '買いました', 'か', '。'), 'Bạn đã mua quà Giáng sinh chưa?', [A6, E1]),
        yes(12, '買いました', 'Vâng, tôi đã mua rồi. Tôi sẽ tặng bố cà vạt.', [C], ('父', 'に', 'ネクタイ', 'を', 'あげます', '。')),
        (s('もう', 'お花見', '[P]を', 'しました', 'か', '。'), 'Bạn đã đi ngắm hoa anh đào chưa?', [A6]),
        no(13, 'しませんでした', 'Chưa. Tuần sau tôi đi cùng bạn.', [D5], ('来週', '友達', 'と', 'します', '。')),
    ],
    notes='Trả lời "chưa" bằng いいえ、まだです; nói いいえ、まだ食べませんでした là sai.')

write(7, [p1, p2, p3, p4, p5])
