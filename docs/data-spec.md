# Data spec: `kanji` và `vocabularies`

Tài liệu này là **data contract** giữa file data, database schema (Supabase/Postgres) và seed script.
Migration và seed script phải khớp với tài liệu này. Khi data thay đổi cấu trúc, cập nhật tài liệu này trước.

- Cập nhật: 2026-11-01
- File data hiện tại: `kanji.csv` (516 chữ), `vocabularies.csv` (912 từ). Bảng `vocabulary_kanji` (927 liên kết) được tạo bằng SQL, không có file data

---

## 1. Nguyên tắc chung

1. **Mỗi dòng có một khoá ổn định (stable key) nằm trong file data**, không bao giờ đổi và không bao giờ tái sử dụng.
   - `kanji`: `character`
   - `vocabularies`: `code`
2. **Khoá chính nội bộ (`id`, UUID) do database sinh**, không có trong file data. Các bảng khác (tiến độ, SRS card...) tham chiếu `id`.
3. **Seed script dùng upsert theo khoá ổn định**, không xoá rồi chèn lại. Nhờ vậy `id` của mỗi dòng giữ nguyên qua mọi lần seed, và tiến độ người học không bị mất.
4. **Seed script không tự xoá dòng** khi một từ biến mất khỏi file. Việc gỡ một từ khỏi app là quyết định riêng, phải xử lý cả tiến độ đã có.
5. **Ô trống trong CSV được ghi thành `NULL`.** Không dùng `null`, `-`, `N/A` hay dấu cách trong file. Seed script phải tự chuyển `""` thành `NULL`, không dựa vào công cụ import (trình import CSV của Supabase gửi `""`, gây lỗi với cột số và để lại chuỗi rỗng ở cột `text`).
6. **`NULL` khác mảng rỗng `{}`**: `NULL` là "chưa biết", `{}` là "biết chắc là không có". Seed script không được đổi `{}` thành `NULL`.
7. **Encoding**: UTF-8, nên không có BOM. Xuống dòng CRLF hoặc LF đều được.

---

## 2. Bảng `kanji`

| Cột | Kiểu | Bắt buộc? | Quy tắc | Ví dụ |
|---|---|---|---|---|
| `character` | `text` | Có | Đúng 1 chữ Kanji, `UNIQUE`. Là khoá ổn định | `学` |
| `han_viet` | `text` | Có | Một âm, viết HOA | `HỌC` |
| `meaning_vi` | `text` | Có | Không rỗng, viết thường chữ đầu (trừ tên riêng) | `học` |
| `onyomi` | `text[]` | Có | Katakana, định dạng mảng Postgres | `{"ガク"}` |
| `kunyomi` | `text[]` | Có | Hiragana, dấu `.` ngăn phần okurigana. **`{}` nếu chữ không có kunyomi** | `{"まな.ぶ"}` |
| `stroke_count` | `smallint` | Không | Số nét. Hiện tại `NULL` cho cả 516 chữ | `8` |
| `jlpt_level` | `smallint` | Không | Cấp JLPT của chữ, từ 1 đến 5. `5` cho 145 chữ N5 gốc, `NULL` cho 371 chữ bổ sung (chưa xác định) | `5` |

Ghi chú:
- Bảng gồm **mọi Kanji xuất hiện trong từ vựng** (499 chữ) cộng với 17 chữ N5 chưa dùng trong từ vựng nào (火, 口, 夕...), tổng 516 chữ.
- 371 chữ bổ sung: âm Hán Việt lấy từ `vocabularies.han_viet`; âm On, âm Kun và nghĩa do Claude soạn, đã đối chiếu với cách đọc của 912 từ vựng nhưng **chưa được rà soát thủ công**.
- `jlpt_level` để `NULL` cho chữ bổ sung, vì không có nguồn đáng tin để gán cấp lúc soạn. Cần điền khi làm module Kanji.
- 12 chữ N5 có `kunyomi = {}` (ví dụ 百, 万, 週, 校, 気, 肉, 茶, 電). Đây là dữ liệu đúng, không phải thiếu.
- **Không import `kanji` bằng CSV trên dashboard**: trình import gửi ô trống thành chuỗi `""`, và Postgres từ chối `""` cho cột `smallint`. Dùng câu `insert` có `null` rõ ràng (`02b_import_kanji.sql`), hoặc seed script.

---

## 3. Bảng `vocabularies`

