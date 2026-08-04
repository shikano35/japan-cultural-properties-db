import { parse } from 'csv-parse/sync'
import { readFileSync } from 'node:fs'
import {
  CATEGORY_SCHEMES,
  DESIGNATION_CATEGORIES,
  HERITAGE_TYPES,
  PREFECTURES,
} from './master-data.ts'

// CSVの18列
export interface Row {
  ledgerId: string
  targetId: string
  name: string
  unitName: string
  heritageType: string
  kind1: string
  kind2: string
  country: string
  period: string
  icpDate: string
  ntDate: string
  region: string
  location: string
  facility: string
  owner: string
  custodian: string
  latitude: string
  longitude: string
}

export type PlaceRole = 'location' | 'owner_address' | 'region'
export type ActorRole = 'owner' | 'custodian'
export type DatePrecision = 'day' | 'month' | 'unknown'

export interface PlaceRef {
  prefecture: string | null
  addressText: string | null
  raw: string
}

export interface Designation {
  categoryCode: string
  designatedOn: string | null
  datePrecision: DatePrecision
  sourceDate: string | null
}

export interface Property {
  registerCode: string
  targetId: string
  sourceTargetId: string
  heritageTypeCode: string
  name: string
  unitName: string | null
  periodText: string | null
  originCountry: string | null
  facilityName: string | null
  locationText: string | null
  latitude: number | null
  longitude: number | null
  coordinateNote: string | null
  designations: Designation[]
  categories: { schemeCode: string; name: string }[]
  places: { role: PlaceRole; place: PlaceRef }[]
  actors: { role: ActorRole; name: string }[]
}

const HERITAGE_TYPE_BY_NAME = new Map(HERITAGE_TYPES.map((t) => [t.name, t]))
const DESIGNATION_CODE_BY_NAME = new Map(DESIGNATION_CATEGORIES.map((c) => [c.name, c.code]))
const SCHEME_CODES = new Set(CATEGORY_SCHEMES.map((s) => s.code))
const PREFECTURE_SET = new Set(PREFECTURES)

// 日本の座標範囲
const LAT_RANGE = [20, 46] as const
const LON_RANGE = [122, 154] as const

// 所在地の区切り文字
const LOCATION_SEPARATOR = /[、，\r\n]+/

function cell(cells: string[], index: number): string {
  return (cells[index] ?? '').trim()
}

export function readCsv(path: string): Row[] {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  const records: string[][] = parse(text, { skipEmptyLines: true, relaxColumnCount: true })
  const [, ...body] = records
  return body
    .filter((cells) => cells.some((value) => value.trim() !== ''))
    .map((cells) => ({
      ledgerId: cell(cells, 0),
      targetId: cell(cells, 1),
      name: cell(cells, 2),
      unitName: cell(cells, 3),
      heritageType: cell(cells, 4),
      kind1: cell(cells, 5),
      kind2: cell(cells, 6),
      country: cell(cells, 7),
      period: cell(cells, 8),
      icpDate: cell(cells, 9),
      ntDate: cell(cells, 10),
      region: cell(cells, 11),
      location: cell(cells, 12),
      facility: cell(cells, 13),
      owner: cell(cells, 14),
      custodian: cell(cells, 15),
      latitude: cell(cells, 16),
      longitude: cell(cells, 17),
    }))
}

function nullIfBlank(value: string): string | null {
  return value === '' ? null : value
}

// YYYYMMDD形式をISO 8601に変換
export function parseDesignationDate(raw: string): {
  designatedOn: string | null
  datePrecision: DatePrecision
} {
  if (!/^\d{8}$/.test(raw)) {
    return { designatedOn: null, datePrecision: 'unknown' }
  }
  const year = raw.slice(0, 4)
  const month = raw.slice(4, 6)
  const day = raw.slice(6, 8)
  if (month === '00') {
    return { designatedOn: null, datePrecision: 'unknown' }
  }
  if (day === '00') {
    return { designatedOn: `${year}-${month}-01`, datePrecision: 'month' }
  }
  return { designatedOn: `${year}-${month}-${day}`, datePrecision: 'day' }
}

function designation(categoryCode: string, sourceDate: string): Designation {
  const { designatedOn, datePrecision } = parseDesignationDate(sourceDate)
  return {
    categoryCode,
    designatedOn,
    datePrecision,
    sourceDate: nullIfBlank(sourceDate),
  }
}

