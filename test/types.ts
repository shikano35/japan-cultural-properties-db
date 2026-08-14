export interface Source {
  name: string
  publisher: string
  url: string
  termsUrl: string
  license: string
  retrievedOn: string
  note: string
}

export interface Designation {
  code: string
  name: string
  designatedOn: string | null
  datePrecision: string
  japaneseEraDate: string | null
}

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface PropertySummary {
  id: number
  name: string
  nameKana: string | null
  unitName: string | null
  heritageType: { code: string; name: string; group: string }
  designations: Designation[]
  prefectures: string[]
  coordinates: Coordinates | null
}

export interface PropertyDetail extends PropertySummary {
  register: { code: string; name: string }
  targetId: string
  period: string | null
  originCountry: string | null
  facilityName: string | null
  locationText: string | null
  coordinateNote: string | null
  categories: { scheme: { code: string; name: string }; name: string }[]
  places: { role: string; prefecture: string | null; addressText: string | null }[]
  actors: { role: string; name: string }[]
  unitNameKana: string | null
  sourceUrl: string | null
  quantityText: string | null
  eraText: string | null
  yearText: string | null
  yearFrom: number | null
  yearTo: number | null
  areaText: string | null
  areaHectares: number | null
  ownerKind: string | null
  summaryText: string | null
  detailText: string | null
  hasPhoto: boolean | null
  hasAttachment: boolean | null
  designationNumber: string | null
  branchNumber: string | null
  notificationNumber: string | null
  notifiedOn: string | null
  addedOn: string | null
  registrationRound: string | null
  details: { field: { code: string; name: string }; value: string }[]
  criteria: { id: number; kind: string; slot: number; text: string }[]
  attachments: { name: string; quantityText: string | null }[]
  holders: {
    kind: string
    name: string | null
    nameKana: string | null
    certifiedOn: string | null
    certificationRound: string | null
  }[]
  changes: {
    changedOn: string | null
    datePrecision: string
    types: string[]
    content: string | null
  }[]
}

export interface ListResponse<T> {
  data: T[]
  meta: { total: number; limit: number; offset: number; source: Source }
}

export interface ItemResponse<T> {
  data: T
  meta: { source: Source }
}

export interface VocabularyResponse<T> {
  data: T[]
  meta: { total: number; source: Source }
}

export interface ErrorResponse {
  error: { code: string; message: string }
}

export interface RootResponse {
  name: string
  version: string
  documentation: { openapi: string; swaggerUi: string; scalar: string }
  source: Source
}

export interface JsonSchemaNode {
  type: string
  properties: Record<string, JsonSchemaNode>
}

export interface OpenApiDocument {
  paths: Record<
    string,
    Record<
      string,
      {
        parameters: { name: string }[]
        responses: Record<string, { content: Record<string, { schema: JsonSchemaNode }> }>
      }
    >
  >
}
