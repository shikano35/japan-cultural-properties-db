import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { seed } from './fixtures'

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
await seed(env.DB)
