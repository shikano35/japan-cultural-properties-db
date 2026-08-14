import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { readCrawlTargets, type CrawlTarget } from './registry'

const ROOT = resolve(import.meta.dirname, '../..')
const DATA_DIR = join(ROOT, 'data')
const CRAWL_DIR = join(ROOT, '.crawl')
const HTML_DIR = join(CRAWL_DIR, 'html')

const USER_AGENT =
  'japan-cultural-properties-db/1.0 (research; https://github.com/shikano35/japan-cultural-properties-db)'

const DEFAULT_DELAY_SECONDS = 2
const MAX_ATTEMPTS = 3
const RETRY_BASE_SECONDS = 10
const ABORT_AFTER_CONSECUTIVE_FAILURES = 10
const REQUEST_TIMEOUT_MS = 40_000
const MIN_VALID_BYTES = 5_000

interface Options {
  delaySeconds: number
  limit: number | null
  heritageTypeCode: string | null
}

function parseOptions(argv: string[]): Options {
  const value = (flag: string): string | null => {
    const i = argv.indexOf(flag)
    return i >= 0 ? (argv[i + 1] ?? null) : null
  }
  const delay = value('--delay')
  const limit = value('--limit')
  return {
    delaySeconds: delay === null ? DEFAULT_DELAY_SECONDS : Number(delay),
    limit: limit === null ? null : Number(limit),
    heritageTypeCode: value('--type'),
  }
}

function sleep(seconds: number): Promise<void> {
  return new Promise((done) => setTimeout(done, seconds * 1000))
}

function htmlPath(target: CrawlTarget): string {
  if (!/^\d+$/.test(target.targetId)) {
    throw new Error(`管理対象IDが数値ではありません: ${target.ledgerCode}/${target.targetId}`)
  }
  return join(HTML_DIR, target.ledgerCode, `${target.targetId}.html`)
}

function alreadyFetched(path: string): boolean {
  return existsSync(path) && statSync(path).size >= MIN_VALID_BYTES
}

type FetchOutcome =
  { kind: 'saved'; bytes: number } | { kind: 'redirected' } | { kind: 'failed'; reason: string }

let cookie = ''

function rememberCookie(response: Response): void {
  const values = response.headers.getSetCookie()
  if (values.length === 0) return
  const pairs = values.map((value) => value.split(';')[0]).filter((v) => v !== undefined)
  if (pairs.length > 0) cookie = pairs.join('; ')
}

async function fetchOnce(target: CrawlTarget): Promise<FetchOutcome> {
  const response = await fetch(target.url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html',
      ...(cookie === '' ? {} : { cookie }),
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  rememberCookie(response)
  if (response.status === 302 || response.status === 303 || response.status === 307) {
    return { kind: 'redirected' }
  }
  if (response.status !== 200) {
    return { kind: 'failed', reason: `HTTP ${String(response.status)}` }
  }
  const body = await response.text()
  const bytes = Buffer.byteLength(body)
  if (bytes < MIN_VALID_BYTES) {
    return { kind: 'failed', reason: `本文が短すぎます: ${String(bytes)} bytes` }
  }
  mkdirSync(join(HTML_DIR, target.ledgerCode), { recursive: true })
  writeFileSync(htmlPath(target), body, 'utf8')
  return { kind: 'saved', bytes }
}

type RetryResult =
  { kind: 'saved'; bytes: number } | { kind: 'missing' } | { kind: 'failed'; reason: string }

async function fetchWithRetry(target: CrawlTarget): Promise<RetryResult> {
  let lastReason = ''
  let redirects = 0
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const outcome = await fetchOnce(target)
      if (outcome.kind === 'saved') return outcome
      if (outcome.kind === 'redirected') {
        redirects += 1
        lastReason = 'indexへリダイレクト'
      } else {
        lastReason = outcome.reason
      }
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error)
    }
    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_BASE_SECONDS * attempt)
    }
  }
  if (redirects === MAX_ATTEMPTS) return { kind: 'missing' }
  return { kind: 'failed', reason: lastReason }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2))
  if (!Number.isFinite(options.delaySeconds) || options.delaySeconds < 1) {
    throw new Error('--delayは1以上で指定してください')
  }

  let targets = readCrawlTargets(DATA_DIR)
  if (options.heritageTypeCode !== null) {
    targets = targets.filter((t) => t.heritageTypeCode === options.heritageTypeCode)
    if (targets.length === 0) {
      throw new Error(`該当する文化財種類がありません: ${options.heritageTypeCode}`)
    }
  }
  const pending = targets.filter((t) => !alreadyFetched(htmlPath(t)))
  const queue = options.limit === null ? pending : pending.slice(0, options.limit)

  console.log(`対象         : ${targets.length.toLocaleString()}件`)
  console.log(`取得済み     : ${(targets.length - pending.length).toLocaleString()}件`)
  console.log(`今回の取得   : ${queue.length.toLocaleString()}件`)
  console.log(`待機         : ${options.delaySeconds}秒`)
  if (queue.length === 0) {
    console.log('取得するものがありません')
    return
  }
  const estimate = (queue.length * (options.delaySeconds + 0.6)) / 3600
  console.log(`所要時間の目安: ${estimate.toFixed(1)}時間`)

  let stopRequested = false
  const stopping = (): boolean => stopRequested
  process.on('SIGINT', () => {
    stopRequested = true
    console.log('\n中断します。取得済みのファイルは保持されます')
  })

  const missing: CrawlTarget[] = []
  const failed: { target: CrawlTarget; reason: string }[] = []
  let saved = 0
  let consecutiveFailures = 0

  for (const [index, target] of queue.entries()) {
    if (stopping()) break
    const outcome = await fetchWithRetry(target)
    if (outcome.kind === 'saved') {
      saved += 1
      consecutiveFailures = 0
    } else if (outcome.kind === 'missing') {
      missing.push(target)
      consecutiveFailures = 0
    } else {
      failed.push({ target, reason: outcome.reason })
      consecutiveFailures += 1
      console.log(`\n失敗 ${target.url} : ${outcome.reason}`)
      if (consecutiveFailures >= ABORT_AFTER_CONSECUTIVE_FAILURES) {
        console.log(`連続${String(consecutiveFailures)}件失敗したため停止します`)
        break
      }
    }
    process.stdout.write(
      `\r${String(index + 1)}/${String(queue.length)}  保存 ${String(saved)}  不在 ${String(missing.length)}  失敗 ${String(failed.length)}`
    )
    if (index < queue.length - 1 && !stopping()) {
      await sleep(options.delaySeconds)
    }
  }

  process.stdout.write('\n')
  console.log(`保存 : ${saved.toLocaleString()}件`)
  console.log(`不在 : ${missing.length.toLocaleString()}件`)
  console.log(`失敗 : ${failed.length.toLocaleString()}件`)

  if (missing.length > 0) {
    writeFileSync(
      join(CRAWL_DIR, 'missing.txt'),
      missing.map((t) => `${t.url}\t${t.name}`).join('\n') + '\n',
      'utf8'
    )
    console.log('一覧: .crawl/missing.txt')
  }
  if (failed.length > 0) {
    writeFileSync(
      join(CRAWL_DIR, 'failed.txt'),
      failed.map((f) => `${f.target.url}\t${f.reason}\t${f.target.name}`).join('\n') + '\n',
      'utf8'
    )
    console.log('一覧: .crawl/failed.txt / 失敗した件は再実行すると再取得します')
  }
}

await main()
