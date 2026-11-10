import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateAll } from '../../seed/validate'
import { files as seedFiles } from '../../seed/__tests__/helpers'
import { classifyWord, policyIssues, type ClassifyInput } from '../classify'
import { indexByKanji, lookupCandidates, lookupWord, parseJmdict, type JmMatch } from '../jmdict'
import { formatPolicyFile, mergeProposals, parsePolicyFile, type PolicyRow } from '../policy-file'

// Mẫu nhỏ theo đúng cấu trúc JMdict (thực thể như &uk; giữ nguyên dạng chữ)
const XML = `
<JMdict>
<entry><ent_seq>1</ent_seq>
<k_ele><keb>学校</keb></k_ele>
<r_ele><reb>がっこう</reb></r_ele>
<sense><pos>&n;</pos><gloss>school</gloss></sense>
</entry>
<entry><ent_seq>2</ent_seq>
<k_ele><keb>有難う</keb><ke_inf>&rK;</ke_inf></k_ele>
<r_ele><reb>ありがとう</reb></r_ele>
<sense><pos>&int;</pos><misc>&uk;</misc><gloss>thank you</gloss></sense>
</entry>
<entry><ent_seq>3</ent_seq>
<k_ele><keb>休む</keb></k_ele>
<r_ele><reb>やすむ</reb></r_ele>
<sense><pos>&v5m;</pos><gloss>to rest</gloss></sense>
</entry>
<entry><ent_seq>4</ent_seq>
<k_ele><keb>寝る</keb></k_ele>
<r_ele><reb>ねる</reb></r_ele>
<sense><pos>&v1;</pos><gloss>to sleep</gloss></sense>
</entry>
<entry><ent_seq>5</ent_seq>
<k_ele><keb>勉強</keb></k_ele>
<r_ele><reb>べんきょう</reb></r_ele>
<sense><pos>&n;</pos><pos>&vs;</pos><gloss>study</gloss></sense>
</entry>
<entry><ent_seq>6</ent_seq>
<k_ele><keb>沢山</keb></k_ele>
<r_ele><reb>たくさん</reb></r_ele>
<sense><pos>&adv;</pos><misc>&uk;</misc><gloss>a lot</gloss></sense>
</entry>
<entry><ent_seq>7</ent_seq>
<k_ele><keb>人</keb></k_ele>
<r_ele><reb>ひと</reb></r_ele>
<r_ele><reb>じん</reb><re_restr>仁</re_restr></r_ele>
<sense><pos>&n;</pos><gloss>person</gloss></sense>
</entry>
<entry><ent_seq>8</ent_seq>
<k_ele><keb>来る</keb></k_ele>
<r_ele><reb>くる</reb></r_ele>
<sense><pos>&vk;</pos><gloss>to come</gloss></sense>
</entry>
</JMdict>`

const index = indexByKanji(parseJmdict(XML))

describe('JMdict', () => {
  it('đọc cách viết, cách đọc, nhãn uk và cách viết hiếm', () => {
    const [first, second] = parseJmdict(XML)
    expect(first).toMatchObject({ seq: 1, kanji: [{ text: '学校', info: [] }], readings: [{ text: 'がっこう' }] })
    expect(second.kanji[0].info).toEqual(['rK'])
    expect(second.senses[0].misc).toEqual(['uk'])
  })

  it('tra đúng cả cách viết và cách đọc', () => {
    expect(lookupWord(index, '学校', 'がっこう')).toMatchObject({ form: '学校', usuallyKana: false, rareForm: [], via: 'exact' })
    expect(lookupWord(index, '学校', 'がくこう')).toBeNull()
  })

  it('cách đọc bị giới hạn cho cách viết khác thì không khớp', () => {
    expect(lookupWord(index, '人', 'ひと')).not.toBeNull()
    expect(lookupWord(index, '人', 'じん')).toBeNull()
  })

  it('động từ thể ます đổi về thể từ điển: godan, ichidan, する, 来る', () => {
    expect(lookupWord(index, '休みます', 'やすみます')).toMatchObject({ form: '休む', via: 'masu→dictionary' })
    expect(lookupWord(index, '寝ます', 'ねます')).toMatchObject({ form: '寝る' })
    expect(lookupWord(index, '勉強します', 'べんきょうします')).toMatchObject({ form: '勉強', via: 'する' })
    expect(lookupWord(index, '来ます', 'きます')).toMatchObject({ form: '来る' })
  })

  it('bỏ お/ご ở đầu khi tra', () => {
    expect(lookupCandidates('お勉強', 'おべんきょう').map((c) => c.form)).toContain('勉強')
  })

  it('nhận ra từ thường viết bằng Kana', () => {
    expect(lookupWord(index, '沢山', 'たくさん')).toMatchObject({ usuallyKana: true })
  })
})

