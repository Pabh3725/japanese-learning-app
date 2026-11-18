"""V12 (docs/learning-rules-v12.md §5): dữ liệu còn thiếu cho khu Kanji.

Sinh hai file, chưa nối vào seed (seed V11 kiểm tra chặt cột của radicals.csv / kanji.csv; nối khi làm V12):
  data/n5/radical_meanings.csv  — nghĩa tiếng Việt của 214 bộ thủ (Claude soạn, chủ dự án duyệt 2026-11-18), dạng biến thể,
                                   số chữ N5–N4 có bộ đó và chữ ví dụ (tính từ data/n5/kanji_visual.json).
  data/n5/kanji_frequency.csv   — hạng tần suất (báo chí, 1–2500) của từng chữ trong data/n5/kanji.csv.
                                   Nguồn: kanji-data (David Gouveia, MIT), trường freq lấy từ KANJIDIC2
                                   (EDRDG, CC BY-SA 4.0). File gốc: _local/sources/kanji-data/kanji.json.
Chạy: python3 scripts/kanji-data/v12_data.py
"""
import collections
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data' / 'n5'

# Chủ dự án duyệt nghĩa 214 bộ ngày 2026-11-18. Sửa nghĩa thì đặt lại False tới khi duyệt lại.
MEANINGS_APPROVED = True

