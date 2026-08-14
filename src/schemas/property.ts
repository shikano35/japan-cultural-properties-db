import * as v from 'valibot'
import {
  ACTOR_ROLES,
  CRITERION_KINDS,
  DATE_PRECISIONS,
  HERITAGE_GROUPS,
  HOLDER_KINDS,
  PLACE_ROLES,
} from '../db/schema'
import { codeNameSchema, pageMetaSchema, sourceSchema } from './common'

const isoDate = v.pipe(
  v.string(),
  v.regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式で指定してください')
)

const integerFromQuery = (min: number, max: number, fallback: number) =>
  v.pipe(
    v.optional(v.string(), String(fallback)),
    v.transform(Number),
    v.number('数値で指定してください'),
    v.integer('整数で指定してください'),
    v.minValue(min, `${min} 以上で指定してください`),
    v.maxValue(max, `${max} 以下で指定してください`)
  )

const booleanFromQuery = v.pipe(
  v.optional(v.picklist(['true', 'false'], 'true か false で指定してください')),
  v.transform((value) => (value === undefined ? undefined : value === 'true'))
)

const bboxSchema = v.pipe(
  v.string(),
  v.regex(
    /^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/,
    'minLon,minLat,maxLon,maxLat の形式で指定してください'
  ),
  v.transform((value) => value.split(',').map(Number)),
  v.check((values) => values.every((n) => Number.isFinite(n)), '数値で指定してください'),
  v.transform(([minLon, minLat, maxLon, maxLat]) => ({
    minLon: minLon ?? 0,
    minLat: minLat ?? 0,
    maxLon: maxLon ?? 0,
    maxLat: maxLat ?? 0,
  })),
  v.check(({ minLon, maxLon }) => minLon <= maxLon, 'minLon は maxLon 以下で指定してください'),
  v.check(({ minLat, maxLat }) => minLat <= maxLat, 'minLat は maxLat 以下で指定してください')
)

const yearFromQuery = v.optional(
  v.pipe(
    v.string(),
    v.transform(Number),
    v.number('数値で指定してください'),
    v.integer('整数で指定してください'),
    v.minValue(-9999, '-9999 以上で指定してください'),
    v.maxValue(9999, '9999 以下で指定してください')
  )
)

export const propertyQuerySchema = v.object({
  q: v.optional(
    v.pipe(v.string(), v.minLength(1), v.maxLength(100, '100文字以内で指定してください'))
  ),
  kana: v.optional(
    v.pipe(v.string(), v.minLength(1), v.maxLength(100, '100文字以内で指定してください'))
  ),
  heritageType: v.optional(v.string()),
  group: v.optional(v.picklist(HERITAGE_GROUPS)),
  designation: v.optional(
    v.pipe(
      v.string(),
      v.transform((value) => value.split(',').filter((code) => code !== '')),
      v.maxLength(20, '指定できる区分は20件までです')
    )
  ),
  register: v.optional(v.string()),
  prefecture: v.optional(v.string()),
  placeRole: v.optional(v.picklist(PLACE_ROLES), 'location'),
  category: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.integer())),
  criterion: v.optional(v.pipe(v.string(), v.transform(Number), v.number(), v.integer())),
  designatedFrom: v.optional(isoDate),
  designatedTo: v.optional(isoDate),
  yearFrom: yearFromQuery,
  yearTo: yearFromQuery,
  hasCoordinates: booleanFromQuery,
  hasDescription: booleanFromQuery,
  bbox: v.optional(bboxSchema),
  sort: v.optional(v.picklist(['id', 'name', 'nameKana', 'designatedOn', 'year']), 'id'),
  order: v.optional(v.picklist(['asc', 'desc']), 'asc'),
  limit: integerFromQuery(1, 100, 20),
  offset: integerFromQuery(0, 100_000, 0),
})

export type PropertyQuery = v.InferOutput<typeof propertyQuerySchema>

