export type DatePrecision = 'day' | 'month' | 'unknown'
export type CriterionKind = 'designation' | 'registration' | 'selection' | 'selected'
export type HolderKind = 'individual' | 'group'

export interface DetailDate {
  iso: string | null
  precision: DatePrecision
  eraText: string | null
  sourceText: string
}

export interface ParsedCriterion {
  kind: CriterionKind
  slot: number
  text: string
}

export interface ParsedAttachment {
  name: string
  quantityText: string | null
}

export interface ParsedHolder {
  kind: HolderKind
  name: string | null
  nameKana: string | null
  certifiedOn: DetailDate | null
  certificationRound: string | null
}

export interface ParsedChange {
  changedOn: DetailDate | null
  typeNames: string[]
  content: string | null
}

export interface ParsedDetail {
  ledgerCode: string
  targetId: string
  nameKana: string | null
  unitNameKana: string | null
  quantityText: string | null
  eraText: string | null
  yearText: string | null
  areaText: string | null
  ownerKind: string | null
  summaryText: string | null
  detailText: string | null
  hasPhoto: boolean
  hasAttachment: boolean
  designationNumber: string | null
  branchNumber: string | null
  notificationNumber: string | null
  registrationRound: string | null
  dates: Record<string, DetailDate>
  criteria: ParsedCriterion[]
  details: { fieldCode: string; value: string }[]
  attachments: ParsedAttachment[]
  holders: ParsedHolder[]
  changes: ParsedChange[]
  unknownLabels: string[]
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16))
    }
    if (body.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(body.slice(1), 10))
    }
    return ENTITIES[body.toLowerCase()] ?? whole
  })
}

function stripTags(value: string): string {
  return decodeEntities(
    value
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
  )
}

function collapse(value: string): string {
  return stripTags(value)
    .replace(/[ \t\u00a0\u3000]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join(' ')
    .trim()
}

function cleanLabel(value: string): string {
  const text = collapse(value)
  const parts = text.split('▶')
  return (parts.at(-1) ?? text).replace(/^[：:\s]+/, '').trim()
}

function nullIfBlank(value: string): string | null {
  return value === '' ? null : value
}

export function parseDetailDate(raw: string): DetailDate | null {
  const text = collapse(raw)
  if (text === '') return null
  const matched = /^(\d{4})\.(\d{2})\.(\d{2})(?:\s*[(（]([^)）]*)[)）])?/.exec(text)
  if (matched === null) {
    return { iso: null, precision: 'unknown', eraText: null, sourceText: text }
  }
  const [, year, month, day, era] = matched
  const eraText = era === undefined ? null : era.trim()
  if (year === undefined || month === undefined || day === undefined) {
    return { iso: null, precision: 'unknown', eraText, sourceText: text }
  }
  if (month === '00') {
    return { iso: null, precision: 'unknown', eraText, sourceText: text }
  }
  if (day === '00') {
    return { iso: `${year}-${month}-01`, precision: 'month', eraText, sourceText: text }
  }
  return { iso: `${year}-${month}-${day}`, precision: 'day', eraText, sourceText: text }
}

const YEAR_SEPARATOR = '[-−–—~〜～]'
const YEAR_SUFFIX = '(?:年)?\\s*(?:頃|ころ)?'
const SINGLE_YEAR = new RegExp(`^(-?\\d{1,4})\\s*${YEAR_SUFFIX}$`)
const YEAR_RANGE = new RegExp(
  `^(-?\\d{1,4})\\s*(?:年)?\\s*${YEAR_SEPARATOR}\\s*(-?\\d{1,4})\\s*${YEAR_SUFFIX}$`
)

function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
}

export function parseYearRange(raw: string | null): { from: number | null; to: number | null } {
  if (raw === null) return { from: null, to: null }
  const text = toHalfWidthDigits((raw.split(/[／/]/)[0] ?? '').trim())
  const single = SINGLE_YEAR.exec(text)?.[1]
  if (single !== undefined) {
    const year = Number(single)
    return { from: year, to: year }
  }
  const range = YEAR_RANGE.exec(text)
  const from = range?.[1]
  const to = range?.[2]
  if (from !== undefined && to !== undefined) {
    return { from: Number(from), to: Number(to) }
  }
  return { from: null, to: null }
}

