# Duyệt Kanji N3–N2 và cấp mới N5–N4

Chủ dự án yêu cầu 2026-11-27: soạn Kanji N3, N2 theo danh sách gửi kèm (N5 80, N4 167, N3 370, N2 368 chữ) và chỉnh cấp N5, N4 cho khớp. Danh sách trùng danh sách Waller (cột `jlpt_new` của kanji-data, gốc KANJIDIC2), nên lấy từ file nguồn thay vì chép tay từ ảnh; 6 chữ file nguồn để trống cấp được bổ sung tay: 分 (N5), 的 (N4), 可 身 阪 (N3), 無 (N2). Bốn chữ ngoài danh sách có trong từ vựng (暑 誰 韓 賑) xếp vào N4 theo chủ dự án.

Script: `python3 scripts/kanji-data/levels.py` → `python3 scripts/kanji-data/v12_data.py` (chỉ giữ `kanji_frequency.csv`) → `pnpm kanji:visual`.

**Cần duyệt:** mục 2 (Hán Việt, nghĩa) và mục 3 (cặp chữ giống). Sửa trực tiếp trong `NEW_KANJI` của `scripts/kanji-data/levels.py` rồi chạy lại, hoặc ghi chú vào file này để Claude sửa. Chưa seed dev/prod tới khi duyệt.

## 1. Chữ đổi cấp

| Từ → sang | Số chữ | Chữ |
| --- | --- | --- |
| N3 → N2 | 1 | 無 |
| N3 → N4 | 1 | 的 |
| N5 → N2 | 6 | 寺門森林竹県 |
| N5 → N3 | 12 | 耳馬米好回石内暗彼夢君頭 |
| N5 → N4 | 51 | 夕週字帰方口目手足牛魚犬鳥田海空花員者飲買言安元新古少多明肉茶物自町会社病院店同立仕事力私妹兄冬家駅道 |
| chưa có cấp → N3 | 1 | 阪 |
| chưa có cấp → N4 | 3 | 誰韓賑 |

Sau khi đổi: N5 80, N4 171, N3 370, N2 368, N1 120, chưa có cấp 0 chữ (N4 gồm cả 4 chữ ngoài danh sách).

Ảnh hưởng tới người đang học: chữ đã học giữ nguyên điểm và lịch. 69 chữ rời N5 sẽ được học muộn hơn; thẻ Từ vựng Kanji của từ N5 có các chữ này mở ở cấp mới của chữ (vd. 駅 → N4).

## 2. Chữ mới — Hán Việt và nghĩa (Claude soạn, chờ duyệt)

Âm On/Kun và số nét lấy từ KANJIDIC2; Kun bỏ dạng tiền tố/hậu tố, giữ tối đa 4 âm.

### N4 (2 chữ)

| Chữ | Hán Việt | Nghĩa | On | Kun |
| --- | --- | --- | --- | --- |
| 京 | KINH | kinh đô, thủ đô | キョウ、ケイ、キン | みやこ |
| 飯 | PHẠN | cơm; bữa ăn | ハン | めし |

### N3 (84 chữ)

