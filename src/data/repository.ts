import { z } from 'zod'
import type { JudicialDistrictRecord, LocationRecord, RegionalCourtRecord, SourceRecord } from '../types'

const locationSchema = z.object({
  id: z.string(),
  provinceId: z.string(),
  provinceName: z.string(),
  districtName: z.string(),
  center: z.tuple([z.number(), z.number()]),
  isCentralArea: z.boolean(),
})

const sourceSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  url: z.string().url(),
  publisher: z.string(),
  checkedAt: z.string(),
})

const regionalCourtSchema = z.object({
  officialName: z.string(),
  seat: z.string(),
  provinces: z.array(z.string()).min(1),
  officialUrl: z.string().url().nullable(),
  status: z.enum(['active', 'planned']),
  activeFrom: z.string(),
  sourceRefs: z.array(z.string()).min(1),
  verifiedAt: z.string(),
})

const judicialDistrictSchema = z.object({
  locationId: z.string(),
  provinceName: z.string(),
  districtName: z.string(),
  courthouseSeat: z.string(),
  criminalCentre: z.string(),
  regionClass: z.number().int().nullable(),
  organizationType: z.enum(['acm', 'mulhakat', 'none']),
  activityStatus: z.enum(['faal', 'birlestirildi', 'teskilat-kurulmadi', 'faal-degil']),
  sourceRow: z.number().int().nullable(),
  sourcePage: z.number().int().nullable(),
  sourceRefs: z.array(z.string()).min(1),
  verifiedAt: z.string(),
  validFrom: z.string(),
  sourceFileDatedAt: z.string().nullable(),
  sourceEmbeddedModifiedAt: z.string().nullable(),
})

async function fetchJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Veri yüklenemedi: ${url}`)
  return schema.parse(await response.json())
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

export const loadLocations = () => fetchJson<LocationRecord[]>(assetUrl('data/locations.json'), z.array(locationSchema))
export const loadSources = () => fetchJson<SourceRecord[]>(assetUrl('data/sources.json'), z.array(sourceSchema))
export const loadRegionalCourts = () => fetchJson<RegionalCourtRecord[]>(assetUrl('data/regional-courts.json'), z.array(regionalCourtSchema))
export const loadJudicialDistricts = () => fetchJson<JudicialDistrictRecord[]>(
  assetUrl('data/judicial-districts.json'),
  z.array(judicialDistrictSchema) as z.ZodType<JudicialDistrictRecord[]>,
)

export const loadProvincesGeoJson = async () => {
  const response = await fetch(assetUrl('data/provinces.geojson'))
  if (!response.ok) throw new Error('İl sınırları yüklenemedi.')
  return response.json()
}

export const loadDistrictsGeoJson = async (provinceId: string) => {
  const response = await fetch(assetUrl(`data/districts/${provinceId}.geojson`))
  if (!response.ok) throw new Error('İlçe sınırları yüklenemedi.')
  return response.json()
}
