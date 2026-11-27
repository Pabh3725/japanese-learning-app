"""Cấp JLPT của Kanji theo danh sách N5–N2 chủ dự án gửi (2026-11-27): N5 80 chữ, N4 167, N3 370, N2 368.

Danh sách trùng với danh sách Waller, lấy từ trường jlpt_new của kanji-data (David Gouveia, MIT; dữ liệu gốc
KANJIDIC2, EDRDG, CC BY-SA 4.0). Sáu chữ file nguồn để trống cấp được bổ sung tay ở MISSING_IN_SOURCE.

Script làm hai việc với data/n5/kanji.csv:
  1. Đặt jlpt_level của mọi chữ có trong danh sách. Chữ ngoài danh sách giữ nguyên cấp, trừ OUTSIDE_LIST.
  2. Thêm chữ trong danh sách mà file chưa có. Hán Việt và nghĩa lấy từ NEW_KANJI (Claude soạn, chờ chủ dự án
     duyệt ở docs/kanji-n3n2-review.md); âm On/Kun và số nét lấy từ KANJIDIC2.
Sau đó chạy: python3 scripts/kanji-data/v12_data.py (tần suất) và pnpm kanji:visual (nét viết, cặp chữ giống).

Chạy: python3 scripts/kanji-data/levels.py   (File nguồn: _local/sources/kanji-data/kanji.json)
"""
import csv
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KANJI_CSV = ROOT / 'data' / 'n5' / 'kanji.csv'
SOURCE = ROOT / '_local' / 'sources' / 'kanji-data' / 'kanji.json'

EXPECTED = {5: 80, 4: 167, 3: 370, 2: 368}

# File nguồn không ghi cấp của các chữ này dù chúng có trong danh sách
MISSING_IN_SOURCE = {'分': 5, '的': 4, '可': 3, '身': 3, '阪': 3, '無': 2}

# Chữ ngoài danh sách N5–N2; chủ dự án chốt 2026-11-27 xếp vào N4
OUTSIDE_LIST = {'暑': 4, '誰': 4, '韓': 4, '賑': 4}