| Chữ | Hán Việt | Nghĩa | On | Kun |
| --- | --- | --- | --- | --- |
| 与 | DỮ | ban cho; tham dự | ヨ | あた.える、あずか.る、くみ.する、ともに |
| 亡 | VONG | mất, chết | ボウ、モウ | な.い、ほろ.びる、ほろ.ぶ、ほろ.ぼす |
| 才 | TÀI | tài năng; tuổi | サイ |  |
| 互 | HỖ | lẫn nhau | ゴ | たが.い、かたみ.に |
| 欠 | KHIẾM | thiếu; vắng mặt | ケツ、ケン | か.ける、か.く |
| 王 | VƯƠNG | vua | オウ |  |
| 処 | XỬ | xử lý; nơi chốn | ショ | ところ、お.る |
| 未 | VỊ | chưa | ミ、ビ | いま.だ、ま.だ、ひつじ |
| 民 | DÂN | người dân | ミン | たみ |
| 示 | THỊ | chỉ ra, cho thấy | ジ、シ | しめ.す |
| 任 | NHIỆM | nhiệm vụ; giao phó | ニン | まか.せる、まか.す |
| 光 | QUANG | ánh sáng | コウ | ひか.る、ひかり |
| 共 | CỘNG | cùng nhau | キョウ | とも、とも.に |
| 列 | LIỆT | hàng, dãy | レツ、レ |  |
| 在 | TẠI | ở, tồn tại | ザイ | あ.る |
| 老 | LÃO | già | ロウ | お.いる、ふ.ける |
| 位 | VỊ | vị trí; khoảng chừng | イ | くらい、ぐらい |
| 判 | PHÁN | phán đoán; con dấu | ハン、バン | わか.る |
| 努 | NỖ | cố gắng | ド | つと.める |
| 労 | LAO | lao động; vất vả | ロウ | ろう.する、いたわ.る、いた.ずき、ねぎら |
| 否 | PHỦ | phủ định, không | ヒ | いな、いや |
| 告 | CÁO | báo cho biết | コク | つ.げる |
| 完 | HOÀN | hoàn thành, trọn vẹn | カン |  |
| 更 | CANH | thêm nữa; thay đổi | コウ | さら、さら.に、ふ.ける、ふ.かす |
| 求 | CẦU | tìm kiếm; yêu cầu | キュウ、グ | もと.める |
| 状 | TRẠNG | tình trạng; thư | ジョウ |  |
| 供 | CUNG | cung cấp; đi theo | キョウ、ク、クウ、グ | そな.える、とも |
| 制 | CHẾ | chế độ; kiềm chế | セイ |  |
| 居 | CƯ | ở, cư trú | キョ、コ | い.る、お.る |
| 抱 | BÃO | ôm | ホウ | だ.く、いだ.く、かか.える |
| 突 | ĐỘT | đột ngột; đâm | トツ、カ | つ.く |
| 怒 | NỘ | giận | ド、ヌ | いか.る、おこ.る |
| 昨 | TẠC | hôm qua; trước | サク |  |
| 皆 | GIAI | tất cả, mọi người | カイ | みな、みんな |
| 草 | THẢO | cỏ | ソウ | くさ |
| 追 | TRUY | đuổi theo | ツイ | お.う |
| 限 | HẠN | giới hạn | ゲン | かぎ.る、かぎ.り |
| 面 | DIỆN | mặt; bề mặt | メン、ベン | おも、おもて、つら |
| 候 | HẬU | khí hậu; chờ đợi | コウ | そうろう |
| 容 | DUNG | chứa đựng; dung mạo | ヨウ | い.れる |
| 恐 | KHỦNG | sợ hãi | キョウ | おそ.れる、おそ.る、おそ.ろしい、こわ.い |
| 捕 | BỘ | bắt | ホ | と.らえる、と.らわれる、と.る、とら.える |
| 殺 | SÁT | giết | サツ、サイ、セツ | ころ.す、そ.ぐ |
| 流 | LƯU | chảy, trôi | リュウ、ル | なが.れる、なが.れ、なが.す |
| 浮 | PHÙ | nổi | フ | う.く、う.かれる、う.かぶ、む |
| 能 | NĂNG | năng lực | ノウ | よ.く |
| 偶 | NGẪU | ngẫu nhiên; số chẵn | グウ | たま |
| 商 | THƯƠNG | buôn bán | ショウ | あきな.う |
| 婦 | PHỤ | phụ nữ; vợ | フ | よめ |
| 得 | ĐẮC | được, thu được | トク | え.る、う.る |
| 断 | ĐOẠN | cắt đứt; từ chối | ダン | た.つ、ことわ.る、さだ.める |
| 深 | THÂM | sâu | シン | ふか.い、ふか.まる、ふか.める |
| 盗 | ĐẠO | ăn trộm | トウ | ぬす.む、ぬす.み |
| 訪 | PHỎNG | thăm hỏi | ホウ | おとず.れる、たず.ねる、と.う |
| 貧 | BẦN | nghèo | ヒン、ビン | まず.しい |
| 責 | TRÁCH | trách nhiệm; trách móc | セキ | せ.める |
| 進 | TIẾN | tiến lên | シン | すす.む、すす.める |
| 頂 | ĐỈNH | đỉnh; nhận (khiêm nhường) | チョウ | いただ.く、いただき |
| 喜 | HỶ | vui mừng | キ | よろこ.ぶ、よろこ.ばす |
| 富 | PHÚ | giàu | フ、フウ | と.む、とみ |
| 幾 | KỶ | bao nhiêu | キ | いく.つ、いく.ら |
| 御 | NGỰ | kính ngữ; điều khiển | ギョ、ゴ |  |
| 期 | KỲ | thời kỳ; kỳ hạn | キ、ゴ |  |
| 満 | MÃN | đầy, đủ | マン、バン | み.ちる、み.つ、み.たす |
| 程 | TRÌNH | mức độ; trình tự | テイ | ほど |
| 等 | ĐẲNG | bậc, hạng; vân vân | トウ | ひと.しい、など |
| 費 | PHÍ | chi phí | ヒ | つい.やす、つい.える |
| 想 | TƯỞNG | nghĩ; tưởng tượng | ソウ、ソ | おも.う |
| 福 | PHÚC | phúc, may mắn | フク |  |
| 罪 | TỘI | tội | ザイ | つみ |
| 腹 | PHÚC | bụng | フク | はら |
| 解 | GIẢI | giải thích, tháo gỡ | カイ、ゲ | と.く、と.かす、と.ける、ほど.く |
| 路 | LỘ | con đường | ロ、ル | みち |
| 構 | CẤU | cấu tạo; để tâm | コウ | かま.える、かま.う |
| 演 | DIỄN | biểu diễn | エン |  |
| 疑 | NGHI | nghi ngờ | ギ | うたが.う |
| 種 | CHỦNG | loại; hạt giống | シュ | たね |
| 精 | TINH | tinh thần; tinh tế | セイ、ショウ | しら.げる、くわ.しい |
| 緒 | TỰ | đầu mối; cùng nhau | ショ、チョ | お、いとぐち |
| 誤 | NGỘ | sai lầm | ゴ | あやま.る |
| 鳴 | MINH | kêu, hót; reo | メイ | な.く、な.る、な.らす |
| 権 | QUYỀN | quyền | ケン、ゴン | おもり、かり、はか.る |
| 職 | CHỨC | nghề nghiệp; chức vụ | ショク、ソク |  |
| 観 | QUAN | xem, quan sát | カン | み.る、しめ.す |

