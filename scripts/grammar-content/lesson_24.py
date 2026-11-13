"""Ngữ pháp bài 24 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–24.
Chạy: python3 -I scripts/grammar-content/lesson_24.py  → data/grammar/lesson-24.json
Mỗi mẫu 40 câu (mức 1 = 1–13, mức 2 = 14–27, mức 3 = 28–40).
Chỗ hỏi あげます／もらいます／くれます là [W] (dạng Chọn từ có hiện nghĩa): nhiễu là động từ cho–nhận còn lại,
câu vẫn có thể đúng ngữ pháp nhưng sai nghĩa. Chỗ [P]/[F] (dùng cho Đúng/Sai, Tìm chỗ sai) chỉ dùng nhiễu sai chắc chắn.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(24)
F8 = 'g08-06'
D9 = 'g09-04'
B12 = 'g12-02'
B13 = 'g13-02'
B14, C14 = 'g14-02', 'g14-03'
A15, C15 = 'g15-01', 'g15-03'
B16 = 'g16-02'
B18, D18 = 'g18-02', 'g18-04'
C19 = 'g19-03'
B21, C21 = 'g21-02', 'g21-03'
A22, B22, C22 = 'g22-01', 'g22-02', 'g22-03'
A23, C23 = 'g23-01', 'g23-03'
A, B, C = 'g24-01', 'g24-02', 'g24-03'

KURE = '[W:あげました,もらいました,貸しました]くれました'
KURETA = '[W:あげた,もらった,貸した]くれた'
AGE = '[W:くれました,もらいました,*あげりました]あげました'
MORA = '[W:くれました,あげました,*もらりました]もらいました'
TEKURE = '[W:あげました,もらいました,*くれりました]くれました'
NI = '[P:へ,で,の]に'        # người làm giúp (～に V てもらいます); không dùng が, を, と (vẫn có câu đúng)
GA = '[P:で,へ,の]が'        # người làm giúp (～が V てくれます); không dùng を (友達を手伝ってくれました vẫn đúng)
WA = '[P:を,で,に]は'        # 私は ～て あげます


def s(*parts):
    return '|'.join(parts)


def ans(parts, meaning, uses, q, qm, wrong):
    return (s(*parts), meaning, uses, (q, qm, wrong))


# ---------------------------------------------------------------------------
QA1 = s('すてき', 'な', 'ネクタイ', 'です', 'ね', '。')
QA2 = s('その', 'かばん', 'は', '誰', 'が', 'くれましたか', '。')

p1 = point(24, 1, 'N1 は／が (私に) N2 を くれます', 'Ai đó cho / tặng tôi',
    'くれます: người khác cho TÔI (hoặc người trong nhà tôi). Người cho làm chủ ngữ, người nhận (私) dùng に và thường được lược bỏ: '
    '友達が (私に) 本を くれました. So sánh: あげます = tôi (hoặc người khác) cho người khác, không dùng khi người nhận là tôi '
    '(không nói 友達は私に本をあげました); もらいます = nhận, chủ ngữ là người nhận (私は友達に本をもらいました).',
    [
        (s('友達', 'が', '私', 'に', '本', 'を', KURE, '。'), 'Bạn tôi đã tặng tôi cuốn sách.'),
        (s('母', 'が', 'セーター', 'を', KURE, '。'), 'Mẹ đã cho tôi cái áo len.'),
        (s('カリナさん', 'が', '私', 'に', 'お菓子', 'を', KURE, '。'), 'Chị Karina đã cho tôi bánh kẹo.'),
        (s('ミラーさん', '[P:を,に,で]が', 'この', '辞書', 'を', 'くれました', '。'), 'Anh Miller đã cho tôi cuốn từ điển này.'),
        (s('父', 'が', '時計', '[P:へ,の,で]を', 'くれました', '。'), 'Bố đã cho tôi cái đồng hồ.'),
        (s('おばあさん', 'が', 'お弁当', 'を', KURE, '。'), 'Bà đã cho tôi hộp cơm.'),
        (s('ワンさん', 'が', '妹', 'に', 'お土産', 'を', KURE, '。'), 'Anh Wang đã tặng quà cho em gái tôi.'),
        (s('友達', 'が', '私', '[P:を,で,が]に', '花', 'を', 'くれました', '。'), 'Bạn đã tặng hoa cho tôi.'),
        (s('これ', 'は', 'おじいさん', 'が', KURETA, '時計', 'です', '。'), 'Đây là cái đồng hồ ông tặng tôi.', [B22]),
        (s('[W:何,どこ,いつ]誰', 'が', 'その', 'かばん', 'を', 'くれましたか', '。'), 'Ai đã cho bạn cái cặp đó?'),
        (s('先生', 'が', '私', 'に', '辞書', 'を', KURE, '。'), 'Thầy đã cho tôi cuốn từ điển.'),
        (s('子ども', 'が', '絵', 'を', KURE, '。'), 'Con tôi đã tặng tôi bức tranh.'),
        (s('サントスさん', 'が', '私', 'に', '写真', 'を', KURE, '。'), 'Anh Santos đã cho tôi bức ảnh.'),
        ans(['ええ', '、', '母', 'が', KURE, '。'], 'Vâng, mẹ tôi tặng đấy.', [], QA1, 'Cà vạt đẹp nhỉ.',
            ['ええ、母にくれました。', 'ええ、母があげました。', 'ええ、母をくれました。']),
        ans(['父', '[P:を,に,で]が', 'くれました', '。'], 'Bố tôi cho.', [], QA2, 'Ai đã cho bạn cái cặp đó?',
            ['父にくれました。', '父をくれました。', 'はい、父があげました。']),
        (s('私', 'は', '友達', 'に', '本', 'を', '[W:くれました,もらいました,借りました]あげました', '。'), 'Tôi đã tặng sách cho bạn.'),
        (s('隣', 'の', '人', 'が', 'りんご', 'を', KURE, '。'), 'Người hàng xóm đã cho tôi táo.'),
        (s('会社', 'の', '人', 'が', 'お菓子', 'を', 'たくさん', KURE, '。'), 'Người ở công ty đã cho tôi nhiều bánh kẹo.'),
        (s('誕生日', 'に', '友達', 'が', 'カード', 'を', KURE, '。'), 'Vào sinh nhật, bạn tôi đã tặng tôi thiệp.'),
        (s('母の日', 'に', '子ども', 'が', '花', 'を', KURE, '。'), 'Vào Ngày của Mẹ, con tôi đã tặng tôi hoa.'),
        (s('友達', 'が', '自分で', '作った', 'ケーキ', 'を', KURE, '。'), 'Bạn tôi đã cho tôi cái bánh tự làm.', [A22]),
        (s('ミラーさん', 'が', KURETA, '本', 'は', 'とても', 'おもしろい', 'です', '。'), 'Cuốn sách anh Miller tặng tôi rất hay.', [B22]),
        (s('カリナさん', 'は', 'いつも', 'お菓子', 'を', '[W:あげます,もらいます,貸します]くれます', '。'), 'Chị Karina lúc nào cũng cho tôi bánh kẹo.'),
        (s('先週', '、', '父', 'が', '新しい', 'カメラ', 'を', KURE, '。'), 'Tuần trước bố đã cho tôi máy ảnh mới.'),
        (s('おじいさん', 'が', 'お金', 'を', KURE, '。'), 'Ông đã cho tôi tiền.'),
        (s('友達', 'が', '弟', 'に', '本', 'を', KURE, '。'), 'Bạn tôi đã tặng sách cho em trai tôi.'),
        (s('私', 'は', 'ワンさん', 'に', '辞書', 'を', '[W:くれました,あげました,貸しました]もらいました', '。'), 'Tôi đã nhận cuốn từ điển từ anh Wang.'),
        (s('友達', 'が', KURETA, '本', 'は', '難しくて', '、', '全部', 'は', '読みませんでした', '。'), 'Cuốn sách bạn tặng khó quá nên tôi không đọc hết.', [B22, B16]),
        (s('誕生日', 'に', '母', 'が', KURETA, 'セーター', 'は', '大きくて', '、', '着る', 'こと', 'が', 'できません', '。'), 'Cái áo len mẹ tặng hôm sinh nhật to quá, tôi không mặc được.', [B22, B16, B18]),
        (s('ミラーさん', 'が', KURETA, 'お菓子', 'を', '家族', 'と', '食べました', '。'), 'Tôi đã ăn bánh kẹo anh Miller cho cùng gia đình.', [B22]),
        (s('先生', 'が', KURETA, '辞書', 'は', 'とても', '役に立って', 'います', '。'), 'Cuốn từ điển thầy cho tôi rất có ích.', [B22, C15]),
        (s('ワンさん', 'は', '私', 'に', 'お土産', 'を', KURE, 'が', '、', '私', 'は', '何', 'も', 'あげませんでした', '。'), 'Anh Wang đã tặng quà cho tôi, nhưng tôi chẳng tặng gì.', [F8, 'g05-02']),
        (s('これ', 'は', '日本', 'へ', '来る', 'とき', '、', '父', 'が', KURETA, '時計', 'です', '。'), 'Đây là cái đồng hồ bố tặng tôi khi tôi sắp sang Nhật.', [A23, B22]),
        (s('母', 'が', KURETA, 'お金', 'で', '辞書', 'を', '買いました', '。'), 'Tôi đã mua từ điển bằng tiền mẹ cho.', [B22, 'g07-01']),
        (s('友達', 'が', KURETA, '花', 'は', 'とても', 'きれい', 'でしょう', '？'), 'Hoa bạn tặng tôi đẹp lắm phải không?', [B22, C21]),
        (s('子ども', 'の', 'とき', '、', 'おばあさん', 'が', 'よく', 'お菓子', 'を', KURE, '。'), 'Hồi nhỏ bà hay cho tôi bánh kẹo.', [A23]),
        (s('会社', 'の', '人', 'が', KURETA, 'お弁当', 'は', 'おいしかった', 'です', 'が', '、', '少し', '多かった', 'です', '。'), 'Cơm hộp người ở công ty cho tôi ngon nhưng hơi nhiều.', [B22, F8]),
        (s('誕生日', 'に', '友達', 'が', KURETA, 'カード', 'を', 'まだ', '持って', 'います', '。'), 'Tôi vẫn còn giữ tấm thiệp bạn tặng hôm sinh nhật.', [B22, C15]),
        (s('父', 'が', KURETA, 'カメラ', 'で', '写真', 'を', '撮る', 'こと', 'が', '好き', 'です', '。'), 'Tôi thích chụp ảnh bằng chiếc máy ảnh bố cho.', [B22, 'g18-01']),
        (s('隣', 'の', '人', 'が', 'りんご', 'を', 'たくさん', KURETA, 'から', '、', 'ケーキ', 'を', '作りました', '。'), 'Hàng xóm cho nhiều táo nên tôi đã làm bánh.', [D9, 'g20-01']),
    ],
    notes='くれます: người khác cho tôi. Không dùng あげます khi người nhận là tôi.')

# ---------------------------------------------------------------------------
QB1 = s('ワンさん', 'に', '何', 'を', 'して', 'あげましたか', '。')
QB2 = s('カリナさん', 'の', '誕生日', 'に', '何', 'を', 'しましたか', '。')

p2 = point(24, 2, 'V て あげます', 'Làm gì đó cho người khác',
    'Thể て + あげます: tôi (hoặc ai đó) làm việc gì đó vì người khác, mang ý "làm giúp, làm cho". '
    'Người được giúp dùng như với động từ gốc: ワンさんに 本を 貸して あげました; 荷物を 持って あげました (おばあさんの荷物を). '
    'Lưu ý: nói thẳng ～て あげます với người trên có thể nghe như kể ơn; khi đề nghị giúp người trên nên dùng ～ましょうか (持ちましょうか).',
    [
        (s('私', 'は', 'ワンさん', 'に', '本', 'を', '[F]貸して', AGE, '。'), 'Tôi đã cho anh Wang mượn sách.'),
        (s('私', 'は', 'カリナさん', 'に', '写真', 'を', '撮って', AGE, '。'), 'Tôi đã chụp ảnh giúp chị Karina.'),
        (s('私', 'は', '妹', 'に', 'ケーキ', 'を', '[F]作って', AGE, '。'), 'Tôi đã làm bánh cho em gái.'),
        (s('私', 'は', '友達', 'に', '日本語', 'を', '教えて', AGE, '。'), 'Tôi đã dạy tiếng Nhật cho bạn.'),
        (s('私', 'は', 'おばあさん', 'の', '荷物', 'を', '[F]持って', AGE, '。'), 'Tôi đã xách đồ giúp bà cụ.'),
        (s('私', 'は', '子ども', 'に', '本', 'を', '[F]読んで', AGE, '。'), 'Tôi đã đọc sách cho con nghe.'),
        (s('私', 'は', 'ミラーさん', 'に', '駅', 'まで', 'の', '道', 'を', '教えて', AGE, '。'), 'Tôi đã chỉ đường đến ga cho anh Miller.'),
        (s('私', 'は', 'イーさん', 'に', '町', 'を', '[F]案内して', AGE, '。'), 'Tôi đã dẫn chị Lee đi tham quan thị trấn.'),
        (s('私', 'は', '友達', 'に', '傘', 'を', '貸して', AGE, '。'), 'Tôi đã cho bạn mượn ô.'),
        (s('私', 'は', 'ワンさん', 'を', '駅', 'まで', '[F]送って', AGE, '。'), 'Tôi đã đưa anh Wang ra ga.'),
        (s('私', 'は', 'サントスさん', 'に', 'コーヒー', 'を', '[F]いれて', AGE, '。'), 'Tôi đã pha cà phê cho anh Santos.'),
        (s('私', 'は', 'テレサちゃん', 'と', '[F]遊んで', AGE, '。'), 'Tôi đã chơi với bé Teresa.'),
        (s('私', WA, '友達', 'の', '引越し', 'を', '手伝って', 'あげました', '。'), 'Tôi đã giúp bạn chuyển nhà.'),
        ans(['漢字', 'を', '教えて', AGE, '。'], 'Tôi đã dạy chữ Hán cho anh ấy.', [], QB1, 'Bạn đã làm gì giúp anh Wang?',
            ['漢字を教えてくれました。', '漢字を教えてもらいましたか。', '*漢字を教えりてあげました。']),
        ans(['ケーキ', 'を', '作って', AGE, '。'], 'Tôi đã làm bánh tặng chị ấy.', [], QB2, 'Sinh nhật chị Karina bạn đã làm gì?',
            ['ケーキを作ってくれました。', 'ケーキを作ってもらいましたか。', '*ケーキを作るてあげました。']),
        (s('私', 'は', '弟', 'に', '自転車', 'を', '[F]直して', AGE, '。'), 'Tôi đã sửa xe đạp cho em trai.'),
        (s('私', 'は', '母', 'に', '料理', 'を', '[F]作って', AGE, '。'), 'Tôi đã nấu ăn cho mẹ.'),
        (s('私', 'は', 'イーさん', 'に', '日本', 'の', '料理', 'を', '[F]紹介して', AGE, '。'), 'Tôi đã giới thiệu món ăn Nhật cho chị Lee.'),
        (s('私', 'は', 'カリナさん', 'に', 'この', '言葉', 'の', '意味', 'を', '[F]説明して', AGE, '。'), 'Tôi đã giải thích nghĩa của từ này cho chị Karina.'),
        (s('私', 'は', '子ども', 'を', '公園', 'へ', '[F]連れて行って', AGE, '。'), 'Tôi đã dẫn con đi công viên.'),
        (s('私', 'は', 'おじいさん', 'に', '新聞', 'を', '[F]読んで', AGE, '。'), 'Tôi đã đọc báo cho ông nghe.'),
        (s('私', 'は', 'ミラーさん', 'に', '地図', 'を', '[F]見せて', AGE, '。'), 'Tôi đã cho anh Miller xem bản đồ.'),
        (s('私', 'は', '妹', 'の', '宿題', 'を', '[F]手伝って', AGE, '。'), 'Tôi đã giúp em gái làm bài tập.'),
        (s('私', 'は', '友達', 'の', '部屋', 'を', '[F]掃除して', AGE, '。'), 'Tôi đã dọn phòng giúp bạn.'),
        (s('私', 'は', 'ワンさん', 'に', 'いい', '店', 'を', '[F]教えて', AGE, '。'), 'Tôi đã chỉ cho anh Wang một cửa hàng tốt.'),
        (s('私', 'は', '隣', 'の', '人', 'に', '写真', 'を', '[F]撮って', AGE, '。'), 'Tôi đã chụp ảnh giúp người bên cạnh.'),
        (s('私', 'は', '毎朝', '子ども', 'を', '学校', 'まで', '[F]送って', '[W:くれます,もらいます,*あげります]あげます', '。'), 'Sáng nào tôi cũng đưa con đến trường.'),
        (s('ワンさん', 'は', '日本語', 'が', 'わからない', 'から', '、', '私', 'が', '[F]説明して', AGE, '。'), 'Anh Wang không hiểu tiếng Nhật nên tôi đã giải thích cho anh ấy.', [D9]),
        (s('友達', 'が', '引越し', 'を', 'する', 'とき', '、', '[F]手伝って', AGE, '。'), 'Khi bạn chuyển nhà, tôi đã giúp bạn.', [A23]),
        (s('子ども', 'が', '寝る', '前', 'に', '、', '本', 'を', '[F]読んで', AGE, '。'), 'Trước khi con ngủ, tôi đã đọc sách cho con.', [D18]),
        (s('カリナさん', 'は', '日本語', 'の', '本', 'を', '読みたい', 'と', '言った', 'から', '、', '私', 'の', '本', 'を', '貸して', AGE, '。'), 'Chị Karina nói muốn đọc sách tiếng Nhật nên tôi đã cho mượn sách của tôi.', [B21, D9]),
        (s('イーさん', 'が', '日本', 'へ', '来た', 'とき', '、', '私', 'が', '町', 'を', '[F]案内して', AGE, '。'), 'Khi chị Lee đến Nhật, tôi đã dẫn chị ấy đi tham quan thị trấn.', [A23]),
        (s('友達', 'の', '誕生日', 'に', 'ケーキ', 'を', '作って', AGE, 'が', '、', 'あまり', 'おいしくなかった', 'です', '。'), 'Sinh nhật bạn tôi làm bánh tặng, nhưng bánh không ngon lắm.', [F8, B12]),
        (s('道', 'が', 'わからない', '人', 'に', '、', '駅', 'まで', 'の', '道', 'を', '[F]教えて', AGE, '。'), 'Tôi đã chỉ đường ra ga cho người không biết đường.', [A22]),
        (s('ミラーさん', 'は', 'カメラ', 'を', '持って', 'いない', 'から', '、', '私', 'の', 'カメラ', 'を', '[F]貸して', 'あげる', 'と', '言いました', '。'), 'Anh Miller không có máy ảnh nên tôi đã nói sẽ cho anh ấy mượn máy của tôi.', [D9, B21]),
        (s('妹', 'が', '宿題', 'が', 'わからない', 'と', '言った', 'から', '、', '[F]手伝って', AGE, '。'), 'Em gái nói không hiểu bài tập nên tôi đã giúp.', [B21, D9]),
        (s('日曜日', 'は', '子ども', 'と', '[F]遊んで', 'あげたり', '、', '本', 'を', '読んで', 'あげたり', 'します', '。'), 'Chủ nhật tôi chơi với con, đọc sách cho con…', [C19]),
        (s('おばあさん', 'が', '重い', '荷物', 'を', '持って', 'いた', 'から', '、', '[F]持って', AGE, '。'), 'Bà cụ đang xách đồ nặng nên tôi đã xách giúp.', [C14, D9]),
        (s('友達', 'が', '病気', 'の', 'とき', '、', '料理', 'を', '[F]作って', AGE, '。'), 'Khi bạn bị ốm, tôi đã nấu ăn cho bạn.', [A23]),
        (s('ワンさん', 'に', '日本語', 'を', '教えて', '[W:くれる,もらう,*あげりる]あげる', '約束', 'を', 'しました', '。'), 'Tôi đã hứa sẽ dạy tiếng Nhật cho anh Wang.', [C22]),
    ],
    notes='V て あげます: làm cho người khác. Với người trên, đề nghị giúp bằng ～ましょうか, không dùng ～てあげます.')

# ---------------------------------------------------------------------------
QC1 = s('きれい', 'な', '写真', 'です', 'ね', '。')
QC2 = s('誰', 'に', '日本語', 'を', '教えて', 'もらいましたか', '。')

p3 = point(24, 3, 'V て もらいます', 'Được ai đó làm giúp',
    'Thể て + もらいます: tôi được người khác làm giúp việc gì (và thấy biết ơn). Chủ ngữ là người được giúp (私は, thường lược), '
    'người làm giúp dùng に: 私は 友達に 引越しを 手伝って もらいました (Tôi được bạn giúp chuyển nhà). '
    'Cùng một việc có thể nói bằng ～てくれます với người làm giúp làm chủ ngữ: 友達が 手伝って くれました.',
    [
        (s('私', 'は', 'ワンさん', NI, '本', 'を', '[F]貸して', MORA, '。'), 'Tôi đã được anh Wang cho mượn sách.'),
        (s('私', 'は', 'カリナさん', NI, '写真', 'を', '撮って', MORA, '。'), 'Tôi đã được chị Karina chụp ảnh cho.'),
        (s('私', 'は', '友達', NI, '引越し', 'を', '[F]手伝って', MORA, '。'), 'Tôi đã được bạn giúp chuyển nhà.'),
        (s('私', 'は', 'ミラーさん', NI, '英語', 'を', '[F]教えて', MORA, '。'), 'Tôi đã được anh Miller dạy tiếng Anh.'),
        (s('私', 'は', '母', NI, 'セーター', 'を', '[F]送って', MORA, '。'), 'Tôi đã được mẹ gửi cho áo len.'),
        (s('私', 'は', 'イーさん', NI, '町', 'を', '[F]案内して', MORA, '。'), 'Tôi đã được chị Lee dẫn đi tham quan thị trấn.'),
        (s('私', 'は', '友達', NI, '駅', 'まで', '[F]連れて行って', MORA, '。'), 'Tôi đã được bạn dẫn ra ga.'),
        (s('私', 'は', '父', NI, '自転車', 'を', '[F]直して', MORA, '。'), 'Tôi đã được bố sửa xe đạp cho.'),
        (s('私', 'は', 'サントスさん', NI, 'おいしい', '店', 'を', '[F]教えて', MORA, '。'), 'Tôi đã được anh Santos chỉ cho một quán ngon.'),
        (s('私', 'は', '部長', NI, '資料', 'を', '[F]説明して', MORA, '。'), 'Tôi đã được trưởng phòng giải thích tài liệu.'),
        (s('私', 'は', '友達', NI, '傘', 'を', '貸して', MORA, '。'), 'Tôi đã được bạn cho mượn ô.'),
        (s('私', 'は', 'おばあさん', NI, 'お弁当', 'を', '[F]作って', MORA, '。'), 'Tôi đã được bà làm cơm hộp cho.'),
        (s('私', 'は', '友達', NI, '日本', 'の', '友達', 'を', '[F]紹介して', MORA, '。'), 'Tôi đã được bạn giới thiệu cho một người bạn Nhật.'),
        ans(['ええ', '、', '友達', NI, '撮って', MORA, '。'], 'Vâng, tôi được bạn chụp cho đấy.', [], QC1, 'Bức ảnh đẹp nhỉ.',
            ['ええ、友達に撮ってあげました。', 'ええ、友達が撮ってもらいました。', '*ええ、友達に撮りてもらいました。']),
        ans(['カリナさん', NI, '教えて', MORA, '。'], 'Tôi được chị Karina dạy.', [], QC2, 'Bạn được ai dạy tiếng Nhật?',
            ['カリナさんに教えてあげました。', 'はい、教えてもらいました。', '*カリナさんに教えるてもらいました。']),
        (s('毎朝', '、', '父', NI, '駅', 'まで', '車', 'で', '[F]送って', '[W:くれます,あげます,*もらります]もらいます', '。'), 'Sáng nào tôi cũng được bố chở ra ga bằng ô tô.'),
        (s('私', 'は', 'ワンさん', NI, '写真', 'を', '見せて', MORA, '。'), 'Tôi đã được anh Wang cho xem ảnh.'),
        (s('私', 'は', '電気屋', 'の', '人', NI, 'エアコン', 'を', '[F]修理して', MORA, '。'), 'Tôi đã nhờ người tiệm điện sửa điều hòa.'),
        (s('私', 'は', '先生', NI, 'この', '漢字', 'の', '意味', 'を', '[F]説明して', MORA, '。'), 'Tôi đã được thầy giải thích nghĩa chữ Hán này.'),
        (s('私', 'は', '友達', NI, 'ケーキ', 'を', '作って', MORA, '。'), 'Tôi đã được bạn làm bánh cho.'),
        (s('私', 'は', '母', NI, '料理', 'を', '[F]教えて', MORA, '。'), 'Tôi đã được mẹ dạy nấu ăn.'),
        (s('私', 'は', '隣', 'の', '人', NI, '荷物', 'を', '[F]持って', MORA, '。'), 'Tôi đã được người bên cạnh xách đồ giúp.'),
        (s('私', 'は', '兄', NI, '宿題', 'を', '[F]手伝って', MORA, '。'), 'Tôi đã được anh trai giúp làm bài tập.'),
        (s('私', 'は', 'カリナさん', NI, 'コーヒー', 'を', '[F]いれて', MORA, '。'), 'Tôi đã được chị Karina pha cà phê cho.'),
        (s('私', 'は', 'ミラーさん', NI, 'ホテル', 'を', '[F]予約して', MORA, '。'), 'Tôi đã được anh Miller đặt khách sạn giúp.'),
        (s('私', 'は', 'サントスさん', NI, 'サッカー', 'を', '[F]教えて', MORA, '。'), 'Tôi đã được anh Santos dạy đá bóng.'),
        (s('私', 'は', '友達', NI, 'お金', 'を', '[F]貸して', MORA, '。'), 'Tôi đã được bạn cho vay tiền.'),
        (s('道', 'が', 'わからなかった', 'から', '、', '駅', 'の', '人', NI, '[F]教えて', MORA, '。'), 'Không biết đường nên tôi đã nhờ nhân viên nhà ga chỉ cho.', [D9]),
        (s('日本', 'へ', '来た', 'とき', '、', 'ワンさん', NI, '町', 'を', '[F]案内して', MORA, '。'), 'Khi mới sang Nhật, tôi được anh Wang dẫn đi tham quan thị trấn.', [A23]),
        (s('友達', NI, '撮って', '[W:くれた,あげた,*もらりた]もらった', '写真', 'を', '見せて', 'ください', '。'), 'Cho tôi xem bức ảnh bạn chụp cho bạn đi.', [A22, B14]),
        (s('日本語', 'が', 'わからない', 'とき', 'は', '、', 'カリナさん', NI, '[F]説明して', '[W:くれます,あげます,*もらります]もらいます', '。'), 'Khi không hiểu tiếng Nhật, tôi nhờ chị Karina giải thích.', [A23]),
        (s('私', 'は', 'ミラーさん', NI, '貸して', '[W:くれた,あげた,*もらりた]もらった', '本', 'を', 'なくしました', '。'), 'Tôi đã làm mất cuốn sách được anh Miller cho mượn.', [A22]),
        (s('引越し', 'の', 'とき', '、', '友達', NI, '[F]手伝って', MORA, '。'), 'Khi chuyển nhà, tôi đã được bạn bè giúp.', [A23]),
        (s('私', 'は', '子ども', 'の', 'とき', '、', '父', NI, 'よく', '本', 'を', '[F]読んで', MORA, '。'), 'Hồi nhỏ tôi hay được bố đọc sách cho nghe.', [A23]),
        (s('電気屋', 'の', '人', NI, 'エアコン', 'を', '修理して', 'もらった', 'から', '、', '部屋', 'が', '涼しく', 'なりました', '。'), 'Nhờ người tiệm điện sửa điều hòa nên phòng đã mát lên.', [D9, C23]),
        (s('わからない', '言葉', 'は', '先生', NI, '[F]教えて', 'もらって', 'も', 'いいですか', '。'), 'Những từ không hiểu tôi nhờ thầy giảng có được không?', [A15, A22]),
        (s('ワンさん', NI, '駅', 'まで', '[F]連れて行って', 'もらいたい', 'です', '。'), 'Tôi muốn được anh Wang dẫn ra ga.', [B13]),
        (s('母', NI, '作って', '[W:くれた,あげた,*もらりた]もらった', 'お弁当', 'は', 'いつも', 'おいしい', 'です', '。'), 'Cơm hộp mẹ làm cho tôi lúc nào cũng ngon.', [A22]),
        (s('あした', 'は', '友達', NI, '引越し', 'を', '[F]手伝って', 'もらう', '約束', 'が', 'あります', '。'), 'Mai tôi có hẹn được bạn giúp chuyển nhà.', [C22]),
        (s('部長', NI, '[F]説明して', 'もらいました', 'が', '、', 'よく', 'わかりませんでした', '。'), 'Tôi đã được trưởng phòng giải thích nhưng vẫn không hiểu lắm.', [F8]),
    ],
    notes='V て もらいます: tôi được người khác làm giúp; người làm giúp dùng に.')

# ---------------------------------------------------------------------------
QD1 = s('誰', 'が', 'この', 'ケーキ', 'を', '作りましたか', '。')
QD2 = s('駅', 'まで', 'どうやって', '来ましたか', '。')

p4 = point(24, 4, 'V て くれます', 'Ai đó làm giúp tôi',
    'Thể て + くれます: người khác làm việc gì đó cho TÔI, kèm lòng biết ơn. Người làm giúp là chủ ngữ, dùng が: '
    '友達が 引越しを 手伝って くれました. Không cần nói 私に. '
    'Ba cách nói cùng một việc: 私は 友達に 手伝って もらいました／友達が 手伝って くれました (tôi được giúp), '
    'còn 私は 友達を 手伝って あげました là tôi giúp bạn.',
    [
        (s('友達', GA, '引越し', 'を', '[F]手伝って', TEKURE, '。'), 'Bạn đã giúp tôi chuyển nhà.'),
        (s('ワンさん', GA, '本', 'を', '貸して', TEKURE, '。'), 'Anh Wang đã cho tôi mượn sách.'),
        (s('母', GA, 'お弁当', 'を', '[F]作って', TEKURE, '。'), 'Mẹ đã làm cơm hộp cho tôi.'),
        (s('カリナさん', GA, '写真', 'を', '撮って', TEKURE, '。'), 'Chị Karina đã chụp ảnh cho tôi.'),
        (s('ミラーさん', GA, '駅', 'まで', '[F]送って', TEKURE, '。'), 'Anh Miller đã đưa tôi ra ga.'),
        (s('イーさん', GA, '町', 'を', '[F]案内して', TEKURE, '。'), 'Chị Lee đã dẫn tôi đi tham quan thị trấn.'),
        (s('父', GA, '自転車', 'を', '[F]直して', TEKURE, '。'), 'Bố đã sửa xe đạp cho tôi.'),
        (s('先生', GA, '漢字', 'の', '意味', 'を', '[F]説明して', TEKURE, '。'), 'Thầy đã giải thích nghĩa chữ Hán cho tôi.'),
        (s('サントスさん', GA, 'コーヒー', 'を', '[F]いれて', TEKURE, '。'), 'Anh Santos đã pha cà phê cho tôi.'),
        (s('友達', GA, '傘', 'を', '[F]貸して', TEKURE, '。'), 'Bạn đã cho tôi mượn ô.'),
        (s('隣', 'の', '人', GA, '荷物', 'を', '[F]持って', TEKURE, '。'), 'Người bên cạnh đã xách đồ giúp tôi.'),
        (s('兄', GA, '宿題', 'を', '[F]手伝って', TEKURE, '。'), 'Anh trai đã giúp tôi làm bài tập.'),
        (s('ワンさん', GA, '日本', 'の', '友達', 'を', '[F]紹介して', TEKURE, '。'), 'Anh Wang đã giới thiệu cho tôi một người bạn Nhật.'),
        ans(['母', GA, '作って', TEKURE, '。'], 'Mẹ tôi làm cho tôi đấy.', [], QD1, 'Ai đã làm cái bánh này?',
            ['母に作ってくれました。', 'はい、母です。', '*母が作りてくれました。']),
        ans(['友達', GA, '車', 'で', '送って', TEKURE, '。'], 'Bạn tôi đã chở tôi bằng ô tô.', [], QD2, 'Bạn đến ga bằng cách nào?',
            ['友達に車で送ってくれました。', 'はい、車で来ました。', '*友達が車で送りてくれました。']),
        (s('ミラーさん', 'は', 'いつも', '日本語', 'を', '[F]教えて', '[W:あげます,もらいます,*くれります]くれます', '。'), 'Anh Miller lúc nào cũng dạy tiếng Nhật cho tôi.'),
        (s('おばあさん', GA, 'セーター', 'を', '[F]送って', TEKURE, '。'), 'Bà đã gửi áo len cho tôi.'),
        (s('電気屋', 'の', '人', GA, 'エアコン', 'を', '[F]修理して', TEKURE, '。'), 'Người tiệm điện đã sửa điều hòa cho tôi.'),
        (s('部長', GA, '資料', 'を', '[F]コピーして', TEKURE, '。'), 'Trưởng phòng đã photo tài liệu cho tôi.'),
        (s('カリナさん', GA, '地図', 'を', '[F]見せて', TEKURE, '。'), 'Chị Karina đã cho tôi xem bản đồ.'),
        (s('友達', GA, 'お金', 'を', '[F]貸して', TEKURE, '。'), 'Bạn đã cho tôi vay tiền.'),
        (s('母', GA, '料理', 'を', '[F]教えて', TEKURE, '。'), 'Mẹ đã dạy tôi nấu ăn.'),
        (s('ワンさん', GA, 'ホテル', 'を', '[F]予約して', TEKURE, '。'), 'Anh Wang đã đặt khách sạn giúp tôi.'),
        (s('友達', GA, '空港', 'まで', '迎え', 'に', '[F]来て', TEKURE, '。'), 'Bạn đã ra sân bay đón tôi.', ['g13-03']),
        (s('子ども', GA, '部屋', 'を', '[F]掃除して', TEKURE, '。'), 'Con đã dọn phòng giúp tôi.'),
        (s('カリナさん', GA, '日本', 'の', '歌', 'を', '[F]歌って', TEKURE, '。'), 'Chị Karina đã hát bài hát Nhật cho tôi nghe.'),
        (s('父', GA, '子ども', 'と', '[F]遊んで', TEKURE, '。'), 'Bố tôi đã chơi với con tôi giúp tôi.'),
        (s('道', 'が', 'わからなかった', 'とき', '、', '駅', 'の', '人', GA, '[F]教えて', TEKURE, '。'), 'Khi tôi không biết đường, nhân viên nhà ga đã chỉ cho tôi.', [A23]),
        (s('日本', 'へ', '来た', 'とき', '、', 'ワンさん', GA, 'いろいろ', 'な', 'こと', 'を', '[F]教えて', TEKURE, '。'), 'Khi tôi mới sang Nhật, anh Wang đã chỉ cho tôi nhiều điều.', [A23]),
        (s('母', 'が', '作って', '[W:あげた,もらった,*くれりた]くれた', 'お弁当', 'は', 'おいしい', 'です', '。'), 'Cơm hộp mẹ làm cho tôi rất ngon.', [A22]),
        (s('友達', GA, '引越し', 'を', '[F]手伝って', 'くれた', 'から', '、', '早く', '終わりました', '。'), 'Nhờ bạn giúp chuyển nhà nên xong sớm.', [D9]),
        (s('ミラーさん', 'が', '貸して', '[W:あげた,もらった,*くれりた]くれた', '本', 'は', 'とても', 'おもしろかった', 'です', '。'), 'Cuốn sách anh Miller cho tôi mượn rất hay.', [B22]),
        (s('病気', 'の', 'とき', '、', '友達', GA, '料理', 'を', '[F]作って', TEKURE, '。'), 'Khi tôi bị ốm, bạn đã nấu ăn cho tôi.', [A23]),
        (s('先生', GA, '[F]説明して', 'くれた', 'から', '、', 'よく', 'わかりました', '。'), 'Nhờ thầy giải thích nên tôi đã hiểu rõ.', [D9]),
        (s('カリナさん', 'が', '撮って', '[W:あげた,もらった,*くれりた]くれた', '写真', 'を', '家族', 'に', '送りました', '。'), 'Tôi đã gửi cho gia đình bức ảnh chị Karina chụp cho tôi.', [B22]),
        (s('雨', 'が', '降って', 'いた', 'から', '、', '友達', GA, '傘', 'を', '[F]貸して', TEKURE, '。'), 'Trời đang mưa nên bạn đã cho tôi mượn ô.', [C14, D9]),
        (s('誕生日', 'に', '友達', GA, 'ケーキ', 'を', '作って', '[W:あげる,もらう,*くれりる]くれる', 'と', '言いました', '。'), 'Bạn nói sẽ làm bánh cho tôi vào hôm sinh nhật.', [B21]),
        (s('イーさん', GA, 'わからない', '言葉', 'を', '[F]説明して', 'くれたり', '、', '漢字', 'を', '教えて', 'くれたり', 'します', '。'), 'Chị Lee giải thích từ tôi không hiểu, dạy tôi chữ Hán…', [C19, A22]),
        (s('ワンさん', GA, '駅', 'まで', '[F]送って', 'くれた', 'でしょう', '？'), 'Anh Wang đã đưa bạn ra ga phải không?', [C21]),
        (s('ミラーさん', GA, '町', 'を', '[F]案内して', 'くれる', '約束', 'を', 'しました', '。'), 'Anh Miller đã hứa sẽ dẫn tôi đi tham quan thị trấn.', [C22]),
    ],
    notes='V て くれます: người khác làm giúp tôi; người làm giúp là chủ ngữ với が.')

# Chủ dự án duyệt bài 24 ngày 2026-11-13
for _p in (p1, p2, p3, p4):
    _p['approved'] = True
write(24, [p1, p2, p3, p4])
