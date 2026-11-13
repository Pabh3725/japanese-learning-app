"""Ngữ pháp bài 41 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–41.
Chạy: python3 -I scripts/grammar-content/lesson_41.py  → data/grammar/lesson-41.json
Mỗi mẫu 40 câu (mức 1 = 1–13, mức 2 = 14–27, mức 3 = 28–40).
Chỗ いただきます／くださいます／やります là [W] (Chọn từ có hiện nghĩa): nhiễu là động từ cho–nhận còn lại.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(41)
F8 = 'g08-06'
D9 = 'g09-04'
B14 = 'g14-02'
A16 = 'g16-01'
B17 = 'g17-02'
D18 = 'g18-04'
B21, C21 = 'g21-02', 'g21-03'
A22, B22 = 'g22-01', 'g22-02'
A23 = 'g23-01'
B24, C24, D24 = 'g24-02', 'g24-03', 'g24-04'
A25, B25 = 'g25-01', 'g25-02'
A26, B26 = 'g26-01', 'g26-02'
B29 = 'g29-02'
B30 = 'g30-02'
B31, C31 = 'g31-02', 'g31-03'
A32, C32 = 'g32-01', 'g32-03'
D33 = 'g33-04'
C35 = 'g35-03'
C39 = 'g39-03'
A, B = 'g41-01', 'g41-02'


def W(word, *wrong):
    return f"[W:{','.join(wrong)}]{word}"


ITADA = W('いただきました', 'くださいました', 'やりました', '*いただきりました')
KUDA = W('くださいました', 'いただきました', 'やりました', '*くださりました')
YARI = W('やりました', 'くださいました', 'いただきました', '*やりりました')
YARU = W('やります', 'くださいます', 'いただきます', '*やりります')
KUDATTA = W('くださった', 'いただいた', 'やった', '*くださりった')
ITADAITA = W('いただいた', 'くださった', 'やった', '*いただきった')
NI = '[P:を,で,へ]に'
GA = '[P:を,で,へ]が'


def s(*parts):
    return '|'.join(parts)


def ans(parts, meaning, uses, q, qm, wrong):
    return (s(*parts), meaning, uses, (q, qm, wrong))


# ---------------------------------------------------------------------------
QA1 = s('すてき', 'な', 'ハンカチ', 'です', 'ね', '。')
QA2 = s('その', '絵本', 'は', 'どう', 'した', 'んですか', '。')

p1 = point(41, 1, 'いただきます／くださいます／やります', 'Nhận / cho (kính ngữ, với người dưới)',
    'Khi người cho là người trên (thầy, sếp…), dùng kính ngữ: 私は 先生に 辞書を いただきました (nhận, thay もらいました); '
    '先生が 私に 辞書を くださいました (cho tôi, thay くれました). '
    'Khi cho người dưới, con vật, cây cối: やります (thay あげました): 犬に えさを やります.',
    [
        (s('私', 'は', '先生', NI, '辞書', 'を', ITADA, '。'), 'Tôi đã nhận cuốn từ điển từ thầy.'),
        (s('先生', GA, '私', 'に', '辞書', 'を', KUDA, '。'), 'Thầy đã cho tôi cuốn từ điển.'),
        (s('犬', NI, 'えさ', 'を', YARU, '。'), 'Tôi cho chó ăn.'),
        (s('私', 'は', '部長', NI, 'お土産', 'を', ITADA, '。'), 'Tôi đã nhận quà của trưởng phòng.'),
        (s('社長', GA, '私', 'に', 'お祝い', 'を', KUDA, '。'), 'Giám đốc đã tặng quà mừng cho tôi.'),
        (s('花', NI, '水', 'を', YARU, '。'), 'Tôi tưới nước cho hoa.'),
        (s('私', 'は', '祖母', NI, 'お年玉', 'を', ITADA, '。'), 'Tôi đã nhận tiền mừng tuổi từ bà.'),
        (s('先生', GA, '息子', 'に', '絵本', 'を', KUDA, '。'), 'Thầy đã tặng con trai tôi cuốn truyện tranh.'),
        (s('猿', NI, 'えさ', 'を', YARI, '。'), 'Tôi đã cho khỉ ăn.'),
        (s('私', 'は', '課長', NI, 'ネクタイ', 'を', ITADA, '。'), 'Tôi đã nhận cà vạt từ trưởng ban.'),
        (s('部長', 'の', '奥さん', GA, 'お菓子', 'を', KUDA, '。'), 'Vợ trưởng phòng đã cho tôi bánh kẹo.'),
        (s('弟', NI, 'おもちゃ', 'を', YARI, '。'), 'Tôi đã cho em trai đồ chơi.'),
        (s('私', 'は', 'おじ', NI, '時計', 'を', ITADA, '。'), 'Tôi đã nhận đồng hồ từ chú.'),
        ans(['ええ', '、', '先生', GA, KUDA, '。'], 'Vâng, thầy tặng tôi đấy.', [], QA1, 'Khăn tay đẹp nhỉ.',
            ['ええ、先生にくださいました。', 'ええ、先生がいただきました。', 'いいえ、先生がくださいました。']),
        ans(['祖父', NI, ITADA, '。'], 'Tôi được ông tặng.', [], QA2, 'Cuốn truyện tranh đó từ đâu vậy?',
            ['祖父がいただきました。', 'はい、いただきました。', '祖父にやりました。']),
        (s('お見舞い', 'に', '行ったら', '、', '先生', GA, 'お茶', 'を', KUDA, '。'), 'Khi tôi đến thăm, thầy đã mời tôi trà.', [A25]),
        (s('私', 'は', '社長', NI, '本', 'を', ITADA, '。'), 'Tôi đã nhận sách từ giám đốc.'),
        (s('毎朝', '鳥', NI, 'えさ', 'を', YARU, '。'), 'Sáng nào tôi cũng cho chim ăn.'),
        (s('先生', GA, '娘', 'に', '絵はがき', 'を', KUDA, '。'), 'Thầy đã tặng con gái tôi tấm bưu ảnh.'),
        (s('私', 'は', 'おばさん', NI, '手袋', 'を', ITADA, '。'), 'Tôi đã nhận găng tay từ cô.'),
        (s('孫', NI, 'お年玉', 'を', YARI, '。'), 'Tôi đã cho cháu tiền mừng tuổi.'),
        (s('部長', GA, '結婚', 'の', 'お祝い', 'を', KUDA, '。'), 'Trưởng phòng đã tặng quà mừng cưới.'),
        (s('私', 'は', '先生', NI, '情報', 'を', ITADA, '。'), 'Tôi đã nhận được thông tin từ thầy.'),
        (s('猫', NI, '水', 'を', YARU, '。'), 'Tôi cho mèo uống nước.'),
        (s('社長', 'の', '奥さん', GA, '指輪', 'を', KUDA, '。'), 'Vợ giám đốc đã tặng tôi chiếc nhẫn.'),
        (s('私', 'は', '先生', NI, '靴下', 'を', ITADA, '。'), 'Tôi đã nhận đôi vớ từ thầy.'),
        (s('妹', NI, 'バッグ', 'を', YARI, '。'), 'Tôi đã cho em gái cái túi xách.'),
        (s('先生', GA, KUDATTA, '辞書', 'は', 'とても', '役に立って', 'います', '。') , 'Cuốn từ điển thầy cho tôi rất có ích.', [B22, 'g15-03']),
        (s('部長', NI, ITADAITA, 'お菓子', 'を', 'みんな', 'で', '食べました', '。'), 'Cả nhóm đã ăn bánh kẹo nhận từ trưởng phòng.', [A22]),
        (s('旅行', 'に', '行く', 'とき', 'は', '、', '花', NI, '水', 'を', YARU, 'ように', '頼みました', '。'), 'Khi đi du lịch tôi đã nhờ người tưới nước cho hoa.', [A23, 'g36-01']),
        (s('社長', GA, 'お祝い', 'を', KUDATTA, 'から', '、', '手紙', 'を', '書きました', '。'), 'Giám đốc tặng quà mừng nên tôi đã viết thư cho ông ấy.', [D9]),
        (s('先生', NI, ITADAITA, '本', 'を', 'なくして', 'しまいました', '。'), 'Tôi lỡ làm mất cuốn sách nhận từ thầy.', [A22, B29]),
        (s('毎日', '犬', NI, 'えさ', 'を', 'やらなければ', 'なりません', '。'), 'Ngày nào cũng phải cho chó ăn.', ['g17-03']),
        (s('祖母', NI, 'お年玉', 'を', ITADAITA, 'けど', '、', 'まだ', '使って', 'いません', '。'), 'Tôi đã nhận tiền mừng tuổi của bà nhưng vẫn chưa tiêu.', ['g20-02', 'g31-05']),
        (s('先生', GA, '息子', 'に', '絵本', 'を', KUDATTA, 'と', '言っていました', '。'), 'Người ta nói thầy đã tặng con trai tôi truyện tranh.', [D33]),
        (s('部長', NI, 'ネクタイ', 'を', ITADAITA, 'んです', '。'), 'Tôi được trưởng phòng tặng cà vạt đấy.', [A26]),
        (s('旅行', 'の', '間', '、', '犬', NI, 'えさ', 'を', 'やって', 'いただけませんか', '。'), 'Trong lúc tôi đi du lịch, anh/chị cho chó ăn giúp được không ạ?', [B26]),
        (s('先生', GA, KUDATTA, '情報', 'は', '役に立つ', 'でしょう', '。'), 'Thông tin thầy cho chắc sẽ có ích.', [B22, 'g32-02']),
        (s('花', NI, '水', 'を', 'やる', 'の', 'を', '忘れて', 'しまいました', '。'), 'Tôi lỡ quên tưới nước cho hoa.', ['g38-03', B29]),
        (s('社長', NI, ITADAITA, '時計', 'を', '大切', 'に', 'して', 'います', '。'), 'Tôi giữ gìn cẩn thận chiếc đồng hồ nhận từ giám đốc.', [A22]),
    ],
    notes='いただきます: nhận từ người trên. くださいます: người trên cho tôi. やります: cho người dưới, con vật, cây cối.')

# ---------------------------------------------------------------------------
QB1 = s('その', '文法', 'は', '誰', 'に', '教えて', 'もらいましたか', '。')
QB2 = s('駅', 'まで', 'どうやって', '来ましたか', '。')

p2 = point(41, 2, 'V て いただきます／くださいます／やります', 'Được (người trên) làm cho / làm cho (người dưới)',
    'Kính ngữ của ～てもらいます／～てくれます／～てあげます: 先生に 日本語を 教えて いただきました (tôi được thầy dạy); '
    '部長が 資料を 説明して くださいました (trưởng phòng giải thích cho tôi); 子どもに 本を 読んで やりました (tôi đọc cho con).',
    [
        (s('私', 'は', '先生', NI, '日本語', 'を', '[F]教えて', ITADA, '。'), 'Tôi được thầy dạy tiếng Nhật.'),
        (s('部長', GA, '資料', 'を', '[F]説明して', KUDA, '。'), 'Trưởng phòng đã giải thích tài liệu cho tôi.'),
        (s('子ども', 'に', '本', 'を', '[F]読んで', YARI, '。'), 'Tôi đã đọc sách cho con.'),
        (s('私', 'は', '社長', NI, '駅', 'まで', '[F]送って', ITADA, '。'), 'Tôi được giám đốc đưa ra ga.'),
        (s('先生', GA, '手紙', 'を', '[F]直して', KUDA, '。'), 'Thầy đã sửa thư cho tôi.'),
        (s('弟', 'の', '宿題', 'を', '[F]手伝って', YARI, '。'), 'Tôi đã giúp em trai làm bài tập.'),
        (s('私', 'は', '課長', NI, '会社', 'を', '[F]案内して', ITADA, '。'), 'Tôi được trưởng ban dẫn đi tham quan công ty.'),
        (s('先生', GA, '辞書', 'を', '[F]貸して', KUDA, '。'), 'Thầy đã cho tôi mượn từ điển.'),
        (s('娘', 'に', '絵本', 'を', '[F]買って', YARI, '。'), 'Tôi đã mua truyện tranh cho con gái.'),
        (s('私', 'は', '部長', NI, '日本', 'の', '会社', 'を', '[F]紹介して', ITADA, '。'), 'Tôi được trưởng phòng giới thiệu cho công ty Nhật.'),
        (s('おじさん', GA, '写真', 'を', '[F]撮って', KUDA, '。'), 'Chú đã chụp ảnh cho tôi.'),
        (s('犬', 'と', '[F]遊んで', YARI, '。'), 'Tôi đã chơi với con chó.'),
        (s('私', 'は', '先生', NI, '発音', 'を', '[F]直して', ITADA, '。'), 'Tôi được thầy sửa phát âm.'),
        ans(['先生', NI, '[F]教えて', ITADA, '。'], 'Tôi được thầy dạy.', [], QB1, 'Ngữ pháp đó bạn được ai dạy?',
            ['先生が教えていただきました。', 'はい、教えていただきました。', '*先生に教えりていただきました。']),
        ans(['部長', GA, '車', 'で', '[F]送って', KUDA, '。'], 'Trưởng phòng đã chở tôi bằng ô tô.', [], QB2, 'Bạn đến ga bằng cách nào?',
            ['部長に車で送ってくださいました。', 'はい、車で来ました。', '*部長が車で送りてくださいました。']),
        (s('私', 'は', '先生', NI, '作文', 'を', '[F]見て', ITADA, '。'), 'Tôi được thầy xem giúp bài văn.'),
        (s('社長', GA, 'パーティー', 'に', '[F]招待して', KUDA, '。'), 'Giám đốc đã mời tôi dự tiệc.'),
        (s('孫', 'に', '昔話', 'を', '[F]話して', YARI, '。'), 'Tôi đã kể chuyện cổ tích cho cháu.'),
        (s('私', 'は', 'おばさん', NI, '料理', 'を', '[F]教えて', ITADA, '。'), 'Tôi được cô dạy nấu ăn.'),
        (s('先生', GA, '大学', 'の', '情報', 'を', '[F]調べて', KUDA, '。'), 'Thầy đã tìm hiểu thông tin về trường đại học cho tôi.'),
        (s('子ども', 'を', '動物園', 'へ', '[F]連れて行って', YARI, '。'), 'Tôi đã dẫn con đi sở thú.'),
        (s('私', 'は', '部長', NI, '荷物', 'を', '[F]預かって', ITADA, '。'), 'Tôi được trưởng phòng giữ giùm hành lý.'),
        (s('課長', GA, 'ドライバー', 'を', '[F]貸して', KUDA, '。'), 'Trưởng ban đã cho tôi mượn tua-vít.'),
        (s('弟', 'の', '自転車', 'を', '[F]直して', YARI, '。'), 'Tôi đã sửa xe đạp cho em trai.'),
        (s('私', 'は', '祖父', NI, '昔', 'の', '話', 'を', '[F]して', ITADA, '。'), 'Tôi được ông kể chuyện ngày xưa.'),
        (s('先生', GA, '私', 'の', '発音', 'を', '[F]褒めて', KUDA, '。'), 'Thầy đã khen phát âm của tôi.'),
        (s('妹', 'に', 'ケーキ', 'を', '[F]作って', YARI, '。'), 'Tôi đã làm bánh cho em gái.'),
        (s('先生', NI, '[F]教えて', ITADAITA, '文法', 'を', '忘れて', 'しまいました', '。'), 'Tôi lỡ quên mất phần ngữ pháp được thầy dạy.', [A22, B29]),
        (s('部長', GA, '[F]説明して', KUDATTA, 'から', '、', 'よく', 'わかりました', '。'), 'Nhờ trưởng phòng giải thích nên tôi đã hiểu rõ.', [D9]),
        (s('子ども', 'に', '本', 'を', '[F]読んで', 'やったら', '、', 'すぐ', '寝ました', '。'), 'Đọc sách cho con thì con ngủ ngay.', [B25]),
        (s('先生', NI, '作文', 'を', '[F]見て', 'いただきたい', 'んですが', '。'), 'Em muốn được thầy xem giúp bài văn…', [A26]),
        (s('社長', GA, 'パーティー', 'に', '[F]招待して', KUDATTA, 'と', '言っていました', '。'), 'Người đó nói được giám đốc mời dự tiệc.', [D33]),
        (s('先生', NI, '駅', 'まで', '[F]送って', 'いただいて', '、', '助かりました', '。'), 'Được thầy đưa ra ga nên tôi đỡ quá.', ['g39-01']),
        (s('毎晩', '子ども', 'に', '本', 'を', '[F]読んで', W('やる', 'くださる', 'いただく', '*やりる'), 'ように', 'して', 'います', '。'), 'Tối nào tôi cũng cố gắng đọc sách cho con.', ['g36-03']),
        (s('おばさん', NI, '料理', 'を', '[F]教えて', ITADAITA, 'こと', 'が', 'あります', '。'), 'Tôi đã từng được cô dạy nấu ăn.', ['g19-02']),
        (s('先生', GA, '[F]直して', KUDATTA, '手紙', 'を', '出しました', '。'), 'Tôi đã gửi lá thư được thầy sửa giúp.', [A22]),
        (s('弟', 'の', '宿題', 'を', '[F]手伝って', 'やった', 'けど', '、', 'まだ', '終わって', 'いない', '。'), 'Tôi đã giúp em trai làm bài nhưng vẫn chưa xong.', ['g20-02']),
        (s('部長', NI, '資料', 'を', '[F]説明して', 'いただいたら', '、', 'すぐ', 'わかる', 'でしょう', '。'), 'Nếu được trưởng phòng giải thích tài liệu thì chắc sẽ hiểu ngay.', [A25, 'g32-02']),
        (s('先生', GA, '辞書', 'を', '[F]貸して', KUDATTA, 'ので', '、', '助かりました', '。'), 'Thầy cho mượn từ điển nên tôi đỡ quá.', [C39]),
        (s('子ども', 'に', '日本語', 'を', '[F]教えて', 'やりたい', 'と', '思って', 'います', '。'), 'Tôi muốn dạy tiếng Nhật cho con.', [B31]),
    ],
    notes='V て いただきます／くださいます: kính ngữ của ～てもらいます／～てくれます. V て やります: làm cho người dưới.')

# ---------------------------------------------------------------------------
QC1 = s('何', 'か', '手伝いましょうか', '。')
QC2 = s('すみません', '、', '部長', 'は', '今', 'いません', '。')
KM = W('くださいませんか', 'いただきませんか', 'やりませんか', '*くださりませんか')

p3 = point(41, 3, 'V て くださいませんか', 'Anh/chị làm ơn… được không ạ?',
    'Thể て + くださいませんか: nhờ rất lịch sự, mức độ giống ～ていただけませんか, lịch sự hơn ～てください: '
    'ちょっと 手伝って くださいませんか.',
    [
        (s('ちょっと', '[F]手伝って', KM, '。'), 'Anh/chị giúp tôi một chút được không ạ?'),
        (s('この', '漢字', 'の', '読み方', 'を', '[F]教えて', KM, '。'), 'Anh/chị chỉ tôi cách đọc chữ Hán này được không ạ?'),
        (s('もう', '少し', 'ゆっくり', '[F]話して', KM, '。'), 'Anh/chị nói chậm hơn một chút được không ạ?'),
        (s('写真', 'を', '[F]撮って', KM, '。'), 'Anh/chị chụp ảnh giúp tôi được không ạ?'),
        (s('この', '荷物', 'を', '[F]預かって', KM, '。'), 'Anh/chị giữ giùm hành lý này được không ạ?'),
        (s('駅', 'まで', 'の', '道', 'を', '[F]教えて', KM, '。'), 'Anh/chị chỉ đường ra ga giúp tôi được không ạ?'),
        (s('ここ', 'に', '名前', 'を', '[F]書いて', KM, '。'), 'Anh/chị viết tên vào đây được không ạ?'),
        (s('この', '言葉', 'の', '意味', 'を', '[F]説明して', KM, '。'), 'Anh/chị giải thích nghĩa từ này được không ạ?'),
        (s('辞書', 'を', '[F]貸して', KM, '。'), 'Anh/chị cho tôi mượn từ điển được không ạ?'),
        (s('窓', 'を', '[F]開けて', KM, '。'), 'Anh/chị mở cửa sổ giúp được không ạ?'),
        (s('ドライバー', 'を', '[F]貸して', KM, '。'), 'Anh/chị cho tôi mượn tua-vít được không ạ?'),
        (s('この', '靴', 'を', '[F]取り替えて', KM, '。'), 'Anh/chị đổi giúp tôi đôi giày này được không ạ?'),
        (s('もう', '一度', '[F]言って', KM, '。'), 'Anh/chị nói lại một lần nữa được không ạ?'),
        ans(['じゃ', '、', 'この', '荷物', 'を', '[F]持って', KM, '。'], 'Vậy anh/chị xách giúp hành lý này được không ạ?', [], QC1, 'Tôi giúp gì được không?',
            ['じゃ、この荷物を持っていただきませんか。', 'はい、手伝いましょう。', '*じゃ、この荷物を持ちてくださいませんか。']),
        ans(['じゃ', '、', 'これ', 'を', '部長', 'に', '[F]見せて', KM, '。'], 'Vậy anh/chị cho trưởng phòng xem cái này giúp được không ạ?', [], QC2, 'Xin lỗi, trưởng phòng hiện không có ở đây.',
            ['じゃ、これを部長に見せていただきませんか。', 'はい、いません。', '*じゃ、これを部長に見せりてくださいませんか。']),
        (s('この', '書類', 'に', 'はんこ', 'を', '[F]押して', KM, '。'), 'Anh/chị đóng dấu vào giấy tờ này giúp được không ạ?'),
        (s('会議', 'の', '資料', 'を', '[F]コピーして', KM, '。'), 'Anh/chị photo tài liệu cuộc họp giúp được không ạ?'),
        (s('子ども', 'を', '少し', '[F]預かって', KM, '。'), 'Anh/chị trông giúp con tôi một lát được không ạ?'),
        (s('パソコン', 'の', '使い方', 'を', '[F]教えて', KM, '。'), 'Anh/chị chỉ tôi cách dùng máy tính được không ạ?'),
        (s('この', '絵はがき', 'を', '[F]送って', KM, '。'), 'Anh/chị gửi giúp tấm bưu ảnh này được không ạ?'),
        (s('先生', '、', '作文', 'を', '[F]見て', KM, '。'), 'Thầy ơi, thầy xem giúp em bài văn được không ạ?'),
        (s('もう', '少し', '[F]待って', KM, '。'), 'Anh/chị đợi thêm một chút được không ạ?'),
        (s('この', 'サイズ', 'を', '[F]取り替えて', KM, '。'), 'Anh/chị đổi giúp tôi cỡ này được không ạ?'),
        (s('大きい', '声', 'で', '[F]読んで', KM, '。'), 'Anh/chị đọc to lên được không ạ?'),
        (s('駅', 'まで', '[F]送って', KM, '。'), 'Anh/chị đưa tôi ra ga được không ạ?'),
        (s('あした', '会社', 'に', '[F]来て', KM, '。'), 'Mai anh/chị đến công ty được không ạ?'),
        (s('文法', 'を', '[F]説明して', KM, '。'), 'Anh/chị giải thích ngữ pháp giúp được không ạ?'),
        (s('道', 'が', 'わからない', 'んですが', '、', '地図', 'を', '[F]見せて', KM, '。'), 'Tôi không biết đường, anh/chị cho tôi xem bản đồ được không ạ?', [A26]),
        (s('時間', 'が', 'あったら', '、', '引越し', 'を', '[F]手伝って', KM, '。'), 'Nếu có thời gian, anh/chị giúp tôi chuyển nhà được không ạ?', [A25]),
        (s('日本語', 'で', '手紙', 'を', '書いた', 'ので', '、', '[F]直して', KM, '。'), 'Tôi đã viết thư bằng tiếng Nhật, anh/chị sửa giúp được không ạ?', [C39]),
        (s('この', '漢字', 'は', '何', 'と', '読む', 'か', '、', '[F]教えて', KM, '。'), 'Anh/chị cho tôi biết chữ Hán này đọc là gì được không ạ?', ['g40-01']),
        (s('雨', 'が', '降って', 'いる', 'ので', '、', '傘', 'を', '[F]貸して', KM, '。'), 'Trời đang mưa, anh/chị cho tôi mượn ô được không ạ?', [C39]),
        (s('会議', 'が', '終わったら', '、', '資料', 'を', '[F]コピーして', KM, '。'), 'Họp xong anh/chị photo tài liệu giúp được không ạ?', [B25]),
        (s('わからない', '言葉', 'が', 'あれば', '、', '[F]説明して', KM, '。'), 'Nếu có từ tôi không hiểu, anh/chị giải thích giúp được không ạ?', ['g35-01']),
        (s('子ども', 'が', '寝て', 'いる', 'ので', '、', '静か', 'に', '[F]して', KM, '。'), 'Con đang ngủ, anh/chị giữ yên lặng giúp được không ạ?', [C39]),
        (s('ミラーさん', 'が', '来たら', '、', '会議室', 'へ', '[F]案内して', KM, '。'), 'Khi anh Miller đến, anh/chị đưa anh ấy vào phòng họp được không ạ?', [B25]),
        (s('サイズ', 'が', '合わない', 'ので', '、', '[F]取り替えて', KM, '。'), 'Cỡ không vừa, anh/chị đổi giúp được không ạ?', [C39]),
        (s('部長', 'が', '帰る', 'まで', '、', 'この', '荷物', 'を', '[F]預かって', KM, '。'), 'Anh/chị giữ giùm hành lý này cho đến khi trưởng phòng về được không ạ?', ['g04-04']),
        (s('発音', 'が', '正しい', 'かどうか', '、', '[F]聞いて', KM, '。'), 'Anh/chị nghe giúp xem phát âm có đúng không được không ạ?', ['g40-02']),
        (s('先生', 'に', '教えて', 'いただいた', '本', 'を', '、', '私', 'に', 'も', '[F]貸して', KM, '。'), 'Anh/chị cho tôi mượn cả cuốn sách được thầy giới thiệu được không ạ?', [B, A22]),
    ],
    notes='V て くださいませんか: nhờ rất lịch sự (ngang ～ていただけませんか).')

# Chủ dự án duyệt bài 41 ngày 2026-11-13
for _p in (p1, p2, p3):
    _p['approved'] = True
write(41, [p1, p2, p3])