// 種別1は昇格時に更新されない場合があるため、指定年月日の列を根拠に生成する
function buildDesignations(row: Row, heritageTypeCode: string): Designation[] {
  const result: Designation[] = []

  const addByName = (name: string): void => {
    const code = DESIGNATION_CODE_BY_NAME.get(name)
    if (code === undefined) {
      throw new Error(`未知の指定区分: ${name}（${row.heritageType} / ${row.name}）`)
    }
    result.push(designation(code, row.icpDate))
  }

  switch (heritageTypeCode) {
    case 'national_treasure_and_icp_building':
    case 'national_treasure_and_icp_art_craft': {
      if (row.icpDate !== '') result.push(designation('important_cultural_property', row.icpDate))
      if (row.ntDate !== '') result.push(designation('national_treasure', row.ntDate))
      break
    }
    case 'registered_tangible_building':
    case 'registered_tangible_art_craft': {
      if (row.icpDate !== '') result.push(designation('registered_tangible', row.icpDate))
      break
    }
    case 'monument':
    case 'registered_monument': {
      for (const name of [row.kind1, row.kind2]) {
        if (name !== '') addByName(name)
      }
      break
    }
    case 'world_heritage': {
      break
    }
    default: {
      const type = HERITAGE_TYPES.find((t) => t.code === heritageTypeCode)
      const code = type ? DESIGNATION_CODE_BY_NAME.get(type.name) : undefined
      if (code === undefined) {
        throw new Error(`指定区分を決定できない文化財種類: ${row.heritageType}`)
      }
      if (row.icpDate !== '') result.push(designation(code, row.icpDate))
      break
    }
  }

  const seen = new Set<string>()
  return result.filter((d) => {
    if (seen.has(d.categoryCode)) return false
    seen.add(d.categoryCode)
    return true
  })
}

// 種別1・種別2は文化財種類ごとに意味が異なるため、体系別に振り分ける
function buildCategories(
  row: Row,
  heritageTypeCode: string
): { schemeCode: string; name: string }[] {
  const pairs: [string | null, string][] = []
  const push = (schemeCode: string | null, value: string): void => {
    if (value !== '') pairs.push([schemeCode, value])
  }

  switch (heritageTypeCode) {
    case 'national_treasure_and_icp_building':
      push('building_typology', row.kind2)
      break
    case 'registered_tangible_building':
      push('registered_building_use', row.kind1)
      push('registered_building_structure', row.kind2)
      break
    case 'national_treasure_and_icp_art_craft':
      push('art_craft_field', row.kind2)
      break
    case 'registered_tangible_art_craft':
      push('art_craft_field', row.kind1)
      break
    case 'registered_art_object':
      push('registered_art_field', row.kind1)
      break
    case 'important_tangible_folk':
    case 'registered_tangible_folk':
      push('folk_tangible_use', row.kind1)
      break
    case 'important_intangible_folk':
    case 'registered_intangible_folk':
    case 'recorded_intangible_folk':
      push('folk_intangible_major', row.kind1)
      push('folk_intangible_minor', row.kind2)
      break
    case 'important_intangible':
    case 'registered_intangible':
    case 'recorded_intangible':
      push('intangible_major', row.kind1)
      push('intangible_minor', row.kind2)
      break
    case 'selected_conservation_technique':
      push('conservation_technique_kind', row.kind1)
      break
    case 'ipds':
      push('ipds_town_type', row.kind1)
      push('ipds_town_type', row.kind2)
      break
    default:
      break
  }

  return pairs.map(([schemeCode, name]) => {
    if (schemeCode === null || !SCHEME_CODES.has(schemeCode)) {
      throw new Error(`未知の分類体系: ${String(schemeCode)}`)
    }
    return { schemeCode, name }
  })
}

function makePlace(prefecture: string | null, addressText: string | null): PlaceRef {
  return {
    prefecture,
    addressText,
    raw: `${prefecture ?? ''}${addressText ?? ''}`,
  }
}

function splitLocation(value: string): string[] {
  return value
    .split(LOCATION_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part !== '')
}

