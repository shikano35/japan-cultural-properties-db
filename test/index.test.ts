import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

const worker = exports.default

describe('Worker', () => {
  it('GET /health は 200 と { status: "ok" } を返す', async () => {
    const res = await worker.fetch(new Request('https://example.com/health'))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ status: 'ok' })
  })

  it('未定義のパスは 404 を返す', async () => {
    const res = await worker.fetch(new Request('https://example.com/__not_found__'))

    expect(res.status).toBe(404)
  })
})
