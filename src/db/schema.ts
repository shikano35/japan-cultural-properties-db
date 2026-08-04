import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const DATE_PRECISIONS = ['day', 'month', 'unknown'] as const
export const DESIGNATION_TIERS = ['designated', 'registered', 'selected', 'recorded'] as const
export const HERITAGE_GROUPS = [
  'building',
  'art_craft',
  'folk',
  'intangible',
  'monument',
  'other',
] as const
export const PLACE_ROLES = ['location', 'owner_address', 'region'] as const
export const ACTOR_ROLES = ['owner', 'custodian'] as const

// 出典
export const sources = sqliteTable('sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  publisher: text('publisher').notNull(),
  url: text('url').notNull(),
  termsUrl: text('terms_url').notNull(),
  licenseNote: text('license_note').notNull(),
  retrievedOn: text('retrieved_on').notNull(),
  processingNote: text('processing_note').notNull(),
})

// 台帳ID
export const registers = sqliteTable('registers', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
})

// 文化財種類
export const heritageTypes = sqliteTable('heritage_types', {
  code: text('code').primaryKey(),
  name: text('name').notNull().unique(),
  groupName: text('group_name', { enum: HERITAGE_GROUPS }).notNull(),
})

//文化財
export const properties = sqliteTable(
  'properties',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceId: integer('source_id')
      .notNull()
      .references(() => sources.id),
    registerCode: text('register_code')
      .notNull()
      .references(() => registers.code),
    targetId: text('target_id').notNull(),
    sourceTargetId: text('source_target_id').notNull(),
    heritageTypeCode: text('heritage_type_code')
      .notNull()
      .references(() => heritageTypes.code),
    name: text('name').notNull(),
    unitName: text('unit_name'),
    periodText: text('period_text'),
    originCountry: text('origin_country'),
    facilityName: text('facility_name'),
    locationText: text('location_text'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    coordinateNote: text('coordinate_note'),
  },
  (t) => [
    uniqueIndex('properties_register_target_unique').on(t.registerCode, t.targetId),
    index('properties_heritage_type_idx').on(t.heritageTypeCode),
    index('properties_register_idx').on(t.registerCode),
    index('properties_name_idx').on(t.name),
    index('properties_coordinates_idx').on(t.latitude, t.longitude),
  ]
)

// 指定・登録の区分
export const designationCategories = sqliteTable('designation_categories', {
  code: text('code').primaryKey(),
  name: text('name').notNull().unique(),
  tier: text('tier', { enum: DESIGNATION_TIERS }).notNull(),
})

//指定・登録
export const designations = sqliteTable(
  'designations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    propertyId: integer('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    categoryCode: text('category_code')
      .notNull()
      .references(() => designationCategories.code),
    designatedOn: text('designated_on'),
    datePrecision: text('date_precision', { enum: DATE_PRECISIONS }).notNull(),
    sourceDate: text('source_date'),
  },
  (t) => [
    uniqueIndex('designations_property_category_unique').on(t.propertyId, t.categoryCode),
    index('designations_property_idx').on(t.propertyId),
    index('designations_category_date_idx').on(t.categoryCode, t.designatedOn),
  ]
)

//分類体系
export const categorySchemes = sqliteTable('category_schemes', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  appliesTo: text('applies_to').notNull(),
})

// 分類語彙
export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schemeCode: text('scheme_code')
      .notNull()
      .references(() => categorySchemes.code),
    name: text('name').notNull(),
  },
  (t) => [uniqueIndex('categories_scheme_name_unique').on(t.schemeCode, t.name)]
)

export const propertyCategories = sqliteTable(
  'property_categories',
  {
    propertyId: integer('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
  },
  (t) => [
    primaryKey({ columns: [t.propertyId, t.categoryId] }),
    index('property_categories_category_idx').on(t.categoryId),
  ]
)

// 場所
export const places = sqliteTable(
  'places',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    prefecture: text('prefecture'),
    addressText: text('address_text'),
    raw: text('raw').notNull().unique(),
  },
  (t) => [index('places_prefecture_idx').on(t.prefecture)]
)

// 文化財と場所の関係
export const propertyPlaces = sqliteTable(
  'property_places',
  {
    propertyId: integer('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    placeId: integer('place_id')
      .notNull()
      .references(() => places.id),
    role: text('role', { enum: PLACE_ROLES }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.propertyId, t.placeId, t.role] }),
    index('property_places_place_role_idx').on(t.placeId, t.role),
  ]
)

// 所有者・管理団体
export const actors = sqliteTable('actors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
})

export const propertyActors = sqliteTable(
  'property_actors',
  {
    propertyId: integer('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    actorId: integer('actor_id')
      .notNull()
      .references(() => actors.id),
    role: text('role', { enum: ACTOR_ROLES }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.propertyId, t.actorId, t.role] }),
    index('property_actors_actor_role_idx').on(t.actorId, t.role),
  ]
)
