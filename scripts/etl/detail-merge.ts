import { detailKey, ledgerCode } from '../crawl/ledgers'
import { parseHectares, parseYearRange, type DetailDate, type ParsedDetail } from '../crawl/parse'
import type { DatePrecision, Designation, Property } from './types'

export interface EnrichedDesignation extends Designation {
  japaneseEraDate: string | null
}

export interface EnrichedProperty extends Omit<Property, 'designations'> {
  designations: EnrichedDesignation[]
  designationNumber: string | null
  branchNumber: string | null
  notificationNumber: string | null
  notifiedOn: string | null
  addedOn: string | null
  registrationRound: string | null
  nameKana: string | null
  unitNameKana: string | null
  quantityText: string | null
  eraText: string | null
  yearText: string | null
  yearFrom: number | null
  yearTo: number | null
  areaText: string | null
  areaHectares: number | null
  ownerKind: string | null
  summaryText: string | null
  detailText: string | null
  hasPhoto: boolean | null
  hasAttachment: boolean | null
  detailRetrievedOn: string | null
  criteria: { kind: string; slot: number; text: string }[]
  details: { fieldCode: string; value: string }[]
  attachments: { name: string; quantityText: string | null }[]
  holders: {
    kind: 'individual' | 'group'
    groupName: string | null
    groupNameKana: string | null
    certifiedOn: string | null
    datePrecision: DatePrecision
    certificationRound: string | null
  }[]
  changes: {
    changedOn: string | null
    datePrecision: DatePrecision
    sourceDate: string | null
    content: string | null
    typeNames: string[]
  }[]
}

const BASE_CATEGORY_BY_SPECIAL: Readonly<Record<string, string>> = {
  special_historic_site: 'historic_site',
  special_place_of_scenic_beauty: 'place_of_scenic_beauty',
  special_natural_monument: 'natural_monument',
}

function dateKeyFor(heritageTypeCode: string, categoryCode: string): string {
  if (categoryCode === 'national_treasure') return 'national_treasure'
  if (categoryCode === 'important_cultural_property') return 'icp'
  if (BASE_CATEGORY_BY_SPECIAL[categoryCode] !== undefined) return 'special'
  switch (heritageTypeCode) {
    case 'registered_tangible_building':
    case 'registered_tangible_art_craft':
    case 'registered_art_object':
    case 'registered_tangible_folk':
    case 'registered_intangible_folk':
    case 'registered_intangible':
    case 'registered_monument':
      return 'registered'
    case 'recorded_intangible_folk':
    case 'recorded_intangible':
    case 'selected_conservation_technique':
    case 'important_cultural_landscape':
    case 'ipds':
      return 'selected'
    default:
      return 'designated'
  }
}

function withDate(designation: Designation, date: DetailDate | undefined): EnrichedDesignation {
  if (date === undefined) return { ...designation, japaneseEraDate: null }
  return {
    ...designation,
    designatedOn: date.iso,
    datePrecision: date.precision,
    sourceDate: date.sourceText,
    japaneseEraDate: date.eraText,
  }
}

function fromDate(categoryCode: string, date: DetailDate): EnrichedDesignation {
  return {
    categoryCode,
    designatedOn: date.iso,
    datePrecision: date.precision,
    sourceDate: date.sourceText,
    japaneseEraDate: date.eraText,
  }
}

function buildDesignations(property: Property, detail: ParsedDetail): EnrichedDesignation[] {
  const result: EnrichedDesignation[] = property.designations.map((designation) =>
    withDate(
      designation,
      detail.dates[dateKeyFor(property.heritageTypeCode, designation.categoryCode)]
    )
  )

  const designated = detail.dates['designated']
  if (designated !== undefined) {
    for (const designation of property.designations) {
      const baseCategory = BASE_CATEGORY_BY_SPECIAL[designation.categoryCode]
      if (baseCategory === undefined) continue
      if (result.some((d) => d.categoryCode === baseCategory)) continue
      result.push(fromDate(baseCategory, designated))
    }
  }
  return result
}

function toPlainDesignations(property: Property): EnrichedDesignation[] {
  return property.designations.map((designation) => ({ ...designation, japaneseEraDate: null }))
}

const EMPTY_DETAIL_FIELDS = {
  designationNumber: null,
  branchNumber: null,
  notificationNumber: null,
  notifiedOn: null,
  addedOn: null,
  registrationRound: null,
  nameKana: null,
  unitNameKana: null,
  quantityText: null,
  eraText: null,
  yearText: null,
  yearFrom: null,
  yearTo: null,
  areaText: null,
  areaHectares: null,
  ownerKind: null,
  summaryText: null,
  detailText: null,
  hasPhoto: null,
  hasAttachment: null,
  detailRetrievedOn: null,
} as const

export function enrich(
  properties: Property[],
  details: Map<string, ParsedDetail>,
  retrievedOn: string
): EnrichedProperty[] {
  return properties.map((property) => {
    const key = detailKey(ledgerCode(property.heritageTypeCode), property.sourceTargetId)
    const detail = details.get(key)
    if (detail === undefined) {
      return {
        ...property,
        ...EMPTY_DETAIL_FIELDS,
        designations: toPlainDesignations(property),
        criteria: [],
        details: [],
        attachments: [],
        holders: [],
        changes: [],
      }
    }
    const years = parseYearRange(detail.yearText)
    return {
      ...property,
      designations: buildDesignations(property, detail),
      designationNumber: detail.designationNumber,
      branchNumber: detail.branchNumber,
      notificationNumber: detail.notificationNumber,
      notifiedOn: detail.dates['notified']?.iso ?? null,
      addedOn: detail.dates['added']?.iso ?? null,
      registrationRound: detail.registrationRound,
      nameKana: detail.nameKana,
      unitNameKana: detail.unitNameKana,
      quantityText: detail.quantityText,
      eraText: detail.eraText,
      yearText: detail.yearText,
      yearFrom: years.from,
      yearTo: years.to,
      areaText: detail.areaText,
      areaHectares: parseHectares(detail.areaText),
      ownerKind: detail.ownerKind,
      summaryText: detail.summaryText,
      detailText: detail.detailText,
      hasPhoto: detail.hasPhoto,
      hasAttachment: detail.hasAttachment,
      detailRetrievedOn: retrievedOn,
      criteria: detail.criteria,
      details: detail.details,
      attachments: detail.attachments,
      holders: detail.holders.map((holder) => ({
        kind: holder.kind,
        groupName: holder.kind === 'group' ? holder.name : null,
        groupNameKana: holder.kind === 'group' ? holder.nameKana : null,
        certifiedOn: holder.certifiedOn?.iso ?? null,
        datePrecision: holder.certifiedOn?.precision ?? 'unknown',
        certificationRound: holder.certificationRound,
      })),
      changes: detail.changes.map((change) => ({
        changedOn: change.changedOn?.iso ?? null,
        datePrecision: change.changedOn?.precision ?? 'unknown',
        sourceDate: change.changedOn?.sourceText ?? null,
        content: change.content,
        typeNames: change.typeNames,
      })),
    }
  })
}
