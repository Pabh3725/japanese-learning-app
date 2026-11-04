// Đọc CSV (RFC 4180) và nhớ mỗi bản ghi bắt đầu ở dòng nào trong file,
// để báo lỗi kiểu "vocabularies.csv dòng 37".
//
// Hỗ trợ: ô có ngoặc kép, "" bên trong ngoặc kép, xuống dòng trong ô,
// CRLF hoặc LF, BOM ở đầu file. Ô trống được giữ là chuỗi rỗng "";
// việc đổi "" thành NULL thuộc về schema (data-spec §1.5).

export interface CsvRecord {
  /** Số dòng trong file (dòng 1 là header) nơi bản ghi bắt đầu. */
  line: number
  cells: string[]
}

export interface CsvParseResult {
  records: CsvRecord[]
  /** Lỗi cú pháp CSV (ngoặc kép không đóng...). */
  errors: { line: number; message: string }[]
}

export function parseCsv(text: string): CsvParseResult {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const records: CsvRecord[] = []
  const errors: CsvParseResult['errors'] = []

  let cells: string[] = []
  let cell = ''
  let inQuotes = false
  let cellWasQuoted = false
  let line = 1
  let recordLine = 1

  const endCell = () => {
    cells.push(cell)
    cell = ''
    cellWasQuoted = false
  }
  const endRecord = () => {
    endCell()
    // Bỏ dòng trống hoàn toàn (thường là dòng cuối file)
    if (!(cells.length === 1 && cells[0] === '')) {
      records.push({ line: recordLine, cells })
    }
    cells = []
  }

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        if (ch === '\n') line++
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      if (cell !== '' || cellWasQuoted) {
        errors.push({ line, message: 'Dấu " nằm giữa ô không có ngoặc kép bao ngoài' })
      }
      inQuotes = true
      cellWasQuoted = true
    } else if (ch === ',') {
      endCell()
    } else if (ch === '\r') {
      // bỏ qua, \n phía sau sẽ kết thúc dòng
    } else if (ch === '\n') {
      endRecord()
      line++
      recordLine = line
    } else {
      cell += ch
    }
  }

  if (inQuotes) {
    errors.push({ line: recordLine, message: 'Ngoặc kép mở nhưng không đóng tới cuối file' })
  }
  endRecord()

  return { records, errors }
}
