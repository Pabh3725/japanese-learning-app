"""Xuất file duyệt docs/grammar-review-<từ>-<đến>.md từ data/grammar/lesson-NN.json.
Chạy: python3 -I scripts/grammar-content/review.py 1 5
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NAMES = {
    'particle_choice': 'Chọn trợ từ', 'word_choice': 'Chọn từ phù hợp', 'order': 'Sắp xếp câu', 'form_choice': 'Chọn dạng',
    'meaning_choice': 'Chọn nghĩa', 'translate_build': 'Dịch-ghép câu', 'star': '★ JLPT', 'find_error': 'Tìm chỗ sai',
    'clause_match': 'Ghép hai vế', 'listening': 'Nghe câu', 'form_typing': 'Gõ dạng', 'reply_choice': 'Chọn câu đáp', 'true_false': 'Đúng/Sai',
}
ORDER = list(NAMES)
PUNCT = set('。、？！?!「」　 ')


def exercises(s):
    kinds = {x['kind'] for x in s.get('slots', [])}
    n = sum(1 for p in s['pieces'] if not set(p['t']) <= PUNCT)
    out = {'meaning_choice', 'listening'}
    if 'particle' in kinds: out.add('particle_choice')
    if 'word' in kinds: out.add('word_choice')
    if 'form' in kinds: out |= {'form_choice', 'form_typing'}
    if kinds & {'particle', 'form'}: out.add('true_false')
    if kinds & {'particle', 'form'} and n >= 4: out.add('find_error')
    if n >= 4: out |= {'order', 'star'}
    if n >= 3: out.add('translate_build')
    if 'split' in s: out.add('clause_match')
    if 'prompt' in s: out.add('reply_choice')
    return out


def ruby(pieces):
    return ''.join(f"{p['t']}({p['r']})" if 'r' in p else p['t'] for p in pieces)


def marked(s):
    """Câu với chỗ được hỏi in đậm."""
    idx = {x['piece'] for x in s.get('slots', [])}
    return ''.join(f"**{p['t']}**" if i in idx else p['t'] for i, p in enumerate(s['pieces']))


def line(s):
    out = f"- `{s['code'][-3:]}` mức {s['level']} · {marked(s)} — {s['meaning']}"
    if 'prompt' in s:
        out += f"  \n  Câu hỏi: {''.join(p['t'] for p in s['prompt']['pieces'])} ({s['prompt']['meaning']}) · câu đáp sai: {' / '.join(s['prompt']['distractors'])}"
    for slot in s.get('slots', []):
        p = s['pieces'][slot['piece']]['t']
        out += f"  \n  Hỏi **{p}** ({slot['kind']}{', ' + slot['form'] if slot.get('form') else ''}) · nhiễu: {', '.join(slot['distractors'])}"
        if slot.get('accepted'):
            out += f" · cũng đúng: {', '.join(slot['accepted'])}"
    return out


def main(a, b):
    L = [f'# Duyệt nội dung ngữ pháp bài {a}–{b}\n',
         'Gói G3. Giải thích và câu do Claude tự soạn; danh sách mẫu theo các trang tổng hợp ngữ pháp Minna no Nihongo trên mạng. '
         '{STATUS} Với mỗi mẫu: đọc giải thích và 5 câu tiêu biểu. 25 câu còn lại đã qua kiểm tra tự động; '
         'thấy câu nào sai thì ghi mã câu (ví dụ g01-03-s12) để Claude sửa hoặc ẩn.\n',
         'Cách đọc: chỗ **in đậm** là chỗ được hỏi (trợ từ, dạng です/động từ, hậu tố); "nhiễu" là các đáp án sai chắc chắn ở chỗ đó.\n']
    for lesson in range(a, b + 1):
        f = ROOT / 'data' / 'grammar' / f'lesson-{lesson:02d}.json'
        if not f.exists():
            continue
        data = json.loads(f.read_text(encoding='utf-8'))
        L.append(f'## Bài {lesson}\n')
        for p in data['points']:
            ss = [s for s in p['sentences'] if not s.get('hidden')]
            types = set().union(*(exercises(s) for s in ss))
            levels = [sum(1 for s in ss if s['level'] == lv) for lv in (1, 2, 3)]
            L.append(f"### {p['code']} · {p['pattern']} — {p['meaning']}  {'✅ đã duyệt' if p['approved'] else '⏳ chờ duyệt'}\n")
            L.append(p['explanation'] + '\n')
            if p.get('notes'):
                L.append(f"> Lưu ý: {p['notes']}\n")
            L.append(f"Số câu: {len(ss)} (mức 1: {levels[0]}, mức 2: {levels[1]}, mức 3: {levels[2]}). "
                     f"Dạng bài làm được ({len(types)}/13): {', '.join(NAMES[t] for t in ORDER if t in types)}.\n")
            L.append('**5 câu tiêu biểu**\n')
            L += [line(s) for s in ss if s.get('sample')]
            L.append('\n<details><summary>Toàn bộ 30 câu</summary>\n')
            L += [line(s) for s in ss]
            L.append('\n</details>\n')
    pending = sum(1 for line in L if '⏳ chờ duyệt' in line)
    L[1] = L[1].replace('{STATUS}', f'**Còn {pending} mẫu chờ chủ dự án duyệt.**' if pending else '**Chủ dự án đã duyệt tất cả các mẫu trong file này.**')
    out = ROOT / 'docs' / f'grammar-review-{a:02d}-{b:02d}.md'
    out.write_text('\n'.join(L) + '\n', encoding='utf-8')
    print(f'Đã ghi {out.relative_to(ROOT)}')


if __name__ == '__main__':
    main(int(sys.argv[1]), int(sys.argv[2]))
