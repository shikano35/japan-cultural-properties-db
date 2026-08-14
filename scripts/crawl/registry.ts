import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { mergeProperties, readCsv, toProperty, type Property } from '../etl/transform'
import { detailUrl, ledgerCode } from './ledgers'

export interface CrawlTarget {
  ledgerCode: string
  targetId: string
  heritageTypeCode: string
  registerCode: string
  name: string
  url: string
}

export function toCrawlTarget(property: Property): CrawlTarget {
  return {
    ledgerCode: ledgerCode(property.heritageTypeCode),
    targetId: property.sourceTargetId,
    heritageTypeCode: property.heritageTypeCode,
    registerCode: property.registerCode,
    name: property.name,
    url: detailUrl(property.heritageTypeCode, property.sourceTargetId),
  }
}

export function readCrawlTargets(dataDir: string): CrawlTarget[] {
  const files = readdirSync(dataDir)
    .filter((f) => f.endsWith('.csv'))
    .sort()
  const properties: Property[] = []
  for (const file of files) {
    for (const row of readCsv(join(dataDir, file))) {
      properties.push(toProperty(row))
    }
  }
  return mergeProperties(properties).map(toCrawlTarget)
}
