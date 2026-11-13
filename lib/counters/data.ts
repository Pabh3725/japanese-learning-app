// Counters (More): từ đếm, ngày tháng năm, giờ phút — N5 + N4. Pure, dùng chung cho trang tra, bài luyện và test.
// readings[0] là cách đọc chính (hiện trong bảng tra); các cách sau cũng được chấp nhận khi chấm.
// tails: các âm cuối có thể của từ đếm (ほん／ぼん／ぽん) để dựng đáp án nhiễu dễ nhầm; wrong: nhiễu soạn tay.

export type CounterGroup = 'numbers' | 'counters' | 'dates' | 'time'

export interface CountEntry {
  /** Số (1–10…), null là câu hỏi 何. */
  n: number | null
  written: string
  readings: string[]
  /** Nhiễu soạn tay: cách đọc sai hay gặp. */
  wrong?: string[]
  /** Nghĩa tiếng Việt khi không suy được từ đơn vị của bộ (thứ trong tuần, giờ rưỡi…). */
  meaning?: string
}

export interface CounterSet {
  id: string
  group: CounterGroup
  /** Nhãn ngắn hiện trong bảng và lựa chọn: ～本 */
  label: string
  /** Dùng để đếm gì (tiếng Việt). */
  usage: string
  /** Đơn vị tiếng Việt để hiện nghĩa: 3 người, tầng 3 (unitFirst). */
  unit?: string
  unitFirst?: boolean
  /** Nghĩa của câu hỏi 何…: mấy người? */
  what?: string
  tails?: string[]
  entries: CountEntry[]
}

const R = (written: string, n: number | null, readings: string | string[], wrong?: string[]): CountEntry => ({
  n,
  written,
  readings: Array.isArray(readings) ? readings : [readings],
  ...(wrong ? { wrong } : {}),
})

/** Từ đếm theo mẫu 1–10 + 何: readings[i] cho số i+1, phần tử cuối là 何. */
function counter(id: string, suffix: string, usage: string, unit: string, readings: (string | string[])[], tails?: string[], whatWritten = `何${suffix}`): CounterSet {
  if (readings.length !== 11) throw new Error(`${id}: cần 11 cách đọc (1–10 và 何)`)
  return {
    id,
    group: 'counters',
    label: `～${suffix}`,
    usage,
    unit,
    tails,
    entries: readings.map((r, i) => (i < 10 ? R(`${i + 1}${suffix}`, i + 1, r) : R(whatWritten, null, r))),
  }
}

// ---------------------------------------------------------------- Số đếm thường
const ONES = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう']
const HUNDREDS = ['', 'ひゃく', 'にひゃく', 'さんびゃく', 'よんひゃく', 'ごひゃく', 'ろっぴゃく', 'ななひゃく', 'はっぴゃく', 'きゅうひゃく']
const THOUSANDS = ['', 'せん', 'にせん', 'さんぜん', 'よんせん', 'ごせん', 'ろくせん', 'ななせん', 'はっせん', 'きゅうせん']
// Đọc "thẳng" không biến âm: さんひゃく, ろくひゃく, はちせん, いちせん — lỗi hay gặp, dùng làm nhiễu
const HUNDREDS_NAIVE = ['', 'いちひゃく', 'にひゃく', 'さんひゃく', 'よんひゃく', 'ごひゃく', 'ろくひゃく', 'ななひゃく', 'はちひゃく', 'きゅうひゃく']
const THOUSANDS_NAIVE = ['', 'いちせん', 'にせん', 'さんせん', 'よんせん', 'ごせん', 'ろくせん', 'ななせん', 'はちせん', 'きゅうせん']

/** Số lớn nhất bài luyện dùng (dưới 1000万 để không gặp いっせんまん). */
export const MAX_NUMBER = 9_999_999

function under10000(n: number, naive: boolean): string {
  const th = Math.floor(n / 1000)
  const h = Math.floor((n % 1000) / 100)
  const t = Math.floor((n % 100) / 10)
  const o = n % 10
  const tens = t === 0 ? '' : (t === 1 ? (naive ? 'いち' : '') : ONES[t]) + 'じゅう'
  return (naive ? THOUSANDS_NAIVE : THOUSANDS)[th] + (naive ? HUNDREDS_NAIVE : HUNDREDS)[h] + tens + ONES[o]
}

