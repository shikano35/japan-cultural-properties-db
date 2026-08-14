export interface Row {
  ledgerId: string
  targetId: string
  name: string
  unitName: string
  heritageType: string
  kind1: string
  kind2: string
  country: string
  period: string
  icpDate: string
  ntDate: string
  region: string
  location: string
  facility: string
  owner: string
  custodian: string
  latitude: string
  longitude: string
}

export type PlaceRole = 'location' | 'owner_address' | 'region'
export type ActorRole = 'owner' | 'custodian'
export type DatePrecision = 'day' | 'month' | 'unknown'

export interface PlaceRef {
  prefecture: string | null
  addressText: string | null
  raw: string
}

export interface Designation {
  categoryCode: string
  designatedOn: string | null
  datePrecision: DatePrecision
  sourceDate: string | null
}

export interface Property {
  registerCode: string
  targetId: string
  sourceTargetId: string
  heritageTypeCode: string
  name: string
  unitName: string | null
  periodText: string | null
  originCountry: string | null
  facilityName: string | null
  locationText: string | null
  latitude: number | null
  longitude: number | null
  coordinateNote: string | null
  designations: Designation[]
  categories: { schemeCode: string; name: string }[]
  places: { role: PlaceRole; place: PlaceRef }[]
  actors: { role: ActorRole; name: string }[]
}
