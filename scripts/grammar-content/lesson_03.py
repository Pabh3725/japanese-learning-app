"""Ngữ pháp bài 3 Minna no Nihongo. Giải thích và câu do Claude tự soạn, chỉ dùng từ vựng bài 1–3.
Chạy: python3 -I scripts/grammar-content/lesson_03.py  → data/grammar/lesson-03.json
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dsl import point, use_lesson, write  # noqa: E402

use_lesson(3)
A1, B1, C1, D1, E1 = 'g01-01', 'g01-02', 'g01-03', 'g01-04', 'g01-05'
B2, C2, D2, E2, F2 = 'g02-02', 'g02-03', 'g02-04', 'g02-05', 'g02-06'
A, B, C, D = 'g03-01', 'g03-02', 'g03-03', 'g03-04'


def s(*parts):
    return '|'.join(parts)


def reply(text_parts, meaning, uses, q, qm, short):
    """Câu đáp ngắn cho câu hỏi có từ để hỏi: câu đáp sai là thêm はい/いいえ hoặc biến thành câu hỏi."""
    return (s(*text_parts), meaning, uses, (q, qm, [f'はい、{short}', f'いいえ、{short}', short.replace('です。', 'ですか。')]))


# ---------------------------------------------------------------------------
def koko(dem, place, tail='です'):
    return s(f'[W]{dem}', '[P]は', place, tail, '。')


p1 = point(3, 1, 'ここ／そこ／あそこ は N です', 'Đây / đó / kia là N (nơi chốn)',
    'ここ, そこ, あそこ chỉ nơi chốn: ここ là chỗ người nói đang ở (đây), そこ là chỗ gần người nghe (đó), あそこ là chỗ xa cả hai (kia). '
    'Hỏi nơi chốn bằng どこ: ここはどこですか (đây là đâu?). Khác với これ, それ, あれ là chỉ đồ vật.',
    [
        (koko('ここ', '教室'), 'Đây là lớp học.'),
        (koko('ここ', '食堂'), 'Đây là nhà ăn.'),
        (koko('そこ', '事務所'), 'Đó là văn phòng.'),
        (koko('そこ', '会議室'), 'Đó là phòng họp.'),
        (koko('あそこ', '受付'), 'Kia là quầy tiếp tân.'),
        (koko('あそこ', 'トイレ'), 'Kia là nhà vệ sinh.'),
        (koko('ここ', 'ロビー'), 'Đây là sảnh.'),
        (koko('そこ', '階段'), 'Đó là cầu thang.'),
        (koko('あそこ', '売り場'), 'Kia là quầy bán hàng.'),
        (koko('ここ', '地下'), 'Đây là tầng hầm.'),
        (koko('ここ', '教室', 'ですか'), 'Đây có phải là lớp học không?', [C1]),
        (koko('そこ', '食堂', 'じゃありません'), 'Đó không phải là nhà ăn.', [B1]),
        (koko('あそこ', '会議室', 'ですか'), 'Kia có phải là phòng họp không?', [C1]),
        (koko('ここ', '大学'), 'Đây là trường đại học.'),
        (koko('そこ', '病院', 'ですか'), 'Đó có phải là bệnh viện không?', [C1]),
        (koko('あそこ', '事務所', 'じゃありません'), 'Kia không phải là văn phòng.', [B1]),
        (koko('ここ', '会社'), 'Đây là công ty.'),
        (koko('ここ', 'うち'), 'Đây là nhà tôi.'),
        (koko('あそこ', 'エレベーター', 'ですか'), 'Kia có phải là thang máy không?', [C1]),
        (koko('そこ', 'エスカレーター'), 'Đó là thang cuốn.'),
        (koko('ここ', 'どこ', 'ですか'), 'Đây là đâu?', [C1]),
        (koko('ここ', 'さくら大学'), 'Đây là trường đại học Sakura.', [A1]),
        (s('[W]ここ', 'は', '私', 'の', '部屋', 'です', '。'), 'Đây là phòng của tôi.', [E1]),
        (s('[W]そこ', 'は', '先生', 'の', '部屋', 'ですか', '。'), 'Đó có phải là phòng của giáo viên không?', [C1, E1]),
        (s('[W]あそこ', 'は', '食堂', 'じゃありません', '。', '会議室', 'です', '。'), 'Kia không phải là nhà ăn. Đó là phòng họp.', [A1, B1]),
        (s('[W]ここ', 'は', 'ミラーさん', 'の', '会社', 'です', '。'), 'Đây là công ty của anh Miller.', [E1]),
        (s('[W]そこ', 'は', '教室', 'です', 'か', '、', '事務所', 'です', 'か', '。'), 'Đó là lớp học hay văn phòng?', [D2]),
        (s('[W]あそこ', 'も', 'トイレ', 'です', '。'), 'Kia cũng là nhà vệ sinh.', [D1]),
        (s('[W]ここ', 'は', '日本語', 'の', '教室', 'です', '。'), 'Đây là lớp học tiếng Nhật.', [E2]),
        (s('[W]そこ', 'は', '靴', 'の', '売り場', 'です', '。'), 'Đó là quầy bán giày.', [E2]),
    ])

# ---------------------------------------------------------------------------
def where(place, dem, tail='です'):
    return s(place, '[P]は', f'[W]{dem}', tail, '。')


p2 = point(3, 2, 'N は ここ／そこ／あそこ です', 'N ở đây / đó / kia',
    'Để nói một nơi, một vật hay một người ở đâu, đặt nó làm chủ đề rồi nói chỗ: トイレはあそこです (nhà vệ sinh ở đằng kia). '
    'Hỏi bằng どこ: 食堂はどこですか (nhà ăn ở đâu?). Chỗ có thể là ここ/そこ/あそこ, tên phòng hoặc tầng: 会議室は3階です.',
    [
        (where('トイレ', 'あそこ'), 'Nhà vệ sinh ở đằng kia.'),
        (where('食堂', 'ここ'), 'Nhà ăn ở đây.'),
        (where('受付', 'そこ'), 'Quầy tiếp tân ở đó.'),
        (where('会議室', 'あそこ'), 'Phòng họp ở đằng kia.'),
        (where('事務所', 'ここ'), 'Văn phòng ở đây.'),
        (where('教室', 'そこ'), 'Lớp học ở đó.'),
        (where('エレベーター', 'あそこ'), 'Thang máy ở đằng kia.'),
        (where('ロビー', 'ここ'), 'Sảnh ở đây.'),
        (where('階段', 'そこ'), 'Cầu thang ở đó.'),
        (where('エスカレーター', 'あそこ'), 'Thang cuốn ở đằng kia.'),
        (where('トイレ', 'どこ', 'ですか'), 'Nhà vệ sinh ở đâu?', [C1]),
        (where('食堂', 'どこ', 'ですか'), 'Nhà ăn ở đâu?', [C1]),
        reply(['[W]あそこ', 'です', '。'], 'Ở đằng kia.', [A1], s('トイレ', 'は', 'どこ', 'ですか', '。'), 'Nhà vệ sinh ở đâu?', 'あそこです。'),
        reply(['[W]ここ', 'です', '。'], 'Ở đây.', [A1], s('食堂', 'は', 'どこ', 'ですか', '。'), 'Nhà ăn ở đâu?', 'ここです。'),
        (where('受付', 'どこ', 'ですか'), 'Quầy tiếp tân ở đâu?', [C1]),
        reply(['[W]そこ', 'です', '。'], 'Ở đó.', [A1], s('受付', 'は', 'どこ', 'ですか', '。'), 'Quầy tiếp tân ở đâu?', 'そこです。'),
        (s('会議室', '[P]は', '3階{さんがい}', 'です', '。'), 'Phòng họp ở tầng 3.'),
        (s('事務所', '[P]は', '2階{にかい}', 'です', '。'), 'Văn phòng ở tầng 2.'),
        (s('食堂', '[P]は', '地下', 'です', '。'), 'Nhà ăn ở tầng hầm.'),
        (where('ミラーさん', 'どこ', 'ですか'), 'Anh Miller ở đâu?', [C1]),
        reply(['会議室', 'です', '。'], 'Anh ấy ở phòng họp.', [A1], s('ミラーさん', 'は', 'どこ', 'ですか', '。'), 'Anh Miller ở đâu?', '会議室です。'),
        (s('ワンさん', '[P]は', '事務所', 'です', '。'), 'Anh Wang ở văn phòng.', [A1]),
        (s('先生', '[P]は', '教室', 'ですか', '。'), 'Giáo viên có ở lớp học không?', [C1]),
        (s('いいえ', '、', '教室', 'じゃありません', '。', '事務所', 'です', '。'), 'Không, không ở lớp học. Ở văn phòng.', [B1, C1],
         (s('先生', 'は', '教室', 'ですか', '。'), 'Giáo viên có ở lớp học không?',
          ['はい、教室じゃありません。事務所です。', 'いいえ、教室です。事務所です。', 'はい、事務所じゃありません。'])),
        (s('会議室', '[P]は', '何階', 'ですか', '。'), 'Phòng họp ở tầng mấy?', [C1]),
        reply(['5階{ごかい}', 'です', '。'], 'Ở tầng 5.', [A1], s('会議室', 'は', '何階', 'ですか', '。'), 'Phòng họp ở tầng mấy?', '5階です。'),
        (s('トイレ', '[P]も', 'あそこ', 'です', '。'), 'Nhà vệ sinh cũng ở đằng kia.', [D1]),
        (s('カリナさん', 'の', '部屋', '[P]は', '[W]どこ', 'ですか', '。'), 'Phòng của chị Karina ở đâu?', [C1, E1]),
        (s('エレベーター', '[P]は', 'あそこ', 'です', 'か', '、', 'そこ', 'です', 'か', '。'), 'Thang máy ở đằng kia hay ở đó?', [D2]),
        (s('ネクタイ', 'の', '売り場', '[P]は', '2階{にかい}', 'です', '。'), 'Quầy bán cà vạt ở tầng 2.', [E2]),
    ])

# ---------------------------------------------------------------------------
def kochira(dem, place, tail='です'):
    return s(f'[W]{dem}', '[P]は', place, tail, '。')


def at(place, dem, tail='です'):
    return s(place, '[P]は', f'[W]{dem}', tail, '。')


p3 = point(3, 3, 'こちら／そちら／あちら／どちら', 'Phía này / phía đó / phía kia / phía nào (lịch sự)',
    'こちら, そちら, あちら, どちら vốn chỉ phương hướng, và được dùng thay cho ここ, そこ, あそこ, どこ khi nói lịch sự '
    '(nhân viên với khách, nói với người trên). こちら còn dùng để giới thiệu người: こちらはミラーさんです. '
    'Hỏi nước, công ty, trường của người nghe một cách lịch sự: お国はどちらですか (anh/chị là người nước nào?).',
    [
        (kochira('こちら', '受付'), 'Phía này là quầy tiếp tân.'),
        (kochira('そちら', '会議室'), 'Phía đó là phòng họp.'),
        (kochira('あちら', 'エレベーター'), 'Phía kia là thang máy.'),
        (at('エレベーター', 'あちら'), 'Thang máy ở phía kia ạ.'),
        (at('トイレ', 'こちら'), 'Nhà vệ sinh ở phía này ạ.'),
        (at('事務所', 'そちら'), 'Văn phòng ở phía đó ạ.'),
        (at('受付', 'あちら'), 'Quầy tiếp tân ở phía kia ạ.'),
        (at('会議室', 'こちら'), 'Phòng họp ở phía này ạ.'),
        (at('食堂', 'そちら'), 'Nhà ăn ở phía đó ạ.'),
        (at('エスカレーター', 'あちら'), 'Thang cuốn ở phía kia ạ.'),
        (at('お国', 'どちら', 'ですか'), 'Anh/chị là người nước nào ạ?', [C1]),
        reply(['アメリカ', 'です', '。'], 'Là nước Mỹ.', [A1], s('お国', 'は', 'どちら', 'ですか', '。'), 'Anh/chị là người nước nào ạ?', 'アメリカです。'),
        (at('大学', 'どちら', 'ですか'), 'Anh/chị học trường đại học nào ạ?', [C1]),
        reply(['さくら大学', 'です', '。'], 'Là trường đại học Sakura.', [A1], s('大学', 'は', 'どちら', 'ですか', '。'), 'Anh/chị học trường đại học nào ạ?', 'さくら大学です。'),
        (at('トイレ', 'どちら', 'ですか'), 'Nhà vệ sinh ở phía nào ạ?', [C1]),
        reply(['[W]あちら', 'です', '。'], 'Ở phía kia ạ.', [A1], s('トイレ', 'は', 'どちら', 'ですか', '。'), 'Nhà vệ sinh ở phía nào ạ?', 'あちらです。'),
        (at('エレベーター', 'どちら', 'ですか'), 'Thang máy ở phía nào ạ?', [C1]),
        reply(['[W]こちら', 'です', '。'], 'Ở phía này ạ.', [A1], s('エレベーター', 'は', 'どちら', 'ですか', '。'), 'Thang máy ở phía nào ạ?', 'こちらです。'),
        (at('受付', 'どちら', 'ですか'), 'Quầy tiếp tân ở phía nào ạ?', [C1]),
        reply(['[W]そちら', 'です', '。'], 'Ở phía đó ạ.', [A1], s('受付', 'は', 'どちら', 'ですか', '。'), 'Quầy tiếp tân ở phía nào ạ?', 'そちらです。'),
        (s('[W]こちら', 'は', 'ミラーさん', 'です', '。'), 'Đây là anh Miller (giới thiệu).', [A1]),
        (s('[W]こちら', 'は', 'さくら大学', 'の', '先生', 'です', '。'), 'Đây là giáo viên trường đại học Sakura (giới thiệu).', [E1]),
        reply(['ドイツ', 'です', '。'], 'Là nước Đức.', [A1], s('お国', 'は', 'どちら', 'ですか', '。'), 'Anh/chị là người nước nào ạ?', 'ドイツです。'),
        (s('会議室', 'は', '3階{さんがい}', 'です', '。', 'エレベーター', '[P]は', '[W]あちら', 'です', '。'), 'Phòng họp ở tầng 3. Thang máy ở phía kia ạ.', [B]),
        (at('電話', 'どちら', 'ですか'), 'Điện thoại ở phía nào ạ?', [C1]),
        (s('電話', '[P]は', '[W]こちら', 'です', '。'), 'Điện thoại ở phía này ạ.', [A1],
         (s('電話', 'は', 'どちら', 'ですか', '。'), 'Điện thoại ở phía nào ạ?', ['はい、電話はこちらです。', '電話はこちらですか。', 'いいえ、電話はこちらです。'])),
        (kochira('そちら', '事務所', 'ですか'), 'Phía đó có phải là văn phòng không ạ?', [C1]),
        (s('[W]あちら', 'も', '会議室', 'です', '。'), 'Phía kia cũng là phòng họp.', [D1]),
        (s('ワイン', 'の', '売り場', '[P]は', '[W]どちら', 'ですか', '。'), 'Quầy bán rượu vang ở phía nào ạ?', [E2]),
        reply(['地下', 'です', '。'], 'Ở tầng hầm ạ.', [A1], s('ワイン', 'の', '売り場', 'は', 'どちら', 'ですか', '。'), 'Quầy bán rượu vang ở phía nào ạ?', '地下です。'),
    ],
    notes='Không dùng こちら để chỉ đồ vật thay cho これ; こちら là phía này, chỗ này hoặc người này (lịch sự).')

# ---------------------------------------------------------------------------
def made(subj, country, noun, tail='です'):
    return s(subj, 'は', country, '[P]の', noun, tail, '。')


p4 = point(3, 4, 'N1 (nước, công ty) の N2', 'N2 của nước / công ty N1',
    'Khi N1 là tên nước hoặc công ty và N2 là sản phẩm, の cho biết N2 được làm ở đâu, của hãng nào: イタリアのワイン (rượu vang Ý), '
    'スイスの時計 (đồng hồ Thụy Sĩ). Hỏi xuất xứ bằng どこの: これはどこのワインですか. '
    'Khi N1 là công ty, nhà, の chỉ nơi N2 thuộc về: 日本の会社の事務所 (văn phòng của một công ty Nhật).',
    [
        (made('これ', 'イタリア', 'ワイン'), 'Đây là rượu vang Ý.'),
        (made('それ', 'スイス', '時計'), 'Đó là đồng hồ Thụy Sĩ.'),
        (made('あれ', '日本', 'カメラ'), 'Kia là máy ảnh Nhật.'),
        (made('これ', 'ドイツ', '自動車'), 'Đây là ô tô Đức.'),
        (made('それ', 'フランス', 'ワイン'), 'Đó là rượu vang Pháp.'),
        (made('この|靴', 'イタリア', '靴'), 'Đôi giày này là giày Ý.', [B2]),
        (made('その|ネクタイ', 'フランス', 'ネクタイ'), 'Cái cà vạt đó là cà vạt Pháp.', [B2]),
        (made('あれ', 'アメリカ', 'コンピュータ'), 'Kia là máy vi tính Mỹ.'),
        (made('これ', '日本', 'たばこ'), 'Đây là thuốc lá Nhật.'),
        (made('それ', '中国', '傘'), 'Đó là ô Trung Quốc.'),
        (made('これ', 'どこ', 'ワイン', 'ですか'), 'Đây là rượu vang của nước nào?', [C1]),
        (s('イタリア', '[P]の', 'ワイン', 'です', '。'), 'Là rượu vang Ý.', [A1],
         (s('これ', 'は', 'どこ', 'の', 'ワイン', 'ですか', '。'), 'Đây là rượu vang của nước nào?', ['はい、イタリアのワインです。', 'イタリアはワインです。', 'イタリアのワインですか。'])),
        (made('その|時計', 'どこ', '時計', 'ですか'), 'Cái đồng hồ đó là đồng hồ của nước nào?', [B2, C1]),
        (s('スイス', '[P]の', '時計', 'です', '。'), 'Là đồng hồ Thụy Sĩ.', [A1],
         (s('その', '時計', 'は', 'どこ', 'の', '時計', 'ですか', '。'), 'Cái đồng hồ đó là đồng hồ của nước nào?', ['はい、スイスの時計です。', 'スイスは時計です。', 'スイスの時計ですか。'])),
        (made('あの|自動車', 'どこ', '自動車', 'ですか'), 'Chiếc ô tô kia là xe của nước nào?', [B2, C1]),
        (s('ドイツ', '[P]の', 'です', '。'), 'Là xe Đức.', [A1, F2],
         (s('あの', '自動車', 'は', 'どこ', 'の', '自動車', 'ですか', '。'), 'Chiếc ô tô kia là xe của nước nào?', ['はい、ドイツのです。', 'ドイツです。', 'ドイツのですか。'])),
        (made('この|カメラ', '日本', 'カメラ', 'ですか'), 'Cái máy ảnh này có phải là máy ảnh Nhật không?', [B2, C1]),
        (s('はい', '、', 'そう', 'です', '。', '日本', '[P]の', 'カメラ', 'です', '。'), 'Vâng, đúng vậy. Đó là máy ảnh Nhật.', [C2],
         (s('この', 'カメラ', 'は', '日本', 'の', 'カメラ', 'ですか', '。'), 'Cái máy ảnh này có phải là máy ảnh Nhật không?',
          ['いいえ、そうです。日本のカメラです。', 'はい、違います。日本のカメラです。', 'はい、そうじゃありません。日本のカメラです。'])),
        (made('これ', '日本', 'ワイン', 'じゃありません'), 'Đây không phải là rượu vang Nhật.', [B1]),
        (s('その', '靴', 'は', 'どこ', '[P]の', 'ですか', '。'), 'Đôi giày đó là của nước nào?', [B2, C1, F2]),
        (s('これ', 'は', '私', 'の', '会社', '[P]の', 'コンピュータ', 'です', '。'), 'Đây là máy vi tính của công ty tôi.', [E1]),
        (s('ここ', 'は', '日本', 'の', '会社', '[P]の', '事務所', 'です', '。'), 'Đây là văn phòng của một công ty Nhật.', [A, E1]),
        (s('この', 'ワイン', 'は', 'イタリア', '[P]の', 'ワイン', 'です', 'か', '、', 'フランス', 'の', 'ワイン', 'です', 'か', '。'), 'Chai rượu vang này là rượu vang Ý hay rượu vang Pháp?', [B2, D2]),
        (s('フランス', '[P]の', 'ワイン', 'です', '。'), 'Là rượu vang Pháp.', [A1],
         (s('この', 'ワイン', 'は', 'イタリア', 'の', 'ワイン', 'です', 'か', '、', 'フランス', 'の', 'ワイン', 'です', 'か', '。'), 'Chai rượu vang này là rượu vang Ý hay rượu vang Pháp?',
          ['はい、フランスのワインです。', 'いいえ、フランスのワインです。', 'フランスは ワインです。'.replace(' ', '')])),
        (s('あの', 'ネクタイ', 'も', 'イタリア', '[P]の', 'ネクタイ', 'です', '。'), 'Cái cà vạt kia cũng là cà vạt Ý.', [B2, D1]),
        (made('この|靴', 'どこ', '靴', 'ですか'), 'Đôi giày này là giày của nước nào?', [B2, C1]),
        (s('いいえ', '、', 'イタリア', 'の', '靴', 'じゃありません', '。', '日本', '[P]の', 'です', '。'), 'Không, không phải giày Ý. Là giày Nhật.', [B1, F2],
         (s('この', '靴', 'は', 'イタリア', 'の', '靴', 'ですか', '。'), 'Đôi giày này có phải là giày Ý không?',
          ['はい、イタリアの靴じゃありません。日本のです。', 'いいえ、イタリアの靴です。日本のです。', 'いいえ、イタリアの靴じゃありません。日本です。'])),
        (s('それ', 'は', 'ミラーさん', 'の', 'うち', '[P]の', '電話', 'です', '。'), 'Đó là điện thoại nhà anh Miller.', [E1]),
        (s('あれ', 'は', 'アメリカ', 'の', '会社', '[P]の', '自動車', 'です', '。'), 'Kia là ô tô của một công ty Mỹ.', [E1]),
        (made('これ', 'スイス', 'チョコレート'), 'Đây là sô-cô-la Thụy Sĩ.', [A1]),
    ])

# ---------------------------------------------------------------------------
def price(subj, *amount, tail='です'):
    return s(subj, 'は', *amount, '[W]円', tail, '。')


def how_much(subj):
    return s(subj, '[P]は', '[W]いくら', 'ですか', '。')


def price_reply(amount_parts, short, meaning, q, qm):
    return (s(*amount_parts, '[W]円', 'です', '。'), meaning, [A1], (q, qm, [f'はい、{short}です。', f'{short}ですか。', f'{short.replace("円", "歳")}です。']))


p5 = point(3, 5, 'N は いくら ですか', 'N giá bao nhiêu?',
    'Hỏi giá bằng いくら: この時計はいくらですか (cái đồng hồ này bao nhiêu tiền?). Trả lời bằng số tiền và đơn vị 円 (yên): 3000円です. '
    'Số lớn đọc theo hàng 百 (trăm), 千 (nghìn), 万 (vạn = mười nghìn): 1万円 là 10.000 yên, 250万円 là 2.500.000 yên.',
    [
        (how_much('この|時計'), 'Cái đồng hồ này bao nhiêu tiền?', [B2]),
        (price('この|時計', '3000'), 'Cái đồng hồ này giá 3.000 yên.', [B2]),
        (how_much('その|ネクタイ'), 'Cái cà vạt đó bao nhiêu tiền?', [B2]),
        (price('その|ネクタイ', '1500'), 'Cái cà vạt đó giá 1.500 yên.', [B2]),
        (price('この|靴', '8000'), 'Đôi giày này giá 8.000 yên.', [B2]),
        (price('その|ワイン', '2000'), 'Chai rượu vang đó giá 2.000 yên.', [B2]),
        (price('この|かばん', '5000'), 'Cái cặp này giá 5.000 yên.', [B2]),
        (how_much('これ'), 'Cái này bao nhiêu tiền?'),
        (price('それ', '500'), 'Cái đó giá 500 yên.'),
        (price('この|傘', '1000'), 'Cái ô này giá 1.000 yên.', [B2]),
        price_reply(['2500'], '2500円', 'Giá 2.500 yên.', s('その', '時計', 'は', 'いくら', 'ですか', '。'), 'Cái đồng hồ đó bao nhiêu tiền?'),
        price_reply(['800'], '800円', 'Giá 800 yên.', s('この', 'チョコレート', 'は', 'いくら', 'ですか', '。'), 'Thanh sô-cô-la này bao nhiêu tiền?'),
        price_reply(['15000'], '15000円', 'Giá 15.000 yên.', s('その', 'カメラ', 'は', 'いくら', 'ですか', '。'), 'Cái máy ảnh đó bao nhiêu tiền?'),
        (how_much('この|コンピュータ'), 'Cái máy vi tính này bao nhiêu tiền?', [B2]),
        price_reply(['98000'], '98000円', 'Giá 98.000 yên.', s('この', 'コンピュータ', 'は', 'いくら', 'ですか', '。'), 'Cái máy vi tính này bao nhiêu tiền?'),
        (how_much('たばこ'), 'Thuốc lá bao nhiêu tiền?'),
        price_reply(['400'], '400円', 'Giá 400 yên.', s('たばこ', 'は', 'いくら', 'ですか', '。'), 'Thuốc lá bao nhiêu tiền?'),
        (price('この|ワイン', '3500'), 'Chai rượu vang này giá 3.500 yên.', [B2]),
        (how_much('あの|自動車'), 'Chiếc ô tô kia bao nhiêu tiền?', [B2]),
        price_reply(['250', '万'], '250万円', 'Giá 2.500.000 yên.', s('あの', '自動車', 'は', 'いくら', 'ですか', '。'), 'Chiếc ô tô kia bao nhiêu tiền?'),
        (s('この', '時計', 'は', 'スイス', 'の', '時計', 'です', '。', '3', '万', '[W]円', 'です', '。'), 'Cái đồng hồ này là đồng hồ Thụy Sĩ. Giá 30.000 yên.', [B2, D]),
        (s('その', 'ワイン', '[P]も', '2000', '円', 'です', '。'), 'Chai rượu vang đó cũng giá 2.000 yên.', [B2, D1]),
        price_reply(['1', '万'], '1万円', 'Giá 10.000 yên.', s('その', 'イタリア', 'の', '靴', 'は', 'いくら', 'ですか', '。'), 'Đôi giày Ý đó bao nhiêu tiền?'),
        (s('この', 'ネクタイ', 'は', '日本', 'の', 'です', 'か', '、', 'イタリア', 'の', 'です', 'か', '。'), 'Cái cà vạt này là của Nhật hay của Ý?', [B2, D2, F2]),
        (s('イタリア', 'の', 'です', '。', '4000', '[W]円', 'です', '。'), 'Là của Ý. Giá 4.000 yên.', [D, F2],
         (s('この', 'ネクタイ', 'は', '日本', 'の', 'です', 'か', '、', 'イタリア', 'の', 'です', 'か', '。'), 'Cái cà vạt này là của Nhật hay của Ý?',
          ['はい、イタリアのです。4000円です。', 'いいえ、イタリアのです。4000円です。', 'イタリアのです。4000歳です。'])),
        (s('ワイン', 'の', '売り場', 'は', '地下', 'です', '。', 'この', 'ワイン', 'は', '1800', '[W]円', 'です', '。'), 'Quầy bán rượu vang ở tầng hầm. Chai rượu vang này giá 1.800 yên.', [B, B2]),
        (s('この', 'カメラ', 'は', '日本', 'の', 'カメラ', 'じゃありません', '。', 'ドイツ', 'の', 'です', '。', '5', '万', '[W]円', 'です', '。'),
         'Cái máy ảnh này không phải máy ảnh Nhật. Là của Đức. Giá 50.000 yên.', [B1, D, F2]),
        (how_much('その|時計'), 'Cái đồng hồ đó bao nhiêu tiền?', [B2]),
        price_reply(['1', '万', '2000'], '1万2000円', 'Giá 12.000 yên.', s('その', '時計', 'は', 'いくら', 'ですか', '。'), 'Cái đồng hồ đó bao nhiêu tiền?'),
        (s('あの', '自動車', '[P]も', '250', '万', '円', 'ですか', '。'), 'Chiếc ô tô kia cũng giá 2.500.000 yên à?', [B2, C1, D1]),
    ],
    notes='Viết số tiền bằng chữ số; 万 là đơn vị mười nghìn (1万 = 10.000).')

# Chủ dự án duyệt bài 3 ngày 2026-11-12
for p in (p1, p2, p3, p4, p5):
    p['approved'] = True
write(3, [p1, p2, p3, p4, p5])
