import * as v from 'valibot'
import { ERROR_CODES } from '../lib/errors'

export const sourceSchema = v.object({
  name: v.string(),
  publisher: v.string(),
  url: v.string(),
  termsUrl: v.string(),
  license: v.string(),
  retrievedOn: v.string(),
  note: v.string(),
})

export const pageMetaSchema = v.object({
  total: v.number(),
  limit: v.number(),
  offset: v.number(),
  source: sourceSchema,
})

export const errorSchema = v.object({
  error: v.object({
    code: v.picklist(ERROR_CODES),
    message: v.string(),
  }),
})

export const codeNameSchema = v.object({
  code: v.string(),
  name: v.string(),
})
