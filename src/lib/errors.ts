import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export const ERROR_CODES = ['invalid_query', 'not_found', 'internal_error'] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export interface ErrorBody {
  error: { code: ErrorCode; message: string }
}

export function errorBody(code: ErrorCode, message: string): ErrorBody {
  return { error: { code, message } }
}

export function httpError(
  status: ContentfulStatusCode,
  code: ErrorCode,
  message: string
): HTTPException {
  return new HTTPException(status, {
    res: Response.json(errorBody(code, message), { status }),
  })
}

export function notFound(message: string): HTTPException {
  return httpError(404, 'not_found', message)
}
