import { and, asc, desc, eq, gte, inArray, isNotNull, like, lte, sql, type SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import type { Db } from '../db/client'
import {
  actors,
  categories,
  categorySchemes,
  changeTypes,
  designationCategories,
  designationCriteria,
  designations,
  detailFields,
  heritageTypes,
  places,
  properties,
  propertyActors,
  propertyAttachments,
  propertyCategories,
  propertyChanges,
  propertyChangeTypes,
  propertyDesignationCriteria,
  propertyDetails,
  propertyHolders,
  propertyPlaces,
  registers,
} from '../db/schema'
import { detailUrl } from '../lib/source-url'
import type { PropertyQuery } from '../schemas/property'

const FTS_MIN_LENGTH = 3

function toFtsPhrase(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function buildTextCondition(q: string): SQL {
  if (Array.from(q).length < FTS_MIN_LENGTH) {
    return sql`(${like(properties.name, `%${q}%`)} or ${like(properties.nameKana, `%${q}%`)})`
  }
  return sql`${properties.id} in (select rowid from properties_fts where properties_fts match ${toFtsPhrase(q)})`
}

function buildConditions(query: PropertyQuery): SQL[] {
  const conditions: SQL[] = []

  if (query.q !== undefined) {
    conditions.push(buildTextCondition(query.q))
  }
  if (query.kana !== undefined) {
    conditions.push(like(properties.nameKana, `${query.kana}%`))
  }
  if (query.heritageType !== undefined) {
    conditions.push(eq(properties.heritageTypeCode, query.heritageType))
  }
  if (query.register !== undefined) {
    conditions.push(eq(properties.registerCode, query.register))
  }
  if (query.group !== undefined) {
    conditions.push(
      sql`exists (select 1 from ${heritageTypes} where ${heritageTypes.code} = ${properties.heritageTypeCode} and ${heritageTypes.groupName} = ${query.group})`
    )
  }
  if (query.designation !== undefined && query.designation.length > 0) {
    conditions.push(
      sql`exists (select 1 from ${designations} where ${designations.propertyId} = ${properties.id} and ${inArray(designations.categoryCode, query.designation)})`
    )
  }
  if (query.designatedFrom !== undefined) {
    conditions.push(
      sql`exists (select 1 from ${designations} where ${designations.propertyId} = ${properties.id} and ${gte(designations.designatedOn, query.designatedFrom)})`
    )
  }
  if (query.designatedTo !== undefined) {
    conditions.push(
      sql`exists (select 1 from ${designations} where ${designations.propertyId} = ${properties.id} and ${lte(designations.designatedOn, query.designatedTo)})`
    )
  }
  if (query.prefecture !== undefined) {
    conditions.push(
      sql`exists (
        select 1 from ${propertyPlaces}
        join ${places} on ${places.id} = ${propertyPlaces.placeId}
        where ${propertyPlaces.propertyId} = ${properties.id}
          and ${propertyPlaces.role} = ${query.placeRole}
          and ${places.prefecture} = ${query.prefecture}
      )`
    )
  }
  if (query.category !== undefined) {
    conditions.push(
      sql`exists (select 1 from ${propertyCategories} where ${propertyCategories.propertyId} = ${properties.id} and ${propertyCategories.categoryId} = ${query.category})`
    )
  }
  if (query.criterion !== undefined) {
    conditions.push(
      sql`exists (select 1 from ${propertyDesignationCriteria} where ${propertyDesignationCriteria.propertyId} = ${properties.id} and ${propertyDesignationCriteria.criterionId} = ${query.criterion})`
    )
  }
  if (query.yearFrom !== undefined) {
    conditions.push(gte(properties.yearTo, query.yearFrom))
  }
  if (query.yearTo !== undefined) {
    conditions.push(lte(properties.yearFrom, query.yearTo))
  }
  if (query.hasCoordinates === true) {
    conditions.push(isNotNull(properties.latitude))
  }
  if (query.hasCoordinates === false) {
    conditions.push(sql`${properties.latitude} is null`)
  }
  if (query.hasDescription === true) {
    conditions.push(
      sql`(${properties.summaryText} is not null or ${properties.detailText} is not null)`
    )
  }
  if (query.hasDescription === false) {
    conditions.push(sql`(${properties.summaryText} is null and ${properties.detailText} is null)`)
  }
  if (query.bbox !== undefined) {
    const { minLon, minLat, maxLon, maxLat } = query.bbox
    conditions.push(
      gte(properties.latitude, minLat),
      lte(properties.latitude, maxLat),
      gte(properties.longitude, minLon),
      lte(properties.longitude, maxLon)
    )
  }
  return conditions
}

function nullsLast(column: SQL | SQLiteColumn): SQL {
  return sql`${column} is null`
}

function buildOrderBy(query: PropertyQuery): SQL[] {
  const direction = query.order === 'desc' ? desc : asc
  switch (query.sort) {
    case 'name':
      return [direction(properties.name), asc(properties.id)]
    case 'nameKana':
      return [nullsLast(properties.nameKana), direction(properties.nameKana), asc(properties.id)]
    case 'year':
      return [nullsLast(properties.yearFrom), direction(properties.yearFrom), asc(properties.id)]
    case 'designatedOn': {
      const designatedOn = sql`(select min(${designations.designatedOn}) from ${designations} where ${designations.propertyId} = ${properties.id})`
      return [nullsLast(designatedOn), direction(designatedOn), asc(properties.id)]
    }
    default:
      return [direction(properties.id)]
  }
}

async function loadDesignations(db: Db, ids: number[]) {
  if (ids.length === 0) return []
  return db
    .select({
      propertyId: designations.propertyId,
      code: designationCategories.code,
      name: designationCategories.name,
      designatedOn: designations.designatedOn,
      datePrecision: designations.datePrecision,
      japaneseEraDate: designations.japaneseEraDate,
    })
    .from(designations)
    .innerJoin(designationCategories, eq(designationCategories.code, designations.categoryCode))
    .where(inArray(designations.propertyId, ids))
    .orderBy(asc(designations.propertyId), asc(designations.designatedOn))
}

function toDesignation(row: {
  code: string
  name: string
  designatedOn: string | null
  datePrecision: 'day' | 'month' | 'unknown'
  japaneseEraDate: string | null
}) {
  return {
    code: row.code,
    name: row.name,
    designatedOn: row.designatedOn,
    datePrecision: row.datePrecision,
    japaneseEraDate: row.japaneseEraDate,
  }
}

async function loadPlaces(db: Db, ids: number[]) {
  if (ids.length === 0) return []
  return db
    .select({
      propertyId: propertyPlaces.propertyId,
      role: propertyPlaces.role,
      prefecture: places.prefecture,
      addressText: places.addressText,
    })
    .from(propertyPlaces)
    .innerJoin(places, eq(places.id, propertyPlaces.placeId))
    .where(inArray(propertyPlaces.propertyId, ids))
    .orderBy(asc(propertyPlaces.propertyId), asc(places.id))
}

function groupBy<T extends { propertyId: number }>(rows: T[]): Map<number, T[]> {
  const grouped = new Map<number, T[]>()
  for (const row of rows) {
    const list = grouped.get(row.propertyId)
    if (list === undefined) {
      grouped.set(row.propertyId, [row])
    } else {
      list.push(row)
    }
  }
  return grouped
}

function toCoordinates(latitude: number | null, longitude: number | null) {
  return latitude !== null && longitude !== null ? { latitude, longitude } : null
}

export async function findProperties(db: Db, query: PropertyQuery) {
  const conditions = buildConditions(query)
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [countRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(properties)
    .where(where)

  const rows = await db
    .select({
      id: properties.id,
      name: properties.name,
      nameKana: properties.nameKana,
      unitName: properties.unitName,
      latitude: properties.latitude,
      longitude: properties.longitude,
      typeCode: heritageTypes.code,
      typeName: heritageTypes.name,
      typeGroup: heritageTypes.groupName,
    })
    .from(properties)
    .innerJoin(heritageTypes, eq(heritageTypes.code, properties.heritageTypeCode))
    .where(where)
    .orderBy(...buildOrderBy(query))
    .limit(query.limit)
    .offset(query.offset)

  const ids = rows.map((row) => row.id)
  const [designationRows, placeRows] = await Promise.all([
    loadDesignations(db, ids),
    loadPlaces(db, ids),
  ])
  const designationsByProperty = groupBy(designationRows)
  const placesByProperty = groupBy(placeRows)

  const data = rows.map((row) => ({
    id: row.id,
    name: row.name,
    nameKana: row.nameKana,
    unitName: row.unitName,
    heritageType: { code: row.typeCode, name: row.typeName, group: row.typeGroup },
    designations: (designationsByProperty.get(row.id) ?? []).map(toDesignation),
    prefectures: [
      ...new Set(
        (placesByProperty.get(row.id) ?? [])
          .filter((p) => p.role === 'location' && p.prefecture !== null)
          .map((p) => p.prefecture ?? '')
      ),
    ],
    coordinates: toCoordinates(row.latitude, row.longitude),
  }))

  return { data, total: countRow?.total ?? 0 }
}

export async function findPropertyById(db: Db, id: number) {
  const [row] = await db
    .select({
      id: properties.id,
      name: properties.name,
      nameKana: properties.nameKana,
      unitName: properties.unitName,
      unitNameKana: properties.unitNameKana,
      targetId: properties.targetId,
      sourceTargetId: properties.sourceTargetId,
      heritageTypeCode: properties.heritageTypeCode,
      period: properties.periodText,
      originCountry: properties.originCountry,
      facilityName: properties.facilityName,
      locationText: properties.locationText,
      latitude: properties.latitude,
      longitude: properties.longitude,
      coordinateNote: properties.coordinateNote,
      quantityText: properties.quantityText,
      eraText: properties.eraText,
      yearText: properties.yearText,
      yearFrom: properties.yearFrom,
      yearTo: properties.yearTo,
      areaText: properties.areaText,
      areaHectares: properties.areaHectares,
      ownerKind: properties.ownerKind,
      summaryText: properties.summaryText,
      detailText: properties.detailText,
      hasPhoto: properties.hasPhoto,
      hasAttachment: properties.hasAttachment,
      designationNumber: properties.designationNumber,
      branchNumber: properties.branchNumber,
      notificationNumber: properties.notificationNumber,
      notifiedOn: properties.notifiedOn,
      addedOn: properties.addedOn,
      registrationRound: properties.registrationRound,
      typeCode: heritageTypes.code,
      typeName: heritageTypes.name,
      typeGroup: heritageTypes.groupName,
      registerCode: registers.code,
      registerName: registers.name,
    })
    .from(properties)
    .innerJoin(heritageTypes, eq(heritageTypes.code, properties.heritageTypeCode))
    .innerJoin(registers, eq(registers.code, properties.registerCode))
    .where(eq(properties.id, id))
    .limit(1)

  if (row === undefined) return undefined

  const [
    designationRows,
    placeRows,
    categoryRows,
    actorRows,
    detailRows,
    criterionRows,
    attachmentRows,
    holderRows,
    changeRows,
  ] = await Promise.all([
    loadDesignations(db, [id]),
    loadPlaces(db, [id]),
    db
      .select({
        schemeCode: categorySchemes.code,
        schemeName: categorySchemes.name,
        name: categories.name,
      })
      .from(propertyCategories)
      .innerJoin(categories, eq(categories.id, propertyCategories.categoryId))
      .innerJoin(categorySchemes, eq(categorySchemes.code, categories.schemeCode))
      .where(eq(propertyCategories.propertyId, id))
      .orderBy(asc(categorySchemes.code)),
    db
      .select({ role: propertyActors.role, name: actors.name })
      .from(propertyActors)
      .innerJoin(actors, eq(actors.id, propertyActors.actorId))
      .where(eq(propertyActors.propertyId, id))
      .orderBy(asc(propertyActors.role)),
    db
      .select({
        code: detailFields.code,
        name: detailFields.name,
        value: propertyDetails.value,
      })
      .from(propertyDetails)
      .innerJoin(detailFields, eq(detailFields.code, propertyDetails.fieldCode))
      .where(eq(propertyDetails.propertyId, id))
      .orderBy(asc(detailFields.displayOrder)),
    db
      .select({
        id: designationCriteria.id,
        kind: designationCriteria.kind,
        slot: propertyDesignationCriteria.slot,
        text: designationCriteria.text,
      })
      .from(propertyDesignationCriteria)
      .innerJoin(
        designationCriteria,
        eq(designationCriteria.id, propertyDesignationCriteria.criterionId)
      )
      .where(eq(propertyDesignationCriteria.propertyId, id))
      .orderBy(asc(propertyDesignationCriteria.slot), asc(designationCriteria.id)),
    db
      .select({
        name: propertyAttachments.name,
        quantityText: propertyAttachments.quantityText,
      })
      .from(propertyAttachments)
      .where(eq(propertyAttachments.propertyId, id))
      .orderBy(asc(propertyAttachments.ordinal)),
    db
      .select({
        kind: propertyHolders.kind,
        name: actors.name,
        nameKana: actors.nameKana,
        certifiedOn: propertyHolders.certifiedOn,
        certificationRound: propertyHolders.certificationRound,
      })
      .from(propertyHolders)
      .leftJoin(actors, eq(actors.id, propertyHolders.actorId))
      .where(eq(propertyHolders.propertyId, id))
      .orderBy(asc(propertyHolders.ordinal)),
    db
      .select({
        id: propertyChanges.id,
        changedOn: propertyChanges.changedOn,
        datePrecision: propertyChanges.datePrecision,
        content: propertyChanges.content,
        typeName: changeTypes.name,
      })
      .from(propertyChanges)
      .leftJoin(propertyChangeTypes, eq(propertyChangeTypes.changeId, propertyChanges.id))
      .leftJoin(changeTypes, eq(changeTypes.id, propertyChangeTypes.typeId))
      .where(eq(propertyChanges.propertyId, id))
      .orderBy(asc(propertyChanges.ordinal)),
  ])

  const changes: {
    changedOn: string | null
    datePrecision: 'day' | 'month' | 'unknown'
    types: string[]
    content: string | null
  }[] = []
  const changeIndex = new Map<number, number>()
  for (const change of changeRows) {
    const position = changeIndex.get(change.id)
    if (position === undefined) {
      changeIndex.set(change.id, changes.length)
      changes.push({
        changedOn: change.changedOn,
        datePrecision: change.datePrecision,
        types: change.typeName === null ? [] : [change.typeName],
        content: change.content,
      })
      continue
    }
    if (change.typeName !== null) changes[position]?.types.push(change.typeName)
  }

  return {
    id: row.id,
    name: row.name,
    nameKana: row.nameKana,
    unitName: row.unitName,
    unitNameKana: row.unitNameKana,
    heritageType: { code: row.typeCode, name: row.typeName, group: row.typeGroup },
    designations: designationRows.map(toDesignation),
    prefectures: [
      ...new Set(
        placeRows
          .filter((p) => p.role === 'location' && p.prefecture !== null)
          .map((p) => p.prefecture ?? '')
      ),
    ],
    coordinates: toCoordinates(row.latitude, row.longitude),
    register: { code: row.registerCode, name: row.registerName },
    targetId: row.targetId,
    sourceUrl: detailUrl(row.heritageTypeCode, row.sourceTargetId),
    period: row.period,
    originCountry: row.originCountry,
    facilityName: row.facilityName,
    locationText: row.locationText,
    coordinateNote: row.coordinateNote,
    quantityText: row.quantityText,
    eraText: row.eraText,
    yearText: row.yearText,
    yearFrom: row.yearFrom,
    yearTo: row.yearTo,
    areaText: row.areaText,
    areaHectares: row.areaHectares,
    ownerKind: row.ownerKind,
    summaryText: row.summaryText,
    detailText: row.detailText,
    hasPhoto: row.hasPhoto,
    hasAttachment: row.hasAttachment,
    designationNumber: row.designationNumber,
    branchNumber: row.branchNumber,
    notificationNumber: row.notificationNumber,
    notifiedOn: row.notifiedOn,
    addedOn: row.addedOn,
    registrationRound: row.registrationRound,
    categories: categoryRows.map((c) => ({
      scheme: { code: c.schemeCode, name: c.schemeName },
      name: c.name,
    })),
    places: placeRows.map((p) => ({
      role: p.role,
      prefecture: p.prefecture,
      addressText: p.addressText,
    })),
    actors: actorRows,
    details: detailRows.map((d) => ({
      field: { code: d.code, name: d.name },
      value: d.value,
    })),
    criteria: criterionRows,
    attachments: attachmentRows,
    holders: holderRows,
    changes,
  }
}