# số bộ: (nghĩa, dạng biến thể thường gặp)
MEANINGS = {
    1: ('số một; nét ngang', ''), 2: ('nét sổ thẳng', ''), 3: ('điểm, chấm', ''), 4: ('nét phẩy', ''),
    5: ('can Ất; hình móc', '乚'), 6: ('nét móc', ''), 7: ('số hai', ''), 8: ('mái, nắp đậy', ''),
    9: ('người', '亻'), 10: ('chân người, người đi', ''), 11: ('vào', ''), 12: ('số tám; chia ra', 'ハ'),
    13: ('khung, vùng biên', ''), 14: ('mái che, trùm lên', ''), 15: ('băng, nước đá', ''), 16: ('cái ghế, bàn nhỏ', ''),
    17: ('hố, vật há miệng', ''), 18: ('con dao', '刂'), 19: ('sức lực', ''), 20: ('bao bọc', ''),
    21: ('cái thìa', ''), 22: ('cái hộp vuông', ''), 23: ('che giấu', ''), 24: ('số mười', ''),
    25: ('bói toán', ''), 26: ('đốt tre; con dấu', '㔾'), 27: ('sườn núi, vách đá', ''), 28: ('riêng tư', ''),
    29: ('cái tay; lại nữa', ''), 30: ('miệng', ''), 31: ('vây quanh', ''), 32: ('đất', ''),
    33: ('kẻ sĩ, học trò', ''), 34: ('đến sau', ''), 35: ('đi chậm', ''), 36: ('buổi tối', ''),
    37: ('to lớn', ''), 38: ('phụ nữ', ''), 39: ('con, đứa trẻ', ''), 40: ('mái nhà', ''),
    41: ('tấc (đơn vị đo); khuỷu tay', ''), 42: ('nhỏ', '⺌'), 43: ('yếu, què', ''), 44: ('thây người', ''),
    45: ('mầm cây', ''), 46: ('núi', ''), 47: ('dòng sông', '川'), 48: ('người thợ, công việc', ''),
    49: ('bản thân', ''), 50: ('cái khăn', ''), 51: ('khô; cái khiên', ''), 52: ('nhỏ bé', ''),
    53: ('mái nhà dựa vách', ''), 54: ('bước dài', ''), 55: ('chắp tay', ''), 56: ('bắn; cái cọc', ''),
    57: ('cái cung', ''), 58: ('đầu con nhím', '⺕'), 59: ('lông, vằn', ''), 60: ('bước chân trái', ''),
    61: ('tim, tấm lòng', '忄⺗'), 62: ('cây giáo, mác', ''), 63: ('cửa một cánh', '戸'), 64: ('tay', '扌'),
    65: ('cành nhánh; chống đỡ', ''), 66: ('đánh nhẹ', '攵'), 67: ('văn, chữ viết', ''), 68: ('cái đấu (để đong)', ''),
    69: ('cái rìu; cân', ''), 70: ('phương hướng; vuông', ''), 71: ('không', '旡'), 72: ('mặt trời, ngày', ''),
    73: ('nói', ''), 74: ('mặt trăng, tháng', ''), 75: ('cây, gỗ', ''), 76: ('thiếu; ngáp', ''),
    77: ('dừng lại', ''), 78: ('xấu, chết', ''), 79: ('binh khí; đánh', ''), 80: ('chớ, đừng', '母'),
    81: ('so sánh', ''), 82: ('lông', ''), 83: ('họ, dòng họ', ''), 84: ('hơi, khí', ''),
    85: ('nước', '氵氺'), 86: ('lửa', '灬'), 87: ('móng vuốt', '爫'), 88: ('cha', ''),
    89: ('hào (quẻ bói)', ''), 90: ('tấm gỗ', ''), 91: ('mảnh, tấm', ''), 92: ('răng nanh', ''),
    93: ('con trâu, bò', '牜'), 94: ('con chó', '犭'), 95: ('màu đen huyền; sâu xa', ''), 96: ('ngọc', '王'),
    97: ('quả dưa', ''), 98: ('ngói', ''), 99: ('ngọt', ''), 100: ('sống, sinh ra', ''),
    101: ('dùng', ''), 102: ('ruộng', ''), 103: ('chân; đơn vị đo vải', '⺪'), 104: ('bệnh tật', ''),
    105: ('dáng đi; gạt ra', ''), 106: ('màu trắng', ''), 107: ('da', ''), 108: ('bát, đĩa', ''),
    109: ('mắt', ''), 110: ('cây giáo', ''), 111: ('mũi tên', ''), 112: ('đá', ''),
    113: ('thần đất; bày ra', '礻'), 114: ('vết chân thú', ''), 115: ('cây lúa', ''), 116: ('hang, lỗ', ''),
    117: ('đứng', ''), 118: ('cây tre', '⺮'), 119: ('gạo', ''), 120: ('sợi tơ', '糹'),
    121: ('đồ sành, cái vò', ''), 122: ('cái lưới', '罒⺳'), 123: ('con dê, cừu', '⺶'), 124: ('lông vũ, cánh', ''),
    125: ('già', '耂'), 126: ('mà, và', ''), 127: ('cái cày', ''), 128: ('tai', ''),
    129: ('cây bút', ''), 130: ('thịt', '月'), 131: ('bề tôi', ''), 132: ('tự mình', ''),
    133: ('đến', ''), 134: ('cái cối', ''), 135: ('cái lưỡi', ''), 136: ('trái ngược', ''),
    137: ('thuyền', ''), 138: ('bền cứng; dừng lại', ''), 139: ('màu sắc', ''), 140: ('cỏ', '艹'),
    141: ('vằn con hổ', ''), 142: ('sâu bọ', ''), 143: ('máu', ''), 144: ('đi; làm', ''),
    145: ('áo', '衤'), 146: ('che đậy', '覀西'), 147: ('nhìn thấy', ''), 148: ('sừng; góc', ''),
    149: ('lời nói', '訁'), 150: ('thung lũng', ''), 151: ('hạt đậu', ''), 152: ('con lợn', ''),
    153: ('loài thú bò sát đất', ''), 154: ('vỏ sò; tiền', ''), 155: ('màu đỏ', ''), 156: ('chạy', ''),
    157: ('chân', '⻊'), 158: ('thân thể', ''), 159: ('xe', ''), 160: ('cay; vất vả', ''),
    161: ('thìn; thời gian', ''), 162: ('bước đi', '辶'), 163: ('vùng đất, thành ấp', '阝'), 164: ('vò rượu', ''),
    165: ('phân biệt', ''), 166: ('làng; dặm', ''), 167: ('kim loại, vàng', '釒'), 168: ('dài', '镸'),
    169: ('cổng, cửa hai cánh', ''), 170: ('gò đất', '阝'), 171: ('bắt kịp', ''), 172: ('chim đuôi ngắn', ''),
    173: ('mưa', ''), 174: ('màu xanh', '青'), 175: ('không phải, sai', ''), 176: ('mặt', ''),
    177: ('da thuộc', ''), 178: ('da đã thuộc mềm', ''), 179: ('rau hẹ', ''), 180: ('âm thanh', ''),
    181: ('cái đầu; trang', ''), 182: ('gió', ''), 183: ('bay', ''), 184: ('ăn', '飠'),
    185: ('cái đầu', ''), 186: ('hương thơm', ''), 187: ('con ngựa', ''), 188: ('xương', ''),
    189: ('cao', ''), 190: ('tóc dài', ''), 191: ('đánh nhau', ''), 192: ('rượu nếp thơm', ''),
    193: ('cái nồi', ''), 194: ('ma quỷ', ''), 195: ('con cá', ''), 196: ('con chim', ''),
    197: ('đất mặn, muối', ''), 198: ('con hươu', ''), 199: ('lúa mạch', '麦'), 200: ('cây gai', ''),
    201: ('màu vàng', '黄'), 202: ('lúa nếp', ''), 203: ('màu đen', '黒'), 204: ('may vá', ''),
    205: ('con ếch', ''), 206: ('cái vạc ba chân', ''), 207: ('cái trống', ''), 208: ('con chuột', ''),
    209: ('cái mũi', ''), 210: ('ngang bằng, đều', '斉'), 211: ('răng', '歯'), 212: ('con rồng', '竜'),
    213: ('con rùa', '亀'), 214: ('ống sáo', ''),
}