export function parseHectares(raw: string | null): number | null {
  if (raw === null) return null
  const matched = /(-?[\d,]+(?:\.\d+)?)\s*ha/i.exec(raw)?.[1]
  if (matched === undefined) return null
  const value = Number(matched.replace(/,/g, ''))
  return Number.isFinite(value) ? value : null
}

const FIELD_ROW =
  /<td[^>]*class="(?:detail-td|cont)"[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>\s*[：:]\s*<\/td>\s*<td[^>]*class="(?:detailtitle01|detail-td|cont)"[^>]*>([\s\S]*?)<\/td>/g

export function parseFieldRows(html: string): Map<string, string> {
  const result = new Map<string, string>()
  for (const matched of html.matchAll(FIELD_ROW)) {
    const label = cleanLabel(matched[1] ?? '')
    const value = collapse(matched[2] ?? '')
    if (label === '' || result.has(label)) continue
    result.set(label, value)
  }
  return result
}

export function mainRegion(html: string): string {
  const start = html.indexOf('<!-- heritage_detail START -->')
  const end = html.indexOf('<!-- heritage_detail END -->')
  if (start >= 0 && end > start) return html.slice(start, end)
  const curtain = html.indexOf('<div id="curtain"')
  return curtain > 0 ? html.slice(0, curtain) : html
}

const MODAL_START = /<div id="(detail_[a-z0-9_]+)"/g

function splitModals(html: string): Map<string, string> {
  const starts: { id: string; index: number }[] = []
  for (const matched of html.matchAll(MODAL_START)) {
    if (matched[1] !== undefined) starts.push({ id: matched[1], index: matched.index })
  }
  const result = new Map<string, string>()
  starts.forEach((start, i) => {
    const end = starts[i + 1]?.index ?? html.length
    if (!result.has(start.id)) result.set(start.id, html.slice(start.index, end))
  })
  return result
}

const TEXTAREA = /<textarea[^>]*>([\s\S]*?)<\/textarea>/g
const RESULT_TITLE = /class="resulttitle00"[^>]*>\s*([^<]*)/g

function parseExplanations(html: string): {
  summaryText: string | null
  detailText: string | null
} {
  let summaryText: string | null = null
  let detailText: string | null = null
  for (const matched of html.matchAll(TEXTAREA)) {
    const text = decodeEntities(matched[1] ?? '').trim()
    if (text === '') continue
    const before = html.slice(0, matched.index)
    const titles = [...before.matchAll(RESULT_TITLE)]
    const title = collapse(titles.at(-1)?.[1] ?? '')
    if (title === '詳細解説') {
      detailText ??= text
    } else {
      summaryText ??= text
    }
  }
  return { summaryText, detailText }
}

const REL_TITLE = /class="reltitle02"[^>]*>([\s\S]*?)<\/span>/

function relationKind(modal: string): string {
  return collapse(REL_TITLE.exec(modal)?.[1] ?? '')
}

const CRITERION_LABEL = /^(?:重文)?(指定|登録|選択|選定)基準([０-９\d])?$/
const CRITERION_KIND_BY_PREFIX: Readonly<Record<string, CriterionKind>> = {
  指定: 'designation',
  登録: 'registration',
  選択: 'selection',
  選定: 'selected',
}

function slotNumber(raw: string | undefined): number {
  if (raw === undefined || raw === '') return 1
  const normalized = raw.replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xff10))
  const value = Number(normalized)
  return Number.isFinite(value) && value > 0 ? value : 1
}

