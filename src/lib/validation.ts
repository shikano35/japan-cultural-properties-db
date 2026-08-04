import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Context } from 'hono'
import { errorBody } from './errors'

function formatIssue(issue: StandardSchemaV1.Issue): string {
  const path = (issue.path ?? [])
    .map((segment) => (typeof segment === 'object' ? String(segment.key) : String(segment)))
    .join('.')
  return path === '' ? issue.message : `${path}: ${issue.message}`
}

export function onValidationError(
  result: { success: true } | { success: false; error: readonly StandardSchemaV1.Issue[] },
  c: Context
): Response | undefined {
  if (result.success) return undefined
  const message = result.error.map(formatIssue).join(' / ')
  return c.json(errorBody('invalid_query', message), 400)
}
