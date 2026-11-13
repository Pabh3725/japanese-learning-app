"""Ngữ pháp bài 36 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–36.
Chạy: python3 -I scripts/grammar-content/lesson_36.py  → data/grammar/lesson-36.json
Mỗi mẫu 40 câu (mức 1 = 1–13, mức 2 = 14–27, mức 3 = 28–40).
Chỗ hỏi động từ trước ように dùng plain(te=False): nhiễu là dạng chia sai. Chỗ ように là [W]: không dùng ために
(忘れないために cũng gặp) làm nhiễu.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import plain, point, use_lesson, write  # noqa: E402

use_lesson(36)


def P(text):
    return plain(text, te=False)


F8 = 'g08-06'
D9 = 'g09-04'
B14 = 'g14-02'
C15 = 'g15-03'
C16 = 'g16-03'
B17 = 'g17-02'
D18 = 'g18-04'
D19 = 'g19-04'
B20 = 'g20-02'
A21, C21 = 'g21-01', 'g21-03'
A22 = 'g22-01'
A23 = 'g23-01'
B24 = 'g24-02'
A25, B25, C25 = 'g25-01', 'g25-02', 'g25-03'
A26, B26 = 'g26-01', 'g26-02'
A27, B27 = 'g27-01', 'g27-02'
C28 = 'g28-02'
B30 = 'g30-02'
B31, C31 = 'g31-02', 'g31-03'
A32, B32 = 'g32-01', 'g32-02'
D33 = 'g33-04'
A34 = 'g34-01'
A35 = 'g35-01'
A, B = 'g36-01', 'g36-02'

YOU = '[W:とおりに,*ようで,*よおに]ように'
NARI = '[W:しました,できました,*なりりました]なりました'
SURU = '[W:なります,あります,*しりります]します'


def s(*parts):
    return '|'.join(parts)


def ans(parts, meaning, uses, q, qm, wrong):
    return (s(*parts), meaning, uses, (q, qm, wrong))


# ---------------------------------------------------------------------------
QA1 = s('どうして', '毎日', '練習して', 'いる', 'んですか', '。')
QA2 = s('どうして', 'メモ', 'を', 'するんですか', '。')

p1 = point(36, 1, 'V1 (từ điển／ない) ように、V2', 'Để (có thể)… / để không…',
    'ように nói mục đích, nhưng thường là một trạng thái không tự quyết được: có thể làm gì, không xảy ra điều gì. '
    'Trước ように dùng thể khả năng, động từ không chủ ý (聞こえます, 見えます, わかります) hoặc thể ない: '
    '後ろの人にも 聞こえるように、大きな 声で 話します; 忘れないように、メモします.',
    [
        (s('後ろ', 'の', '人', 'に', 'も', P('聞こえる'), YOU, '、', '大きい', '声', 'で', '話します', '。'), 'Tôi nói to để người phía sau cũng nghe thấy.'),
        (s(P('忘れない'), YOU, '、', 'メモ', 'します', '。'), 'Tôi ghi chép lại để không quên.'),
        (s('日本語', 'が', P('話せる'), YOU, '、', '毎日', '練習して', 'います', '。'), 'Tôi luyện tập mỗi ngày để có thể nói tiếng Nhật.'),
        (s('会議', 'に', P('遅れない'), YOU, '、', '早く', '出かけます', '。'), 'Tôi ra khỏi nhà sớm để không trễ họp.'),
        (s('みんな', 'に', P('見える'), YOU, '、', '字', 'を', '大きく', '書きます', '。'), 'Tôi viết chữ to để mọi người đều nhìn thấy.'),
        (s('新聞', 'が', P('読める'), YOU, '、', '漢字', 'を', '勉強して', 'います', '。'), 'Tôi học chữ Hán để đọc được báo.'),
        (s(P('太らない'), YOU, '、', '毎朝', '走って', 'います', '。'), 'Sáng nào tôi cũng chạy để không tăng cân.'),
        (s('電車', 'に', P('間に合う'), YOU, '、', '急いで', 'ください', '。'), 'Hãy nhanh lên để kịp tàu.'),
        (s('子ども', 'に', 'も', P('わかる'), YOU, '、', '簡単', 'な', '言葉', 'で', '説明します', '。'), 'Tôi giải thích bằng từ ngữ đơn giản để trẻ con cũng hiểu.'),
        (s('ピアノ', 'が', P('弾ける'), YOU, '、', '毎日', '練習します', '。'), 'Tôi luyện tập mỗi ngày để chơi được piano.'),
        (s('荷物', 'が', 'あした', P('届く'), YOU, '、', '今日', '送ります', '。'), 'Tôi gửi hôm nay để mai hàng tới nơi.'),
        (s('車', 'が', P('運転できる'), YOU, '、', '学校', 'に', '通って', 'います', '。'), 'Tôi đang học ở trường để lái được ô tô.'),
        (s(P('忘れない'), YOU, '、', 'カレンダー', 'に', '書いて', 'おきます', '。'), 'Tôi ghi sẵn lên lịch để không quên.', [B30]),
        ans(['試合', 'に', P('勝てる'), YOU, '、', '練習して', 'いる', 'んです', '。'], 'Tôi luyện tập để có thể thắng trận.', [A26], QA1, 'Sao ngày nào bạn cũng luyện tập vậy?',
            ['試合に勝てるとおりに、練習しているんです。', 'はい、練習しています。', '*試合に勝ちれるように、練習しているんです。']),
        ans([P('忘れない'), YOU, '、', 'メモ', 'する', 'んです', '。'], 'Ghi lại để không quên.', [A26], QA2, 'Sao bạn lại ghi chép?',
            ['忘れないとおりに、メモするんです。', 'はい、メモします。', '*忘れるないように、メモするんです。']),
        (s('病気', 'に', P('ならない'), YOU, '、', '野菜', 'を', 'たくさん', '食べます', '。'), 'Tôi ăn nhiều rau để không bị ốm.'),
        (s('外国', 'の', '人', 'に', 'も', P('わかる'), YOU, '、', 'ゆっくり', '話します', '。'), 'Tôi nói chậm để người nước ngoài cũng hiểu.'),
        (s(P('泳げる'), YOU, '、', 'プール', 'で', '練習して', 'います', '。'), 'Tôi luyện tập ở bể bơi để biết bơi.'),
        (s('お金', 'が', P('足りる'), YOU, '、', '毎月', '貯金して', 'います', '。'), 'Tôi tiết kiệm hàng tháng để đủ tiền.'),
        (s('風', 'が', P('入らない'), YOU, '、', '窓', 'を', '閉めて', 'ください', '。'), 'Hãy đóng cửa sổ để gió không lùa vào.'),
        (s('約束', 'の', '時間', 'に', P('遅れない'), YOU, '、', 'タクシー', 'で', '行きます', '。'), 'Tôi đi taxi để không trễ giờ hẹn.'),
        (s('よく', P('寝られる'), YOU, '、', '寝る', '前', 'に', 'コーヒー', 'を', '飲みません', '。'), 'Tôi không uống cà phê trước khi ngủ để ngủ ngon.', [D18]),
        (s('電話', 'が', P('かけられる'), YOU, '、', '携帯', 'を', '持って', 'います', '。'), 'Tôi mang điện thoại di động để gọi được.'),
        (s('子ども', 'が', P('触らない'), YOU, '、', '薬', 'は', '高い', '所', 'に', '置きます', '。'), 'Tôi để thuốc trên cao để trẻ con không chạm vào.'),
        (s('みんな', 'が', P('座れる'), YOU, '、', 'いす', 'を', '並べて', 'おきます', '。'), 'Tôi xếp sẵn ghế để mọi người đều ngồi được.', [B30]),
        (s('安全', 'に', P('運転できる'), YOU, '、', 'シートベルト', 'を', 'します', '。'), 'Tôi thắt dây an toàn để lái xe an toàn.'),
        (s('はっきり', P('見える'), YOU, '、', '眼鏡', 'を', 'かけます', '。'), 'Tôi đeo kính để nhìn rõ.'),
        (s('日本語', 'の', '新聞', 'が', P('読める'), YOU, '、', '毎日', '漢字', 'を', '10', '覚える', 'つもり', 'です', '。'), 'Tôi định mỗi ngày nhớ 10 chữ Hán để đọc được báo tiếng Nhật.', [C31]),
        (s(P('忘れない'), YOU, '、', '手', 'に', '書いて', 'おいた', 'けど', '、', '忘れて', 'しまいました', '。'), 'Tôi đã viết vào tay để không quên, nhưng vẫn quên mất.', [B30, 'g29-02']),
        (s('試験', 'に', P('合格できる'), YOU, '、', '毎晩', '遅く', 'まで', '勉強して', 'います', '。'), 'Tối nào tôi cũng học khuya để đỗ được kỳ thi.', [C28]),
        (s('病気', 'に', P('ならない'), YOU, '、', '早く', '寝た', 'ほう', 'が', 'いい', 'です', '。'), 'Nên ngủ sớm để không bị ốm.', [A32]),
        (s('後ろ', 'の', '席', 'から', 'も', P('見える'), YOU, '、', '大きい', '字', 'で', '書いて', 'いただけませんか', '。'), 'Anh/chị viết chữ to giúp để từ hàng ghế sau cũng nhìn thấy được không ạ?', [B26]),
        (s('道', 'に', P('まちがえない'), YOU, '、', '地図', 'を', '持って行った', 'ほう', 'が', 'いい', 'です', '。'), 'Nên mang bản đồ để không đi nhầm đường.', [A32]),
        (s('日本', 'の', '会社', 'で', P('働ける'), YOU, '、', '日本語', 'を', '勉強しよう', 'と', '思って', 'います', '。'), 'Tôi định học tiếng Nhật để có thể làm việc ở công ty Nhật.', [B31]),
        (s('子ども', 'が', P('おきない'), YOU, '、', '静か', 'に', '話して', 'ください', '。'), 'Hãy nói khẽ để con không thức giấc.', [B14]),
        (s('会議', 'に', P('間に合う'), YOU, '、', '急げば', '、', 'まだ', '大丈夫', 'です', '。'), 'Nếu nhanh lên để kịp cuộc họp thì vẫn còn kịp.', [A35]),
        (s('誰', 'でも', P('使える'), YOU, '、', '説明書', 'を', '詳しく', '書きました', '。'), 'Tôi viết sách hướng dẫn chi tiết để ai cũng dùng được.', [A27]),
        (s('みんな', 'に', P('わかる'), YOU, '、', '先生', 'は', 'ゆっくり', '話して', 'くれました', '。'), 'Thầy đã nói chậm để mọi người đều hiểu.', ['g24-04']),
        (s('荷物', 'が', '早く', P('届く'), YOU, '、', '急いで', '送った', 'と', '言っていました', '。'), 'Người đó nói đã gửi gấp để hàng đến sớm.', [D33]),
        (s('試合', 'に', P('勝てる'), YOU, '、', '毎日', '練習すれば', '練習する', 'ほど', '、', '強く', 'なります', '。'), 'Để thắng trận thì càng luyện tập mỗi ngày càng mạnh lên.', ['g35-04']),
    ],
    notes='ように: mục đích là một trạng thái (có thể làm gì, không xảy ra điều gì). Trước ように: thể khả năng, thể ない.')

# ---------------------------------------------------------------------------
QB1 = s('日本語', 'は', 'どう', 'ですか', '。')
QB2 = s('もう', '泳げますか', '。')

p2 = point(36, 2, 'V (từ điển／khả năng) ようになります', 'Đã trở nên (có thể)…',
    'V ようになります: sự thay đổi dần dần về khả năng hoặc thói quen. Với thể khả năng: 日本語が 話せる ように なりました '
    '(đã nói được tiếng Nhật). Với thể từ điển: 毎朝 走る ように なりました (đã có thói quen chạy mỗi sáng). '
    'Hay đi với やっと, だんだん, このごろ.',
    [
        (s('日本語', 'が', P('話せる'), YOU, NARI, '。'), 'Tôi đã nói được tiếng Nhật.'),
        (s('漢字', 'が', P('読める'), YOU, NARI, '。'), 'Tôi đã đọc được chữ Hán.'),
        (s(P('泳げる'), YOU, NARI, '。'), 'Tôi đã biết bơi.'),
        (s('自転車', 'に', P('乗れる'), YOU, NARI, '。'), 'Tôi đã đi được xe đạp.'),
        (s('ピアノ', 'が', P('弾ける'), YOU, NARI, '。'), 'Tôi đã chơi được piano.'),
        (s('子ども', 'は', '一人', 'で', P('寝られる'), YOU, NARI, '。'), 'Con tôi đã ngủ một mình được.'),
        (s('日本', 'の', '料理', 'が', P('食べられる'), YOU, NARI, '。'), 'Tôi đã ăn được món Nhật.'),
        (s('やっと', '車', 'が', P('運転できる'), YOU, NARI, '。'), 'Cuối cùng tôi đã lái được ô tô.'),
        (s('新聞', 'が', '少し', P('わかる'), YOU, NARI, '。'), 'Tôi đã hiểu được báo một chút.'),
        (s('毎朝', '早く', P('おきられる'), YOU, NARI, '。'), 'Tôi đã dậy sớm được mỗi sáng.'),
        (s('このごろ', '、', 'パソコン', 'が', P('使える'), YOU, NARI, '。'), 'Dạo này tôi đã dùng được máy tính.'),
        (s('テレサちゃん', 'は', P('歩ける'), YOU, NARI, '。'), 'Bé Teresa đã biết đi.'),
        (s('日本', 'の', '歌', 'が', P('歌える'), YOU, NARI, '。'), 'Tôi đã hát được bài hát Nhật.'),
        ans(['少し', P('話せる'), YOU, NARI, '。'], 'Tôi đã nói được một chút.', [], QB1, 'Tiếng Nhật của bạn thế nào rồi?',
            ['少し話せるとおりになりました。', 'はい、話します。', '*少し話しれるようになりました。']),
        ans(['ええ', '、', 'やっと', P('泳げる'), YOU, NARI, '。'], 'Vâng, cuối cùng tôi đã bơi được.', [], QB2, 'Bạn bơi được chưa?',
            ['ええ、やっと泳げるようにしました。', 'いいえ、やっと泳げるようになりました。', '*ええ、やっと泳ぎれるようになりました。']),
        (s('このごろ', '毎朝', P('走る'), YOU, NARI, '。'), 'Dạo này sáng nào tôi cũng chạy bộ.'),
        (s('携帯', 'で', '本', 'が', P('読める'), YOU, NARI, '。'), 'Đã đọc được sách trên điện thoại di động.'),
        (s('前', 'は', '嫌い', 'でした', 'が', '、', '野菜', 'を', P('食べる'), YOU, NARI, '。'), 'Trước đây tôi ghét rau nhưng giờ đã ăn rồi.', [F8]),
        (s('剣道', 'が', '少し', P('できる'), YOU, NARI, '。'), 'Tôi đã tập được kiếm đạo một chút.'),
        (s('一人', 'で', '電車', 'に', P('乗れる'), YOU, NARI, '。'), 'Tôi đã đi tàu một mình được.'),
        (s('タンゴ', 'が', P('踊れる'), YOU, NARI, '。'), 'Tôi đã nhảy được tango.'),
        (s('汽車', 'で', '遠く', 'の', '町', 'まで', P('行ける'), YOU, NARI, '。'), 'Người ta đã có thể đi tàu hơi nước đến những thị trấn xa.'),
        (s('夜', 'も', '一人', 'で', P('歩ける'), YOU, NARI, '。'), 'Tôi đã có thể đi bộ một mình cả buổi tối.'),
        (s('漢字', 'が', 'たくさん', P('書ける'), YOU, NARI, '。'), 'Tôi đã viết được nhiều chữ Hán.'),
        (s('インターネット', 'で', '何でも', P('買える'), YOU, NARI, '。'), 'Đã mua được mọi thứ qua internet.'),
        (s('一人', 'で', '料理', 'が', P('作れる'), YOU, NARI, '。'), 'Tôi đã tự nấu ăn được.'),
        (s('このごろ', 'よく', P('寝られる'), YOU, NARI, '。'), 'Dạo này tôi đã ngủ ngon được.'),
        (s('毎日', '練習した', 'から', '、', P('泳げる'), YOU, NARI, '。'), 'Vì luyện tập mỗi ngày nên tôi đã biết bơi.', [D9]),
        (s('日本', 'へ', '来て', 'から', '、', '日本語', 'が', P('話せる'), YOU, NARI, '。'), 'Từ khi sang Nhật tôi đã nói được tiếng Nhật.', [C16]),
        (s('漢字', 'を', '勉強して', '、', '新聞', 'が', P('読める'), YOU, 'なった', 'と', '言っていました', '。'), 'Người đó nói học chữ Hán nên đã đọc được báo.', [D33, 'g16-01']),
        (s('練習すれば', '、', 'だれでも', P('弾ける'), YOU, 'なります', '。'), 'Luyện tập thì ai cũng chơi được.', [A35]),
        (s('子ども', 'が', '大きく', 'なって', '、', '一人', 'で', '学校', 'へ', P('行ける'), YOU, NARI, '。'), 'Con đã lớn nên đi học một mình được rồi.', [D19, 'g16-01']),
        (s('先生', 'に', '教えて', 'もらって', '、', 'パソコン', 'が', P('使える'), YOU, NARI, '。'), 'Nhờ thầy chỉ cho nên tôi đã dùng được máy tính.', ['g24-03']),
        (s('毎日', P('歩く'), YOU, 'なって', 'から', '、', '体', 'の', '調子がいい', 'です', '。'), 'Từ khi đi bộ mỗi ngày, cơ thể tôi khỏe hơn.', [C16]),
        (s('前', 'は', 'お酒', 'が', '飲めませんでした', 'が', '、', '少し', P('飲める'), YOU, NARI, '。'), 'Trước đây tôi không uống được rượu, giờ đã uống được một chút.', [F8, A27]),
        (s('薬', 'を', '飲んで', '、', 'よく', P('寝られる'), YOU, 'なった', 'でしょう', '？'), 'Uống thuốc rồi nên ngủ được ngon hơn rồi phải không?', [C21, 'g16-01']),
        (s('日本', 'の', '料理', 'が', P('食べられる'), YOU, 'なった', 'から', '、', '毎日', '楽しい', 'です', '。'), 'Đã ăn được món Nhật nên ngày nào cũng vui.', [D9]),
        (s('汽車', 'が', '走る', YOU, 'なって', '、', '遠く', 'まで', P('行ける'), YOU, NARI, '。'), 'Có tàu hơi nước chạy nên người ta đã đi được xa.', ['g16-01']),
        (s('やっと', '漢字', 'が', P('書ける'), YOU, 'なった', 'けど', '、', 'まだ', '難しい', '。'), 'Cuối cùng đã viết được chữ Hán nhưng vẫn còn khó.', [B20]),
        (s('もっと', '練習すれば', '、', '上手', 'に', P('話せる'), YOU, 'なる', 'でしょう', '。'), 'Nếu luyện tập nhiều hơn chắc sẽ nói giỏi được.', [A35, B32]),
    ],
    notes='V (khả năng／từ điển) ようになります: thay đổi dần về khả năng, thói quen.')

# ---------------------------------------------------------------------------
QC1 = s('何', 'か', '体', 'に', 'いい', 'こと', 'を', 'して', 'いますか', '。')
QC2 = s('会議', 'は', '9', '時', 'から', 'です', '。')

SHITE = '[W:なって,あって,*しりて]して'

p3 = point(36, 3, 'V (từ điển／ない) ようにします', 'Cố gắng (không)…',
    'V ようにします: cố gắng tạo thói quen, để ý làm (hoặc không làm) việc gì: 毎日 野菜を 食べる ように して います. '
    'Nhờ người khác cố gắng: ～ように して ください (遅れない ように して ください). '
    'Lịch sự và mềm hơn ～てください／～ないでください.',
    [
        (s('毎日', '野菜', 'を', P('食べる'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng ăn rau mỗi ngày.'),
        (s(P('遅れない'), YOU, SHITE, 'ください', '。'), 'Hãy cố gắng đừng đến muộn.'),
        (s('毎朝', '早く', P('おきる'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng dậy sớm mỗi sáng.'),
        (s('たばこ', 'を', P('吸わない'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng không hút thuốc.'),
        (s('ケーキ', 'を', P('食べない'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng không ăn bánh ngọt.'),
        (s('夜', '11', '時', 'までに', P('寝る'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng ngủ trước 11 giờ tối.'),
        (s('必ず', '宿題', 'を', P('する'), YOU, SHITE, 'ください', '。'), 'Hãy nhất định làm bài tập nhé.'),
        (s('忘れ物', 'を', P('しない'), YOU, SHITE, 'ください', '。'), 'Hãy chú ý đừng để quên đồ.'),
        (s('毎日', '日本語', 'で', '日記', 'を', P('書く'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng mỗi ngày viết nhật ký bằng tiếng Nhật.'),
        (s('毎週', P('運動する'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng vận động hằng tuần.'),
        (s('絶対に', P('遅れない'), YOU, SHITE, 'ください', '。'), 'Tuyệt đối đừng đến muộn.'),
        (s('電話', 'は', '短く', P('する'), YOU, SHITE, 'ください', '。'), 'Hãy cố gắng gọi điện ngắn gọn.'),
        (s('できるだけ', P('歩く'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng đi bộ hết mức có thể.'),
        ans(['毎朝', P('歩く'), YOU, SHITE, 'います', '。'], 'Tôi cố gắng sáng nào cũng đi bộ.', [], QC1, 'Bạn có làm gì tốt cho sức khỏe không?',
            ['毎朝歩くとおりにしています。', 'はい、しています。', '*毎朝歩きるようにしています。']),
        ans(['わかりました', '。', P('遅れない'), YOU, SURU, '。'], 'Vâng ạ. Tôi sẽ cố gắng không đến muộn.', [], QC2, 'Cuộc họp bắt đầu từ 9 giờ.',
            ['わかりました。遅れないようになります。', 'はい、9時です。', '*わかりました。遅れるないようにします。']),
        (s('お酒', 'は', 'あまり', P('飲まない'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng không uống rượu nhiều.'),
        (s('毎月', '少し', P('貯金する'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng tiết kiệm một ít mỗi tháng.'),
        (s('寝る', '前', 'に', 'コーヒー', 'を', P('飲まない'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng không uống cà phê trước khi ngủ.', [D18]),
        (s('授業', 'の', '前', 'に', '必ず', P('予習する'), YOU, SHITE, 'ください', '。'), 'Trước giờ học hãy nhất định chuẩn bị bài.'),
        (s('わからない', 'こと', 'は', '、', 'すぐ', P('聞く'), YOU, SHITE, 'ください', '。'), 'Điều gì không hiểu thì hãy hỏi ngay.', [A22]),
        (s('会議', 'の', 'とき', 'は', '、', '携帯', 'を', P('使わない'), YOU, SHITE, 'ください', '。'), 'Trong cuộc họp hãy cố gắng không dùng điện thoại.', [A23]),
        (s('毎日', '30', '分', 'ピアノ', 'を', P('練習する'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng luyện piano 30 phút mỗi ngày.'),
        (s('薬', 'は', '必ず', '食事', 'の', 'あとで', P('飲む'), YOU, SHITE, 'ください', '。'), 'Hãy nhất định uống thuốc sau bữa ăn.', ['g34-02']),
        (s('新しい', '言葉', 'は', '、', 'すぐ', P('メモする'), YOU, SHITE, 'います', '。'), 'Từ mới thì tôi cố gắng ghi lại ngay.'),
        (s('ごみ', 'は', '月曜日', 'に', P('出す'), YOU, SHITE, 'ください', '。'), 'Hãy chú ý đổ rác vào thứ hai.'),
        (s('夜', '遅く', P('食べない'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng không ăn khuya.'),
        (s('できるだけ', '日本語', 'で', P('話す'), YOU, SHITE, 'います', '。'), 'Tôi cố gắng nói bằng tiếng Nhật hết mức có thể.'),
        (s('体', 'に', '悪い', 'から', '、', 'たばこ', 'は', P('吸わない'), YOU, SHITE, 'います', '。'), 'Vì có hại cho sức khỏe nên tôi cố gắng không hút thuốc.', [D9]),
        (s('試験', 'の', '前', 'は', '、', '早く', P('寝る'), YOU, 'した', 'ほう', 'が', 'いい', 'です', '。'), 'Trước kỳ thi nên cố gắng ngủ sớm.', [A32]),
        (s('遅れる', 'とき', 'は', '、', '必ず', P('連絡する'), YOU, SHITE, 'ください', '。'), 'Khi đến muộn hãy nhất định liên lạc.', [A23]),
        (s('日本', 'へ', '来て', 'から', '、', '毎日', '日本語', 'で', P('話す'), YOU, SHITE, 'います', '。'), 'Từ khi sang Nhật tôi cố gắng ngày nào cũng nói tiếng Nhật.', [C16]),
        (s('忘れない', 'ように', '、', 'すぐ', P('メモする'), YOU, SHITE, 'います', '。'), 'Để không quên, tôi cố gắng ghi lại ngay.', [A]),
        (s('会議', 'の', '資料', 'は', '前', 'の', '日{ひ}', 'に', '読んで', P('おく'), YOU, SHITE, 'います', '。'), 'Tài liệu cuộc họp thì tôi cố gắng đọc trước từ hôm trước.', [B30]),
        (s('雨', 'が', '降っても', '、', '毎朝', P('歩く'), YOU, SHITE, 'います', '。'), 'Dù mưa tôi cũng cố gắng đi bộ mỗi sáng.', [C25]),
        (s('わからない', '言葉', 'が', 'あったら', '、', '辞書', 'で', P('調べる'), YOU, SHITE, 'ください', '。'), 'Có từ không hiểu thì hãy tra từ điển.', [A25, A22]),
        (s('あした', 'から', '、', '毎朝', '6', '時', 'に', P('おきる'), YOU, 'しよう', 'と', '思って', 'います', '。'), 'Từ mai tôi định cố gắng dậy lúc 6 giờ mỗi sáng.', [B31]),
        (s('お金', 'は', 'あまり', P('使わない'), YOU, SHITE, 'いる', 'んです', '。'), 'Tôi đang cố gắng không tiêu nhiều tiền.', [A26]),
        (s('部長', 'は', '会議', 'に', P('遅れない'), YOU, SHITE, 'ください', 'と', '言っていました', '。'), 'Trưởng phòng nói hãy cố gắng đừng đến họp muộn.', [D33]),
        (s('野菜', 'を', P('食べる'), YOU, 'したら', '、', '体', 'の', '調子', 'が', 'よく', 'なりました', '。'), 'Cố gắng ăn rau thì sức khỏe đã tốt lên.', [B25, D19]),
        (s('毎日', P('練習する'), YOU, 'すれば', '、', '上手', 'に', 'なる', 'でしょう', '。'), 'Nếu cố gắng luyện tập mỗi ngày chắc sẽ giỏi lên.', [A35, B32]),
    ],
    notes='V ようにします: cố gắng tạo thói quen. ～ようにしてください: nhờ ai cố gắng làm.')

# Chủ dự án duyệt bài 36 ngày 2026-11-13
for _p in (p1, p2, p3):
    _p['approved'] = True
write(36, [p1, p2, p3])
