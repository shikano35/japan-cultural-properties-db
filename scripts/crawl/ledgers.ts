import { detailUrl as buildDetailUrl, ledgerCode as findLedgerCode } from '../../src/lib/source-url'

export { DETAIL_BASE_URL, LEDGER_CODE_BY_HERITAGE_TYPE } from '../../src/lib/source-url'

export function ledgerCode(heritageTypeCode: string): string {
  const code = findLedgerCode(heritageTypeCode)
  if (code === null) {
    throw new Error(`台帳コードが未定義の文化財種類: ${heritageTypeCode}`)
  }
  return code
}

export function detailUrl(heritageTypeCode: string, sourceTargetId: string): string {
  const url = buildDetailUrl(heritageTypeCode, sourceTargetId)
  if (url === null) {
    throw new Error(`台帳コードが未定義の文化財種類: ${heritageTypeCode}`)
  }
  return url
}

export function detailKey(ledger: string, targetId: string): string {
  return `${ledger}/${targetId}`
}