const jm = (over: Partial<JmMatch> = {}): JmMatch => ({ seq: 1, form: '', reading: '', usuallyKana: false, rareForm: [], via: 'exact', ...over })
const input = (over: Partial<ClassifyInput>): ClassifyInput => ({
  expression: '学校',
  isKanaOnly: false,
  wordLevel: 5,
  kanji: [{ character: '学', level: 5 }, { character: '校', level: 5 }],
  jm: jm(),
  levelSource: 'thử',
  ...over,
})

describe('Phân loại chính sách Kanji', () => {
  it('学校: mọi chữ N5 → KANJI_CORE ở N5, tin cậy cao', () => {
    expect(classifyWord(input({}))).toMatchObject({ policy: 'KANJI_CORE', targetLevel: 5, confidence: 'high' })
  })

  it('テレビ: không có Kanji → KANA_ONLY', () => {
    expect(classifyWord(input({ expression: 'テレビ', isKanaOnly: true, kanji: [], jm: null }))).toMatchObject({ policy: 'KANA_ONLY', targetLevel: null })
  })

  it('thường viết bằng Kana vẫn phải học dạng Kanji (chủ dự án chọn), chỉ hạ độ tin cậy', () => {
    expect(classifyWord(input({ expression: '沢山', jm: jm({ usuallyKana: true }) }))).toMatchObject({ policy: 'KANJI_CORE', targetLevel: 5, confidence: 'medium' })
    expect(classifyWord(input({ jm: jm({ rareForm: ['rK'] }) }))).toMatchObject({ policy: 'KANJI_CORE', confidence: 'medium' })
  })

  it('cụm câu không có trong JMdict → KANJI_CORE ở cấp của cụm, kể cả có chữ cấp sau', () => {
    expect(classifyWord(input({ expression: 'お世話になります', jm: null, kanji: [{ character: '世', level: 4 }, { character: '話', level: 5 }] }))).toMatchObject({ policy: 'KANJI_CORE', targetLevel: 5 })
    expect(classifyWord(input({ expression: 'どうぞお元気で', wordLevel: 4, jm: null }))).toMatchObject({ policy: 'KANJI_CORE', targetLevel: 4 })
  })

  it('từ N5 có chữ N4 → KANJI_DEFERRED ở N4; từ N4 có chữ N3 → KANJI_DEFERRED ở N3', () => {
    expect(classifyWord(input({ kanji: [{ character: '学', level: 5 }, { character: '員', level: 4 }] }))).toMatchObject({ policy: 'KANJI_DEFERRED', targetLevel: 4 })
    expect(classifyWord(input({ wordLevel: 4, kanji: [{ character: '研', level: 3 }] }))).toMatchObject({ policy: 'KANJI_DEFERRED', targetLevel: 3 })
  })

  it('không phải mọi từ có chữ N5 đều bắt buộc: từ N4 chỉ có chữ N5 học ở N4', () => {
    expect(classifyWord(input({ wordLevel: 4 }))).toMatchObject({ policy: 'KANJI_CORE', targetLevel: 4 })
  })

  it('có chữ chưa có cấp → tin cậy thấp', () => {
    expect(classifyWord(input({ kanji: [{ character: '誰', level: null }] }))).toMatchObject({ policy: 'KANJI_DEFERRED', targetLevel: 1, confidence: 'low' })
  })

  it('kiểm tra nhãn người duyệt sửa tay', () => {
    const n5 = { isKanaOnly: false, wordLevel: 5 }
    expect(policyIssues({ policy: 'KANJI_CORE', targetLevel: 5 }, n5)).toEqual([])
    expect(policyIssues({ policy: 'KANJI_CORE', targetLevel: 4 }, n5)).not.toEqual([])
    expect(policyIssues({ policy: 'KANJI_DEFERRED', targetLevel: 5 }, n5)).not.toEqual([])
    expect(policyIssues({ policy: 'KANJI_OPTIONAL', targetLevel: 4 }, n5)).not.toEqual([])
    expect(policyIssues({ policy: 'KANA_ONLY', targetLevel: null }, n5)).not.toEqual([])
    expect(policyIssues({ policy: 'X', targetLevel: null }, n5)).not.toEqual([])
  })
})

