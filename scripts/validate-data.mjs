import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))
const provinces = readJson('public/data/provinces.geojson')
const locations = readJson('public/data/locations.json')
const judicialDistricts = readJson('public/data/judicial-districts.json')
const sources = readJson('public/data/sources.json')
const regionalCourts = readJson('public/data/regional-courts.json')
const courthouseContacts = readJson('public/data/courthouse-contacts.json')

const errors = []
const ids = new Set()

if (provinces.features.length !== 81) errors.push(`81 il bekleniyordu, ${provinces.features.length} bulundu.`)
if (locations.length !== 973) errors.push(`922 ilçe + 51 merkez alanı bekleniyordu, ${locations.length} bulundu.`)

for (const location of locations) {
  if (ids.has(location.id)) errors.push(`Mükerrer konum kimliği: ${location.id}`)
  ids.add(location.id)
  if (!location.provinceId || !location.districtName || !Array.isArray(location.center)) {
    errors.push(`Eksik konum alanı: ${location.id}`)
  }
}

const courthouseSeats = new Set(judicialDistricts.map((record) => record.courthouseSeat))
const contactSeats = new Set()
for (const contact of courthouseContacts) {
  if (contactSeats.has(contact.courthouseSeat)) errors.push(`Mükerrer adliye iletişim kaydı: ${contact.courthouseSeat}`)
  contactSeats.add(contact.courthouseSeat)
  if (!courthouseSeats.has(contact.courthouseSeat)) errors.push(`Yargı çevresinde bulunmayan adliye iletişim kaydı: ${contact.courthouseSeat}`)
  if (!contact.contactUrl?.startsWith('https://') || !contact.contactUrl.includes('.adalet.gov.tr/')) {
    errors.push(`Resmî olmayan adliye iletişim bağlantısı: ${contact.courthouseSeat}`)
  }
  if (!contact.officialName || !contact.linkLabel || !contact.verifiedAt) {
    errors.push(`Eksik adliye iletişim alanı: ${contact.courthouseSeat}`)
  }
}

const sourceIds = new Set(sources.map((source) => source.id))
const locationIds = new Set(locations.map((location) => location.id))
const judicialLocationIds = new Set()
const regionalProvinceNames = new Set()
const activeRegionalCourts = regionalCourts.filter((court) => court.status === 'active')
const plannedRegionalCourts = regionalCourts.filter((court) => court.status === 'planned')

if (activeRegionalCourts.length !== 17) errors.push(`17 faal Bölge Adliye Mahkemesi bekleniyordu, ${activeRegionalCourts.length} bulundu.`)
if (plannedRegionalCourts.length !== 1) errors.push(`1 planlanan Bölge Adliye Mahkemesi bekleniyordu, ${plannedRegionalCourts.length} bulundu.`)
for (const court of regionalCourts) {
  if (!court.officialName.endsWith('Bölge Adliye Mahkemesi')) errors.push(`Geçersiz BAM adı: ${court.officialName}`)
  if (!court.sourceRefs?.length || !court.activeFrom || !court.verifiedAt) errors.push(`Eksik BAM alanı: ${court.officialName}`)
  for (const sourceRef of court.sourceRefs ?? []) {
    if (!sourceIds.has(sourceRef)) errors.push(`Bilinmeyen BAM kaynağı: ${sourceRef}`)
  }
  if (court.status === 'active' && !court.officialUrl?.includes('.adalet.gov.tr')) errors.push(`Resmî BAM sitesi eksik: ${court.officialName}`)
}
for (const court of activeRegionalCourts) {
  for (const provinceName of court.provinces ?? []) {
    if (regionalProvinceNames.has(provinceName)) errors.push(`Birden fazla BAM'a bağlı il: ${provinceName}`)
    regionalProvinceNames.add(provinceName)
  }
}
if (regionalProvinceNames.size !== 81) errors.push(`BAM kapsamı 81 il olmalı, ${regionalProvinceNames.size} il bulundu.`)
for (const location of locations) {
  if (!regionalProvinceNames.has(location.provinceName)) errors.push(`BAM eşleşmesi olmayan il: ${location.provinceName}`)
}
const aksarayBam = regionalCourts.find((court) => court.provinces.includes('Aksaray'))
if (aksarayBam?.seat !== 'Konya') errors.push(`Aksaray için Konya BAM bekleniyordu, ${aksarayBam?.seat ?? 'kayıt yok'} bulundu.`)