| Cột | Kiểu | Bắt buộc? | Quy tắc | Ví dụ |
|---|---|---|---|---|
| `id` | `uuid` | Có | `default gen_random_uuid()`. **Không có trong file data** | |
| `code` | `text` | Có | Dạng `n5-0001`, `UNIQUE`. Khoá ổn định, không đổi, không tái sử dụng | `n5-0013` |
| `sort_order` | `integer` | Có | Số nguyên dương, `UNIQUE`. Thứ tự trong lộ trình cố định | `13` |
| `expression` | `text` | Có | Cách viết thông dụng (Kanji, kana, hoặc Kanji + kana). **Không phải khoá**: có thể trùng giữa các từ | `学生` |
| `reading_kana` | `text` | Có | Chỉ hiragana, katakana và `ー` | `がくせい` |
| `meaning_vi` | `text` | Có | Không rỗng. Viết thường chữ đầu (trừ tên riêng). Nhiều nghĩa ngăn bằng `; ` | `học sinh; sinh viên` |
| `romaji` | `text` | Không | Nếu có thì phải khớp `reading_kana`, viết thường, chép theo từng chữ kana. Hiện để `NULL` cho mọi từ | `gakusei` |
| `han_viet` | `text` | Có điều kiện | Bắt buộc nếu `expression` có Kanji; `NULL` nếu từ chỉ-kana. Viết HOA, mỗi Kanji một âm, ngăn bằng dấu cách | `HỌC SINH` |
| `is_kana_only` | `boolean` | Có | `true` khi và chỉ khi `expression` không chứa Kanji | `false` |
| `jlpt_level` | `integer` | Có | N5 = `5` | `5` |
| `emoji` | `text` | Không | Một emoji, không khoảng trắng. Để trống với từ trừu tượng | `🏫` |

### `code` và `sort_order` độc lập với nhau

Ban đầu `code` và `sort_order` trùng số cho tiện (`n5-0013` ↔ `13`). Khi đổi thứ tự lộ trình, **chỉ sửa `sort_order`**, `code` giữ nguyên.

**Đổi thứ tự 2 từ trong file có ảnh hưởng tiến độ người học không?** Không. Tiến độ tham chiếu `id`, và `id` được giữ nguyên nhờ upsert theo `code`. Đổi thứ tự chỉ làm thay đổi thứ tự xuất hiện của các từ *chưa học*.

### Từ cùng `expression`, khác cách đọc

Là các từ riêng biệt, mỗi từ một `code`. Hiện có: 人 (じん / ひと / にん), 何 (なん / なに), 日 (にち / ひ), 降ります (ふります / おります), 君 (きみ / くん).

---

## 4. Bảng `vocabulary_kanji` (liên kết từ ↔ Kanji)

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `vocabulary_id` | `uuid` | Tham chiếu `vocabularies.id`. Cùng `position` tạo thành khoá chính |
| `position` | `integer` | Thứ tự của Kanji trong từ, bắt đầu từ 1, khớp thứ tự âm trong `han_viet` |
| `kanji_id` | `uuid` | Tham chiếu `kanji.id` |

- **Không có file data.** Bảng được **suy ra** từ `vocabularies.expression` bằng `03_build_vocabulary_kanji.sql`, và có thể xoá đi tạo lại bất cứ lúc nào.
- Ký tự lặp `々` được tính là chữ đứng trước nó: 時々 → (1, 時), (2, 時).
- Mọi Kanji trong từ vựng đều có trong bảng `kanji`, nên mỗi từ có Kanji đều được liên kết đầy đủ: 927 liên kết cho 586 từ.
- Khi thêm từ vựng mới có Kanji chưa có trong bảng `kanji`, phải bổ sung chữ đó vào `kanji` trước, rồi chạy lại script.
- Âm Hán Việt của từng Kanji trong `vocabularies.han_viet` phải khớp `kanji.han_viet` với những chữ có trong cả hai bảng (hiện tại khớp 100%).

---

## 5. Quy tắc khi dùng data trong app

1. **Chọn đáp án nhiễu (distractor)**: loại mọi từ có `meaning_vi` trùng với đáp án đúng (so sánh sau khi `trim` và viết thường). Hiện còn 3 nhóm trùng nghĩa và cùng cách đọc (`はし`, `かみ`, `かえます`); không được có hai từ khác cách đọc mà trùng nghĩa, vì đề nghĩa ở câu gõ và câu ghép phải chỉ có một đáp án (có test kiểm tra). Xem mục 8.
2. **Từ cùng `expression`**: khi câu hỏi hiển thị `expression` mà không kèm cách đọc, không đưa các từ cùng `expression` làm đáp án nhiễu của nhau.
3. **`NULL` là trạng thái hợp lệ**: UI phải xử lý được `romaji`, `han_viet` (từ chỉ-kana) và `stroke_count` bằng `NULL`.
4. **Mảnh nhiễu của câu ghép Kana**: khoảng một nửa là mảnh dễ nhầm với đáp án (khác dấu `か/が`, nhìn giống `あ/お`, khác cỡ `つ/っ`, đọc gần `す/つ`), khoảng một phần ba là mảnh đặc biệt (`ー`, `っ`, hàng `ぱ`, âm ghép), còn lại là chữ thường. Không mảnh nhiễu nào trùng mảnh đáp án.