### N2 (179 chữ)

| Chữ | Hán Việt | Nghĩa | On | Kun |
| --- | --- | --- | --- | --- |
| 了 | LIỄU | xong, kết thúc | リョウ |  |
| 干 | CAN | phơi khô | カン | ほ.す、ひ.る |
| 仏 | PHẬT | Phật | ブツ、フツ | ほとけ |
| 匹 | THẤT | con (đếm thú nhỏ) | ヒツ | ひき |
| 区 | KHU | khu, quận | ク、オウ、コウ |  |
| 戸 | HỘ | cửa; hộ, nhà | コ | と |
| 毛 | MAO | lông; tóc | モウ | け |
| 令 | LỆNH | mệnh lệnh | レイ |  |
| 冊 | SÁCH | quyển | サツ、サク | ふみ |
| 刊 | SAN | xuất bản | カン |  |
| 占 | CHIẾM | chiếm; bói toán | セン | し.める、うらな.う |
| 圧 | ÁP | áp lực, ép | アツ、エン、オウ | お.す、へ.す、おさ.える、お.さえる |
| 央 | ƯƠNG | giữa, trung tâm | オウ |  |
| 巨 | CỰ | to lớn | キョ |  |
| 幼 | ẤU | nhỏ tuổi, ấu thơ | ヨウ | おさな.い |
| 庁 | SẢNH | cơ quan nhà nước | チョウ、テイ | やくしょ |
| 旧 | CỰU | cũ | キュウ | ふる.い、もと |
| 氷 | BĂNG | băng, nước đá | ヒョウ | こおり、ひ、こお.る |
| 永 | VĨNH | mãi mãi | エイ | なが.い |
| 皮 | BÌ | da; vỏ | ヒ | かわ |
| 兆 | TRIỆU | nghìn tỷ; điềm báo | チョウ | きざ.す、きざ.し |
| 再 | TÁI | lại, lần nữa | サイ、サ | ふたた.び |
| 叫 | KHIẾU | hét, kêu to | キョウ | さけ.ぶ |
| 各 | CÁC | mỗi | カク | おのおの |
| 州 | CHÂU | châu, bang | シュウ、ス | す |
| 灯 | ĐĂNG | đèn | トウ | ひ、ともしび、とも.す、あかり |
| 糸 | MỊCH | sợi chỉ | シ | いと |
| 羽 | VŨ | lông vũ; cánh | ウ | は、わ、はね |
| 肌 | CƠ | da | キ | はだ |
| 舟 | CHU | thuyền | シュウ | ふね |
| 虫 | TRÙNG | côn trùng, sâu bọ | チュウ、キ | むし |
| 血 | HUYẾT | máu | ケツ | ち |
| 衣 | Y | quần áo | イ、エ | ころも、きぬ |
| 乱 | LOẠN | loạn, rối | ラン、ロン | みだ.れる、みだ.る、みだ.す、みだ |
| 伸 | THÂN | duỗi, kéo dài | シン | の.びる、の.ばす、の.べる、の.す |
| 児 | NHI | trẻ nhỏ | ジ、ニ、ゲイ | こ |
| 兵 | BINH | lính | ヘイ、ヒョウ | つわもの |
| 含 | HÀM | bao gồm, chứa | ガン | ふく.む、ふく.める |
| 囲 | VI | bao quanh | イ | かこ.む、かこ.う、かこ.い |
| 坂 | PHẢN | con dốc | ハン | さか |
| 快 | KHOÁI | dễ chịu, sảng khoái | カイ | こころよ.い |
| 改 | CẢI | sửa đổi | カイ | あらた.める、あらた.まる |
| 沈 | TRẦM | chìm | チン、ジン | しず.む、しず.める |
| 臣 | THẦN | bề tôi, quan | シン、ジン |  |
| 谷 | CỐC | thung lũng | コク | たに、きわ.まる |
| 貝 | BỐI | con sò, vỏ sò | バイ | かい |
| 防 | PHÒNG | phòng ngừa | ボウ | ふせ.ぐ |
| 依 | Y | dựa vào | イ、エ | よ.る |
| 刷 | LOÁT | in | サツ | す.る、は.く |
| 券 | KHOÁN | vé | ケン |  |
| 効 | HIỆU | hiệu quả | コウ | き.く、ききめ、なら.う |
| 姓 | TÍNH | họ | セイ、ショウ |  |
| 委 | ỦY | ủy thác | イ | ゆだ.ねる |
| 岩 | NHAM | đá tảng | ガン | いわ |
| 底 | ĐỂ | đáy | テイ | そこ |
| 府 | PHỦ | phủ; cơ quan nhà nước | フ |  |
| 延 | DIÊN | kéo dài | エン | の.びる、の.べる、の.べ、の.ばす |
| 承 | THỪA | thừa nhận, chấp nhận | ショウ、ジョウ | うけたまわ.る、う.ける |
| 担 | ĐẢM | gánh vác | タン | かつ.ぐ、にな.う |
| 昇 | THĂNG | bay lên; thăng tiến | ショウ | のぼ.る |
| 板 | BẢN | tấm ván | ハン、バン | いた |
| 枚 | MAI | tờ, tấm | マイ、バイ |  |
| 欧 | ÂU | châu Âu | オウ | うた.う、は.く |
| 武 | VŨ | võ | ブ、ム | たけ、たけ.し |
| 毒 | ĐỘC | chất độc | ドク |  |
| 河 | HÀ | sông | カ | かわ |
| 況 | HUỐNG | tình huống | キョウ | まし.て、いわ.んや、おもむき |
| 版 | BẢN | bản in; ấn bản | ハン |  |
| 肩 | KIÊN | vai | ケン | かた |
| 肯 | KHẲNG | đồng ý, khẳng định | コウ | がえんじ.る |
| 述 | THUẬT | trình bày, kể | ジュツ | の.べる |
| 勇 | DŨNG | dũng cảm | ユウ | いさ.む |
| 型 | HÌNH | khuôn, kiểu mẫu | ケイ | かた |
| 巻 | QUYỂN | cuộn; quyển | カン、ケン | ま.く、まき、ま.き |
| 挟 | HIỆP | kẹp | キョウ、ショウ | はさ.む、はさ.まる、わきばさ.む、さしはさ.む |
| 枯 | KHÔ | khô héo | コ | か.れる、か.らす |
| 柱 | TRỤ | cột | チュウ | はしら |
| 栄 | VINH | vinh quang; thịnh vượng | エイ、ヨウ | さか.える、は.え、は.える、え |
| 浅 | THIỂN | nông, cạn | セン | あさ.い |
| 炭 | THÁN | than | タン | すみ |
| 省 | TỈNH | bộ (cơ quan); lược bớt; tự xét | セイ、ショウ | かえり.みる、はぶ.く |
| 荒 | HOANG | hoang dã; thô bạo | コウ | あら.い、あ.れる、あ.らす、すさ.む |
| 軍 | QUÂN | quân đội | グン | いくさ |
| 逆 | NGHỊCH | ngược | ギャク、ゲキ | さか、さか.さ、さか.らう |
| 革 | CÁCH | da thuộc; cải cách | カク | かわ |
| 香 | HƯƠNG | hương thơm | コウ、キョウ | か、かお.り、かお.る |
| 個 | CÁ | cá nhân; cái | コ、カ |  |
| 党 | ĐẢNG | đảng phái | トウ | なかま、むら |
| 凍 | ĐỐNG | đóng băng | トウ | こお.る、こご.える、こご.る、い.てる |
| 捜 | SƯU | tìm kiếm | ソウ、シュ、シュウ | さが.す |
| 根 | CĂN | rễ; gốc | コン | ね |
| 畜 | SÚC | gia súc | チク |  |
| 粉 | PHẤN | bột | フン | こ、こな |
| 純 | THUẦN | thuần khiết | ジュン |  |
| 耕 | CANH | cày cấy | コウ | たがや.す |
| 胸 | HUNG | ngực | キョウ | むね |
| 脂 | CHI | mỡ | シ | あぶら |
| 航 | HÀNG | đi biển; hàng không | コウ |  |
| 般 | BAN | chung, nói chung | ハン |  |
| 被 | BỊ | bị; che phủ | ヒ | こうむ.る、おお.う、かぶ.る、かぶ.せる |
| 訓 | HUẤN | dạy bảo; âm Kun | クン、キン | おし.える、よ.む、くん.ずる |
| 軒 | HIÊN | mái hiên; căn (nhà) | ケン | のき |
| 造 | TẠO | chế tạo | ゾウ | つく.る、つく.り |
| 隻 | CHÍCH | chiếc (đếm tàu thuyền) | セキ |  |
| 骨 | CỐT | xương | コツ | ほね |
| 副 | PHÓ | phó, phụ | フク |  |
| 域 | VỰC | khu vực | イキ |  |
| 患 | HOẠN | bệnh; mắc bệnh | カン | わずら.う |
| 掘 | QUẬT | đào | クツ | ほ.る |
| 採 | THẢI | hái; tuyển chọn | サイ | と.る |
| 液 | DỊCH | chất lỏng | エキ |  |
| 清 | THANH | trong sạch | セイ、ショウ、シン | きよ.い、きよ.まる、きよ.める |
| 略 | LƯỢC | lược bớt, tóm tắt | リャク | ほぼ、はぶ.く、おか.す、おさ.める |
| 移 | DI | di chuyển | イ | うつ.る、うつ.す |
| 章 | CHƯƠNG | chương; huy hiệu | ショウ |  |
| 符 | PHÙ | dấu hiệu; vé | フ |  |
| 粒 | LẠP | hạt | リュウ | つぶ |
| 翌 | DỰC | kế tiếp (ngày, năm sau) | ヨク |  |
| 著 | TRỨ | nổi tiếng; viết sách | チョ、チャク | あらわ.す、いちじる.しい |
| 貨 | HÓA | hàng hóa; tiền | カ | たから |
| 軟 | NHUYỄN | mềm | ナン | やわ.らか、やわ.らかい |
| 募 | MỘ | chiêu mộ | ボ | つの.る |
| 塔 | THÁP | tháp | トウ |  |
| 尊 | TÔN | tôn kính | ソン | たっと.い、とうと.い、たっと.ぶ、とうと.ぶ |
| 幅 | PHÚC | chiều rộng | フク | はば |
| 極 | CỰC | cực điểm | キョク、ゴク | きわ.める、きわ.まる、きわ.まり、きわ.み |
| 湖 | HỒ | hồ | コ | みずうみ |
| 湾 | LOAN | vịnh | ワン | いりえ |
| 湿 | THẤP | ẩm ướt | シツ、シュウ | しめ.る、しめ.す、うるお.う、うるお.す |
| 畳 | ĐIỆP | chiếu tatami; gấp | ジョウ、チョウ | たた.む、たたみ、かさ.なる |
| 硬 | NGẠNH | cứng | コウ | かた.い |
| 税 | THUẾ | thuế | ゼイ |  |
| 童 | ĐỒNG | trẻ em | ドウ | わらべ |
| 腕 | OẢN | cánh tay; tay nghề | ワン | うで |
| 装 | TRANG | trang phục; trang bị | ソウ、ショウ | よそお.う、よそお.い |
| 補 | BỔ | bổ sung | ホ | おぎな.う |
| 詞 | TỪ | từ (từ loại) | シ | ことば |
| 超 | SIÊU | siêu, vượt quá | チョウ | こ.える、こ.す |
| 鈍 | ĐỘN | cùn; chậm chạp | ドン | にぶ.い、にぶ.る、なま.る、なまく.ら |
| 隅 | NGUNG | góc | グウ | すみ |
| 雇 | CỐ | thuê người | コ | やと.う |
| 雲 | VÂN | mây | ウン | くも |
| 傾 | KHUYNH | nghiêng | ケイ | かたむ.く、かたむ.ける、かたぶ.く、かた.げる |
| 塗 | ĐỒ | sơn, bôi | ト | ぬ.る、ぬ.り、まみ.れる |
| 損 | TỔN | tổn thất | ソン | そこ.なう、そこな.う、そこ.ねる |
| 殿 | ĐIỆN | cung điện; ngài | デン、テン | との |
| 溶 | DUNG | tan chảy, hòa tan | ヨウ | と.ける、と.かす、と.く |
| 照 | CHIẾU | chiếu sáng | ショウ | て.る、て.らす、て.れる |
| 署 | THỰ | sở, cơ quan; ký tên | ショ |  |
| 群 | QUẦN | bầy, đàn | グン | む.れる、む.れ、むら、むら.がる |
| 腰 | YÊU | eo, hông | ヨウ | こし |
| 蒸 | CHƯNG | hấp; bốc hơi | ジョウ、セイ | む.す、む.れる、む.らす |
| 豊 | PHONG | phong phú, giàu có | ホウ、ブ | ゆた.か、とよ |
| 跡 | TÍCH | dấu vết | セキ | あと |
| 農 | NÔNG | nông nghiệp | ノウ |  |
| 鉱 | KHOÁNG | khoáng sản | コウ | あらがね |
| 零 | LINH | số không | レイ | ぜろ、こぼ.す、こぼ.れる |
| 像 | TƯỢNG | bức tượng; hình ảnh | ゾウ |  |
| 境 | CẢNH | ranh giới | キョウ、ケイ | さかい |
| 層 | TẦNG | tầng, lớp | ソウ |  |
| 憎 | TĂNG | ghét | ゾウ | にく.む、にく.い、にく.らしい、にく.しみ |
| 滴 | TÍCH | giọt | テキ | しずく、したた.る |
| 漁 | NGƯ | đánh cá | ギョ、リョウ | あさ.る |
| 綿 | MIÊN | bông | メン | わた |
| 総 | TỔNG | tổng, toàn bộ | ソウ | す.べて、すべ.て、ふさ |
| 銅 | ĐỒNG | đồng (kim loại) | ドウ | あかがね |
| 鼻 | TỴ | mũi | ビ | はな |
| 劇 | KỊCH | kịch | ゲキ |  |
| 導 | ĐẠO | dẫn dắt | ドウ | みちび.く |
| 暴 | BẠO | bạo lực; dữ dội | ボウ、バク | あば.く、あば.れる |
| 編 | BIÊN | đan; biên soạn | ヘン | あ.む |
| 膚 | PHU | da | フ | はだ |
| 諸 | CHƯ | các, nhiều | ショ | もろ |
| 鋭 | DUỆ | sắc bén | エイ | するど.い |
| 賢 | HIỀN | khôn ngoan | ケン | かしこ.い |
| 燥 | TÁO | khô ráo | ソウ | はしゃ.ぐ |
| 療 | LIỆU | chữa bệnh | リョウ |  |
| 臓 | TẠNG | nội tạng | ゾウ | はらわた |
| 籍 | TỊCH | sổ hộ tịch; quốc tịch | セキ |  |