const IGNORED_LABELS = new Set([
  '名称',
  'ふりがな',
  '棟名',
  '棟名ふりがな',
  '種別',
  '種別１',
  '種別２',
  '種別1',
  '種別2',
  '種別（有形、無形、有形・無形）',
  '国',
  '時代',
  '所在都道府県',
  '所在都道府県、地域',
  '地域',
  '所在地',
  '保管施設の名称',
  '所有者名',
  '管理団体・管理責任者名',
  '保護団体名',
  '員数',
  '年代',
  '西暦',
  '面積',
  '所有者種別',
  '所在地（市区町村）',
  '枝番',
  '登録回',
])

const DATE_LABELS: Readonly<Record<string, string>> = {
  重文指定年月日: 'icp',
  国宝指定年月日: 'national_treasure',
  指定年月日: 'designated',
  登録年月日: 'registered',
  登録告示年月日: 'notified',
  選択年月日: 'selected',
  選定年月日: 'selected',
  特別指定年月日: 'special',
  追加年月日: 'added',
  '認定・指定年月日': 'certified',
}

const NUMBER_LABELS = new Set([
  '指定番号',
  '指定番号（登録番号）',
  '登録番号',
  '選択番号',
  '選定番号',
  '指定証書番号',
])

const DETAIL_FIELD_BY_LABEL: Readonly<Record<string, string>> = {
  構造及び形式等: 'structure',
  創建及び沿革: 'foundation',
  '棟礼、墨書、その他参考となるべき事項': 'building_note',
  作者: 'author',
  '寸法・重量': 'dimensions',
  '品質・形状': 'material_form',
  ト書: 'stage_direction',
  '画賛・奥書・銘文等': 'inscription',
  '伝来・その他参考となるべき事項': 'provenance',
  その他参考となるべき事項: 'other_note',
  制作時期: 'production_period',
  公開契約館の名称: 'exhibition_venue',
  認定区分: 'holder_certification_kind',
  指名区分: 'designation_kind',
  特別区分: 'special_kind',
  構成資産: 'components',
  国宝・重文区分: 'treasure_class',
}