# Chữ chưa có trong kanji.csv: Hán Việt, nghĩa (Claude soạn 2026-11-27, chờ duyệt)
NEW_KANJI = {
    # N4
    '京': ('KINH', 'kinh đô, thủ đô'), '飯': ('PHẠN', 'cơm; bữa ăn'),
    # N3
    '才': ('TÀI', 'tài năng; tuổi'), '王': ('VƯƠNG', 'vua'), '光': ('QUANG', 'ánh sáng'), '草': ('THẢO', 'cỏ'),
    '欠': ('KHIẾM', 'thiếu; vắng mặt'), '民': ('DÂN', 'người dân'), '未': ('VỊ', 'chưa'), '進': ('TIẾN', 'tiến lên'),
    '路': ('LỘ', 'con đường'), '鳴': ('MINH', 'kêu, hót; reo'), '共': ('CỘNG', 'cùng nhau'), '老': ('LÃO', 'già'),
    '位': ('VỊ', 'vị trí; khoảng chừng'), '努': ('NỖ', 'cố gắng'), '労': ('LAO', 'lao động; vất vả'), '追': ('TRUY', 'đuổi theo'),
    '流': ('LƯU', 'chảy, trôi'), '商': ('THƯƠNG', 'buôn bán'), '深': ('THÂM', 'sâu'), '期': ('KỲ', 'thời kỳ; kỳ hạn'),
    '亡': ('VONG', 'mất, chết'), '想': ('TƯỞNG', 'nghĩ; tưởng tượng'), '福': ('PHÚC', 'phúc, may mắn'), '殺': ('SÁT', 'giết'),
    '疑': ('NGHI', 'nghi ngờ'), '皆': ('GIAI', 'tất cả, mọi người'), '完': ('HOÀN', 'hoàn thành, trọn vẹn'), '求': ('CẦU', 'tìm kiếm; yêu cầu'),
    '能': ('NĂNG', 'năng lực'), '列': ('LIỆT', 'hàng, dãy'), '昨': ('TẠC', 'hôm qua; trước'), '面': ('DIỆN', 'mặt; bề mặt'),
    '喜': ('HỶ', 'vui mừng'), '告': ('CÁO', 'báo cho biết'), '種': ('CHỦNG', 'loại; hạt giống'), '等': ('ĐẲNG', 'bậc, hạng; vân vân'),
    '容': ('DUNG', 'chứa đựng; dung mạo'), '得': ('ĐẮC', 'được, thu được'), '在': ('TẠI', 'ở, tồn tại'), '罪': ('TỘI', 'tội'),
    '判': ('PHÁN', 'phán đoán; con dấu'), '制': ('CHẾ', 'chế độ; kiềm chế'), '権': ('QUYỀN', 'quyền'), '断': ('ĐOẠN', 'cắt đứt; từ chối'),
    '任': ('NHIỆM', 'nhiệm vụ; giao phó'), '責': ('TRÁCH', 'trách nhiệm; trách móc'), '解': ('GIẢI', 'giải thích, tháo gỡ'), '費': ('PHÍ', 'chi phí'),
    '示': ('THỊ', 'chỉ ra, cho thấy'), '観': ('QUAN', 'xem, quan sát'), '状': ('TRẠNG', 'tình trạng; thư'), '職': ('CHỨC', 'nghề nghiệp; chức vụ'),
    '演': ('DIỄN', 'biểu diễn'), '供': ('CUNG', 'cung cấp; đi theo'), '限': ('HẠN', 'giới hạn'), '与': ('DỮ', 'ban cho; tham dự'),
    '候': ('HẬU', 'khí hậu; chờ đợi'), '構': ('CẤU', 'cấu tạo; để tâm'), '捕': ('BỘ', 'bắt'), '満': ('MÃN', 'đầy, đủ'),
    '居': ('CƯ', 'ở, cư trú'), '突': ('ĐỘT', 'đột ngột; đâm'), '腹': ('PHÚC', 'bụng'), '訪': ('PHỎNG', 'thăm hỏi'),
    '怒': ('NỘ', 'giận'), '処': ('XỬ', 'xử lý; nơi chốn'), '婦': ('PHỤ', 'phụ nữ; vợ'), '程': ('TRÌNH', 'mức độ; trình tự'),
    '精': ('TINH', 'tinh thần; tinh tế'), '恐': ('KHỦNG', 'sợ hãi'), '貧': ('BẦN', 'nghèo'), '更': ('CANH', 'thêm nữa; thay đổi'),
    '浮': ('PHÙ', 'nổi'), '盗': ('ĐẠO', 'ăn trộm'), '幾': ('KỶ', 'bao nhiêu'), '富': ('PHÚ', 'giàu'),
    '否': ('PHỦ', 'phủ định, không'), '誤': ('NGỘ', 'sai lầm'), '互': ('HỖ', 'lẫn nhau'), '抱': ('BÃO', 'ôm'),
    '緒': ('TỰ', 'đầu mối; cùng nhau'), '御': ('NGỰ', 'kính ngữ; điều khiển'), '偶': ('NGẪU', 'ngẫu nhiên; số chẵn'), '頂': ('ĐỈNH', 'đỉnh; nhận (khiêm nhường)'),
    # N2
    '了': ('LIỄU', 'xong, kết thúc'), '戸': ('HỘ', 'cửa; hộ, nhà'), '毛': ('MAO', 'lông; tóc'), '央': ('ƯƠNG', 'giữa, trung tâm'),
    '氷': ('BĂNG', 'băng, nước đá'), '皮': ('BÌ', 'da; vỏ'), '糸': ('MỊCH', 'sợi chỉ'), '虫': ('TRÙNG', 'côn trùng, sâu bọ'),
    '貝': ('BỐI', 'con sò, vỏ sò'), '羽': ('VŨ', 'lông vũ; cánh'), '谷': ('CỐC', 'thung lũng'), '州': ('CHÂU', 'châu, bang'),
    '血': ('HUYẾT', 'máu'), '雲': ('VÂN', 'mây'), '農': ('NÔNG', 'nông nghiệp'), '令': ('LỆNH', 'mệnh lệnh'),
    '根': ('CĂN', 'rễ; gốc'), '章': ('CHƯƠNG', 'chương; huy hiệu'), '童': ('ĐỒNG', 'trẻ em'), '像': ('TƯỢNG', 'bức tượng; hình ảnh'),
    '囲': ('VI', 'bao quanh'), '骨': ('CỐT', 'xương'), '岩': ('NHAM', 'đá tảng'), '区': ('KHU', 'khu, quận'),
    '坂': ('PHẢN', 'con dốc'), '勇': ('DŨNG', 'dũng cảm'), '毒': ('ĐỘC', 'chất độc'), '浅': ('THIỂN', 'nông, cạn'),
    '軍': ('QUÂN', 'quân đội'), '仏': ('PHẬT', 'Phật'), '府': ('PHỦ', 'phủ; cơ quan nhà nước'), '鼻': ('TỴ', 'mũi'),
    '兵': ('BINH', 'lính'), '栄': ('VINH', 'vinh quang; thịnh vượng'), '干': ('CAN', 'phơi khô'), '底': ('ĐỂ', 'đáy'),
    '署': ('THỰ', 'sở, cơ quan; ký tên'), '訓': ('HUẤN', 'dạy bảo; âm Kun'), '胸': ('HUNG', 'ngực'), '枚': ('MAI', 'tờ, tấm'),
    '詞': ('TỪ', 'từ (từ loại)'), '冊': ('SÁCH', 'quyển'), '暴': ('BẠO', 'bạo lực; dữ dội'), '乱': ('LOẠN', 'loạn, rối'),
    '改': ('CẢI', 'sửa đổi'), '被': ('BỊ', 'bị; che phủ'), '個': ('CÁ', 'cá nhân; cái'), '圧': ('ÁP', 'áp lực, ép'),
    '防': ('PHÒNG', 'phòng ngừa'), '委': ('ỦY', 'ủy thác'), '総': ('TỔNG', 'tổng, toàn bộ'), '省': ('TỈNH', 'bộ (cơ quan); lược bớt; tự xét'),
    '税': ('THUẾ', 'thuế'), '各': ('CÁC', 'mỗi'), '副': ('PHÓ', 'phó, phụ'), '域': ('VỰC', 'khu vực'),
    '革': ('CÁCH', 'da thuộc; cải cách'), '導': ('ĐẠO', 'dẫn dắt'), '担': ('ĐẢM', 'gánh vác'), '肩': ('KIÊN', 'vai'),
    '腕': ('OẢN', 'cánh tay; tay nghề'), '腰': ('YÊU', 'eo, hông'), '層': ('TẦNG', 'tầng, lớp'), '型': ('HÌNH', 'khuôn, kiểu mẫu'),
    '庁': ('SẢNH', 'cơ quan nhà nước'), '境': ('CẢNH', 'ranh giới'), '武': ('VŨ', 'võ'), '述': ('THUẬT', 'trình bày, kể'),
    '含': ('HÀM', 'bao gồm, chứa'), '況': ('HUỐNG', 'tình huống'), '補': ('BỔ', 'bổ sung'), '効': ('HIỆU', 'hiệu quả'),
    '豊': ('PHONG', 'phong phú, giàu có'), '巻': ('QUYỂN', 'cuộn; quyển'), '捜': ('SƯU', 'tìm kiếm'), '造': ('TẠO', 'chế tạo'),
    '河': ('HÀ', 'sông'), '再': ('TÁI', 'lại, lần nữa'), '占': ('CHIẾM', 'chiếm; bói toán'), '昇': ('THĂNG', 'bay lên; thăng tiến'),
    '極': ('CỰC', 'cực điểm'), '逆': ('NGHỊCH', 'ngược'), '巨': ('CỰ', 'to lớn'), '児': ('NHI', 'trẻ nhỏ'),
    '凍': ('ĐỐNG', 'đóng băng'), '幼': ('ẤU', 'nhỏ tuổi, ấu thơ'), '清': ('THANH', 'trong sạch'), '券': ('KHOÁN', 'vé'),
    '移': ('DI', 'di chuyển'), '欧': ('ÂU', 'châu Âu'), '臣': ('THẦN', 'bề tôi, quan'), '略': ('LƯỢC', 'lược bớt, tóm tắt'),
    '航': ('HÀNG', 'đi biển; hàng không'), '板': ('BẢN', 'tấm ván'), '照': ('CHIẾU', 'chiếu sáng'), '快': ('KHOÁI', 'dễ chịu, sảng khoái'),
    '版': ('BẢN', 'bản in; ấn bản'), '延': ('DIÊN', 'kéo dài'), '翌': ('DỰC', 'kế tiếp (ngày, năm sau)'), '符': ('PHÙ', 'dấu hiệu; vé'),
    '編': ('BIÊN', 'đan; biên soạn'), '粉': ('PHẤN', 'bột'), '貨': ('HÓA', 'hàng hóa; tiền'), '採': ('THẢI', 'hái; tuyển chọn'),
    '永': ('VĨNH', 'mãi mãi'), '液': ('DỊCH', 'chất lỏng'), '党': ('ĐẢNG', 'đảng phái'), '尊': ('TÔN', 'tôn kính'),
    '著': ('TRỨ', 'nổi tiếng; viết sách'), '蒸': ('CHƯNG', 'hấp; bốc hơi'), '装': ('TRANG', 'trang phục; trang bị'), '諸': ('CHƯ', 'các, nhiều'),
    '臓': ('TẠNG', 'nội tạng'), '純': ('THUẦN', 'thuần khiết'), '劇': ('KỊCH', 'kịch'), '承': ('THỪA', 'thừa nhận, chấp nhận'),
    '損': ('TỔN', 'tổn thất'), '湖': ('HỒ', 'hồ'), '銅': ('ĐỒNG', 'đồng (kim loại)'), '旧': ('CỰU', 'cũ'),
    '姓': ('TÍNH', 'họ'), '伸': ('THÂN', 'duỗi, kéo dài'), '幅': ('PHÚC', 'chiều rộng'), '療': ('LIỆU', 'chữa bệnh'),
    '般': ('BAN', 'chung, nói chung'), '依': ('Y', 'dựa vào'), '漁': ('NGƯ', 'đánh cá'), '募': ('MỘ', 'chiêu mộ'),
    '患': ('HOẠN', 'bệnh; mắc bệnh'), '湾': ('LOAN', 'vịnh'), '跡': ('TÍCH', 'dấu vết'), '香': ('HƯƠNG', 'hương thơm'),
    '兆': ('TRIỆU', 'nghìn tỷ; điềm báo'), '刊': ('SAN', 'xuất bản'), '傾': ('KHUYNH', 'nghiêng'), '超': ('SIÊU', 'siêu, vượt quá'),
    '雇': ('CỐ', 'thuê người'), '群': ('QUẦN', 'bầy, đàn'), '柱': ('TRỤ', 'cột'), '鋭': ('DUỆ', 'sắc bén'),
    '殿': ('ĐIỆN', 'cung điện; ngài'), '炭': ('THÁN', 'than'), '衣': ('Y', 'quần áo'), '鉱': ('KHOÁNG', 'khoáng sản'),
    '掘': ('QUẬT', 'đào'), '荒': ('HOANG', 'hoang dã; thô bạo'), '籍': ('TỊCH', 'sổ hộ tịch; quốc tịch'), '刷': ('LOÁT', 'in'),
    '沈': ('TRẦM', 'chìm'), '匹': ('THẤT', 'con (đếm thú nhỏ)'), '叫': ('KHIẾU', 'hét, kêu to'), '粒': ('LẠP', 'hạt'),
    '塔': ('THÁP', 'tháp'), '肌': ('CƠ', 'da'), '舟': ('CHU', 'thuyền'), '湿': ('THẤP', 'ẩm ướt'),
    '硬': ('NGẠNH', 'cứng'), '鈍': ('ĐỘN', 'cùn; chậm chạp'), '零': ('LINH', 'số không'), '綿': ('MIÊN', 'bông'),
    '憎': ('TĂNG', 'ghét'), '滴': ('TÍCH', 'giọt'), '畳': ('ĐIỆP', 'chiếu tatami; gấp'), '畜': ('SÚC', 'gia súc'),
    '溶': ('DUNG', 'tan chảy, hòa tan'), '賢': ('HIỀN', 'khôn ngoan'), '灯': ('ĐĂNG', 'đèn'), '塗': ('ĐỒ', 'sơn, bôi'),
    '挟': ('HIỆP', 'kẹp'), '枯': ('KHÔ', 'khô héo'), '燥': ('TÁO', 'khô ráo'), '耕': ('CANH', 'cày cấy'),
    '肯': ('KHẲNG', 'đồng ý, khẳng định'), '脂': ('CHI', 'mỡ'), '膚': ('PHU', 'da'), '軒': ('HIÊN', 'mái hiên; căn (nhà)'),
    '軟': ('NHUYỄN', 'mềm'), '隅': ('NGUNG', 'góc'), '隻': ('CHÍCH', 'chiếc (đếm tàu thuyền)'),
}


