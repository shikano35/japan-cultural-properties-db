import { asc, eq, isNotNull, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import * as v from 'valibot'
import { createDb } from '../db/client'
import {
  categories,
  categorySchemes,
  CRITERION_KINDS,
  designationCategories,
  designationCriteria,
  DESIGNATION_TIERS,
  detailFields,
  heritageTypes,
  HERITAGE_GROUPS,
  places,
  propertyDesignationCriteria,
  propertyDetails,
  propertyPlaces,
  registers,
} from '../db/schema'
import { loadSource } from '../lib/response'
import { onValidationError } from '../lib/validation'
import { errorSchema, sourceSchema } from '../schemas/common'

export const vocabularyRoutes = new Hono<{ Bindings: CloudflareBindings }>()

const listMetaSchema = v.object({ total: v.number(), source: sourceSchema })

function listSchema<TItem extends v.GenericSchema>(item: TItem) {
  return v.object({ data: v.array(item), meta: listMetaSchema })
}

function describeList(summary: string, item: v.GenericSchema) {
  return describeRoute({
    tags: ['vocabularies'],
    summary,
    responses: {
      200: {
        description: summary,
        content: { 'application/json': { schema: resolver(listSchema(item)) } },
      },
    },
  })
}

const registerSchema = v.object({ code: v.string(), name: v.string() })

const heritageTypeSchema = v.object({
  code: v.string(),
  name: v.string(),
  group: v.picklist(HERITAGE_GROUPS),
})

const designationCategorySchema = v.object({
  code: v.string(),
  name: v.string(),
  tier: v.picklist(DESIGNATION_TIERS),
})

const categorySchemeSchema = v.object({
  code: v.string(),
  name: v.string(),
  appliesTo: v.string(),
})

const categorySchema = v.object({
  id: v.number(),
  scheme: v.string(),
  name: v.string(),
})

const prefectureSchema = v.object({ name: v.string(), count: v.number() })

const designationCriterionSchema = v.object({
  id: v.number(),
  kind: v.picklist(CRITERION_KINDS),
  text: v.string(),
  count: v.number(),
})

const detailFieldSchema = v.object({
  code: v.string(),
  name: v.string(),
  appliesTo: v.string(),
  count: v.number(),
})

vocabularyRoutes.get('/registers', describeList('台帳の一覧', registerSchema), async (c) => {
  const db = createDb(c.env.DB)
  const [data, source] = await Promise.all([
    db
      .select({ code: registers.code, name: registers.name })
      .from(registers)
      .orderBy(asc(registers.code)),
    loadSource(db),
  ])
  return c.json({ data, meta: { total: data.length, source } })
})

vocabularyRoutes.get(
  '/heritage-types',
  describeList('文化財種類の一覧', heritageTypeSchema),
  async (c) => {
    const db = createDb(c.env.DB)
    const [data, source] = await Promise.all([
      db
        .select({
          code: heritageTypes.code,
          name: heritageTypes.name,
          group: heritageTypes.groupName,
        })
        .from(heritageTypes)
        .orderBy(asc(heritageTypes.groupName), asc(heritageTypes.code)),
      loadSource(db),
    ])
    return c.json({ data, meta: { total: data.length, source } })
  }
)

vocabularyRoutes.get(
  '/designation-categories',
  describeList('指定・登録区分の一覧', designationCategorySchema),
  async (c) => {
    const db = createDb(c.env.DB)
    const [data, source] = await Promise.all([
      db
        .select({
          code: designationCategories.code,
          name: designationCategories.name,
          tier: designationCategories.tier,
        })
        .from(designationCategories)
        .orderBy(asc(designationCategories.tier), asc(designationCategories.code)),
      loadSource(db),
    ])
    return c.json({ data, meta: { total: data.length, source } })
  }
)

vocabularyRoutes.get(
  '/category-schemes',
  describeList('分類体系の一覧', categorySchemeSchema),
  async (c) => {
    const db = createDb(c.env.DB)
    const [data, source] = await Promise.all([
      db
        .select({
          code: categorySchemes.code,
          name: categorySchemes.name,
          appliesTo: categorySchemes.appliesTo,
        })
        .from(categorySchemes)
        .orderBy(asc(categorySchemes.code)),
      loadSource(db),
    ])
    return c.json({ data, meta: { total: data.length, source } })
  }
)

vocabularyRoutes.get(
  '/prefectures',
  describeList('所在地の都道府県と件数', prefectureSchema),
  async (c) => {
    const db = createDb(c.env.DB)
    const [data, source] = await Promise.all([
      db
        .select({
          name: sql<string>`${places.prefecture}`,
          count: sql<number>`count(distinct ${propertyPlaces.propertyId})`,
        })
        .from(propertyPlaces)
        .innerJoin(places, eq(places.id, propertyPlaces.placeId))
        .where(sql`${propertyPlaces.role} = 'location' and ${isNotNull(places.prefecture)}`)
        .groupBy(places.prefecture)
        .orderBy(asc(places.prefecture)),
      loadSource(db),
    ])
    return c.json({ data, meta: { total: data.length, source } })
  }
)

vocabularyRoutes.get(
  '/designation-criteria',
  describeList('指定・登録・選択・選定基準の一覧', designationCriterionSchema),
  async (c) => {
    const db = createDb(c.env.DB)
    const [data, source] = await Promise.all([
      db
        .select({
          id: designationCriteria.id,
          kind: designationCriteria.kind,
          text: designationCriteria.text,
          count: sql<number>`count(${propertyDesignationCriteria.propertyId})`,
        })
        .from(designationCriteria)
        .leftJoin(
          propertyDesignationCriteria,
          eq(propertyDesignationCriteria.criterionId, designationCriteria.id)
        )
        .groupBy(designationCriteria.id)
        .orderBy(asc(designationCriteria.kind), asc(designationCriteria.id)),
      loadSource(db),
    ])
    return c.json({ data, meta: { total: data.length, source } })
  }
)

vocabularyRoutes.get(
  '/detail-fields',
  describeList('文化財種類ごとの記述項目の一覧', detailFieldSchema),
  async (c) => {
    const db = createDb(c.env.DB)
    const [data, source] = await Promise.all([
      db
        .select({
          code: detailFields.code,
          name: detailFields.name,
          appliesTo: detailFields.appliesTo,
          count: sql<number>`count(${propertyDetails.propertyId})`,
        })
        .from(detailFields)
        .leftJoin(propertyDetails, eq(propertyDetails.fieldCode, detailFields.code))
        .groupBy(detailFields.code)
        .orderBy(asc(detailFields.displayOrder)),
      loadSource(db),
    ])
    return c.json({ data, meta: { total: data.length, source } })
  }
)

const categoryQuerySchema = v.object({ scheme: v.optional(v.string()) })

vocabularyRoutes.get(
  '/categories',
  describeRoute({
    tags: ['vocabularies'],
    summary: '分類語彙の一覧',
    responses: {
      200: {
        description: '分類語彙',
        content: { 'application/json': { schema: resolver(listSchema(categorySchema)) } },
      },
      400: {
        description: '存在しない分類体系の指定',
        content: { 'application/json': { schema: resolver(errorSchema) } },
      },
    },
  }),
  validator('query', categoryQuerySchema, onValidationError),
  async (c) => {
    const db = createDb(c.env.DB)
    const { scheme } = c.req.valid('query')
    const base = db
      .select({ id: categories.id, scheme: categories.schemeCode, name: categories.name })
      .from(categories)
    const [data, source] = await Promise.all([
      scheme === undefined
        ? base.orderBy(asc(categories.schemeCode), asc(categories.name))
        : base.where(eq(categories.schemeCode, scheme)).orderBy(asc(categories.name)),
      loadSource(db),
    ])
    return c.json({ data, meta: { total: data.length, source } })
  }
)
