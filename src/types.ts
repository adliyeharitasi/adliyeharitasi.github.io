export interface LocationRecord {
  id: string
  provinceId: string
  provinceName: string
  districtName: string
  center: [number, number]
  isCentralArea: boolean
}

export interface SourceRecord {
  id: string
  type: string
  title: string
  url: string
  publisher: string
  checkedAt: string
}

export interface RegionalCourtRecord {
  officialName: string
  seat: string
  provinces: string[]
  officialUrl: string | null
  status: 'active' | 'planned'
  activeFrom: string
  sourceRefs: string[]
  verifiedAt: string
}

export interface CourthouseContactRecord {
  courthouseSeat: string
  officialName: string
  contactUrl: string
  linkLabel: string
  verifiedAt: string
}

export type JudicialActivityStatus = 'faal' | 'birlestirildi' | 'teskilat-kurulmadi' | 'faal-degil'
export type JudicialOrganizationType = 'acm' | 'mulhakat' | 'none'

export interface JudicialDistrictRecord {
  locationId: string
  provinceName: string
  districtName: string
  courthouseSeat: string
  criminalCentre: string
  regionClass: number | null
  organizationType: JudicialOrganizationType
  activityStatus: JudicialActivityStatus
  sourceRow: number | null
  sourcePage: number | null
  sourceRefs: string[]
  verifiedAt: string
  validFrom: string
  sourceFileDatedAt: string | null
  sourceEmbeddedModifiedAt: string | null
}