def katakana(s: str) -> str:
    return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s)


def pg_array(items: list[str]) -> str:
    return '{' + ','.join(f'"{x}"' for x in items) + '}'


def readings(entry: dict) -> tuple[list[str], list[str]]:
    on = [katakana(r) for r in entry['readings_on'] if '-' not in r]
    # Bỏ dạng tiền tố/hậu tố (くさ-, -ぐさ) và cách đọc không phải Hiragana; giữ tối đa 4 âm Kun
    kun = [r for r in entry['readings_kun'] if '-' not in r and all('ぁ' <= c <= 'ゖ' or c == '.' for c in r)]
    return list(dict.fromkeys(on)), list(dict.fromkeys(kun))[:4]


def main():
    source = json.load(open(SOURCE, encoding='utf-8'))
    level = {c: v['jlpt_new'] for c, v in source.items() if v.get('jlpt_new') in EXPECTED}
    level.update(MISSING_IN_SOURCE)
    counts = {lv: sum(1 for l in level.values() if l == lv) for lv in EXPECTED}
    assert counts == EXPECTED, f'số chữ theo cấp lệch danh sách: {counts}'

    lines = KANJI_CSV.read_text(encoding='utf-8').rstrip('\n').split('\n')
    assert lines[0].endswith(',jlpt_level'), 'jlpt_level phải là cột cuối của kanji.csv'
    have = {line[:line.index(',')] for line in lines[1:]}
    missing = [c for c in level if c not in have]
    assert set(missing) <= set(NEW_KANJI), f'NEW_KANJI thiếu: {"".join(set(missing) - set(NEW_KANJI))}'
    assert set(NEW_KANJI) <= set(level), f'NEW_KANJI có chữ ngoài danh sách: {"".join(set(NEW_KANJI) - set(level))}'

    # Chỉ sửa ô cuối (jlpt_level), giữ nguyên phần còn lại của dòng
    moved = []
    for i, line in enumerate(lines[1:], 1):
        ch, cut = line[:line.index(',')], line.rindex(',')
        new = level.get(ch, OUTSIDE_LIST.get(ch))
        if new is not None and line[cut + 1:] != str(new):
            moved.append(f"{ch} {line[cut + 1:] or '-'}→{new}")
            lines[i] = f'{line[:cut + 1]}{new}'
    out = io.StringIO()
    w = csv.writer(out, lineterminator='\n')
    for c in missing:
        on, kun = readings(source[c])
        han_viet, meaning = NEW_KANJI[c]
        w.writerow([c, han_viet, meaning, pg_array(on), pg_array(kun), source[c]['strokes'], level[c]])
    KANJI_CSV.write_text('\n'.join(lines) + '\n' + out.getvalue(), encoding='utf-8')
    print(f'Đổi cấp {len(moved)} chữ: {", ".join(moved)}')
    print(f'Thêm {len(missing)} chữ mới')


if __name__ == '__main__':
    main()
