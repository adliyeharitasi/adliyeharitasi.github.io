import { useEffect, useMemo, useState } from 'react'
import { Building2, CalendarClock, ExternalLink, Landmark, MapPin, Moon, Scale, Search, ShieldCheck, Sun } from 'lucide-react'
import { loadJudicialDistricts, loadLocations, loadRegionalCourts, loadSources } from '../data/repository'
import type { JudicialDistrictRecord, LocationRecord, RegionalCourtRecord, SourceRecord } from '../types'
import { SimpleJudicialMap } from './SimpleJudicialMap'
import './v2.css'

const baseUrl = import.meta.env.BASE_URL

interface DirectoryItem extends JudicialDistrictRecord {
  location: LocationRecord
}

export function V2App() {
  const [items, setItems] = useState<DirectoryItem[]>([])
  const [sources, setSources] = useState<SourceRecord[]>([])
  const [regionalCourts, setRegionalCourts] = useState<RegionalCourtRecord[]>([])
  const [selected, setSelected] = useState<DirectoryItem>()
  const [query, setQuery] = useState('')
  const [province, setProvince] = useState('')
  const [loadingError, setLoadingError] = useState<string>()
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('adliye-haritasi-theme')
    if (savedTheme) return savedTheme === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    localStorage.setItem('adliye-haritasi-theme', darkMode ? 'dark' : 'light')
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', darkMode ? '#091821' : '#163a59')
  }, [darkMode])

  useEffect(() => {
    Promise.all([loadLocations(), loadJudicialDistricts(), loadSources(), loadRegionalCourts()])
      .then(([locations, districts, sourceData, regionalCourtData]) => {
        const locationsById = new Map(locations.map((location) => [location.id, location]))
        const joined = districts
          .map((district) => ({ ...district, location: locationsById.get(district.locationId)! }))
          .filter((item) => item.location)
          .sort((a, b) => a.provinceName.localeCompare(b.provinceName, 'tr') || a.districtName.localeCompare(b.districtName, 'tr'))
        setItems(joined)
        setSources(sourceData)
        setRegionalCourts(regionalCourtData)
      })
      .catch((reason) => setLoadingError(reason instanceof Error ? reason.message : 'Veriler yüklenemedi.'))
  }, [])

  const provinces = useMemo(() => [...new Set(items.map((item) => item.provinceName))].sort((a, b) => a.localeCompare(b, 'tr')), [items])
  const normalizedQuery = query.toLocaleLowerCase('tr-TR').trim()
  const filtered = useMemo(() => items.filter((item) => {
    if (province && item.provinceName !== province) return false
    if (!normalizedQuery) return true
    return `${item.districtName} ${item.provinceName} ${item.courthouseSeat}`
      .toLocaleLowerCase('tr-TR')
      .includes(normalizedQuery)
  }), [items, normalizedQuery, province])

  const selectItem = (item: DirectoryItem) => {
    setSelected(item)
    document.getElementById(`v2-item-${item.locationId}`)?.scrollIntoView({ block: 'nearest' })
  }

  const selectLocation = (location: LocationRecord) => {
    const item = items.find((candidate) => candidate.locationId === location.id)
    if (item) selectItem(item)
  }

  if (loadingError) return <main className={`v2-state ${darkMode ? 'dark' : ''}`}><h1>Veriler açılamadı</h1><p>{loadingError}</p></main>
  if (!items.length) return (
    <main className={`v2-loading ${darkMode ? 'dark' : ''}`} aria-live="polite" aria-busy="true">
      <div className="v2-loading-orbit orbit-one" aria-hidden="true" />
      <div className="v2-loading-orbit orbit-two" aria-hidden="true" />
      <section className="v2-loading-card">
        <div className="v2-loading-brand">
          <span><img src={`${baseUrl}icon.svg`} alt="" /></span>
          <div><b>Adliye Haritası</b><small>Türkiye adliye rehberi</small></div>
        </div>
        <div className="v2-loading-emblem" aria-hidden="true">
          <Landmark size={34} strokeWidth={1.7} />
          <i /><i /><i />
        </div>
        <h1>Adliye rehberi hazırlanıyor</h1>
        <p>İlçe sınırları ve güncel yargı çevresi kayıtları yükleniyor.</p>
        <div className="v2-loading-track" aria-hidden="true"><span /></div>
        <small>81 il · 973 coğrafi alan · Kaynaklı veriler</small>
      </section>
    </main>
  )

  const selectedSources = selected?.sourceRefs
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is SourceRecord => Boolean(source)) ?? []
  const selectedRegionalCourt = selected
    ? regionalCourts.find((court) => court.status === 'active' && court.provinces.includes(selected.provinceName))
    : undefined
  const plannedRegionalCourt = selected
    ? regionalCourts.find((court) => court.status === 'planned' && court.provinces.includes(selected.provinceName))
    : undefined
  const regionalCourtSources = selectedRegionalCourt?.sourceRefs
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is SourceRecord => Boolean(source)) ?? []

  return (
    <div className={`v2-app ${darkMode ? 'dark' : ''}`}>
      <header className="v2-header">
        <a className="v2-brand" href={baseUrl} aria-label="Adliye Haritası ana sayfa">
          <span><img src={`${baseUrl}icon.svg`} alt="" /></span>
          <div><b>Adliye Haritası</b><small>İlçe hangi adliyeye bağlı?</small></div>
        </a>
        <div className="v2-header-note"><ShieldCheck size={15} /> Resmî kaynaklarla kontrol edildi</div>
        <button
          className="v2-theme-toggle"
          type="button"
          onClick={() => setDarkMode((value) => !value)}
          aria-label={darkMode ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
          title={darkMode ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          <span>{darkMode ? 'Aydınlık' : 'Karanlık'}</span>
        </button>
      </header>

      <main className="v2-layout">
        <aside className="v2-directory" aria-label="İlçe ve adliye listesi">
          <div className="v2-directory-head">
            <h1>İlçenizi bulun</h1>
            <p>Listeden seçin veya haritada önce ile, sonra ilçeye tıklayın.</p>
            <label className="v2-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">İlçe veya adliye ara</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İlçe veya adliye ara…" />
            </label>
            <select className="v2-province-select" value={province} onChange={(event) => setProvince(event.target.value)} aria-label="İle göre filtrele">
              <option value="">Tüm iller</option>
              {provinces.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <div className="v2-count" aria-live="polite">{filtered.length} kayıt</div>
          </div>

          <div className="v2-list">
            {filtered.map((item) => (
              <button
                id={`v2-item-${item.locationId}`}
                key={item.locationId}
                className={selected?.locationId === item.locationId ? 'selected' : ''}
                onClick={() => selectItem(item)}
                aria-pressed={selected?.locationId === item.locationId}
              >
                <span className="v2-list-pin"><MapPin size={16} /></span>
                <span className="v2-list-main"><b>{item.districtName}</b><small>{item.provinceName}</small></span>
                <span className="v2-list-court">{item.courthouseSeat} Adliyesi</span>
              </button>
            ))}
            {!filtered.length && <div className="v2-empty">Aramanızla eşleşen kayıt bulunamadı.</div>}
          </div>
        </aside>

        <section className="v2-map-area" aria-label="Adliye yetki alanı haritası">
          <SimpleJudicialMap
            locations={items.map((item) => item.location)}
            selected={selected?.location}
            selectedRecord={selected}
            onSelect={selectLocation}
            onClearSelection={() => setSelected(undefined)}
            darkMode={darkMode}
          />

          <aside className={`v2-result ${selected ? 'open' : ''}`} aria-live="polite">
            {selected ? (
              <>
                <div className="v2-result-icon"><Building2 size={24} /></div>
                <div className="v2-result-copy">
                  <span className="v2-result-label">{selected.districtName} · {selected.provinceName}</span>
                  <h2>{selected.courthouseSeat} Adliyesi</h2>
                  <p className="v2-first-court">Bu ilçenin genel ilk derece adliyesi <b>{selected.courthouseSeat} Adliyesidir.</b></p>
                  {selectedRegionalCourt && (
                    <p className="v2-bam-result">
                      <Scale size={15} aria-hidden="true" />
                      <span>Hâlen bağlı olduğu bölge adliye mahkemesi <b>{selectedRegionalCourt.officialName.replace(/Mahkemesi$/, 'Mahkemesidir')}.</b></span>
                    </p>
                  )}
                  {plannedRegionalCourt && (
                    <p className="v2-bam-planned">
                      <CalendarClock size={15} aria-hidden="true" />
                      <span><b>1 Eylül 2026 için planlanan değişiklik:</b> {plannedRegionalCourt.officialName}. Değişiklik mahkeme faaliyete geçtiğinde uygulanacaktır.</span>
                    </p>
                  )}
                  <small className="v2-scope-note">İhtisas mahkemelerinin yargı çevresi ayrıca düzenlenmiş olabilir.</small>
                  <div className="v2-sources">
                    {selectedSources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">İlk derece kaynağı <ExternalLink size={12} /></a>)}
                    {selectedRegionalCourt?.officialUrl && <a href={selectedRegionalCourt.officialUrl} target="_blank" rel="noreferrer">BAM resmî sitesi <ExternalLink size={12} /></a>}
                    {regionalCourtSources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">BAM dayanağı <ExternalLink size={12} /></a>)}
                    <small>Kontrol: {selected.verifiedAt} · BAM: {selectedRegionalCourt?.verifiedAt}</small>
                  </div>
                </div>
              </>
            ) : (
              <p className="v2-prompt"><MapPin size={18} /> Bir ilçe seçtiğinizde bağlı olduğu adliye burada gösterilir.</p>
            )}
          </aside>
        </section>
      </main>
    </div>
  )
}
