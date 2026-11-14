"""N5 発話表現 (問題4): tình huống (tiếng Việt, thay cho tranh), chọn câu nên nói trong 3 câu. Lựa chọn đúng ở vị trí đầu (app xáo)."""
from jdsl import setup, verbal as V, write

setup('N5')
items = [
    V('N5-VE-01', 'Bạn sắp bắt đầu ăn cơm. Bạn nói gì?', '🍚', ['いただきます。', 'ごちそうさまでした。', 'おやすみなさい。'], 0, 'いただきます: câu nói trước khi ăn.'),
    V('N5-VE-02', 'Bạn vừa ăn xong bữa cơm ở nhà bạn. Bạn nói gì?', '🍽️', ['ごちそうさまでした。', 'いただきます。', 'いってきます。'], 0, 'ごちそうさまでした: câu nói sau khi ăn xong.'),
    V('N5-VE-03', 'Buổi sáng, bạn ra khỏi nhà để đi học. Bạn nói gì với gia đình?', '🚪', ['いってきます。', 'いってらっしゃい。', 'ただいま。'], 0, 'いってきます: người đi nói. (いってらっしゃい là người ở nhà nói.)'),
    V('N5-VE-04', 'Bạn đi học về đến nhà. Bạn nói gì?', '🏠', ['ただいま。', 'おかえりなさい。', 'いってきます。'], 0, 'ただいま: tôi đã về. (おかえりなさい là người ở nhà đáp lại.)'),
    V('N5-VE-05', 'Bạn quên bút và muốn mượn bút của bạn ngồi cạnh. Bạn nói gì?', '🖊️', ['ペンを貸してください。', 'ペンを借りてください。', 'ペンを貸しましょうか。'], 0, '貸してください: hãy cho tôi mượn.'),
    V('N5-VE-06', 'Khách đến nhà, bạn mang trà ra mời. Bạn nói gì?', '🍵', ['お茶をどうぞ。', 'お茶をください。', 'お茶をいただきます。'], 0, '～をどうぞ: mời dùng ~.'),
    V('N5-VE-07', 'Bạn sắp đi ngủ. Bạn nói gì với gia đình?', '😴', ['おやすみなさい。', 'おはようございます。', 'こんばんは。'], 0, 'おやすみなさい: chúc ngủ ngon.'),
    V('N5-VE-08', 'Bạn đến buổi hẹn muộn. Bạn nói gì với bạn?', '⏰', ['遅くなって、すみません。', '遅くなって、ありがとう。', '遅くなって、どういたしまして。'], 0, '遅くなって、すみません: xin lỗi vì đến muộn.'),
    V('N5-VE-09', 'Bạn được thầy giáo tặng một quyển sách. Bạn nói gì?', '🎁', ['ありがとうございます。', 'どういたしまして。', 'いただきます。'], 0, 'ありがとうございます: cảm ơn.'),
    V('N5-VE-10', 'Bạn không biết ga ở đâu và muốn hỏi người đi đường. Bạn nói gì?', '🚉', ['すみません、駅はどこですか。', 'すみません、駅はここです。', 'すみません、駅へ行きましょう。'], 0, 'Hỏi đường: すみません、～はどこですか.'),
    V('N5-VE-11', 'Thầy giáo đang mang nhiều đồ nặng. Bạn muốn giúp. Bạn nói gì?', '🧳', ['持ちましょうか。', '持ってください。', '持ちませんか。'], 0, '～ましょうか: để tôi làm giúp nhé.'),
    V('N5-VE-12', 'Phòng học nóng. Bạn muốn tự mở cửa sổ và xin phép thầy giáo. Bạn nói gì?', '🪟', ['窓を開けてもいいですか。', '窓を開けてください。', '窓を開けましょう。'], 0, '～てもいいですか: xin phép làm ~.'),
    V('N5-VE-13', 'Bạn có bánh ngọt và muốn rủ bạn cùng ăn. Bạn nói gì?', '🍰', ['いっしょにケーキを食べませんか。', 'ケーキを食べてもいいですか。', 'ケーキを食べてください。'], 0, '～ませんか: rủ cùng làm.'),
    V('N5-VE-14', 'Bạn gọi điện đến nhà bạn Tanaka. Có người nhấc máy. Bạn nói gì trước?', '📞', ['もしもし、田中さんのうちですか。', 'もしもし、田中です。', 'では、また。'], 0, 'もしもし、～さんのうちですか: alo, có phải nhà ~ không.'),
    V('N5-VE-15', 'Ở cửa hàng, bạn muốn xem chiếc áo sơ mi trên kệ. Bạn nói gì với nhân viên?', '👕', ['すみません、そのシャツを見せてください。', 'すみません、そのシャツを見てください。', 'すみません、そのシャツを見ましょうか。'], 0, '見せてください: cho tôi xem.'),
    V('N5-VE-16', 'Bạn gặp một người lần đầu tiên. Bạn nói gì?', '🤝', ['はじめまして。', 'さようなら。', 'おやすみなさい。'], 0, 'はじめまして: rất vui được gặp (lần đầu).'),
    V('N5-VE-17', 'Buổi tối, bạn gặp hàng xóm trước nhà. Bạn nói gì?', '🌙', ['こんばんは。', 'おはようございます。', 'おやすみなさい。'], 0, 'こんばんは: chào buổi tối.'),
    V('N5-VE-18', 'Hôm nay là sinh nhật bạn của bạn. Bạn nói gì?', '🎂', ['誕生日、おめでとうございます。', '誕生日、ありがとうございます。', '誕生日、すみません。'], 0, 'おめでとうございます: chúc mừng.'),
    V('N5-VE-19', 'Trên tàu, có một cụ già đứng cạnh bạn. Bạn đứng dậy nhường ghế. Bạn nói gì?', '🚃', ['どうぞ、座ってください。', '座ってもいいですか。', '座りましょうか。'], 0, 'どうぞ、～てください: mời ~.'),
    V('N5-VE-20', 'Bạn muốn biết chiếc túi này giá bao nhiêu. Bạn hỏi nhân viên thế nào?', '👜', ['このかばんはいくらですか。', 'このかばんをください。', 'このかばんはどこですか。'], 0, '～はいくらですか: ~ giá bao nhiêu.'),
]
write('N5', 'verbal_expressions', items, approved=True)
