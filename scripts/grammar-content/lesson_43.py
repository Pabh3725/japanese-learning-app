"""Ngữ pháp bài 43 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–43.
Chạy: python3 -I scripts/grammar-content/lesson_43.py  → data/grammar/lesson-43.json
Mỗi mẫu 40 câu (mức 1 = 1–13, mức 2 = 14–27, mức 3 = 28–40).
～そう (trông có vẻ): nhiễu là dạng chia sai; không dùng 降るそう, 高いそう, 元気だそう (nghe nói, bài 47 — cũng đúng).
Tính từ な + そう hỏi bằng [W]. ～てきます: chỗ きます là [W] (いきます, みます, おきます đúng ngữ pháp nhưng khác nghĩa).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(43)
F8 = 'g08-06'
D9 = 'g09-04'
B14 = 'g14-02'
A16, B16, C16 = 'g16-01', 'g16-02', 'g16-03'
A21, B21, C21 = 'g21-01', 'g21-02', 'g21-03'
A22 = 'g22-01'
A23 = 'g23-01'
A25, B25 = 'g25-01', 'g25-02'
A26, B26 = 'g26-01', 'g26-02'
B30 = 'g30-02'
B31 = 'g31-02'
A32, B32 = 'g32-01', 'g32-02'
D33 = 'g33-04'
C39 = 'g39-03'
C40 = 'g40-03'
A = 'g43-01'


def W(word, *wrong):
    return f"[W:{','.join(wrong)}]{word}"


def NA(word):
    """Tính từ な + そう: nhiễu dạng sai (なそう, にそう, さそう); không dùng だそう (nghe nói, cũng đúng)."""
    return W(word + 'そう', '*' + word + 'なそう', '*' + word + 'にそう', '*' + word + 'さそう')


KIMASU = W('きます', 'いきます', 'みます', 'おきます')
KIMASHITA = W('きました', 'いきました', 'みました', 'おきました')


def s(*parts):
    return '|'.join(parts)


def ans(parts, meaning, uses, q, qm, wrong):
    return (s(*parts), meaning, uses, (q, qm, wrong))


# ---------------------------------------------------------------------------
QA1 = s('この', 'ケーキ', '、', 'どうですか', '。')
QA2 = s('空', 'が', '暗い', 'です', 'ね', '。')

p1 = point(43, 1, '～そうです (trông có vẻ)', 'Trông có vẻ… / Sắp…',
    'Nói điều mình phỏng đoán khi nhìn thấy: tính từ い bỏ い + そう (おいしそう, いい → よさそう); tính từ な + そう (元気そう); '
    'động từ gốc ます + そう: sắp xảy ra (今にも 雨が 降りそうです = trời sắp mưa đến nơi). '
    'Bổ nghĩa danh từ: おいしそうな ケーキ; bổ nghĩa động từ: 楽しそうに 話します. '
    'Không dùng cho thứ nhìn là biết ngay (không nói きれいそうです về bông hoa trước mặt).',
    [
        (s('この', 'ケーキ', 'は', '[F]おいしそう', 'です', '。'), 'Cái bánh này trông ngon.'),
        (s('今にも', '雨', 'が', '[F]降りそう', 'です', '。'), 'Trời sắp mưa đến nơi.'),
        (s('ミラーさん', 'は', NA('元気'), 'です', '。'), 'Anh Miller trông khỏe khoắn.'),
        (s('この', 'かばん', 'は', '[F]重そう', 'です', '。'), 'Cái cặp này trông nặng.'),
        (s('ボタン', 'が', '[F]とれそう', 'です', '。'), 'Cái cúc sắp tuột ra.'),
        (s('ワンさん', 'は', '[F]忙しそう', 'です', '。'), 'Anh Wang trông bận rộn.'),
        (s('この', 'いす', 'は', '[F]壊れそう', 'です', '。'), 'Cái ghế này trông sắp hỏng.'),
        (s('外', 'は', '[F]寒そう', 'です', '。'), 'Bên ngoài trông có vẻ lạnh.'),
        (s('この', '靴', 'は', NA('丈夫'), 'です', '。'), 'Đôi giày này trông chắc chắn.'),
        (s('ひも', 'が', '[F]切れそう', 'です', '。'), 'Sợi dây sắp đứt.'),
        (s('この', '本', 'は', '[F]難しそう', 'です', '。'), 'Cuốn sách này trông khó.'),
        (s('子どもたち', 'は', '[F]楽しそう', 'です', '。'), 'Bọn trẻ trông có vẻ vui.'),
        (s('この', 'カメラ', 'は', '[F]よさそう', 'です', '。'), 'Cái máy ảnh này trông tốt.'),
        ans(['とても', '[F]おいしそう', 'です', 'ね', '。'], 'Trông ngon quá nhỉ.', [], QA1, 'Cái bánh này thế nào?',
            ['とてもおいしいそうですね。', 'はい、ケーキです。', '*とてもおいしくそうですね。']),
        ans(['ええ', '、', '今にも', '雨', 'が', '[F]降りそう', 'です', '。'], 'Vâng, trời sắp mưa đến nơi.', [], QA2, 'Trời tối sầm nhỉ.',
            ['ええ、今にも雨が降るそうです。', 'いいえ、今にも雨が降りそうです。', '*ええ、今にも雨が降りさそうです。']),
        (s('荷物', 'が', '[F]落ちそう', 'です', 'よ', '。'), 'Hành lý sắp rơi kìa.'),
        (s('ガソリン', 'が', '[F]なくなりそう', 'です', '。'), 'Xăng sắp hết rồi.'),
        (s('カリナさん', 'は', NA('幸せ'), 'です', '。'), 'Chị Karina trông hạnh phúc.'),
        (s('この', '料理', 'は', '[F]辛そう', 'です', '。'), 'Món này trông cay.'),
        (s('木', 'が', '[F]倒れそう', 'です', '。'), 'Cái cây sắp đổ.'),
        (s('今年', 'は', '会員', 'が', '[F]増えそう', 'です', '。'), 'Năm nay số hội viên có vẻ sẽ tăng.'),
        (s('この', 'セーター', 'は', '[F]高そう', 'です', '。'), 'Cái áo len này trông đắt.'),
        (s('物価', 'が', '[F]上がりそう', 'です', '。'), 'Vật giá có vẻ sắp tăng.'),
        (s('ワンさん', 'は', '[F]眠そう', 'です', '。'), 'Anh Wang trông buồn ngủ.'),
        (s('この', '映画', 'は', '[F]つまらなそう', 'です', '。'), 'Bộ phim này trông chán.'),
        (s('あの', '人', 'は', NA('親切'), 'です', '。'), 'Người kia trông tử tế.'),
        (s('会議', 'は', 'まだ', '[F]終わりそう', 'に', 'ありません', '。'), 'Cuộc họp có vẻ vẫn chưa xong được.'),
        (s('この', 'ケーキ', 'は', '[F]おいしそう', 'だ', 'から', '、', 'ひとつ', '買いましょう', '。'), 'Cái bánh này trông ngon nên mình mua một cái nhé.', [D9, 'g20-01']),
        (s('ミラーさん', 'は', '[F]忙しそう', 'な', 'ので', '、', 'あとで', '話します', '。'), 'Anh Miller trông bận nên lát nữa tôi sẽ nói chuyện.', [C39]),
        (s('雨', 'が', '[F]降りそう', 'だ', 'から', '、', '傘', 'を', '持って行った', 'ほう', 'が', 'いい', 'です', '。'), 'Trời có vẻ sắp mưa nên nên mang ô theo.', [D9, A32]),
        (s('[F]おいしそう', 'な', 'ケーキ', 'を', '買って', 'きました', '。'), 'Tôi đã mua về một cái bánh trông rất ngon.', ['g08-02']),
        (s('子どもたち', 'は', '[F]楽しそう', 'に', '遊んで', 'います', '。'), 'Bọn trẻ đang chơi có vẻ rất vui.', ['g14-03']),
        (s('この', 'いす', 'は', '[F]壊れそう', 'だ', 'から', '、', '座らないで', 'ください', '。'), 'Cái ghế này trông sắp hỏng nên đừng ngồi.', [D9, 'g17-02']),
        (s('ボタン', 'が', '[F]とれそう', 'だ', 'けど', '、', '直す', '時間', 'が', 'ない', '。'), 'Cúc sắp tuột nhưng không có thời gian sửa.', ['g20-02', 'g22-03']),
        (s('ワンさん', 'は', '[F]眠そう', 'でしょう', '？', 'きのう', '遅く', 'まで', '勉強した', 'んです', '。'), 'Anh Wang trông buồn ngủ phải không? Hôm qua anh ấy học đến khuya.', [C21, A26]),
        (s('ひも', 'が', '[F]切れそう', 'なら', '、', '新しい', 'ひも', 'に', '取り替えて', 'ください', '。'), 'Nếu dây sắp đứt thì hãy thay sợi mới.', ['g35-02']),
        (s('この', '料理', 'は', '[F]辛そう', 'だ', 'けど', '、', '食べて', 'みます', '。'), 'Món này trông cay nhưng tôi sẽ ăn thử.', ['g20-02', C40]),
        (s('ガソリン', 'が', '[F]なくなりそう', 'な', 'ので', '、', '駅', 'の', '近く', 'で', '止まりましょう', '。'), 'Xăng sắp hết nên mình dừng ở gần ga nhé.', [C39]),
        (s('ミラーさん', 'は', NA('元気'), 'でした', 'から', '、', '安心しました', '。'), 'Anh Miller trông khỏe nên tôi yên tâm.', [D9]),
        (s('今にも', '雨', 'が', '[F]降りそう', 'だ', 'と', '言っていました', '。'), 'Người ta nói trời sắp mưa đến nơi.', [D33]),
    ],
    notes='～そう: trông có vẻ / sắp. い-adj bỏ い (いい → よさそう); な-adj + そう; động từ gốc ます + そう.')

# ---------------------------------------------------------------------------
QB1 = s('どこ', 'へ', '行くんですか', '。')
QB2 = s('ミラーさん', 'は', 'いますか', '。')

p2 = point(43, 2, 'V て きます', 'Đi làm gì rồi quay lại',
    'Thể て + きます: đi đâu đó làm việc gì rồi quay về chỗ cũ: ちょっと たばこを 買って きます (Tôi đi mua thuốc lá rồi về). '
    'Quá khứ ～てきました: đã đi làm rồi về. Khác ～ていきます (làm rồi đi luôn).',
    [
        (s('ちょっと', 'たばこ', 'を', '[F]買って', KIMASU, '。'), 'Tôi đi mua thuốc lá một chút rồi về.'),
        (s('ちょっと', '銀行', 'へ', '[F]行って', KIMASU, '。'), 'Tôi ra ngân hàng một chút rồi về.'),
        (s('郵便局', 'で', '切手', 'を', '[F]買って', KIMASU, '。'), 'Tôi đi bưu điện mua tem rồi về.'),
        (s('図書館', 'で', '本', 'を', '[F]借りて', KIMASU, '。'), 'Tôi đi thư viện mượn sách rồi về.'),
        (s('ちょっと', '先生', 'に', '[F]聞いて', KIMASU, '。'), 'Tôi đi hỏi thầy một chút rồi quay lại.'),
        (s('スーパー', 'で', '卵', 'を', '[F]買って', KIMASU, '。'), 'Tôi đi siêu thị mua trứng rồi về.'),
        (s('ちょっと', '手', 'を', '[F]洗って', KIMASU, '。'), 'Tôi đi rửa tay một chút rồi quay lại.'),
        (s('会議室', 'から', 'いす', 'を', '[F]持って', KIMASU, '。'), 'Tôi đi lấy ghế từ phòng họp về.'),
        (s('ちょっと', 'シャワー', 'を', '[F]浴びて', KIMASU, '。'), 'Tôi đi tắm một chút rồi ra.'),
        (s('駅', 'まで', '友達', 'を', '[F]送って', KIMASU, '。'), 'Tôi đưa bạn ra ga rồi về.'),
        (s('きのう', '公園', 'で', '[F]遊んで', KIMASHITA, '。'), 'Hôm qua tôi đã đi chơi công viên về.'),
        (s('ちょっと', '資料', 'を', '[F]コピーして', KIMASU, '。'), 'Tôi đi photo tài liệu một chút rồi về.'),
        (s('ドライブ', 'に', '[F]行って', KIMASHITA, '。'), 'Tôi đã đi lái xe dạo rồi về.'),
        ans(['ちょっと', 'お金', 'を', '[F]出して', KIMASU, '。'], 'Tôi đi rút tiền một chút rồi về.', [], QB1, 'Bạn đi đâu thế?',
            ['ちょっとお金を出していきます。', 'はい、行きます。', '*ちょっとお金を出しりてきます。']),
        ans(['今', '、', '昼ごはん', 'を', '[F]食べて', 'くる', 'と', '言って', '出かけました', '。'], 'Anh ấy vừa nói đi ăn trưa rồi về, và đã ra ngoài.', [B21], QB2, 'Anh Miller có ở đây không?',
            ['今、昼ごはんを食べていくと言って出かけました。', 'はい、います。', '*今、昼ごはんを食べりてくると言って出かけました。']),
        (s('ちょっと', '電話', 'を', '[F]かけて', KIMASU, '。'), 'Tôi đi gọi điện một chút rồi quay lại.'),
        (s('受付', 'で', '会議室', 'の', 'かぎ', 'を', '[F]借りて', KIMASU, '。'), 'Tôi ra quầy lễ tân mượn chìa khóa phòng họp rồi về.'),
        (s('ちょっと', '部屋', 'を', '[F]見て', KIMASU, '。'), 'Tôi đi xem phòng một chút rồi quay lại.'),
        (s('冷房', 'を', '[F]消して', KIMASU, '。'), 'Tôi đi tắt máy lạnh rồi quay lại.'),
        (s('ばら', 'の', '花', 'を', '[F]買って', KIMASHITA, '。'), 'Tôi đã đi mua hoa hồng về.'),
        (s('ちょっと', '会社', 'に', '[F]戻って', KIMASU, '。'), 'Tôi quay lại công ty một chút rồi về.'),
        (s('ガソリン', 'を', '[F]入れて', KIMASU, '。'), 'Tôi đi đổ xăng rồi về.'),
        (s('昼休み', 'に', '、', '銀行', 'へ', '[F]行って', KIMASHITA, '。'), 'Buổi trưa tôi đã đi ngân hàng về.'),
        (s('ちょっと', '荷物', 'を', '[F]置いて', KIMASU, '。'), 'Tôi đi để hành lý một chút rồi quay lại.'),
        (s('暖房', 'を', '[F]つけて', KIMASU, '。'), 'Tôi đi bật lò sưởi rồi quay lại.'),
        (s('カリナさん', 'を', '[F]呼んで', KIMASU, '。'), 'Tôi đi gọi chị Karina rồi quay lại.'),
        (s('ちょっと', '水', 'を', '[F]飲んで', KIMASU, '。'), 'Tôi đi uống nước một chút rồi quay lại.'),
        (s('お金', 'が', '足りない', 'ので', '、', '銀行', 'で', '[F]出して', KIMASU, '。'), 'Không đủ tiền nên tôi đi ngân hàng rút rồi về.', [C39]),
        (s('会議', 'の', '前', 'に', '、', '資料', 'を', '[F]コピーして', KIMASU, '。'), 'Trước cuộc họp tôi đi photo tài liệu rồi về.', ['g18-04']),
        (s('雨', 'が', '降りそう', 'だ', 'から', '、', '傘', 'を', '[F]買って', KIMASU, '。'), 'Trời sắp mưa nên tôi đi mua ô rồi về.', [A, D9]),
        (s('ちょっと', 'たばこ', 'を', '[F]買って', 'きて', 'も', 'いいですか', '。'), 'Tôi đi mua thuốc lá một chút có được không?', ['g15-01']),
        (s('わからない', 'こと', 'は', '、', '先生', 'に', '[F]聞いて', 'きて', 'ください', '。'), 'Điều gì không hiểu thì hãy đi hỏi thầy rồi quay lại.', [A22, B14]),
        (s('図書館', 'で', '本', 'を', '[F]借りて', 'きた', 'けど', '、', 'まだ', '読んで', 'いない', '。'), 'Tôi đã đi mượn sách ở thư viện về nhưng vẫn chưa đọc.', ['g20-02', 'g31-05']),
        (s('ちょっと', '銀行', 'へ', '[F]行って', 'きたい', 'んですが', '。'), 'Tôi muốn đi ngân hàng một chút rồi về…', [A26]),
        (s('ミラーさん', 'は', '郵便局', 'へ', '[F]行って', 'くる', 'と', '言っていました', '。'), 'Anh Miller nói là đi bưu điện rồi về.', [D33]),
        (s('ガソリン', 'が', 'なくなりそう', 'だ', 'から', '、', '[F]入れて', KIMASU, '。'), 'Xăng sắp hết nên tôi đi đổ xăng rồi về.', [A, D9]),
        (s('会議室', 'から', 'いす', 'を', '[F]持って', 'きて', 'いただけませんか', '。'), 'Anh/chị đi lấy ghế từ phòng họp giúp tôi được không ạ?', [B26]),
        (s('きのう', 'は', '山', 'に', '[F]登って', 'きた', 'ので', '、', '疲れて', 'います', '。'), 'Hôm qua tôi đi leo núi về nên đang mệt.', [C39]),
        (s('ちょっと', '手', 'を', '[F]洗って', 'きます', 'から', '、', '待って', 'いて', 'ください', '。'), 'Tôi đi rửa tay một chút, hãy đợi tôi nhé.', [D9, B14]),
        (s('先生', 'に', '作文', 'を', '[F]見て', 'いただいて', 'きました', '。'), 'Tôi đã đi nhờ thầy xem bài văn rồi về.', ['g41-02']),
    ],
    notes='V て きます: đi làm việc gì rồi quay lại chỗ cũ.')

# Chủ dự án duyệt bài 43 ngày 2026-11-13
for _p in (p1, p2):
    _p['approved'] = True
write(43, [p1, p2])
