"""Ngữ pháp bài 2 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–2.
Chạy: python3 -I scripts/grammar-content/lesson_02.py  → data/grammar/lesson-02.json
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(2)
A1, B1, C1, D1, E1 = 'g01-01', 'g01-02', 'g01-03', 'g01-04', 'g01-05'
A, B, C, D, E = 'g02-01', 'g02-02', 'g02-03', 'g02-04', 'g02-05'


def s(*parts):
    return '|'.join(parts)


# ---------------------------------------------------------------------------
def kore(dem, noun, tail='です'):
    return s(f'[W]{dem}', '[P]は', noun, tail, '。')


p1 = point(2, 1, 'これ／それ／あれ は N です', 'Cái này / cái đó / cái kia là N',
    'これ, それ, あれ là đại từ chỉ đồ vật, đứng một mình làm chủ đề câu. これ: vật gần người nói (cái này, đây). '
    'それ: vật gần người nghe (cái đó, đó). あれ: vật xa cả hai người (cái kia, kia). Hỏi "cái gì" bằng 何 (なん): これは何ですか.',
    [
        (kore('これ', '本'), 'Đây là quyển sách.'),
        (kore('これ', '辞書'), 'Đây là cuốn từ điển.'),
        (kore('それ', '雑誌'), 'Đó là tạp chí.'),
        (kore('それ', 'ノート'), 'Đó là quyển vở.'),
        (kore('あれ', '時計'), 'Kia là cái đồng hồ.'),
        (kore('あれ', 'テレビ'), 'Kia là cái tivi.'),
        (kore('これ', 'かぎ'), 'Đây là chìa khóa.'),
        (kore('それ', '傘'), 'Đó là cái ô.'),
        (kore('あれ', '自動車'), 'Kia là chiếc ô tô.'),
        (kore('これ', 'ボールペン'), 'Đây là cây bút bi.'),
        (kore('それ', '鉛筆', 'じゃありません'), 'Đó không phải là bút chì.', [B1]),
        (kore('これ', '新聞', 'ですか'), 'Đây có phải là tờ báo không?', [C1]),
        (kore('あれ', 'カメラ', 'ですか'), 'Kia có phải là máy ảnh không?', [C1]),
        (kore('これ', '名刺'), 'Đây là danh thiếp.'),
        (kore('それ', 'テレホンカード', 'ですか'), 'Đó có phải là thẻ điện thoại không?', [C1]),
        (kore('あれ', 'コンピュータ', 'じゃありません'), 'Kia không phải là máy vi tính.', [B1]),
        (kore('これ', 'チョコレート'), 'Đây là sô-cô-la.'),
        (kore('それ', 'コーヒー'), 'Đó là cà phê.'),
        (kore('あれ', 'ラジオ', 'ですか'), 'Kia có phải là cái radio không?', [C1]),
        (kore('これ', '手帳', 'じゃありません'), 'Đây không phải là sổ tay.', [B1]),
        (kore('これ', '何', 'ですか'), 'Đây là cái gì?', [C1]),
        (s('それ', 'は', 'テープ', 'です', '。', '[W]これ', 'も', 'テープ', 'です', '。'), 'Đó là băng cát-xét. Cái này cũng là băng cát-xét.', [D1]),
        (s('[W]これ', 'は', '私', '[P]の', '本', 'です', '。'), 'Đây là sách của tôi.', [E1]),
        (s('[W]あれ', 'は', 'ミラーさん', 'の', '自動車', 'です', '。'), 'Kia là ô tô của anh Miller.', [E1]),
        (s('[W]それ', 'は', '日本', 'の', '時計', 'ですか', '。'), 'Đó có phải là đồng hồ Nhật không?', [C1, E1]),
        (s('[W]あれ', 'は', 'テレビ', 'じゃありません', '。', 'コンピュータ', 'です', '。'), 'Kia không phải là tivi. Đó là máy vi tính.', [A1, B1]),
        (s('これ', 'は', 'かばん', 'です', '。', '[W]それ', 'も', 'かばん', 'ですか', '。'), 'Đây là cái cặp. Cái đó cũng là cái cặp à?', [C1, D1]),
        (s('[W]あれ', 'は', '誰', 'の', '傘', 'ですか', '。'), 'Kia là ô của ai?', [C1, E1]),
        (s('[W]それ', 'は', '私', 'の', '名刺', 'じゃありません', '。'), 'Đó không phải là danh thiếp của tôi.', [B1, E1]),
        (s('[W]これ', 'は', 'カリナさん', 'の', 'ノート', 'です', '。'), 'Đây là quyển vở của chị Karina.', [E1]),
    ])

# ---------------------------------------------------------------------------
def kono(dem, noun, owner, tail='です'):
    return s(f'[W]{dem}', noun, '[P]は', owner, 'の', noun, tail, '。')


p2 = point(2, 2, 'この／その／あの N', 'N này / N đó / N kia',
    'この, その, あの luôn đi kèm một danh từ ngay sau, không đứng một mình: この本 (quyển sách này), その傘 (cái ô đó), '
    'あの時計 (cái đồng hồ kia). Khoảng cách giống これ, それ, あれ. Phân biệt: これは本です (đây là sách) nhưng この本は私の本です (quyển sách này là sách của tôi).',
    [
        (kono('この', '本', '私'), 'Quyển sách này là sách của tôi.', [E1]),
        (kono('この', 'かばん', 'ミラーさん'), 'Cái cặp này là cặp của anh Miller.', [E1]),
        (kono('その', '傘', 'カリナさん'), 'Cái ô đó là ô của chị Karina.', [E1]),
        (kono('その', '時計', '日本'), 'Cái đồng hồ đó là đồng hồ Nhật.', [E1]),
        (kono('あの', '自動車', 'シュミットさん'), 'Chiếc ô tô kia là ô tô của ông Schmidt.', [E1]),
        (kono('この', 'ノート', 'ワンさん'), 'Quyển vở này là vở của anh Wang.', [E1]),
        (kono('その', '辞書', 'イーさん'), 'Cuốn từ điển đó là từ điển của chị Lee.', [E1]),
        (kono('あの', 'いす', '先生'), 'Cái ghế kia là ghế của giáo viên.', [E1]),
        (kono('この', 'カメラ', '私'), 'Cái máy ảnh này là máy ảnh của tôi.', [E1]),
        (kono('その', '鉛筆', 'サントスさん'), 'Cây bút chì đó là bút chì của anh Santos.', [E1]),
        (kono('この', 'かぎ', '誰', 'ですか'), 'Chìa khóa này là chìa khóa của ai?', [C1, E1]),
        (kono('その', '雑誌', '誰', 'ですか'), 'Tạp chí đó là tạp chí của ai?', [C1, E1]),
        (kono('あの', '時計', '日本', 'ですか'), 'Cái đồng hồ kia có phải là đồng hồ Nhật không?', [C1, E1]),
        (kono('この', 'コンピュータ', '私', 'じゃありません'), 'Máy vi tính này không phải là máy của tôi.', [B1, E1]),
        (kono('その', 'テープ', 'ミラーさん', 'ですか'), 'Cuộn băng đó có phải là băng của anh Miller không?', [C1, E1]),
        (kono('あの', '机', '先生'), 'Cái bàn kia là bàn của giáo viên.', [E1]),
        (kono('この', '名刺', 'シュミットさん'), 'Tấm danh thiếp này là danh thiếp của ông Schmidt.', [E1]),
        (kono('その', 'かばん', '私', 'じゃありません'), 'Cái cặp đó không phải là cặp của tôi.', [B1, E1]),
        (kono('あの', 'ラジオ', 'カリナさん', 'ですか'), 'Cái radio kia có phải là radio của chị Karina không?', [C1, E1]),
        (kono('この', '手帳', 'グプタさん'), 'Cuốn sổ tay này là sổ tay của anh Gupta.', [E1]),
        (s('これ', 'は', '本', 'です', '。', '[W]この', '本', 'は', '私', 'の', '本', 'です', '。'), 'Đây là quyển sách. Quyển sách này là sách của tôi.', [A, E1]),
        (s('[W]その', '傘', 'も', 'カリナさん', 'の', '傘', 'です', '。'), 'Cái ô đó cũng là ô của chị Karina.', [D1, E1]),
        (s('[W]あの', '自動車', 'は', '日本', 'の', '自動車', 'じゃありません', '。', 'ドイツ', 'の', '自動車', 'です', '。'),
         'Chiếc ô tô kia không phải là xe Nhật. Đó là xe Đức.', [A1, B1, E1]),
        (s('[W]この', 'ボールペン', 'も', 'ワンさん', 'の', 'ボールペン', 'ですか', '。'), 'Cây bút bi này cũng là bút của anh Wang à?', [C1, D1, E1]),
        (s('[W]その', '辞書', 'は', '私', 'の', '辞書', 'じゃありません', '。', 'イーさん', 'の', '辞書', 'です', '。'),
         'Cuốn từ điển đó không phải của tôi. Đó là từ điển của chị Lee.', [A1, B1, E1]),
        (s('あれ', 'は', '時計', 'です', '。', '[W]あの', '時計', 'は', '私', 'の', '時計', 'です', '。'), 'Kia là cái đồng hồ. Cái đồng hồ kia là đồng hồ của tôi.', [A, E1]),
        (s('それ', 'は', 'テープレコーダー', 'です', '。', '[W]その', 'テープレコーダー', 'は', '先生', 'の', 'テープレコーダー', 'です', '。'),
         'Đó là máy ghi âm. Máy ghi âm đó là của giáo viên.', [A, E1]),
        (kono('この', 'シャープペンシル', '誰', 'ですか'), 'Cây bút chì kim này là của ai?', [C1, E1]),
        (s('[W]あの', 'いす', 'も', '先生', 'の', 'いす', 'ですか', '。'), 'Cái ghế kia cũng là ghế của giáo viên à?', [C1, D1, E1]),
        (kono('この', 'チョコレート', 'カリナさん'), 'Thanh sô-cô-la này là của chị Karina.', [E1]),
    ])

# ---------------------------------------------------------------------------
def ask(dem, noun):
    return (s(dem, 'は', noun, 'ですか', '。'), {'これ': 'Đây', 'それ': 'Đó', 'あれ': 'Kia'}[dem] + f' có phải là {VI[noun]} không?')


VI = {'辞書': 'từ điển', '本': 'sách', '雑誌': 'tạp chí', 'ノート': 'quyển vở', '時計': 'đồng hồ', '傘': 'cái ô', 'かぎ': 'chìa khóa',
      '鉛筆': 'bút chì', 'ボールペン': 'bút bi', 'シャープペンシル': 'bút chì kim', '新聞': 'tờ báo', 'カメラ': 'máy ảnh', 'テレビ': 'tivi',
      'ラジオ': 'radio', 'コンピュータ': 'máy vi tính', '手帳': 'sổ tay', '名刺': 'danh thiếp', 'かばん': 'cái cặp', 'テープ': 'băng cát-xét',
      'テレホンカード': 'thẻ điện thoại', 'カード': 'tấm thẻ', 'いす': 'cái ghế', '机': 'cái bàn', 'コーヒー': 'cà phê',
      'チョコレート': 'sô-cô-la', '自動車': 'ô tô', 'テープレコーダー': 'máy ghi âm'}


def yes(dem, noun, tail, tail_vi):
    q, qm = ask(dem, noun)
    reply = s('はい', '、', 'そう', '[F]です', '。', *tail, '。')
    t = ''.join(x.split('{')[0] for x in tail) + '。'
    return (reply, f'Vâng, đúng vậy. {tail_vi}', [C1], (q, qm, [f'いいえ、そうです。{t}', f'はい、そうじゃありません。{t}', f'はい、違います。{t}']))


def nosou(dem, noun, real, real_vi):
    q, qm = ask(dem, noun)
    reply = s('いいえ', '、', 'そう', '[F]じゃありません', '。', real, 'です', '。')
    return (reply, f'Không, không phải. Đó là {real_vi}.', [B1, C1], (q, qm, [f'はい、そうじゃありません。{real}です。', f'いいえ、そうです。{real}です。', f'はい、そうです。{real}です。']))


def chigau(dem, noun, real, real_vi):
    q, qm = ask(dem, noun)
    reply = s('いいえ', '、', '違います', '。', real, '[F]です', '。')
    return (reply, f'Không, sai rồi. Đó là {real_vi}.', [C1], (q, qm, [f'はい、違います。{real}です。', f'いいえ、そうです。{real}です。', f'はい、そうです。{real}です。']))


p3 = point(2, 3, 'そうです／そうじゃ ありません／違います', 'Đúng vậy / Không phải / Sai rồi',
    'Trả lời câu hỏi "N1 は N2 ですか" mà không lặp lại danh từ: はい、そうです (vâng, đúng vậy); いいえ、そうじゃ ありません '
    '(không, không phải). いいえ、違います (không, sai rồi) cũng dùng để phủ định, rồi nói điều đúng ngay sau. '
    'そうですか (thế à) là câu đáp khi nhận thêm thông tin mới, không phải câu hỏi.',
    [
        yes('それ', '辞書', ['私', 'の', '辞書', 'です'], 'Đó là từ điển của tôi.'),
        yes('これ', '本', ['日本', 'の', '本', 'です'], 'Đây là sách của Nhật.'),
        yes('あれ', '時計', ['先生', 'の', '時計', 'です'], 'Kia là đồng hồ của giáo viên.'),
        nosou('それ', 'ノート', '手帳', 'sổ tay'),
        nosou('これ', '鉛筆', 'ボールペン', 'bút bi'),
        nosou('あれ', 'テレビ', 'コンピュータ', 'máy vi tính'),
        chigau('それ', 'かぎ', 'カード', 'tấm thẻ'),
        chigau('これ', '新聞', '雑誌', 'tạp chí'),
        chigau('あれ', 'ラジオ', 'テープレコーダー', 'máy ghi âm'),
        yes('それ', 'かばん', ['ミラーさん', 'の', 'かばん', 'です'], 'Đó là cặp của anh Miller.'),
        nosou('それ', 'シャープペンシル', '鉛筆', 'bút chì'),
        chigau('これ', 'カメラ', '時計', 'đồng hồ'),
        yes('あれ', '自動車', ['シュミットさん', 'の', '自動車', 'です'], 'Kia là ô tô của ông Schmidt.'),
        nosou('これ', 'コーヒー', 'チョコレート', 'sô-cô-la'),
        chigau('それ', '傘', 'いす', 'cái ghế'),
        yes('これ', '名刺', ['ワンさん', 'の', '名刺', 'です'], 'Đây là danh thiếp của anh Wang.'),
        nosou('あれ', '机', 'いす', 'cái ghế'),
        chigau('それ', 'テレホンカード', '名刺', 'danh thiếp'),
        yes('それ', 'テープ', ['日本', 'の', 'テープ', 'です'], 'Đó là băng cát-xét của Nhật.'),
        nosou('これ', '辞書', '本', 'sách'),
        (s('いいえ', '、', 'そう', '[F]じゃありません', '。', '私', 'の', '傘', 'じゃありません', '。', 'カリナさん', 'の', '傘', 'です', '。'),
         'Không, không phải. Đó không phải là ô của tôi. Đó là ô của chị Karina.', [A1, B1, C1, E1],
         (s('それ', 'は', 'あなた', 'の', '傘', 'ですか', '。'), 'Đó có phải là ô của bạn không?',
          ['はい、そうじゃありません。私の傘じゃありません。カリナさんの傘です。', 'いいえ、そうです。私の傘じゃありません。カリナさんの傘です。', 'いいえ、違います。私の傘です。カリナさんの傘です。'])),
        (s('はい', '、', 'そう', '[F]です', '。', 'ミラーさん', 'も', '会社員', 'です', '。'), 'Vâng, đúng vậy. Anh Miller cũng là nhân viên công ty.', [C1, D1],
         (s('ミラーさん', 'も', '会社員', 'ですか', '。'), 'Anh Miller cũng là nhân viên công ty à?',
          ['いいえ、そうです。ミラーさんも会社員です。', 'はい、そうじゃありません。ミラーさんも会社員です。', 'はい、違います。ミラーさんも会社員です。'])),
        (s('いいえ', '、', '違います', '。', 'ドイツ', 'の', '自動車', '[F]です', '。'), 'Không, sai rồi. Đó là xe Đức.', [C1, E1],
         (s('この', '自動車', 'は', '日本', 'の', '自動車', 'ですか', '。'), 'Chiếc ô tô này có phải là xe Nhật không?',
          ['はい、違います。ドイツの自動車です。', 'いいえ、そうです。ドイツの自動車です。', 'はい、そうです。ドイツの自動車です。'])),
        (s('そうですか', '。'), 'Thế à.', [A1],
         (s('これ', 'は', '日本', 'の', 'チョコレート', 'です', '。'), 'Đây là sô-cô-la Nhật.', ['いいえ、そうです。', 'はい、違います。', 'いいえ、そうですか。'])),
        (s('いいえ', '、', 'そう', '[F]じゃありません', '。', '研究者', 'です', '。'), 'Không, không phải. Tôi là nhà nghiên cứu.', [A1, B1, C1],
         (s('あなた', 'は', '先生', 'ですか', '。'), 'Bạn có phải là giáo viên không?',
          ['はい、そうじゃありません。研究者です。', 'いいえ、そうです。研究者です。', 'はい、そうです。研究者です。'])),
        (s('はい', '、', 'そう', '[F]です', '。', 'さくら大学', 'の', '学生', 'です', '。'), 'Vâng, đúng vậy. Tôi là sinh viên trường đại học Sakura.', [A1, C1, E1],
         (s('あなた', 'は', '学生', 'ですか', '。'), 'Bạn có phải là sinh viên không?',
          ['いいえ、そうです。さくら大学の学生です。', 'はい、そうじゃありません。さくら大学の学生です。', 'はい、違います。さくら大学の学生です。'])),
        (s('いいえ', '、', '違います', '。', 'イーさん', 'の', 'かぎ', '[F]です', '。'), 'Không, sai rồi. Đó là chìa khóa của chị Lee.', [C1, E1],
         (s('その', 'かぎ', 'は', 'ワンさん', 'の', 'かぎ', 'ですか', '。'), 'Chìa khóa đó có phải là của anh Wang không?',
          ['はい、違います。イーさんのかぎです。', 'いいえ、そうです。イーさんのかぎです。', 'はい、そうです。イーさんのかぎです。'])),
        (s('はい', '、', 'そう', '[F]です', '。', 'あの', '方', 'は', 'さくら大学', 'の', '先生', 'です', '。').replace('あの|方', 'あの方'),
         'Vâng, đúng vậy. Vị kia là giáo viên trường đại học Sakura.', [A1, C1, E1],
         (s('あの方', 'は', '先生', 'ですか', '。'), 'Vị kia có phải là giáo viên không?',
          ['いいえ、そうです。あの方はさくら大学の先生です。', 'はい、そうじゃありません。あの方はさくら大学の先生です。', 'はい、違います。あの方はさくら大学の先生です。'])),
        (s('いいえ', '、', 'そう', '[F]じゃありません', '。', 'アメリカ', 'の', 'コンピュータ', 'です', '。'), 'Không, không phải. Đó là máy vi tính của Mỹ.', [B1, C1, E1],
         (s('その', 'コンピュータ', 'は', '日本', 'の', 'コンピュータ', 'ですか', '。'), 'Cái máy vi tính đó có phải là máy của Nhật không?',
          ['はい、そうじゃありません。アメリカのコンピュータです。', 'いいえ、そうです。アメリカのコンピュータです。', 'はい、そうです。アメリカのコンピュータです。'])),
        (s('はい', '、', 'そう', '[F]です', '。', '私', 'も', '日本人', 'です', '。'), 'Vâng, đúng vậy. Tôi cũng là người Nhật.', [C1, D1],
         (s('あなた', 'も', '日本人', 'ですか', '。'), 'Bạn cũng là người Nhật à?',
          ['いいえ、そうです。私も日本人です。', 'はい、そうじゃありません。私も日本人です。', 'はい、違います。私も日本人です。'])),
    ],
    notes='Khi trả lời bằng いいえ thì không dùng そうです; khi trả lời bằng はい thì không dùng 違います.')

# ---------------------------------------------------------------------------
def either(subj, a, b, tail=''):
    return s(subj, 'は', a, 'です', '[P]か', '、', b, 'です', 'か', '。')


def pick(subj, a, b, ans, qm, ans_vi):
    q = s(subj, 'は', a, 'です', 'か', '、', b, 'です', 'か', '。')
    reply = s(ans, '[F]です', '。')
    return (reply, ans_vi, [A1], (q, qm, [f'はい、{ans}です。', f'いいえ、{ans}です。', f'{ans}ですか。']))


p4 = point(2, 4, 'S1 か、S2 か', 'S1 hay S2?',
    'Câu hỏi lựa chọn: đặt hai câu hỏi liền nhau, mỗi câu kết thúc bằng か, để người nghe chọn một. '
    'Khi trả lời chỉ nói điều đúng: シャープペンシルです; không trả lời bằng はい hay いいえ.',
    [
        (either('それ', 'ボールペン', 'シャープペンシル'), 'Đó là bút bi hay bút chì kim?'),
        (either('これ', '本', '辞書'), 'Đây là sách hay từ điển?'),
        (either('あれ', '時計', 'カメラ'), 'Kia là đồng hồ hay máy ảnh?'),
        (either('それ', 'ノート', '手帳'), 'Đó là quyển vở hay sổ tay?'),
        (either('これ', 'コーヒー', 'チョコレート'), 'Đây là cà phê hay sô-cô-la?'),
        (either('あれ', 'テレビ', 'コンピュータ'), 'Kia là tivi hay máy vi tính?'),
        (either('それ', '雑誌', '新聞'), 'Đó là tạp chí hay tờ báo?'),
        (either('これ', 'カード', 'テレホンカード'), 'Đây là tấm thẻ thường hay thẻ điện thoại?'),
        (either('あれ', 'ラジオ', 'テープレコーダー'), 'Kia là radio hay máy ghi âm?'),
        (either('それ', '鉛筆', 'ボールペン'), 'Đó là bút chì hay bút bi?'),
        pick('それ', 'ボールペン', 'シャープペンシル', 'シャープペンシル', 'Đó là bút bi hay bút chì kim?', 'Là bút chì kim.'),
        pick('これ', '本', '辞書', '辞書', 'Đây là sách hay từ điển?', 'Là từ điển.'),
        pick('あれ', '時計', 'カメラ', 'カメラ', 'Kia là đồng hồ hay máy ảnh?', 'Là máy ảnh.'),
        pick('それ', 'ノート', '手帳', 'ノート', 'Đó là quyển vở hay sổ tay?', 'Là quyển vở.'),
        pick('これ', 'コーヒー', 'チョコレート', 'チョコレート', 'Đây là cà phê hay sô-cô-la?', 'Là sô-cô-la.'),
        (either('ミラーさん', '学生', '会社員'), 'Anh Miller là sinh viên hay nhân viên công ty?', [A1]),
        (either('あの方', '先生', '学生'), 'Vị kia là giáo viên hay sinh viên?', [A1]),
        pick('ミラーさん', '学生', '会社員', '会社員', 'Anh Miller là sinh viên hay nhân viên công ty?', 'Là nhân viên công ty.'),
        (either('ワンさん', '医者', '研究者'), 'Anh Wang là bác sĩ hay nhà nghiên cứu?', [A1]),
        pick('ワンさん', '医者', '研究者', '医者', 'Anh Wang là bác sĩ hay nhà nghiên cứu?', 'Là bác sĩ.'),
        (s('これ', 'は', 'ミラーさん', 'の', '傘', 'です', '[P]か', '、', 'カリナさん', 'の', '傘', 'です', 'か', '。'), 'Đây là ô của anh Miller hay ô của chị Karina?', [E1]),
        pick('これ', 'ミラーさんの傘', 'カリナさんの傘', 'カリナさんの傘', 'Đây là ô của anh Miller hay ô của chị Karina?', 'Là ô của chị Karina.'),
        (s('[W]この', '時計', 'は', '日本', 'の', '時計', 'です', '[P]か', '、', 'ドイツ', 'の', '時計', 'です', 'か', '。'), 'Cái đồng hồ này là đồng hồ Nhật hay đồng hồ Đức?', [B, E1]),
        pick('この時計', '日本の時計', 'ドイツの時計', 'ドイツの時計', 'Cái đồng hồ này là đồng hồ Nhật hay đồng hồ Đức?', 'Là đồng hồ Đức.'),
        (either('サントスさん', 'ブラジル人', 'アメリカ人'), 'Anh Santos là người Brazil hay người Mỹ?', [A1]),
        pick('サントスさん', 'ブラジル人', 'アメリカ人', 'ブラジル人', 'Anh Santos là người Brazil hay người Mỹ?', 'Là người Brazil.'),
        (s('[W]その', 'かばん', 'は', 'あなた', 'の', 'かばん', 'です', '[P]か', '、', '先生', 'の', 'かばん', 'です', 'か', '。'), 'Cái cặp đó là cặp của bạn hay cặp của giáo viên?', [B, E1]),
        pick('そのかばん', 'あなたのかばん', '先生のかばん', '先生のかばん', 'Cái cặp đó là cặp của bạn hay cặp của giáo viên?', 'Là cặp của giáo viên.'),
        (either('あの人', '日本人', '韓国人'), 'Người kia là người Nhật hay người Hàn Quốc?', [A1]),
        pick('あの人', '日本人', '韓国人', '韓国人', 'Người kia là người Nhật hay người Hàn Quốc?', 'Là người Hàn Quốc.'),
    ],
    notes='Trả lời câu hỏi lựa chọn thì không bắt đầu bằng はい / いいえ.')

# ---------------------------------------------------------------------------
def about(subj, topic, noun, tail='です'):
    return s(subj, 'は', topic, '[P]の', noun, tail, '。')


def what_reply(topic, noun, q, qm, vi):
    reply = s(topic, '[P]の', noun, 'です', '。')
    return (reply, vi, [A1], (q, qm, [f'はい、{topic}の{noun}です。', f'{topic}は{noun}です。', f'{topic}の{noun}ですか。']))


p5 = point(2, 5, 'N1 の N2 (nội dung)', 'N2 về N1; N2 tiếng N1',
    'Ngoài nghĩa sở hữu (bài 1), の còn cho biết N2 nói về điều gì hoặc bằng thứ tiếng nào: 日本語の本 (sách tiếng Nhật), '
    'コンピュータの本 (sách về máy vi tính). Hỏi nội dung bằng 何の N: これは何の本ですか (đây là sách gì?). '
    'Có thể ghép cả hai nghĩa: 私の日本語の本 (sách tiếng Nhật của tôi).',
    [
        (about('これ', '日本語', '本'), 'Đây là sách tiếng Nhật.'),
        (about('それ', '英語', '辞書'), 'Đó là từ điển tiếng Anh.'),
        (about('あれ', '英語', '新聞'), 'Kia là báo tiếng Anh.'),
        (about('これ', 'コンピュータ', '本'), 'Đây là sách về máy vi tính.'),
        (about('それ', '自動車', '雑誌'), 'Đó là tạp chí về ô tô.'),
        (about('これ', '日本語', 'テープ'), 'Đây là băng tiếng Nhật.'),
        (about('あれ', 'カメラ', '雑誌'), 'Kia là tạp chí về máy ảnh.'),
        (about('それ', '日本語', '新聞'), 'Đó là báo tiếng Nhật.'),
        (about('これ', '英語', '本'), 'Đây là sách tiếng Anh.'),
        (about('あれ', 'コーヒー', '本'), 'Kia là sách về cà phê.'),
        (about('これ', '何', '本', 'ですか'), 'Đây là sách gì?', [C1]),
        (about('それ', '何', '雑誌', 'ですか'), 'Đó là tạp chí gì?', [C1]),
        (about('あれ', '何', '新聞', 'ですか'), 'Kia là báo gì?', [C1]),
        what_reply('日本語', '本', s('これ', 'は', '何', 'の', '本', 'ですか', '。'), 'Đây là sách gì?', 'Là sách tiếng Nhật.'),
        what_reply('自動車', '雑誌', s('それ', 'は', '何', 'の', '雑誌', 'ですか', '。'), 'Đó là tạp chí gì?', 'Là tạp chí về ô tô.'),
        (about('これ', '英語', '辞書', 'ですか'), 'Đây có phải là từ điển tiếng Anh không?', [C1]),
        (s('いいえ', '、', '日本語', '[P]の', '辞書', 'です', '。'), 'Không, đó là từ điển tiếng Nhật.', [A1, C1],
         (s('これ', 'は', '英語', 'の', '辞書', 'ですか', '。'), 'Đây có phải là từ điển tiếng Anh không?',
          ['はい、日本語の辞書です。', 'いいえ、英語の辞書です。', 'いいえ、日本語は辞書です。'])),
        (s('この', '本', 'は', '日本語', '[P]の', '本', 'です', '。'), 'Quyển sách này là sách tiếng Nhật.', [B]),
        (s('その', 'テープ', 'は', '英語', '[P]の', 'テープ', 'じゃありません', '。'), 'Cuộn băng đó không phải là băng tiếng Anh.', [B, B1]),
        (s('あの', '雑誌', 'は', 'カメラ', '[P]の', '雑誌', 'ですか', '。'), 'Tạp chí kia có phải là tạp chí về máy ảnh không?', [B, C1]),
        (s('これ', 'は', '私', 'の', '日本語', '[P]の', '本', 'です', '。'), 'Đây là sách tiếng Nhật của tôi.', [E1]),
        (s('それ', 'は', '先生', 'の', 'コンピュータ', '[P]の', '本', 'です', '。'), 'Đó là sách về máy vi tính của giáo viên.', [E1]),
        (s('この', '雑誌', 'は', '自動車', '[P]の', '雑誌', 'です', '。', 'ミラーさん', 'の', '雑誌', 'です', '。'), 'Tạp chí này là tạp chí về ô tô. Đó là tạp chí của anh Miller.', [B, E1]),
        (s('あれ', 'は', '英語', '[P]の', '新聞', 'です', 'か', '、', '日本語', 'の', '新聞', 'です', 'か', '。'), 'Kia là báo tiếng Anh hay báo tiếng Nhật?', [D]),
        what_reply('英語', '新聞', s('あれ', 'は', '英語', 'の', '新聞', 'です', 'か', '、', '日本語', 'の', '新聞', 'です', 'か', '。'), 'Kia là báo tiếng Anh hay báo tiếng Nhật?', 'Là báo tiếng Anh.'),
        (s('その', '本', 'も', '日本語', '[P]の', '本', 'ですか', '。'), 'Quyển sách đó cũng là sách tiếng Nhật à?', [B, C1, D1]),
        (s('それ', 'は', '誰', 'の', '日本語', '[P]の', '本', 'ですか', '。'), 'Đó là sách tiếng Nhật của ai?', [C1, E1]),
        (s('カリナさん', 'の', '日本語', '[P]の', '本', 'です', '。'), 'Là sách tiếng Nhật của chị Karina.', [A1, E1],
         (s('それ', 'は', '誰', 'の', '日本語', 'の', '本', 'ですか', '。'), 'Đó là sách tiếng Nhật của ai?',
          ['はい、カリナさんの日本語の本です。', 'カリナさんは日本語の本です。', 'カリナさんの日本語の本ですか。'])),
        (s('この', 'テープ', 'は', '英語', 'の', 'テープ', 'じゃありません', '。', '日本語', '[P]の', 'テープ', 'です', '。'), 'Cuộn băng này không phải là băng tiếng Anh. Đó là băng tiếng Nhật.', [A1, B, B1]),
        (s('あれ', 'も', '自動車', '[P]の', '雑誌', 'です', '。'), 'Cái kia cũng là tạp chí về ô tô.', [D1]),
    ])

# ---------------------------------------------------------------------------
def mine(subj, owner, tail='です'):
    return s(subj, 'は', owner, '[P]の', tail, '。')


def whose_reply(owner, q, qm, vi, owner_vi):
    reply = s(owner, '[P]の', 'です', '。')
    return (reply, vi, [A1], (q, qm, [f'はい、{owner}のです。', f'{owner}です。', f'{owner}のですか。']))


p6 = point(2, 6, 'N の (thay cho danh từ)', 'của N (bỏ danh từ đã rõ)',
    'Khi danh từ đã rõ, có thể bỏ nó và chỉ giữ "N の": このかばんは私のかばんです → このかばんは私のです (cái cặp này là của tôi). '
    'Hỏi "của ai" bằng 誰の: これは誰のですか. Không bỏ được の: 私です nghĩa là "là tôi", không phải "của tôi".',
    [
        (mine('これ', '私'), 'Cái này là của tôi.'),
        (mine('それ', 'ミラーさん'), 'Cái đó là của anh Miller.'),
        (mine('あれ', '先生'), 'Cái kia là của giáo viên.'),
        (mine('この本', '私').replace('この本', 'この|本'), 'Quyển sách này là của tôi.', [B]),
        (mine('そのかばん', 'カリナさん').replace('そのかばん', 'その|かばん'), 'Cái cặp đó là của chị Karina.', [B]),
        (mine('あの傘', 'サントスさん').replace('あの傘', 'あの|傘'), 'Cái ô kia là của anh Santos.', [B]),
        (mine('このかぎ', 'ワンさん').replace('このかぎ', 'この|かぎ'), 'Chìa khóa này là của anh Wang.', [B]),
        (mine('その時計', 'シュミットさん').replace('その時計', 'その|時計'), 'Cái đồng hồ đó là của ông Schmidt.', [B]),
        (mine('あの自動車', '先生').replace('あの自動車', 'あの|自動車'), 'Chiếc ô tô kia là của giáo viên.', [B]),
        (mine('このカメラ', 'イーさん').replace('このカメラ', 'この|カメラ'), 'Cái máy ảnh này là của chị Lee.', [B]),
        (mine('これ', '誰', 'ですか'), 'Cái này là của ai?', [C1]),
        (mine('この傘', '誰', 'ですか').replace('この傘', 'この|傘'), 'Cái ô này là của ai?', [B, C1]),
        whose_reply('私', s('この', '傘', 'は', '誰', 'の', 'ですか', '。'), 'Cái ô này là của ai?', 'Là của tôi.', 'tôi'),
        whose_reply('ミラーさん', s('その', 'かばん', 'は', '誰', 'の', 'ですか', '。'), 'Cái cặp đó là của ai?', 'Là của anh Miller.', 'anh Miller'),
        (mine('そのノート', '私', 'じゃありません').replace('そのノート', 'その|ノート'), 'Quyển vở đó không phải của tôi.', [B, B1]),
        (mine('あの自動車', 'ミラーさん', 'ですか').replace('あの自動車', 'あの|自動車'), 'Chiếc ô tô kia có phải của anh Miller không?', [B, C1]),
        (s('いいえ', '、', 'ミラーさん', '[P]の', 'じゃありません', '。'), 'Không, không phải của anh Miller.', [B1, C1],
         (s('あの', '自動車', 'は', 'ミラーさん', 'の', 'ですか', '。'), 'Chiếc ô tô kia có phải của anh Miller không?',
          ['はい、ミラーさんのじゃありません。', 'いいえ、ミラーさんのです。', 'いいえ、ミラーさんじゃありません。'])),
        (mine('その名刺', '先生', 'ですか').replace('その名刺', 'その|名刺'), 'Tấm danh thiếp đó có phải của giáo viên không?', [B, C1]),
        (mine('この辞書', 'カリナさん', 'じゃありません').replace('この辞書', 'この|辞書'), 'Cuốn từ điển này không phải của chị Karina.', [B, B1]),
        (mine('あのテレビ', '私').replace('あのテレビ', 'あの|テレビ'), 'Cái tivi kia là của tôi.', [B]),
        (s('この', '本', 'は', '私', 'の', 'です', '。', 'その', '本', 'も', '私', '[P]の', 'です', '。'), 'Quyển sách này là của tôi. Quyển sách đó cũng là của tôi.', [B, D1]),
        (s('これ', 'は', '私', 'の', '傘', 'じゃありません', '。', 'ミラーさん', '[P]の', 'です', '。'), 'Đây không phải là ô của tôi. Nó là của anh Miller.', [B1, E1]),
        (s('はい', '、', 'そう', 'です', '。', '私', '[P]の', 'です', '。'), 'Vâng, đúng vậy. Là của tôi.', [C],
         (s('それ', 'は', 'あなた', 'の', 'かばん', 'ですか', '。'), 'Đó có phải là cặp của bạn không?',
          ['いいえ、そうです。私のです。', 'はい、違います。私のです。', 'はい、そうです。私です。'])),
        (s('その', '時計', 'は', '日本', 'の', '時計', 'です', '。', '私', '[P]の', 'です', '。'), 'Cái đồng hồ đó là đồng hồ Nhật. Nó là của tôi.', [B, E1]),
        (s('この', 'かばん', 'は', 'カリナさん', '[P]の', 'です', 'か', '、', 'イーさん', 'の', 'です', 'か', '。'), 'Cái cặp này là của chị Karina hay của chị Lee?', [B, D]),
        whose_reply('イーさん', s('この', 'かばん', 'は', 'カリナさん', 'の', 'です', 'か', '、', 'イーさん', 'の', 'です', 'か', '。'),
                    'Cái cặp này là của chị Karina hay của chị Lee?', 'Là của chị Lee.', 'chị Lee'),
        (s('あの', '日本語', 'の', '本', 'は', '誰', '[P]の', 'ですか', '。'), 'Quyển sách tiếng Nhật kia là của ai?', [B, E]),
        (s('その', '傘', 'も', '私', '[P]の', 'じゃありません', '。'), 'Cái ô đó cũng không phải là của tôi.', [B, B1, D1]),
        (s('いいえ', '、', '違います', '。', 'ワンさん', '[P]の', 'です', '。'), 'Không, sai rồi. Là của anh Wang.', [C],
         (s('これ', 'は', 'サントスさん', 'の', 'ですか', '。'), 'Cái này có phải của anh Santos không?',
          ['はい、違います。ワンさんのです。', 'いいえ、そうです。ワンさんのです。', 'いいえ、違います。ワンさんです。'])),
        (mine('このコーヒー', '私').replace('このコーヒー', 'この|コーヒー'), 'Ly cà phê này là của tôi.', [B]),
    ],
    notes='私のです là "của tôi"; 私です là "là tôi". Không bỏ の.')

# Chủ dự án duyệt bài 2 ngày 2026-11-12
for p in (p1, p2, p3, p4, p5, p6):
    p['approved'] = True
write(2, [p1, p2, p3, p4, p5, p6])
