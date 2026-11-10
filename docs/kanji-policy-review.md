# Rà soát chính sách Kanji của từ (V9 gói 3)

File này do `pnpm policy:propose` tạo, đừng sửa tay. Sửa nhãn trong `data/n5/kanji_policy.csv`, đặt `locked` = `true` cho dòng đã duyệt, rồi chạy lại script và `pnpm seed`.

Nguồn: JMdict (EDRDG, CC BY-SA 4.0) để biết từ thường viết bằng Kana; cấp chữ Kanji theo N5 của file gốc + danh sách Waller. JLPT không công bố danh sách chính thức, nên mọi cấp ở đây là ước lượng.

## 1. Số lượng

| Nhãn | Ý nghĩa | Từ N5 | Từ N4 |
| --- | --- | --- | --- |
| KANA_ONLY | Không có Kanji | 357 | 231 |
| KANJI_CORE | Học dạng Kanji ở cấp của từ | 240 | 215 |
| KANJI_DEFERRED | Học dạng Kanji ở cấp sau | 385 | 444 |
| KANJI_OPTIONAL | Thường viết Kana, chỉ học khi bấm "Học dạng Kanji" | 0 | 0 |

Đã duyệt (locked): 3/1872.

## 2. Đã duyệt nhưng đề xuất mới khác

| Mã | Từ | Nhãn đã duyệt | Đề xuất mới | Lý do đề xuất |
| --- | --- | --- | --- | --- |
| n5-0023 | 誰 | KANJI_CORE N5 | KANJI_DEFERRED N1 | Có chữ 誰 cấp N1, học dạng Kanji ở N1; chữ chưa có cấp: 誰 |
| n5-0037 | 韓国 | KANJI_CORE N5 | KANJI_DEFERRED N1 | Có chữ 韓 cấp N1, học dạng Kanji ở N1; chữ chưa có cấp: 韓 |
| n5-0332 | 賑やか | KANJI_CORE N5 | KANJI_DEFERRED N1 | Có chữ 賑 cấp N1, học dạng Kanji ở N1; chữ chưa có cấp: 賑 |

## 3. Độ tin cậy thấp: không tìm thấy trong JMdict hoặc có chữ chưa có cấp

Không có.

## 4. Độ tin cậy vừa: JMdict ghi thường viết bằng Kana hoặc cách viết hiếm

| Mã | Từ | Cách đọc | Nghĩa | Cấp từ | Nhãn | Học ở | Lý do |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n5-0029 | お名前は | おなまえは | bạn tên gì? | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0032 | から来ました | からきました | đến từ ~ | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0044 | さくら大学 | さくらだいがく | trường ĐH Sakura (Hoa Anh Đào) | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0086 | ほんの気持ちです | ほんのきもちです | đây là chút quà nhỏ của tôi | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0090 | これからお世話になります | これからおせわになります | từ nay mong được anh; chị giúp đỡ | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0130 | 見せてください | みせてください | cho tôi xem [~] | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0133 | 新大阪 | しんおおさか | tên một nhà ga ở Osaka | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0923 | 何曜日 | なにようび | thứ mấy | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0178 | 大変ですね | たいへんですね | vất vả nhỉ | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0196 | 歩いて | あるいて | đi bộ | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0233 | 次の | つぎの | tiếp theo (đứng trước danh từ) | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0284 | 何ですか | なんですか | có gì đấy ạ?; cái gì vậy?; vâng có tôi. (câu trả lời khi ai đó gọi tên mình) | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0936 | どうぞお上がりください | どうぞおあがりください | mời anh/chị vào nhà | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0376 | 分かります | わかります | hiểu; nắm được | N5 | KANJI_CORE | N5 | Mọi chữ thuộc N5 hoặc dễ hơn; JMdict ghi thường viết bằng Kana |
| n5-0418 | 残念です | ざんねんです | thật đáng tiếc nhỉ; buồn nhỉ | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0465 | 段目 | だんめ | giá thứ -; tầng thứ – (「だん」 được dùng cho giá sách v.v.) | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0491 | 葉書 | はがき | bưu thiếp | N5 | KANJI_DEFERRED | N3 | Có chữ 葉 cấp N3, học dạng Kanji ở N3; JMdict ghi thường viết bằng Kana |
| n5-0970 | 全部で | ぜんぶで | tất cả; toàn bộ | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0537 | 疲れました | つかれました | tôi mệt rồi | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0576 | ご注文は | ごちゅうもんは | mời anh; chị gọi món | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0577 | 牛どん | ぎゅうどん | món cơm thịt bò | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0578 | 少々お待ちください | しょうしょうおまちください | xin vui lòng đợi một chút | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0616 | これでお願いします | これでおねがいします | gửi anh tiền này | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0626 | 知っています | しっています | đang biết | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0627 | 住んでいます | すんでいます | sống [ở Osaka] | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0695 | 持って来ます | もってきます | mang đến | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0977 | 痛いです | いたいです | tôi bị đau ~ | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0743 | 本当ですか | ほんとうですか | thật không? | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0774 | 要ります | いります | cần (visa) | N5 | KANJI_DEFERRED | N3 | Có chữ 要 cấp N3, học dạng Kanji ở N3; JMdict ghi thường viết bằng Kana |
| n5-0798 | 国へ帰るの | くにへかえるの | anh; chị có về nước không? | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0802 | 色々 | いろいろ | nhiều thứ; đa dạng | N5 | KANJI_DEFERRED | N4 | Có chữ 色色 cấp N4, học dạng Kanji ở N4; JMdict ghi thường viết bằng Kana |
| n5-0834 | 見ないと | みないと | phải xem... | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0846 | 眼鏡 | めがね | kính | N5 | KANJI_DEFERRED | N1 | Có chữ 眼鏡 cấp N1, học dạng Kanji ở N1; JMdict ghi thường viết bằng Kana |
| n5-0857 | 余暇開発センター | よかかいはつセンター | trung tâm phát triển hoạt động giải trí cho người dân | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0858 | レジャー白書 | レジャーはくしょ | sách trắng về sử dụng thời gian rảnh rỗi | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0886 | 連れて来ます | つれてきます | dẫn đến | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0909 | 一杯飲みましょう | いっぱいのみましょう | chúng ta cùng uống nhé | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0910 | どうぞお元気で | どうぞおげんきで | chúc anh chị mạnh khỏe (câu nói trước khi chia tay với ai đó mà có lẽ lâu nữa mới gặp lại) | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n5-0911 | お世話になりました | おせわになりました | anh; chị đã giúp tôi nhiều | N5 | KANJI_CORE | N5 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N5 |
| n4-0024 | 何でも | なんでも | cái gì cũng | N4 | KANJI_CORE | N4 | Mọi chữ thuộc N4 hoặc dễ hơn; JMdict ghi thường viết bằng Kana |
| n4-0038 | 困ったなあ | こまったなあ | gay quá; căng quá | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0043 | 別の | べつの | khác | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0080 | 不思議な | ふしぎな | kì lạ; bí ẩn | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0083 | 付けます | つけます | lắp ghép | N4 | KANJI_DEFERRED | N3 | Có chữ 付 cấp N3, học dạng Kanji ở N3; JMdict ghi thường viết bằng Kana |
| n4-0145 | 掛かります | かかります | khóa | N4 | KANJI_DEFERRED | N3 | Có chữ 掛 cấp N3, học dạng Kanji ở N3; JMdict ghi thường viết bằng Kana |
| n4-0165 | 今の電車 | いまのでんしゃ | đoàn tàu vừa rồi | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0169 | 西の方 | にしのほう | phía tây | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0171 | 掛けます | かけます | treo | N4 | KANJI_DEFERRED | N3 | Có chữ 掛 cấp N3, học dạng Kanji ở N3; JMdict ghi thường viết bằng Kana |
| n4-0202 | 元の所 | もとのところ | địa điểm ban đầu | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0210 | 何かご希望がありますか | なにかごきぼうがありますか | anh/chị có nguyện vọng gì không | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0239 | の方 | のほう | hướng ~ | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0241 | 月に | つきに | một tháng | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0242 | 普通の | ふつうの | thường | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0339 | 電報代 | でんぽうだい | phí điện báo | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0341 | 短く | みじかく | ngắn gọn | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0343 | 重い病気 | おもいびょうき | bệnh nặng | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0378 | お茶をたてます | おちゃをたてます | pha trà | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0383 | 親子どんぶり | おやこどんぶり | món oyako-don | N4 | KANJI_CORE | N4 | Mọi chữ thuộc N4 hoặc dễ hơn; JMdict ghi cách viết là sK |
| n4-0389 | 四分の一 | よんぶんのいち | một phần tư | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0425 | これで終わります | これでおわります | đến đây là hết; chúng ta dừng ở đây | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0455 | 上手に | じょうずに | giỏi; khéo | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0472 | 大勢の | おおぜいの | nhiều (người) | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0541 | 五年生 | ごねんせい | học sinh năm thứ 5 | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0542 | 似ています | にています | giống | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0546 | 時間がたちます | じかんがたちます | thời gian trôi đi | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0576 | お疲れさまでした | おつかれさまでした | chắc anh/chị đã mệt vì làm việc | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0578 | 途中で | とちゅうで | giữa đường; giữa chừng | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0631 | 離れた | はなれた | xa cách; xa | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0640 | 親切にします | しんせつにします | giúp đỡ; đối xử thân thiện | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0649 | 猿 | さる | con khỉ | N4 | KANJI_DEFERRED | N1 | Có chữ 猿 cấp N1, học dạng Kanji ở N1; JMdict ghi thường viết bằng Kana |
| n4-0681 | 楽しく | たのしく | vui sướng | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0724 | の代わりに | のかわりに | thay cho | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0751 | と言います | といいます | tên là ~; được gọi là ~ | N4 | KANJI_CORE | N4 | Mọi chữ thuộc N4 hoặc dễ hơn; JMdict ghi thường viết bằng Kana |
| n4-0807 | 以上です | いじょうです | xin hết | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0820 | 帰ってきます | かえってきます | quay về; trở lại | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0827 | の所 | のところ | quanh vùng ~ | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0830 | 今いいでしょうか | いまいいでしょうか | tôi phiền anh được không | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0833 | どちら様でしょうか | どちらさまでしょうか | vị nào đấy ạ | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0878 | お忙しいですか | おいそがしいですか | anh/chị đang bận phải không | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |
| n4-0885 | 代わりをします | かわりをします | thay thế | N4 | KANJI_CORE | N4 | Không có trong JMdict (thường là cụm câu): học dạng Kanji ở N4 |

## 5. Học dạng Kanji ở cấp sau (KANJI_DEFERRED, độ tin cậy cao)

