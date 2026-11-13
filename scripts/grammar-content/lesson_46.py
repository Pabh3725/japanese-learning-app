"""Ngữ pháp bài 46 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–46.
Chạy: python3 -I scripts/grammar-content/lesson_46.py  → data/grammar/lesson-46.json
Mỗi mẫu 40 câu (mức 1 = 1–13, mức 2 = 14–27, mức 3 = 28–40).
ところ: chỗ hỏi động từ chỉ dùng nhiễu dạng chia sai (thể từ điển／ている／た trước ところ đều đúng, khác nghĩa).
ばかり: nhiễu không dùng ところ (来たところです gần nghĩa). ところ／ばかり／はず là [W] (Chọn từ có hiện nghĩa).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import plain, point, use_lesson, write  # noqa: E402

use_lesson(46)


def P(text):
    return plain(text, te=False)


F8 = 'g08-06'
D9 = 'g09-04'
B14, C14 = 'g14-02', 'g14-03'
A16 = 'g16-01'
A21, B21, C21 = 'g21-01', 'g21-02', 'g21-03'
A22 = 'g22-01'
B25 = 'g25-02'
A26, B26 = 'g26-01', 'g26-02'
A27 = 'g27-01'
B29 = 'g29-02'
A32, B32, C32 = 'g32-01', 'g32-02', 'g32-03'
D33 = 'g33-04'
C39 = 'g39-03'
B43 = 'g43-02'
B45 = 'g45-02'
A, B = 'g46-01', 'g46-02'

TOKORO = '[W:ばかり,はず,とき]ところ'
BAKARI = '[W:はず,だけ,まで]ばかり'
HAZU = '[W:ところ,つもり,ばかり]はず'


def s(*parts):
    return '|'.join(parts)


def ans(parts, meaning, uses, q, qm, wrong):
    return (s(*parts), meaning, uses, (q, qm, wrong))


# ---------------------------------------------------------------------------
QA1 = s('もう', '昼ごはん', 'を', '食べましたか', '。')
QA2 = s('会議', 'は', 'もう', '始まりましたか', '。')

p1 = point(46, 1, 'V (từ điển／ている／た) ところです', 'Sắp… / Đang… / Vừa mới…',
    'ところです nói thời điểm của hành động: thể từ điển + ところ (sắp làm: これから 食べる ところです); '
    'V ている + ところ (đang làm đúng lúc này: 今 食べて いる ところです); thể た + ところ (vừa làm xong: 今 食べた ところです). '
    'Hay đi với これから, ちょうど, 今, たった今.',
    [
        (s('これから', '昼ごはん', 'を', P('食べる'), TOKORO, 'です', '。'), 'Tôi sắp ăn trưa.'),
        (s('今', '昼ごはん', 'を', '食べて', P('いる'), TOKORO, 'です', '。'), 'Tôi đang ăn trưa.'),
        (s('たった今', '昼ごはん', 'を', P('食べた'), TOKORO, 'です', '。'), 'Tôi vừa ăn trưa xong.'),
        (s('これから', P('出かける'), TOKORO, 'です', '。'), 'Tôi sắp ra ngoài.'),
        (s('今', 'うち', 'へ', P('帰った'), TOKORO, 'です', '。'), 'Tôi vừa về đến nhà.'),
        (s('ちょうど', '会議', 'が', P('始まる'), TOKORO, 'です', '。'), 'Cuộc họp vừa đúng sắp bắt đầu.'),
        (s('今', 'レポート', 'を', '書いて', P('いる'), TOKORO, 'です', '。'), 'Tôi đang viết báo cáo.'),
        (s('今', '駅', 'に', P('着いた'), TOKORO, 'です', '。'), 'Tôi vừa đến ga.'),
        (s('これから', 'パン', 'を', P('焼く'), TOKORO, 'です', '。'), 'Tôi sắp nướng bánh mì.'),
        (s('今', '原因', 'を', '調べて', P('いる'), TOKORO, 'です', '。'), 'Chúng tôi đang tìm nguyên nhân.'),
        (s('たった今', '会議', 'が', P('終わった'), TOKORO, 'です', '。'), 'Cuộc họp vừa kết thúc.'),
        (s('これから', 'データ', 'を', P('入力する'), TOKORO, 'です', '。'), 'Tôi sắp nhập dữ liệu.'),
        (s('今', 'そちら', 'に', '向かって', P('いる'), TOKORO, 'です', '。'), 'Tôi đang trên đường đến chỗ anh/chị.'),
        ans(['いいえ', '、', 'これから', P('食べる'), TOKORO, 'です', '。'], 'Chưa, tôi sắp ăn.', [], QA1, 'Bạn ăn trưa chưa?',
            ['はい、これから食べるところです。', 'いいえ、これから食べるところでした。', '*いいえ、これから食べりるところです。']),
        ans(['ええ', '、', 'たった今', P('始まった'), TOKORO, 'です', '。'], 'Vâng, vừa mới bắt đầu.', [], QA2, 'Cuộc họp đã bắt đầu chưa?',
            ['いいえ、たった今始まったところです。', 'ええ、たった今始まるはずです。', '*ええ、たった今始まりたところです。']),
        (s('今', 'ガスコンロ', 'を', '直して', P('いる'), TOKORO, 'です', '。'), 'Tôi đang sửa bếp ga.'),
        (s('ちょうど', '電話', 'を', P('かける'), TOKORO, 'でした', '。'), 'Tôi vừa đúng lúc định gọi điện.'),
        (s('今', '宅配便', 'が', P('届いた'), TOKORO, 'です', '。'), 'Hàng chuyển phát vừa tới.'),
        (s('これから', '注射', 'を', P('する'), TOKORO, 'です', '。'), 'Sắp tiêm đây.'),
        (s('今', 'パンフレット', 'を', '作って', P('いる'), TOKORO, 'です', '。'), 'Tôi đang làm tờ quảng cáo.'),
        (s('たった今', 'ミラーさん', 'が', P('帰った'), TOKORO, 'です', '。'), 'Anh Miller vừa mới về.'),
        (s('ちょうど', 'お茶', 'を', P('いれる'), TOKORO, 'です', '。'), 'Tôi vừa đúng lúc sắp pha trà.'),
        (s('今', '晩ごはん', 'を', '作って', P('いる'), TOKORO, 'です', '。'), 'Tôi đang nấu bữa tối.'),
        (s('今', 'ステレオ', 'の', '音', 'を', '調節して', P('いる'), TOKORO, 'です', '。'), 'Tôi đang chỉnh âm thanh dàn loa.'),
        (s('ちょうど', '雨', 'が', P('やんだ'), TOKORO, 'です', '。'), 'Mưa vừa tạnh đúng lúc.'),
        (s('これから', '部長', 'に', '書類', 'を', P('渡す'), TOKORO, 'です', '。'), 'Tôi sắp đưa giấy tờ cho trưởng phòng.'),
        (s('今', '子ども', 'が', P('寝た'), TOKORO, 'です', '。'), 'Con vừa ngủ.'),
        (s('今', '出かける', TOKORO, 'な', 'ので', '、', 'あとで', '電話', 'します', '。'), 'Tôi đang sắp ra ngoài nên lát nữa sẽ gọi lại.', [C39]),
        (s('今', '会議', 'を', 'して', P('いる'), TOKORO, 'だ', 'から', '、', '静か', 'に', 'して', 'ください', '。'), 'Đang họp nên hãy giữ yên lặng.', [D9, B14]),
        (s('ちょうど', '電話', 'を', P('かけよう'), 'と', '思って', 'いた', TOKORO, 'です', '。'), 'Tôi đúng lúc đang định gọi điện.', ['g31-02']),
        (s('たった今', '会議', 'が', P('終わった'), TOKORO, 'な', 'ので', '、', '少し', '休みます', '。'), 'Cuộc họp vừa kết thúc nên tôi nghỉ một chút.', [C39]),
        (s('今', '原因', 'を', '調べて', P('いる'), TOKORO, 'です', 'から', '、', '少し', '待って', 'いただけませんか', '。'), 'Chúng tôi đang tìm nguyên nhân, anh/chị đợi một chút được không ạ?', [D9, B26]),
        (s('これから', '晩ごはん', 'を', P('食べる'), TOKORO, 'です', 'が', '、', 'いっしょに', 'いかがですか', '。'), 'Tôi sắp ăn tối, anh/chị dùng cùng không ạ?', [F8]),
        (s('今', '駅', 'に', P('着いた'), TOKORO, 'だ', 'と', '言っていました', '。'), 'Người đó nói vừa đến ga.', [D33]),
        (s('今', '宿題', 'を', 'して', P('いる'), TOKORO, 'でしょう', '？'), 'Bây giờ bạn đang làm bài tập phải không?', [C21]),
        (s('ちょうど', '出かける', TOKORO, 'に', '、', '電話', 'が', 'かかって', 'きました', '。'), 'Đúng lúc tôi định ra ngoài thì có điện thoại gọi đến.', [B43]),
        (s('今', 'うち', 'へ', P('帰った'), TOKORO, 'な', 'のに', '、', 'また', '会社', 'へ', '行かなければ', 'なりません', '。'), 'Vừa về đến nhà vậy mà lại phải đến công ty.', [B45, 'g17-03']),
        (s('これから', 'データ', 'を', '入力する', TOKORO, 'です', 'から', '、', '終わったら', '連絡します', '。'), 'Tôi sắp nhập dữ liệu, xong sẽ liên lạc.', [D9, B25]),
        (s('今', 'パン', 'を', '焼いて', P('いる'), TOKORO, 'です', '。', 'もう', '少し', '待って', 'ください', '。'), 'Tôi đang nướng bánh. Đợi thêm chút nhé.', [B14]),
        (s('たった今', '帰って', P('きた'), TOKORO, 'です', '。'), 'Tôi vừa mới về.', [B43]),
    ],
    notes='Thể từ điển + ところ: sắp; ている + ところ: đang; thể た + ところ: vừa xong.')

# ---------------------------------------------------------------------------
QB1 = s('日本', 'の', '町', 'は', 'どうですか', '。')
QB2 = s('もう', '晩ごはん', 'を', '食べますか', '。')

p2 = point(46, 2, 'V た ばかりです', 'Vừa mới… (không lâu)',
    'Thể た + ばかりです: việc mới xảy ra chưa lâu theo cảm nhận của người nói (có thể vài ngày, vài tháng): '
    '先月 日本へ 来た ばかりです. Khác ～たところです (đúng ngay lúc vừa xong). '
    'Hay dùng để giải thích: 買った ばかりなのに、壊れて しまいました.',
    [
        (s('先月', '日本', 'へ', P('来た'), BAKARI, 'です', '。'), 'Tôi vừa mới sang Nhật tháng trước.'),
        (s('この', 'パソコン', 'は', '先週', P('買った'), BAKARI, 'です', '。'), 'Máy tính này tôi mới mua tuần trước.'),
        (s('さっき', '昼ごはん', 'を', P('食べた'), BAKARI, 'です', '。'), 'Tôi vừa mới ăn trưa lúc nãy.'),
        (s('先週', '会社', 'に', P('入った'), BAKARI, 'です', '。'), 'Tôi mới vào công ty tuần trước.'),
        (s('去年', P('結婚した'), BAKARI, 'です', '。'), 'Tôi mới kết hôn năm ngoái.'),
        (s('日本語', 'の', '勉強', 'を', P('始めた'), BAKARI, 'です', '。'), 'Tôi mới bắt đầu học tiếng Nhật.'),
        (s('この', 'アパート', 'に', '先月', P('引越しした'), BAKARI, 'です', '。'), 'Tôi mới chuyển đến căn hộ này tháng trước.'),
        (s('さっき', P('起きた'), BAKARI, 'です', '。'), 'Tôi vừa mới thức dậy.'),
        (s('この', '靴', 'は', 'きのう', P('買った'), BAKARI, 'です', '。'), 'Đôi giày này mới mua hôm qua.'),
        (s('この', '漢字', 'は', '先週', P('習った'), BAKARI, 'です', '。'), 'Chữ Hán này mới học tuần trước.'),
        (s('さっき', '薬', 'を', P('飲んだ'), BAKARI, 'です', '。'), 'Tôi vừa uống thuốc lúc nãy.'),
        (s('子ども', 'が', P('生まれた'), BAKARI, 'です', '。'), 'Con tôi mới chào đời.'),
        (s('この', '店', 'は', '先月', P('できた'), BAKARI, 'です', '。'), 'Cửa hàng này mới mở tháng trước.'),
        ans(['まだ', '先月', P('来た'), BAKARI, 'です', 'から', '、', 'よく', 'わかりません', '。'], 'Tôi mới đến tháng trước nên chưa rõ lắm.', [D9], QB1, 'Thị trấn ở Nhật thế nào?',
            ['まだ先月来たはずですから、よくわかりません。', 'はい、来ました。', '*まだ先月来るたばかりですから、よくわかりません。']),
        ans(['いいえ', '、', 'さっき', P('食べた'), BAKARI, 'です', '。'], 'Không, tôi vừa ăn lúc nãy.', [], QB2, 'Bạn ăn tối chưa?',
            ['はい、さっき食べたばかりです。', 'いいえ、さっき食べるばかりです。', '*いいえ、さっき食べりたばかりです。']),
        (s('さっき', '注射', 'を', P('した'), BAKARI, 'です', '。'), 'Vừa mới tiêm lúc nãy.'),
        (s('この', 'ステレオ', 'は', '先週', P('買った'), BAKARI, 'です', '。'), 'Dàn loa này mới mua tuần trước.'),
        (s('ミラーさん', 'は', '先週', '退院した', BAKARI, 'です', '。'), 'Anh Miller mới xuất viện tuần trước.'),
        (s('この', 'システム', 'は', '先月', P('入れた'), BAKARI, 'です', '。'), 'Hệ thống này mới được lắp tháng trước.'),
        (s('さっき', '会議', 'が', P('終わった'), BAKARI, 'です', '。'), 'Cuộc họp vừa kết thúc lúc nãy.'),
        (s('この', '辞書', 'は', '先週', P('借りた'), BAKARI, 'です', '。'), 'Cuốn từ điển này mới mượn tuần trước.'),
        (s('去年', '大学', 'を', P('卒業した'), BAKARI, 'です', '。'), 'Tôi mới tốt nghiệp đại học năm ngoái.'),
        (s('さっき', 'シャワー', 'を', P('浴びた'), BAKARI, 'です', '。'), 'Tôi vừa tắm xong lúc nãy.'),
        (s('この', 'ガスコンロ', 'は', '先月', P('直した'), BAKARI, 'です', '。'), 'Cái bếp ga này mới sửa tháng trước.'),
        (s('この', '町', 'に', '先週', P('来た'), BAKARI, 'です', '。'), 'Tôi mới đến thị trấn này tuần trước.'),
        (s('さっき', 'パン', 'を', P('焼いた'), BAKARI, 'です', '。'), 'Tôi vừa nướng bánh mì lúc nãy.'),
        (s('この', '資料', 'は', 'きのう', P('もらった'), BAKARI, 'です', '。'), 'Tài liệu này mới nhận hôm qua.'),
        (s('きのう', P('買った'), BAKARI, 'な', 'のに', '、', 'もう', '壊れて', 'しまいました', '。'), 'Mới mua hôm qua vậy mà đã hỏng mất rồi.', [B45, B29]),
        (s('日本', 'へ', P('来た'), BAKARI, 'な', 'ので', '、', 'まだ', '日本語', 'が', '話せません', '。'), 'Mới sang Nhật nên tôi chưa nói được tiếng Nhật.', [C39, A27]),
        (s('さっき', '食べた', BAKARI, 'だ', 'から', '、', 'まだ', '何', 'も', '食べられません', '。'), 'Vừa ăn xong nên giờ chưa ăn thêm được gì.', [D9]),
        (s('先月', '会社', 'に', P('入った'), BAKARI, 'です', 'から', '、', 'いろいろ', '教えて', 'ください', '。'), 'Tôi mới vào công ty tháng trước nên xin chỉ bảo nhiều.', [D9, B14]),
        (s('先週', '退院した', BAKARI, 'だ', 'から', '、', '無理', 'を', 'しない', 'ほう', 'が', 'いい', 'です', '。'), 'Mới xuất viện tuần trước nên đừng làm quá sức.', [D9, A32]),
        (s('日本語', 'の', '勉強', 'を', P('始めた'), BAKARI, 'だ', 'と', '言っていました', '。'), 'Người đó nói mới bắt đầu học tiếng Nhật.', [D33]),
        (s('この', 'パソコン', 'は', P('買った'), BAKARI, 'な', 'ので', '、', 'まだ', '使い方', 'が', 'わかりません', '。'), 'Máy tính này mới mua nên tôi chưa biết cách dùng.', [C39]),
        (s('子ども', 'が', P('生まれた'), BAKARI, 'で', '、', '毎日', '忙しい', 'です', '。'), 'Con mới sinh nên ngày nào cũng bận.', ['g16-02']),
        (s('さっき', P('起きた'), BAKARI, 'な', 'ので', '、', 'まだ', '眠い', 'です', '。'), 'Vừa mới dậy nên vẫn còn buồn ngủ.', [C39]),
        (s('この', '店', 'は', P('できた'), BAKARI, 'な', 'ので', '、', 'いつも', '込んで', 'います', '。'), 'Cửa hàng này mới mở nên lúc nào cũng đông.', [C39, 'g29-01']),
        (s('引越しした', BAKARI, 'で', '、', 'まだ', '近所', 'の', '人', 'を', '知りません', '。'), 'Mới chuyển nhà nên tôi chưa biết hàng xóm.', ['g16-02']),
        (s('結婚した', BAKARI, 'な', 'のに', '、', 'もう', 'けんか', 'を', 'して', 'いる', 'んですか', '。'), 'Mới cưới vậy mà đã cãi nhau rồi à?', [B45, A26]),
        (s('この', '漢字', 'は', '先週', P('習った'), BAKARI, 'な', 'のに', '、', 'もう', '忘れて', 'しまいました', '。'), 'Chữ Hán này mới học tuần trước vậy mà tôi đã quên mất.', [B45, B29]),
    ],
    notes='V た ばかりです: vừa mới (theo cảm nhận). ～たところです: đúng lúc vừa xong.')

# ---------------------------------------------------------------------------
QC1 = s('ミラーさん', 'は', 'パーティー', 'に', '来ますか', '。')
QC2 = s('荷物', 'は', 'いつ', '届きますか', '。')

p3 = point(46, 3, '～はずです', 'Chắc chắn là… (có căn cứ)',
    'はずです: người nói tin chắc dựa trên căn cứ, thông tin đã có: ミラーさんは 来る はずです (anh ấy nói sẽ đến). '
    'Trước はず dùng thể thông thường; danh từ + の (休みの はず), tính từ な + な. Phủ định: ～はずが ありません.',
    [
        (s('ミラーさん', 'は', 'パーティー', 'に', P('来る'), HAZU, 'です', '。'), 'Chắc chắn anh Miller sẽ đến bữa tiệc.'),
        (s('荷物', 'は', 'あした', P('届く'), HAZU, 'です', '。'), 'Chắc chắn mai hàng sẽ tới.'),
        (s('ワンさん', 'は', 'この', 'ニュース', 'を', '知って', P('いる'), HAZU, 'です', '。'), 'Chắc chắn anh Wang biết tin này.'),
        (s('会議', 'は', '3', '時', 'に', P('終わる'), HAZU, 'です', '。'), 'Chắc chắn cuộc họp sẽ xong lúc 3 giờ.'),
        (s('あの', '店', 'は', '日曜日', 'も', '開いて{あいて}', P('いる'), HAZU, 'です', '。'), 'Chắc chắn cửa hàng kia chủ nhật cũng mở cửa.'),
        (s('カリナさん', 'は', 'もう', P('帰った'), HAZU, 'です', '。'), 'Chắc chắn chị Karina đã về rồi.'),
        (s('この', '道', 'を', '行けば', '、', '駅', 'に', P('着く'), HAZU, 'です', '。'), 'Đi đường này thì chắc chắn sẽ đến ga.', ['g35-01']),
        (s('あした', 'は', '休み', 'の', HAZU, 'です', '。'), 'Chắc chắn mai là ngày nghỉ.'),
        (s('この', '機械', 'は', P('使える'), HAZU, 'です', '。'), 'Cái máy này chắc chắn dùng được.'),
        (s('ミラーさん', 'は', '日本語', 'が', '上手', 'な', HAZU, 'です', '。'), 'Chắc chắn anh Miller giỏi tiếng Nhật.'),
        (s('薬', 'を', '飲んだ', 'から', '、', 'すぐ', P('治る'), HAZU, 'です', '。'), 'Đã uống thuốc nên chắc chắn sẽ khỏi ngay.', [D9]),
        (s('この', '辞書', 'は', '先生', 'の', HAZU, 'です', '。'), 'Cuốn từ điển này chắc chắn là của thầy.'),
        (s('ワンさん', 'は', '今', '会社', 'に', P('いる'), HAZU, 'です', '。'), 'Chắc chắn bây giờ anh Wang đang ở công ty.'),
        ans(['ええ', '、', '来る', 'と', '言って', 'いました', 'から', '、', P('来る'), HAZU, 'です', '。'], 'Vâng, anh ấy đã nói sẽ đến nên chắc chắn sẽ đến.', [D9, 'g33-04'], QC1, 'Anh Miller có đến dự tiệc không?',
            ['ええ、来ると言っていましたから、来るつもりです。', 'いいえ、来るはずです。', '*ええ、来ると言っていましたから、来りるはずです。']),
        ans(['あした', 'の', '朝', P('届く'), HAZU, 'です', '。'], 'Chắc chắn sáng mai sẽ tới.', [], QC2, 'Khi nào hàng tới?',
            ['あしたの朝届くところです。', 'はい、届きます。', '*あしたの朝届きるはずです。']),
        (s('この', '時間', 'なら', '、', '道', 'は', 'すいて', P('いる'), HAZU, 'です', '。'), 'Giờ này thì chắc chắn đường vắng.', ['g35-02']),
        (s('ミラーさん', 'は', '先月', '退院した', 'から', '、', 'もう', '元気', 'な', HAZU, 'です', '。'), 'Anh Miller xuất viện tháng trước nên chắc chắn đã khỏe.', [D9]),
        (s('宅配便', 'は', '今日', P('来る'), HAZU, 'です', '。'), 'Chắc chắn hôm nay hàng chuyển phát sẽ tới.'),
        (s('説明書', 'の', 'とおりに', 'すれば', '、', '動く', HAZU, 'です', '。'), 'Làm đúng sách hướng dẫn thì chắc chắn sẽ chạy.', ['g34-01', 'g35-01']),
        (s('会議', 'の', '資料', 'は', 'もう', 'できて', P('いる'), HAZU, 'です', '。'), 'Chắc chắn tài liệu cuộc họp đã xong rồi.'),
        (s('あの', '人', 'は', 'この', '会社', 'の', '社長', 'の', HAZU, 'です', '。'), 'Người kia chắc chắn là giám đốc công ty này.'),
        (s('カリナさん', 'は', '絵', 'が', '上手', 'な', HAZU, 'です', '。'), 'Chắc chắn chị Karina vẽ giỏi.'),
        (s('この', '答え', 'は', P('正しい'), HAZU, 'です', '。'), 'Câu trả lời này chắc chắn đúng.'),
        (s('ワンさん', 'は', '毎日', '練習して', 'いる', 'から', '、', '上手', 'な', HAZU, 'です', '。'), 'Anh Wang ngày nào cũng luyện tập nên chắc chắn giỏi.', [D9]),
        (s('飛行機', 'は', 'もう', P('着いた'), HAZU, 'です', '。'), 'Chắc chắn máy bay đã đến rồi.'),
        (s('あの', '店', 'は', 'まだ', '開いて{あいて}', P('いる'), HAZU, 'です', '。'), 'Cửa hàng kia chắc chắn vẫn còn mở.'),
        (s('先生', 'は', '研究室', 'に', P('いる'), HAZU, 'です', '。'), 'Thầy chắc chắn đang ở phòng nghiên cứu.'),
        (s('ミラーさん', 'は', '来る', 'と', '言いました', 'から', '、', P('来る'), HAZU, 'です', 'が', '、', 'まだ', '来ません', '。'), 'Anh Miller đã nói sẽ đến nên chắc chắn sẽ đến, nhưng vẫn chưa thấy.', [D9, F8]),
        (s('荷物', 'は', 'きのう', '送った', 'から', '、', 'あした', P('届く'), HAZU, 'です', '。'), 'Hàng đã gửi hôm qua nên chắc chắn mai sẽ tới.', [D9]),
        (s('この', '機械', 'は', '直した', 'ばかり', 'だ', 'から', '、', 'ちゃんと', P('動く'), HAZU, 'です', '。'), 'Máy này mới sửa nên chắc chắn chạy tốt.', [B, D9]),
        (s('ワンさん', 'は', 'ニュース', 'を', '見た', 'から', '、', '知って', P('いる'), HAZU, 'です', '。'), 'Anh Wang đã xem tin tức nên chắc chắn biết.', [D9]),
        (s('今', '出れば', '、', '電車', 'に', P('間に合う'), HAZU, 'です', '。'), 'Nếu đi bây giờ thì chắc chắn kịp tàu.', ['g35-01']),
        (s('あした', 'は', '日曜日', 'だ', 'から', '、', '銀行', 'は', '休み', 'の', HAZU, 'です', '。'), 'Mai là chủ nhật nên ngân hàng chắc chắn nghỉ.', [D9]),
        (s('カリナさん', 'は', '日本', 'に', '10', '年', '住んで', 'いる', 'から', '、', '日本語', 'が', '上手', 'な', HAZU, 'です', '。'), 'Chị Karina sống ở Nhật 10 năm nên chắc chắn giỏi tiếng Nhật.', [D9]),
        (s('会議', 'は', 'もう', P('始まった'), HAZU, 'だ', 'と', '言っていました', '。'), 'Người ta nói cuộc họp chắc chắn đã bắt đầu rồi.', [D33]),
        (s('ミラーさん', 'は', '今', '会議', '中', 'の', HAZU, 'な', 'ので', '、', 'あとで', '電話', 'します', '。'), 'Anh Miller chắc chắn đang họp nên tôi sẽ gọi sau.', [C39]),
        (s('薬', 'を', '飲んだ', 'から', '、', '熱', 'は', 'もう', P('下がった'), HAZU, 'です', '。'), 'Đã uống thuốc nên chắc chắn đã hạ sốt rồi.', [D9]),
        (s('ワンさん', 'は', '来る', HAZU, 'です', 'が', '、', 'もしかしたら', '遅れる', 'かもしれません', '。'), 'Anh Wang chắc chắn sẽ đến, nhưng biết đâu sẽ muộn.', [F8, C32]),
        (s('あの', '店', 'は', '安い', HAZU, 'な', 'のに', '、', '高かった', 'です', '。'), 'Cửa hàng kia lẽ ra phải rẻ vậy mà lại đắt.', [B45]),
        (s('会議', 'は', '3', '時', 'に', P('終わる'), HAZU, 'だ', 'から', '、', 'そのあと', '電話', 'を', 'ください', '。'), 'Cuộc họp chắc chắn xong lúc 3 giờ nên sau đó hãy gọi cho tôi.', [D9, B14]),
    ],
    notes='はずです: chắc chắn (có căn cứ). Danh từ + のはず, tính từ な + なはず.')

# Chủ dự án duyệt bài 46 ngày 2026-11-13
for _p in (p1, p2, p3):
    _p['approved'] = True
write(46, [p1, p2, p3])