export const propertyParamSchema = v.object({
  id: v.pipe(
    v.string(),
    v.transform(Number),
    v.number('数値で指定してください'),
    v.integer('整数で指定してください'),
    v.minValue(1)
  ),
})

const coordinatesSchema = v.nullable(v.object({ latitude: v.number(), longitude: v.number() }))

const designationSchema = v.object({
  code: v.string(),
  name: v.string(),
  designatedOn: v.nullable(v.string()),
  datePrecision: v.picklist(DATE_PRECISIONS),
  japaneseEraDate: v.nullable(v.string()),
})

const heritageTypeSchema = v.object({
  code: v.string(),
  name: v.string(),
  group: v.picklist(HERITAGE_GROUPS),
})

export const propertySummarySchema = v.object({
  id: v.number(),
  name: v.string(),
  nameKana: v.nullable(v.string()),
  unitName: v.nullable(v.string()),
  heritageType: heritageTypeSchema,
  designations: v.array(designationSchema),
  prefectures: v.array(v.string()),
  coordinates: coordinatesSchema,
})

export const propertyDetailSchema = v.object({
  ...propertySummarySchema.entries,
  unitNameKana: v.nullable(v.string()),
  register: codeNameSchema,
  targetId: v.string(),
  sourceUrl: v.nullable(v.string()),
  period: v.nullable(v.string()),
  originCountry: v.nullable(v.string()),
  facilityName: v.nullable(v.string()),
  locationText: v.nullable(v.string()),
  coordinateNote: v.nullable(v.string()),
  quantityText: v.nullable(v.string()),
  eraText: v.nullable(v.string()),
  yearText: v.nullable(v.string()),
  yearFrom: v.nullable(v.number()),
  yearTo: v.nullable(v.number()),
  areaText: v.nullable(v.string()),
  areaHectares: v.nullable(v.number()),
  ownerKind: v.nullable(v.string()),
  summaryText: v.nullable(v.string()),
  detailText: v.nullable(v.string()),
  hasPhoto: v.nullable(v.boolean()),
  hasAttachment: v.nullable(v.boolean()),
  designationNumber: v.nullable(v.string()),
  branchNumber: v.nullable(v.string()),
  notificationNumber: v.nullable(v.string()),
  notifiedOn: v.nullable(v.string()),
  addedOn: v.nullable(v.string()),
  registrationRound: v.nullable(v.string()),
  categories: v.array(
    v.object({
      scheme: codeNameSchema,
      name: v.string(),
    })
  ),
  places: v.array(
    v.object({
      role: v.picklist(PLACE_ROLES),
      prefecture: v.nullable(v.string()),
      addressText: v.nullable(v.string()),
    })
  ),
  actors: v.array(
    v.object({
      role: v.picklist(ACTOR_ROLES),
      name: v.string(),
    })
  ),
  details: v.array(
    v.object({
      field: codeNameSchema,
      value: v.string(),
    })
  ),
  criteria: v.array(
    v.object({
      id: v.number(),
      kind: v.picklist(CRITERION_KINDS),
      slot: v.number(),
      text: v.string(),
    })
  ),
  attachments: v.array(
    v.object({
      name: v.string(),
      quantityText: v.nullable(v.string()),
    })
  ),
  holders: v.array(
    v.object({
      kind: v.picklist(HOLDER_KINDS),
      name: v.nullable(v.string()),
      nameKana: v.nullable(v.string()),
      certifiedOn: v.nullable(v.string()),
      certificationRound: v.nullable(v.string()),
    })
  ),
  changes: v.array(
    v.object({
      changedOn: v.nullable(v.string()),
      datePrecision: v.picklist(DATE_PRECISIONS),
      types: v.array(v.string()),
      content: v.nullable(v.string()),
    })
  ),
})

export const propertyListResponseSchema = v.object({
  data: v.array(propertySummarySchema),
  meta: pageMetaSchema,
})

export const propertyDetailResponseSchema = v.object({
  data: propertyDetailSchema,
  meta: v.object({ source: sourceSchema }),
})
