"""Ngữ pháp bài 48 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–48.
Chạy: python3 -I scripts/grammar-content/lesson_48.py  → data/grammar/lesson-48.json
Mỗi mẫu 40 câu (mức 1 = 1–13, mức 2 = 14–27, mức 3 = 28–40).
Thể sai khiến: nhiễu là dạng chia sai (行きさせます, 食べせます). Người bị sai khiến: với tha động từ dùng に
(nhiễu で／へ／の, không dùng が vì vẫn đúng ngữ pháp, khác nghĩa); với tự động từ dùng を (nhiễu で／へ／の, không dùng に:
息子に留学させます vẫn đúng, nghĩa "cho phép").
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(48)
F8 = 'g08-06'
D9 = 'g09-04'
B14 = 'g14-02'
A16 = 'g16-01'
C17 = 'g17-03'
A21, B21, C21 = 'g21-01', 'g21-02', 'g21-03'
A22 = 'g22-01'
A23 = 'g23-01'
A25, B25 = 'g25-01', 'g25-02'
A26, B26 = 'g26-01', 'g26-02'
B31 = 'g31-02'
A32 = 'g32-01'
D33 = 'g33-04'
C36 = 'g36-03'
C39 = 'g39-03'
A41 = 'g41-02'
A = 'g48-01'

NI = '[P:で,へ,の]に'
WO = '[P:で,へ,の]を'


def s(*parts):
    return '|'.join(parts)


def ans(parts, meaning, uses, q, qm, wrong):
    return (s(*parts), meaning, uses, (q, qm, wrong))


# ---------------------------------------------------------------------------
QA1 = s('お子さん', 'に', '何', 'か', '習わせて', 'いますか', '。')
QA2 = s('どうして', '息子さん', 'を', '留学させるんですか', '。')

p1 = point(48, 1, 'Thể sai khiến (行かせます, 食べさせます)', 'Bắt / cho phép ai làm…',
    'Thể sai khiến: người trên bắt hoặc cho phép người dưới làm gì. Nhóm I: う-hàng → あ-hàng + せます (行かせます, 習わせます); '
    'nhóm II: る → させます (食べさせます); する → させます, 来る → 来させます. '
    'Người bị sai khiến: tự động từ dùng を (息子を 留学させます); tha động từ dùng に (娘に 野菜を 食べさせます). '
    'Không dùng với người trên.',
    [
        (s('娘', NI, 'ピアノ', 'を', '[F]習わせます', '。'), 'Tôi cho con gái học piano.'),
        (s('息子', WO, 'アメリカ', 'へ', '[F]留学させます', '。'), 'Tôi cho con trai đi du học Mỹ.'),
        (s('子ども', NI, '野菜', 'を', '[F]食べさせます', '。'), 'Tôi bắt con ăn rau.'),
        (s('部長', 'は', 'ミラーさん', WO, '支店', 'へ', '[F]行かせました', '。'), 'Trưởng phòng đã cho anh Miller xuống chi nhánh.'),
        (s('先生', 'は', '生徒', NI, '作文', 'を', '[F]書かせました', '。'), 'Thầy bắt học sinh viết bài văn.'),
        (s('母', 'は', '私', NI, '部屋', 'を', '[F]掃除させました', '。'), 'Mẹ bắt tôi dọn phòng.'),
        (s('子ども', WO, '公園', 'で', '[F]遊ばせます', '。'), 'Tôi cho con chơi ở công viên.'),
        (s('息子', NI, '毎日', '本', 'を', '[F]読ませて', 'います', '。'), 'Ngày nào tôi cũng bắt con trai đọc sách.'),
        (s('部長', 'は', '私', NI, '資料', 'を', '[F]コピーさせました', '。'), 'Trưởng phòng bắt tôi photo tài liệu.'),
        (s('娘', WO, '早く', '[F]寝させました', '。'), 'Tôi cho con gái đi ngủ sớm.'),
        (s('子ども', NI, '薬', 'を', '[F]飲ませました', '。'), 'Tôi cho con uống thuốc.'),
        (s('先生', 'は', '生徒', WO, '[F]走らせました', '。'), 'Thầy bắt học sinh chạy.'),
        (s('子ども', NI, '好き', 'な', 'こと', 'を', '[F]させます', '。'), 'Tôi cho con làm điều nó thích.'),
        ans(['ええ', '、', 'ピアノ', 'を', '[F]習わせて', 'います', '。'], 'Vâng, tôi cho con học piano.', [], QA1, 'Anh/chị có cho con học gì không?',
            ['ええ、ピアノを習っていただいています。', 'はい、習います。', '*ええ、ピアノを習いさせています。']),
        ans(['いろいろ', 'な', '経験', 'を', '[F]させたい', 'んです', '。'], 'Vì tôi muốn cho con trải nghiệm nhiều điều.', [A26], QA2, 'Sao anh/chị cho con trai đi du học?',
            ['いろいろな経験をしたいんです。', 'はい、留学します。', '*いろいろな経験をしさせたいんです。']),
        (s('部長', 'は', '私', NI, '会議', 'の', '準備', 'を', '[F]させました', '。'), 'Trưởng phòng bắt tôi chuẩn bị cuộc họp.'),
        (s('母', 'は', '弟', NI, '洗濯物', 'を', '[F]運ばせました', '。'), 'Mẹ bắt em trai mang đồ giặt.'),
        (s('先生', 'は', '生徒', NI, '漢字', 'を', '[F]覚えさせました', '。'), 'Thầy bắt học sinh học thuộc chữ Hán.'),
        (s('子ども', WO, '一人', 'で', '買い物', 'に', '[F]行かせました', '。'), 'Tôi để con tự đi mua sắm một mình.'),
        (s('娘', NI, 'スピード', 'を', '[F]出させない', 'ように', 'して', 'います', '。'), 'Tôi cố gắng không để con gái chạy xe nhanh.', [C36]),
        (s('部長', 'は', '私', NI, '荷物', 'を', '[F]届けさせました', '。'), 'Trưởng phòng bắt tôi giao hàng.'),
        (s('ミラーさん', 'は', 'みんな', WO, '[F]笑わせました', '。'), 'Anh Miller làm mọi người cười.'),
        (s('子ども', WO, '[F]泣かせて', 'しまいました', '。'), 'Tôi lỡ làm con khóc.', ['g29-02']),
        (s('先生', 'は', '生徒', NI, '日本語', 'で', '[F]話させます', '。'), 'Thầy bắt học sinh nói bằng tiếng Nhật.'),
        (s('父', 'は', '私', NI, '車', 'を', '[F]運転させて', 'くれました', '。'), 'Bố đã cho tôi lái xe.', ['g24-04']),
        (s('犬', WO, '毎朝', '[F]散歩させます', '。'), 'Sáng nào tôi cũng dắt chó đi dạo.'),
        (s('娘', NI, '毎日', '日記', 'を', '[F]書かせて', 'います', '。'), 'Ngày nào tôi cũng bắt con gái viết nhật ký.'),
        (s('子ども', NI, 'いろいろ', 'な', '経験', 'を', '[F]させたい', 'と', '思います', '。'), 'Tôi muốn cho con trải nghiệm nhiều điều.', [A21]),
        (s('息子', WO, '[F]留学させる', 'ために', '、', '貯金して', 'います', '。'), 'Tôi đang tiết kiệm để cho con trai đi du học.', ['g42-01']),
        (s('子ども', NI, '野菜', 'を', '[F]食べさせる', 'の', 'は', '大変', 'です', '。'), 'Bắt con ăn rau thật vất vả.', ['g38-01']),
        (s('部長', 'は', '私', NI, '毎日', '残業', 'を', '[F]させる', 'ので', '、', '疲れて', 'います', '。'), 'Trưởng phòng bắt tôi làm thêm mỗi ngày nên tôi mệt.', [C39]),
        (s('娘', NI, 'ピアノ', 'を', '習わせよう', 'と', '思って', 'います', '。'), 'Tôi định cho con gái học piano.', [B31]),
        (s('子ども', WO, '公園', 'で', '[F]遊ばせて', 'いる', '間', '、', '本', 'を', '読みます', '。'), 'Trong lúc cho con chơi ở công viên, tôi đọc sách.', ['g14-03']),
        (s('先生', 'は', '生徒', NI, '作文', 'を', '[F]書かせて', 'から', '、', '説明させました', '。'), 'Thầy bắt học sinh viết văn rồi cho trình bày.', ['g16-03']),
        (s('心配', '[F]させて', 'すみません', '。'), 'Xin lỗi vì đã làm anh/chị lo lắng.', ['g16-01']),
        (s('長い', '間', '[F]待たせて', 'すみません', 'でした', '。'), 'Xin lỗi vì đã để anh/chị chờ lâu.', ['g16-01']),
        (s('ミラーさん', 'は', '子ども', NI, 'テレビ', 'を', '[F]見させない', 'と', '言っていました', '。'), 'Anh Miller nói không cho con xem tivi.', [D33]),
        (s('子ども', NI, '一人', 'で', '料理', 'を', '[F]させる', 'の', 'は', '危ない', 'かもしれません', '。'), 'Để con tự nấu ăn một mình có thể nguy hiểm.', ['g38-01', 'g32-03']),
        (s('息子', WO, '大学', 'へ', '[F]行かせる', 'の', 'に', 'お金', 'が', 'かかります', '。'), 'Cho con trai học đại học tốn tiền.', ['g42-02']),
        (s('部長', 'は', '私', NI, '会議', 'で', '[F]説明させて', 'くださいました', '。'), 'Trưởng phòng đã cho tôi trình bày trong cuộc họp.', [A41]),
    ],
    notes='Sai khiến: nhóm I あ-hàng + せます, nhóm II させます. Tự động từ: người bị sai khiến dùng を; tha động từ: に.')

# ---------------------------------------------------------------------------
QB1 = s('どう', 'した', 'んですか', '。')
QB2 = s('何', 'か', '用事', 'ですか', '。')
ITA = '[W:いただきました,やりませんか,*いただけりませんか]いただけませんか'

p2 = point(48, 2, 'V (sai khiến) て いただけませんか', 'Xin cho phép tôi…',
    'Thể sai khiến dạng て + いただけませんか: xin phép người trên một cách rất lịch sự để mình được làm gì: '
    '今日は 早く 帰らせて いただけませんか (Xin cho phép tôi về sớm hôm nay). '
    'Lịch sự hơn ～てもいいですか.',
    [
        (s('すみません', '、', 'ちょっと', '[F]休ませて', ITA, '。'), 'Xin lỗi, xin cho tôi nghỉ một chút được không ạ?'),
        (s('ここ', 'で', '写真', 'を', '[F]撮らせて', ITA, '。'), 'Xin cho phép tôi chụp ảnh ở đây được không ạ?'),
        (s('今日', 'は', '早く', '[F]帰らせて', ITA, '。'), 'Hôm nay xin cho tôi về sớm được không ạ?'),
        (s('この', '電話', 'を', '[F]使わせて', ITA, '。'), 'Xin cho tôi dùng điện thoại này được không ạ?'),
        (s('もう', '少し', '[F]考えさせて', ITA, '。'), 'Xin cho tôi suy nghĩ thêm một chút được không ạ?'),
        (s('あした', '[F]休ませて', ITA, '。'), 'Xin cho tôi nghỉ ngày mai được không ạ?'),
        (s('その', '話', 'を', '[F]聞かせて', ITA, '。'), 'Xin cho tôi nghe câu chuyện đó được không ạ?'),
        (s('私', 'に', '[F]説明させて', ITA, '。'), 'Xin để tôi giải thích được không ạ?'),
        (s('ここ', 'に', '車', 'を', '[F]止めさせて', ITA, '。'), 'Xin cho tôi đỗ xe ở đây được không ạ?'),
        (s('ちょっと', 'パソコン', 'を', '[F]使わせて', ITA, '。'), 'Xin cho tôi dùng máy tính một chút được không ạ?'),
        (s('一度', '[F]見させて', ITA, '。'), 'Xin cho tôi xem một lần được không ạ?'),
        (s('荷物', 'を', 'ここ', 'に', '[F]置かせて', ITA, '。'), 'Xin cho tôi để hành lý ở đây được không ạ?'),
        (s('私', 'に', 'も', '[F]手伝わせて', ITA, '。'), 'Xin để tôi cũng giúp một tay được không ạ?'),
        ans(['熱', 'が', 'ある', 'んです', '。', '今日', 'は', '早く', '[F]帰らせて', ITA, '。'], 'Tôi bị sốt. Hôm nay xin cho tôi về sớm được không ạ?', [A26], QB1, 'Bạn bị sao vậy?',
            ['熱があるんです。今日は早く帰っていただけませんか。', 'はい、帰ります。', '*熱があるんです。今日は早く帰りさせていただけませんか。']),
        ans(['すみません', '、', 'あした', '、', '会社', 'を', '[F]休ませて', ITA, '。'], 'Xin lỗi, mai xin cho tôi nghỉ làm được không ạ?', [], QB2, 'Có việc gì vậy?',
            ['すみません、あした、会社を休んでいただけませんか。', 'はい、用事です。', '*すみません、あした、会社を休みさせていただけませんか。']),
        (s('会議', 'で', '私', 'に', '[F]話させて', ITA, '。'), 'Xin cho tôi được phát biểu trong cuộc họp được không ạ?'),
        (s('その', '翻訳', 'を', '私', 'に', '[F]させて', ITA, '。'), 'Xin để tôi làm bản dịch đó được không ạ?'),
        (s('あした', 'の', '会議', 'に', '[F]出させて', ITA, '。'), 'Xin cho tôi dự cuộc họp ngày mai được không ạ?'),
        (s('その', '本', 'を', '[F]読ませて', ITA, '。'), 'Xin cho tôi đọc cuốn sách đó được không ạ?'),
        (s('娘', 'を', 'ここ', 'で', '少し', '[F]遊ばせて', ITA, '。'), 'Xin cho con gái tôi chơi ở đây một lát được không ạ?'),
        (s('来週', 'の', '月曜日', 'に', '[F]休ませて', ITA, '。'), 'Xin cho tôi nghỉ thứ hai tuần sau được không ạ?'),
        (s('あなた', 'の', '意見', 'を', '[F]聞かせて', ITA, '。'), 'Xin cho tôi nghe ý kiến của anh/chị được không ạ?'),
        (s('もう', '一度', '[F]やらせて', ITA, '。'), 'Xin cho tôi làm lại một lần nữa được không ạ?'),
        (s('この', '部屋', 'を', '[F]使わせて', ITA, '。'), 'Xin cho tôi dùng căn phòng này được không ạ?'),
        (s('私', 'に', '[F]案内させて', ITA, '。'), 'Xin để tôi dẫn đường được không ạ?'),
        (s('家族', 'に', '[F]電話させて', ITA, '。'), 'Xin cho tôi gọi điện cho gia đình được không ạ?'),
        (s('ちょっと', '[F]考えさせて', 'ください', '。'), 'Xin cho tôi suy nghĩ một chút.'),
        (s('子ども', 'が', '熱を出した', 'ので', '、', '今日', 'は', '早く', '[F]帰らせて', ITA, '。'), 'Con bị sốt nên hôm nay xin cho tôi về sớm được không ạ?', [C39]),
        (s('両親', 'が', '来る', 'ので', '、', 'あした', '[F]休ませて', ITA, '。'), 'Bố mẹ tôi sắp đến nên xin cho tôi nghỉ ngày mai được không ạ?', [C39]),
        (s('気分が悪い', 'んですが', '、', '少し', '[F]休ませて', ITA, '。'), 'Tôi thấy khó chịu, xin cho tôi nghỉ một chút được không ạ?', [A26]),
        (s('もし', 'よかったら', '、', '私', 'に', '[F]手伝わせて', ITA, '。'), 'Nếu được, xin để tôi giúp một tay được không ạ?', [A25]),
        (s('この', '絵', 'は', 'すばらしい', 'ので', '、', '写真', 'を', '[F]撮らせて', ITA, '。'), 'Bức tranh này tuyệt quá, xin cho tôi chụp ảnh được không ạ?', [C39]),
        (s('大切', 'な', '話', 'な', 'ので', '、', 'もう', '少し', '[F]考えさせて', ITA, '。'), 'Đây là chuyện quan trọng nên xin cho tôi suy nghĩ thêm được không ạ?', [C39]),
        (s('駅', 'まで', '歩く', 'と', '遠い', 'ので', '、', 'ここ', 'に', '自転車', 'を', '[F]置かせて', ITA, '。'), 'Đi bộ ra ga thì xa nên xin cho tôi để xe đạp ở đây được không ạ?', ['g23-02', C39]),
        (s('よく', 'わからなかった', 'ので', '、', 'もう', '一度', '[F]聞かせて', ITA, '。'), 'Tôi chưa hiểu rõ nên xin cho tôi nghe lại lần nữa được không ạ?', [C39]),
        (s('会議', 'が', '終わったら', '、', '[F]帰らせて', ITA, '。'), 'Họp xong xin cho tôi về được không ạ?', [B25]),
        (s('あした', 'は', '引越し', 'な', 'ので', '、', '会社', 'を', '[F]休ませて', ITA, '。'), 'Mai tôi chuyển nhà nên xin cho tôi nghỉ làm được không ạ?', [C39]),
        (s('時間', 'が', 'ない', 'ので', '、', '先に', '[F]帰らせて', ITA, '。'), 'Không có thời gian nên xin cho tôi về trước được không ạ?', [C39]),
        (s('この', '話', 'は', '大切', 'な', 'ので', '、', '部長', 'に', '[F]話させて', ITA, '。'), 'Chuyện này quan trọng nên xin cho tôi nói với trưởng phòng được không ạ?', [C39]),
        (s('息子', 'を', '留学させたい', 'ので', '、', 'いい', '学校', 'の', '情報', 'を', '[F]調べさせて', ITA, '。'), 'Tôi muốn cho con trai du học nên xin cho tôi tìm hiểu thông tin trường tốt được không ạ?', [A, C39]),
    ],
    notes='V (sai khiến) て いただけませんか: xin phép người trên rất lịch sự.')

# Chủ dự án duyệt bài 48 ngày 2026-11-13
for _p in (p1, p2):
    _p['approved'] = True
write(48, [p1, p2])
