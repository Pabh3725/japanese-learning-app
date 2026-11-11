"""Ngữ pháp bài 5 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–5.
Chạy: python3 -I scripts/grammar-content/lesson_05.py  → data/grammar/lesson-05.json
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(5)
A1, C1, D1, E1 = 'g01-01', 'g01-03', 'g01-04', 'g01-05'
D2 = 'g02-04'
B3, E3 = 'g03-02', 'g03-05'
B4, C4, D4, E4, F4 = 'g04-02', 'g04-03', 'g04-04', 'g04-05', 'g04-06'
A, B, C, D = 'g05-01', 'g05-02', 'g05-03', 'g05-04'

HE = '[P:の,と,か/に]へ'      # へ: に cũng đúng
MO = '[P:は,の,と]も'          # どこへも / 誰も
DE = '[P:の,と,か]で'          # phương tiện
TO = '[P:の,か,に]と'          # cùng ai


def s(*parts):
    return '|'.join(parts)


def plain(p):
    return p.split('{')[0].split(']')[-1]


def ans(parts, meaning, uses, q, qm):
    """Câu đáp cho câu hỏi có từ để hỏi. Câu đáp sai: thêm はい; thay trợ từ được hỏi bằng đáp án nhiễu đầu tiên; biến thành câu hỏi."""
    text = ''.join(plain(p) for p in parts)
    swapped = ''.join(p.split(':')[1].split(',')[0] if p.startswith('[P:') else plain(p) for p in parts)
    return (s(*parts), meaning, uses, (q, qm, [f'はい、{text}', swapped, text.replace('。', 'か。', 1) if text.count('。') == 1 else text[:-1] + 'か。']))


# ---------------------------------------------------------------------------
def go(subj, *rest):
    return s(subj, 'は', *rest, '。')


p1 = point(5, 1, 'N (nơi chốn) へ 行きます／来ます／帰ります', 'Đi / đến / về N',
    'へ (đọc là "e") đứng sau nơi chốn để chỉ hướng di chuyển với động từ 行きます (đi), 来ます (đến), 帰ります (về): '
    '学校へ行きます (đi đến trường), うちへ帰ります (về nhà). Có thể dùng に thay cho へ. Hỏi nơi đến bằng どこへ.',
    [
        (go('私', '学校', HE, '行きます'), 'Tôi đi đến trường.'),
        (go('私', '駅', HE, '行きます'), 'Tôi đi đến nhà ga.'),
        (go('私', 'スーパー', HE, '行きます'), 'Tôi đi đến siêu thị.'),
        (go('私', 'うち', HE, '帰ります'), 'Tôi về nhà.'),
        (go('ミラーさん', '日本', HE, '来ました'), 'Anh Miller đã đến Nhật.', [B4]),
        (go('私', '銀行', HE, '行きました'), 'Tôi đã đi đến ngân hàng.', [B4]),
        (go('カリナさん', '図書館', HE, '行きます'), 'Chị Karina đi đến thư viện.'),
        (go('私', 'あした', '会社', HE, '行きません'), 'Ngày mai tôi không đi đến công ty.', [B4]),
        (go('サントスさん', 'ブラジル', HE, '帰ります'), 'Anh Santos về Brazil.'),
        (go('私', 'デパート', HE, '行きました'), 'Tôi đã đi đến cửa hàng bách hóa.', [B4]),
        (go('私', '来週', 'ペキン', HE, '行きます'), 'Tuần sau tôi đi Bắc Kinh.'),
        (s('きのう', 'どこ', HE, '行きました', 'か', '。'), 'Hôm qua bạn đã đi đâu?', [B4, C1]),
        ans(['美術館', HE, '行きました', '。'], 'Tôi đã đi đến bảo tàng.', [B4], s('きのう', 'どこ', 'へ', '行きました', 'か', '。'), 'Hôm qua bạn đã đi đâu?'),
        (go('ワンさん', '先月', '日本', HE, '来ました'), 'Tháng trước anh Wang đã đến Nhật.', [B4]),
        (go('私', '毎日', '9', '時', 'に', '会社', HE, '行きます'), 'Ngày nào tôi cũng đi đến công ty lúc 9 giờ.', [C4]),
        (s('あした', 'どこ', HE, '行きます', 'か', '。'), 'Ngày mai bạn đi đâu?', [C1]),
        ans(['郵便局', HE, '行きます', '。'], 'Tôi đi đến bưu điện.', [A1], s('あした', 'どこ', 'へ', '行きます', 'か', '。'), 'Ngày mai bạn đi đâu?'),
        (go('私', '去年', '日本', HE, '来ました'), 'Năm ngoái tôi đã đến Nhật.', [B4]),
        (go('カリナさん', '5', '時', 'に', 'うち', HE, '帰りました'), 'Chị Karina đã về nhà lúc 5 giờ.', [C4]),
        (s('来月', 'アメリカ', HE, '帰ります', '。'), 'Tháng sau tôi về Mỹ.'),
        (go('ミラーさん', '3', '月', '25', '日', 'に', '日本', HE, '来ました'), 'Anh Miller đã đến Nhật vào ngày 25 tháng 3.', [C4]),
        (go('私', '毎朝', '8', '時', 'に', '学校', HE, '行きます'), 'Mỗi sáng tôi đi đến trường lúc 8 giờ.', [C4]),
        (go('タワポンさん', '来年', 'タイ', HE, '帰ります'), 'Năm sau anh Thawaphon về Thái Lan.', [B4]),
        (s('きのう', 'は', '銀行', 'と', '郵便局', HE, '行きました', '。'), 'Hôm qua tôi đã đi đến ngân hàng và bưu điện.', [E4]),
        (s('先週', 'の', '日曜日', 'に', 'ペキン', HE, '行きました', '。'), 'Chủ nhật tuần trước tôi đã đi Bắc Kinh.', [C4, E1]),
        (s('あした', 'は', '会社', HE, '行きません', '。', '休みます', '。'), 'Ngày mai tôi không đi đến công ty. Tôi nghỉ.', [B4]),
        (s('駅', 'は', 'あそこ', 'です', '。', '私', 'も', '駅', HE, '行きます', '。'), 'Nhà ga ở đằng kia. Tôi cũng đi đến nhà ga.', [B3, D1]),
        (go('カリナさん', '先週', 'インドネシア', HE, '帰りました'), 'Tuần trước chị Karina đã về Indonesia.', [B4]),
        (go('私', '毎晩', '10', '時', 'に', 'うち', HE, '帰ります'), 'Tối nào tôi cũng về nhà lúc 10 giờ.', [C4]),
        (s('来週', 'の', '月曜日', 'に', '会社', HE, '来ます', 'か', '。'), 'Thứ hai tuần sau bạn có đến công ty không?', [C1, C4]),
    ],
    notes='へ là trợ từ nên đọc "e" nhưng viết bằng chữ へ.')

# ---------------------------------------------------------------------------
def nowhere(*before, past=False):
    verb = '行きませんでした' if past else '行きません'
    return s(*before, 'どこ', 'へ', MO, verb, '。')


def nobody(*before, past=True):
    verb = '来ませんでした' if past else '来ません'
    return s(*before, '誰', MO, verb, '。')


p2 = point(5, 2, 'どこ(へ)も／誰も ～ません', 'Không đi đâu cả / không ai cả',
    'Từ để hỏi + も + động từ phủ định nghĩa là "hoàn toàn không": どこ(へ)も行きません (không đi đâu cả), '
    '誰も来ませんでした (không ai đến cả). Với động từ chỉ hướng, へ có thể có hoặc không: どこへも = どこも. '
    'Câu phải ở thể phủ định.',
    [
        (nowhere('私', 'は'), 'Tôi không đi đâu cả.'),
        (nowhere('きのう', past=True), 'Hôm qua tôi đã không đi đâu cả.'),
        (nowhere('あした'), 'Ngày mai tôi không đi đâu cả.'),
        (nowhere('土曜日', 'は'), 'Thứ bảy tôi không đi đâu cả.'),
        (nobody(), 'Không ai đến cả.'),
        (nobody('きのう'), 'Hôm qua không có ai đến.'),
        (nowhere('先週', 'は', past=True), 'Tuần trước tôi đã không đi đâu cả.'),
        (nobody('今日', 'は', past=False), 'Hôm nay không có ai đến.'),
        (nowhere('ミラーさん', 'は', past=True), 'Anh Miller đã không đi đâu cả.'),
        (nowhere('カリナさん', 'は', '日曜日'), 'Chủ nhật chị Karina không đi đâu cả.'),
        (s('きのう', 'どこ', 'へ', '行きました', 'か', '。'), 'Hôm qua bạn đã đi đâu?', [A, B4, C1]),
        ans(['どこ', 'へ', MO, '行きませんでした', '。'], 'Tôi đã không đi đâu cả.', [A, B4], s('きのう', 'どこ', 'へ', '行きました', 'か', '。'), 'Hôm qua bạn đã đi đâu?'),
        (s('日曜日', 'どこ', 'へ', '行きます', 'か', '。'), 'Chủ nhật bạn đi đâu?', [A, C1]),
        ans(['日曜日', 'は', 'どこ', 'へ', MO, '行きません', '。'], 'Chủ nhật tôi không đi đâu cả.', [A, B4], s('日曜日', 'どこ', 'へ', '行きます', 'か', '。'), 'Chủ nhật bạn đi đâu?'),
        (nowhere('先週', 'の', '土曜日', 'は', past=True), 'Thứ bảy tuần trước tôi đã không đi đâu cả.', [E1]),
        (nowhere('ワンさん', 'は', '来週'), 'Tuần sau anh Wang không đi đâu cả.'),
        (nowhere('ゆうべ', 'は', past=True), 'Tối qua tôi đã không đi đâu cả.'),
        (nowhere('今月', 'は'), 'Tháng này tôi không đi đâu cả.'),
        (nowhere('去年', 'は', past=True), 'Năm ngoái tôi đã không đi đâu cả.'),
        (nobody('あさって', 'は', past=False), 'Ngày mốt không có ai đến.'),
        (s('きのう', 'は', 'どこ', 'へ', 'も', '行きませんでした', '。', '今日', MO, '行きません', '。'), 'Hôm qua tôi đã không đi đâu cả. Hôm nay tôi cũng không đi.', [B4, D1]),
        (s('日曜日', 'は', 'どこ', 'へ', MO, '行きません', '。', '月曜日', 'に', '学校', 'へ', '行きます', '。'), 'Chủ nhật tôi không đi đâu cả. Thứ hai tôi đi đến trường.', [A, C4]),
        (s('あした', 'どこ', 'へ', '行きます', 'か', '。'), 'Ngày mai bạn đi đâu?', [A, C1]),
        ans(['あした', 'は', 'どこ', 'へ', MO, '行きません', '。', '休みます', '。'], 'Ngày mai tôi không đi đâu cả. Tôi nghỉ.', [A, B4],
            s('あした', 'どこ', 'へ', '行きます', 'か', '。'), 'Ngày mai bạn đi đâu?'),
        (s('今日', 'は', '誰', MO, '来ませんでした', 'ね', '。'), 'Hôm nay không có ai đến nhỉ.', [F4]),
        (s('ミラーさん', 'も', 'どこ', 'へ', MO, '行きませんでした', '。'), 'Anh Miller cũng đã không đi đâu cả.', [D1]),
        (nobody('先週', 'の', '日曜日', 'は'), 'Chủ nhật tuần trước không có ai đến.', [E1]),
        (nowhere('昼休み', 'は'), 'Giờ nghỉ trưa tôi không đi đâu cả.', [B4]),
        (s('休み', 'は', '金曜日', 'から', '日曜日', 'まで', 'です', '。', 'どこ', 'へ', MO, '行きません', '。'), 'Kỳ nghỉ từ thứ sáu đến chủ nhật. Tôi không đi đâu cả.', [D4]),
        (nowhere('カリナさん', 'と', 'イーさん', 'は', 'きのう', past=True), 'Hôm qua chị Karina và chị Lee đã không đi đâu cả.', [E4]),
    ],
    notes='Không dùng どこへも với câu khẳng định: どこへも行きます là sai.')

# ---------------------------------------------------------------------------
def by(subj, vehicle, place, verb):
    return s(subj, 'は', vehicle, DE, place, 'へ', verb, '。')


p3 = point(5, 3, 'N (phương tiện) で 行きます／来ます／帰ります', 'Đi / đến / về bằng N',
    'で đứng sau phương tiện giao thông để chỉ cách di chuyển: 電車で会社へ行きます (đi đến công ty bằng tàu điện). '
    'Đi bộ thì nói 歩いて行きます, KHÔNG dùng で. Hỏi bằng 何で: 何で行きますか (bạn đi bằng gì?).',
    [
        (by('私', '電車', '会社', '行きます'), 'Tôi đi đến công ty bằng tàu điện.', [A]),
        (by('私', 'バス', '学校', '行きます'), 'Tôi đi đến trường bằng xe buýt.', [A]),
        (by('私', '自転車', '駅', '行きます'), 'Tôi đi đến nhà ga bằng xe đạp.', [A]),
        (by('私', '地下鉄', '銀行', '行きます'), 'Tôi đi đến ngân hàng bằng tàu điện ngầm.', [A]),
        (by('ミラーさん', 'タクシー', 'うち', '帰りました'), 'Anh Miller đã về nhà bằng tắc-xi.', [A, B4]),
        (by('私', '新幹線', '新大阪', '行きます'), 'Tôi đi đến Shin-Osaka bằng tàu Shinkansen.', [A]),
        (by('サントスさん', '飛行機', 'ブラジル', '帰ります'), 'Anh Santos về Brazil bằng máy bay.', [A]),
        (by('カリナさん', '電車', '図書館', '行きます'), 'Chị Karina đi đến thư viện bằng tàu điện.', [A]),
        (by('私', '船', '日本', '来ました'), 'Tôi đã đến Nhật bằng tàu thủy.', [A, B4]),
        (by('ワンさん', 'バス', '病院', '行きます'), 'Anh Wang đi đến bệnh viện bằng xe buýt.', [A]),
        (s('私', 'は', '歩いて', 'うち', 'へ', '帰ります', '。'), 'Tôi đi bộ về nhà.', [A]),
        (s('何', DE, '行きます', 'か', '。'), 'Bạn đi bằng gì?', [C1]),
        ans(['電車', DE, '行きます', '。'], 'Tôi đi bằng tàu điện.', [A1], s('何', 'で', '行きます', 'か', '。'), 'Bạn đi bằng gì?'),
        (s('何', DE, '日本', 'へ', '来ました', 'か', '。'), 'Bạn đã đến Nhật bằng gì?', [A, B4, C1]),
        ans(['飛行機', DE, '来ました', '。'], 'Tôi đã đến bằng máy bay.', [B4], s('何', 'で', '日本', 'へ', '来ました', 'か', '。'), 'Bạn đã đến Nhật bằng gì?'),
        (s('私', 'は', 'きのう', 'タクシー', DE, '会社', 'へ', '行きました', '。'), 'Hôm qua tôi đã đi đến công ty bằng tắc-xi.', [A, B4]),
        (s('駅', 'まで', '何', DE, '行きます', 'か', '。'), 'Bạn đi đến nhà ga bằng gì?', [C1, D4]),
        (s('歩いて', '行きます', '。'), 'Tôi đi bộ.', [A],
         (s('駅', 'まで', '何', 'で', '行きます', 'か', '。'), 'Bạn đi đến nhà ga bằng gì?', ['はい、歩いて行きます。', '歩いてで行きます。', '歩いて行きますか。'])),
        (s('私', 'は', '毎日', '地下鉄', DE, '会社', 'へ', '行きます', '。'), 'Ngày nào tôi cũng đi đến công ty bằng tàu điện ngầm.', [A]),
        (s('私', 'は', '自転車', DE, '行きません', '。', 'バス', 'で', '行きます', '。'), 'Tôi không đi bằng xe đạp. Tôi đi bằng xe buýt.', [B4]),
        (s('ミラーさん', 'は', '毎朝', '8', '時', 'に', '電車', DE, '会社', 'へ', '行きます', '。'), 'Mỗi sáng anh Miller đi đến công ty bằng tàu điện lúc 8 giờ.', [A, C4]),
        (s('来月', '飛行機', DE, 'アメリカ', 'へ', '帰ります', '。'), 'Tháng sau tôi về Mỹ bằng máy bay.', [A]),
        (s('電車', DE, '行きます', 'か', '、', 'バス', 'で', '行きます', 'か', '。'), 'Bạn đi bằng tàu điện hay bằng xe buýt?', [D2]),
        ans(['バス', DE, '行きます', '。'], 'Tôi đi bằng xe buýt.', [A1], s('電車', 'で', '行きます', 'か', '、', 'バス', 'で', '行きます', 'か', '。'), 'Bạn đi bằng tàu điện hay bằng xe buýt?'),
        (s('きのう', 'は', 'バス', 'で', '行きました', '。', '今日', 'も', 'バス', DE, '行きます', '。'), 'Hôm qua tôi đã đi bằng xe buýt. Hôm nay tôi cũng đi bằng xe buýt.', [B4, D1]),
        (s('駅', 'から', '学校', 'まで', '歩いて', '行きます', '。'), 'Tôi đi bộ từ nhà ga đến trường.', [D4]),
        (s('駅', 'まで', 'バス', DE, '行きます', '。', '駅', 'から', '電車', 'で', '行きます', '。'), 'Tôi đi đến nhà ga bằng xe buýt. Từ nhà ga tôi đi bằng tàu điện.', [D4]),
        (by('ワンさん', 'タクシー', '病院', '来ました'), 'Anh Wang đã đến bệnh viện bằng tắc-xi.', [A, B4]),
        (s('何', DE, 'うち', 'へ', '帰ります', 'か', '。'), 'Bạn về nhà bằng gì?', [A, C1]),
        ans(['地下鉄', DE, '帰ります', '。'], 'Tôi về bằng tàu điện ngầm.', [A1], s('何', 'で', 'うち', 'へ', '帰ります', 'か', '。'), 'Bạn về nhà bằng gì?'),
    ],
    notes='歩いて行きます (đi bộ) không có で.')

# ---------------------------------------------------------------------------
def withp(subj, person, *rest):
    return s(subj, 'は', person, TO, *rest, '。')


p4 = point(5, 4, 'N (người) と V', 'Làm V cùng với N',
    'と đứng sau người cùng làm hành động: 友達と学校へ行きます (đi đến trường cùng bạn). '
    'Hỏi bằng 誰と: 誰と行きますか (bạn đi cùng ai?). Khác với と nối hai danh từ ở bài 4 (ミラーさんとサントスさん).',
    [
        (withp('私', '友達', '学校', 'へ', '行きます'), 'Tôi đi đến trường cùng bạn.', [A]),
        (withp('私', '家族', '日本', 'へ', '来ました'), 'Tôi đã đến Nhật cùng gia đình.', [A, B4]),
        (withp('ミラーさん', '彼女', 'デパート', 'へ', '行きました'), 'Anh Miller đã đi cửa hàng bách hóa cùng bạn gái.', [A, B4]),
        (withp('カリナさん', '友達', '図書館', 'へ', '行きます'), 'Chị Karina đi thư viện cùng bạn.', [A]),
        (withp('私', '彼', '美術館', 'へ', '行きます'), 'Tôi đi bảo tàng cùng bạn trai.', [A]),
        (withp('私', '家族', 'うち', 'へ', '帰ります'), 'Tôi về nhà cùng gia đình.', [A]),
        (withp('サントスさん', '友達', '駅', 'へ', '行きました'), 'Anh Santos đã đi đến nhà ga cùng bạn.', [A, B4]),
        (withp('私', 'ミラーさん', '会社', 'へ', '来ました'), 'Tôi đã đến công ty cùng anh Miller.', [A, B4]),
        (withp('ワンさん', '彼女', 'スーパー', 'へ', '行きます'), 'Anh Wang đi siêu thị cùng bạn gái.', [A]),
        (withp('私', '友達', '勉強します'), 'Tôi học cùng bạn.'),
        (s('誰', TO, '行きます', 'か', '。'), 'Bạn đi cùng ai?', [C1]),
        ans(['友達', TO, '行きます', '。'], 'Tôi đi cùng bạn.', [A1], s('誰', 'と', '行きます', 'か', '。'), 'Bạn đi cùng ai?'),
        (s('誰', TO, '日本', 'へ', '来ました', 'か', '。'), 'Bạn đã đến Nhật cùng ai?', [A, B4, C1]),
        ans(['家族', TO, '来ました', '。'], 'Tôi đã đến cùng gia đình.', [B4], s('誰', 'と', '日本', 'へ', '来ました', 'か', '。'), 'Bạn đã đến Nhật cùng ai?'),
        (s('きのう', '誰', TO, '美術館', 'へ', '行きました', 'か', '。'), 'Hôm qua bạn đã đi bảo tàng cùng ai?', [A, B4, C1]),
        ans(['カリナさん', TO, '行きました', '。'], 'Tôi đã đi cùng chị Karina.', [B4], s('きのう', '誰', 'と', '美術館', 'へ', '行きました', 'か', '。'), 'Hôm qua bạn đã đi bảo tàng cùng ai?'),
        (withp('私', '友達', '電車', 'で', '行きます'), 'Tôi đi bằng tàu điện cùng bạn.', [C]),
        (s('私', 'は', 'あした', '友達', TO, '銀行', 'へ', '行きます', '。'), 'Ngày mai tôi đi ngân hàng cùng bạn.', [A]),
        (withp('タワポンさん', '家族', 'タイ', 'へ', '帰りました'), 'Anh Thawaphon đã về Thái Lan cùng gia đình.', [A, B4]),
        (withp('イーさん', '友達', '9', '時', 'まで', '勉強しました'), 'Chị Lee đã học cùng bạn đến 9 giờ.', [B4, D4]),
        (s('ミラーさん', 'と', 'サントスさん', 'は', '友達', TO, '来ました', '。'), 'Anh Miller và anh Santos đã đến cùng bạn.', [B4, E4]),
        (s('私', 'は', '友達', TO, '電車', 'で', '学校', 'へ', '行きます', '。'), 'Tôi đi đến trường bằng tàu điện cùng bạn.', [A, C]),
        (s('誰', TO, '行きました', 'か', '。'), 'Bạn đã đi cùng ai?', [B4, C1]),
        ans(['彼', TO, '行きました', '。'], 'Tôi đã đi cùng bạn trai.', [B4], s('誰', 'と', '行きました', 'か', '。'), 'Bạn đã đi cùng ai?'),
        (s('来週', 'の', '土曜日', 'に', '家族', TO, 'ペキン', 'へ', '行きます', '。'), 'Thứ bảy tuần sau tôi đi Bắc Kinh cùng gia đình.', [A, C4, E1]),
        (s('カリナさん', 'は', '先週', '友達', TO, '新幹線', 'で', '新大阪', 'へ', '行きました', '。'), 'Tuần trước chị Karina đã đi Shin-Osaka bằng Shinkansen cùng bạn.', [A, B4, C]),
        (s('私', 'は', '毎晩', '友達', TO, '7', '時', 'から', '9', '時', 'まで', '勉強します', '。'), 'Tối nào tôi cũng học cùng bạn từ 7 giờ đến 9 giờ.', [D4]),
        (s('彼女', TO, '行きます', 'か', '、', '友達', 'と', '行きます', 'か', '。'), 'Bạn đi cùng bạn gái hay cùng bạn bè?', [D2]),
        ans(['彼女', TO, '行きます', '。'], 'Tôi đi cùng bạn gái.', [A1], s('彼女', 'と', '行きます', 'か', '、', '友達', 'と', '行きます', 'か', '。'), 'Bạn đi cùng bạn gái hay cùng bạn bè?'),
        (s('私', 'も', '家族', TO, '日本', 'へ', '来ました', '。'), 'Tôi cũng đã đến Nhật cùng gia đình.', [A, B4, D1]),
    ],
    notes='Đi một mình là 一人で (học ở bài sau).')

# ---------------------------------------------------------------------------
def when(*parts):
    return s(*parts, '。')


p5 = point(5, 5, 'いつ', 'Khi nào',
    'いつ hỏi thời điểm nói chung: いつ日本へ来ましたか (bạn đến Nhật khi nào?). いつ không đi với に. '
    'Trả lời bằng ngày tháng có số + に (3月25日に来ました), hoặc từ thời gian tương đối không có に (来週帰ります). '
    'Hỏi ngày cụ thể có thể dùng 何月何日.',
    [
        (when('[W]いつ', '日本', 'へ', '来ました', 'か'), 'Bạn đã đến Nhật khi nào?', [A, B4]),
        (when('[W]いつ', '帰ります', 'か'), 'Khi nào bạn về?', [A]),
        (when('[W]いつ', 'ペキン', 'へ', '行きます', 'か'), 'Khi nào bạn đi Bắc Kinh?', [A]),
        (when('誕生日', 'は', '[W]いつ', 'です', 'か'), 'Sinh nhật bạn là khi nào?', [C1]),
        (when('[W]いつ', '学校', 'へ', '行きます', 'か'), 'Khi nào bạn đi đến trường?', [A]),
        (when('ミラーさん', 'は', '[W]いつ', 'アメリカ', 'へ', '帰ります', 'か'), 'Khi nào anh Miller về Mỹ?', [A]),
        (when('カリナさん', 'は', '[W]いつ', '来ました', 'か'), 'Chị Karina đã đến khi nào?', [A, B4]),
        (when('休み', 'は', '[W]いつ', 'です', 'か'), 'Kỳ nghỉ là khi nào?', [C1]),
        (when('[W]いつ', '銀行', 'へ', '行きました', 'か'), 'Bạn đã đi ngân hàng khi nào?', [A, B4]),
        (when('[W]いつ', '新大阪', 'へ', '行きます', 'か'), 'Khi nào bạn đi Shin-Osaka?', [A]),
        (s('3', '月', '25', '日', '[P]に', '来ました', '。'), 'Tôi đã đến vào ngày 25 tháng 3.', [B4, C4],
         (s('いつ', '日本', 'へ', '来ました', 'か', '。'), 'Bạn đã đến Nhật khi nào?', ['はい、3月25日に来ました。', 'いつ来ました。', '3月25日に来ましたか。'])),
        (s('来週', '帰ります', '。'), 'Tuần sau tôi về.', [A],
         (s('いつ', '帰ります', 'か', '。'), 'Khi nào bạn về?', ['はい、来週帰ります。', 'いつ帰ります。', '来週帰りますか。'])),
        (s('来月', '行きます', '。'), 'Tháng sau tôi đi.', [A],
         (s('いつ', 'ペキン', 'へ', '行きます', 'か', '。'), 'Khi nào bạn đi Bắc Kinh?', ['はい、来月行きます。', 'いつ行きます。', '来月行きますか。'])),
        (s('6', '月', '15', '日', 'です', '。'), 'Là ngày 15 tháng 6.', [A1],
         (s('誕生日', 'は', 'いつ', 'です', 'か', '。'), 'Sinh nhật bạn là khi nào?', ['はい、6月15日です。', '6月15日ですか。', 'いつです。'])),
        (s('4', '月', '一日', '[P]に', '行きます', '。'), 'Tôi sẽ đi vào ngày 1 tháng 4.', [C4],
         (s('いつ', '学校', 'へ', '行きます', 'か', '。'), 'Khi nào bạn đi đến trường?', ['はい、4月一日に行きます。', 'いつ行きます。', '4月一日に行きますか。'])),
        (s('来年', '帰ります', '。'), 'Năm sau anh ấy về.', [A],
         (s('ミラーさん', 'は', 'いつ', 'アメリカ', 'へ', '帰ります', 'か', '。'), 'Khi nào anh Miller về Mỹ?', ['はい、来年帰ります。', 'いつ帰ります。', '来年帰りますか。'])),
        (s('先月', '来ました', '。'), 'Chị ấy đã đến vào tháng trước.', [B4],
         (s('カリナさん', 'は', 'いつ', '来ました', 'か', '。'), 'Chị Karina đã đến khi nào?', ['はい、先月来ました。', 'いつ来ました。', '先月来ましたか。'])),
        (s('8', '月', 'です', '。'), 'Là tháng 8.', [A1],
         (s('休み', 'は', 'いつ', 'です', 'か', '。'), 'Kỳ nghỉ là khi nào?', ['はい、8月です。', '8月ですか。', 'いつです。'])),
        (s('きのう', '行きました', '。'), 'Tôi đã đi hôm qua.', [B4],
         (s('いつ', '銀行', 'へ', '行きました', 'か', '。'), 'Bạn đã đi ngân hàng khi nào?', ['はい、きのう行きました。', 'いつ行きました。', 'きのう行きましたか。'])),
        (s('来週', 'の', '月曜日', '[P]に', '行きます', '。'), 'Tôi đi vào thứ hai tuần sau.', [C4, E1],
         (s('いつ', '新大阪', 'へ', '行きます', 'か', '。'), 'Khi nào bạn đi Shin-Osaka?', ['はい、来週の月曜日に行きます。', 'いつ行きます。', '来週の月曜日に行きますか。'])),
        (when('[W]いつ', '誰', 'と', '日本', 'へ', '来ました', 'か'), 'Bạn đã đến Nhật khi nào, cùng ai?', [B4, D]),
        (s('去年', 'の', '4', '月', 'に', '家族', 'と', '来ました', '。'), 'Tôi đã đến cùng gia đình vào tháng 4 năm ngoái.', [B4, D, E1],
         (s('いつ', '誰', 'と', '日本', 'へ', '来ました', 'か', '。'), 'Bạn đã đến Nhật khi nào, cùng ai?', ['はい、去年の4月に家族と来ました。', 'いつ家族と来ました。', '去年の4月に家族と来ましたか。'])),
        (when('[W]いつ', '何', 'で', '帰ります', 'か'), 'Khi nào và bằng gì bạn về?', [C]),
        (s('あさって', '新幹線', 'で', '帰ります', '。'), 'Ngày mốt tôi về bằng Shinkansen.', [C],
         (s('いつ', '何', 'で', '帰ります', 'か', '。'), 'Khi nào và bằng gì bạn về?', ['はい、あさって新幹線で帰ります。', 'いつ新幹線で帰ります。', 'あさって新幹線で帰りますか。'])),
        (when('誕生日', 'は', '何月', '何日', 'です', 'か'), 'Sinh nhật bạn là ngày mấy tháng mấy?', [C1]),
        (s('9', '月', '二十日', 'です', '。'), 'Là ngày 20 tháng 9.', [A1],
         (s('誕生日', 'は', '何月', '何日', 'です', 'か', '。'), 'Sinh nhật bạn là ngày mấy tháng mấy?', ['はい、9月二十日です。', '9月二十日ですか。', 'いつです。'])),
        (when('[W]いつ', '美術館', 'へ', '行きました', 'か'), 'Bạn đã đi bảo tàng khi nào?', [A, B4]),
        (s('先週', 'の', '土曜日', '[P]に', '友達', 'と', '行きました', '。'), 'Tôi đã đi cùng bạn vào thứ bảy tuần trước.', [C4, D, E1],
         (s('いつ', '美術館', 'へ', '行きました', 'か', '。'), 'Bạn đã đi bảo tàng khi nào?', ['はい、先週の土曜日に友達と行きました。', 'いつ友達と行きました。', '先週の土曜日に友達と行きましたか。'])),
        (when('ミラーさん', 'の', '誕生日', 'は', '[W]いつ', 'です', 'か'), 'Sinh nhật của anh Miller là khi nào?', [C1, E1]),
        (s('10', '月', '25', '日', 'です', '。'), 'Là ngày 25 tháng 10.', [A1],
         (s('ミラーさん', 'の', '誕生日', 'は', 'いつ', 'です', 'か', '。'), 'Sinh nhật của anh Miller là khi nào?', ['はい、10月25日です。', '10月25日ですか。', 'いつです。'])),
    ],
    notes='Không nói いつに. Từ thời gian tương đối (来週, きのう) không có に; ngày tháng có số thì có に.')

# ---------------------------------------------------------------------------
def yo(*parts):
    return s(*parts, '[P]よ', '。')


p6 = point(5, 6, '～よ', '~ đấy / ~ đó (báo cho biết)',
    'よ đặt cuối câu khi người nói báo cho người nghe một thông tin mà người nghe chưa biết, hoặc nhấn mạnh ý kiến của mình: '
    'この電車は新大阪へ行きますよ (tàu này đi Shin-Osaka đấy). Khác ね là mong đồng tình về điều cả hai cùng biết.',
    [
        (yo('この', '電車', 'は', '新大阪', 'へ', '行きます'), 'Tàu điện này đi Shin-Osaka đấy.', [A]),
        (yo('あの', 'バス', 'は', '駅', 'へ', '行きます'), 'Xe buýt kia đi đến nhà ga đấy.', [A]),
        (yo('次の', '電車', 'は', '普通', 'です'), 'Chuyến tàu tiếp theo là tàu thường đấy.', [A1]),
        (yo('急行', 'は', '5', '番線', 'です'), 'Tàu tốc hành ở sân ga số 5 đấy.', [A1]),
        (yo('銀行', 'は', '3', '時', 'まで', 'です'), 'Ngân hàng mở cửa đến 3 giờ đấy.', [D4]),
        (yo('あした', 'は', '休み', 'です'), 'Ngày mai là ngày nghỉ đấy.', [A1]),
        (yo('ミラーさん', 'は', '来週', 'アメリカ', 'へ', '帰ります'), 'Tuần sau anh Miller về Mỹ đấy.', [A]),
        (yo('その', '電車', 'は', '特急', 'です'), 'Tàu điện đó là tàu tốc hành đặc biệt đấy.', [A1]),
        (yo('ここ', 'は', '駅', 'じゃありません'), 'Đây không phải là nhà ga đâu.', [A1]),
        (yo('トイレ', 'は', 'あそこ', 'です'), 'Nhà vệ sinh ở đằng kia đấy.', [B3]),
        (s('この', '電車', 'は', '新大阪', 'へ', '行きます', 'か', '。'), 'Tàu điện này có đi Shin-Osaka không?', [A, C1]),
        (s('いいえ', '、', '行きません', '。', '次の', '普通', 'です', '[P]よ', '。'), 'Không, không đi. Chuyến tàu thường tiếp theo đi đấy.', [A, B4],
         (s('この', '電車', 'は', '新大阪', 'へ', '行きます', 'か', '。'), 'Tàu điện này có đi Shin-Osaka không?',
          ['はい、行きません。次の普通ですよ。', 'いいえ、行きます。次の普通ですよ。', 'いいえ、行きません。次の普通ですか。'])),
        (s('新大阪', 'は', '何', '番線', 'です', 'か', '。'), 'Đi Shin-Osaka ở sân ga số mấy?', [C1]),
        (s('8', '番線', 'です', '[P]よ', '。'), 'Ở sân ga số 8 đấy.', [A1],
         (s('新大阪', 'は', '何', '番線', 'です', 'か', '。'), 'Đi Shin-Osaka ở sân ga số mấy?', ['はい、8番線ですよ。', '8番線ですか。', 'いいえ、8番線ですよ。'])),
        (s('銀行', 'は', '何', '時', 'まで', 'です', 'か', '。'), 'Ngân hàng mở cửa đến mấy giờ?', [C1, D4]),
        (s('3', '時', 'まで', 'です', '[P]よ', '。'), 'Đến 3 giờ đấy.', [D4],
         (s('銀行', 'は', '何', '時', 'まで', 'です', 'か', '。'), 'Ngân hàng mở cửa đến mấy giờ?', ['はい、3時までですよ。', '3時までですか。', 'いいえ、3時までですよ。'])),
        (yo('その', 'バス', 'は', '学校', 'へ', '行きません'), 'Xe buýt đó không đi đến trường đâu.', [A, B4]),
        (yo('あした', 'は', '日曜日', 'です'), 'Ngày mai là chủ nhật đấy.', [A1]),
        (yo('カリナさん', 'は', 'きのう', '来ませんでした'), 'Hôm qua chị Karina đã không đến đâu.', [A, B4]),
        (yo('今', '9', '時', 'です'), 'Bây giờ là 9 giờ rồi đấy.', ['g04-01']),
        (s('この', '電車', 'は', '急行', 'じゃありません', '。', '普通', 'です', '[P]よ', '。'), 'Tàu điện này không phải tàu tốc hành. Là tàu thường đấy.', [A1]),
        (yo('ミラーさん', 'は', '毎朝', '7', '時', 'に', '電車', 'で', '会社', 'へ', '行きます'), 'Mỗi sáng anh Miller đi đến công ty bằng tàu điện lúc 7 giờ đấy.', [C, C4]),
        (yo('この', '時計', 'は', '3', '万', '円', 'です'), 'Cái đồng hồ này giá 30.000 yên đấy.', [E3]),
        (yo('あの人', 'は', '先生', 'じゃありません'), 'Người kia không phải là giáo viên đâu.', [A1]),
        (yo('次の', '特急', 'は', '10', '時', '半', 'です'), 'Chuyến tốc hành đặc biệt tiếp theo lúc 10 giờ rưỡi đấy.', ['g04-01']),
        (yo('カリナさん', 'は', '友達', 'と', '図書館', 'へ', '行きました'), 'Chị Karina đã đi thư viện cùng bạn đấy.', [D]),
        (yo('銀行', 'は', '土曜日', 'と', '日曜日', 'に', '休みます'), 'Ngân hàng nghỉ vào thứ bảy và chủ nhật đấy.', [C4, E4]),
        (yo('ワンさん', 'の', '誕生日', 'は', '来週', 'です'), 'Sinh nhật của anh Wang là tuần sau đấy.', [E1]),
        (yo('きのう', 'は', '誰', 'も', '来ませんでした'), 'Hôm qua không có ai đến đâu.', [B]),
        (yo('あの', '電車', 'も', '新大阪', 'へ', '行きます'), 'Tàu điện kia cũng đi Shin-Osaka đấy.', [A, D1]),
    ],
    notes='よ báo điều người nghe chưa biết; ね mong đồng tình điều cả hai biết; か là hỏi.')

# Chủ dự án duyệt bài 5 ngày 2026-11-12
for p in (p1, p2, p3, p4, p5, p6):
    p['approved'] = True
write(5, [p1, p2, p3, p4, p5, p6])
