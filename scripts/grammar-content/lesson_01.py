"""Ngữ pháp bài 1 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1.
Chạy: python3 -I scripts/grammar-content/lesson_01.py  → data/grammar/lesson-01.json
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(1)

A, B = 'g01-01', 'g01-02'
C, D, E = 'g01-03', 'g01-04', 'g01-05'

# Từ hay dùng (mảnh có cách đọc)
W = {
    '私': '私{わたし}', '私たち': '私たち{わたしたち}', 'あの人': 'あの人{あのひと}', 'あの方': 'あの方{あのかた}',
    '学生': '学生{がくせい}', '先生': '先生{せんせい}', '会社員': '会社員{かいしゃいん}', '銀行員': '銀行員{ぎんこういん}',
    '医者': '医者{いしゃ}', '研究者': '研究者{けんきゅうしゃ}', '大学': '大学{だいがく}', '病院': '病院{びょういん}',
    'さくら大学': 'さくら大学{さくらだいがく}', '日本': '日本{にほん}', '中国': '中国{ちゅうごく}', '韓国': '韓国{かんこく}',
    '日本人': '日本人{にほんじん}', '中国人': '中国人{ちゅうごくじん}', '韓国人': '韓国人{かんこくじん}',
    'アメリカ人': 'アメリカ人{アメリカじん}', 'ブラジル人': 'ブラジル人{ブラジルじん}', 'タイ人': 'タイ人{タイじん}',
    'ドイツ人': 'ドイツ人{ドイツじん}', 'インド人': 'インド人{インドじん}', 'インドネシア人': 'インドネシア人{インドネシアじん}',
    'イギリス人': 'イギリス人{イギリスじん}', '誰': '誰{だれ}', '何歳': '何歳{なんさい}',
}


def s(*parts):
    """Ghép mảnh: tên trong W đổi sang dạng có cách đọc."""
    return '|'.join(W.get(p, p) for p in parts)


def desu(subj, noun):
    return s(subj, '[P]は', noun, '[F]です', '。')


def neg(subj, noun):
    return s(subj, '[P]は', noun, '[F]じゃありません', '。')


def q(subj, noun):
    return s(subj, '[P]は', noun, '[F]ですか', '。')


def plain_q(subj, noun):
    return s(subj, 'は', noun, 'ですか', '。')


# ---------------------------------------------------------------------------
p1 = point(1, 1, 'N1 は N2 です', 'N1 là N2',
    'Dùng để giới thiệu hoặc nói một người, một vật là gì. は (đọc là "wa") đứng sau N1, đánh dấu N1 là chủ đề của câu. '
    'です đứng cuối câu, khẳng định "là" và thể hiện sự lịch sự với người nghe. です không đổi theo ngôi hay số nhiều.',
    [
        (desu('私', '学生'), 'Tôi là sinh viên.'),
        (desu('私', '会社員'), 'Tôi là nhân viên công ty.'),
        (desu('私', '先生'), 'Tôi là giáo viên.'),
        (desu('私', '医者'), 'Tôi là bác sĩ.'),
        (desu('私', '日本人'), 'Tôi là người Nhật.'),
        (desu('私', 'エンジニア'), 'Tôi là kỹ sư.'),
        (desu('私', 'アメリカ人'), 'Tôi là người Mỹ.'),
        (desu('私', '銀行員'), 'Tôi là nhân viên ngân hàng.'),
        (desu('私', '中国人'), 'Tôi là người Trung Quốc.'),
        (desu('私', '研究者'), 'Tôi là nhà nghiên cứu.'),
        (desu('ミラーさん', '会社員'), 'Anh Miller là nhân viên công ty.'),
        (desu('サントスさん', 'ブラジル人'), 'Anh Santos là người Brazil.'),
        (desu('カリナさん', '学生'), 'Chị Karina là sinh viên.'),
        (desu('ワンさん', '医者'), 'Anh Wang là bác sĩ.'),
        (desu('タワポンさん', 'タイ人'), 'Anh Thawaphon là người Thái.'),
        (desu('シュミットさん', 'エンジニア'), 'Ông Schmidt là kỹ sư.'),
        (desu('マリアさん', 'ブラジル人'), 'Chị Maria là người Brazil.'),
        (desu('イーさん', '韓国人'), 'Chị Lee là người Hàn Quốc.'),
        (desu('グプタさん', 'インド人'), 'Anh Gupta là người Ấn Độ.'),
        (desu('カリナさん', 'インドネシア人'), 'Chị Karina là người Indonesia.'),
        (desu('あの人', '研究者'), 'Người kia là nhà nghiên cứu.'),
        (desu('あの方', '先生'), 'Vị kia là giáo viên.'),
        (desu('あの方', 'ドイツ人'), 'Vị kia là người Đức.'),
        (desu('あの人', '銀行員'), 'Người kia là nhân viên ngân hàng.'),
        (desu('私たち', '学生'), 'Chúng tôi là sinh viên.'),
        (desu('私たち', '会社員'), 'Chúng tôi là nhân viên công ty.'),
        (desu('シュミットさん', 'ドイツ人'), 'Ông Schmidt là người Đức.'),
        (desu('あの方', '医者'), 'Vị kia là bác sĩ.'),
        (desu('ワンさん', '中国人'), 'Anh Wang là người Trung Quốc.'),
        (desu('ミラーさん', 'アメリカ人'), 'Anh Miller là người Mỹ.'),
    ],
    notes='は là trợ từ nên đọc là "wa", nhưng vẫn viết bằng chữ は.')

# ---------------------------------------------------------------------------
def neg_then(subj, wrong, right):
    return s(subj, '[P]は', wrong, '[F]じゃありません', '。', right, 'です', '。')


p2 = point(1, 2, 'N1 は N2 じゃ ありません', 'N1 không phải là N2',
    'Thể phủ định của です. じゃ ありません dùng khi nói chuyện hằng ngày; では ありません trang trọng hơn, hay dùng khi viết. '
    'Cả hai đều đúng. Muốn nói N1 là gì thì nói tiếp câu khẳng định, chủ đề đã rõ nên có thể bỏ "N1 は".',
    [
        (neg('私', '先生'), 'Tôi không phải là giáo viên.'),
        (neg('私', '医者'), 'Tôi không phải là bác sĩ.'),
        (neg('私', '学生'), 'Tôi không phải là sinh viên.'),
        (neg('私', '会社員'), 'Tôi không phải là nhân viên công ty.'),
        (neg('私', '日本人'), 'Tôi không phải là người Nhật.'),
        (neg('私', 'エンジニア'), 'Tôi không phải là kỹ sư.'),
        (neg('私', '銀行員'), 'Tôi không phải là nhân viên ngân hàng.'),
        (neg('私', 'アメリカ人'), 'Tôi không phải là người Mỹ.'),
        (neg('私', '研究者'), 'Tôi không phải là nhà nghiên cứu.'),
        (neg('私', '韓国人'), 'Tôi không phải là người Hàn Quốc.'),
        (neg('ミラーさん', '学生'), 'Anh Miller không phải là sinh viên.'),
        (neg('サントスさん', '先生'), 'Anh Santos không phải là giáo viên.'),
        (neg('カリナさん', '会社員'), 'Chị Karina không phải là nhân viên công ty.'),
        (neg('ワンさん', '日本人'), 'Anh Wang không phải là người Nhật.'),
        (neg('タワポンさん', '医者'), 'Anh Thawaphon không phải là bác sĩ.'),
        (neg('シュミットさん', 'アメリカ人'), 'Ông Schmidt không phải là người Mỹ.'),
        (neg('マリアさん', '研究者'), 'Chị Maria không phải là nhà nghiên cứu.'),
        (neg('イーさん', '中国人'), 'Chị Lee không phải là người Trung Quốc.'),
        (neg('グプタさん', '銀行員'), 'Anh Gupta không phải là nhân viên ngân hàng.'),
        (neg('あの人', '先生'), 'Người kia không phải là giáo viên.'),
        (neg_then('ミラーさん', '学生', '会社員'), 'Anh Miller không phải là sinh viên. Anh ấy là nhân viên công ty.', [A]),
        (neg_then('私', '先生', '学生'), 'Tôi không phải là giáo viên. Tôi là sinh viên.', [A]),
        (neg_then('サントスさん', '日本人', 'ブラジル人'), 'Anh Santos không phải là người Nhật. Anh ấy là người Brazil.', [A]),
        (neg_then('カリナさん', '中国人', 'インドネシア人'), 'Chị Karina không phải là người Trung Quốc. Chị ấy là người Indonesia.', [A]),
        (neg_then('あの方', '医者', '研究者'), 'Vị kia không phải là bác sĩ. Vị ấy là nhà nghiên cứu.', [A]),
        (neg_then('ワンさん', '研究者', '医者'), 'Anh Wang không phải là nhà nghiên cứu. Anh ấy là bác sĩ.', [A]),
        (neg_then('シュミットさん', '学生', 'エンジニア'), 'Ông Schmidt không phải là sinh viên. Ông ấy là kỹ sư.', [A]),
        (neg_then('イーさん', '日本人', '韓国人'), 'Chị Lee không phải là người Nhật. Chị ấy là người Hàn Quốc.', [A]),
        (neg_then('あの人', '銀行員', '会社員'), 'Người kia không phải là nhân viên ngân hàng. Người đó là nhân viên công ty.', [A]),
        (neg_then('タワポンさん', '先生', '学生'), 'Anh Thawaphon không phải là giáo viên. Anh ấy là sinh viên.', [A]),
    ],
    notes='Chấp nhận cả じゃありません và ではありません.')

# ---------------------------------------------------------------------------
def yes(noun):
    return s('はい', '、', noun, '[F]です', '。')


def no(noun):
    return s('いいえ', '、', noun, '[F]じゃありません', '。')


def no_then(wrong, right):
    return s('いいえ', '、', wrong, '[F]じゃありません', '。', right, 'です', '。')


def ask(subj, noun, meaning, kind):
    """Câu hỏi đi trước và 3 câu đáp sai chắc chắn (trái はい/いいえ, hoặc là câu hỏi)."""
    n = noun
    if kind == 'yes':
        wrong = [f'いいえ、{n}です。', f'はい、{n}じゃありません。', f'はい、{n}ですか。']
    else:
        wrong = [f'はい、{n}じゃありません。', f'いいえ、{n}です。', f'いいえ、{n}ですか。']
    return (plain_q(subj, noun), meaning, wrong)


p3 = point(1, 3, 'N1 は N2 ですか', 'N1 có phải là N2 không?',
    'Thêm か vào cuối câu để thành câu hỏi, không cần đổi trật tự từ; khi nói thì lên giọng ở cuối. '
    'Trả lời bằng はい (vâng) hoặc いいえ (không). Sau いいえ thường dùng thể phủ định じゃ ありません. '
    'Với từ để hỏi như 誰 (ai), どなた (vị nào, lịch sự hơn), đặt từ để hỏi vào chỗ thông tin cần hỏi: あの人は誰ですか.',
    [
        (q('あなた', '学生'), 'Bạn có phải là sinh viên không?'),
        (q('あなた', '先生'), 'Bạn có phải là giáo viên không?'),
        (q('あなた', '会社員'), 'Bạn có phải là nhân viên công ty không?'),
        (q('あなた', '日本人'), 'Bạn có phải là người Nhật không?'),
        (q('あなた', '医者'), 'Bạn có phải là bác sĩ không?'),
        (q('あなた', 'エンジニア'), 'Bạn có phải là kỹ sư không?'),
        (q('ミラーさん', '会社員'), 'Anh Miller có phải là nhân viên công ty không?'),
        (q('サントスさん', 'ブラジル人'), 'Anh Santos có phải là người Brazil không?'),
        (q('カリナさん', '学生'), 'Chị Karina có phải là sinh viên không?'),
        (q('ワンさん', '医者'), 'Anh Wang có phải là bác sĩ không?'),
        (yes('学生'), 'Vâng, tôi là sinh viên.', [A], ask('あなた', '学生', 'Bạn có phải là sinh viên không?', 'yes')),
        (no('先生'), 'Không, tôi không phải là giáo viên.', [B], ask('あなた', '先生', 'Bạn có phải là giáo viên không?', 'no')),
        (yes('会社員'), 'Vâng, anh ấy là nhân viên công ty.', [A], ask('ミラーさん', '会社員', 'Anh Miller có phải là nhân viên công ty không?', 'yes')),
        (no('日本人'), 'Không, anh ấy không phải là người Nhật.', [B], ask('ワンさん', '日本人', 'Anh Wang có phải là người Nhật không?', 'no')),
        (yes('ブラジル人'), 'Vâng, anh ấy là người Brazil.', [A], ask('サントスさん', 'ブラジル人', 'Anh Santos có phải là người Brazil không?', 'yes')),
        (no('医者'), 'Không, chị ấy không phải là bác sĩ.', [B], ask('カリナさん', '医者', 'Chị Karina có phải là bác sĩ không?', 'no')),
        (yes('エンジニア'), 'Vâng, ông ấy là kỹ sư.', [A], ask('シュミットさん', 'エンジニア', 'Ông Schmidt có phải là kỹ sư không?', 'yes')),
        (no('学生'), 'Không, anh ấy không phải là sinh viên.', [B], ask('タワポンさん', '学生', 'Anh Thawaphon có phải là sinh viên không?', 'no')),
        (yes('韓国人'), 'Vâng, chị ấy là người Hàn Quốc.', [A], ask('イーさん', '韓国人', 'Chị Lee có phải là người Hàn Quốc không?', 'yes')),
        (no('エンジニア'), 'Không, vị ấy không phải là kỹ sư.', [B], ask('あの方', 'エンジニア', 'Vị kia có phải là kỹ sư không?', 'no')),
        (s('あの人', '[P]は', '誰', 'ですか', '。'), 'Người kia là ai?'),
        (s('あの方', '[P]は', 'どなた', 'ですか', '。'), 'Vị kia là ai ạ?'),
        (no_then('学生', '会社員'), 'Không, tôi không phải là sinh viên. Tôi là nhân viên công ty.', [A, B],
         (plain_q('ミラーさん', '学生'), 'Anh Miller có phải là sinh viên không?', ['はい、学生じゃありません。会社員です。', 'いいえ、学生です。会社員です。', 'はい、会社員じゃありません。'])),
        (no_then('日本人', '中国人'), 'Không, tôi không phải là người Nhật. Tôi là người Trung Quốc.', [A, B],
         (plain_q('ワンさん', '日本人'), 'Anh Wang có phải là người Nhật không?', ['はい、日本人じゃありません。中国人です。', 'いいえ、日本人です。中国人です。', 'はい、中国人じゃありません。'])),
        (s('ミラーさん', '[F]です', '。'), 'Đó là anh Miller.', [A],
         (s('あの人', 'は', '誰', 'ですか', '。'), 'Người kia là ai?', ['はい、ミラーさんです。', 'いいえ、ミラーさんです。', 'ミラーさんですか。'])),
        (no_then('医者', '研究者'), 'Không, vị ấy không phải là bác sĩ. Vị ấy là nhà nghiên cứu.', [A, B],
         (plain_q('あの方', '医者'), 'Vị kia có phải là bác sĩ không?', ['はい、医者じゃありません。研究者です。', 'いいえ、医者です。研究者です。', 'はい、研究者じゃありません。'])),
        (q('シュミットさん', 'アメリカ人'), 'Ông Schmidt có phải là người Mỹ không?'),
        (no_then('アメリカ人', 'ドイツ人'), 'Không, ông ấy không phải là người Mỹ. Ông ấy là người Đức.', [A, B],
         (plain_q('シュミットさん', 'アメリカ人'), 'Ông Schmidt có phải là người Mỹ không?', ['はい、アメリカ人じゃありません。ドイツ人です。', 'いいえ、アメリカ人です。ドイツ人です。', 'はい、ドイツ人じゃありません。'])),
        (q('イーさん', '研究者'), 'Chị Lee có phải là nhà nghiên cứu không?'),
        (yes('研究者'), 'Vâng, chị ấy là nhà nghiên cứu.', [A], ask('イーさん', '研究者', 'Chị Lee có phải là nhà nghiên cứu không?', 'yes')),
    ],
    notes='Câu hỏi tiếng Nhật kết thúc bằng 。 (không dùng ?) khi viết trang trọng.')

# ---------------------------------------------------------------------------
def mo(subj, noun, tail='[F]です'):
    return s(subj, '[P]も', noun, tail, '。')


def wa_mo(a, b, noun, tail='です'):
    return s(a, 'は', noun, tail, '。', b, '[P]も', noun, tail, '。')


p4 = point(1, 4, 'N も …', 'N cũng …',
    'も thay cho は khi điều nói về N giống với điều vừa nói về một người, một vật khác. '
    'Dùng được với câu khẳng định, phủ định và câu hỏi: 私も学生です (tôi cũng là sinh viên), '
    '私も学生じゃありません (tôi cũng không phải là sinh viên), あなたも学生ですか (bạn cũng là sinh viên à?).',
    [
        (mo('私', '学生'), 'Tôi cũng là sinh viên.'),
        (mo('私', '会社員'), 'Tôi cũng là nhân viên công ty.'),
        (mo('私', '先生'), 'Tôi cũng là giáo viên.'),
        (mo('私', '日本人'), 'Tôi cũng là người Nhật.'),
        (mo('私', '医者'), 'Tôi cũng là bác sĩ.'),
        (mo('ミラーさん', '会社員'), 'Anh Miller cũng là nhân viên công ty.'),
        (mo('カリナさん', '学生'), 'Chị Karina cũng là sinh viên.'),
        (mo('ワンさん', '医者'), 'Anh Wang cũng là bác sĩ.'),
        (mo('サントスさん', 'ブラジル人'), 'Anh Santos cũng là người Brazil.'),
        (mo('あの人', '先生'), 'Người kia cũng là giáo viên.'),
        (wa_mo('ミラーさん', '私', 'アメリカ人'), 'Anh Miller là người Mỹ. Tôi cũng là người Mỹ.', [A]),
        (wa_mo('カリナさん', 'イーさん', '学生'), 'Chị Karina là sinh viên. Chị Lee cũng là sinh viên.', [A]),
        (wa_mo('ワンさん', 'あの方', '医者'), 'Anh Wang là bác sĩ. Vị kia cũng là bác sĩ.', [A]),
        (wa_mo('サントスさん', 'マリアさん', 'ブラジル人'), 'Anh Santos là người Brazil. Chị Maria cũng là người Brazil.', [A]),
        (wa_mo('私', 'ミラーさん', '会社員'), 'Tôi là nhân viên công ty. Anh Miller cũng là nhân viên công ty.', [A]),
        (wa_mo('シュミットさん', 'あの人', 'エンジニア'), 'Ông Schmidt là kỹ sư. Người kia cũng là kỹ sư.', [A]),
        (wa_mo('あの方', 'あの人', '先生'), 'Vị kia là giáo viên. Người kia cũng là giáo viên.', [A]),
        (wa_mo('私', 'あの人', '日本人'), 'Tôi là người Nhật. Người kia cũng là người Nhật.', [A]),
        (wa_mo('イーさん', 'グプタさん', '研究者'), 'Chị Lee là nhà nghiên cứu. Anh Gupta cũng là nhà nghiên cứu.', [A]),
        (wa_mo('タワポンさん', 'あの人', 'タイ人'), 'Anh Thawaphon là người Thái. Người kia cũng là người Thái.', [A]),
        (mo('私', '学生', '[F]じゃありません'), 'Tôi cũng không phải là sinh viên.', [B]),
        (wa_mo('ミラーさん', '私', '学生', 'じゃありません'), 'Anh Miller không phải là sinh viên. Tôi cũng không phải là sinh viên.', [B]),
        (wa_mo('ワンさん', 'イーさん', '日本人', 'じゃありません'), 'Anh Wang không phải là người Nhật. Chị Lee cũng không phải là người Nhật.', [B]),
        (mo('あなた', '学生', '[F]ですか'), 'Bạn cũng là sinh viên à?', [C]),
        (mo('カリナさん', 'インドネシア人', '[F]ですか'), 'Chị Karina cũng là người Indonesia à?', [C]),
        (s('はい', '、', '私', '[P]も', '会社員', '[F]です', '。'), 'Vâng, tôi cũng là nhân viên công ty.', [A, C],
         (s('あなた', 'も', '会社員', 'ですか', '。'), 'Bạn cũng là nhân viên công ty à?', ['はい、私も会社員じゃありません。', 'いいえ、私も会社員です。', 'はい、私も会社員ですか。'])),
        (s('いいえ', '、', '私', '[P]は', '医者', '[F]じゃありません', '。'), 'Không, tôi thì không phải là bác sĩ.', [B, C],
         (s('あなた', 'も', '医者', 'ですか', '。'), 'Bạn cũng là bác sĩ à?', ['はい、私は医者じゃありません。', 'いいえ、私は医者です。', 'いいえ、私は医者ですか。'])),
        (wa_mo('サントスさん', 'マリアさん', '会社員', 'ですか').replace('は|会社員{かいしゃいん}|ですか', 'は|会社員{かいしゃいん}|です', 1),
         'Anh Santos là nhân viên công ty. Chị Maria cũng là nhân viên công ty à?', [A, C]),
        (wa_mo('あの人', 'あの方', '先生', 'じゃありません'), 'Người kia không phải là giáo viên. Vị kia cũng không phải là giáo viên.', [B]),
        (wa_mo('シュミットさん', 'あの方', 'ドイツ人', 'ですか').replace('は|ドイツ人{ドイツじん}|ですか', 'は|ドイツ人{ドイツじん}|です', 1),
         'Ông Schmidt là người Đức. Vị kia cũng là người Đức à?', [A, C]),
    ],
    notes='Câu "いいえ、私は医者じゃありません" dùng は vì nói khác với người kia; dùng も ở đây sẽ thành "tôi cũng không phải".')

# ---------------------------------------------------------------------------
def no_(subj, owner, noun, tail='です'):
    return s(subj, 'は', owner, '[P]の', noun, tail, '。')


p5 = point(1, 5, 'N1 の N2', 'N2 của N1; N2 thuộc N1',
    'の nối hai danh từ. N1 đứng trước bổ nghĩa cho N2, cho biết N2 thuộc về đâu hoặc của ai: '
    'さくら大学の学生 (sinh viên của trường đại học Sakura), 私の先生 (giáo viên của tôi). '
    'Thứ tự ngược với tiếng Việt: danh từ chính N2 đứng sau の.',
    [
        (no_('私', 'さくら大学', '学生'), 'Tôi là sinh viên của trường đại học Sakura.'),
        (no_('私', 'さくら大学', '先生'), 'Tôi là giáo viên của trường đại học Sakura.'),
        (no_('ミラーさん', '私', '先生'), 'Anh Miller là giáo viên của tôi.'),
        (no_('あの方', '私', '先生'), 'Vị kia là giáo viên của tôi.'),
        (no_('私', '日本', '会社員'), 'Tôi là nhân viên của một công ty Nhật.'),
        (no_('私', '病院', '医者'), 'Tôi là bác sĩ của bệnh viện.'),
        (no_('カリナさん', 'さくら大学', '学生'), 'Chị Karina là sinh viên của trường đại học Sakura.'),
        (no_('ワンさん', '病院', '医者'), 'Anh Wang là bác sĩ của bệnh viện.'),
        (no_('あの人', '私', '学生'), 'Người kia là sinh viên của tôi.'),
        (no_('イーさん', '韓国', '研究者'), 'Chị Lee là nhà nghiên cứu người Hàn Quốc.'),
        (no_('あなた', 'さくら大学', '学生', 'ですか'), 'Bạn có phải là sinh viên của trường đại học Sakura không?', [C]),
        (no_('あの方', 'さくら大学', '先生', 'ですか'), 'Vị kia có phải là giáo viên của trường đại học Sakura không?', [C]),
        (no_('私', 'さくら大学', '学生', 'じゃありません'), 'Tôi không phải là sinh viên của trường đại học Sakura.', [B]),
        (no_('ワンさん', '日本', '医者', 'じゃありません'), 'Anh Wang không phải là bác sĩ người Nhật.', [B]),
        (no_('シュミットさん', 'ドイツ', 'エンジニア'), 'Ông Schmidt là kỹ sư người Đức.'),
        (no_('グプタさん', 'インド', '研究者'), 'Anh Gupta là nhà nghiên cứu người Ấn Độ.'),
        (no_('タワポンさん', 'さくら大学', '学生'), 'Anh Thawaphon là sinh viên của trường đại học Sakura.'),
        (no_('マリアさん', 'ブラジル', '先生'), 'Chị Maria là giáo viên người Brazil.'),
        (no_('サントスさん', 'ブラジル', '会社員'), 'Anh Santos là nhân viên của một công ty Brazil.'),
        (no_('あの人', '大学', '先生', 'ですか'), 'Người kia có phải là giáo viên đại học không?', [C]),
        (s('あの方', 'は', '日本', '[P]の', '大学', 'の', '先生', 'です', '。'), 'Vị kia là giáo viên của một trường đại học Nhật Bản.', [A]),
        (s('カリナさん', 'は', 'さくら大学', 'の', '学生', 'です', '。', 'イーさん', 'も', 'さくら大学', '[P]の', '学生', 'です', '。'),
         'Chị Karina là sinh viên của trường đại học Sakura. Chị Lee cũng là sinh viên của trường đại học Sakura.', [A, D]),
        (s('ミラーさん', 'は', 'さくら大学', '[P]の', '学生', 'じゃありません', '。', '会社員', 'です', '。'),
         'Anh Miller không phải là sinh viên của trường đại học Sakura. Anh ấy là nhân viên công ty.', [A, B]),
        (s('サントスさん', 'も', 'さくら大学', '[P]の', '先生', 'ですか', '。'), 'Anh Santos cũng là giáo viên của trường đại học Sakura à?', [C, D]),
        (s('はい', '、', 'さくら大学', '[P]の', '学生', '[F]です', '。'), 'Vâng, tôi là sinh viên của trường đại học Sakura.', [A, C],
         (s('あなた', 'は', 'さくら大学', 'の', '学生', 'ですか', '。'), 'Bạn có phải là sinh viên của trường đại học Sakura không?',
          ['いいえ、さくら大学の学生です。', 'はい、さくら大学の学生じゃありません。', 'はい、さくら大学は学生です。'])),
        (s('いいえ', '、', '日本', '[P]の', '会社員', 'じゃありません', '。', 'アメリカ', 'の', '会社員', 'です', '。'),
         'Không, tôi không phải là nhân viên công ty Nhật. Tôi là nhân viên công ty Mỹ.', [A, B, C],
         (s('ミラーさん', 'は', '日本', 'の', '会社員', 'ですか', '。'), 'Anh Miller có phải là nhân viên công ty Nhật không?',
          ['はい、日本の会社員じゃありません。アメリカの会社員です。', 'いいえ、日本の会社員です。アメリカの会社員です。', 'いいえ、日本は会社員じゃありません。'])),
        (s('私', '[P]の', '先生', 'も', '日本人', 'です', '。'), 'Giáo viên của tôi cũng là người Nhật.', [A, D]),
        (s('あの人', 'は', '病院', '[P]の', '医者', 'じゃありません', '。', '大学', 'の', '研究者', 'です', '。'),
         'Người kia không phải là bác sĩ của bệnh viện. Người đó là nhà nghiên cứu của trường đại học.', [A, B]),
        (s('ワンさん', 'は', '中国', 'の', '医者', 'です', '。', 'あの方', 'も', '中国', '[P]の', '医者', 'ですか', '。'),
         'Anh Wang là bác sĩ người Trung Quốc. Vị kia cũng là bác sĩ người Trung Quốc à?', [A, C, D]),
        (s('ミラーさん', '[P]の', '先生', 'は', 'アメリカ人', 'です', '。'), 'Giáo viên của anh Miller là người Mỹ.', [A]),
    ])

# ---------------------------------------------------------------------------
def age(subj, n, tail='です'):
    return s(subj, 'は', str(n), '[W]歳{さい}', tail, '。')


def nat(subj, country, tail='です'):
    return s(subj, '[P]は', country, '[W]人{じん}', tail, '。')


def san(name, noun):
    return s(name, '[W]さん', 'は', noun, 'です', '。')


p6 = point(1, 6, '～さん・～人・～歳', 'anh/chị ~; người nước ~; ~ tuổi',
    'さん đặt sau tên người khác để tỏ lịch sự (anh, chị, ông, bà); không dùng cho chính mình. '
    'Với trẻ em dùng ちゃん (bé gái, hoặc gọi thân mật) và くん (bé trai). '
    '人 (đọc じん) đặt sau tên nước để chỉ người nước đó: 日本人 (người Nhật). '
    '歳 (đọc さい) đặt sau số để nói tuổi; hỏi tuổi bằng 何歳 (なんさい), lịch sự hơn là おいくつ.',
    [
        (san('ミラー', 'アメリカ人'), 'Anh Miller là người Mỹ.'),
        (san('サントス', 'ブラジル人'), 'Anh Santos là người Brazil.'),
        (san('カリナ', '学生'), 'Chị Karina là sinh viên.'),
        (nat('私', '日本'), 'Tôi là người Nhật.'),
        (nat('私', '中国'), 'Tôi là người Trung Quốc.'),
        (nat('ワンさん', '中国'), 'Anh Wang là người Trung Quốc.'),
        (age('私', 25), 'Tôi 25 tuổi.'),
        (age('ミラーさん', 29), 'Anh Miller 29 tuổi.'),
        (san('イー', '韓国人'), 'Chị Lee là người Hàn Quốc.'),
        (san('タワポン', '学生'), 'Anh Thawaphon là sinh viên.'),
        (nat('シュミットさん', 'ドイツ'), 'Ông Schmidt là người Đức.'),
        (nat('グプタさん', 'インド'), 'Anh Gupta là người Ấn Độ.'),
        (nat('マリアさん', 'ブラジル'), 'Chị Maria là người Brazil.'),
        (nat('カリナさん', 'インドネシア'), 'Chị Karina là người Indonesia.'),
        (age('タワポンさん', 19), 'Anh Thawaphon 19 tuổi.'),
        (age('カリナさん', 24), 'Chị Karina 24 tuổi.'),
        (age('テレサちゃん', 9), 'Bé Teresa 9 tuổi.'),
        (age('たろうくん', 7), 'Bé Taro 7 tuổi.'),
        (san('グプタ', '研究者'), 'Anh Gupta là nhà nghiên cứu.'),
        (san('マリア', '会社員'), 'Chị Maria là nhân viên công ty.'),
        (s('テレサちゃん', 'は', '何歳', 'ですか', '。'), 'Bé Teresa mấy tuổi?', [C]),
        (s('9', '[W]歳{さい}', 'です', '。'), 'Bé ấy 9 tuổi.', [A, C],
         (s('テレサちゃん', 'は', '何歳', 'ですか', '。'), 'Bé Teresa mấy tuổi?', ['9人です。', 'はい、9歳です。', '9歳ですか。'])),
        (s('失礼ですが{しつれいですが}', '、', 'おいくつ', 'ですか', '。'), 'Xin lỗi, anh/chị bao nhiêu tuổi ạ?', [C]),
        (s('33', '[W]歳{さい}', 'です', '。'), 'Tôi 33 tuổi.', [A, C],
         (s('失礼ですが{しつれいですが}', '、', 'おいくつ', 'ですか', '。'), 'Xin lỗi, anh/chị bao nhiêu tuổi ạ?', ['33人です。', '33さんです。', 'いいえ、33歳です。'])),
        (nat('ミラーさん', 'アメリカ', 'ですか'), 'Anh Miller có phải là người Mỹ không?', [C]),
        (s('いいえ', '、', 'アメリカ人', 'じゃありません', '。', 'イギリス', '[W]人{じん}', 'です', '。'), 'Không, vị ấy không phải là người Mỹ. Vị ấy là người Anh.', [A, B, C],
         (s('あの方', 'は', 'アメリカ人', 'ですか', '。'), 'Vị kia có phải là người Mỹ không?', ['はい、アメリカ人じゃありません。イギリス人です。', 'いいえ、アメリカ人です。イギリス人です。', 'いいえ、アメリカさんじゃありません。'])),
        (s('あの人', 'も', 'インドネシア', '[W]人{じん}', 'です', '。'), 'Người kia cũng là người Indonesia.', [A, D]),
        (s('私', 'は', 'さくら大学', 'の', '学生', 'です', '。', '22', '[W]歳{さい}', 'です', '。'), 'Tôi là sinh viên của trường đại học Sakura. Tôi 22 tuổi.', [A, E]),
        (s('ワンさん', 'の', '先生', 'は', 'フランス', '[W]人{じん}', 'です', '。'), 'Giáo viên của anh Wang là người Pháp.', [A, E]),
        (s('イーさん', 'は', '韓国人', 'です', '。', 'イーさん', 'の', '先生', 'も', '韓国', '[W]人{じん}', 'です', '。'),
         'Chị Lee là người Hàn Quốc. Giáo viên của chị Lee cũng là người Hàn Quốc.', [A, D, E]),
    ],
    notes='Không gắn さん sau tên mình: 私はミラーです (không nói ミラーさんです khi tự giới thiệu).')

# Chủ dự án duyệt bài 1 ngày 2026-11-15
for p in (p1, p2, p3, p4, p5, p6):
    p['approved'] = True
write(1, [p1, p2, p3, p4, p5, p6])
