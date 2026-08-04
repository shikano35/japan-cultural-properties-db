/**
 * OpenAPI 仕様を openapi.json へ書き出す。
 *
 *   pnpm openapi:generate         生成
 *   pnpm openapi:check            コミット済みファイルとの差分を確認
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createApp } from '../../src/app'

const OUTPUT = resolve(import.meta.dirname, '../..', 'openapi.json')

async function generate(): Promise<string> {
  const res = await createApp().request('/openapi.json')
  if (!res.ok) {
    throw new Error(`仕様の生成に失敗しました: ${res.status}`)
  }
  return `${JSON.stringify(await res.json(), null, 2)}\n`
}

async function main(): Promise<void> {
  const document = await generate()

  if (process.argv.includes('--check')) {
    const current = readFileSync(OUTPUT, 'utf8')
    if (current !== document) {
      console.error(
        `${join('openapi.json')} が最新ではありません。pnpm openapi:generate を実行してコミットしてください。`
      )
      process.exitCode = 1
      return
    }
    console.log('openapi.json は最新です')
    return
  }

  writeFileSync(OUTPUT, document, 'utf8')
  console.log(`openapi.json を書き出しました: ${document.length.toLocaleString()} バイト`)
}

await main()