def main():
    radicals = list(csv.DictReader(open(DATA / 'radicals.csv', encoding='utf-8')))
    kanji = list(csv.DictReader(open(DATA / 'kanji.csv', encoding='utf-8')))
    visual = json.load(open(DATA / 'kanji_visual.json', encoding='utf-8'))['kanji']
    source = json.load(open(ROOT / '_local' / 'sources' / 'kanji-data' / 'kanji.json', encoding='utf-8'))
    assert sorted(MEANINGS) == list(range(1, 215)), 'thiếu nghĩa bộ'

    # Hạng tần suất từng chữ
    freq = {k['character']: source.get(k['character'], {}).get('freq') for k in kanji}
    with open(DATA / 'kanji_frequency.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['character', 'freq_rank'])
        for k in kanji:
            w.writerow([k['character'], freq[k['character']] or ''])

    # Bộ trong chữ N5–N4: bộ phân loại, chính chữ là bộ, và mọi thành phần lồng nhau (kể cả dạng gốc của biến thể)
    number_of = {r['character']: int(r['number']) for r in radicals}
    for n, (_, variants) in MEANINGS.items():
        for v in variants:
            number_of.setdefault(v, n)
    level = {k['character']: k['jlpt_level'] for k in kanji}
    targets = [k['character'] for k in kanji if k['jlpt_level'] in ('5', '4')]

    # acc: số bộ → độ rõ (0: bộ phân loại hoặc chính chữ; 2/3: thành phần ngoài cùng dạng chuẩn/biến thể; lớn hơn: lồng sâu)
    standard = {int(r['number']): r['character'] for r in radicals}

    def walk(parts, acc, depth):
        for p in parts:
            for ch in (p.get('c'), p.get('original')):
                if ch in number_of:
                    n = number_of[ch]
                    # Dạng biến thể (灬 dưới 馬, 鳥) xếp sau dạng chuẩn cùng độ sâu
                    score = depth * 2 + (0 if p.get('c') == standard[n] else 1)
                    acc[n] = min(acc.get(n, 99), score)
            walk(p.get('parts', []), acc, depth + 1)

    users = collections.defaultdict(list)
    depth_of = {}
    for c in targets:
        e = visual.get(c)
        if not e:
            continue
        acc = {}
        if e['radical']:
            acc[e['radical']] = 0
        if c in number_of:
            acc[number_of[c]] = 0
        walk(e['parts'], acc, 1)
        for n, d in acc.items():
            users[n].append(c)
            depth_of[(n, c)] = d

    # Chữ ví dụ: bộ thấy rõ trước (bộ phân loại / thành phần ngoài cùng), rồi N5 trước, rồi chữ phổ biến hơn
    rank_for = lambda n: (lambda c: (min(depth_of[(n, c)], 5), level[c] != '5', freq.get(c) or 9999))
    with open(DATA / 'radical_meanings.csv', 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['number', 'character', 'variants', 'meaning_vi', 'n5n4_kanji', 'examples', 'approved'])
        for r in radicals:
            n = int(r['number'])
            meaning, variants = MEANINGS[n]
            examples = ''.join(sorted((c for c in users[n] if c != r['character']), key=rank_for(n))[:3])
            w.writerow([n, r['character'], variants, meaning, len(users[n]), examples, 'true' if MEANINGS_APPROVED else 'false'])

    with_freq = sum(1 for v in freq.values() if v)
    used = sum(1 for n in range(1, 215) if users[n])
    print(f'kanji_frequency.csv: {len(kanji)} chữ, {with_freq} có hạng tần suất')
    print(f'radical_meanings.csv: 214 bộ, {used} bộ có trong chữ N5–N4, {sum(1 for n in users if len(users[n]) >= 2)} bộ có trong ≥ 2 chữ')


if __name__ == '__main__':
    main()
