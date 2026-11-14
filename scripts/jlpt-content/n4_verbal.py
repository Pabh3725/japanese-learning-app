"""N4 発話表現 (問題4): tình huống (tiếng Việt, thay cho tranh), chọn câu nên nói trong 3 câu. Lựa chọn đúng ở vị trí đầu (app xáo)."""
from jdsl import setup, verbal as V, write

setup('N4')
items = [
    V('N4-VE-01', 'Bạn bị đau đầu và muốn xin trưởng phòng cho về sớm. Bạn nói gì?', '🤕', ['すみません、頭が痛いので、早く帰ってもいいですか。', 'すみません、頭が痛いので、早く帰ってください。', 'すみません、頭が痛いので、早く帰りましょうか。'], 0, '～てもいいですか: xin phép.'),
    V('N4-VE-02', 'Bạn chơi ở nhà người quen và giờ muốn ra về. Bạn nói gì?', '🏠', ['そろそろ失礼します。', 'いらっしゃいませ。', 'どうぞ、お先に。'], 0, 'そろそろ失礼します: tôi xin phép về.'),
    V('N4-VE-03', 'Bạn gõ cửa và bước vào phòng của thầy giáo. Bạn nói gì?', '🚪', ['失礼します。', 'ごちそうさまでした。', 'いってらっしゃい。'], 0, '失礼します: câu nói khi vào phòng người trên.'),
    V('N4-VE-04', 'Bạn xong việc và ra về trước các đồng nghiệp. Bạn nói gì?', '💼', ['お先に失礼します。', 'お疲れさまでした。', 'いただきます。'], 0, 'お先に失礼します: tôi xin phép về trước. (お疲れさまでした là câu đáp lại.)'),
    V('N4-VE-05', 'Đồng nghiệp chào bạn để ra về trước. Bạn đáp lại thế nào?', '👋', ['お疲れさまでした。', 'お先に失礼します。', 'ただいま。'], 0, 'お疲れさまでした: anh/chị vất vả rồi.'),
    V('N4-VE-06', 'Bạn muốn nhờ thầy giáo xem giúp bài văn của mình. Bạn nói gì?', '📝', ['すみません、作文を見ていただけませんか。', 'すみません、作文を見てあげましょうか。', 'すみません、作文を見てもいいですか。'], 0, '～ていただけませんか: nhờ người trên một cách lịch sự.'),
    V('N4-VE-07', 'Bạn của bạn bị ốm và sắp về nhà nghỉ. Bạn nói gì?', '🤒', ['お大事に。', 'おめでとう。', 'いってきます。'], 0, 'お大事に: giữ gìn sức khoẻ nhé.'),
    V('N4-VE-08', 'Trên tàu đông, bạn lỡ giẫm vào chân người bên cạnh. Bạn nói gì?', '🚃', ['あ、すみません。大丈夫ですか。', 'いいえ、どういたしまして。', 'いいえ、けっこうです。'], 0, 'Xin lỗi và hỏi han.'),
    V('N4-VE-09', 'Bạn được mời ăn thêm nhưng đã no rồi. Bạn nói gì?', '🍚', ['いいえ、もうけっこうです。', 'では、いただきます。', 'はい、お願いします。'], 0, 'もうけっこうです: tôi đủ rồi (từ chối lịch sự).'),
    V('N4-VE-10', 'Ở điểm du lịch, bạn muốn nhờ một người chụp ảnh cho mình. Bạn nói gì?', '📷', ['すみません、写真を撮っていただけませんか。', 'すみません、写真を撮りましょうか。', 'すみません、写真を撮ってもいいですか。'], 0, 'Nhờ người khác chụp hộ: ～ていただけませんか.'),
    V('N4-VE-11', 'Thầy giáo nói nhanh, bạn không nghe rõ và muốn thầy nói lại. Bạn nói gì?', '👂', ['すみません、もう一度言っていただけませんか。', 'すみません、もう一度言いましょうか。', 'すみません、もう一度言ってあげます。'], 0, 'Nhờ nói lại: もう一度言っていただけませんか.'),
    V('N4-VE-12', 'Khách đến công ty, bạn mời khách vào phòng. Bạn nói gì?', '🏢', ['どうぞ、お入りください。', 'どうぞ、入ってもいいですか。', 'では、失礼します。'], 0, 'お入りください: mời vào (tôn kính).'),
    V('N4-VE-13', 'Bạn muốn mượn từ điển của thầy giáo. Bạn nói gì?', '📖', ['先生、辞書をお借りしてもいいですか。', '先生、辞書をお貸ししましょうか。', '先生、辞書を借りてください。'], 0, 'お借りしてもいいですか: cho em mượn được không (khiêm nhường).'),
    V('N4-VE-14', 'Đồng nghiệp đang khuân nhiều hộp nặng. Bạn muốn giúp. Bạn nói gì?', '📦', ['手伝いましょうか。', '手伝ってください。', '手伝ってもらいました。'], 0, '～ましょうか: để tôi giúp nhé.'),
    V('N4-VE-15', 'Bạn gọi điện đến công ty ABC và muốn nói chuyện với anh Tanaka. Bạn nói gì?', '📞', ['田中さんをお願いします。', 'はい、田中です。', '田中さんはいらっしゃいません。'], 0, '～さんをお願いします: cho tôi gặp ~.'),
    V('N4-VE-16', 'Bạn của bạn vừa kết hôn. Bạn nói gì?', '💐', ['結婚、おめでとうございます。', 'お大事に。', 'お疲れさまでした。'], 0, 'おめでとうございます: chúc mừng.'),
    V('N4-VE-17', 'Bạn gặp lại thầy giáo cũ sau nhiều năm. Bạn nói gì?', '🙇', ['お久しぶりです。', 'はじめまして。', 'お先に失礼します。'], 0, 'お久しぶりです: lâu rồi không gặp.'),
    V('N4-VE-18', 'Bạn được rủ đi chơi nhưng hôm đó bạn bận. Bạn từ chối thế nào?', '🙅', ['すみません、その日はちょっと用事があって…。', 'はい、ぜひ行きます。', 'いいえ、どういたしまして。'], 0, 'Từ chối khéo: その日はちょっと….'),
    V('N4-VE-19', 'Ở cửa hàng quần áo, bạn muốn mặc thử một chiếc áo. Bạn hỏi nhân viên thế nào?', '👕', ['これ、着てみてもいいですか。', 'これ、着てみてください。', 'これ、着てみましょうか。'], 0, '～てみてもいいですか: thử ~ được không.'),
    V('N4-VE-20', 'Tàu đến ga bạn cần xuống, nhưng nhiều người đứng ở cửa. Bạn nói gì?', '🚪', ['すみません、降ります。', 'すみません、乗ります。', 'どうぞ、お先に。'], 0, 'すみません、降ります: xin lỗi, cho tôi xuống.'),
]
write('N4', 'verbal_expressions', items, approved=True)