---

## 6. Migration v2

### Thay đổi đã làm trực tiếp trên Supabase dashboard (2026-11-01), chưa có trong migration

Migration v2 phải ghi lại đủ các thay đổi này, nếu không thì database dựng lại từ migration sẽ khác database thật (schema drift):

- `vocabularies`: thêm cột `code` (`text`) và `sort_order` (`integer`)
- Tạo bảng `vocabulary_kanji` (`vocabulary_id`, `position`, `kanji_id`), khoá chính (`vocabulary_id`, `position`), khoá ngoại tới `vocabularies.id` và `kanji.id`
- `kanji.jlpt_level`: bỏ `NOT NULL`

### Ràng buộc đề xuất

```sql
alter table vocabularies
  alter column code set not null,
  add constraint vocabularies_code_key unique (code),
  add constraint vocabularies_code_format check (code ~ '^n[1-5]-[0-9]{4}$'),
  alter column sort_order set not null,
  add constraint vocabularies_sort_order_key unique (sort_order),
  add constraint vocabularies_sort_order_positive check (sort_order > 0),
  add constraint vocabularies_reading_kana_only check (reading_kana ~ '^[ぁ-ゖァ-ヺー]+$'),
  add constraint vocabularies_kana_only_flag check (
    is_kana_only = (expression !~ '[一-鿿㐀-䶿々〆]')
  ),
  add constraint vocabularies_han_viet_presence check (
    (is_kana_only and han_viet is null) or (not is_kana_only and han_viet is not null)
  );

alter table kanji
  add constraint kanji_character_key unique (character),
  add constraint kanji_jlpt_level_range check (jlpt_level between 1 and 5);
```

Các kiểm tra khó diễn đạt bằng constraint (số âm Hán Việt bằng số Kanji, Hán Việt khớp bảng `kanji`, nghĩa trùng) do script kiểm tra đảm nhận (mục 7).

---

## 7. Danh sách kiểm tra tự động (chạy trước mỗi lần seed)

- [ ] Header đúng tên và thứ tự cột; mọi dòng đủ số cột
- [ ] `code` đúng định dạng, không trùng
- [ ] `sort_order` là số nguyên dương, không trùng
- [ ] `expression`, `reading_kana`, `meaning_vi` không rỗng
- [ ] `reading_kana` chỉ chứa kana
- [ ] `is_kana_only` khớp việc `expression` có Kanji hay không
- [ ] `han_viet` có/không theo `is_kana_only`; viết HOA
- [ ] Số âm `han_viet` bằng số Kanji trong `expression`
- [ ] Âm Hán Việt từng chữ khớp bảng `kanji`
- [ ] Không có khoảng trắng thừa, `( x )`, `; ;`
- [ ] Không trùng cặp (`expression`, `reading_kana`)
- [ ] Báo cáo (không chặn): nhóm `meaning_vi` trùng nhau, nghĩa chứa chữ Nhật

---

## 8. Danh sách lỗi data

### Đã sửa (2026-11-01)

Chi tiết từng dòng trước/sau: `vocabularies_changes.csv`.

| Loại | Số dòng |
|---|---|
| Viết thường chữ đầu nghĩa và đầu mỗi đoạn sau `;` (giữ hoa cho 25 tên riêng: quốc gia, thành phố, địa danh) | 112 |
| Sửa nội dung | 13 |

Các sửa nội dung:

| Code | Từ | Trước | Sau |
|---|---|---|---|
| n5-0005 | あの方 | Vị này Lịch sự tương đương với あのひと | vị kia (cách nói lịch sự của あのひと) |
| n5-0037 | 韓国 | Hàn quốc | Hàn Quốc |
| n5-0090 | これからお世話になります | Từ này mong được... | từ nay mong được... |
| n5-0096 | こちら | ...cách nói lịch sử... | ...cách nói lịch sự... |
| n5-0193 | バス | xe Buýt | xe buýt |
| n5-0527 | てんぷら | thiếu dấu `)` | đã thêm |
| n5-0586 | 止めます | ôt ô; ôtô | ô tô |
| n5-0613 | さあ | thôi; ; nào; (...) | thôi; nào (...) |
| n5-0677 | まだまだです | nội dung lặp 2 lần | giữ 1 lần |
| n5-0715 | どうしましたか | vần đề | vấn đề |
| n5-0717 | おだいじに | nói vs người | nói với người |
| n5-0787 | 着物 | truyền thông | truyền thống |
| n5-0802 | 色々 | nhiều thứ; ; đa dạng | nhiều thứ; đa dạng |

