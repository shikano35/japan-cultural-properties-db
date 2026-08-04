import { Scalar } from '@scalar/hono-api-reference'
import { swaggerUI } from '@hono/swagger-ui'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { etag } from 'hono/etag'
import { HTTPException } from 'hono/http-exception'
import { describeRoute, openAPIRouteHandler, resolver } from 'hono-openapi'
import * as v from 'valibot'
import { createDb } from './db/client'
import { errorBody } from './lib/errors'
import { loadSource } from './lib/response'
import { propertyRoutes } from './routes/properties'
import { vocabularyRoutes } from './routes/vocabularies'
import { sourceSchema } from './schemas/common'

export const OPENAPI_DOCUMENT = {
  info: {
    title: '国指定文化財等データベース API',
    version: '0.1.0',
    description: '国指定文化財等データベースのデータを提供するAPI',
    license: {
      name: '文部科学省ウェブサイト利用規約',
      url: 'https://www.mext.go.jp/b_menu/1351168.htm',
    },
  },
  tags: [
    { name: 'properties', description: '文化財' },
    { name: 'vocabularies', description: '台帳・種類・区分などの語彙' },
    { name: 'meta', description: 'API 自体の情報' },
  ],
}

const rootResponseSchema = v.object({
  name: v.string(),
  version: v.string(),
  documentation: v.object({
    openapi: v.string(),
    swaggerUi: v.string(),
    scalar: v.string(),
  }),
  source: sourceSchema,
})

export function createApp() {
  const app = new Hono<{ Bindings: CloudflareBindings }>()

  app.use('*', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'], maxAge: 86400 }))
  app.use('*', etag())
  app.use('*', async (c, next) => {
    await next()
    c.header('X-Content-Type-Options', 'nosniff')
  })
  app.use('/properties/*', async (c, next) => {
    await next()
    c.header('Cache-Control', 'public, max-age=3600')
  })

  app.get(
    '/',
    describeRoute({
      tags: ['meta'],
      summary: 'API の情報と出典',
      responses: {
        200: {
          description: 'API の情報',
          content: { 'application/json': { schema: resolver(rootResponseSchema) } },
        },
      },
    }),
    async (c) => {
      const source = await loadSource(createDb(c.env.DB))
      return c.json({
        name: OPENAPI_DOCUMENT.info.title,
        version: OPENAPI_DOCUMENT.info.version,
        documentation: {
          openapi: '/openapi.json',
          swaggerUi: '/docs',
          scalar: '/reference',
        },
        source,
      })
    }
  )

  app.route('/', propertyRoutes)
  app.route('/', vocabularyRoutes)

  app.get('/openapi.json', openAPIRouteHandler(app, { documentation: OPENAPI_DOCUMENT }))
  app.get('/docs', swaggerUI({ url: '/openapi.json' }))
  app.get('/reference', Scalar({ url: '/openapi.json' }))

  app.notFound((c) => c.json(errorBody('not_found', 'エンドポイントが存在しません'), 404))

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse()
    }
    // eslint-disable-next-line no-console
    console.error(err)
    return c.json(errorBody('internal_error', 'サーバー内部でエラーが発生しました'), 500)
  })

  return app
}
