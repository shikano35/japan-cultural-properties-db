import type { Db } from '../db/client'
import { sources } from '../db/schema'

export interface SourceMeta {
  name: string
  publisher: string
  url: string
  termsUrl: string
  license: string
  retrievedOn: string
  note: string
}

const NOTE = '加工済みのデータです'

export async function loadSource(db: Db): Promise<SourceMeta> {
  const [row] = await db.select().from(sources).limit(1)
  if (row === undefined) {
    throw new Error('sources テーブルにデータがありません')
  }
  return {
    name: row.name,
    publisher: row.publisher,
    url: row.url,
    termsUrl: row.termsUrl,
    license: row.licenseNote,
    retrievedOn: row.retrievedOn,
    note: NOTE,
  }
}
