"""Ngữ pháp bài 45 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–45.
Chạy: python3 -I scripts/grammar-content/lesson_45.py  → data/grammar/lesson-45.json
Mỗi mẫu 40 câu (mức 1 = 1–13, mức 2 = 14–27, mức 3 = 28–40).
場合: từ điển của dự án chưa có cách đọc nên ghi 場合{ばあい}. Chỗ động từ trước 場合／のに dùng plain(te=False).
のに: chỗ のに là [W] (ので, から đúng ngữ pháp nhưng sai nghĩa); danh từ, tính từ な: なのに.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import plain, point, use_lesson, write  # noqa: E402

use_lesson(45)


def P(text):
    return plain(text, te=False)


F8 = 'g08-06'
D9 = 'g09-04'
B14 = 'g14-02'
C15 = 'g15-03'
A16, B16 = 'g16-01', 'g16-02'
B17, C17 = 'g17-02', 'g17-03'
A21, B21, C21 = 'g21-01', 'g21-02', 'g21-03'
A22 = 'g22-01'
A25 = 'g25-01'
A26, B26 = 'g26-01', 'g26-02'
A27 = 'g27-01'
B29 = 'g29-02'
B30 = 'g30-02'
C31, D31 = 'g31-03', 'g31-04'
A32, B32 = 'g32-01', 'g32-02'
D33, E33 = 'g33-04', 'g33-05'
C39 = 'g39-03'
A37 = 'g37-01'
A = 'g45-01'

BAAI = '場合{ばあい}'
NO = '[P:が,を,で]の'
WA = '[P:が,を,で]は'
NONI = '[W:ので,から,のは]のに'
NA = '[W:だ,の,に]な'


def s(*parts):
    return '|'.join(parts)


def ans(parts, meaning, uses, q, qm, wrong):
    return (s(*parts), meaning, uses, (q, qm, wrong))


# ---------------------------------------------------------------------------
QA1 = s('会議', 'に', '遅れる', '場合{ばあい}', 'は', 'どう', 'したら', 'いいですか', '。')
QA2 = s('この', '機械', 'が', '動かない', '場合{ばあい}', 'は', '、', 'どう', 'すれば', 'いいですか', '。')

p1 = point(45, 1, '～場合は、～', 'Trong trường hợp…',
    '場合は nói một tình huống giả định, thường dùng khi hướng dẫn, quy định: 火事の 場合は、エレベーターを 使わないで ください. '
    'Trước 場合: động từ (thể từ điển, た, ない), tính từ い, tính từ な + な, danh từ + の. '
    'Lịch sự, trang trọng hơn ～たら／～とき.',
    [
        (s('火事', NO, BAAI, 'は', '、', 'エレベーター', 'を', '使わないで', 'ください', '。'), 'Trong trường hợp hỏa hoạn, đừng dùng thang máy.', [B17]),
        (s('会議', 'に', P('遅れる'), BAAI, WA, '、', '連絡して', 'ください', '。'), 'Trường hợp đến họp muộn thì hãy liên lạc.'),
        (s('地震', NO, BAAI, 'は', '、', 'すぐ', '外', 'へ', '逃げて', 'ください', '。'), 'Trường hợp động đất hãy chạy ra ngoài ngay.'),
        (s('カード', 'を', P('なくした'), BAAI, 'は', '、', 'すぐ', '銀行', 'に', '連絡して', 'ください', '。'), 'Trường hợp làm mất thẻ thì hãy liên lạc ngay với ngân hàng.'),
        (s('雨', NO, BAAI, 'は', '、', 'キャンプ', 'は', '中止', 'です', '。'), 'Trường hợp trời mưa thì hủy cắm trại.'),
        (s('機械', 'が', P('壊れた'), BAAI, 'は', '、', '保証書', 'を', '持って来て', 'ください', '。'), 'Trường hợp máy hỏng thì hãy mang giấy bảo hành đến.'),
        (s('サイズ', 'が', P('合わない'), BAAI, 'は', '、', '取り替えます', '。'), 'Trường hợp không vừa cỡ thì sẽ đổi cho bạn.'),
        (s('事故', NO, BAAI, 'は', '、', '警察', 'に', '連絡して', 'ください', '。'), 'Trường hợp tai nạn hãy liên lạc với cảnh sát.'),
        (s('パーティー', 'に', P('来られない'), BAAI, 'は', '、', '早く', '知らせて', 'ください', '。'), 'Trường hợp không đến dự tiệc được thì hãy báo sớm.'),
        (s('領収書', 'が', P('要る'), BAAI, 'は', '、', '係', 'に', '言って', 'ください', '。'), 'Trường hợp cần hóa đơn thì hãy nói với nhân viên.'),
        (s('台風', NO, BAAI, 'は', '、', '試合', 'は', 'ありません', '。'), 'Trường hợp có bão thì không có trận đấu.'),
        (s('病気', NO, BAAI, 'は', '、', '休んで', 'も', 'いいです', '。'), 'Trường hợp bị ốm thì được nghỉ.', ['g15-01']),
        (s('間違い電話', NO, BAAI, 'は', '、', '謝って', '切って', 'ください', '。'), 'Trường hợp gọi nhầm số thì hãy xin lỗi rồi cúp máy.'),
        ans(['部長', 'に', '電話', 'で', '連絡して', 'ください', '。'], 'Hãy gọi điện báo cho trưởng phòng.', [], QA1, 'Trường hợp đến họp muộn thì nên làm thế nào?',
            ['部長に電話で連絡しましたか。', 'はい、遅れます。', '部長が電話で連絡してください。']),
        ans(['この', 'レバー', 'を', '下げて', 'ください', '。'], 'Hãy hạ cần gạt này xuống.', [], QA2, 'Trường hợp máy không chạy thì phải làm thế nào?',
            ['このレバーを下げましたか。', 'はい、動きません。', 'このレバーが下げてください。']),
        (s('お金', 'が', P('足りない'), BAAI, 'は', '、', 'カード', 'で', '払って', 'も', 'いいです', '。'), 'Trường hợp không đủ tiền thì có thể trả bằng thẻ.', ['g15-01']),
        (s('道', 'が', P('わからない'), BAAI, 'は', '、', '係員', 'に', '聞いて', 'ください', '。'), 'Trường hợp không biết đường thì hãy hỏi nhân viên.'),
        (s('マラソン', 'の', 'コース', 'が', P('変わった'), BAAI, 'は', '、', '知らせます', '。'), 'Trường hợp đường chạy marathon thay đổi, chúng tôi sẽ thông báo.'),
        (s('約束', 'を', P('キャンセルする'), BAAI, 'は', '、', '早く', '連絡して', 'ください', '。'), 'Trường hợp hủy hẹn thì hãy liên lạc sớm.'),
        (s('熱', 'が', P('ある'), BAAI, 'は', '、', '学校', 'を', '休んで', 'ください', '。'), 'Trường hợp bị sốt thì hãy nghỉ học.'),
        (s('目覚まし', 'で', P('起きられない'), BAAI, 'は', '、', '電話', 'で', '起こします', '。'), 'Trường hợp không dậy được bằng đồng hồ báo thức, tôi sẽ gọi điện đánh thức.'),
        (s('品物', 'が', P('届かない'), BAAI, 'は', '、', 'この', '番号', 'に', '電話', 'して', 'ください', '。'), 'Trường hợp hàng không tới, hãy gọi số này.'),
        (s('子ども', NO, BAAI, 'は', '、', '半分', 'の', '値段', 'です', '。'), 'Trường hợp trẻ em thì giá một nửa.'),
        (s('雪', NO, BAAI, 'は', '、', 'スタート', 'が', '遅く', 'なります', '。'), 'Trường hợp có tuyết thì giờ xuất phát sẽ muộn hơn.'),
        (s('わからない', BAAI, 'は', '、', '何', 'でも', '聞いて', 'ください', '。'), 'Trường hợp không hiểu, cứ hỏi bất cứ điều gì.'),
        (s('この', '札', 'が', P('使えない'), BAAI, 'は', '、', 'カード', 'を', '使って', 'ください', '。'), 'Trường hợp tờ tiền này không dùng được, hãy dùng thẻ.'),
        (s('優勝した', BAAI, 'は', '、', 'お金', 'が', 'もらえます', '。'), 'Trường hợp giành giải nhất thì nhận được tiền.', [A27]),
        (s('火事', NO, BAAI, 'は', '、', 'エレベーター', 'を', '使わない', 'ほう', 'が', 'いい', 'です', '。'), 'Trường hợp hỏa hoạn thì không nên dùng thang máy.', [A32]),
        (s('会議', 'に', P('遅れる'), BAAI, 'は', '、', '部長', 'に', '伝えて', 'いただけませんか', '。'), 'Trường hợp tôi đến họp muộn, anh/chị nhắn trưởng phòng giúp được không ạ?', [B26]),
        (s('機械', 'が', P('動かない'), BAAI, 'は', '、', 'どう', 'すれば', 'いいですか', '。'), 'Trường hợp máy không chạy thì phải làm thế nào?', ['g35-03']),
        (s('雨', NO, BAAI, 'は', '、', '試合', 'が', '中止', 'に', 'なる', 'かもしれません', '。'), 'Trường hợp mưa thì trận đấu có thể bị hủy.', ['g32-03']),
        (s('カード', 'を', P('なくした'), BAAI, 'は', '、', 'すぐ', '連絡しなければ', 'なりません', '。'), 'Trường hợp làm mất thẻ thì phải liên lạc ngay.', [C17]),
        (s('品物', 'が', '壊れて', P('いた'), BAAI, 'は', '、', '取り替えて', 'もらえますか', '。'), 'Trường hợp hàng bị hỏng thì tôi có thể đổi được không?', [A27, 'g24-03']),
        (s('地震', NO, BAAI, 'は', '、', '机', 'の', '下', 'に', '入る', 'ように', 'して', 'ください', '。'), 'Trường hợp động đất hãy cố gắng chui xuống gầm bàn.', ['g36-03']),
        (s('キャンプ', 'が', '中止', 'に', P('なった'), BAAI, 'は', '、', 'お金', 'を', '返します', '。'), 'Trường hợp buổi cắm trại bị hủy, chúng tôi sẽ trả lại tiền.', ['g19-04']),
        (s('病気', NO, BAAI, 'は', '、', '休む', 'と', '先生', 'に', '伝えて', 'いただけませんか', '。'), 'Trường hợp bị ốm, anh/chị nhắn thầy là tôi nghỉ được không ạ?', [E33]),
        (s('サイズ', 'が', P('合わない'), BAAI, 'は', '、', '取り替える', 'と', '言っていました', '。'), 'Người ta nói trường hợp không vừa cỡ thì sẽ đổi.', [D33]),
        (s('道', 'が', '込んで', P('いる'), BAAI, 'は', '、', '電車', 'で', '行った', 'ほう', 'が', 'いい', 'でしょう', '。'), 'Trường hợp đường đông thì chắc nên đi tàu.', [A32, B32]),
        (s('パスポート', 'を', P('なくした'), BAAI, 'は', '、', '大使館', 'に', '行かなければ', 'なりません', '。'), 'Trường hợp mất hộ chiếu thì phải đến đại sứ quán.', [C17]),
        (s('領収書', 'が', '必要', NA, BAAI, 'は', '、', '言って', 'ください', '。'), 'Trường hợp cần hóa đơn thì hãy nói.', [B14]),
    ],
    notes='～場合は: trong trường hợp…. Danh từ + の場合, tính từ な + な場合.')

# ---------------------------------------------------------------------------
QB1 = s('どう', 'した', 'んですか', '。')
QB2 = s('試験', 'は', 'どうでしたか', '。')

p2 = point(45, 2, '～のに、～ (trái ý)', '…vậy mà…',
    'のに nối hai vế trái ngược với điều mong đợi, thường kèm cảm giác bất ngờ, bực bội, tiếc: '
    '約束を したのに、ミラーさんは 来ませんでした. Trước のに dùng thể thông thường; danh từ, tính từ な: なのに '
    '(日曜日なのに、会社へ 行きます). Vế sau không dùng ý muốn, nhờ vả.',
    [
        (s('約束', 'を', P('した'), NONI, '、', 'ミラーさん', 'は', '来ませんでした', '。'), 'Đã hẹn vậy mà anh Miller không đến.'),
        (s('一生懸命', P('勉強した'), NONI, '、', '試験', 'に', '合格しませんでした', '。'), 'Học hết sức vậy mà vẫn không đỗ.'),
        (s('今日', 'は', '日曜日', NA, NONI, '、', '会社', 'へ', '行かなければ', 'なりません', '。'), 'Hôm nay chủ nhật vậy mà phải đi làm.', [C17]),
        (s('この', '店', 'は', P('安い'), NONI, '、', 'お客さん', 'が', '少ない', 'です', '。'), 'Cửa hàng này rẻ vậy mà ít khách.'),
        (s('薬', 'を', P('飲んだ'), NONI, '、', 'まだ', '熱', 'が', 'あります', '。'), 'Đã uống thuốc vậy mà vẫn còn sốt.'),
        (s('ボタン', 'を', P('押した'), NONI, '、', '機械', 'が', '動きません', '。'), 'Đã ấn nút vậy mà máy không chạy.'),
        (s('春', NA, NONI, '、', '寒い', 'です', '。'), 'Đã sang xuân vậy mà vẫn lạnh.'),
        (s('たくさん', P('練習した'), NONI, '、', '試合', 'に', '負けました', '。'), 'Luyện tập nhiều vậy mà vẫn thua trận.'),
        (s('目覚まし', 'を', P('セットした'), NONI, '、', '起きられませんでした', '。'), 'Đã cài đồng hồ báo thức vậy mà không dậy được.'),
        (s('便利', NA, NONI, '、', 'この', '機械', 'は', 'あまり', '使われて', 'いません', '。'), 'Tiện lợi vậy mà máy này ít được dùng.', ['g37-03']),
        (s('急いで', P('行った'), NONI, '、', '電車', 'に', '間に合いませんでした', '。'), 'Đã đi vội vậy mà vẫn không kịp tàu.'),
        (s('夏', NA, NONI, '、', '涼しい', 'です', '。'), 'Mùa hè vậy mà trời mát.'),
        (s('お金', 'が', P('ない'), NONI, '、', '高い', '車', 'を', '買いました', '。'), 'Không có tiền vậy mà lại mua xe đắt.'),
        ans(['準備', 'を', P('した'), NONI, '、', 'パーティー', 'が', '中止', 'に', 'なった', 'んです', '。'], 'Đã chuẩn bị vậy mà bữa tiệc bị hủy.', [A26], QB1, 'Bạn bị sao vậy?',
            ['準備をしたので、パーティーが中止になったんです。', 'はい、中止です。', '*準備をしるのに、パーティーが中止になったんです。']),
        ans(['毎日', P('勉強した'), NONI, '、', 'だめ', 'でした', '。'], 'Ngày nào cũng học vậy mà không được.', [], QB2, 'Bài thi thế nào?',
            ['毎日勉強したから、だめでした。', 'はい、勉強しました。', '*毎日勉強するたのに、だめでした。']),
        (s('電話', 'を', P('かけた'), NONI, '、', '誰', 'も', '出ませんでした', '。'), 'Đã gọi điện vậy mà không ai nghe.'),
        (s('信じて', P('いた'), NONI, '、', 'うそ', 'でした', '。'), 'Tôi đã tin vậy mà đó là lời nói dối.'),
        (s('ちゃんと', P('用意した'), NONI, '、', '使いませんでした', '。'), 'Đã chuẩn bị đầy đủ vậy mà không dùng đến.'),
        (s('ミラーさん', 'は', 'お金', 'が', P('ある'), NONI, '、', 'いつも', '安い', '物', 'を', '買います', '。'), 'Anh Miller có tiền vậy mà lúc nào cũng mua đồ rẻ.'),
        (s('天気', 'が', P('いい'), NONI, '、', 'どこ', 'へ', 'も', '行きません', '。'), 'Trời đẹp vậy mà không đi đâu cả.', ['g05-02']),
        (s('静か', NA, NONI, '、', '寝られません', '。'), 'Yên tĩnh vậy mà không ngủ được.', [A27]),
        (s('一生懸命', P('説明した'), NONI, '、', 'わかって', 'もらえませんでした', '。'), 'Đã giải thích hết sức vậy mà không được hiểu cho.', [A27]),
        (s('あの', '人', 'は', '病気', NA, NONI, '、', '毎日', '働いて', 'います', '。'), 'Người đó bị ốm vậy mà ngày nào cũng làm việc.', [C15]),
        (s('手紙', 'を', P('書いた'), NONI, '、', '返事', 'が', '来ません', '。'), 'Đã viết thư vậy mà không có hồi âm.'),
        (s('この', '料理', 'は', P('高い'), NONI, '、', 'まずい', 'です', '。'), 'Món này đắt vậy mà dở.'),
        (s('約束', 'を', P('キャンセルした'), NONI, '、', '謝りませんでした', '。'), 'Hủy hẹn vậy mà không xin lỗi.'),
        (s('地図', 'を', P('見た'), NONI, '、', '道', 'を', 'まちがえました', '。'), 'Đã xem bản đồ vậy mà vẫn đi nhầm đường.'),
        (s('薬', 'を', P('飲んだ'), NONI, '、', 'まだ', '熱', 'が', 'ある', 'んです', '。'), 'Đã uống thuốc vậy mà vẫn còn sốt đấy.', [A26]),
        (s('一生懸命', P('練習した'), NONI, '、', '優勝できませんでした', '。'), 'Luyện tập hết sức vậy mà không giành được giải nhất.', [A27]),
        (s('日曜日', NA, NONI, '、', '残業しなければ', 'なりません', '。'), 'Chủ nhật vậy mà phải làm thêm giờ.', [C17]),
        (s('ケーキ', 'を', P('作った'), NONI, '、', '誰', 'も', '食べて', 'くれませんでした', '。'), 'Đã làm bánh vậy mà chẳng ai ăn cho.', ['g24-04']),
        (s('約束', 'を', P('した'), NONI, '、', 'ミラーさん', 'は', '来なかった', 'と', '言っていました', '。'), 'Người đó nói đã hẹn vậy mà anh Miller không đến.', [D33]),
        (s('目覚まし', 'を', P('セットした'), NONI, '、', '起きられなくて', '、', '会議', 'に', '遅れました', '。'), 'Đã cài báo thức vậy mà không dậy được nên trễ họp.', ['g39-01']),
        (s(P('安い'), NONI, '、', 'この', '店', 'は', 'いつも', 'すいて', 'います', '。'), 'Rẻ vậy mà cửa hàng này lúc nào cũng vắng.', ['g29-01']),
        (s('春', NA, NONI, '、', '雪', 'が', '降る', 'かもしれません', '。'), 'Đã sang xuân vậy mà có thể có tuyết.', ['g32-03']),
        (s('ちゃんと', P('説明した'), NONI, '、', 'わかって', 'もらえなかった', 'んです', '。'), 'Đã giải thích kỹ vậy mà vẫn không được hiểu cho.', [A26]),
        (s('たくさん', P('練習した'), NONI, '、', '試合', 'に', '負けて', 'しまいました', '。'), 'Luyện tập nhiều vậy mà vẫn thua trận mất rồi.', [B29]),
        (s('便利', NA, NONI, '、', 'あまり', '使われて', 'いない', 'でしょう', '。'), 'Tiện lợi vậy mà chắc ít được dùng.', ['g37-03', B32]),
        (s(P('急いだ'), NONI, '、', '電車', 'が', '出て', 'しまいました', '。'), 'Đã vội vậy mà tàu vẫn chạy mất.', [B29]),
        (s('一生懸命', P('頑張った'), NONI, '、', 'うまくいかなくて', '、', 'がっかりしました', '。'), 'Đã cố gắng hết sức vậy mà không suôn sẻ nên tôi thất vọng.', ['g39-01']),
    ],
    notes='のに: vậy mà (trái mong đợi). Danh từ, tính từ な: なのに. Vế sau không dùng ý muốn, nhờ vả.')

# Chủ dự án duyệt bài 45 ngày 2026-11-13
for _p in (p1, p2):
    _p['approved'] = True
write(45, [p1, p2])
