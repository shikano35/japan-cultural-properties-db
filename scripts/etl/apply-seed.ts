/**
 * .seed/のSQLをD1へ投入する。
 *
 *   pnpm etl:apply              ローカル
 *   pnpm etl:apply -- --remote  リモート
 */

import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const OUT_DIR = join(ROOT, '.seed')
const DATABASE = 'japan-cultural-properties-db'

function main(): void {
  const remote = process.argv.includes('--remote')
  const target = remote ? '--remote' : '--local'

  const files = readdirSync(OUT_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  if (files.length === 0) {
    throw new Error('.seed/にSQLがありません。pnpm etl:buildを先に実行してください。')
  }

  console.log(`投入先: ${remote ? 'リモート' : 'ローカル'} / ${files.length}ファイル`)
  files.forEach((file, i) => {
    const result = spawnSync(
      'pnpm',
      [
        'exec',
        'wrangler',
        'd1',
        'execute',
        DATABASE,
        target,
        '--yes',
        '--file',
        join(OUT_DIR, file),
      ],
      { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] }
    )
    if (result.status !== 0) {
      throw new Error(`投入に失敗しました: ${file}`)
    }
    process.stdout.write(`\r${i + 1}/${files.length}`)
  })
  process.stdout.write('\n投入が完了しました\n')
}

main()