const expectedActiveBamByProvince = {
  Bartın: 'Ankara',
  Zonguldak: 'Ankara',
  Denizli: 'Denizli',
  Muğla: 'Denizli',
  Uşak: 'Denizli',
  Çanakkale: 'Tekirdağ',
  Edirne: 'Tekirdağ',
  Kırklareli: 'Tekirdağ',
  Tekirdağ: 'Tekirdağ',
  İstanbul: 'İstanbul',
  Malatya: 'Gaziantep',
  Elazığ: 'Diyarbakır',
  Tunceli: 'Erzurum',
}
for (const [provinceName, expectedSeat] of Object.entries(expectedActiveBamByProvince)) {
  const court = activeRegionalCourts.find((candidate) => candidate.provinces.includes(provinceName))
  if (court?.seat !== expectedSeat) errors.push(`Güncel BAM hatası: ${provinceName}; ${expectedSeat} bekleniyordu, ${court?.seat ?? 'kayıt yok'} bulundu.`)
}
const plannedMalatyaBam = plannedRegionalCourts.find((court) => court.seat === 'Malatya')
if (plannedMalatyaBam?.activeFrom !== '2026-09-01') errors.push('Malatya BAM planlanan faaliyete geçiş tarihi 2026-09-01 olmalı.')
for (const provinceName of ['Adıyaman', 'Elazığ', 'Malatya', 'Tunceli']) {
  if (!plannedMalatyaBam?.provinces.includes(provinceName)) errors.push(`Malatya BAM planlanan yargı çevresinde ${provinceName} eksik.`)
}

if (judicialDistricts.length !== locations.length) {
  errors.push(`Her konum için yargı çevresi bekleniyordu: ${judicialDistricts.length}/${locations.length}.`)
}
for (const record of judicialDistricts) {
  if (!locationIds.has(record.locationId)) errors.push(`Bilinmeyen yargı çevresi konumu: ${record.locationId}`)
  if (judicialLocationIds.has(record.locationId)) errors.push(`Mükerrer yargı çevresi konumu: ${record.locationId}`)
  judicialLocationIds.add(record.locationId)
  if (!record.courthouseSeat || !record.criminalCentre) errors.push(`Eksik adliye/ACM: ${record.locationId}`)
  if (!record.sourceRefs?.length || !record.verifiedAt || !record.validFrom) errors.push(`Kaynaksız yargı çevresi: ${record.locationId}`)
  for (const sourceId of record.sourceRefs ?? []) {
    if (!sourceIds.has(sourceId)) errors.push(`Bilinmeyen yargı çevresi kaynağı ${sourceId}: ${record.locationId}`)
  }
}
for (const location of locations) {
  if (!judicialLocationIds.has(location.id)) errors.push(`Yargı çevresi bulunmayan konum: ${location.id}`)
}

// PDF'deki Türkçe karakter maskelerinin daha önce yanlış ad seçmesine yol açtığı
// kayıtlar ve sonraki HSK kararları için sabit regresyon kontrolleri.
const expectedJudicialRecords = {
  'TR-01-karatas': { courthouseSeat: 'Karataş' },
  'TR-03-cay': { courthouseSeat: 'Çay' },
  'TR-03-sultandagi': { courthouseSeat: 'Çay' },
  'TR-03-suhut': { courthouseSeat: 'Şuhut' },
  'TR-11-inhisar': { courthouseSeat: 'Söğüt' },
  'TR-11-sogut': { courthouseSeat: 'Söğüt' },
  'TR-17-can': { courthouseSeat: 'Çan' },
  'TR-18-cerkes': { courthouseSeat: 'Çerkeş', criminalCentre: 'Çankırı' },
  'TR-20-baklan': { courthouseSeat: 'Çal' },
  'TR-20-bekilli': { courthouseSeat: 'Çal' },
  'TR-20-cal': { courthouseSeat: 'Çal' },
  'TR-21-cinar': { courthouseSeat: 'Çınar' },
  'TR-21-cungus': { courthouseSeat: 'Çüngüş' },
  'TR-22-enez': { criminalCentre: 'Keşan' },
  'TR-22-ipsala': { criminalCentre: 'Keşan' },
  'TR-22-kesan': { courthouseSeat: 'Keşan', criminalCentre: 'Keşan' },
  'TR-25-cat': { courthouseSeat: 'Çat' },
  'TR-29-siran': { courthouseSeat: 'Şiran' },
  'TR-34-sile': { courthouseSeat: 'Şile' },
  'TR-35-cesme': { courthouseSeat: 'Çeşme' },
  'TR-42-sarayonu': { courthouseSeat: 'Sarayönü' },
  'TR-43-pazarlar': { criminalCentre: 'Uşak' },
  'TR-43-simav': { criminalCentre: 'Uşak' },
  'TR-49-haskoy': { courthouseSeat: 'Muş', criminalCentre: 'Muş' },
  'TR-49-korkut': { courthouseSeat: 'Muş', criminalCentre: 'Muş' },
  'TR-49-mus': { courthouseSeat: 'Muş', criminalCentre: 'Muş' },
  'TR-49-varto': { criminalCentre: 'Muş' },
  'TR-55-alacam': { courthouseSeat: 'Alaçam' },
  'TR-55-yakakent': { courthouseSeat: 'Alaçam' },
  'TR-64-banaz': { criminalCentre: 'Uşak' },
  'TR-64-esme': { criminalCentre: 'Uşak' },
  'TR-64-karahalli': { criminalCentre: 'Uşak' },
  'TR-64-sivasli': { criminalCentre: 'Uşak' },
  'TR-64-ulubey': { courthouseSeat: 'Uşak', criminalCentre: 'Uşak' },
  'TR-64-usak': { courthouseSeat: 'Uşak', criminalCentre: 'Uşak' },
  'TR-77-armutlu': { courthouseSeat: 'Armutlu', criminalCentre: 'Yalova' },
  'TR-40-akcakent': { courthouseSeat: 'Çiçekdağı', criminalCentre: 'Kırşehir' },
  'TR-40-cicekdagi': { courthouseSeat: 'Çiçekdağı', criminalCentre: 'Kırşehir' },
  'TR-16-harmancik': { courthouseSeat: 'Harmancık', criminalCentre: 'Bursa' },
  'TR-26-inonu': { courthouseSeat: 'İnönü', criminalCentre: 'Eskişehir' },
  'TR-34-eyupsultan': { courthouseSeat: 'Gaziosmanpaşa', criminalCentre: 'Gaziosmanpaşa' },
  'TR-34-arnavutkoy': { courthouseSeat: 'Gaziosmanpaşa', criminalCentre: 'Gaziosmanpaşa' },
  'TR-34-gaziosmanpasa': { courthouseSeat: 'Gaziosmanpaşa', criminalCentre: 'Gaziosmanpaşa' },
  'TR-34-sultangazi': { courthouseSeat: 'Gaziosmanpaşa', criminalCentre: 'Gaziosmanpaşa' },
  'TR-48-seydikemer': { courthouseSeat: 'Seydikemer', criminalCentre: 'Fethiye' },
}