/** Cách đọc chuẩn của số 0 … 9,999,999: 300 さんびゃく, 8000 はっせん, 10000 いちまん. */
export function numberReading(n: number, naive = false): string {
  if (!Number.isInteger(n) || n < 0 || n > MAX_NUMBER) throw new Error(`numberReading: ${n} ngoài phạm vi`)
  if (n === 0) return 'ぜろ'
  const man = Math.floor(n / 10000)
  const rest = n % 10000
  return (man ? under10000(man, naive) + 'まん' : '') + under10000(rest, naive)
}

/** Mọi cách đọc được chấp nhận: thêm れい (0), し／しち／く khi đứng một mình, しちじゅう. */
export function numberReadings(n: number): string[] {
  const main = numberReading(n)
  const out = [main]
  const alt: Record<number, string> = { 0: 'れい', 4: 'し', 7: 'しち', 9: 'く' }
  if (n in alt) out.push(alt[n])
  if (main.includes('ななじゅう')) out.push(main.replace('ななじゅう', 'しちじゅう'))
  return out
}

function numberSet(id: string, label: string, usage: string, values: number[]): CounterSet {
  return {
    id,
    group: 'numbers',
    label,
    usage,
    entries: values.map((n) => {
      const naive = numberReading(n, true)
      return { n, written: n.toLocaleString('en-US'), readings: numberReadings(n), ...(naive !== numberReading(n) ? { wrong: [naive] } : {}), meaning: `số ${n.toLocaleString('vi-VN')}` }
    }),
  }
}