function distinctCriteria(criteria: ParsedCriterion[]): ParsedCriterion[] {
  const seen = new Set<string>()
  return criteria.filter((criterion) => {
    const key = `${criterion.kind} ${criterion.text}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function parseAttachments(modal: string): ParsedAttachment[] {
  const rows = parseFieldRows(modal)
  const name = rows.get('附名称')
  if (name === undefined || name === '') return []
  return [{ name, quantityText: nullIfBlank(rows.get('附員数') ?? '') }]
}

function parseHolder(modal: string, kind: HolderKind): ParsedHolder | null {
  const rows = parseFieldRows(modal)
  const name =
    kind === 'group'
      ? (rows.get('団体情報の名称') ?? rows.get('保持団体の名称') ?? '')
      : (rows.get('保持者（関係技芸者）の氏名') ?? '')
  const nameKana =
    kind === 'group'
      ? (rows.get('団体情報の名称 ふりがな') ?? rows.get('保持団体の名称 ふりがな') ?? '')
      : (rows.get('保持者（関係技芸者）の氏名 ふりがな') ?? '')
  if (name === '' && nameKana === '') return null
  return {
    kind,
    name: nullIfBlank(name),
    nameKana: nullIfBlank(nameKana),
    certifiedOn: parseDetailDate(rows.get('認定・指定年月日') ?? ''),
    certificationRound: nullIfBlank(rows.get('認定次') ?? ''),
  }
}

function parseChange(modal: string): ParsedChange | null {
  const rows = parseFieldRows(modal)
  const changedOn = parseDetailDate(rows.get('異動年月日') ?? '')
  const typeNames = ['異動種別1', '異動種別2', '異動種別3']
    .map((label) => rows.get(label) ?? '')
    .filter((value) => value !== '')
  const content = nullIfBlank(rows.get('異動内容') ?? '')
  if (changedOn === null && typeNames.length === 0 && content === null) return null
  return { changedOn, typeNames, content }
}

export function parseDetail(html: string, ledgerCode: string, targetId: string): ParsedDetail {
  const rows = parseFieldRows(mainRegion(html))
  const modals = splitModals(html)
  const { summaryText, detailText } = parseExplanations(html)

  const dates: Record<string, DetailDate> = {}
  const criteria: ParsedCriterion[] = []
  const details: { fieldCode: string; value: string }[] = []
  const unknownLabels: string[] = []
  let designationNumber: string | null = null
  let notificationNumber: string | null = null

  for (const [label, value] of rows) {
    const criterion = CRITERION_LABEL.exec(label)
    if (criterion !== null) {
      const kind = CRITERION_KIND_BY_PREFIX[criterion[1] ?? '']
      if (kind !== undefined && value !== '') {
        if (ledgerCode === '901') {
          details.push({
            fieldCode: `world_heritage_criterion_${String(slotNumber(criterion[2]))}`,
            value,
          })
        } else {
          for (const text of value.split(',')) {
            const trimmed = text.trim()
            if (trimmed !== '') {
              criteria.push({ kind, slot: slotNumber(criterion[2]), text: trimmed })
            }
          }
        }
      }
      continue
    }

    const dateKey = DATE_LABELS[label]
    if (dateKey !== undefined) {
      const parsed = parseDetailDate(value)
      if (parsed !== null) dates[dateKey] = parsed
      continue
    }

    if (NUMBER_LABELS.has(label)) {
      if (value !== '') designationNumber ??= value
      continue
    }
    if (label === '告示番号') {
      if (value !== '') notificationNumber ??= value
      continue
    }

    const fieldCode = DETAIL_FIELD_BY_LABEL[label]
    if (fieldCode !== undefined) {
      if (value !== '') details.push({ fieldCode, value })
      continue
    }
    if (!IGNORED_LABELS.has(label)) unknownLabels.push(label)
  }

  const attachments: ParsedAttachment[] = []
  const holders: ParsedHolder[] = []
  const changes: ParsedChange[] = []

  for (const [id, modal] of modals) {
    const record = /^detail_rellist_(\d+)_(\d+)$/.exec(id)
    if (record === null) continue
    const parentKind = relationKind(modals.get(`detail_rellist_${record[1] ?? ''}`) ?? '')
    if (parentKind.includes('附指定')) {
      attachments.push(...parseAttachments(modal))
    } else if (parentKind.includes('保持者')) {
      const holder = parseHolder(modal, 'individual')
      if (holder !== null) holders.push(holder)
    } else if (parentKind.includes('団体') || parentKind.includes('保持団体')) {
      const holder = parseHolder(modal, 'group')
      if (holder !== null) holders.push(holder)
    } else if (parentKind.includes('措置')) {
      const change = parseChange(modal)
      if (change !== null) changes.push(change)
    }
  }

  const attachmentRow = /添付ファイル\s*<\/td>\s*<td[^>]*class="cont"[^>]*>([\s\S]*?)<\/td>/.exec(
    html
  )

  return {
    ledgerCode,
    targetId,
    nameKana: nullIfBlank(rows.get('ふりがな') ?? ''),
    unitNameKana: nullIfBlank(rows.get('棟名ふりがな') ?? ''),
    quantityText: nullIfBlank(rows.get('員数') ?? ''),
    eraText: nullIfBlank(rows.get('年代') ?? ''),
    yearText: nullIfBlank(rows.get('西暦') ?? ''),
    areaText: nullIfBlank(rows.get('面積') ?? ''),
    ownerKind: nullIfBlank(rows.get('所有者種別') ?? ''),
    summaryText,
    detailText,
    hasPhoto: html.includes('id="detail_photolist"'),
    hasAttachment: collapse(attachmentRow?.[1] ?? '') === 'あり',
    designationNumber,
    branchNumber: nullIfBlank(rows.get('枝番') ?? ''),
    notificationNumber,
    registrationRound: nullIfBlank(rows.get('登録回') ?? ''),
    dates,
    criteria: distinctCriteria(criteria),
    details,
    attachments,
    holders,
    changes,
    unknownLabels,
  }
}
