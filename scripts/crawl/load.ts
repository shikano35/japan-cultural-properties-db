import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { detailKey } from './ledgers'
import { parseDetail, type ParsedDetail } from './parse'

export function htmlDir(root: string): string {
  return join(root, '.crawl', 'html')
}

export function listHtmlFiles(
  dir: string
): { ledgerCode: string; targetId: string; path: string }[] {
  if (!existsSync(dir)) return []
  const result: { ledgerCode: string; targetId: string; path: string }[] = []
  for (const ledgerCode of readdirSync(dir).sort()) {
    const ledgerDir = join(dir, ledgerCode)
    for (const file of readdirSync(ledgerDir).sort()) {
      if (!file.endsWith('.html')) continue
      result.push({
        ledgerCode,
        targetId: file.replace(/\.html$/, ''),
        path: join(ledgerDir, file),
      })
    }
  }
  return result
}

export function loadDetails(dir: string): Map<string, ParsedDetail> {
  const result = new Map<string, ParsedDetail>()
  for (const file of listHtmlFiles(dir)) {
    const html = readFileSync(file.path, 'utf8')
    result.set(
      detailKey(file.ledgerCode, file.targetId),
      parseDetail(html, file.ledgerCode, file.targetId)
    )
  }
  return result
}