describe('File kanji_policy.csv', () => {
  const row = (over: Partial<PolicyRow>): PolicyRow => ({
    code: 'n5-0001', expression: '学校', policy: 'KANJI_CORE', targetLevel: 5, confidence: 'high', reason: 'Mọi chữ, kể cả "dấu phẩy"', source: 'JMdict', locked: false, ...over,
  })

  it('ghi rồi đọc lại giữ nguyên, kể cả ô có dấu phẩy và ngoặc kép', () => {
    const rows = [row({}), row({ code: 'n5-0002', expression: 'これ', policy: 'KANA_ONLY', targetLevel: null, locked: true })]
    expect(parsePolicyFile(formatPolicyFile(rows))).toEqual({ rows, errors: [] })
  })

  it('dòng đã khóa không bị ghi đè; đề xuất khác thì được báo', () => {
    const words = [{ code: 'n5-0001', expression: '学校' }, { code: 'n5-0002', expression: '大学' }]
    const proposals = new Map([
      ['n5-0001', { policy: 'KANJI_DEFERRED' as const, targetLevel: 4, confidence: 'high' as const, reason: 'mới', source: 's' }],
      ['n5-0002', { policy: 'KANJI_CORE' as const, targetLevel: 5, confidence: 'high' as const, reason: 'mới', source: 's' }],
    ])
    const existing = [row({ locked: true }), row({ code: 'n5-0002', expression: '大学', policy: 'KANJI_OPTIONAL', targetLevel: null })]
    const merged = mergeProposals(words, proposals, existing)
    expect(merged.rows[0]).toMatchObject({ policy: 'KANJI_CORE', targetLevel: 5, locked: true })
    expect(merged.rows[1]).toMatchObject({ policy: 'KANJI_CORE', targetLevel: 5, locked: false })
    expect(merged.lockedDiffers.map((d) => d.row.code)).toEqual(['n5-0001'])
  })
})

describe('Seed đọc kanji_policy.csv', () => {
  const header = 'code,expression,policy,target_level,confidence,reason,source,locked'
  const policy = (lines: string[]) => ({ name: 'kanji_policy.csv', text: [header, ...lines].join('\n') + '\n' })
  const ok = ['n5-0001,学校,KANJI_CORE,5,high,r,s,true', 'n5-0002,これ,KANA_ONLY,,high,r,s,false', 'n5-0003,時々,KANJI_DEFERRED,4,low,r,s,false']

  it('ghép nhãn vào từng từ', () => {
    const v = validateAll({ ...seedFiles(), policy: policy(ok) })
    expect(v.errors).toEqual([])
    expect(v.hasPolicy).toBe(true)
    expect(v.vocabularies[0]).toMatchObject({ kanji_policy: 'KANJI_CORE', kanji_target_level: 5 })
    expect(v.vocabularies[1]).toMatchObject({ kanji_policy: 'KANA_ONLY', kanji_target_level: null })
  })

  it('không có file thì không đụng chính sách', () => {
    const v = validateAll(seedFiles())
    expect(v.hasPolicy).toBe(false)
    expect(v.vocabularies[0]).not.toHaveProperty('kanji_policy')
  })

  it('thiếu từ, từ lạ, nhãn sai đều là lỗi chặn seed', () => {
    expect(validateAll({ ...seedFiles(), policy: policy(ok.slice(0, 2)) }).errors.map((e) => e.message).join()).toContain('Thiếu 1 từ')
    expect(validateAll({ ...seedFiles(), policy: policy([...ok, 'n5-9999,x,KANA_ONLY,,high,r,s,false']) }).errors).not.toEqual([])
    expect(validateAll({ ...seedFiles(), policy: policy([ok[0], 'n5-0002,これ,KANJI_CORE,5,high,r,s,false', ok[2]]) }).errors).not.toEqual([])
  })

  it('file thật: mỗi từ đúng một nhãn hợp lệ', () => {
    const dir = join(process.cwd(), 'data', 'n5')
    const read = (name: string) => ({ name, text: readFileSync(join(dir, name), 'utf8') })
    const v = validateAll({ kanji: read('kanji.csv'), vocabularies: read('vocabularies.csv'), policy: read('kanji_policy.csv') })
    expect(v.errors).toEqual([])
    expect(v.vocabularies.every((w) => 'kanji_policy' in w && w.kanji_policy !== null)).toBe(true)
  })
})

describe('Cấp chữ theo danh sách Waller', () => {
  it('chữ N5 trong file giữ nguyên; chữ khác lấy cấp Waller; Waller thiếu thì giữ cấp cũ', async () => {
    const { applyLevels, nextKanjiLevel } = await import('../levels')
    expect(nextKanjiLevel(5, 4)).toBe(5)
    expect(nextKanjiLevel(3, 2)).toBe(2)
    expect(nextKanjiLevel(3, null)).toBe(3)
    expect(nextKanjiLevel(null, null)).toBeNull()
    expect(nextKanjiLevel(4, 1, 4)).toBe(4) // cấp chủ dự án chốt thắng Waller
    const csv = 'character,han_viet,meaning_vi,onyomi,kunyomi,stroke_count,jlpt_level\n学,HỌC,học,"{""ガク""}",{},8,5\n寺,TỰ,chùa,"{""ジ""}",{},,3\n誰,THÙY,ai,{},{},,\n'
    const { text, changes } = applyLevels(csv, new Map([['学', 4], ['寺', 2], ['誰', null]]))
    expect(changes).toEqual([{ character: '寺', from: 3, to: 2 }])
    expect(text).toBe(csv.replace('{},,3', '{},,2'))
  })
})
