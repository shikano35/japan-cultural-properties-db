/**
 * .seed/のSQLをD1へ投入する。
 *
 *   pnpm etl:apply              ローカル
 *   pnpm etl:apply -- --remote  リモート
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const OUT_DIR = join(ROOT, '.seed')
const DATABASE = 'japan-cultural-properties-db'

const TABLES_IN_DELETE_ORDER = [
  'property_change_types',
  'property_changes',
  'change_types',
  'property_holders',
  'property_attachments',
  'property_designation_criteria',
  'designation_criteria',
  'property_details',
  'detail_fields',
  'property_actors',
  'property_places',
  'property_categories',
  'designations',
  'properties',
  'actors',
  'places',
  'categories',
  'category_schemes',
  'designation_categories',
  'heritage_types',
  'registers',
  'sources',
]

function execute(file: string, remote: boolean): void {
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'd1',
      'execute',
      DATABASE,
      remote ? '--remote' : '--local',
      '--yes',
      '--file',
      file,
    ],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] }
  )
  if (result.status !== 0) {
    throw new Error(`投入に失敗しました: ${file}`)
  }
}

function resetSql(): string {
  const statements = [
    'PRAGMA defer_foreign_keys = true;',
    "INSERT INTO properties_fts(properties_fts) VALUES('delete-all');",
    ...TABLES_IN_DELETE_ORDER.map((table) => `DELETE FROM ${table};`),
  ]
  return `${statements.join('\n')}\n`
}

function main(): void {
  const remote = process.argv.includes('--remote')
  const reset = process.argv.includes('--reset')

  const files = readdirSync(OUT_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  if (files.length === 0) {
    throw new Error('.seed/にSQLがありません。pnpm etl:buildを先に実行してください。')
  }

  console.log(`投入先: ${remote ? 'リモート' : 'ローカル'} / ${files.length}ファイル`)

  if (reset) {
    const path = join(mkdtempSync(join(tmpdir(), 'seed-reset-')), 'reset.sql')
    writeFileSync(path, resetSql(), 'utf8')
    console.log(`既存データを削除します: ${String(TABLES_IN_DELETE_ORDER.length)}テーブル`)
    execute(path, remote)
    console.log('削除が完了しました')
  }

  files.forEach((file, i) => {
    execute(join(OUT_DIR, file), remote)
    process.stdout.write(`\r${i + 1}/${files.length}`)
  })
  process.stdout.write('\n投入が完了しました\n')
}

main()