export const COUNTER_SETS: CounterSet[] = [
  numberSet('num-basic', '0〜10', 'số đếm cơ bản', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  numberSet('num-tens', '11〜90', 'hàng chục', [11, 14, 17, 19, 20, 30, 40, 50, 60, 70, 80, 90]),
  numberSet('num-hundreds', '百 (100〜900)', 'hàng trăm: chú ý 300, 600, 800', [100, 200, 300, 400, 500, 600, 700, 800, 900]),
  numberSet('num-thousands', '千 (1000〜9000)', 'hàng nghìn: chú ý 3000, 8000', [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000]),
  numberSet('num-man', '万 (10,000〜)', 'vạn: 10.000 là いちまん', [10000, 20000, 100000, 1000000]),
  numberSet('num-mixed', 'Số ghép', 'ví dụ số nhiều chữ số', [24, 156, 3480, 25600, 186000]),

  {
    id: 'tsu',
    group: 'counters',
    label: '～つ',
    usage: 'đồ vật nói chung (đến 10)',
    unit: 'cái',
    what: 'mấy cái?',
    tails: ['つ'],
    entries: [
      R('1つ', 1, 'ひとつ', ['いちつ']), R('2つ', 2, 'ふたつ', ['につ']), R('3つ', 3, 'みっつ', ['さんつ']), R('4つ', 4, 'よっつ', ['よんつ']),
      R('5つ', 5, 'いつつ', ['ごつ']), R('6つ', 6, 'むっつ', ['ろくつ']), R('7つ', 7, 'ななつ', ['しちつ']), R('8つ', 8, 'やっつ', ['はっつ']),
      R('9つ', 9, 'ここのつ', ['きゅうつ']), R('10', 10, 'とお', ['とおつ']), R('いくつ', null, 'いくつ', ['なんつ']),
    ],
  },
  {
    id: 'nin',
    group: 'counters',
    label: '～人',
    usage: 'người',
    unit: 'người',
    tails: ['にん', 'り'],
    entries: [
      R('1人', 1, 'ひとり', ['いちにん']), R('2人', 2, 'ふたり', ['ににん']), R('3人', 3, 'さんにん'), R('4人', 4, 'よにん', ['よんにん', 'しにん']),
      R('5人', 5, 'ごにん'), R('6人', 6, 'ろくにん'), R('7人', 7, ['しちにん', 'ななにん']), R('8人', 8, 'はちにん'),
      R('9人', 9, ['きゅうにん', 'くにん']), R('10人', 10, 'じゅうにん'), R('何人', null, 'なんにん'),
    ],
  },
  counter('mai', '枚', 'vật mỏng, phẳng: giấy, tem, ảnh, đĩa', 'tờ', [
    'いちまい', 'にまい', 'さんまい', 'よんまい', 'ごまい', 'ろくまい', ['ななまい', 'しちまい'], 'はちまい', 'きゅうまい', 'じゅうまい', 'なんまい',
  ], ['まい']),
  counter('dai', '台', 'máy móc, xe cộ: ô tô, máy tính, tivi', 'chiếc', [
    'いちだい', 'にだい', 'さんだい', 'よんだい', 'ごだい', 'ろくだい', ['ななだい', 'しちだい'], 'はちだい', 'きゅうだい', 'じゅうだい', 'なんだい',
  ], ['だい', 'たい']),
  counter('hon', '本', 'vật dài, thon: bút, ô, chai, cây', 'cây', [
    'いっぽん', 'にほん', 'さんぼん', 'よんほん', 'ごほん', 'ろっぽん', 'ななほん', ['はっぽん', 'はちほん'], 'きゅうほん', ['じゅっぽん', 'じっぽん'], 'なんぼん',
  ], ['ほん', 'ぼん', 'ぽん']),
  counter('satsu', '冊', 'sách, vở, tạp chí', 'quyển', [
    'いっさつ', 'にさつ', 'さんさつ', 'よんさつ', 'ごさつ', 'ろくさつ', 'ななさつ', 'はっさつ', 'きゅうさつ', ['じゅっさつ', 'じっさつ'], 'なんさつ',
  ], ['さつ', 'ざつ']),
  counter('hiki', '匹', 'con vật nhỏ: chó, mèo, cá', 'con', [
    'いっぴき', 'にひき', 'さんびき', 'よんひき', 'ごひき', 'ろっぴき', 'ななひき', ['はっぴき', 'はちひき'], 'きゅうひき', ['じゅっぴき', 'じっぴき'], 'なんびき',
  ], ['ひき', 'びき', 'ぴき']),
  counter('hai', '杯', 'cốc, chén, bát (đồ uống, cơm)', 'cốc', [
    'いっぱい', 'にはい', 'さんばい', 'よんはい', 'ごはい', 'ろっぱい', 'ななはい', ['はっぱい', 'はちはい'], 'きゅうはい', ['じゅっぱい', 'じっぱい'], 'なんばい',
  ], ['はい', 'ばい', 'ぱい']),
  counter('ko', '個', 'đồ vật nhỏ, tròn: táo, trứng, hộp', 'cái', [
    'いっこ', 'にこ', 'さんこ', 'よんこ', 'ごこ', 'ろっこ', 'ななこ', ['はっこ', 'はちこ'], 'きゅうこ', ['じゅっこ', 'じっこ'], 'なんこ',
  ], ['こ', 'ご']),
  counter('kai', '回', 'số lần', 'lần', [
    'いっかい', 'にかい', 'さんかい', 'よんかい', 'ごかい', 'ろっかい', 'ななかい', ['はっかい', 'はちかい'], 'きゅうかい', ['じゅっかい', 'じっかい'], 'なんかい',
  ], ['かい', 'がい']),
  { ...counter('kai-floor', '階', 'tầng (của tòa nhà)', 'tầng', [
    'いっかい', 'にかい', ['さんがい', 'さんかい'], 'よんかい', 'ごかい', 'ろっかい', 'ななかい', ['はっかい', 'はちかい'], 'きゅうかい', ['じゅっかい', 'じっかい'], ['なんがい', 'なんかい'],
  ], ['かい', 'がい']), unitFirst: true, what: 'tầng mấy?' },
  counter('sai', '歳', 'tuổi', 'tuổi', [
    'いっさい', 'にさい', 'さんさい', 'よんさい', 'ごさい', 'ろくさい', 'ななさい', 'はっさい', 'きゅうさい', ['じゅっさい', 'じっさい'], 'なんさい',
  ], ['さい', 'ざい']),
  { ...counter('ban', '番', 'thứ tự, số (số 1, số 2…)', 'số', [
    'いちばん', 'にばん', 'さんばん', 'よんばん', 'ごばん', 'ろくばん', 'ななばん', 'はちばん', 'きゅうばん', 'じゅうばん', 'なんばん',
  ], ['ばん', 'はん']), unitFirst: true, what: 'số mấy?' },
  counter('do', '度', 'số lần; độ (nhiệt độ)', 'lần', [
    'いちど', 'にど', 'さんど', 'よんど', 'ごど', 'ろくど', 'ななど', 'はちど', 'きゅうど', 'じゅうど', 'なんど',
  ], ['ど', 'と']),
  counter('soku', '足', 'đôi giày, đôi tất', 'đôi', [
    'いっそく', 'にそく', 'さんぞく', 'よんそく', 'ごそく', 'ろくそく', 'ななそく', 'はっそく', 'きゅうそく', ['じゅっそく', 'じっそく'], 'なんぞく',
  ], ['そく', 'ぞく']),
  counter('chaku', '着', 'quần áo (bộ, cái)', 'bộ', [
    'いっちゃく', 'にちゃく', 'さんちゃく', 'よんちゃく', 'ごちゃく', 'ろくちゃく', 'ななちゃく', ['はっちゃく', 'はちちゃく'], 'きゅうちゃく', ['じゅっちゃく', 'じっちゃく'], 'なんちゃく',
  ], ['ちゃく', 'じゃく']),
  counter('ken', '軒', 'nhà, cửa hàng', 'căn', [
    'いっけん', 'にけん', 'さんげん', 'よんけん', 'ごけん', 'ろっけん', 'ななけん', ['はっけん', 'はちけん'], 'きゅうけん', ['じゅっけん', 'じっけん'], 'なんげん',
  ], ['けん', 'げん']),
  {
    id: 'yen',
    group: 'counters',
    label: '百・千・万 (円)',
    usage: 'số tiền: trăm, nghìn, vạn',
    unit: 'yên',
    what: 'bao nhiêu yên?',
    entries: [
      R('100円', 100, 'ひゃくえん', ['いちひゃくえん']), R('300円', 300, 'さんびゃくえん', ['さんひゃくえん', 'さんぴゃくえん']),
      R('600円', 600, 'ろっぴゃくえん', ['ろくひゃくえん', 'ろくぴゃくえん']), R('800円', 800, 'はっぴゃくえん', ['はちひゃくえん', 'はちぴゃくえん']),
      R('1000円', 1000, 'せんえん', ['いちせんえん']), R('3000円', 3000, 'さんぜんえん', ['さんせんえん']),
      R('8000円', 8000, 'はっせんえん', ['はちせんえん']), R('10000円', 10000, 'いちまんえん', ['まんえん', 'じゅうせんえん']),
      R('400円', 400, 'よんひゃくえん', ['よひゃくえん', 'しひゃくえん']), R('4円', 4, 'よえん', ['よんえん', 'しえん']),
      R('何円', null, 'なんえん'),
    ],
  },

  // ---------------------------------------------------------------- Ngày tháng năm
  {
    id: 'day',
    group: 'dates',
    label: '～日 (ngày)',
    usage: 'ngày trong tháng',
    unit: 'ngày',
    unitFirst: true,
    what: 'ngày mấy?',
    tails: ['にち', 'か'],
    entries: [
      R('1日', 1, 'ついたち', ['いちにち']), R('2日', 2, 'ふつか', ['ににち']), R('3日', 3, 'みっか', ['さんにち']), R('4日', 4, 'よっか', ['よんにち', 'ようか']),
      R('5日', 5, 'いつか', ['ごにち']), R('6日', 6, 'むいか', ['ろくにち']), R('7日', 7, 'なのか', ['ななにち', 'しちにち']), R('8日', 8, 'ようか', ['はちにち', 'よっか']),
      R('9日', 9, 'ここのか', ['きゅうにち']), R('10日', 10, 'とおか', ['じゅうにち']), R('11日', 11, 'じゅういちにち'), R('12日', 12, 'じゅうににち'),
      R('13日', 13, 'じゅうさんにち'), R('14日', 14, 'じゅうよっか', ['じゅうよんにち']), R('15日', 15, 'じゅうごにち'), R('16日', 16, 'じゅうろくにち'),
      R('17日', 17, 'じゅうしちにち'), R('18日', 18, 'じゅうはちにち'), R('19日', 19, 'じゅうくにち'), R('20日', 20, 'はつか', ['にじゅうにち']),
      R('21日', 21, 'にじゅういちにち'), R('22日', 22, 'にじゅうににち'), R('23日', 23, 'にじゅうさんにち'), R('24日', 24, 'にじゅうよっか', ['にじゅうよんにち']),
      R('25日', 25, 'にじゅうごにち'), R('26日', 26, 'にじゅうろくにち'), R('27日', 27, 'にじゅうしちにち'), R('28日', 28, 'にじゅうはちにち'),
      R('29日', 29, 'にじゅうくにち'), R('30日', 30, 'さんじゅうにち'), R('31日', 31, 'さんじゅういちにち'), R('何日', null, 'なんにち'),
    ],
  },
  {
    id: 'month',
    group: 'dates',
    label: '～月 (tháng)',
    usage: 'tháng trong năm',
    unit: 'tháng',
    unitFirst: true,
    what: 'tháng mấy?',
    entries: [
      R('1月', 1, 'いちがつ'), R('2月', 2, 'にがつ'), R('3月', 3, 'さんがつ'), R('4月', 4, 'しがつ', ['よんがつ', 'よがつ']),
      R('5月', 5, 'ごがつ'), R('6月', 6, 'ろくがつ'), R('7月', 7, 'しちがつ', ['ななげつ', 'しちげつ']), R('8月', 8, 'はちがつ'),
      R('9月', 9, 'くがつ', ['きゅうがつ', 'くげつ']), R('10月', 10, 'じゅうがつ'), R('11月', 11, 'じゅういちがつ'), R('12月', 12, 'じゅうにがつ'),
      R('何月', null, 'なんがつ'),
    ],
  },
  {
    id: 'weekday',
    group: 'dates',
    label: '～曜日 (thứ)',
    usage: 'thứ trong tuần',
    entries: [
      { ...R('日曜日', 0, 'にちようび'), meaning: 'Chủ nhật' }, { ...R('月曜日', 1, 'げつようび'), meaning: 'Thứ hai' },
      { ...R('火曜日', 2, 'かようび'), meaning: 'Thứ ba' }, { ...R('水曜日', 3, 'すいようび'), meaning: 'Thứ tư' },
      { ...R('木曜日', 4, 'もくようび'), meaning: 'Thứ năm' }, { ...R('金曜日', 5, 'きんようび'), meaning: 'Thứ sáu' },
      { ...R('土曜日', 6, 'どようび'), meaning: 'Thứ bảy' }, { ...R('何曜日', null, 'なんようび'), meaning: 'thứ mấy?' },
    ],
  },
  {
    id: 'year',
    group: 'dates',
    label: '～年 (năm)',
    usage: 'năm; số năm',
    unit: 'năm',
    what: 'mấy năm? / năm nào?',
    tails: ['ねん'],
    entries: [
      R('1年', 1, 'いちねん'), R('2年', 2, 'にねん'), R('3年', 3, 'さんねん'), R('4年', 4, 'よねん', ['よんねん', 'しねん']),
      R('5年', 5, 'ごねん'), R('6年', 6, 'ろくねん'), R('7年', 7, ['ななねん', 'しちねん']), R('8年', 8, 'はちねん'),
      R('9年', 9, 'きゅうねん', ['くねん']), R('10年', 10, 'じゅうねん'), { ...R('2000年', 2000, 'にせんねん', ['にせんとし']), meaning: 'năm 2000' },
      { ...R('2026年', 2026, 'にせんにじゅうろくねん', ['にせんにじゅうむねん']), meaning: 'năm 2026' }, R('何年', null, 'なんねん'),
    ],
  },

  // ---------------------------------------------------------------- Giờ phút
  {
    id: 'hour',
    group: 'time',
    label: '～時 (giờ)',
    usage: 'giờ',
    unit: 'giờ',
    what: 'mấy giờ?',
    tails: ['じ'],
    entries: [
      R('1時', 1, 'いちじ'), R('2時', 2, 'にじ'), R('3時', 3, 'さんじ'), R('4時', 4, 'よじ', ['よんじ', 'しじ']),
      R('5時', 5, 'ごじ'), R('6時', 6, 'ろくじ'), R('7時', 7, ['しちじ', 'ななじ']), R('8時', 8, 'はちじ'),
      R('9時', 9, 'くじ', ['きゅうじ']), R('10時', 10, 'じゅうじ'), R('11時', 11, 'じゅういちじ'), R('12時', 12, 'じゅうにじ'),
      R('何時', null, 'なんじ'),
    ],
  },
  {
    id: 'minute',
    group: 'time',
    label: '～分 (phút)',
    usage: 'phút',
    unit: 'phút',
    what: 'mấy phút?',
    tails: ['ふん', 'ぷん', 'ぶん'],
    entries: [
      R('1分', 1, 'いっぷん'), R('2分', 2, 'にふん'), R('3分', 3, 'さんぷん'), R('4分', 4, 'よんぷん'),
      R('5分', 5, 'ごふん'), R('6分', 6, 'ろっぷん'), R('7分', 7, 'ななふん'), R('8分', 8, ['はっぷん', 'はちふん']),
      R('9分', 9, 'きゅうふん'), R('10分', 10, ['じゅっぷん', 'じっぷん']), R('15分', 15, 'じゅうごふん'), R('20分', 20, ['にじゅっぷん', 'にじっぷん']),
      R('30分', 30, ['さんじゅっぷん', 'さんじっぷん']), R('45分', 45, 'よんじゅうごふん'), R('何分', null, 'なんぷん'),
    ],
  },
  {
    id: 'clock',
    group: 'time',
    label: '半・午前・午後',
    usage: 'giờ rưỡi, buổi sáng / chiều',
    entries: [
      { ...R('4時半', 4.5, 'よじはん', ['よんじはん']), meaning: '4 giờ rưỡi' },
      { ...R('7時半', 7.5, ['しちじはん', 'ななじはん']), meaning: '7 giờ rưỡi' },
      { ...R('9時半', 9.5, 'くじはん', ['きゅうじはん']), meaning: '9 giờ rưỡi' },
      { ...R('午前10時', 10, 'ごぜんじゅうじ', ['ごごじゅうじ']), meaning: '10 giờ sáng' },
      { ...R('午後4時', 16, 'ごごよじ', ['ごぜんよじ', 'ごごよんじ']), meaning: '4 giờ chiều' },
      { ...R('午前9時15分', 9.25, 'ごぜんくじじゅうごふん', ['ごぜんきゅうじじゅうごふん']), meaning: '9 giờ 15 sáng' },
      { ...R('午後2時10分', 14.17, ['ごごにじじゅっぷん', 'ごごにじじっぷん'], ['ごごにじじゅうふん']), meaning: '2 giờ 10 chiều' },
      { ...R('午後7時45分', 19.75, ['ごごしちじよんじゅうごふん', 'ごごななじよんじゅうごふん'], ['ごごしちじよんじゅうごぷん']), meaning: '7 giờ 45 tối' },
    ],
  },
]

/** Vật để luyện chọn từ đếm: thứ được đếm và các bộ từ đếm dùng được. */
export interface CountThing {
  word: string
  reading: string
  meaning: string
  sets: string[]
}

export const COUNT_THINGS: CountThing[] = [
  { word: '鉛筆', reading: 'えんぴつ', meaning: 'bút chì', sets: ['hon'] },
  { word: '傘', reading: 'かさ', meaning: 'cái ô', sets: ['hon'] },
  { word: 'ボールペン', reading: 'ボールペン', meaning: 'bút bi', sets: ['hon'] },
  { word: '木', reading: 'き', meaning: 'cái cây', sets: ['hon'] },
  { word: '切手', reading: 'きって', meaning: 'con tem', sets: ['mai'] },
  { word: '写真', reading: 'しゃしん', meaning: 'tấm ảnh', sets: ['mai'] },
  { word: '葉書', reading: 'はがき', meaning: 'tấm bưu thiếp', sets: ['mai'] },
  { word: '封筒', reading: 'ふうとう', meaning: 'phong bì', sets: ['mai'] },
  { word: '車', reading: 'くるま', meaning: 'ô tô', sets: ['dai'] },
  { word: 'パソコン', reading: 'パソコン', meaning: 'máy tính', sets: ['dai'] },
  { word: 'テレビ', reading: 'テレビ', meaning: 'tivi', sets: ['dai'] },
  { word: '自転車', reading: 'じてんしゃ', meaning: 'xe đạp', sets: ['dai'] },
  { word: '辞書', reading: 'じしょ', meaning: 'từ điển', sets: ['satsu'] },
  { word: '雑誌', reading: 'ざっし', meaning: 'tạp chí', sets: ['satsu'] },
  { word: 'ノート', reading: 'ノート', meaning: 'quyển vở', sets: ['satsu'] },
  { word: '犬', reading: 'いぬ', meaning: 'con chó', sets: ['hiki'] },
  { word: '猫', reading: 'ねこ', meaning: 'con mèo', sets: ['hiki'] },
  { word: '魚', reading: 'さかな', meaning: 'con cá', sets: ['hiki'] },
  { word: 'コーヒー', reading: 'コーヒー', meaning: 'cốc cà phê', sets: ['hai'] },
  { word: 'お茶', reading: 'おちゃ', meaning: 'chén trà', sets: ['hai'] },
  { word: 'ジュース', reading: 'ジュース', meaning: 'cốc nước hoa quả', sets: ['hai'] },
  { word: '学生', reading: 'がくせい', meaning: 'học sinh', sets: ['nin'] },
  { word: '先生', reading: 'せんせい', meaning: 'giáo viên', sets: ['nin'] },
  { word: '子ども', reading: 'こども', meaning: 'đứa trẻ', sets: ['nin'] },
  { word: 'りんご', reading: 'りんご', meaning: 'quả táo', sets: ['tsu', 'ko'] },
  { word: '卵', reading: 'たまご', meaning: 'quả trứng', sets: ['tsu', 'ko'] },
  { word: 'みかん', reading: 'みかん', meaning: 'quả quýt', sets: ['tsu', 'ko'] },
  { word: '靴', reading: 'くつ', meaning: 'đôi giày', sets: ['soku'] },
  { word: '服', reading: 'ふく', meaning: 'bộ quần áo', sets: ['chaku'] },
  { word: '店', reading: 'みせ', meaning: 'cửa hàng', sets: ['ken'] },
  { word: 'うち', reading: 'うち', meaning: 'ngôi nhà', sets: ['ken'] },
]

/** Nghĩa tiếng Việt của một mục: 3 người, tầng 3, mấy người? */
export function meaningOf(set: CounterSet, e: CountEntry): string {
  if (e.meaning) return e.meaning
  if (e.n === null) return set.what ?? `mấy ${set.unit ?? ''}?`.replace(' ?', '?')
  if (!set.unit) return String(e.n)
  return set.unitFirst ? `${set.unit} ${e.n}` : `${e.n.toLocaleString('vi-VN')} ${set.unit}`
}

export const GROUP_LABELS: Record<CounterGroup, { title: string; description: string }> = {
  numbers: { title: 'Numbers', description: '0, 10, 100, 1000, 10,000 and the sound changes' },
  counters: { title: 'Counters', description: 'Things, people, machines, flat things, long things…' },
  dates: { title: 'Dates', description: 'Days of the month, months, weekdays, years' },
  time: { title: 'Time', description: 'Hours, minutes, half past, a.m. / p.m.' },
}

export const setsOf = (group: CounterGroup) => COUNTER_SETS.filter((s) => s.group === group)
export const setById = (id: string) => COUNTER_SETS.find((s) => s.id === id)