Hán Việt trùng âm giữa các chữ mới hoặc với chữ cũ (để ý khi duyệt câu "Hán Việt → Kanji", đề có kèm nghĩa):

BIÊN (辺編), BÌ (疲皮), BẢN (本阪板版), BỊ (備被), BỐI (背貝), BỘ (部歩捕), CANH (更耕), CHI (支枝脂), CHU (週周舟), CÁCH (格革), CƠ (機肌), CẢNH (景警境), CẦU (球求), CỐ (固雇), DUNG (容溶), DŨNG (踊勇), DỊCH (駅役易液), GIAI (階皆), HIỆP (協挟), HIỆU (校号効), HOÀN (丸完), HÀ (何荷河), HÌNH (形型), HÓA (化貨), HẬU (後厚候), KINH (経京), KỲ (祈期), KỶ (机幾), LINH (齢零), LIỆU (料療), LƯU (留流), MAI (埋枚), MINH (明鳴), MIÊN (眠綿), MỘ (暮募), NGƯ (魚漁), PHONG (封風豊), PHU (夫膚), PHÍ (沸費), PHÓ (付副), PHÙ (浮符), PHÚC (福腹幅), PHẢN (返反坂), PHỤ (父負婦), PHỦ (府否), QUAN (官関観), QUÂN (君均軍), SÁT (察殺), THANH (青声清), THUẬT (術述), THÂN (親身申伸), THẢI (貸採), THẤT (七失室匹), THẦN (神臣), THỊ (市示), THỪA (乗承), TINH (星精), TRIỆU (召兆), TRÙNG (重虫), TÀI (材財才), TÍCH (昔積績跡滴), TÍNH (性姓), TÔN (孫尊), TĂNG (増憎), TƯỢNG (象像), TỊCH (夕席籍), TỪ (辞詞), TỰ (字自寺似緒), VI (違囲), VONG (忘亡), VŨ (雨舞宇羽武), VỊ (味胃未位), Y (医依衣), ÁP (押圧), ĐIỆN (電殿), ĐOẠN (段断), ĐĂNG (登灯), ĐẠO (道導盗), ĐỒ (図徒途塗), ĐỒNG (同筒童銅), ĐỘC (読毒).