function buildPlaces(row: Row, heritageTypeCode: string): { role: PlaceRole; place: PlaceRef }[] {
  const result: { role: PlaceRole; place: PlaceRef }[] = []
  const asPrefecture = (value: string): string | null => (PREFECTURE_SET.has(value) ? value : null)

  const ownerAddressTypes = new Set([
    'national_treasure_and_icp_art_craft',
    'registered_tangible_art_craft',
    'registered_art_object',
  ])
  const regionTypes = new Set([
    'important_intangible_folk',
    'registered_intangible_folk',
    'recorded_intangible_folk',
    'important_intangible',
    'registered_intangible',
    'recorded_intangible',
  ])

  if (ownerAddressTypes.has(heritageTypeCode)) {
    const matched = /^(.*)（(.*)）$/.exec(row.region)
    const ownerPrefecture = matched ? matched[1] : row.region
    const locationPrefecture = matched ? matched[2] : ''

    if (ownerPrefecture !== undefined && ownerPrefecture !== '') {
      result.push({
        role: 'owner_address',
        place: makePlace(
          asPrefecture(ownerPrefecture),
          asPrefecture(ownerPrefecture) ? null : ownerPrefecture
        ),
      })
    }
    const locationParts = splitLocation(row.location)
    if (locationPrefecture !== undefined && locationPrefecture !== '') {
      const prefecture = asPrefecture(locationPrefecture)
      if (locationParts.length === 0) {
        result.push({
          role: 'location',
          place: makePlace(prefecture, prefecture ? null : locationPrefecture),
        })
      } else {
        for (const part of locationParts) {
          result.push({ role: 'location', place: makePlace(prefecture, part) })
        }
      }
    } else {
      for (const part of locationParts) {
        result.push({ role: 'location', place: makePlace(null, part) })
      }
    }
    return result
  }

  const role: PlaceRole = regionTypes.has(heritageTypeCode) ? 'region' : 'location'
  const prefecture = asPrefecture(row.region)
  const specialLabel = row.region !== '' && prefecture === null ? row.region : null
  const parts = splitLocation(row.location)

  if (parts.length === 0) {
    if (prefecture !== null || specialLabel !== null) {
      result.push({ role, place: makePlace(prefecture, specialLabel) })
    }
    return result
  }
  for (const part of parts) {
    result.push({ role, place: makePlace(prefecture, part) })
  }
  return result
}

function buildActors(row: Row): { role: ActorRole; name: string }[] {
  const result: { role: ActorRole; name: string }[] = []
  if (row.owner !== '') result.push({ role: 'owner', name: row.owner })
  if (row.custodian !== '') result.push({ role: 'custodian', name: row.custodian })
  return result
}

function buildCoordinates(row: Row): Pick<Property, 'latitude' | 'longitude' | 'coordinateNote'> {
  if (row.latitude === '' || row.longitude === '') {
    return { latitude: null, longitude: null, coordinateNote: null }
  }
  const latitude = Number(row.latitude)
  const longitude = Number(row.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      latitude: null,
      longitude: null,
      coordinateNote: `座標が数値として解釈できないため除外: ${row.latitude}, ${row.longitude}`,
    }
  }
  const inJapan =
    latitude >= LAT_RANGE[0] &&
    latitude <= LAT_RANGE[1] &&
    longitude >= LON_RANGE[0] &&
    longitude <= LON_RANGE[1]
  if (!inJapan) {
    return {
      latitude: null,
      longitude: null,
      coordinateNote: `座標が日本の範囲外のため除外: ${row.latitude}, ${row.longitude}`,
    }
  }
  return { latitude, longitude, coordinateNote: null }
}

function distinctBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function toProperty(row: Row): Property {
  const heritageType = HERITAGE_TYPE_BY_NAME.get(row.heritageType)
  if (heritageType === undefined) {
    throw new Error(`未知の文化財種類: ${row.heritageType}`)
  }
  return {
    registerCode: row.ledgerId,
    targetId: row.targetId.replace(/^0+(?=.)/, ''),
    sourceTargetId: row.targetId,
    heritageTypeCode: heritageType.code,
    name: row.name,
    unitName: nullIfBlank(row.unitName),
    periodText: nullIfBlank(row.period),
    originCountry: nullIfBlank(row.country),
    facilityName: nullIfBlank(row.facility),
    locationText: nullIfBlank(row.location),
    ...buildCoordinates(row),
    designations: buildDesignations(row, heritageType.code),
    categories: distinctBy(
      buildCategories(row, heritageType.code),
      (c) => `${c.schemeCode} ${c.name}`
    ),
    places: distinctBy(buildPlaces(row, heritageType.code), (p) => `${p.role} ${p.place.raw}`),
    actors: distinctBy(buildActors(row), (a) => `${a.role} ${a.name}`),
  }
}

// 同一の(registerCode, targetId)を1件に統合
export function mergeProperties(properties: Property[]): Property[] {
  const merged = new Map<string, Property>()
  for (const property of properties) {
    const key = `${property.registerCode}${property.targetId}`
    const existing = merged.get(key)
    if (existing === undefined) {
      merged.set(key, property)
      continue
    }
    for (const d of property.designations) {
      if (!existing.designations.some((x) => x.categoryCode === d.categoryCode)) {
        existing.designations.push(d)
      }
    }
    for (const c of property.categories) {
      if (!existing.categories.some((x) => x.schemeCode === c.schemeCode && x.name === c.name)) {
        existing.categories.push(c)
      }
    }
    for (const p of property.places) {
      if (!existing.places.some((x) => x.role === p.role && x.place.raw === p.place.raw)) {
        existing.places.push(p)
      }
    }
    for (const a of property.actors) {
      if (!existing.actors.some((x) => x.role === a.role && x.name === a.name)) {
        existing.actors.push(a)
      }
    }
  }
  return [...merged.values()]
}
