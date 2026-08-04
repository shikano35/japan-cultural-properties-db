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
}

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface PropertySummary {
  id: number
  name: string
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
