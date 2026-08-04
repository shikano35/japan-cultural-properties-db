import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { createDb } from '../db/client'
import { notFound } from '../lib/errors'
import { loadSource } from '../lib/response'
import { onValidationError } from '../lib/validation'
import { findPropertyById, findProperties } from '../queries/properties'
import { errorSchema } from '../schemas/common'
import {
  propertyDetailResponseSchema,
  propertyListResponseSchema,
  propertyParamSchema,
  propertyQuerySchema,
} from '../schemas/property'

export const propertyRoutes = new Hono<{ Bindings: CloudflareBindings }>()

propertyRoutes.get(
  '/properties',
  describeRoute({
    tags: ['properties'],
    summary: '文化財の一覧',
    description: '文化財を検索する。件数は管理対象単位。',
    responses: {
      200: {
        description: '検索結果',
        content: { 'application/json': { schema: resolver(propertyListResponseSchema) } },
      },
      400: {
        description: '検索条件の不整合',
        content: { 'application/json': { schema: resolver(errorSchema) } },
      },
    },
  }),
  validator('query', propertyQuerySchema, onValidationError),
  async (c) => {
    const db = createDb(c.env.DB)
    const query = c.req.valid('query')
    const [{ data, total }, source] = await Promise.all([findProperties(db, query), loadSource(db)])
    return c.json({
      data,
      meta: { total, limit: query.limit, offset: query.offset, source },
    })
  }
)

propertyRoutes.get(
  '/properties/:id',
  describeRoute({
    tags: ['properties'],
    summary: '文化財の詳細',
    responses: {
      200: {
        description: '文化財',
        content: { 'application/json': { schema: resolver(propertyDetailResponseSchema) } },
      },
      404: {
        description: '該当する文化財の不在',
        content: { 'application/json': { schema: resolver(errorSchema) } },
      },
    },
  }),
  validator('param', propertyParamSchema, onValidationError),
  async (c) => {
    const db = createDb(c.env.DB)
    const { id } = c.req.valid('param')
    const property = await findPropertyById(db, id)
    if (property === undefined) {
      throw notFound(`id=${id} の文化財は存在しません`)
    }
    const source = await loadSource(db)
    return c.json({ data: property, meta: { source } })
  }
)
