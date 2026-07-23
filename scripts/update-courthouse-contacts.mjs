import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const directoryUrl = 'https://www.adalet.gov.tr/Birimler/ACM'
const checkedAt = new Date().toISOString().slice(0, 10)
const judicialDistricts = JSON.parse(
  fs.readFileSync(path.join(root, 'public/data/judicial-districts.json'), 'utf8'),
)
const outputPath = path.join(root, 'public/data/courthouse-contacts.json')

const overrides = new Map([
  ['İstanbul Anadolu', {
    officialName: 'İstanbul Anadolu Adalet Sarayı',
    contactUrl: 'https://istanbulanadolu.adalet.gov.tr/anadolu-adliyesi-telefon-rehberi',
    linkLabel: 'İletişim ve telefon rehberi',
  }],
])

const decodeHtml = (value) => value
  .replace(/&(?:#x27|apos);/gi, "'")
  .replace(/&(?:quot|#x22);/gi, '"')
  .replace(/&(?:amp|#x26);/gi, '&')
  .replace(/&nbsp;|&#xA0;/gi, ' ')

const cleanText = (value) => decodeHtml(value)
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeName = (value) => value
  .toLocaleLowerCase('tr-TR')
  .replace(/\b(adliyesi|adalet sarayı)\b/g, '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/ı/g, 'i')
  .replace(/[^a-z0-9]/g, '')

const response = await fetch(directoryUrl)
if (!response.ok) {
  throw new Error(`Adalet Bakanlığı adliye rehberi alınamadı: HTTP ${response.status}`)
}

const html = await response.text()
const officialSites = new Map()
const anchorPattern = /<a\b(?=[^>]*class="[^"]*\bab-announcement\b[^"]*")(?=[^>]*href="(https:\/\/[^"]+\.adalet\.gov\.tr[^"]*)")[^>]*>([\s\S]*?)<\/a>/gi

for (const match of html.matchAll(anchorPattern)) {
  const [, url, body] = match
  const officialName = cleanText(body)
  const normalized = normalizeName(officialName)
  if (normalized) officialSites.set(normalized, { officialName, url: url.replace(/\/$/, '') })
}

if (officialSites.size < 150) {
  throw new Error(`Resmî adliye rehberinden beklenenden az kayıt okundu: ${officialSites.size}`)
}

const courthouseSeats = [...new Set(judicialDistricts.map((record) => record.courthouseSeat))]
  .sort((a, b) => a.localeCompare(b, 'tr'))

const records = []
for (const courthouseSeat of courthouseSeats) {
  const override = overrides.get(courthouseSeat)
  if (override) {
    records.push({
      courthouseSeat,
      ...override,
      scope: 'direct',
      verifiedAt: checkedAt,
    })
    continue
  }

  const officialSite = officialSites.get(normalizeName(courthouseSeat))
  if (!officialSite) continue
  records.push({
    courthouseSeat,
    officialName: officialSite.officialName,
    contactUrl: `${officialSite.url}/iletisim`,
    linkLabel: 'İletişim bilgileri',
    scope: 'direct',
    verifiedAt: checkedAt,
  })
}

const data = {
  directorySource: {
    title: 'T.C. Adalet Bakanlığı Adliyeler Rehberi',
    url: directoryUrl,
    verifiedAt: checkedAt,
  },
  fallback: {
    officialName: 'T.C. Adalet Bakanlığı Telefon Rehberi',
    contactUrl: 'https://edb.adalet.gov.tr/Rehber',
    linkLabel: 'Adalet telefon rehberi',
    scope: 'directory',
    verifiedAt: checkedAt,
  },
  records,
}

fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
console.log(`${records.length} doğrudan resmî adliye bağlantısı; ${courthouseSeats.length} adliyenin tamamı rehber fallback'iyle kapsandı.`)