Ngoài ra đã sửa dấu cách quanh ngoặc ở các dòng như ちゃん, 教師, うん, ううん, けど, 着きます.

### Đã sửa khi dựng bảng `kanji` (2026-11-01)

Âm Hán Việt không chuẩn (sửa ở cả `vocabularies` và `kanji`):

| Code | Từ | Trước | Sau |
|---|---|---|---|
| n5-0074 | 机 | CƠ | KỶ |
| n5-0083 | 違います | VY | VI |
| n5-0104 | 受付 | THÂU PHÓ | THỤ PHÓ |
| n5-0495 | 簡単 | GIẢN ĐAN | GIẢN ĐƠN |
| n5-0554 | 広い | KHOÁT | QUẢNG |
| n5-0690 | 払います | BẬT | PHẤT |
| n5-0726 | 予約します | DƯ ƯỚC | DỰ ƯỚC |
| n5-0860 | 交差点 | GIAO SI ĐIỂM | GIAO SAI ĐIỂM |

Cách đọc sai:

| Code | Từ | Trước | Sau |
|---|---|---|---|
| n5-0705 | 健康保険証 | ほけんしょう | けんこうほけんしょう |
| n5-0727 | 見学します | けんかくします | けんがくします |

Nghĩa của 145 chữ N5 gốc được viết thường chữ đầu cho thống nhất với từ vựng.

### Còn mở (cần quyết định hoặc sửa tay)

1. **Đã xử lý 14/17 nhóm từ trùng nghĩa (2026-11-06, làm rõ nghĩa của 24 từ để đề chỉ có một đáp án); còn 3 nhóm cùng cách đọc `はし`, `かみ`, `かえます`** (app đã có quy tắc ở mục 5 để không sinh câu hỏi 2 đáp án đúng; sửa data giúp người học phân biệt tốt hơn):
   - tối: 晩, 夜, 暗い
   - sáng: 朝, 明るい
   - đường: 砂糖, 道
   - xin mời: どうぞ, いらっしゃい
   - xin lỗi: すみません, ごめんなさい
   - kết thúc: 終わります, 終わり
   - bắt đầu: 始めます, 始め
   - tiếp theo: 次の, 次に
   - cầu: はし, 橋
   - tóc: かみ, 髪
   - xấu: みにくい, 悪い
   - tiền lẻ: 細かいお金, お釣り
   - sau: 後ろ, あとで
   - gần: 近く, 近い
   - biết: 知ります, 知っています
   - áo khoác: 上着, コート
   - đổi: かえます, 変えます
2. **n5-0794 どっち: "ở đâu"** có vẻ sai. どっち là cách nói thân mật của どちら (phía nào; cái nào trong hai cái).
3. **29 nghĩa chứa chữ Nhật** (ghi chú như `(~をします: chơi bóng đá)`). Giữ nguyên; cân nhắc tách sang cột ghi chú riêng nếu chúng làm lộ đáp án trong câu hỏi trắc nghiệm.
4. **Dấu `;` đang dùng thay cho `/` trong một số câu**, ví dụ "anh; chị đã về đấy à" (ý là "anh/chị"). Nếu app tách nghĩa theo `;`, các câu này sẽ bị cắt sai.
5. **`kanji.stroke_count` trống cả 516 dòng, `kanji.jlpt_level` trống ở 371 chữ bổ sung.** Đang để optional; cần nguồn dữ liệu Kanji đáng tin (ví dụ KANJIDIC) khi làm module Kanji.
6. **Âm On/Kun và nghĩa của 371 chữ bổ sung** chưa được người rà soát.
7. **Cột `emoji` (tuỳ chọn)** đã thêm vào cuối `vocabularies.csv` (2026-11-05), gán cho từ cụ thể; từ trừu tượng để trống. Danh sách chưa được người rà soát.

Lưu ý: kiểm tra tự động đảm bảo đúng cấu trúc, nhưng không đảm bảo mọi nghĩa đều chính xác. Các lỗi nội dung ở trên được phát hiện khi đọc lướt, chưa phải rà soát toàn bộ 912 nghĩa.