const judicialByLocation = new Map(judicialDistricts.map((record) => [record.locationId, record]))
for (const [locationId, expected] of Object.entries(expectedJudicialRecords)) {
  const record = judicialByLocation.get(locationId)
  if (!record) {
    errors.push(`Regresyon kaydı bulunamadı: ${locationId}`)
    continue
  }
  for (const [field, value] of Object.entries(expected)) {
    if (record[field] !== value) errors.push(`Hatalı ${field}: ${locationId}; ${value} bekleniyordu, ${record[field]} bulundu.`)
  }
}

const expectedIstanbulCourthouseGroups = {
  'İstanbul': ['bayrampasa', 'besiktas', 'beyoglu', 'fatih', 'kagithane', 'sariyer', 'sisli'],
  'Gaziosmanpaşa': ['arnavutkoy', 'eyupsultan', 'gaziosmanpasa', 'sultangazi'],
  'Bakırköy': ['bagcilar', 'bahcelievler', 'bakirkoy', 'esenler', 'gungoren', 'zeytinburnu'],
  'Küçükçekmece': ['avcilar', 'basaksehir', 'kucukcekmece'],
  'Büyükçekmece': ['beylikduzu', 'buyukcekmece', 'esenyurt'],
  'İstanbul Anadolu': ['atasehir', 'cekmekoy', 'kadikoy', 'kartal', 'maltepe', 'pendik', 'sancaktepe', 'sultanbeyli', 'tuzla', 'umraniye', 'uskudar'],
  'Adalar': ['adalar'],
  'Beykoz': ['beykoz'],
  'Şile': ['sile'],
  'Çatalca': ['catalca'],
  'Silivri': ['silivri'],
}

for (const [courthouseSeat, districtSlugs] of Object.entries(expectedIstanbulCourthouseGroups)) {
  for (const slug of districtSlugs) {
    const locationId = `TR-34-${slug}`
    const record = judicialByLocation.get(locationId)
    if (record?.courthouseSeat !== courthouseSeat) {
      errors.push(`İstanbul yargı çevresi hatası: ${locationId}; ${courthouseSeat} bekleniyordu, ${record?.courthouseSeat} bulundu.`)
    }
    if (record?.verifiedAt !== '2026-07-22') errors.push(`İstanbul kontrol tarihi güncel değil: ${locationId}`)
    if (!record?.sourceRefs?.some((sourceId) => sourceId !== 'hsk-adli-yargi-rehberi-2024')) {
      errors.push(`İstanbul kaydı yalnız eski toplu rehbere dayanıyor: ${locationId}`)
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Veri doğrulandı: 81 il, ${locations.length} coğrafi alan, ${judicialDistricts.length} yargı çevresi, ${activeRegionalCourts.length} faal + ${plannedRegionalCourts.length} planlanan BAM, ${courthouseContacts.length} adliye iletişim bağlantısı, ${sources.length} kaynak.`)
