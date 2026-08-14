import { resolve } from 'node:path'
import { htmlDir, loadDetails } from './load'

const ROOT = resolve(import.meta.dirname, '../..')

function main(): void {
  const show = process.argv.includes('--show')
  const details = [...loadDetails(htmlDir(ROOT)).values()]
  if (details.length === 0) {
    throw new Error('.crawl/html/にHTMLがありません。pnpm crawl:fetchを先に実行してください。')
  }

  const unknown = new Map<string, number>()
  let nameKana = 0
  let summaryText = 0
  let detailText = 0
  let hasPhoto = 0
  let criteria = 0
  let fields = 0
  let attachments = 0
  let holders = 0
  let changes = 0
  let summaryChars = 0

  for (const detail of details) {
    if (detail.nameKana !== null) nameKana += 1
    if (detail.summaryText !== null) summaryText += 1
    if (detail.detailText !== null) detailText += 1
    if (detail.hasPhoto) hasPhoto += 1
    criteria += detail.criteria.length
    fields += detail.details.length
    attachments += detail.attachments.length
    holders += detail.holders.length
    changes += detail.changes.length
    summaryChars += (detail.summaryText?.length ?? 0) + (detail.detailText?.length ?? 0)
    for (const label of detail.unknownLabels) {
      unknown.set(label, (unknown.get(label) ?? 0) + 1)
    }
  }

  const rows: [string, string][] = [
    ['解析', `${details.length.toLocaleString()}件`],
    ['ふりがな', `${nameKana.toLocaleString()}件`],
    ['解説文', `${summaryText.toLocaleString()}件`],
    ['詳細解説', `${detailText.toLocaleString()}件`],
    ['写真あり', `${hasPhoto.toLocaleString()}件`],
    ['指定基準', `${criteria.toLocaleString()}件`],
    ['固有項目', `${fields.toLocaleString()}件`],
    ['附指定', `${attachments.toLocaleString()}件`],
    ['保持者・団体', `${holders.toLocaleString()}件`],
    ['措置', `${changes.toLocaleString()}件`],
    ['解説の総文字数', `${summaryChars.toLocaleString()}字`],
  ]
  for (const [label, value] of rows) {
    console.log(`${label.padEnd(14, '　')}: ${value}`)
  }

  if (unknown.size > 0) {
    console.log('\n未知の項目名:')
    for (const [label, count] of [...unknown.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(count).padStart(6)}回  ${label}`)
    }
  }

  const first = details[0]
  if (show && first !== undefined) {
    console.log('\n' + JSON.stringify(first, null, 2))
  }
}

main()
