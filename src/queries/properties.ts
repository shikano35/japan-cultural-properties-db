import { and, asc, desc, eq, gte, inArray, isNotNull, like, lte, sql, type SQL } from 'drizzle-orm'
import type { Db } from '../db/client'
import {
  actors,
  categories,
  categorySchemes,
  designationCategories,
  designations,
  heritageTypes,
  places,
  properties,
  propertyActors,
  propertyCategories,
  propertyPlaces,
  registers,
} from '../db/schema'
import type { PropertyQuery } from '../schemas/property'

function buildConditions(query: PropertyQuery): SQL[] {
  const conditions: SQL[] = []

  if (query.q !== undefined) {
    conditions.push(like(properties.name, `%${query.q}%`))
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
  if (query.hasCoordinates === true) {
    conditions.push(isNotNull(properties.latitude))
  }
  if (query.hasCoordinates === false) {
    conditions.push(sql`${properties.latitude} is null`)
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

function buildOrderBy(query: PropertyQuery): SQL[] {
  const direction = query.order === 'desc' ? desc : asc
  switch (query.sort) {
    case 'name':
      return [direction(properties.name), asc(properties.id)]
    case 'designatedOn':
      return [
        direction(
          sql`(select min(${designations.designatedOn}) from ${designations} where ${designations.propertyId} = ${properties.id})`
        ),
        asc(properties.id),
      ]
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
    })
    .from(designations)
    .innerJoin(designationCategories, eq(designationCategories.code, designations.categoryCode))
    .where(inArray(designations.propertyId, ids))
    .orderBy(asc(designations.propertyId), asc(designations.designatedOn))
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
    unitName: row.unitName,
    heritageType: { code: row.typeCode, name: row.typeName, group: row.typeGroup },
    designations: (designationsByProperty.get(row.id) ?? []).map((d) => ({
      code: d.code,
      name: d.name,
      designatedOn: d.designatedOn,
      datePrecision: d.datePrecision,
    })),
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
      unitName: properties.unitName,
      targetId: properties.targetId,
      period: properties.periodText,
      originCountry: properties.originCountry,
      facilityName: properties.facilityName,
      locationText: properties.locationText,
      latitude: properties.latitude,
      longitude: properties.longitude,
      coordinateNote: properties.coordinateNote,
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

  const [designationRows, placeRows, categoryRows, actorRows] = await Promise.all([
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
  ])

  return {
    id: row.id,
    name: row.name,
    unitName: row.unitName,
    heritageType: { code: row.typeCode, name: row.typeName, group: row.typeGroup },
    designations: designationRows.map((d) => ({
      code: d.code,
      name: d.name,
      designatedOn: d.designatedOn,
      datePrecision: d.datePrecision,
    })),
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
    period: row.period,
    originCountry: row.originCountry,
    facilityName: row.facilityName,
    locationText: row.locationText,
    coordinateNote: row.coordinateNote,
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
  }
}