## 3. Cặp chữ giống (chờ duyệt)

`pnpm kanji:visual` đề xuất lại toàn bộ cặp (1741 cặp, mỗi chữ tối đa 3). 492 cặp đã duyệt giữ nguyên. 291 cặp chưa duyệt cũ bị thay vì chữ mới chiếm chỗ (vd. 土/士). Có 672 cặp chưa duyệt chứa chữ mới; chỉ cặp `approved` = `true` trong `data/n5/kanji_similar.csv` mới dùng cho câu "phân biệt Kanji giống nhau".

30 cặp giống nhất chứa chữ mới:

| Cặp | Điểm | Giải thích tự động |
| --- | --- | --- |
| 渡 演 | 0.974 | 渡 (ĐỘ, băng qua; trao) và 演 (DIỄN, biểu diễn). 渡 có 12 nét, 演 có 14 nét. Khác ở thành phần: 渡 có 度, 演 có 寅. |
| 賑 照 | 0.968 | 賑 (CHẨN, náo nhiệt) và 照 (CHIẾU, chiếu sáng). 賑 có 14 nét, 照 có 13 nét. Khác ở thành phần: 賑 có 貝, 辰, 照 có 昭, 灬. |
| 照 湿 | 0.967 | 照 (CHIẾU, chiếu sáng) và 湿 (THẤP, ẩm ướt). 照 có 13 nét, 湿 có 12 nét. Khác ở thành phần: 照 có 昭, 灬, 湿 có 氵, 日, 业. |
| 飼 詞 | 0.967 | 飼 (TỰ, nuôi) và 詞 (TỪ, từ (từ loại)). 飼 có 13 nét, 詞 có 12 nét. Khác ở thành phần: 飼 có 飠, 詞 có 言. |
| 温 照 | 0.96 | 温 (ÔN, ấm) và 照 (CHIẾU, chiếu sáng). 温 có 12 nét, 照 có 13 nét. Khác ở thành phần: 温 có 氵, 昷, 照 có 昭, 灬. |
| 混 湿 | 0.959 | 混 (HỖN, trộn) và 湿 (THẤP, ẩm ướt). 混 có 11 nét, 湿 có 12 nét. Khác ở thành phần: 混 có 昆, 湿 có 日, 业. |
| 因 囲 | 0.956 | 因 (NHÂN, nguyên nhân) và 囲 (VI, bao quanh). 因 có 6 nét, 囲 có 7 nét. Khác ở thành phần: 因 có 大, 囲 có 井. |
| 過 進 | 0.955 | 過 (QUÁ, quá) và 進 (TIẾN, tiến lên). 過 có 12 nét, 進 có 11 nét. Khác ở thành phần: 過 có 咼, 進 có 隹. |
| 違 進 | 0.955 | 違 (VI, khác; sai) và 進 (TIẾN, tiến lên). 違 có 13 nét, 進 có 11 nét. Khác ở thành phần: 違 có 韋, 進 có 隹. |
| 道 進 | 0.954 | 道 (ĐẠO, con đường) và 進 (TIẾN, tiến lên). 道 có 12 nét, 進 có 11 nét. Khác ở thành phần: 道 có 首, 進 có 隹. |
| 里 巨 | 0.953 | 里 (LÝ, làng; dặm) và 巨 (CỰ, to lớn). 里 có 7 nét, 巨 có 5 nét. Khác ở thành phần: 里 có 日, 巨 có 匚. |
| 通 追 | 0.953 | 通 (THÔNG, đi qua; thông) và 追 (TRUY, đuổi theo). 通 có 10 nét, 追 có 9 nét. Khác ở thành phần: 通 có 甬, 追 có 𠂤. |
| 舎 含 | 0.952 | 舎 (XÁ, nhà; quán xá) và 含 (HÀM, bao gồm, chứa). 舎 có 8 nét, 含 có 7 nét. Khác ở thành phần: 舎 có 人, 吉, 含 có 今, 口. |
| 個 掘 | 0.951 | 個 (CÁ, cá nhân; cái) và 掘 (QUẬT, đào). 個 có 10 nét, 掘 có 11 nét. Khác ở thành phần: 個 có 亻, 固, 掘 có 扌, 屈. |
| 区 匹 | 0.949 | 区 (KHU, khu, quận) và 匹 (THẤT, con (đếm thú nhỏ)). Cả hai đều 4 nét. Khác ở thành phần: 区 có 乂, 匹 có 儿. |
| 脳 腰 | 0.949 | 脳 (NÃO, não) và 腰 (YÊU, eo, hông). 脳 có 11 nét, 腰 có 13 nét. Khác ở thành phần: 脳 có ⺍, 凶, 腰 có 要. |
| 医 面 | 0.947 | 医 (Y, y; chữa bệnh) và 面 (DIỆN, mặt; bề mặt). 医 có 7 nét, 面 có 9 nét. 医 có thêm 匸, 矢. |
| 園 湿 | 0.947 | 園 (VIÊN, vườn) và 湿 (THẤP, ẩm ướt). 園 có 13 nét, 湿 có 12 nét. Khác ở thành phần: 園 có 囗, 袁, 湿 có 氵, 日, 业. |
| 通 述 | 0.947 | 通 (THÔNG, đi qua; thông) và 述 (THUẬT, trình bày, kể). 通 có 10 nét, 述 có 8 nét. Khác ở thành phần: 通 có 甬, 述 có 朮. |
| 酒 湖 | 0.946 | 酒 (TỬU, rượu) và 湖 (HỒ, hồ). 酒 có 10 nét, 湖 có 12 nét. Khác ở thành phần: 酒 có 酉, 湖 có 胡. |
| 退 述 | 0.946 | 退 (THOÁI, rút lui) và 述 (THUẬT, trình bày, kể). 退 có 9 nét, 述 có 8 nét. Khác ở thành phần: 退 có 艮, 述 có 朮. |
| 爆 燥 | 0.945 | 爆 (BỘC, nổ) và 燥 (TÁO, khô ráo). 爆 có 19 nét, 燥 có 17 nét. Khác ở thành phần: 爆 có 暴, 燥 có 喿. |
| 転 程 | 0.944 | 転 (CHUYỂN, lăn; chuyển) và 程 (TRÌNH, mức độ; trình tự). 転 có 11 nét, 程 có 12 nét. Khác ở thành phần: 転 có 車, 云, 程 có 禾, 呈. |
| 認 誤 | 0.943 | 認 (NHẬN, công nhận) và 誤 (NGỘ, sai lầm). Cả hai đều 14 nét. Khác ở thành phần: 認 có 忍, 誤 có 呉. |
| 猫 掘 | 0.941 | 猫 (MIÊU, con mèo) và 掘 (QUẬT, đào). Cả hai đều 11 nét. Khác ở thành phần: 猫 có ⺨, 苗, 掘 có 扌, 屈. |
| 医 囲 | 0.94 | 医 (Y, y; chữa bệnh) và 囲 (VI, bao quanh). Cả hai đều 7 nét. Khác ở thành phần: 医 có 匸, 矢, 囲 có 囗, 井. |
| 悩 掘 | 0.94 | 悩 (NÃO, phiền muộn) và 掘 (QUẬT, đào). 悩 có 10 nét, 掘 có 11 nét. Khác ở thành phần: 悩 có 忄, ⺍, 凶, 掘 có 扌, 屈. |
| 撲 編 | 0.94 | 撲 (PHÁC, đánh) và 編 (BIÊN, đan; biên soạn). Cả hai đều 15 nét. Khác ở thành phần: 撲 có 扌, 菐, 編 có 糸, 扁. |
| 追 述 | 0.94 | 追 (TRUY, đuổi theo) và 述 (THUẬT, trình bày, kể). 追 có 9 nét, 述 có 8 nét. Khác ở thành phần: 追 có 𠂤, 述 có 朮. |
| 領 傾 | 0.939 | 領 (LĨNH, lãnh thổ; thủ lĩnh) và 傾 (KHUYNH, nghiêng). 領 có 14 nét, 傾 có 13 nét. Khác ở thành phần: 領 có 令, 頁, 傾 có 亻, 頃. |
