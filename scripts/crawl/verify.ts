import { existsSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { readCrawlTargets, type CrawlTarget } from './registry'

const ROOT = resolve(import.meta.dirname, '../..')
const CRAWL_DIR = join(ROOT, '.crawl')
const OUT_FILE = join(CRAWL_DIR, 'missing-targets.txt')

function isFetched(target: CrawlTarget): boolean {
  return existsSync(join(CRAWL_DIR, 'html', target.ledgerCode, `${target.targetId}.html`))
}

function main(): void {
  const targets = readCrawlTargets(join(ROOT, 'data'))
  const byLedger = new Map<string, { total: number; saved: number }>()
  const missing: CrawlTarget[] = []

  for (const target of targets) {
    const entry = byLedger.get(target.ledgerCode) ?? { total: 0, saved: 0 }
    entry.total += 1
    if (isFetched(target)) entry.saved += 1
    else missing.push(target)
    byLedger.set(target.ledgerCode, entry)
  }

  for (const [ledger, entry] of [...byLedger.entries()].sort()) {
    const mark = entry.saved === entry.total ? '完了' : `未取得${entry.total - entry.saved}件`
    console.log(
      `  台帳 ${ledger}: ${entry.saved.toLocaleString()}/${entry.total.toLocaleString()} ${mark}`
    )
  }

  const rate = ((targets.length - missing.length) / targets.length) * 100
  console.log(
    `\n対象 ${targets.length.toLocaleString()}件 / 取得済み ${(targets.length - missing.length).toLocaleString()}件 (${rate.toFixed(2)}%)`
  )

  if (missing.length === 0) {
    console.log('未取得はありません')
    return
  }
  writeFileSync(OUT_FILE, missing.map((t) => `${t.url}\t${t.name}`).join('\n') + '\n', 'utf8')
  console.log(`未取得 ${missing.length.toLocaleString()}件 / 一覧: .crawl/missing-targets.txt`)
  console.log('pnpm crawl:fetch を再実行すると未取得のものだけを取得します')
  process.exitCode = 1
}

main()