| Mã | Từ | Cách đọc | Nghĩa | Cấp từ | Nhãn | Học ở | Lý do |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n5-0012 | 教師 | きょうし | giáo viên (dùng để nói đến nghề nghiệp) | N5 | KANJI_DEFERRED | N3 | Có chữ 師 cấp N3, học dạng Kanji ở N3 |
| n5-0016 | 銀行員 | ぎんこういん | nhân viên ngân hàng | N5 | KANJI_DEFERRED | N4 | Có chữ 銀 cấp N4, học dạng Kanji ở N4 |
| n5-0017 | 医者 | いしゃ | bác sĩ | N5 | KANJI_DEFERRED | N4 | Có chữ 医 cấp N4, học dạng Kanji ở N4 |
| n5-0018 | 研究者 | けんきゅうしゃ | nhà nghiên cứu | N5 | KANJI_DEFERRED | N4 | Có chữ 研究 cấp N4, học dạng Kanji ở N4 |
| n5-0024 | 歳 | さい | tuổi | N5 | KANJI_DEFERRED | N3 | Có chữ 歳 cấp N3, học dạng Kanji ở N3 |
| n5-0025 | 何歳 | なんさい | mấy tuổi | N5 | KANJI_DEFERRED | N3 | Có chữ 歳 cấp N3, học dạng Kanji ở N3 |
| n5-0028 | 失礼ですが | しつれいですが | xin lỗi (khi muốn nhờ ai việc gì đó) | N5 | KANJI_DEFERRED | N3 | Có chữ 失礼 cấp N3, học dạng Kanji ở N3 |
| n5-0052 | 辞書 | じしょ | từ điển | N5 | KANJI_DEFERRED | N3 | Có chữ 辞 cấp N3, học dạng Kanji ở N3 |
| n5-0053 | 雑誌 | ざっし | tạp chí | N5 | KANJI_DEFERRED | N2 | Có chữ 誌 cấp N2, học dạng Kanji ở N2 |
| n5-0056 | 手帳 | てちょう | sổ tay | N5 | KANJI_DEFERRED | N1 | Có chữ 帳 cấp N1, học dạng Kanji ở N1 |
| n5-0057 | 名刺 | めいし | danh thiếp | N5 | KANJI_DEFERRED | N2 | Có chữ 刺 cấp N2, học dạng Kanji ở N2 |
| n5-0060 | 鉛筆 | えんぴつ | bút chì | N5 | KANJI_DEFERRED | N1 | Có chữ 鉛 cấp N1, học dạng Kanji ở N1 |
| n5-0064 | 時計 | とけい | đồng hồ | N5 | KANJI_DEFERRED | N4 | Có chữ 計 cấp N4, học dạng Kanji ở N4 |
| n5-0065 | 傘 | かさ | ô; dù | N5 | KANJI_DEFERRED | N1 | Có chữ 傘 cấp N1, học dạng Kanji ở N1 |
| n5-0073 | 自動車 | じどうしゃ | ô tô; xe hơi | N5 | KANJI_DEFERRED | N4 | Có chữ 動 cấp N4, học dạng Kanji ở N4 |
| n5-0074 | 机 | つくえ | cái bàn | N5 | KANJI_DEFERRED | N2 | Có chữ 机 cấp N2, học dạng Kanji ở N2 |
| n5-0078 | 英語 | えいご | tiếng Anh | N5 | KANJI_DEFERRED | N4 | Có chữ 英 cấp N4, học dạng Kanji ở N4 |
| n5-0083 | 違います | ちがいます | nhầm rồi | N5 | KANJI_DEFERRED | N3 | Có chữ 違 cấp N3, học dạng Kanji ở N3 |
| n5-0100 | 教室 | きょうしつ | lớp học; phòng học | N5 | KANJI_DEFERRED | N4 | Có chữ 教室 cấp N4, học dạng Kanji ở N4 |
| n5-0101 | 食堂 | しょくどう | nhà ăn | N5 | KANJI_DEFERRED | N4 | Có chữ 堂 cấp N4, học dạng Kanji ở N4 |
| n5-0102 | 事務所 | じむしょ | văn phòng | N5 | KANJI_DEFERRED | N3 | Có chữ 務所 cấp N3, học dạng Kanji ở N3 |
| n5-0103 | 会議室 | かいぎしつ | phòng họp | N5 | KANJI_DEFERRED | N3 | Có chữ 議 cấp N3, học dạng Kanji ở N3 |
| n5-0104 | 受付 | うけつけ | bộ phận tiếp tân; phòng thường trực; lễ tân | N5 | KANJI_DEFERRED | N3 | Có chữ 受付 cấp N3, học dạng Kanji ở N3 |
| n5-0106 | 部屋 | へや | căn phòng | N5 | KANJI_DEFERRED | N3 | Có chữ 部 cấp N3, học dạng Kanji ở N3 |
| n5-0108 | 階段 | かいだん | cầu thang | N5 | KANJI_DEFERRED | N2 | Có chữ 階 cấp N2, học dạng Kanji ở N2 |
| n5-0115 | 靴 | くつ | giày | N5 | KANJI_DEFERRED | N3 | Có chữ 靴 cấp N3, học dạng Kanji ở N3 |
| n5-0119 | 売り場 | うりば | quầy bán (trong một cửa hàng bách hóa) | N5 | KANJI_DEFERRED | N4 | Có chữ 売場 cấp N4, học dạng Kanji ở N4 |
| n5-0120 | 地下 | ちか | tầng hầm; dưới mặt đất | N5 | KANJI_DEFERRED | N4 | Có chữ 地 cấp N4, học dạng Kanji ở N4 |
| n5-0121 | 階 | かい | tầng thứ – | N5 | KANJI_DEFERRED | N2 | Có chữ 階 cấp N2, học dạng Kanji ở N2 |
| n5-0122 | 何階 | なんがい | tầng mấy | N5 | KANJI_DEFERRED | N2 | Có chữ 階 cấp N2, học dạng Kanji ở N2 |
| n5-0137 | 寝ます | ねます | ngủ | N5 | KANJI_DEFERRED | N3 | Có chữ 寝 cấp N3, học dạng Kanji ở N3 |
| n5-0138 | 働きます | はたらきます | làm việc | N5 | KANJI_DEFERRED | N3 | Có chữ 働 cấp N3, học dạng Kanji ở N3 |
| n5-0140 | 勉強します | べんきょうします | học tập | N5 | KANJI_DEFERRED | N4 | Có chữ 勉強 cấp N4, học dạng Kanji ở N4 |
| n5-0141 | 終わります | おわります | kết thúc | N5 | KANJI_DEFERRED | N4 | Có chữ 終 cấp N4, học dạng Kanji ở N4 |
| n5-0143 | 銀行 | ぎんこう | ngân hàng | N5 | KANJI_DEFERRED | N4 | Có chữ 銀 cấp N4, học dạng Kanji ở N4 |
| n5-0144 | 郵便局 | ゆうびんきょく | bưu điện | N5 | KANJI_DEFERRED | N2 | Có chữ 郵 cấp N2, học dạng Kanji ở N2 |
| n5-0145 | 図書館 | としょかん | thư viện | N5 | KANJI_DEFERRED | N4 | Có chữ 図館 cấp N4, học dạng Kanji ở N4 |
| n5-0146 | 美術館 | びじゅつかん | viện bảo tàng | N5 | KANJI_DEFERRED | N3 | Có chữ 美術 cấp N3, học dạng Kanji ở N3 |
| n5-0147 | 電話番号 | でんわばんごう | số điện thoại | N5 | KANJI_DEFERRED | N3 | Có chữ 番号 cấp N3, học dạng Kanji ở N3 |
| n5-0157 | 朝 | あさ | buổi sáng | N5 | KANJI_DEFERRED | N4 | Có chữ 朝 cấp N4, học dạng Kanji ở N4 |
| n5-0158 | 昼 | ひる | trưa | N5 | KANJI_DEFERRED | N4 | Có chữ 昼 cấp N4, học dạng Kanji ở N4 |
| n5-0159 | 晩 | ばん | buổi tối | N5 | KANJI_DEFERRED | N3 | Có chữ 晩 cấp N3, học dạng Kanji ở N3 |
| n5-0160 | 夜 | よる | ban đêm | N5 | KANJI_DEFERRED | N4 | Có chữ 夜 cấp N4, học dạng Kanji ở N4 |
| n5-0166 | 今朝 | けさ | sáng nay | N5 | KANJI_DEFERRED | N4 | Có chữ 朝 cấp N4, học dạng Kanji ở N4 |
| n5-0170 | 昼休み | ひるやすみ | nghỉ trưa | N5 | KANJI_DEFERRED | N4 | Có chữ 昼 cấp N4, học dạng Kanji ở N4 |
| n5-0171 | 毎朝 | まいあさ | mỗi sáng | N5 | KANJI_DEFERRED | N4 | Có chữ 朝 cấp N4, học dạng Kanji ở N4 |
| n5-0172 | 毎晩 | まいばん | mỗi tối | N5 | KANJI_DEFERRED | N3 | Có chữ 晩 cấp N3, học dạng Kanji ở N3 |
| n5-0916 | 月曜日 | げつようび | thứ hai | N5 | KANJI_DEFERRED | N4 | Có chữ 曜 cấp N4, học dạng Kanji ở N4 |
| n5-0917 | 火曜日 | かようび | thứ ba | N5 | KANJI_DEFERRED | N4 | Có chữ 曜 cấp N4, học dạng Kanji ở N4 |
| n5-0918 | 水曜日 | すいようび | thứ tư | N5 | KANJI_DEFERRED | N4 | Có chữ 曜 cấp N4, học dạng Kanji ở N4 |
| n5-0919 | 木曜日 | もくようび | thứ năm | N5 | KANJI_DEFERRED | N4 | Có chữ 曜 cấp N4, học dạng Kanji ở N4 |
| n5-0920 | 金曜日 | きんようび | thứ sáu | N5 | KANJI_DEFERRED | N4 | Có chữ 曜 cấp N4, học dạng Kanji ở N4 |
| n5-0921 | 土曜日 | どようび | thứ bảy | N5 | KANJI_DEFERRED | N4 | Có chữ 曜 cấp N4, học dạng Kanji ở N4 |
| n5-0922 | 日曜日 | にちようび | chủ nhật | N5 | KANJI_DEFERRED | N4 | Có chữ 曜 cấp N4, học dạng Kanji ở N4 |
| n5-0924 | 番号 | ばんごう | số | N5 | KANJI_DEFERRED | N3 | Có chữ 番号 cấp N3, học dạng Kanji ở N3 |
| n5-0148 | 何番 | なんばん | số mấy | N5 | KANJI_DEFERRED | N3 | Có chữ 番 cấp N3, học dạng Kanji ở N3 |
| n5-0928 | お願いします | おねがいします | xin vui lòng giúp đỡ | N5 | KANJI_DEFERRED | N3 | Có chữ 願 cấp N3, học dạng Kanji ở N3 |
| n5-0188 | 飛行機 | ひこうき | máy bay | N5 | KANJI_DEFERRED | N3 | Có chữ 飛機 cấp N3, học dạng Kanji ở N3 |
| n5-0189 | 船 | ふね | thuyền; tàu thủy | N5 | KANJI_DEFERRED | N3 | Có chữ 船 cấp N3, học dạng Kanji ở N3 |
| n5-0191 | 地下鉄 | ちかてつ | tàu điện ngầm | N5 | KANJI_DEFERRED | N2 | Có chữ 鉄 cấp N2, học dạng Kanji ở N2 |
| n5-0192 | 新幹線 | しんかんせん | tàu Shinkansen (tàu điện siêu tốc của Nhật) | N5 | KANJI_DEFERRED | N1 | Có chữ 幹 cấp N1, học dạng Kanji ở N1 |
| n5-0195 | 自転車 | じてんしゃ | xe đạp | N5 | KANJI_DEFERRED | N4 | Có chữ 転 cấp N4, học dạng Kanji ở N4 |
| n5-0198 | 友達 | ともだち | bạn; bạn bè | N5 | KANJI_DEFERRED | N3 | Có chữ 達 cấp N3, học dạng Kanji ở N3 |
| n5-0201 | 家族 | かぞく | gia đình | N5 | KANJI_DEFERRED | N4 | Có chữ 族 cấp N4, học dạng Kanji ở N4 |
| n5-0208 | 去年 | きょねん | năm ngoái | N5 | KANJI_DEFERRED | N4 | Có chữ 去 cấp N4, học dạng Kanji ở N4 |
| n5-0229 | 誕生日 | たんじょうび | sinh nhật | N5 | KANJI_DEFERRED | N1 | Có chữ 誕 cấp N1, học dạng Kanji ở N1 |
| n5-0230 | 普通 | ふつう | tàu thường (dừng cả ở các ga lẻ) | N5 | KANJI_DEFERRED | N2 | Có chữ 普 cấp N2, học dạng Kanji ở N2 |
| n5-0231 | 急行 | きゅうこう | tàu tốc hành | N5 | KANJI_DEFERRED | N4 | Có chữ 急 cấp N4, học dạng Kanji ở N4 |
| n5-0232 | 特急 | とっきゅう | tàu tốc hành đặc biệt | N5 | KANJI_DEFERRED | N4 | Có chữ 特急 cấp N4, học dạng Kanji ở N4 |
| n5-0181 | 番線 | ばんせん | sân ga số – | N5 | KANJI_DEFERRED | N2 | Có chữ 線 cấp N2, học dạng Kanji ở N2 |
| n5-0237 | 吸います | すいます | hút [thuốc lá] | N5 | KANJI_DEFERRED | N3 | Có chữ 吸 cấp N3, học dạng Kanji ở N3 |
| n5-0243 | 撮ります | とります | chụp [ảnh] | N5 | KANJI_DEFERRED | N1 | Có chữ 撮 cấp N1, học dạng Kanji ở N1 |
| n5-0247 | 朝ごはん | あさごはん | cơm sáng | N5 | KANJI_DEFERRED | N4 | Có chữ 朝 cấp N4, học dạng Kanji ở N4 |
| n5-0248 | 昼ごはん | ひるごはん | cơm trưa | N5 | KANJI_DEFERRED | N4 | Có chữ 昼 cấp N4, học dạng Kanji ở N4 |
| n5-0249 | 晩ごはん | ばんごはん | cơm tối | N5 | KANJI_DEFERRED | N3 | Có chữ 晩 cấp N3, học dạng Kanji ở N3 |
| n5-0251 | 卵 | たまご | trứng | N5 | KANJI_DEFERRED | N2 | Có chữ 卵 cấp N2, học dạng Kanji ở N2 |
| n5-0254 | 野菜 | やさい | rau | N5 | KANJI_DEFERRED | N2 | Có chữ 菜 cấp N2, học dạng Kanji ở N2 |
| n5-0255 | 果物 | くだもの | hoa quả; trái cây | N5 | KANJI_DEFERRED | N3 | Có chữ 果 cấp N3, học dạng Kanji ở N3 |
| n5-0258 | 紅茶 | こうちゃ | trà đen | N5 | KANJI_DEFERRED | N2 | Có chữ 紅 cấp N2, học dạng Kanji ở N2 |
| n5-0259 | 牛乳 | ぎゅうにゅう | sữa bò | N5 | KANJI_DEFERRED | N2 | Có chữ 乳 cấp N2, học dạng Kanji ở N2 |
| n5-0262 | お酒 | おさけ | rượu; rượu sake | N5 | KANJI_DEFERRED | N3 | Có chữ 酒 cấp N3, học dạng Kanji ở N3 |
| n5-0264 | 映画 | えいが | phim; điện ảnh | N5 | KANJI_DEFERRED | N4 | Có chữ 映画 cấp N4, học dạng Kanji ở N4 |
| n5-0265 | 手紙 | てがみ | thư | N5 | KANJI_DEFERRED | N4 | Có chữ 紙 cấp N4, học dạng Kanji ở N4 |
| n5-0267 | 写真 | しゃしん | ảnh | N5 | KANJI_DEFERRED | N4 | Có chữ 写真 cấp N4, học dạng Kanji ở N4 |
| n5-0270 | 庭 | にわ | vườn | N5 | KANJI_DEFERRED | N3 | Có chữ 庭 cấp N3, học dạng Kanji ở N3 |
| n5-0271 | 宿題 | しゅくだい | bài tập về nhà (~をします: làm bài tập) | N5 | KANJI_DEFERRED | N3 | Có chữ 宿 cấp N3, học dạng Kanji ở N3 |
| n5-0286 | 切ります | きります | cắt | N5 | KANJI_DEFERRED | N4 | Có chữ 切 cấp N4, học dạng Kanji ở N4 |
| n5-0887 | 送ります | おくります | đưa đi; đưa đến; tiễn | N5 | KANJI_DEFERRED | N4 | Có chữ 送 cấp N4, học dạng Kanji ở N4 |
| n5-0290 | 貸します | かします | cho mượn | N5 | KANJI_DEFERRED | N4 | Có chữ 貸 cấp N4, học dạng Kanji ở N4 |
| n5-0291 | 借ります | かります | mượn | N5 | KANJI_DEFERRED | N4 | Có chữ 借 cấp N4, học dạng Kanji ở N4 |
| n5-0594 | 教えます | おしえます | nói; cho biết | N5 | KANJI_DEFERRED | N4 | Có chữ 教 cấp N4, học dạng Kanji ở N4 |
| n5-0933 | 習います | ならいます | học (từ ai đó) | N5 | KANJI_DEFERRED | N4 | Có chữ 習 cấp N4, học dạng Kanji ở N4 |
| n5-0310 | 荷物 | にもつ | hàng hóa | N5 | KANJI_DEFERRED | N2 | Có chữ 荷 cấp N2, học dạng Kanji ở N2 |
| n5-0325 | 旅行 | りょこう | du lịch | N5 | KANJI_DEFERRED | N4 | Có chữ 旅 cấp N4, học dạng Kanji ở N4 |
| n5-0326 | お土産 | おみやげ | quà lưu niệm | N5 | KANJI_DEFERRED | N3 | Có chữ 産 cấp N3, học dạng Kanji ở N3 |
| n5-0331 | 静か | しずか | yên tĩnh | N5 | KANJI_DEFERRED | N3 | Có chữ 静 cấp N3, học dạng Kanji ở N3 |
| n5-0333 | 有名 | ゆうめい | nổi tiếng | N5 | KANJI_DEFERRED | N4 | Có chữ 有 cấp N4, học dạng Kanji ở N4 |
| n5-0334 | 親切 | しんせつ | tử tế | N5 | KANJI_DEFERRED | N4 | Có chữ 親切 cấp N4, học dạng Kanji ở N4 |
| n5-0336 | 暇 | ひま | rảnh rỗi | N5 | KANJI_DEFERRED | N1 | Có chữ 暇 cấp N1, học dạng Kanji ở N1 |
| n5-0338 | 便利 | べんり | tiện lợi | N5 | KANJI_DEFERRED | N3 | Có chữ 便利 cấp N3, học dạng Kanji ở N3 |
| n5-0345 | 悪い | わるい | không tốt; tệ | N5 | KANJI_DEFERRED | N4 | Có chữ 悪 cấp N4, học dạng Kanji ở N4 |
| n5-0346 | 熱い | あつい | nóng | N5 | KANJI_DEFERRED | N3 | Có chữ 熱 cấp N3, học dạng Kanji ở N3 |
| n5-0347 | 冷たい | つめたい | lạnh | N5 | KANJI_DEFERRED | N3 | Có chữ 冷 cấp N3, học dạng Kanji ở N3 |
| n5-0348 | 暑い | あつい | (trời) nóng (dùng cho thời tiết) | N5 | KANJI_DEFERRED | N4 | Có chữ 暑 cấp N4, học dạng Kanji ở N4 |
| n5-0349 | 寒い | さむい | (trời) lạnh (dùng cho thời tiết) | N5 | KANJI_DEFERRED | N3 | Có chữ 寒 cấp N3, học dạng Kanji ở N3 |
| n5-0350 | 難しい | むずかしい | khó | N5 | KANJI_DEFERRED | N3 | Có chữ 難 cấp N3, học dạng Kanji ở N3 |
| n5-0351 | 優しい | やさしい | dễ | N5 | KANJI_DEFERRED | N3 | Có chữ 優 cấp N3, học dạng Kanji ở N3 |
| n5-0356 | 低い | ひくい | thấp | N5 | KANJI_DEFERRED | N2 | Có chữ 低 cấp N2, học dạng Kanji ở N2 |
| n5-0337 | 忙しい | いそがしい | bận rộn | N5 | KANJI_DEFERRED | N3 | Có chữ 忙 cấp N3, học dạng Kanji ở N3 |
| n5-0359 | 楽しい | たのしい | vui vẻ | N5 | KANJI_DEFERRED | N4 | Có chữ 楽 cấp N4, học dạng Kanji ở N4 |
| n5-0361 | 黒い | くろい | đen | N5 | KANJI_DEFERRED | N4 | Có chữ 黒 cấp N4, học dạng Kanji ở N4 |
| n5-0362 | 赤い | あかい | đỏ | N5 | KANJI_DEFERRED | N4 | Có chữ 赤 cấp N4, học dạng Kanji ở N4 |
| n5-0363 | 青い | あおい | xanh | N5 | KANJI_DEFERRED | N4 | Có chữ 青 cấp N4, học dạng Kanji ở N4 |
| n5-0364 | 桜 | さくら | hoa anh đào | N5 | KANJI_DEFERRED | N1 | Có chữ 桜 cấp N1, học dạng Kanji ở N1 |
| n5-0368 | 所 | ところ | chỗ | N5 | KANJI_DEFERRED | N3 | Có chữ 所 cấp N3, học dạng Kanji ở N3 |
| n5-0370 | 勉強 | べんきょう | học tập (danh từ) | N5 | KANJI_DEFERRED | N4 | Có chữ 勉強 cấp N4, học dạng Kanji ở N4 |
| n5-0371 | 生活 | せいかつ | cuộc sống | N5 | KANJI_DEFERRED | N3 | Có chữ 活 cấp N3, học dạng Kanji ở N3 |
| n5-0379 | 嫌い | きらい | ghét; không thích | N5 | KANJI_DEFERRED | N1 | Có chữ 嫌 cấp N1, học dạng Kanji ở N1 |
| n5-0382 | 料理 | りょうり | món ăn; việc nấu ăn | N5 | KANJI_DEFERRED | N4 | Có chữ 料理 cấp N4, học dạng Kanji ở N4 |
| n5-0385 | 野球 | やきゅう | bóng chày (~をします:chơi bóng chày) | N5 | KANJI_DEFERRED | N3 | Có chữ 球 cấp N3, học dạng Kanji ở N3 |
| n5-0387 | 音楽 | おんがく | âm nhạc | N5 | KANJI_DEFERRED | N4 | Có chữ 音楽 cấp N4, học dạng Kanji ở N4 |
| n5-0388 | 歌 | うた | bài hát | N5 | KANJI_DEFERRED | N4 | Có chữ 歌 cấp N4, học dạng Kanji ở N4 |
| n5-0393 | 歌舞伎 | かぶき | kabuki (một loại ca kịch truyền thống của Nhật) | N5 | KANJI_DEFERRED | N1 | Có chữ 伎 cấp N1, học dạng Kanji ở N1 |
| n5-0394 | 絵 | え | tranh; hội họa | N5 | KANJI_DEFERRED | N3 | Có chữ 絵 cấp N3, học dạng Kanji ở N3 |
| n5-0396 | 漢字 | かんじ | chữ hán | N5 | KANJI_DEFERRED | N4 | Có chữ 漢 cấp N4, học dạng Kanji ở N4 |
| n5-0400 | 細かいお金 | こまかいおかね | tiền lẻ | N5 | KANJI_DEFERRED | N2 | Có chữ 細 cấp N2, học dạng Kanji ở N2 |
| n5-0403 | 用事 | ようじ | việc bận; công chuyện | N5 | KANJI_DEFERRED | N4 | Có chữ 用 cấp N4, học dạng Kanji ở N4 |
| n5-0404 | 約束 | やくそく | cuộc hẹn; lời hứa | N5 | KANJI_DEFERRED | N3 | Có chữ 約束 cấp N3, học dạng Kanji ở N3 |
| n5-0405 | ご主人 | ごしゅじん | chồng (dùng khi nói về chồng người khác) | N5 | KANJI_DEFERRED | N4 | Có chữ 主 cấp N4, học dạng Kanji ở N4 |
| n5-0406 | 夫 | おっと | chồng (dùng khi nói về chồng mình) | N5 | KANJI_DEFERRED | N3 | Có chữ 夫 cấp N3, học dạng Kanji ở N3 |
| n5-0947 | 主人 | しゅじん | chồng (chồng mình) | N5 | KANJI_DEFERRED | N4 | Có chữ 主 cấp N4, học dạng Kanji ở N4 |
| n5-0407 | 奥さん | おくさん | vợ (dùng khi nói về vợ người khác) | N5 | KANJI_DEFERRED | N2 | Có chữ 奥 cấp N2, học dạng Kanji ở N2 |
| n5-0408 | 妻 | つま | vợ (dùng khi nói về vợ mình) | N5 | KANJI_DEFERRED | N3 | Có chữ 妻 cấp N3, học dạng Kanji ở N3 |
| n5-0414 | 全然 | ぜんぜん | hoàn toàn ~ không | N5 | KANJI_DEFERRED | N3 | Có chữ 全然 cấp N3, học dạng Kanji ở N3 |
| n5-0415 | 早く | はやく | sớm; nhanh | N5 | KANJI_DEFERRED | N4 | Có chữ 早 cấp N4, học dạng Kanji ở N4 |
| n5-0431 | 猫 | ねこ | mèo | N5 | KANJI_DEFERRED | N3 | Có chữ 猫 cấp N3, học dạng Kanji ở N3 |
| n5-0435 | 電池 | でんち | pin | N5 | KANJI_DEFERRED | N2 | Có chữ 池 cấp N2, học dạng Kanji ở N2 |
| n5-0436 | 箱 | はこ | hộp | N5 | KANJI_DEFERRED | N3 | Có chữ 箱 cấp N3, học dạng Kanji ở N3 |
| n5-0438 | 冷蔵庫 | れいぞうこ | tủ lạnh | N5 | KANJI_DEFERRED | N2 | Có chữ 蔵庫 cấp N2, học dạng Kanji ở N2 |
| n5-0441 | 棚 | たな | giá sách | N5 | KANJI_DEFERRED | N1 | Có chữ 棚 cấp N1, học dạng Kanji ở N1 |
| n5-0443 | 窓 | まど | cửa sổ | N5 | KANJI_DEFERRED | N3 | Có chữ 窓 cấp N3, học dạng Kanji ở N3 |
| n5-0446 | 公園 | こうえん | công viên | N5 | KANJI_DEFERRED | N3 | Có chữ 園 cấp N3, học dạng Kanji ở N3 |
| n5-0447 | 喫茶店 | きっさてん | quán giải khát; quán cà-phê | N5 | KANJI_DEFERRED | N2 | Có chữ 喫 cấp N2, học dạng Kanji ở N2 |
| n5-0448 | 本屋 | ほんや | hiệu sách | N5 | KANJI_DEFERRED | N4 | Có chữ 屋 cấp N4, học dạng Kanji ở N4 |
| n5-0449 | 屋 | や | hiệu ~; cửa hàng ~; cửa hàng– | N5 | KANJI_DEFERRED | N4 | Có chữ 屋 cấp N4, học dạng Kanji ở N4 |
| n5-0450 | 乗り場 | のりば | bến xe; điểm lên xuống xe | N5 | KANJI_DEFERRED | N3 | Có chữ 乗 cấp N3, học dạng Kanji ở N3 |
| n5-0460 | 隣 | となり | bên cạnh | N5 | KANJI_DEFERRED | N1 | Có chữ 隣 cấp N1, học dạng Kanji ở N1 |
| n5-0461 | 近く | ちかく | gần đây; vùng gần | N5 | KANJI_DEFERRED | N4 | Có chữ 近 cấp N4, học dạng Kanji ở N4 |
| n5-0905 | 億 | おく | một trăm triệu | N5 | KANJI_DEFERRED | N2 | Có chữ 億 cấp N2, học dạng Kanji ở N2 |
| n5-0490 | 切手 | きって | tem | N5 | KANJI_DEFERRED | N4 | Có chữ 切 cấp N4, học dạng Kanji ở N4 |
| n5-0492 | 封筒 | ふうとう | phong bì | N5 | KANJI_DEFERRED | N2 | Có chữ 封筒 cấp N2, học dạng Kanji ở N2 |
| n5-0493 | 速達 | そくたつ | chuyển phát nhanh | N5 | KANJI_DEFERRED | N3 | Có chữ 速達 cấp N3, học dạng Kanji ở N3 |
| n5-0494 | 書留 | かきとめ | gửi bảo đảm | N5 | KANJI_DEFERRED | N3 | Có chữ 留 cấp N3, học dạng Kanji ở N3 |
| n5-0953 | 船便 | ふなびん | gửi đường biển | N5 | KANJI_DEFERRED | N3 | Có chữ 船便 cấp N3, học dạng Kanji ở N3 |
| n5-0954 | 両親 | りょうしん | bố mẹ | N5 | KANJI_DEFERRED | N3 | Có chữ 両 cấp N3, học dạng Kanji ở N3 |
| n5-0955 | 兄弟 | きょうだい | anh em | N5 | KANJI_DEFERRED | N4 | Có chữ 弟 cấp N4, học dạng Kanji ở N4 |
| n5-0958 | 姉 | あね | chị gái (của mình) | N5 | KANJI_DEFERRED | N4 | Có chữ 姉 cấp N4, học dạng Kanji ở N4 |
| n5-0959 | お姉さん | おねえさん | chị gái (người khác) | N5 | KANJI_DEFERRED | N4 | Có chữ 姉 cấp N4, học dạng Kanji ở N4 |
| n5-0960 | 弟 | おとうと | em trai (của mình) | N5 | KANJI_DEFERRED | N4 | Có chữ 弟 cấp N4, học dạng Kanji ở N4 |
| n5-0961 | 弟さん | おとうとさん | em trai (người khác) | N5 | KANJI_DEFERRED | N4 | Có chữ 弟 cấp N4, học dạng Kanji ở N4 |
| n5-0495 | 簡単 | かんたん | đơn giản; dễ | N5 | KANJI_DEFERRED | N2 | Có chữ 簡 cấp N2, học dạng Kanji ở N2 |
| n5-0496 | 近い | ちかい | gần | N5 | KANJI_DEFERRED | N4 | Có chữ 近 cấp N4, học dạng Kanji ở N4 |
| n5-0497 | 遠い | とおい | xa | N5 | KANJI_DEFERRED | N3 | Có chữ 遠 cấp N3, học dạng Kanji ở N3 |
| n5-0498 | 速い | はやい | nhanh; sớm | N5 | KANJI_DEFERRED | N3 | Có chữ 速 cấp N3, học dạng Kanji ở N3 |
| n5-0499 | 遅い | おそい | chậm; muộn | N5 | KANJI_DEFERRED | N3 | Có chữ 遅 cấp N3, học dạng Kanji ở N3 |
| n5-0502 | 温かい | あたたかい | ấm | N5 | KANJI_DEFERRED | N2 | Có chữ 温 cấp N2, học dạng Kanji ở N2 |
| n5-0503 | 涼しい | すずしい | mát | N5 | KANJI_DEFERRED | N2 | Có chữ 涼 cấp N2, học dạng Kanji ở N2 |
| n5-0504 | 甘い | あまい | ngọt | N5 | KANJI_DEFERRED | N2 | Có chữ 甘 cấp N2, học dạng Kanji ở N2 |
| n5-0505 | 辛い | からい | cay | N5 | KANJI_DEFERRED | N2 | Có chữ 辛 cấp N2, học dạng Kanji ở N2 |
| n5-0506 | 重い | おもい | nặng | N5 | KANJI_DEFERRED | N4 | Có chữ 重 cấp N4, học dạng Kanji ở N4 |
| n5-0507 | 軽い | かるい | nhẹ | N5 | KANJI_DEFERRED | N2 | Có chữ 軽 cấp N2, học dạng Kanji ở N2 |
| n5-0508 | 季節 | きせつ | mùa | N5 | KANJI_DEFERRED | N1 | Có chữ 節 cấp N1, học dạng Kanji ở N1 |
| n5-0509 | 春 | はる | mùa xuân | N5 | KANJI_DEFERRED | N4 | Có chữ 春 cấp N4, học dạng Kanji ở N4 |
| n5-0510 | 夏 | なつ | mùa hè | N5 | KANJI_DEFERRED | N4 | Có chữ 夏 cấp N4, học dạng Kanji ở N4 |
| n5-0511 | 秋 | あき | mùa thu | N5 | KANJI_DEFERRED | N4 | Có chữ 秋 cấp N4, học dạng Kanji ở N4 |
| n5-0515 | 雪 | ゆき | tuyết | N5 | KANJI_DEFERRED | N3 | Có chữ 雪 cấp N3, học dạng Kanji ở N3 |
| n5-0516 | 曇り | くもり | có mây | N5 | KANJI_DEFERRED | N2 | Có chữ 曇 cấp N2, học dạng Kanji ở N2 |
| n5-0518 | 空港 | くうこう | sân bay | N5 | KANJI_DEFERRED | N3 | Có chữ 港 cấp N3, học dạng Kanji ở N3 |
| n5-0520 | 世界 | せかい | thế giới | N5 | KANJI_DEFERRED | N4 | Có chữ 世界 cấp N4, học dạng Kanji ở N4 |
| n5-0522 | お祭り | おまつり | lễ hội | N5 | KANJI_DEFERRED | N2 | Có chữ 祭 cấp N2, học dạng Kanji ở N2 |
| n5-0523 | 試験 | しけん | kỳ thi; bài thi | N5 | KANJI_DEFERRED | N4 | Có chữ 試験 cấp N4, học dạng Kanji ở N4 |
| n5-0524 | すき焼き | すきやき | sukiyaki (món thịt bò nấu rau) | N5 | KANJI_DEFERRED | N2 | Có chữ 焼 cấp N2, học dạng Kanji ở N2 |
| n5-0525 | 刺身 | さしみ | sashimi (món gỏi cá sống) | N5 | KANJI_DEFERRED | N2 | Có chữ 刺 cấp N2, học dạng Kanji ở N2 |
| n5-0529 | 紅葉 | もみじ | lá đỏ | N5 | KANJI_DEFERRED | N2 | Có chữ 紅 cấp N2, học dạng Kanji ở N2 |
| n5-0530 | 初めて | はじめて | lần đầu tiên | N5 | KANJI_DEFERRED | N3 | Có chữ 初 cấp N3, học dạng Kanji ở N3 |
| n5-0540 | 遊びます | あそびます | chơi | N5 | KANJI_DEFERRED | N3 | Có chữ 遊 cấp N3, học dạng Kanji ở N3 |
| n5-0541 | 泳ぎます | およぎます | bơi | N5 | KANJI_DEFERRED | N3 | Có chữ 泳 cấp N3, học dạng Kanji ở N3 |
| n5-0542 | 迎えます | むかえます | đón | N5 | KANJI_DEFERRED | N3 | Có chữ 迎 cấp N3, học dạng Kanji ở N3 |
| n5-0543 | 疲れます | つかれます | mệt | N5 | KANJI_DEFERRED | N3 | Có chữ 疲 cấp N3, học dạng Kanji ở N3 |
| n5-0547 | 結婚します | けっこんします | kết hôn; lập gia đình; cưới | N5 | KANJI_DEFERRED | N1 | Có chữ 結 cấp N1, học dạng Kanji ở N1 |
| n5-0550 | 散歩します | さんぽします | đi dạo [ở công viên] | N5 | KANJI_DEFERRED | N3 | Có chữ 散 cấp N3, học dạng Kanji ở N3 |
| n5-0551 | 大変 | たいへん | vất vả; khó khăn; khổ | N5 | KANJI_DEFERRED | N3 | Có chữ 変 cấp N3, học dạng Kanji ở N3 |
| n5-0552 | 欲しい | ほしい | muốn có | N5 | KANJI_DEFERRED | N3 | Có chữ 欲 cấp N3, học dạng Kanji ở N3 |
| n5-0553 | 寂しい | さびしい | buồn; cô đơn | N5 | KANJI_DEFERRED | N1 | Có chữ 寂 cấp N1, học dạng Kanji ở N1 |
| n5-0554 | 広い | ひろい | rộng | N5 | KANJI_DEFERRED | N4 | Có chữ 広 cấp N4, học dạng Kanji ở N4 |
| n5-0555 | 狭い | せまい | chật; hẹp | N5 | KANJI_DEFERRED | N1 | Có chữ 狭 cấp N1, học dạng Kanji ở N1 |
| n5-0556 | 市役所 | しやくしょ | văn phòng hành chính quận; thành phố | N5 | KANJI_DEFERRED | N3 | Có chữ 市役所 cấp N3, học dạng Kanji ở N3 |
| n5-0559 | 経済 | けいざい | kinh tế | N5 | KANJI_DEFERRED | N3 | Có chữ 経済 cấp N3, học dạng Kanji ở N3 |
| n5-0560 | 美術 | びじゅつ | mỹ thuật | N5 | KANJI_DEFERRED | N3 | Có chữ 美術 cấp N3, học dạng Kanji ở N3 |
| n5-0561 | 釣り | つり | việc câu cá (~をします:câu cá) | N5 | KANJI_DEFERRED | N1 | Có chữ 釣 cấp N1, học dạng Kanji ở N1 |
| n5-0563 | 会議 | かいぎ | họp; cuộc họp (~をします: họp; tổ chức cuộc họp) | N5 | KANJI_DEFERRED | N3 | Có chữ 議 cấp N3, học dạng Kanji ở N3 |
| n5-0564 | 登録 | とうろく | việc đăng ký (~をします:đăng ký) | N5 | KANJI_DEFERRED | N2 | Có chữ 録 cấp N2, học dạng Kanji ở N2 |
| n5-0565 | 週末 | しゅうまつ | cuối tuần | N5 | KANJI_DEFERRED | N3 | Có chữ 末 cấp N3, học dạng Kanji ở N3 |
| n5-0579 | 別々に | べつべつに | để riêng ra | N5 | KANJI_DEFERRED | N4 | Có chữ 別別 cấp N4, học dạng Kanji ở N4 |
| n5-0581 | 消します | けします | tắt (điện; máy điều hòa) | N5 | KANJI_DEFERRED | N3 | Có chữ 消 cấp N3, học dạng Kanji ở N3 |
| n5-0582 | 開けます | あけます | mở (cửa; cửa sổ) | N5 | KANJI_DEFERRED | N4 | Có chữ 開 cấp N4, học dạng Kanji ở N4 |
| n5-0583 | 閉めます | しめます | đóng (cửa; cửa sổ) | N5 | KANJI_DEFERRED | N3 | Có chữ 閉 cấp N3, học dạng Kanji ở N3 |
| n5-0584 | 急ぎます | いそぎます | vội; gấp | N5 | KANJI_DEFERRED | N4 | Có chữ 急 cấp N4, học dạng Kanji ở N4 |
| n5-0585 | 待ちます | まちます | đợi; chờ | N5 | KANJI_DEFERRED | N4 | Có chữ 待 cấp N4, học dạng Kanji ở N4 |
| n5-0586 | 止めます | とめます | dừng (băng; ô tô); đỗ (ô tô) | N5 | KANJI_DEFERRED | N4 | Có chữ 止 cấp N4, học dạng Kanji ở N4 |
| n5-0587 | 曲がります | まがります | rẽ; quẹo [phải] | N5 | KANJI_DEFERRED | N3 | Có chữ 曲 cấp N3, học dạng Kanji ở N3 |
| n5-0588 | 持ちます | もちます | mang; cầm | N5 | KANJI_DEFERRED | N4 | Có chữ 持 cấp N4, học dạng Kanji ở N4 |
| n5-0589 | 取ります | とります | lấy (muối); thêm (tuổi) | N5 | KANJI_DEFERRED | N3 | Có chữ 取 cấp N3, học dạng Kanji ở N3 |
| n5-0590 | 手伝います | てつだいます | giúp (làm việc) | N5 | KANJI_DEFERRED | N3 | Có chữ 伝 cấp N3, học dạng Kanji ở N3 |
| n5-0591 | 呼びます | よびます | gọi (taxi; tên) | N5 | KANJI_DEFERRED | N3 | Có chữ 呼 cấp N3, học dạng Kanji ở N3 |
| n5-0595 | 始めます | はじめます | bắt đầu | N5 | KANJI_DEFERRED | N4 | Có chữ 始 cấp N4, học dạng Kanji ở N4 |
| n5-0596 | 降ります | ふります | rơi [mưa; tuyết~] | N5 | KANJI_DEFERRED | N3 | Có chữ 降 cấp N3, học dạng Kanji ở N3 |
| n5-0601 | 住所 | じゅうしょ | địa chỉ | N5 | KANJI_DEFERRED | N3 | Có chữ 所 cấp N3, học dạng Kanji ở N3 |
| n5-0602 | 地図 | ちず | bản đồ | N5 | KANJI_DEFERRED | N4 | Có chữ 地図 cấp N4, học dạng Kanji ở N4 |
| n5-0603 | 塩 | しお | muối | N5 | KANJI_DEFERRED | N2 | Có chữ 塩 cấp N2, học dạng Kanji ở N2 |
| n5-0604 | 砂糖 | さとう | đường ăn | N5 | KANJI_DEFERRED | N1 | Có chữ 糖 cấp N1, học dạng Kanji ở N1 |
| n5-0615 | お釣り | おつり | tiền thối lại | N5 | KANJI_DEFERRED | N1 | Có chữ 釣 cấp N1, học dạng Kanji ở N1 |
| n5-0618 | 座ります | すわります | ngồi | N5 | KANJI_DEFERRED | N3 | Có chữ 座 cấp N3, học dạng Kanji ở N3 |
| n5-0619 | 使います | つかいます | dùng; sử dụng | N5 | KANJI_DEFERRED | N4 | Có chữ 使 cấp N4, học dạng Kanji ở N4 |
| n5-0620 | 置きます | おきます | đặt; để | N5 | KANJI_DEFERRED | N3 | Có chữ 置 cấp N3, học dạng Kanji ở N3 |
| n5-0621 | 作ります | つくります | làm; chế tạo; sản xuất | N5 | KANJI_DEFERRED | N4 | Có chữ 作 cấp N4, học dạng Kanji ở N4 |
| n5-0622 | 売ります | うります | bán | N5 | KANJI_DEFERRED | N4 | Có chữ 売 cấp N4, học dạng Kanji ở N4 |
| n5-0623 | 知ります | しります | biết được | N5 | KANJI_DEFERRED | N4 | Có chữ 知 cấp N4, học dạng Kanji ở N4 |
| n5-0624 | 住みます | すみます | sống; ở | N5 | KANJI_DEFERRED | N4 | Có chữ 住 cấp N4, học dạng Kanji ở N4 |
| n5-0625 | 研究します | けんきゅうします | nghiên cứu | N5 | KANJI_DEFERRED | N4 | Có chữ 研究 cấp N4, học dạng Kanji ở N4 |
| n5-0628 | 資料 | しりょう | tài liệu; tư liệu | N5 | KANJI_DEFERRED | N3 | Có chữ 資 cấp N3, học dạng Kanji ở N3 |
| n5-0630 | 時刻表 | じこくひょう | bảng giờ tàu chạy | N5 | KANJI_DEFERRED | N3 | Có chữ 刻表 cấp N3, học dạng Kanji ở N3 |
| n5-0631 | 服 | ふく | quần áo | N5 | KANJI_DEFERRED | N4 | Có chữ 服 cấp N4, học dạng Kanji ở N4 |
| n5-0632 | 製品 | せいひん | sản phẩm | N5 | KANJI_DEFERRED | N1 | Có chữ 製 cấp N1, học dạng Kanji ở N1 |
| n5-0634 | 専門 | せんもん | chuyên môn | N5 | KANJI_DEFERRED | N2 | Có chữ 専 cấp N2, học dạng Kanji ở N2 |
| n5-0635 | 歯医者 | はいしゃ | nha sĩ | N5 | KANJI_DEFERRED | N3 | Có chữ 歯 cấp N3, học dạng Kanji ở N3 |
| n5-0636 | 床屋 | とこや | hiệu cắt tóc | N5 | KANJI_DEFERRED | N2 | Có chữ 床 cấp N2, học dạng Kanji ở N2 |
| n5-0638 | 独身 | どくしん | độc thân | N5 | KANJI_DEFERRED | N1 | Có chữ 独 cấp N1, học dạng Kanji ở N1 |
| n5-0639 | 特に | とくに | đặc biệt | N5 | KANJI_DEFERRED | N4 | Có chữ 特 cấp N4, học dạng Kanji ở N4 |
| n5-0640 | 思い出します | おもいだします | nhớ lại; hồi tưởng | N5 | KANJI_DEFERRED | N4 | Có chữ 思 cấp N4, học dạng Kanji ở N4 |
| n5-0641 | ご家族 | ごかぞく | gia đình (dùng cho người khác) | N5 | KANJI_DEFERRED | N4 | Có chữ 族 cấp N4, học dạng Kanji ở N4 |
| n5-0644 | 乗ります | のります | đi; lên [tàu] | N5 | KANJI_DEFERRED | N3 | Có chữ 乗 cấp N3, học dạng Kanji ở N3 |
| n5-0645 | 降ります | おります | xuống [tàu] | N5 | KANJI_DEFERRED | N3 | Có chữ 降 cấp N3, học dạng Kanji ở N3 |
| n5-0646 | 乗り換えます | のりかえます | chuyển; đổi (tàu) | N5 | KANJI_DEFERRED | N2 | Có chữ 換 cấp N2, học dạng Kanji ở N2 |
| n5-0647 | 浴びます | あびます | tắm [vòi hoa sen] | N5 | KANJI_DEFERRED | N2 | Có chữ 浴 cấp N2, học dạng Kanji ở N2 |
| n5-0650 | 押します | おします | bấm; ấn (nút) | N5 | KANJI_DEFERRED | N3 | Có chữ 押 cấp N3, học dạng Kanji ở N3 |
| n5-0651 | 若い | わかい | trẻ | N5 | KANJI_DEFERRED | N3 | Có chữ 若 cấp N3, học dạng Kanji ở N3 |
| n5-0653 | 短い | みじかい | ngắn | N5 | KANJI_DEFERRED | N2 | Có chữ 短 cấp N2, học dạng Kanji ở N2 |
| n5-0656 | 背が高い | せがたかい | cao (dùng cho người) | N5 | KANJI_DEFERRED | N3 | Có chữ 背 cấp N3, học dạng Kanji ở N3 |
| n5-0658 | 体 | からだ | người; cơ thể | N5 | KANJI_DEFERRED | N4 | Có chữ 体 cấp N4, học dạng Kanji ở N4 |
| n5-0660 | 髪 | かみ | tóc | N5 | KANJI_DEFERRED | N3 | Có chữ 髪 cấp N3, học dạng Kanji ở N3 |
| n5-0661 | 顔 | かお | mặt | N5 | KANJI_DEFERRED | N3 | Có chữ 顔 cấp N3, học dạng Kanji ở N3 |
| n5-0664 | 歯 | は | răng | N5 | KANJI_DEFERRED | N3 | Có chữ 歯 cấp N3, học dạng Kanji ở N3 |
| n5-0670 | 緑 | みどり | màu xanh lá cây | N5 | KANJI_DEFERRED | N2 | Có chữ 緑 cấp N2, học dạng Kanji ở N2 |
| n5-0672 | 神社 | じんじゃ | đền thờ đạo thần | N5 | KANJI_DEFERRED | N3 | Có chữ 神 cấp N3, học dạng Kanji ở N3 |
| n5-0674 | 一番 | いちばん | số―; số- | N5 | KANJI_DEFERRED | N3 | Có chữ 番 cấp N3, học dạng Kanji ở N3 |
| n5-0680 | 暗証番号 | あんしょうばんごう | mã số bí mật (mật khẩu) | N5 | KANJI_DEFERRED | N1 | Có chữ 証 cấp N1, học dạng Kanji ở N1 |
| n5-0681 | 次に | つぎに | kế đến; sau đó | N5 | KANJI_DEFERRED | N3 | Có chữ 次 cấp N3, học dạng Kanji ở N3 |
| n5-0682 | 確認 | かくにん | sự xác nhận; sự kiểm tra (~します:xác nhận) | N5 | KANJI_DEFERRED | N3 | Có chữ 確認 cấp N3, học dạng Kanji ở N3 |
| n5-0683 | 金額 | きんがく | số tiền; khoản tiền | N5 | KANJI_DEFERRED | N2 | Có chữ 額 cấp N2, học dạng Kanji ở N2 |
| n5-0687 | 覚えます | おぼえます | nhớ | N5 | KANJI_DEFERRED | N3 | Có chữ 覚 cấp N3, học dạng Kanji ở N3 |
| n5-0688 | 忘れます | わすれます | quên | N5 | KANJI_DEFERRED | N3 | Có chữ 忘 cấp N3, học dạng Kanji ở N3 |
| n5-0690 | 払います | はらいます | trả tiền | N5 | KANJI_DEFERRED | N3 | Có chữ 払 cấp N3, học dạng Kanji ở N3 |
| n5-0691 | 返します | かえします | trả lại | N5 | KANJI_DEFERRED | N3 | Có chữ 返 cấp N3, học dạng Kanji ở N3 |
| n5-0693 | 脱ぎます | ぬぎます | cởi (quần áo; giầy) | N5 | KANJI_DEFERRED | N1 | Có chữ 脱 cấp N1, học dạng Kanji ở N1 |
| n5-0694 | 持って行きます | もっていきます | mang đi | N5 | KANJI_DEFERRED | N4 | Có chữ 持 cấp N4, học dạng Kanji ở N4 |
| n5-0696 | 心配します | しんぱいします | lo lắng | N5 | KANJI_DEFERRED | N3 | Có chữ 配 cấp N3, học dạng Kanji ở N3 |
| n5-0697 | 残業します | ざんぎょうします | làm thêm giờ | N5 | KANJI_DEFERRED | N3 | Có chữ 残 cấp N3, học dạng Kanji ở N3 |
| n5-0698 | 出張します | しゅっちょうします | đi công tác | N5 | KANJI_DEFERRED | N1 | Có chữ 張 cấp N1, học dạng Kanji ở N1 |
| n5-0699 | 大切 | たいせつ | quan trọng | N5 | KANJI_DEFERRED | N4 | Có chữ 切 cấp N4, học dạng Kanji ở N4 |
| n5-0700 | 大丈夫 | だいじょうぶ | không sao; không có vấn đề gì | N5 | KANJI_DEFERRED | N1 | Có chữ 丈 cấp N1, học dạng Kanji ở N1 |
| n5-0701 | 危ない | あぶない | nguy hiểm | N5 | KANJI_DEFERRED | N3 | Có chữ 危 cấp N3, học dạng Kanji ở N3 |
| n5-0702 | 問題 | もんだい | vấn đề | N5 | KANJI_DEFERRED | N4 | Có chữ 問題 cấp N4, học dạng Kanji ở N4 |
| n5-0703 | 答え | こたえ | câu trả lời | N5 | KANJI_DEFERRED | N4 | Có chữ 答 cấp N4, học dạng Kanji ở N4 |
| n5-0704 | 禁煙 | きんえん | cấm hút thuốc | N5 | KANJI_DEFERRED | N2 | Có chữ 禁 cấp N2, học dạng Kanji ở N2 |
| n5-0705 | 健康保険証 | けんこうほけんしょう | thẻ bảo hiềm (y tế) | N5 | KANJI_DEFERRED | N1 | Có chữ 健康保証 cấp N1, học dạng Kanji ở N1 |
| n5-0706 | 風 | かぜ | cảm; cúm | N5 | KANJI_DEFERRED | N4 | Có chữ 風 cấp N4, học dạng Kanji ở N4 |
| n5-0707 | 熱 | ねつ | sốt | N5 | KANJI_DEFERRED | N3 | Có chữ 熱 cấp N3, học dạng Kanji ở N3 |
| n5-0709 | 薬 | くすり | thuốc | N5 | KANJI_DEFERRED | N3 | Có chữ 薬 cấp N3, học dạng Kanji ở N3 |
| n5-0711 | 上着 | うわぎ | áo khoác ngoài | N5 | KANJI_DEFERRED | N4 | Có chữ 着 cấp N4, học dạng Kanji ở N4 |
| n5-0712 | 下着 | したぎ | quần áo lót | N5 | KANJI_DEFERRED | N4 | Có chữ 着 cấp N4, học dạng Kanji ở N4 |
| n5-0719 | 洗います | あらいます | rửa | N5 | KANJI_DEFERRED | N3 | Có chữ 洗 cấp N3, học dạng Kanji ở N3 |
| n5-0720 | 弾きます | ひきます | chơi (chơi 1 loại nhạc cụ) | N5 | KANJI_DEFERRED | N1 | Có chữ 弾 cấp N1, học dạng Kanji ở N1 |
| n5-0721 | 歌います | うたいます | hát | N5 | KANJI_DEFERRED | N4 | Có chữ 歌 cấp N4, học dạng Kanji ở N4 |
| n5-0722 | 集めます | あつめます | sưu tập | N5 | KANJI_DEFERRED | N4 | Có chữ 集 cấp N4, học dạng Kanji ở N4 |
| n5-0723 | 捨てます | すてます | vứt | N5 | KANJI_DEFERRED | N2 | Có chữ 捨 cấp N2, học dạng Kanji ở N2 |
| n5-0725 | 運転します | うんてんします | lái xe | N5 | KANJI_DEFERRED | N4 | Có chữ 運転 cấp N4, học dạng Kanji ở N4 |
| n5-0726 | 予約します | よやくします | đặt chỗ trước | N5 | KANJI_DEFERRED | N3 | Có chữ 予約 cấp N3, học dạng Kanji ở N3 |
| n5-0728 | 国際 | こくさい | quốc tế | N5 | KANJI_DEFERRED | N3 | Có chữ 際 cấp N3, học dạng Kanji ở N3 |
| n5-0729 | 現金 | げんきん | tiền mặt | N5 | KANJI_DEFERRED | N3 | Có chữ 現 cấp N3, học dạng Kanji ở N3 |
| n5-0730 | 趣味 | しゅみ | sở thích | N5 | KANJI_DEFERRED | N1 | Có chữ 趣 cấp N1, học dạng Kanji ở N1 |
| n5-0731 | 日記 | にっき | nhật kí | N5 | KANJI_DEFERRED | N3 | Có chữ 記 cấp N3, học dạng Kanji ở N3 |
| n5-0732 | 祈り | いのり | cầu nguyện | N5 | KANJI_DEFERRED | N2 | Có chữ 祈 cấp N2, học dạng Kanji ở N2 |
| n5-0733 | 課長 | かちょう | tổ trưởng | N5 | KANJI_DEFERRED | N2 | Có chữ 課 cấp N2, học dạng Kanji ở N2 |
| n5-0734 | 部長 | ぶちょう | trưởng phòng | N5 | KANJI_DEFERRED | N3 | Có chữ 部 cấp N3, học dạng Kanji ở N3 |
| n5-0736 | 動物 | どうぶつ | động vật | N5 | KANJI_DEFERRED | N4 | Có chữ 動 cấp N4, học dạng Kanji ở N4 |
| n5-0742 | 牧場 | ぼくじょう | trang trại | N5 | KANJI_DEFERRED | N1 | Có chữ 牧 cấp N1, học dạng Kanji ở N1 |
| n5-0745 | 登ります | のぼります | leo (núi) | N5 | KANJI_DEFERRED | N3 | Có chữ 登 cấp N3, học dạng Kanji ở N3 |
| n5-0746 | 練習します | れんしゅうします | luyện tập; thực hành | N5 | KANJI_DEFERRED | N2 | Có chữ 練 cấp N2, học dạng Kanji ở N2 |
| n5-0747 | 掃除します | そうじします | dọn dẹp | N5 | KANJI_DEFERRED | N2 | Có chữ 掃 cấp N2, học dạng Kanji ở N2 |
| n5-0748 | 洗濯します | せんたくします | giặt giũ | N5 | KANJI_DEFERRED | N2 | Có chữ 濯 cấp N2, học dạng Kanji ở N2 |
| n5-0750 | 泊まります | とまります | trọ | N5 | KANJI_DEFERRED | N2 | Có chữ 泊 cấp N2, học dạng Kanji ở N2 |
| n5-0751 | 眠い | ねむい | buồn ngủ | N5 | KANJI_DEFERRED | N3 | Có chữ 眠 cấp N3, học dạng Kanji ở N3 |
| n5-0752 | 強い | つよい | mạnh | N5 | KANJI_DEFERRED | N4 | Có chữ 強 cấp N4, học dạng Kanji ở N4 |
| n5-0753 | 弱い | よわい | yếu | N5 | KANJI_DEFERRED | N2 | Có chữ 弱 cấp N2, học dạng Kanji ở N2 |
| n5-0754 | 調子 | ちょうし | tình trạng; trạng thái | N5 | KANJI_DEFERRED | N3 | Có chữ 調 cấp N3, học dạng Kanji ở N3 |
| n5-0755 | 調子が悪い | ちょうしがわるい | tình trạng xấu | N5 | KANJI_DEFERRED | N3 | Có chữ 調 cấp N3, học dạng Kanji ở N3 |
| n5-0756 | 調子がいい | ちょうしがいい | tình trạng tốt | N5 | KANJI_DEFERRED | N3 | Có chữ 調 cấp N3, học dạng Kanji ở N3 |
| n5-0757 | 相撲 | すもう | vật sumo | N5 | KANJI_DEFERRED | N1 | Có chữ 撲 cấp N1, học dạng Kanji ở N1 |
| n5-0763 | 一度 | いちど | một lần | N5 | KANJI_DEFERRED | N4 | Có chữ 度 cấp N4, học dạng Kanji ở N4 |
| n5-0764 | 一度も | いちども | chưa lần nào | N5 | KANJI_DEFERRED | N4 | Có chữ 度 cấp N4, học dạng Kanji ở N4 |
| n5-0766 | 乾杯 | かんぱい | nâng cốc | N5 | KANJI_DEFERRED | N2 | Có chữ 乾 cấp N2, học dạng Kanji ở N2 |
| n5-0767 | 実は | じつは | sự tình là | N5 | KANJI_DEFERRED | N3 | Có chữ 実 cấp N3, học dạng Kanji ở N3 |
| n5-0771 | 無理 | むり | quá sức | N5 | KANJI_DEFERRED | N3 | Có chữ 無 cấp N3, học dạng Kanji ở N3 |
| n5-0772 | 体にいい | からだにいい | tốt cho sức khỏe | N5 | KANJI_DEFERRED | N4 | Có chữ 体 cấp N4, học dạng Kanji ở N4 |
| n5-0775 | 調べます | しらべます | tìm hiểu; điều tra | N5 | KANJI_DEFERRED | N3 | Có chữ 調 cấp N3, học dạng Kanji ở N3 |
| n5-0776 | 直します | なおします | sửa; chữa | N5 | KANJI_DEFERRED | N3 | Có chữ 直 cấp N3, học dạng Kanji ở N3 |
| n5-0777 | 修理します | しゅうりします | sửa chữa; tu sữa | N5 | KANJI_DEFERRED | N1 | Có chữ 修 cấp N1, học dạng Kanji ở N1 |
| n5-0779 | 僕 | ぼく | tớ | N5 | KANJI_DEFERRED | N1 | Có chữ 僕 cấp N1, học dạng Kanji ở N1 |
| n5-0785 | 言葉 | ことば | từ; tiếng | N5 | KANJI_DEFERRED | N3 | Có chữ 葉 cấp N3, học dạng Kanji ở N3 |
| n5-0786 | 物価 | ぶっか | giá cả; mức giá; vật giá | N5 | KANJI_DEFERRED | N1 | Có chữ 価 cấp N1, học dạng Kanji ở N1 |
| n5-0787 | 着物 | きもの | kimono (trang phục truyền thống của Nhật Bản) | N5 | KANJI_DEFERRED | N4 | Có chữ 着 cấp N4, học dạng Kanji ở N4 |
| n5-0789 | 始め | はじめ | lúc đầu | N5 | KANJI_DEFERRED | N4 | Có chữ 始 cấp N4, học dạng Kanji ở N4 |
| n5-0790 | 終わり | おわり | sự kết thúc | N5 | KANJI_DEFERRED | N4 | Có chữ 終 cấp N4, học dạng Kanji ở N4 |
| n5-0803 | 思います | おもいます | nghĩ | N5 | KANJI_DEFERRED | N4 | Có chữ 思 cấp N4, học dạng Kanji ở N4 |
| n5-0806 | 勝ちます | かちます | thắng | N5 | KANJI_DEFERRED | N3 | Có chữ 勝 cấp N3, học dạng Kanji ở N3 |
| n5-0807 | 負けます | まけます | thua | N5 | KANJI_DEFERRED | N3 | Có chữ 負 cấp N3, học dạng Kanji ở N3 |
| n5-0808 | 役に立ちます | やくにたちます | giúp ích | N5 | KANJI_DEFERRED | N3 | Có chữ 役 cấp N3, học dạng Kanji ở N3 |
| n5-0810 | 不便 | ふべん | bất tiện | N5 | KANJI_DEFERRED | N3 | Có chữ 便 cấp N3, học dạng Kanji ở N3 |
| n5-0813 | 首相 | しゅしょう | thủ tướng | N5 | KANJI_DEFERRED | N3 | Có chữ 首相 cấp N3, học dạng Kanji ở N3 |
| n5-0814 | 大統領 | だいとうりょう | tổng thống | N5 | KANJI_DEFERRED | N1 | Có chữ 統 cấp N1, học dạng Kanji ở N1 |
| n5-0815 | 政治 | せいじ | chính trị | N5 | KANJI_DEFERRED | N3 | Có chữ 政治 cấp N3, học dạng Kanji ở N3 |
| n5-0818 | 試合 | しあい | trận đấu | N5 | KANJI_DEFERRED | N3 | Có chữ 合 cấp N3, học dạng Kanji ở N3 |
| n5-0820 | 意見 | いけん | ý kiến | N5 | KANJI_DEFERRED | N4 | Có chữ 意 cấp N4, học dạng Kanji ở N4 |
| n5-0824 | 交通 | こうつう | giao thông | N5 | KANJI_DEFERRED | N3 | Có chữ 交 cấp N3, học dạng Kanji ở N3 |
| n5-0826 | 最近 | さいきん | gần đây | N5 | KANJI_DEFERRED | N3 | Có chữ 最 cấp N3, học dạng Kanji ở N3 |
| n5-0829 | 本当に | ほんとうに | thật sự | N5 | KANJI_DEFERRED | N3 | Có chữ 当 cấp N3, học dạng Kanji ở N3 |
| n5-0837 | 着ます | きます | mặc (áo sơ mi; ..) | N5 | KANJI_DEFERRED | N4 | Có chữ 着 cấp N4, học dạng Kanji ở N4 |
| n5-0845 | 帽子 | ぼうし | nón; mũ | N5 | KANJI_DEFERRED | N2 | Có chữ 帽 cấp N2, học dạng Kanji ở N2 |
| n5-0848 | 家賃 | やちん | tiền nhà | N5 | KANJI_DEFERRED | N1 | Có chữ 賃 cấp N1, học dạng Kanji ở N1 |
| n5-0852 | 押し入れ | おしいれ | chỗ để chăn gối trong phòng kiểu Nhật | N5 | KANJI_DEFERRED | N3 | Có chữ 押 cấp N3, học dạng Kanji ở N3 |
| n5-0853 | 布団 | ふとん | chăn; đệm | N5 | KANJI_DEFERRED | N2 | Có chữ 布団 cấp N2, học dạng Kanji ở N2 |
| n5-0856 | 万里の長城 | ばんりのちょうじょう | Vạn lý trường thành | N5 | KANJI_DEFERRED | N1 | Có chữ 里 cấp N1, học dạng Kanji ở N1 |
| n5-0864 | 引きます | ひきます | kéo | N5 | KANJI_DEFERRED | N3 | Có chữ 引 cấp N3, học dạng Kanji ở N3 |
| n5-0865 | 変えます | かえます | đổi | N5 | KANJI_DEFERRED | N3 | Có chữ 変 cấp N3, học dạng Kanji ở N3 |
| n5-0866 | 触ります | さわります | sờ; chạm vào | N5 | KANJI_DEFERRED | N2 | Có chữ 触 cấp N2, học dạng Kanji ở N2 |
| n5-0867 | 動きます | うごきます | chuyển động; chạy | N5 | KANJI_DEFERRED | N4 | Có chữ 動 cấp N4, học dạng Kanji ở N4 |
| n5-0868 | 歩きます | あるきます | đi bộ (trên đường) | N5 | KANJI_DEFERRED | N4 | Có chữ 歩 cấp N4, học dạng Kanji ở N4 |
| n5-0869 | 渡ります | わたります | qua; đi qua (cầu) | N5 | KANJI_DEFERRED | N3 | Có chữ 渡 cấp N3, học dạng Kanji ở N3 |
| n5-0870 | 気を付けます | きをつけます | chú ý; cẩn thận | N5 | KANJI_DEFERRED | N3 | Có chữ 付 cấp N3, học dạng Kanji ở N3 |
| n5-0862 | 引越しします | ひっこしします | chuyển nhà | N5 | KANJI_DEFERRED | N3 | Có chữ 引越 cấp N3, học dạng Kanji ở N3 |
| n5-0871 | 電気屋 | でんきや | cửa hàng đồ điện | N5 | KANJI_DEFERRED | N4 | Có chữ 屋 cấp N4, học dạng Kanji ở N4 |
| n5-0872 | 故障 | こしょう | hỏng | N5 | KANJI_DEFERRED | N1 | Có chữ 故障 cấp N1, học dạng Kanji ở N1 |
| n5-0874 | 音 | おと | âm thanh | N5 | KANJI_DEFERRED | N4 | Có chữ 音 cấp N4, học dạng Kanji ở N4 |
| n5-0875 | 機械 | きかい | máy móc | N5 | KANJI_DEFERRED | N2 | Có chữ 械 cấp N2, học dạng Kanji ở N2 |
| n5-0860 | 交差点 | こうさてん | ngã tư | N5 | KANJI_DEFERRED | N3 | Có chữ 交差点 cấp N3, học dạng Kanji ở N3 |
| n5-0861 | 信号 | しんごう | đèn tín hiệu | N5 | KANJI_DEFERRED | N3 | Có chữ 信号 cấp N3, học dạng Kanji ở N3 |
| n5-0877 | 角 | かど | góc | N5 | KANJI_DEFERRED | N2 | Có chữ 角 cấp N2, học dạng Kanji ở N2 |
| n5-0878 | 橋 | はし | cầu | N5 | KANJI_DEFERRED | N2 | Có chữ 橋 cấp N2, học dạng Kanji ở N2 |
| n5-0879 | 駐車場 | ちゅうしゃじょう | bãi đỗ xe | N5 | KANJI_DEFERRED | N2 | Có chữ 駐 cấp N2, học dạng Kanji ở N2 |
| n5-0880 | お正月 | おしょうがつ | tết dương lịch | N5 | KANJI_DEFERRED | N4 | Có chữ 正 cấp N4, học dạng Kanji ở N4 |
| n5-0882 | 建物 | たてもの | tòa nhà | N5 | KANJI_DEFERRED | N4 | Có chữ 建 cấp N4, học dạng Kanji ở N4 |
| n5-0883 | 外国人登録証 | がいこくじんとうろくしょう | thẻ đăng kí người nước ngoài; thẻ đăng kí ngoại kiều | N5 | KANJI_DEFERRED | N1 | Có chữ 証 cấp N1, học dạng Kanji ở N1 |
| n5-0885 | 連れて行きます | つれていきます | dẫn đi | N5 | KANJI_DEFERRED | N3 | Có chữ 連 cấp N3, học dạng Kanji ở N3 |
| n5-0287 | 送る | おくる | gửi | N5 | KANJI_DEFERRED | N4 | Có chữ 送 cấp N4, học dạng Kanji ở N4 |
| n5-0888 | 紹介します | しょうかいします | giới thiệu | N5 | KANJI_DEFERRED | N2 | Có chữ 紹介 cấp N2, học dạng Kanji ở N2 |
| n5-0889 | 案内します | あんないします | hướng dẫn; chỉ đường | N5 | KANJI_DEFERRED | N1 | Có chữ 案 cấp N1, học dạng Kanji ở N1 |
| n5-0890 | 説明します | せつめいします | giải thích; trình bày | N5 | KANJI_DEFERRED | N3 | Có chữ 説 cấp N3, học dạng Kanji ở N3 |
| n5-0894 | 準備 | じゅんび | chuẩn bị | N5 | KANJI_DEFERRED | N2 | Có chữ 準 cấp N2, học dạng Kanji ở N2 |
| n5-0895 | 意味 | いみ | ý nghĩa | N5 | KANJI_DEFERRED | N4 | Có chữ 意味 cấp N4, học dạng Kanji ở N4 |
| n5-0896 | お菓子 | おかし | bánh kẹo | N5 | KANJI_DEFERRED | N2 | Có chữ 菓 cấp N2, học dạng Kanji ở N2 |
| n5-0897 | 全部 | ぜんぶ | toàn bộ; tất cả | N5 | KANJI_DEFERRED | N3 | Có chữ 全部 cấp N3, học dạng Kanji ở N3 |
| n5-0980 | 他に | ほかに | ngoài ra | N5 | KANJI_DEFERRED | N3 | Có chữ 他 cấp N3, học dạng Kanji ở N3 |
| n5-0981 | お弁当 | おべんとう | cơm hộp | N5 | KANJI_DEFERRED | N1 | Có chữ 弁 cấp N1, học dạng Kanji ở N1 |
| n5-0898 | 考えます | かんがえます | nghĩ; suy nghĩ | N5 | KANJI_DEFERRED | N4 | Có chữ 考 cấp N4, học dạng Kanji ở N4 |
| n5-0899 | 着きます | つきます | đến (ga) | N5 | KANJI_DEFERRED | N4 | Có chữ 着 cấp N4, học dạng Kanji ở N4 |
| n5-0900 | 留学します | りゅうがくします | du học | N5 | KANJI_DEFERRED | N3 | Có chữ 留 cấp N3, học dạng Kanji ở N3 |
| n5-0901 | 田舎 | いなか | quê; nông thôn | N5 | KANJI_DEFERRED | N1 | Có chữ 舎 cấp N1, học dạng Kanji ở N1 |
| n5-0902 | 大使館 | たいしかん | đại sứ quán | N5 | KANJI_DEFERRED | N4 | Có chữ 使館 cấp N4, học dạng Kanji ở N4 |
| n5-0907 | 転勤 | てんきん | chuyển công tác | N5 | KANJI_DEFERRED | N3 | Có chữ 勤 cấp N3, học dạng Kanji ở N3 |
| n5-0912 | 頑張ります | がんばります | cố gắng | N5 | KANJI_DEFERRED | N1 | Có chữ 頑張 cấp N1, học dạng Kanji ở N1 |
| n4-0001 | 診ます | みます | khám (bệnh) | N4 | KANJI_DEFERRED | N1 | Có chữ 診 cấp N1, học dạng Kanji ở N1 |
| n4-0002 | 探します | さがします | tìm; tìm kiếm | N4 | KANJI_DEFERRED | N3 | Có chữ 探 cấp N3, học dạng Kanji ở N3 |
| n4-0003 | 遅れます | おくれます | chậm; muộn; trễ giờ | N4 | KANJI_DEFERRED | N3 | Có chữ 遅 cấp N3, học dạng Kanji ở N3 |
| n4-0004 | 間に合います | まにあいます | kịp giờ | N4 | KANJI_DEFERRED | N3 | Có chữ 合 cấp N3, học dạng Kanji ở N3 |
| n4-0006 | 参加します | さんかします | tham gia | N4 | KANJI_DEFERRED | N3 | Có chữ 参加 cấp N3, học dạng Kanji ở N3 |
| n4-0007 | 申し込みます | もうしこみます | đăng ký | N4 | KANJI_DEFERRED | N3 | Có chữ 申込 cấp N3, học dạng Kanji ở N3 |
| n4-0008 | 都合がいい | つごうがいい | có thời gian; thuận tiện | N4 | KANJI_DEFERRED | N3 | Có chữ 都合 cấp N3, học dạng Kanji ở N3 |
| n4-0009 | 都合が悪い | つごうがわるい | không có thời gian | N4 | KANJI_DEFERRED | N3 | Có chữ 都合 cấp N3, học dạng Kanji ở N3 |
| n4-0013 | 柔道 | じゅうどう | judo | N4 | KANJI_DEFERRED | N2 | Có chữ 柔 cấp N2, học dạng Kanji ở N2 |
| n4-0015 | 場所 | ばしょ | nơi chốn; địa điểm | N4 | KANJI_DEFERRED | N3 | Có chữ 所 cấp N3, học dạng Kanji ở N3 |
| n4-0017 | 弁 | べん | tiếng ~ (giọng địa phương) | N4 | KANJI_DEFERRED | N1 | Có chữ 弁 cấp N1, học dạng Kanji ở N1 |
| n4-0020 | 直接 | ちょくせつ | trực tiếp | N4 | KANJI_DEFERRED | N2 | Có chữ 接 cấp N2, học dạng Kanji ở N2 |
| n4-0028 | 片付きます | かたづきます | được dọn dẹp | N4 | KANJI_DEFERRED | N2 | Có chữ 片 cấp N2, học dạng Kanji ở N2 |
| n4-0030 | 燃えます | もえます | cháy được | N4 | KANJI_DEFERRED | N2 | Có chữ 燃 cấp N2, học dạng Kanji ở N2 |
| n4-0031 | 置き場 | おきば | chỗ để; chỗ đặt | N4 | KANJI_DEFERRED | N3 | Có chữ 置 cấp N3, học dạng Kanji ở N3 |
| n4-0032 | 横 | よこ | bên cạnh | N4 | KANJI_DEFERRED | N3 | Có chữ 横 cấp N3, học dạng Kanji ở N3 |
| n4-0033 | 瓶 | びん | cái chai | N4 | KANJI_DEFERRED | N2 | Có chữ 瓶 cấp N2, học dạng Kanji ở N2 |
| n4-0034 | 缶 | かん | cái lon; hộp kim loại | N4 | KANJI_DEFERRED | N2 | Có chữ 缶 cấp N2, học dạng Kanji ở N2 |
| n4-0035 | お湯 | おゆ | nước nóng | N4 | KANJI_DEFERRED | N2 | Có chữ 湯 cấp N2, học dạng Kanji ở N2 |
| n4-0037 | 連絡します | れんらくします | liên lạc | N4 | KANJI_DEFERRED | N2 | Có chữ 絡 cấp N2, học dạng Kanji ở N2 |
| n4-0040 | 宇宙 | うちゅう | vũ trụ | N4 | KANJI_DEFERRED | N1 | Có chữ 宙 cấp N1, học dạng Kanji ở N1 |
| n4-0041 | 宇宙船 | うちゅうせん | tàu vũ trụ | N4 | KANJI_DEFERRED | N1 | Có chữ 宙 cấp N1, học dạng Kanji ở N1 |
| n4-0042 | 怖い | こわい | sợ; đáng sợ | N4 | KANJI_DEFERRED | N3 | Có chữ 怖 cấp N3, học dạng Kanji ở N3 |
| n4-0045 | 飼います | かいます | nuôi; chăn nuôi | N4 | KANJI_DEFERRED | N1 | Có chữ 飼 cấp N1, học dạng Kanji ở N1 |
| n4-0053 | 声 | こえ | tiếng; giọng nói | N4 | KANJI_DEFERRED | N3 | Có chữ 声 cấp N3, học dạng Kanji ở N3 |
| n4-0054 | 波 | なみ | sóng | N4 | KANJI_DEFERRED | N2 | Có chữ 波 cấp N2, học dạng Kanji ở N2 |
| n4-0056 | 景色 | けしき | phong cảnh | N4 | KANJI_DEFERRED | N3 | Có chữ 景 cấp N3, học dạng Kanji ở N3 |
| n4-0058 | 昔 | むかし | ngày xưa | N4 | KANJI_DEFERRED | N3 | Có chữ 昔 cấp N3, học dạng Kanji ở N3 |
| n4-0059 | 道具 | どうぐ | dụng cụ | N4 | KANJI_DEFERRED | N3 | Có chữ 具 cấp N3, học dạng Kanji ở N3 |
| n4-0060 | 自動販売機 | じどうはんばいき | máy bán hàng tự động | N4 | KANJI_DEFERRED | N2 | Có chữ 販 cấp N2, học dạng Kanji ở N2 |
| n4-0061 | 通信販売 | つうしんはんばい | thương mại viễn thông | N4 | KANJI_DEFERRED | N2 | Có chữ 販 cấp N2, học dạng Kanji ở N2 |
| n4-0064 | 台所 | だいどころ | nhà bếp | N4 | KANJI_DEFERRED | N3 | Có chữ 所 cấp N3, học dạng Kanji ở N3 |
| n4-0069 | 本棚 | ほんだな | kệ sách; giá sách | N4 | KANJI_DEFERRED | N1 | Có chữ 棚 cấp N1, học dạng Kanji ở N1 |
| n4-0073 | 素晴らしい | すばらしい | tuyệt vời | N4 | KANJI_DEFERRED | N1 | Có chữ 素 cấp N1, học dạng Kanji ở N1 |
| n4-0076 | 漫画 | まんが | truyện tranh | N4 | KANJI_DEFERRED | N1 | Có chữ 漫 cấp N1, học dạng Kanji ở N1 |
| n4-0078 | 形 | かたち | hình dạng | N4 | KANJI_DEFERRED | N3 | Có chữ 形 cấp N3, học dạng Kanji ở N3 |
| n4-0082 | 例えば | たとえば | ví dụ | N4 | KANJI_DEFERRED | N3 | Có chữ 例 cấp N3, học dạng Kanji ở N3 |
| n4-0084 | 自由に | じゆうに | tự do | N4 | KANJI_DEFERRED | N3 | Có chữ 由 cấp N3, học dạng Kanji ở N3 |
| n4-0086 | 飛びます | とびます | bay | N4 | KANJI_DEFERRED | N3 | Có chữ 飛 cấp N3, học dạng Kanji ở N3 |
| n4-0088 | 将来 | しょうらい | tương lai | N4 | KANJI_DEFERRED | N2 | Có chữ 将 cấp N2, học dạng Kanji ở N2 |
| n4-0090 | 踊ります | おどります | nhảy | N4 | KANJI_DEFERRED | N2 | Có chữ 踊 cấp N2, học dạng Kanji ở N2 |
| n4-0092 | 選びます | えらびます | lựa; lựa chọn | N4 | KANJI_DEFERRED | N3 | Có chữ 選 cấp N3, học dạng Kanji ở N3 |
| n4-0096 | 熱心 | ねっしん | nhiệt tình | N4 | KANJI_DEFERRED | N3 | Có chữ 熱 cấp N3, học dạng Kanji ở N3 |
| n4-0097 | 偉い | えらい | vĩ đại; kính trọng | N4 | KANJI_DEFERRED | N3 | Có chữ 偉 cấp N3, học dạng Kanji ở N3 |
| n4-0099 | 習慣 | しゅうかん | tập quán | N4 | KANJI_DEFERRED | N3 | Có chữ 慣 cấp N3, học dạng Kanji ở N3 |
| n4-0100 | 経験 | けいけん | kinh nghiệm | N4 | KANJI_DEFERRED | N3 | Có chữ 経 cấp N3, học dạng Kanji ở N3 |
| n4-0107 | 値段 | ねだん | giá cả | N4 | KANJI_DEFERRED | N3 | Có chữ 値段 cấp N3, học dạng Kanji ở N3 |
| n4-0108 | 給料 | きゅうりょう | lương | N4 | KANJI_DEFERRED | N3 | Có chữ 給 cấp N3, học dạng Kanji ở N3 |
| n4-0110 | 番組 | ばんぐみ | chương trình | N4 | KANJI_DEFERRED | N3 | Có chữ 番組 cấp N3, học dạng Kanji ở N3 |
| n4-0112 | 小説 | しょうせつ | tiểu thuyết | N4 | KANJI_DEFERRED | N3 | Có chữ 説 cấp N3, học dạng Kanji ở N3 |
| n4-0113 | 小説家 | しょうせつか | tiểu thuyết gia | N4 | KANJI_DEFERRED | N3 | Có chữ 説 cấp N3, học dạng Kanji ở N3 |
| n4-0115 | 管理人 | かんりにん | người quản lí | N4 | KANJI_DEFERRED | N2 | Có chữ 管 cấp N2, học dạng Kanji ở N2 |
| n4-0116 | 息子 | むすこ | con trai (dùng cho mình) | N4 | KANJI_DEFERRED | N3 | Có chữ 息 cấp N3, học dạng Kanji ở N3 |
| n4-0117 | 息子さん | むすこさん | con trai (dùng cho người khác) | N4 | KANJI_DEFERRED | N3 | Có chữ 息 cấp N3, học dạng Kanji ở N3 |
| n4-0118 | 娘 | むすめ | con gái (dùng cho mình) | N4 | KANJI_DEFERRED | N3 | Có chữ 娘 cấp N3, học dạng Kanji ở N3 |
| n4-0119 | 娘さん | むすめさん | con gái (dùng cho người khác) | N4 | KANJI_DEFERRED | N3 | Có chữ 娘 cấp N3, học dạng Kanji ở N3 |
| n4-0128 | 無料 | むりょう | miễn phí | N4 | KANJI_DEFERRED | N3 | Có chữ 無 cấp N3, học dạng Kanji ở N3 |
| n4-0130 | 閉まります | しまります | đóng (cửa) | N4 | KANJI_DEFERRED | N3 | Có chữ 閉 cấp N3, học dạng Kanji ở N3 |
| n4-0132 | 消えます | きえます | tắt (đèn) | N4 | KANJI_DEFERRED | N3 | Có chữ 消 cấp N3, học dạng Kanji ở N3 |
| n4-0133 | 込みます | こみます | đông (đường) | N4 | KANJI_DEFERRED | N3 | Có chữ 込 cấp N3, học dạng Kanji ở N3 |
| n4-0135 | 壊れます | こわれます | hỏng (ghế) | N4 | KANJI_DEFERRED | N1 | Có chữ 壊 cấp N1, học dạng Kanji ở N1 |
| n4-0136 | 割れます | われます | vỡ | N4 | KANJI_DEFERRED | N3 | Có chữ 割 cấp N3, học dạng Kanji ở N3 |
| n4-0137 | 折れます | おれます | gãy (cây) | N4 | KANJI_DEFERRED | N3 | Có chữ 折 cấp N3, học dạng Kanji ở N3 |
| n4-0138 | 破れます | やぶれます | rách (giấy) | N4 | KANJI_DEFERRED | N3 | Có chữ 破 cấp N3, học dạng Kanji ở N3 |
| n4-0139 | 汚れます | よごれます | dơ; bẩn (tay) | N4 | KANJI_DEFERRED | N2 | Có chữ 汚 cấp N2, học dạng Kanji ở N2 |
| n4-0140 | 付きます | つきます | dính; đính (có túi) | N4 | KANJI_DEFERRED | N3 | Có chữ 付 cấp N3, học dạng Kanji ở N3 |
| n4-0144 | 落とします | おとします | làm rơi; rớt | N4 | KANJI_DEFERRED | N3 | Có chữ 落 cấp N3, học dạng Kanji ở N3 |
| n4-0146 | 皿 | さら | đĩa | N4 | KANJI_DEFERRED | N2 | Có chữ 皿 cấp N2, học dạng Kanji ở N2 |
| n4-0150 | 袋 | ふくろ | túi | N4 | KANJI_DEFERRED | N2 | Có chữ 袋 cấp N2, học dạng Kanji ở N2 |
| n4-0151 | 財布 | さいふ | ví tiền | N4 | KANJI_DEFERRED | N2 | Có chữ 布 cấp N2, học dạng Kanji ở N2 |
| n4-0152 | 枝 | えだ | cành cây | N4 | KANJI_DEFERRED | N2 | Có chữ 枝 cấp N2, học dạng Kanji ở N2 |
| n4-0154 | この辺 | このへん | xung quanh đây; gần đây | N4 | KANJI_DEFERRED | N2 | Có chữ 辺 cấp N2, học dạng Kanji ở N2 |
| n4-0157 | 忘れ物 | わすれもの | đồ bỏ quên | N4 | KANJI_DEFERRED | N3 | Có chữ 忘 cấp N3, học dạng Kanji ở N3 |
| n4-0158 | 側 | がわ | phía; bên | N4 | KANJI_DEFERRED | N3 | Có chữ 側 cấp N3, học dạng Kanji ở N3 |
| n4-0159 | 辺 | へん | chỗ; vùng | N4 | KANJI_DEFERRED | N2 | Có chữ 辺 cấp N2, học dạng Kanji ở N2 |
| n4-0160 | 網棚 | あみだな | giá để hành lý | N4 | KANJI_DEFERRED | N1 | Có chữ 網棚 cấp N1, học dạng Kanji ở N1 |
| n4-0161 | 確か | たしか | chắc là | N4 | KANJI_DEFERRED | N3 | Có chữ 確 cấp N3, học dạng Kanji ở N3 |
| n4-0162 | 地震 | じしん | động đất | N4 | KANJI_DEFERRED | N2 | Có chữ 震 cấp N2, học dạng Kanji ở N2 |
| n4-0163 | 壁 | かべ | bức tường | N4 | KANJI_DEFERRED | N1 | Có chữ 壁 cấp N1, học dạng Kanji ở N1 |
| n4-0164 | 針 | はり | kim đồng hồ | N4 | KANJI_DEFERRED | N2 | Có chữ 針 cấp N2, học dạng Kanji ở N2 |
| n4-0167 | 指します | さします | chỉ | N4 | KANJI_DEFERRED | N3 | Có chữ 指 cấp N3, học dạng Kanji ở N3 |
| n4-0168 | 倒れます | たおれます | đổ | N4 | KANJI_DEFERRED | N3 | Có chữ 倒 cấp N3, học dạng Kanji ở N3 |
| n4-0172 | 飾ります | かざります | trang trí | N4 | KANJI_DEFERRED | N1 | Có chữ 飾 cấp N1, học dạng Kanji ở N1 |
| n4-0173 | 並べます | ならべます | xếp thành hàng | N4 | KANJI_DEFERRED | N2 | Có chữ 並 cấp N2, học dạng Kanji ở N2 |
| n4-0174 | 植えます | うえます | trồng (cây) | N4 | KANJI_DEFERRED | N2 | Có chữ 植 cấp N2, học dạng Kanji ở N2 |
| n4-0175 | 戻します | もどします | đưa về; trả về | N4 | KANJI_DEFERRED | N3 | Có chữ 戻 cấp N3, học dạng Kanji ở N3 |
| n4-0177 | 片づけます | かたづけます | dọn dẹp; sắp xếp | N4 | KANJI_DEFERRED | N2 | Có chữ 片 cấp N2, học dạng Kanji ở N2 |
| n4-0179 | 決めます | きめます | quyết định | N4 | KANJI_DEFERRED | N3 | Có chữ 決 cấp N3, học dạng Kanji ở N3 |
| n4-0181 | 相談します | そうだんします | thảo luận; trao đổi; bàn bạc | N4 | KANJI_DEFERRED | N3 | Có chữ 相談 cấp N3, học dạng Kanji ở N3 |
| n4-0182 | 予習します | よしゅうします | chuẩn bị bài mới | N4 | KANJI_DEFERRED | N3 | Có chữ 予 cấp N3, học dạng Kanji ở N3 |
| n4-0183 | 復習します | ふくしゅうします | ôn bài cũ | N4 | KANJI_DEFERRED | N2 | Có chữ 復 cấp N2, học dạng Kanji ở N2 |
| n4-0186 | 授業 | じゅぎょう | giờ học | N4 | KANJI_DEFERRED | N1 | Có chữ 授 cấp N1, học dạng Kanji ở N1 |
| n4-0187 | 講義 | こうぎ | bài giảng | N4 | KANJI_DEFERRED | N1 | Có chữ 義 cấp N1, học dạng Kanji ở N1 |
| n4-0189 | 予定 | よてい | kế hoạch; dự định | N4 | KANJI_DEFERRED | N3 | Có chữ 予定 cấp N3, học dạng Kanji ở N3 |
| n4-0190 | 案内書 | あんないしょ | tài liệu hướng dẫn | N4 | KANJI_DEFERRED | N1 | Có chữ 案 cấp N1, học dạng Kanji ở N1 |
| n4-0193 | ごみ箱 | ごみばこ | thùng rác | N4 | KANJI_DEFERRED | N3 | Có chữ 箱 cấp N3, học dạng Kanji ở N3 |
| n4-0194 | 人形 | にんぎょう | con búp bê; con rối | N4 | KANJI_DEFERRED | N3 | Có chữ 形 cấp N3, học dạng Kanji ở N3 |
| n4-0195 | 花瓶 | かびん | lọ hoa | N4 | KANJI_DEFERRED | N2 | Có chữ 瓶 cấp N2, học dạng Kanji ở N2 |
| n4-0196 | 鏡 | かがみ | cái gương | N4 | KANJI_DEFERRED | N1 | Có chữ 鏡 cấp N1, học dạng Kanji ở N1 |
| n4-0197 | 引き出し | ひきだし | ngăn kéo | N4 | KANJI_DEFERRED | N3 | Có chữ 引 cấp N3, học dạng Kanji ở N3 |
| n4-0198 | 玄関 | げんかん | cửa vào | N4 | KANJI_DEFERRED | N1 | Có chữ 玄 cấp N1, học dạng Kanji ở N1 |
| n4-0199 | 廊下 | ろうか | hành lang | N4 | KANJI_DEFERRED | N1 | Có chữ 廊 cấp N1, học dạng Kanji ở N1 |
| n4-0200 | 池 | いけ | cái ao | N4 | KANJI_DEFERRED | N2 | Có chữ 池 cấp N2, học dạng Kanji ở N2 |
| n4-0201 | 交番 | こうばん | trạm cảnh sát | N4 | KANJI_DEFERRED | N3 | Có chữ 交番 cấp N3, học dạng Kanji ở N3 |
| n4-0203 | 周り | まわり | xung quanh | N4 | KANJI_DEFERRED | N2 | Có chữ 周 cấp N2, học dạng Kanji ở N2 |
| n4-0207 | 予定表 | よていひょう | thời khóa biểu | N4 | KANJI_DEFERRED | N3 | Có chữ 予定表 cấp N3, học dạng Kanji ở N3 |
| n4-0209 | 希望 | きぼう | hi vọng; nguyện vọng | N4 | KANJI_DEFERRED | N2 | Có chữ 希 cấp N2, học dạng Kanji ở N2 |
| n4-0211 | 丸い | まるい | tròn | N4 | KANJI_DEFERRED | N2 | Có chữ 丸 cấp N2, học dạng Kanji ở N2 |
| n4-0213 | 地球 | ちきゅう | trái đất | N4 | KANJI_DEFERRED | N3 | Có chữ 球 cấp N3, học dạng Kanji ở N3 |
| n4-0215 | 嫌 | いや | chán; ghét; không chấp nhận được | N4 | KANJI_DEFERRED | N1 | Có chữ 嫌 cấp N1, học dạng Kanji ở N1 |
| n4-0217 | 目が覚めます | めがさめます | tỉnh giấc; mở mắt | N4 | KANJI_DEFERRED | N3 | Có chữ 覚 cấp N3, học dạng Kanji ở N3 |
| n4-0219 | 続けます | つづけます | tiếp tục | N4 | KANJI_DEFERRED | N3 | Có chữ 続 cấp N3, học dạng Kanji ở N3 |
| n4-0221 | 受けます | うけます | thi (kì thi) | N4 | KANJI_DEFERRED | N3 | Có chữ 受 cấp N3, học dạng Kanji ở N3 |
| n4-0223 | 卒業します | そつぎょうします | tốt nghiệp | N4 | KANJI_DEFERRED | N2 | Có chữ 卒 cấp N2, học dạng Kanji ở N2 |
| n4-0224 | 休憩します | きゅうけいします | giải lao | N4 | KANJI_DEFERRED | N1 | Có chữ 憩 cấp N1, học dạng Kanji ở N1 |
| n4-0225 | 連休 | れんきゅう | ngày nghỉ liền nhau | N4 | KANJI_DEFERRED | N3 | Có chữ 連 cấp N3, học dạng Kanji ở N3 |
| n4-0227 | 展覧会 | てんらんかい | triển lãm | N4 | KANJI_DEFERRED | N1 | Có chữ 展覧 cấp N1, học dạng Kanji ở N1 |
| n4-0228 | 結婚式 | けっこんしき | lễ cưới; đám cưới | N4 | KANJI_DEFERRED | N1 | Có chữ 結 cấp N1, học dạng Kanji ở N1 |
| n4-0229 | 葬式 | そうしき | lễ tang; đám tang | N4 | KANJI_DEFERRED | N1 | Có chữ 葬 cấp N1, học dạng Kanji ở N1 |
| n4-0230 | 式 | しき | buổi lễ | N4 | KANJI_DEFERRED | N3 | Có chữ 式 cấp N3, học dạng Kanji ở N3 |
| n4-0232 | 支店 | してん | chi nhánh | N4 | KANJI_DEFERRED | N3 | Có chữ 支 cấp N3, học dạng Kanji ở N3 |
| n4-0235 | 動物園 | どうぶつえん | sở thú | N4 | KANJI_DEFERRED | N3 | Có chữ 園 cấp N3, học dạng Kanji ở N3 |
| n4-0236 | 温泉 | おんせん | suối nước nóng | N4 | KANJI_DEFERRED | N2 | Có chữ 温泉 cấp N2, học dạng Kanji ở N2 |
| n4-0237 | お客さん | おきゃくさん | khách hàng | N4 | KANJI_DEFERRED | N3 | Có chữ 客 cấp N3, học dạng Kanji ở N3 |
| n4-0240 | 残ります | のこります | ở lại | N4 | KANJI_DEFERRED | N3 | Có chữ 残 cấp N3, học dạng Kanji ở N3 |
| n4-0244 | 村 | むら | làng | N4 | KANJI_DEFERRED | N2 | Có chữ 村 cấp N2, học dạng Kanji ở N2 |
| n4-0246 | 閉じます | とじます | nhắm | N4 | KANJI_DEFERRED | N3 | Có chữ 閉 cấp N3, học dạng Kanji ở N3 |
| n4-0247 | 都会 | とかい | thành phố | N4 | KANJI_DEFERRED | N3 | Có chữ 都 cấp N3, học dạng Kanji ở N3 |
| n4-0250 | 美しい | うつくしい | đẹp | N4 | KANJI_DEFERRED | N3 | Có chữ 美 cấp N3, học dạng Kanji ở N3 |
| n4-0251 | 自然 | しぜん | thiên nhiên | N4 | KANJI_DEFERRED | N3 | Có chữ 然 cấp N3, học dạng Kanji ở N3 |
| n4-0253 | 気が付きます | きがつきます | để ý; nhận ra | N4 | KANJI_DEFERRED | N3 | Có chữ 付 cấp N3, học dạng Kanji ở N3 |
| n4-0255 | 成功します | せいこうします | thành công | N4 | KANJI_DEFERRED | N1 | Có chữ 功 cấp N1, học dạng Kanji ở N1 |
| n4-0256 | 失敗します | しっぱいします | thất bại | N4 | KANJI_DEFERRED | N3 | Có chữ 失敗 cấp N3, học dạng Kanji ở N3 |
| n4-0257 | 合格します | ごうかくします | đỗ | N4 | KANJI_DEFERRED | N3 | Có chữ 合格 cấp N3, học dạng Kanji ở N3 |
| n4-0258 | 戻ります | もどります | quay lại; trở lại | N4 | KANJI_DEFERRED | N3 | Có chữ 戻 cấp N3, học dạng Kanji ở N3 |
| n4-0260 | 晴れます | はれます | nắng; quang đãng | N4 | KANJI_DEFERRED | N3 | Có chữ 晴 cấp N3, học dạng Kanji ở N3 |
| n4-0261 | 曇ります | くもります | có mây; mây mù | N4 | KANJI_DEFERRED | N2 | Có chữ 曇 cấp N2, học dạng Kanji ở N2 |
| n4-0262 | 吹きます | ふきます | thổi | N4 | KANJI_DEFERRED | N3 | Có chữ 吹 cấp N3, học dạng Kanji ở N3 |
| n4-0263 | 治ります | なおります | khỏi | N4 | KANJI_DEFERRED | N3 | Có chữ 治 cấp N3, học dạng Kanji ở N3 |
| n4-0265 | 冷やします | ひやします | làm lạnh | N4 | KANJI_DEFERRED | N3 | Có chữ 冷 cấp N3, học dạng Kanji ở N3 |
| n4-0266 | 心配 | しんぱい | lo lắng | N4 | KANJI_DEFERRED | N3 | Có chữ 配 cấp N3, học dạng Kanji ở N3 |
| n4-0274 | 太陽 | たいよう | mặt trời | N4 | KANJI_DEFERRED | N3 | Có chữ 太陽 cấp N3, học dạng Kanji ở N3 |
| n4-0275 | 星 | ほし | ngôi sao | N4 | KANJI_DEFERRED | N2 | Có chữ 星 cấp N2, học dạng Kanji ở N2 |
| n4-0285 | 遅く | おそく | muộn; khuya | N4 | KANJI_DEFERRED | N3 | Có chữ 遅 cấp N3, học dạng Kanji ở N3 |
| n4-0291 | 胃 | い | dạ dày | N4 | KANJI_DEFERRED | N2 | Có chữ 胃 cấp N2, học dạng Kanji ở N2 |
| n4-0292 | 働きすぎ | はたらきすぎ | làm việc quá sức | N4 | KANJI_DEFERRED | N3 | Có chữ 働 cấp N3, học dạng Kanji ở N3 |
| n4-0294 | 無理をします | むりをします | làm quá sức | N4 | KANJI_DEFERRED | N3 | Có chữ 無 cấp N3, học dạng Kanji ở N3 |
| n4-0296 | 困ります | こまります | rắc rối; khó xử | N4 | KANJI_DEFERRED | N3 | Có chữ 困 cấp N3, học dạng Kanji ở N3 |
| n4-0297 | 宝くじ | たからくじ | xổ số | N4 | KANJI_DEFERRED | N2 | Có chữ 宝 cấp N2, học dạng Kanji ở N2 |
| n4-0298 | 健康 | けんこう | sức khỏe | N4 | KANJI_DEFERRED | N1 | Có chữ 健康 cấp N1, học dạng Kanji ở N1 |
| n4-0299 | 恋愛 | れんあい | tình yêu | N4 | KANJI_DEFERRED | N2 | Có chữ 恋 cấp N2, học dạng Kanji ở N2 |
| n4-0300 | 恋人 | こいびと | người yêu | N4 | KANJI_DEFERRED | N2 | Có chữ 恋 cấp N2, học dạng Kanji ở N2 |
| n4-0301 | 逃げます | にげます | chạy trốn; bỏ chạy | N4 | KANJI_DEFERRED | N3 | Có chữ 逃 cấp N3, học dạng Kanji ở N3 |
| n4-0302 | 騒ぎます | さわぎます | làm ồn; làm rùm beng | N4 | KANJI_DEFERRED | N1 | Có chữ 騒 cấp N1, học dạng Kanji ở N1 |
| n4-0304 | 投げます | なげます | ném | N4 | KANJI_DEFERRED | N3 | Có chữ 投 cấp N3, học dạng Kanji ở N3 |
| n4-0305 | 守ります | まもります | bảo vệ; tuân thủ | N4 | KANJI_DEFERRED | N3 | Có chữ 守 cấp N3, học dạng Kanji ở N3 |
| n4-0308 | 伝えます | つたえます | truyền đạt | N4 | KANJI_DEFERRED | N3 | Có chữ 伝 cấp N3, học dạng Kanji ở N3 |
| n4-0312 | 席 | せき | chỗ ngồi; ghế | N4 | KANJI_DEFERRED | N3 | Có chữ 席 cấp N3, học dạng Kanji ở N3 |
| n4-0316 | 洗濯機 | せんたくき | máy giặt | N4 | KANJI_DEFERRED | N2 | Có chữ 濯 cấp N2, học dạng Kanji ở N2 |
| n4-0317 | 機 | き | máy ~ | N4 | KANJI_DEFERRED | N3 | Có chữ 機 cấp N3, học dạng Kanji ở N3 |
| n4-0318 | 規則 | きそく | quy tắc; kỷ luật | N4 | KANJI_DEFERRED | N2 | Có chữ 則 cấp N2, học dạng Kanji ở N2 |
| n4-0319 | 使用禁止 | しようきんし | cấm sử dụng | N4 | KANJI_DEFERRED | N2 | Có chữ 禁 cấp N2, học dạng Kanji ở N2 |
| n4-0320 | 立入禁止 | たちいりきんし | cấm vào | N4 | KANJI_DEFERRED | N2 | Có chữ 禁 cấp N2, học dạng Kanji ở N2 |
| n4-0323 | 非常口 | ひじょうぐち | cửa thoát hiểm | N4 | KANJI_DEFERRED | N3 | Có chữ 非常 cấp N3, học dạng Kanji ở N3 |
| n4-0325 | 営業中 | えいぎょうちゅう | đang mở cửa | N4 | KANJI_DEFERRED | N2 | Có chữ 営 cấp N2, học dạng Kanji ở N2 |
| n4-0330 | 駐車違反 | ちゅうしゃいはん | đỗ xe trái phép | N4 | KANJI_DEFERRED | N2 | Có chữ 駐 cấp N2, học dạng Kanji ở N2 |
| n4-0333 | 警察 | けいさつ | cảnh sát | N4 | KANJI_DEFERRED | N3 | Có chữ 警察 cấp N3, học dạng Kanji ở N3 |
| n4-0334 | 罰金 | ばっきん | tiền phạt | N4 | KANJI_DEFERRED | N1 | Có chữ 罰 cấp N1, học dạng Kanji ở N1 |
| n4-0335 | 電報 | でんぽう | điện báo | N4 | KANJI_DEFERRED | N3 | Có chữ 報 cấp N3, học dạng Kanji ở N3 |
| n4-0338 | 打ちます | うちます | gửi (điện báo) | N4 | KANJI_DEFERRED | N3 | Có chữ 打 cấp N3, học dạng Kanji ở N3 |
| n4-0345 | 留守 | るす | vắng nhà | N4 | KANJI_DEFERRED | N3 | Có chữ 留守 cấp N3, học dạng Kanji ở N3 |
| n4-0346 | 留守番 | るすばん | trông nhà; giữ nhà | N4 | KANJI_DEFERRED | N3 | Có chữ 留守番 cấp N3, học dạng Kanji ở N3 |
| n4-0347 | 祝い | いわい | việc mừng | N4 | KANJI_DEFERRED | N2 | Có chữ 祝 cấp N2, học dạng Kanji ở N2 |
| n4-0349 | 悲しい | かなしい | buồn | N4 | KANJI_DEFERRED | N3 | Có chữ 悲 cấp N3, học dạng Kanji ở N3 |
| n4-0350 | 利用します | りようします | sử dụng; lợi dụng; tận dụng | N4 | KANJI_DEFERRED | N3 | Có chữ 利 cấp N3, học dạng Kanji ở N3 |
| n4-0351 | 磨きます | みがきます | mài; đánh (răng) | N4 | KANJI_DEFERRED | N2 | Có chữ 磨 cấp N2, học dạng Kanji ở N2 |
| n4-0352 | 組み立てます | くみたてます | lắp ráp; lắp đặt | N4 | KANJI_DEFERRED | N3 | Có chữ 組 cấp N3, học dạng Kanji ở N3 |
| n4-0353 | 折ります | おります | gấp; gập; bẻ gãy | N4 | KANJI_DEFERRED | N3 | Có chữ 折 cấp N3, học dạng Kanji ở N3 |
| n4-0356 | 細い | ほそい | gầy; hẹp; thon | N4 | KANJI_DEFERRED | N2 | Có chữ 細 cấp N2, học dạng Kanji ở N2 |
| n4-0357 | 太い | ふとい | béo; to | N4 | KANJI_DEFERRED | N3 | Có chữ 太 cấp N3, học dạng Kanji ở N3 |
| n4-0358 | 盆踊り | ぼんおどり | múa trong hội bon | N4 | KANJI_DEFERRED | N1 | Có chữ 盆 cấp N1, học dạng Kanji ở N1 |
| n4-0360 | 家具 | かぐ | gia cụ; đồ dùng nội thất | N4 | KANJI_DEFERRED | N3 | Có chữ 具 cấp N3, học dạng Kanji ở N3 |
| n4-0363 | 説明書 | せつめいしょ | quyển hướng dẫn | N4 | KANJI_DEFERRED | N3 | Có chữ 説 cấp N3, học dạng Kanji ở N3 |
| n4-0365 | 線 | せん | đường | N4 | KANJI_DEFERRED | N2 | Có chữ 線 cấp N2, học dạng Kanji ở N2 |
| n4-0366 | 矢印 | やじるし | dấu mũi tên | N4 | KANJI_DEFERRED | N1 | Có chữ 矢 cấp N1, học dạng Kanji ở N1 |
| n4-0371 | 紺 | こん | màu xanh lam | N4 | KANJI_DEFERRED | N1 | Có chữ 紺 cấp N1, học dạng Kanji ở N1 |
| n4-0372 | 黄色 | きいろ | màu vàng | N4 | KANJI_DEFERRED | N2 | Có chữ 黄 cấp N2, học dạng Kanji ở N2 |
| n4-0380 | 載せます | のせます | đặt lên | N4 | KANJI_DEFERRED | N1 | Có chữ 載 cấp N1, học dạng Kanji ở N1 |
| n4-0382 | 苦い | にがい | đắng | N4 | KANJI_DEFERRED | N3 | Có chữ 苦 cấp N3, học dạng Kanji ở N3 |
| n4-0384 | 材料 | ざいりょう | nguyên liệu | N4 | KANJI_DEFERRED | N2 | Có chữ 材 cấp N2, học dạng Kanji ở N2 |
| n4-0386 | 鶏肉 | とりにく | thịt gà | N4 | KANJI_DEFERRED | N1 | Có chữ 鶏 cấp N1, học dạng Kanji ở N1 |
| n4-0390 | 調味料 | ちょうみりょう | gia vị | N4 | KANJI_DEFERRED | N3 | Có chữ 調 cấp N3, học dạng Kanji ở N3 |
| n4-0394 | 煮ます | にます | nấu | N4 | KANJI_DEFERRED | N1 | Có chữ 煮 cấp N1, học dạng Kanji ở N1 |
| n4-0395 | 煮えます | にえます | chín; được nấu | N4 | KANJI_DEFERRED | N1 | Có chữ 煮 cấp N1, học dạng Kanji ở N1 |
| n4-0397 | 咲きます | さきます | nở (hoa) | N4 | KANJI_DEFERRED | N2 | Có chữ 咲 cấp N2, học dạng Kanji ở N2 |
| n4-0398 | 変わります | かわります | thay đổi; đổi | N4 | KANJI_DEFERRED | N3 | Có chữ 変 cấp N3, học dạng Kanji ở N3 |
| n4-0399 | 拾います | ひろいます | nhặt lên | N4 | KANJI_DEFERRED | N2 | Có chữ 拾 cấp N2, học dạng Kanji ở N2 |
| n4-0402 | 珍しい | めずらしい | hiếm có | N4 | KANJI_DEFERRED | N2 | Có chữ 珍 cấp N2, học dạng Kanji ở N2 |
| n4-0403 | 向こう | むこう | bên kia; bên đấy | N4 | KANJI_DEFERRED | N3 | Có chữ 向 cấp N3, học dạng Kanji ở N3 |
| n4-0404 | 島 | しま | đảo; hòn đảo | N4 | KANJI_DEFERRED | N2 | Có chữ 島 cấp N2, học dạng Kanji ở N2 |
| n4-0405 | 港 | みなと | cảng; bến cảng | N4 | KANJI_DEFERRED | N3 | Có chữ 港 cấp N3, học dạng Kanji ở N3 |
| n4-0406 | 近所 | きんじょ | hàng xóm; khu vực lân cận | N4 | KANJI_DEFERRED | N3 | Có chữ 所 cấp N3, học dạng Kanji ở N3 |
| n4-0409 | 山登り | やまのぼり | leo núi | N4 | KANJI_DEFERRED | N3 | Có chữ 登 cấp N3, học dạng Kanji ở N3 |
| n4-0411 | 機会 | きかい | cơ hội | N4 | KANJI_DEFERRED | N3 | Có chữ 機 cấp N3, học dạng Kanji ở N3 |
| n4-0412 | 許可 | きょか | phép; giấy phép | N4 | KANJI_DEFERRED | N3 | Có chữ 許可 cấp N3, học dạng Kanji ở N3 |
| n4-0413 | 丸 | まる | tròn; vòng tròn | N4 | KANJI_DEFERRED | N2 | Có chữ 丸 cấp N2, học dạng Kanji ở N2 |
| n4-0414 | 操作 | そうさ | thao tác | N4 | KANJI_DEFERRED | N1 | Có chữ 操 cấp N1, học dạng Kanji ở N1 |
| n4-0415 | 方法 | ほうほう | phương pháp | N4 | KANJI_DEFERRED | N3 | Có chữ 法 cấp N3, học dạng Kanji ở N3 |
| n4-0416 | 設備 | せつび | thiết bị | N4 | KANJI_DEFERRED | N2 | Có chữ 設 cấp N2, học dạng Kanji ở N2 |
| n4-0420 | 葉 | は | cái lá | N4 | KANJI_DEFERRED | N3 | Có chữ 葉 cấp N3, học dạng Kanji ở N3 |
| n4-0421 | 曲 | きょく | bài hát; bản nhạc | N4 | KANJI_DEFERRED | N3 | Có chữ 曲 cấp N3, học dạng Kanji ở N3 |
| n4-0424 | 初めに | はじめに | đầu tiên; trước hết | N4 | KANJI_DEFERRED | N3 | Có chữ 初 cấp N3, học dạng Kanji ở N3 |
| n4-0429 | 詳しい | くわしい | cụ thể; chi tiết | N4 | KANJI_DEFERRED | N1 | Có chữ 詳 cấp N1, học dạng Kanji ở N1 |
| n4-0431 | 朱 | しゅ | đỏ; màu đỏ | N4 | KANJI_DEFERRED | N1 | Có chữ 朱 cấp N1, học dạng Kanji ở N1 |
| n4-0432 | 交わります | まじわります | giao lưu; quan hệ với | N4 | KANJI_DEFERRED | N3 | Có chữ 交 cấp N3, học dạng Kanji ở N3 |
| n4-0434 | 仲良くします | なかよくします | quan hệ tốt với; chơi thân với | N4 | KANJI_DEFERRED | N2 | Có chữ 仲 cấp N2, học dạng Kanji ở N2 |
| n4-0435 | 必要 | ひつよう | cần thiết | N4 | KANJI_DEFERRED | N3 | Có chữ 必要 cấp N3, học dạng Kanji ở N3 |
| n4-0436 | 届きます | とどきます | được gửi đến; được chuyển đến | N4 | KANJI_DEFERRED | N2 | Có chữ 届 cấp N2, học dạng Kanji ở N2 |
| n4-0437 | 貯金します | ちょきんします | tiết kiệm tiền; để dành tiền | N4 | KANJI_DEFERRED | N2 | Có chữ 貯 cấp N2, học dạng Kanji ở N2 |
| n4-0438 | 太ります | ふとります | béo lên; tăng cân | N4 | KANJI_DEFERRED | N3 | Có chữ 太 cấp N3, học dạng Kanji ở N3 |
| n4-0440 | 過ぎます | すぎます | quá | N4 | KANJI_DEFERRED | N3 | Có chữ 過 cấp N3, học dạng Kanji ở N3 |
| n4-0442 | 固い | かたい | cứng | N4 | KANJI_DEFERRED | N2 | Có chữ 固 cấp N2, học dạng Kanji ở N2 |
| n4-0443 | 柔らかい | やわらかい | mềm | N4 | KANJI_DEFERRED | N2 | Có chữ 柔 cấp N2, học dạng Kanji ở N2 |
| n4-0445 | 携帯 | けいたい | ~ cầm tay | N4 | KANJI_DEFERRED | N1 | Có chữ 携 cấp N1, học dạng Kanji ở N1 |
| n4-0447 | 剣道 | けんどう | kiếm đạo | N4 | KANJI_DEFERRED | N1 | Có chữ 剣 cấp N1, học dạng Kanji ở N1 |
| n4-0453 | 必ず | かならず | nhất định | N4 | KANJI_DEFERRED | N3 | Có chữ 必 cấp N3, học dạng Kanji ở N3 |
| n4-0454 | 絶対に | ぜったいに | tuyệt đối | N4 | KANJI_DEFERRED | N3 | Có chữ 絶対 cấp N3, học dạng Kanji ở N3 |
| n4-0458 | お客様 | おきゃくさま | khách hàng | N4 | KANJI_DEFERRED | N3 | Có chữ 客様 cấp N3, học dạng Kanji ở N3 |
| n4-0461 | 水泳 | すいえい | môn bơi lội | N4 | KANJI_DEFERRED | N3 | Có chữ 泳 cấp N3, học dạng Kanji ở N3 |
| n4-0466 | 乗り物 | のりもの | phương tiện đi lại | N4 | KANJI_DEFERRED | N3 | Có chữ 乗 cấp N3, học dạng Kanji ở N3 |
| n4-0467 | 歴史 | れきし | lịch sử | N4 | KANJI_DEFERRED | N2 | Có chữ 歴史 cấp N2, học dạng Kanji ở N2 |
| n4-0468 | 世紀 | せいき | thế kỉ | N4 | KANJI_DEFERRED | N1 | Có chữ 紀 cấp N1, học dạng Kanji ở N1 |
| n4-0469 | 遠く | とおく | xa; ở xa | N4 | KANJI_DEFERRED | N3 | Có chữ 遠 cấp N3, học dạng Kanji ở N3 |
| n4-0470 | 汽車 | きしゃ | tàu hỏa chạy bằng hơi nước | N4 | KANJI_DEFERRED | N1 | Có chữ 汽 cấp N1, học dạng Kanji ở N1 |
| n4-0471 | 汽船 | きせん | thuyền chạy bằng hơi nước | N4 | KANJI_DEFERRED | N1 | Có chữ 汽 cấp N1, học dạng Kanji ở N1 |
| n4-0474 | 安全 | あんぜん | an toàn | N4 | KANJI_DEFERRED | N3 | Có chữ 全 cấp N3, học dạng Kanji ở N3 |
| n4-0475 | 褒めます | ほめます | khen | N4 | KANJI_DEFERRED | N1 | Có chữ 褒 cấp N1, học dạng Kanji ở N1 |
| n4-0477 | 誘います | さそいます | mời; rủ rê | N4 | KANJI_DEFERRED | N1 | Có chữ 誘 cấp N1, học dạng Kanji ở N1 |
| n4-0479 | 招待します | しょうたいします | mời | N4 | KANJI_DEFERRED | N3 | Có chữ 招 cấp N3, học dạng Kanji ở N3 |
| n4-0480 | 頼みます | たのみます | nhờ | N4 | KANJI_DEFERRED | N3 | Có chữ 頼 cấp N3, học dạng Kanji ở N3 |
| n4-0482 | 踏みます | ふみます | giẫm; giẫm lên | N4 | KANJI_DEFERRED | N1 | Có chữ 踏 cấp N1, học dạng Kanji ở N1 |
| n4-0483 | 壊します | こわします | phá; làm hỏng | N4 | KANJI_DEFERRED | N1 | Có chữ 壊 cấp N1, học dạng Kanji ở N1 |
| n4-0484 | 汚します | よごします | làm bẩn | N4 | KANJI_DEFERRED | N2 | Có chữ 汚 cấp N2, học dạng Kanji ở N2 |
| n4-0486 | 輸出します | ゆしゅつします | xuất khẩu | N4 | KANJI_DEFERRED | N2 | Có chữ 輸 cấp N2, học dạng Kanji ở N2 |
| n4-0487 | 輸入します | ゆにゅうします | nhập khẩu | N4 | KANJI_DEFERRED | N2 | Có chữ 輸 cấp N2, học dạng Kanji ở N2 |
| n4-0488 | 翻訳します | ほんやくします | dịch (sách; tài liệu) | N4 | KANJI_DEFERRED | N1 | Có chữ 翻訳 cấp N1, học dạng Kanji ở N1 |
| n4-0491 | 設計します | せっけいします | thiết kế | N4 | KANJI_DEFERRED | N2 | Có chữ 設 cấp N2, học dạng Kanji ở N2 |
| n4-0493 | 麦 | むぎ | lúa mạch | N4 | KANJI_DEFERRED | N2 | Có chữ 麦 cấp N2, học dạng Kanji ở N2 |
| n4-0494 | 石油 | せきゆ | dầu mỏ | N4 | KANJI_DEFERRED | N2 | Có chữ 油 cấp N2, học dạng Kanji ở N2 |
| n4-0495 | 原料 | げんりょう | nguyên liệu thô | N4 | KANJI_DEFERRED | N3 | Có chữ 原 cấp N3, học dạng Kanji ở N3 |
| n4-0497 | 泥棒 | どろぼう | kẻ trộm | N4 | KANJI_DEFERRED | N2 | Có chữ 泥棒 cấp N2, học dạng Kanji ở N2 |
| n4-0498 | 警官 | けいかん | cảnh sát | N4 | KANJI_DEFERRED | N3 | Có chữ 警官 cấp N3, học dạng Kanji ở N3 |
| n4-0499 | 建築家 | けんちくか | kiến trúc sư | N4 | KANJI_DEFERRED | N2 | Có chữ 築 cấp N2, học dạng Kanji ở N2 |
| n4-0500 | 科学者 | かがくしゃ | nhà khoa học | N4 | KANJI_DEFERRED | N3 | Có chữ 科 cấp N3, học dạng Kanji ở N3 |
| n4-0504 | 埋め立てます | うめたてます | lấp | N4 | KANJI_DEFERRED | N2 | Có chữ 埋 cấp N2, học dạng Kanji ở N2 |
| n4-0505 | 技術 | ぎじゅつ | kỹ thuật | N4 | KANJI_DEFERRED | N2 | Có chữ 技 cấp N2, học dạng Kanji ở N2 |
| n4-0507 | 騒音 | そうおん | tiếng ồn | N4 | KANJI_DEFERRED | N1 | Có chữ 騒 cấp N1, học dạng Kanji ở N1 |
| n4-0509 | 豪華 | ごうか | hào hoa; sang trọng | N4 | KANJI_DEFERRED | N1 | Có chữ 豪華 cấp N1, học dạng Kanji ở N1 |
| n4-0510 | 彫刻 | ちょうこく | điêu khắc | N4 | KANJI_DEFERRED | N1 | Có chữ 彫 cấp N1, học dạng Kanji ở N1 |
| n4-0511 | 眠ります | ねむります | ngủ | N4 | KANJI_DEFERRED | N3 | Có chữ 眠 cấp N3, học dạng Kanji ở N3 |
| n4-0512 | 彫ります | ほります | khắc | N4 | KANJI_DEFERRED | N1 | Có chữ 彫 cấp N1, học dạng Kanji ở N1 |
| n4-0513 | 仲間 | なかま | bạn bè; đồng nghiệp | N4 | KANJI_DEFERRED | N2 | Có chữ 仲 cấp N2, học dạng Kanji ở N2 |
| n4-0515 | 一生懸命 | いっしょうけんめい | cố gắng hết sức | N4 | KANJI_DEFERRED | N1 | Có chữ 懸 cấp N1, học dạng Kanji ở N1 |
| n4-0517 | 育てます | そだてます | nuôi; trồng | N4 | KANJI_DEFERRED | N3 | Có chữ 育 cấp N3, học dạng Kanji ở N3 |
| n4-0519 | 退院します | たいいんします | xuất viện | N4 | KANJI_DEFERRED | N3 | Có chữ 退 cấp N3, học dạng Kanji ở N3 |
| n4-0527 | 海岸 | かいがん | bờ biển | N4 | KANJI_DEFERRED | N2 | Có chữ 岸 cấp N2, học dạng Kanji ở N2 |
| n4-0529 | 書類 | しょるい | giấy tờ; tài liệu | N4 | KANJI_DEFERRED | N3 | Có chữ 類 cấp N3, học dạng Kanji ở N3 |
| n4-0530 | 電源 | でんげん | nguồn điện; công tắc điện | N4 | KANJI_DEFERRED | N1 | Có chữ 源 cấp N1, học dạng Kanji ở N1 |
| n4-0531 | 製 | せい | sản xuất tại | N4 | KANJI_DEFERRED | N1 | Có chữ 製 cấp N1, học dạng Kanji ở N1 |
| n4-0534 | 回覧 | かいらん | tập thông báo | N4 | KANJI_DEFERRED | N1 | Có chữ 覧 cấp N1, học dạng Kanji ở N1 |
| n4-0537 | 整理します | せいりします | sắp xếp | N4 | KANJI_DEFERRED | N1 | Có chữ 整 cấp N1, học dạng Kanji ở N1 |
| n4-0539 | 双子 | ふたご | cặp sinh đôi | N4 | KANJI_DEFERRED | N2 | Có chữ 双 cấp N2, học dạng Kanji ở N2 |
| n4-0543 | 性格 | せいかく | tính cách | N4 | KANJI_DEFERRED | N3 | Có chữ 性格 cấp N3, học dạng Kanji ở N3 |
| n4-0549 | 不思議 | ふしぎ | bí ẩn; kỳ thú; khó hiểu | N4 | KANJI_DEFERRED | N3 | Có chữ 議 cấp N3, học dạng Kanji ở N3 |
| n4-0551 | 焼けます | やけます | cháy | N4 | KANJI_DEFERRED | N2 | Có chữ 焼 cấp N2, học dạng Kanji ở N2 |
| n4-0557 | 遅刻します | ちこくします | đến chậm; đến muộn | N4 | KANJI_DEFERRED | N3 | Có chữ 遅刻 cấp N3, học dạng Kanji ở N3 |
| n4-0558 | 早退します | そうたいします | về sớm; ra sớm | N4 | KANJI_DEFERRED | N3 | Có chữ 退 cấp N3, học dạng Kanji ở N3 |
| n4-0559 | 離婚します | りこんします | ly dị; ly hôn | N4 | KANJI_DEFERRED | N1 | Có chữ 離 cấp N1, học dạng Kanji ở N1 |
| n4-0560 | 複雑 | ふくざつ | phức tạp | N4 | KANJI_DEFERRED | N2 | Có chữ 複 cấp N2, học dạng Kanji ở N2 |
| n4-0561 | 邪魔 | じゃま | cản trở; chiếm diện tích | N4 | KANJI_DEFERRED | N1 | Có chữ 邪魔 cấp N1, học dạng Kanji ở N1 |
| n4-0562 | 汚い | きたない | bẩn | N4 | KANJI_DEFERRED | N2 | Có chữ 汚 cấp N2, học dạng Kanji ở N2 |
| n4-0563 | 恥ずかしい | はずかしい | xấu hổ; thẹn | N4 | KANJI_DEFERRED | N3 | Có chữ 恥 cấp N3, học dạng Kanji ở N3 |
| n4-0566 | 事故 | じこ | tai nạn; sự cố | N4 | KANJI_DEFERRED | N1 | Có chữ 故 cấp N1, học dạng Kanji ở N1 |
| n4-0567 | 見合い | みあい | nam nữ làm quen qua giới thiệu | N4 | KANJI_DEFERRED | N3 | Có chữ 合 cấp N3, học dạng Kanji ở N3 |
| n4-0571 | 号室 | ごうしつ | phòng số ~ | N4 | KANJI_DEFERRED | N3 | Có chữ 号 cấp N3, học dạng Kanji ở N3 |
| n4-0572 | 汗 | あせ | mồ hôi | N4 | KANJI_DEFERRED | N2 | Có chữ 汗 cấp N2, học dạng Kanji ở N2 |
| n4-0575 | 大勢 | おおぜい | nhiều người | N4 | KANJI_DEFERRED | N2 | Có chữ 勢 cấp N2, học dạng Kanji ở N2 |
| n4-0577 | 伺います | うかがいます | tôi đến thăm | N4 | KANJI_DEFERRED | N2 | Có chữ 伺 cấp N2, học dạng Kanji ở N2 |
| n4-0581 | 並びます | ならびます | xếp hàng | N4 | KANJI_DEFERRED | N2 | Có chữ 並 cấp N2, học dạng Kanji ở N2 |
| n4-0584 | 西洋化します | せいようかします | tây âu hóa | N4 | KANJI_DEFERRED | N3 | Có chữ 化 cấp N3, học dạng Kanji ở N3 |
| n4-0585 | 合います | あいます | vừa; hợp | N4 | KANJI_DEFERRED | N3 | Có chữ 合 cấp N3, học dạng Kanji ở N3 |
| n4-0587 | 成人式 | せいじんしき | lễ trưởng thành | N4 | KANJI_DEFERRED | N3 | Có chữ 成式 cấp N3, học dạng Kanji ở N3 |
| n4-0588 | 数えます | かぞえます | đếm | N4 | KANJI_DEFERRED | N3 | Có chữ 数 cấp N3, học dạng Kanji ở N3 |
| n4-0589 | 測ります | はかります | đo; cân | N4 | KANJI_DEFERRED | N2 | Có chữ 測 cấp N2, học dạng Kanji ở N2 |
| n4-0590 | 確かめます | たしかめます | xác nhận | N4 | KANJI_DEFERRED | N3 | Có chữ 確 cấp N3, học dạng Kanji ở N3 |
| n4-0592 | 到着します | とうちゃくします | đến; đến nơi | N4 | KANJI_DEFERRED | N3 | Có chữ 到 cấp N3, học dạng Kanji ở N3 |
| n4-0593 | 酔います | よいます | say | N4 | KANJI_DEFERRED | N1 | Có chữ 酔 cấp N1, học dạng Kanji ở N1 |
| n4-0594 | 危険 | きけん | nguy hiểm | N4 | KANJI_DEFERRED | N3 | Có chữ 危険 cấp N3, học dạng Kanji ở N3 |
| n4-0595 | 忘年会 | ぼうねんかい | tiệc tất niên | N4 | KANJI_DEFERRED | N3 | Có chữ 忘 cấp N3, học dạng Kanji ở N3 |
| n4-0597 | 二次会 | にじかい | bữa tiệc thứ hai; tăng hai | N4 | KANJI_DEFERRED | N3 | Có chữ 次 cấp N3, học dạng Kanji ở N3 |
| n4-0601 | 表 | おもて | phía trước; mặt trước | N4 | KANJI_DEFERRED | N3 | Có chữ 表 cấp N3, học dạng Kanji ở N3 |
| n4-0602 | 裏 | うら | phía sau; mặt sau | N4 | KANJI_DEFERRED | N2 | Có chữ 裏 cấp N2, học dạng Kanji ở N2 |
| n4-0603 | 返事 | へんじ | hồi âm; trả lời | N4 | KANJI_DEFERRED | N3 | Có chữ 返 cấp N3, học dạng Kanji ở N3 |
| n4-0604 | 申し込み | もうしこみ | đăng ký | N4 | KANJI_DEFERRED | N3 | Có chữ 申込 cấp N3, học dạng Kanji ở N3 |
| n4-0605 | 本当 | ほんとう | thật | N4 | KANJI_DEFERRED | N3 | Có chữ 当 cấp N3, học dạng Kanji ở N3 |
| n4-0607 | 傷 | きず | vết thương | N4 | KANJI_DEFERRED | N1 | Có chữ 傷 cấp N1, học dạng Kanji ở N1 |
| n4-0613 | 便 | びん | chuyến bay ~ | N4 | KANJI_DEFERRED | N3 | Có chữ 便 cấp N3, học dạng Kanji ở N3 |
| n4-0614 | 号 | ごう | số ~ | N4 | KANJI_DEFERRED | N3 | Có chữ 号 cấp N3, học dạng Kanji ở N3 |
| n4-0623 | 成績 | せいせき | kết quả; thành tích | N4 | KANJI_DEFERRED | N2 | Có chữ 績 cấp N2, học dạng Kanji ở N2 |
| n4-0625 | 様子 | ようす | vẻ; tình hình | N4 | KANJI_DEFERRED | N3 | Có chữ 様 cấp N3, học dạng Kanji ở N3 |
| n4-0626 | 事件 | じけん | vụ án | N4 | KANJI_DEFERRED | N3 | Có chữ 件 cấp N3, học dạng Kanji ở N3 |
| n4-0628 | 爆弾 | ばくだん | bom | N4 | KANJI_DEFERRED | N1 | Có chữ 弾 cấp N1, học dạng Kanji ở N1 |
| n4-0629 | 積みます | つみます | chuyển lên; xếp hàng lên | N4 | KANJI_DEFERRED | N3 | Có chữ 積 cấp N3, học dạng Kanji ở N3 |
| n4-0634 | 犯人 | はんにん | thủ phạm | N4 | KANJI_DEFERRED | N3 | Có chữ 犯 cấp N3, học dạng Kanji ở N3 |
| n4-0639 | 取り替えます | とりかえます | đổi; thay | N4 | KANJI_DEFERRED | N2 | Có chữ 替 cấp N2, học dạng Kanji ở N2 |
| n4-0642 | お祝い | おいわい | quà; quà mừng | N4 | KANJI_DEFERRED | N2 | Có chữ 祝 cấp N2, học dạng Kanji ở N2 |
| n4-0643 | お年玉 | おとしだま | tiền mừng tuổi | N4 | KANJI_DEFERRED | N2 | Có chữ 玉 cấp N2, học dạng Kanji ở N2 |
| n4-0644 | お見舞い | おみまい | thăm người ốm | N4 | KANJI_DEFERRED | N3 | Có chữ 舞 cấp N3, học dạng Kanji ở N3 |
| n4-0645 | 興味 | きょうみ | quan tâm | N4 | KANJI_DEFERRED | N1 | Có chữ 興 cấp N1, học dạng Kanji ở N1 |
| n4-0646 | 情報 | じょうほう | thông tin | N4 | KANJI_DEFERRED | N3 | Có chữ 情報 cấp N3, học dạng Kanji ở N3 |
| n4-0647 | 文法 | ぶんぽう | ngữ pháp | N4 | KANJI_DEFERRED | N3 | Có chữ 法 cấp N3, học dạng Kanji ở N3 |
| n4-0652 | 絵本 | えほん | truyện tranh | N4 | KANJI_DEFERRED | N3 | Có chữ 絵 cấp N3, học dạng Kanji ở N3 |
| n4-0653 | 絵はがき | えはがき | bưu ảnh | N4 | KANJI_DEFERRED | N3 | Có chữ 絵 cấp N3, học dạng Kanji ở N3 |
| n4-0656 | 靴下 | くつした | vớ | N4 | KANJI_DEFERRED | N3 | Có chữ 靴 cấp N3, học dạng Kanji ở N3 |
| n4-0657 | 手袋 | てぶくろ | găng tay | N4 | KANJI_DEFERRED | N2 | Có chữ 袋 cấp N2, học dạng Kanji ở N2 |
| n4-0658 | 指輪 | ゆびわ | nhẫn | N4 | KANJI_DEFERRED | N2 | Có chữ 輪 cấp N2, học dạng Kanji ở N2 |
| n4-0660 | 祖父 | そふ | ông (của mình) | N4 | KANJI_DEFERRED | N3 | Có chữ 祖 cấp N3, học dạng Kanji ở N3 |
| n4-0661 | 祖母 | そぼ | bà (của mình) | N4 | KANJI_DEFERRED | N3 | Có chữ 祖 cấp N3, học dạng Kanji ở N3 |
| n4-0662 | 孫 | まご | cháu | N4 | KANJI_DEFERRED | N2 | Có chữ 孫 cấp N2, học dạng Kanji ở N2 |
| n4-0669 | 申し訳ありません | もうしわけありません | xin lỗi (trang trọng) | N4 | KANJI_DEFERRED | N1 | Có chữ 訳 cấp N1, học dạng Kanji ở N1 |
| n4-0670 | 預かります | あずかります | bảo quản; giữ giùm | N4 | KANJI_DEFERRED | N2 | Có chữ 預 cấp N2, học dạng Kanji ở N2 |
| n4-0672 | 助かります | たすかります | được giúp đỡ | N4 | KANJI_DEFERRED | N3 | Có chữ 助 cấp N3, học dạng Kanji ở N3 |
| n4-0673 | 昔話 | むかしばなし | truyền thuyết; cổ tích | N4 | KANJI_DEFERRED | N3 | Có chữ 昔 cấp N3, học dạng Kanji ở N3 |
| n4-0677 | 亀 | かめ | con rùa | N4 | KANJI_DEFERRED | N1 | Có chữ 亀 cấp N1, học dạng Kanji ở N1 |
| n4-0678 | 助けます | たすけます | cứu; giúp | N4 | KANJI_DEFERRED | N3 | Có chữ 助 cấp N3, học dạng Kanji ở N3 |
| n4-0679 | 城 | しろ | lâu đài; thành | N4 | KANJI_DEFERRED | N2 | Có chữ 城 cấp N2, học dạng Kanji ở N2 |
| n4-0680 | お姫様 | おひめさま | công chúa | N4 | KANJI_DEFERRED | N1 | Có chữ 姫 cấp N1, học dạng Kanji ở N1 |
| n4-0682 | 暮らします | くらします | sống | N4 | KANJI_DEFERRED | N3 | Có chữ 暮 cấp N3, học dạng Kanji ở N3 |
| n4-0683 | 陸 | りく | lục địa | N4 | KANJI_DEFERRED | N2 | Có chữ 陸 cấp N2, học dạng Kanji ở N2 |
| n4-0684 | 煙 | けむり | khói | N4 | KANJI_DEFERRED | N3 | Có chữ 煙 cấp N3, học dạng Kanji ở N3 |
| n4-0686 | 中身 | なかみ | nội dung; bên trong | N4 | KANJI_DEFERRED | N3 | Có chữ 身 cấp N3, học dạng Kanji ở N3 |
| n4-0687 | 包みます | つつみます | bọc; gói | N4 | KANJI_DEFERRED | N2 | Có chữ 包 cấp N2, học dạng Kanji ở N2 |
| n4-0688 | 沸かします | わかします | đun sôi | N4 | KANJI_DEFERRED | N2 | Có chữ 沸 cấp N2, học dạng Kanji ở N2 |
| n4-0689 | 混ぜます | まぜます | trộn; khuấy | N4 | KANJI_DEFERRED | N2 | Có chữ 混 cấp N2, học dạng Kanji ở N2 |
| n4-0690 | 計算します | けいさんします | tính toán | N4 | KANJI_DEFERRED | N2 | Có chữ 算 cấp N2, học dạng Kanji ở N2 |
| n4-0691 | 厚い | あつい | dày | N4 | KANJI_DEFERRED | N2 | Có chữ 厚 cấp N2, học dạng Kanji ở N2 |
| n4-0692 | 薄い | うすい | mỏng | N4 | KANJI_DEFERRED | N2 | Có chữ 薄 cấp N2, học dạng Kanji ở N2 |
| n4-0693 | 弁護士 | べんごし | luật sư | N4 | KANJI_DEFERRED | N1 | Có chữ 弁護士 cấp N1, học dạng Kanji ở N1 |
| n4-0695 | 教育 | きょういく | giáo dục | N4 | KANJI_DEFERRED | N3 | Có chữ 育 cấp N3, học dạng Kanji ở N3 |
| n4-0696 | 文化 | ぶんか | văn hóa | N4 | KANJI_DEFERRED | N3 | Có chữ 化 cấp N3, học dạng Kanji ở N3 |
| n4-0698 | 法律 | ほうりつ | pháp luật | N4 | KANJI_DEFERRED | N2 | Có chữ 律 cấp N2, học dạng Kanji ở N2 |
| n4-0699 | 戦争 | せんそう | chiến tranh | N4 | KANJI_DEFERRED | N3 | Có chữ 戦争 cấp N3, học dạng Kanji ở N3 |
| n4-0700 | 平和 | へいわ | hòa bình | N4 | KANJI_DEFERRED | N3 | Có chữ 平和 cấp N3, học dạng Kanji ở N3 |
| n4-0701 | 目的 | もくてき | mục đích | N4 | KANJI_DEFERRED | N3 | Có chữ 的 cấp N3, học dạng Kanji ở N3 |
| n4-0702 | 論文 | ろんぶん | luận văn | N4 | KANJI_DEFERRED | N3 | Có chữ 論 cấp N3, học dạng Kanji ở N3 |
| n4-0703 | 関係 | かんけい | quan hệ | N4 | KANJI_DEFERRED | N3 | Có chữ 関係 cấp N3, học dạng Kanji ở N3 |
| n4-0706 | 栓抜き | せんぬき | cái mở nút chai | N4 | KANJI_DEFERRED | N1 | Có chữ 栓 cấp N1, học dạng Kanji ở N1 |
| n4-0707 | 缶切り | かんきり | đồ mở đồ hộp | N4 | KANJI_DEFERRED | N2 | Có chữ 缶 cấp N2, học dạng Kanji ở N2 |
| n4-0708 | 缶詰 | かんづめ | đồ hộp | N4 | KANJI_DEFERRED | N2 | Có chữ 缶詰 cấp N2, học dạng Kanji ở N2 |
| n4-0711 | 体温計 | たいおんけい | cặp nhiệt độ | N4 | KANJI_DEFERRED | N2 | Có chữ 温 cấp N2, học dạng Kanji ở N2 |
| n4-0722 | 調査 | ちょうさ | điều tra | N4 | KANJI_DEFERRED | N2 | Có chữ 査 cấp N2, học dạng Kanji ở N2 |
| n4-0726 | 増えます | ふえます | tăng; tăng lên (xuất khẩu) | N4 | KANJI_DEFERRED | N3 | Có chữ 増 cấp N3, học dạng Kanji ở N3 |
| n4-0727 | 減ります | へります | giảm; giảm xuống (xuất khẩu) | N4 | KANJI_DEFERRED | N2 | Có chữ 減 cấp N2, học dạng Kanji ở N2 |
| n4-0732 | 落ちます | おちます | rơi | N4 | KANJI_DEFERRED | N3 | Có chữ 落 cấp N3, học dạng Kanji ở N3 |
| n4-0733 | 丈夫 | じょうぶ | chắc; bền | N4 | KANJI_DEFERRED | N1 | Có chữ 丈 cấp N1, học dạng Kanji ở N1 |
| n4-0734 | 変 | へん | lạ; kì quặc | N4 | KANJI_DEFERRED | N3 | Có chữ 変 cấp N3, học dạng Kanji ở N3 |
| n4-0735 | 幸せ | しあわせ | hạnh phúc | N4 | KANJI_DEFERRED | N3 | Có chữ 幸 cấp N3, học dạng Kanji ở N3 |
| n4-0740 | 暖房 | だんぼう | thiết bị làm ấm; lò sưởi; máy điều hòa | N4 | KANJI_DEFERRED | N1 | Có chữ 暖房 cấp N1, học dạng Kanji ở N1 |
| n4-0741 | 冷房 | れいぼう | thiết bị làm mát; máy điều hòa | N4 | KANJI_DEFERRED | N1 | Có chữ 房 cấp N1, học dạng Kanji ở N1 |
| n4-0746 | 適当 | てきとう | thích hợp; vừa phải | N4 | KANJI_DEFERRED | N3 | Có chữ 適当 cấp N3, học dạng Kanji ở N3 |
| n4-0747 | 年齢 | ねんれい | tuổi | N4 | KANJI_DEFERRED | N2 | Có chữ 齢 cấp N2, học dạng Kanji ở N2 |
| n4-0748 | 収入 | しゅうにゅう | thu nhập | N4 | KANJI_DEFERRED | N3 | Có chữ 収 cấp N3, học dạng Kanji ở N3 |
| n4-0754 | 泣きます | なきます | khóc | N4 | KANJI_DEFERRED | N1 | Có chữ 泣 cấp N1, học dạng Kanji ở N1 |
| n4-0755 | 笑います | わらいます | cười | N4 | KANJI_DEFERRED | N3 | Có chữ 笑 cấp N3, học dạng Kanji ở N3 |
| n4-0756 | 乾きます | かわきます | khô | N4 | KANJI_DEFERRED | N2 | Có chữ 乾 cấp N2, học dạng Kanji ở N2 |
| n4-0758 | 滑ります | すべります | trượt chân | N4 | KANJI_DEFERRED | N1 | Có chữ 滑 cấp N1, học dạng Kanji ở N1 |
| n4-0760 | 調節します | ちょうせつします | điều chỉnh | N4 | KANJI_DEFERRED | N1 | Có chữ 節 cấp N1, học dạng Kanji ở N1 |
| n4-0761 | 丁寧 | ていねい | lịch sự; cẩn thận | N4 | KANJI_DEFERRED | N1 | Có chữ 丁寧 cấp N1, học dạng Kanji ở N1 |
| n4-0762 | 細かい | こまかい | nhỏ | N4 | KANJI_DEFERRED | N2 | Có chữ 細 cấp N2, học dạng Kanji ở N2 |
| n4-0763 | 濃い | こい | đậm; nồng | N4 | KANJI_DEFERRED | N2 | Có chữ 濃 cấp N2, học dạng Kanji ở N2 |
| n4-0765 | 涙 | なみだ | nước mắt | N4 | KANJI_DEFERRED | N2 | Có chữ 涙 cấp N2, học dạng Kanji ở N2 |
| n4-0766 | 和食 | わしょく | món ăn Nhật | N4 | KANJI_DEFERRED | N3 | Có chữ 和 cấp N3, học dạng Kanji ở N3 |
| n4-0769 | 量 | りょう | lượng | N4 | KANJI_DEFERRED | N2 | Có chữ 量 cấp N2, học dạng Kanji ở N2 |
| n4-0770 | 倍 | ばい | lần | N4 | KANJI_DEFERRED | N2 | Có chữ 倍 cấp N2, học dạng Kanji ở N2 |
| n4-0775 | 洗濯物 | せんたくもの | đồ giặt | N4 | KANJI_DEFERRED | N2 | Có chữ 濯 cấp N2, học dạng Kanji ở N2 |
| n4-0776 | 理由 | りゆう | lý do | N4 | KANJI_DEFERRED | N3 | Có chữ 由 cấp N3, học dạng Kanji ở N3 |
| n4-0784 | 嫌がります | いやがります | ghét | N4 | KANJI_DEFERRED | N1 | Có chữ 嫌 cấp N1, học dạng Kanji ở N1 |
| n4-0785 | 順序 | じゅんじょ | thứ tự | N4 | KANJI_DEFERRED | N1 | Có chữ 序 cấp N1, học dạng Kanji ở N1 |
| n4-0786 | 表現 | ひょうげん | cách nói | N4 | KANJI_DEFERRED | N3 | Có chữ 表現 cấp N3, học dạng Kanji ở N3 |
| n4-0789 | 縁起が悪い | えんぎがわるい | điềm xấu; không may | N4 | KANJI_DEFERRED | N1 | Có chữ 縁 cấp N1, học dạng Kanji ở N1 |
| n4-0790 | 謝ります | あやまります | xin lỗi; tạ lỗi | N4 | KANJI_DEFERRED | N1 | Có chữ 謝 cấp N1, học dạng Kanji ở N1 |
| n4-0792 | 信じます | しんじます | tin; tin tưởng | N4 | KANJI_DEFERRED | N3 | Có chữ 信 cấp N3, học dạng Kanji ở N3 |
| n4-0796 | 保証書 | ほしょうしょ | giấy bảo hành | N4 | KANJI_DEFERRED | N1 | Có chữ 保証 cấp N1, học dạng Kanji ở N1 |
| n4-0797 | 領収書 | りょうしゅうしょ | hóa đơn | N4 | KANJI_DEFERRED | N2 | Có chữ 領 cấp N2, học dạng Kanji ở N2 |
| n4-0798 | 贈り物 | おくりもの | quà tặng | N4 | KANJI_DEFERRED | N2 | Có chữ 贈 cấp N2, học dạng Kanji ở N2 |
| n4-0799 | 間違い電話 | まちがいでんわ | điện thoại nhầm | N4 | KANJI_DEFERRED | N3 | Có chữ 違 cấp N3, học dạng Kanji ở N3 |
| n4-0801 | 係 | かかり | nhân viên; người phụ trách | N4 | KANJI_DEFERRED | N3 | Có chữ 係 cấp N3, học dạng Kanji ở N3 |
| n4-0803 | 点 | てん | điểm | N4 | KANJI_DEFERRED | N3 | Có chữ 点 cấp N3, học dạng Kanji ở N3 |
| n4-0805 | 札 | さつ | tờ tiền giấy | N4 | KANJI_DEFERRED | N2 | Có chữ 札 cấp N2, học dạng Kanji ở N2 |
| n4-0808 | 係員 | かかりいん | nhân viên | N4 | KANJI_DEFERRED | N3 | Có chữ 係 cấp N3, học dạng Kanji ở N3 |
| n4-0811 | 優勝します | ゆうしょうします | vô địch; giải nhất | N4 | KANJI_DEFERRED | N3 | Có chữ 優勝 cấp N3, học dạng Kanji ở N3 |
| n4-0812 | 悩み | なやみ | điều lo nghĩ; trăn trở; phiền muộn | N4 | KANJI_DEFERRED | N2 | Có chữ 悩 cấp N2, học dạng Kanji ở N2 |
| n4-0813 | 目覚まし | めざまし | đồng hồ báo thức | N4 | KANJI_DEFERRED | N3 | Có chữ 覚 cấp N3, học dạng Kanji ở N3 |
| n4-0818 | 焼きます | やきます | nướng; rán | N4 | KANJI_DEFERRED | N2 | Có chữ 焼 cấp N2, học dạng Kanji ở N2 |
| n4-0819 | 渡します | わたします | trao; giao cho | N4 | KANJI_DEFERRED | N3 | Có chữ 渡 cấp N3, học dạng Kanji ở N3 |
| n4-0821 | 宅配便 | たくはいびん | dịch vụ trao tận nhà | N4 | KANJI_DEFERRED | N3 | Có chữ 宅配便 cấp N3, học dạng Kanji ở N3 |
| n4-0822 | 原因 | げんいん | nguyên nhân | N4 | KANJI_DEFERRED | N3 | Có chữ 原因 cấp N3, học dạng Kanji ở N3 |
| n4-0823 | 注射 | ちゅうしゃ | tiêm | N4 | KANJI_DEFERRED | N1 | Có chữ 射 cấp N1, học dạng Kanji ở N1 |
| n4-0824 | 食欲 | しょくよく | sự thèm ăn | N4 | KANJI_DEFERRED | N3 | Có chữ 欲 cấp N3, học dạng Kanji ở N3 |
| n4-0832 | 具合 | ぐあい | trạng thái; tình trạng | N4 | KANJI_DEFERRED | N3 | Có chữ 具合 cấp N3, học dạng Kanji ở N3 |
| n4-0834 | 向かいます | むかいます | hướng về | N4 | KANJI_DEFERRED | N3 | Có chữ 向 cấp N3, học dạng Kanji ở N3 |
| n4-0836 | 知識 | ちしき | tri thức; kiến thức | N4 | KANJI_DEFERRED | N3 | Có chữ 識 cấp N3, học dạng Kanji ở N3 |
| n4-0837 | 宝庫 | ほうこ | kho báu | N4 | KANJI_DEFERRED | N2 | Có chữ 宝庫 cấp N2, học dạng Kanji ở N2 |
| n4-0840 | 一部分 | いちぶぶん | một bộ phận | N4 | KANJI_DEFERRED | N3 | Có chữ 部 cấp N3, học dạng Kanji ở N3 |
| n4-0842 | 秒 | びょう | giây | N4 | KANJI_DEFERRED | N2 | Có chữ 秒 cấp N2, học dạng Kanji ở N2 |
| n4-0845 | 天気予報 | てんきよほう | dự báo thời tiết | N4 | KANJI_DEFERRED | N3 | Có chữ 予報 cấp N3, học dạng Kanji ở N3 |
| n4-0846 | 発表 | はっぴょう | công bố; thuyết trình | N4 | KANJI_DEFERRED | N3 | Có chữ 表 cấp N3, học dạng Kanji ở N3 |
| n4-0847 | 実験 | じっけん | thí nghiệm; thực nghiệm | N4 | KANJI_DEFERRED | N3 | Có chữ 実 cấp N3, học dạng Kanji ở N3 |
| n4-0850 | 科学 | かがく | khoa học | N4 | KANJI_DEFERRED | N3 | Có chữ 科 cấp N3, học dạng Kanji ở N3 |
| n4-0854 | 救急車 | きゅうきゅうしゃ | xe cứu thương | N4 | KANJI_DEFERRED | N1 | Có chữ 救 cấp N1, học dạng Kanji ở N1 |
| n4-0855 | 賛成 | さんせい | tán thành; đồng ý | N4 | KANJI_DEFERRED | N3 | Có chữ 賛成 cấp N3, học dạng Kanji ở N3 |
| n4-0856 | 反対 | はんたい | phản đối | N4 | KANJI_DEFERRED | N3 | Có chữ 反対 cấp N3, học dạng Kanji ở N3 |
| n4-0857 | 男性 | だんせい | phái nam | N4 | KANJI_DEFERRED | N3 | Có chữ 性 cấp N3, học dạng Kanji ở N3 |
| n4-0858 | 女性 | じょせい | phái nữ | N4 | KANJI_DEFERRED | N3 | Có chữ 性 cấp N3, học dạng Kanji ở N3 |
| n4-0860 | 知り合います | しりあいます | quen biết | N4 | KANJI_DEFERRED | N3 | Có chữ 合 cấp N3, học dạng Kanji ở N3 |
| n4-0861 | 平均寿命 | へいきんじゅみょう | tuổi thọ bình quân | N4 | KANJI_DEFERRED | N1 | Có chữ 寿 cấp N1, học dạng Kanji ở N1 |
| n4-0862 | 比べます | くらべます | so sánh | N4 | KANJI_DEFERRED | N2 | Có chữ 比 cấp N2, học dạng Kanji ở N2 |
| n4-0863 | 博士 | はかせ | tiến sĩ | N4 | KANJI_DEFERRED | N1 | Có chữ 博士 cấp N1, học dạng Kanji ở N1 |
| n4-0864 | 脳 | のう | não | N4 | KANJI_DEFERRED | N2 | Có chữ 脳 cấp N2, học dạng Kanji ở N2 |
| n4-0866 | 化粧品 | けしょうひん | mỹ phẩm | N4 | KANJI_DEFERRED | N1 | Có chữ 粧 cấp N1, học dạng Kanji ở N1 |
| n4-0867 | 調べ | しらべ | cuộc điều tra; nghiên cứu | N4 | KANJI_DEFERRED | N3 | Có chữ 調 cấp N3, học dạng Kanji ở N3 |
| n4-0868 | 化粧 | けしょう | trang điểm | N4 | KANJI_DEFERRED | N1 | Có chữ 粧 cấp N1, học dạng Kanji ở N1 |
| n4-0869 | 降ろします | おろします | cho xuống; hạ xuống | N4 | KANJI_DEFERRED | N3 | Có chữ 降 cấp N3, học dạng Kanji ở N3 |
| n4-0870 | 届けます | とどけます | gửi đến; chuyển đến | N4 | KANJI_DEFERRED | N2 | Có chữ 届 cấp N2, học dạng Kanji ở N2 |
| n4-0873 | 生徒 | せいと | học trò | N4 | KANJI_DEFERRED | N3 | Có chữ 徒 cấp N3, học dạng Kanji ở N3 |
| n4-0879 | 久しぶり | ひさしぶり | sau khoảng thời gian dài | N4 | KANJI_DEFERRED | N2 | Có chữ 久 cấp N2, học dạng Kanji ở N2 |
| n4-0880 | 営業 | えいぎょう | kinh doanh | N4 | KANJI_DEFERRED | N2 | Có chữ 営 cấp N2, học dạng Kanji ở N2 |
| n4-0887 | 競走します | きょうそうします | chạy đua | N4 | KANJI_DEFERRED | N2 | Có chữ 競 cấp N2, học dạng Kanji ở N2 |
| n4-0889 | 芸 | げい | trò diễn; tiết mục; tài năng | N4 | KANJI_DEFERRED | N2 | Có chữ 芸 cấp N2, học dạng Kanji ở N2 |
| n4-0890 | 姿 | すがた | dáng hình; tư thế | N4 | KANJI_DEFERRED | N1 | Có chữ 姿 cấp N1, học dạng Kanji ở N1 |
