export const DETAIL_BASE_URL = 'https://kunishitei.bunka.go.jp/bsys/maindetails'

export const LEDGER_CODE_BY_HERITAGE_TYPE: Readonly<Record<string, string>> = {
  national_treasure_and_icp_building: '102',
  registered_tangible_building: '101',
  ipds: '103',
  national_treasure_and_icp_art_craft: '201',
  registered_tangible_art_craft: '211',
  registered_art_object: '202',
  important_tangible_folk: '301',
  registered_tangible_folk: '311',
  important_intangible_folk: '302',
  registered_intangible_folk: '322',
  recorded_intangible_folk: '312',
  important_intangible: '303',
  registered_intangible: '323',
  recorded_intangible: '313',
  selected_conservation_technique: '304',
  monument: '401',
  registered_monument: '411',
  important_cultural_landscape: '412',
  world_heritage: '901',
}

export function ledgerCode(heritageTypeCode: string): string {
  const code = LEDGER_CODE_BY_HERITAGE_TYPE[heritageTypeCode]
  if (code === undefined) {
    throw new Error(`台帳コードが未定義の文化財種類: ${heritageTypeCode}`)
  }
  return code
}

export function detailUrl(heritageTypeCode: string, sourceTargetId: string): string {
  return `${DETAIL_BASE_URL}/${ledgerCode(heritageTypeCode)}/${sourceTargetId}`
}

export function detailKey(ledger: string, targetId: string): string {
  return `${ledger}/${targetId}`
}
