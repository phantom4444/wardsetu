import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map from './components/Map'
import WardPanel from './components/WardPanel'
import ReportForm from './components/ReportForm'
import SuccessScreen from './components/SuccessScreen'
import Splash from './components/Splash'
import Onboarding from './components/Onboarding'
import ListView from './components/ListView'
import ReportDetail from './components/ReportDetail'
import { supabase } from './lib/supabase'
import { detectWard } from './lib/wardUtils'

const APP_VERSION = 'v0.1'
const ONBOARDING_KEY = 'wardsetu.onboarded'

export default function App() {
  const mapRef = useRef(null)

  const [showSplash, setShowSplash] = useState(true)
  const [onboarded, setOnboarded] = useState(
    () => typeof localStorage !== 'undefined' && !!localStorage.getItem(ONBOARDING_KEY)
  )
  const showOnboarding = !showSplash && !onboarded
  const [tab, setTab] = useState('map')
  const [view, setView] = useState('main') // 'main' | 'report' | 'success'
  const [userLocation, setUserLocation] = useState(null)
  const [selectedWard, setSelectedWard] = useState(null)
  const [wardGeoJSON, setWardGeoJSON] = useState(null)
  const [reports, setReports] = useState([])
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [detectingGPS, setDetectingGPS] = useState(false)

  useEffect(() => {
    fetch('/jaipur_wards_v1.geojson')
      .then((r) => r.json())
      .then(setWardGeoJSON)
      .catch((err) => console.error('Failed to load wards GeoJSON:', err))
  }, [])

  const refreshReports = useCallback(async () => {
    const { data, error } = await supabase
      .from('reports')
      .select(
        'id, created_at, lat, lng, ward_number, category, description, landmark, severity, photo_url, status, upvotes'
      )
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) {
      console.warn('Failed to load reports:', error.message)
      return
    }
    setReports(data || [])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshReports()
  }, [refreshReports])

  // Single source of truth: derive ward counts from the reports array.
  // Anything "open" stays open; anything else is treated as closed.
  const wardCounts = useMemo(() => {
    const map = {}
    for (const r of reports) {
      const w = r.ward_number
      if (w == null) continue
      const slot = map[w] || (map[w] = { total_reports: 0, open_reports: 0 })
      slot.total_reports += 1
      if (r.status === 'open') slot.open_reports += 1
    }
    return map
  }, [reports])

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setOnboarded(true)
  }

  const handleWardSelect = useCallback((feature) => {
    setSelectedWard(feature)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedWard(null)
  }, [])

  const handleReportSelect = useCallback((reportId) => {
    setSelectedReportId(reportId)
  }, [])

  const handleCloseReportDetail = useCallback(() => {
    setSelectedReportId(null)
  }, [])

  const selectedReport = useMemo(
    () => reports.find((r) => r.id === selectedReportId) || null,
    [reports, selectedReportId]
  )
  const selectedReportWard = useMemo(() => {
    if (!selectedReport || !wardGeoJSON) return null
    return wardGeoJSON.features.find(
      (f) => f.properties.ward_number === selectedReport.ward_number
    )
  }, [selectedReport, wardGeoJSON])

  const handlePrimaryReport = () => {
    // If user already picked a ward by tapping, go straight to the form.
    if (selectedWard) {
      setView('report')
      return
    }
    if (!navigator.geolocation) {
      alert('GPS unavailable. Tap a ward on the map to report there.')
      return
    }
    setDetectingGPS(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingGPS(false)
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const ward = detectWard(lat, lng, wardGeoJSON)
        setUserLocation({ lat, lng })
        if (ward) {
          setSelectedWard(ward)
          setView('report')
        } else if (selectedWard) {
          setView('report')
        } else {
          alert(
            'You appear to be outside the 87 mapped wards. Tap a ward on the map to report there.'
          )
        }
      },
      () => {
        setDetectingGPS(false)
        if (selectedWard) {
          setView('report')
        } else {
          alert('Could not detect location. Tap a ward to report manually.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }

  const handleLocationUpdate = (loc, ward) => {
    setUserLocation(loc)
    if (ward) setSelectedWard(ward)
  }

  const handleSuccess = () => {
    refreshReports()
    setView('success')
  }

  const handleReportAnother = () => {
    setView('main')
    setSelectedWard(null)
    setUserLocation(null)
    setTab('map')
  }

  const handleBackToMap = () => {
    setView('main')
    setSelectedWard(null)
    setTab('map')
  }

  const handleCloseReportSheet = () => {
    setView('main')
  }

  const stats = useMemo(() => {
    let open = 0
    let total = 0
    let activeWards = 0
    for (const c of Object.values(wardCounts)) {
      open += c.open_reports ?? 0
      total += c.total_reports ?? 0
      if ((c.open_reports ?? 0) > 0) activeWards += 1
    }
    return { open, total, activeWards }
  }, [wardCounts])

  const currentWardCount = selectedWard
    ? wardCounts[selectedWard.properties.ward_number]
    : null

  if (showSplash) {
    return <Splash onDone={() => setShowSplash(false)} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <span className="brand">wardSetu</span>
          <span className="version">{APP_VERSION}</span>
        </div>
        <div className="view-toggle">
          <button
            className={tab === 'map' ? 'active' : ''}
            onClick={() => setTab('map')}
          >
            Map
          </button>
          <button
            className={tab === 'list' ? 'active' : ''}
            onClick={() => setTab('list')}
          >
            List
          </button>
        </div>
      </header>

      <div className="stats-bar">
        <span className="stat-active">{stats.activeWards} Active</span>
        <span className="stat-dot">·</span>
        <span className="stat-total">{stats.total} Reports</span>
      </div>

      <div className="app-body">
        <div
          className="map-wrap"
          style={{ display: tab === 'map' ? 'block' : 'none' }}
        >
          <Map
            ref={mapRef}
            wardGeoJSON={wardGeoJSON}
            wardCounts={wardCounts}
            reports={reports}
            selectedWard={view === 'main' ? selectedWard : null}
            onWardSelect={handleWardSelect}
            onReportSelect={handleReportSelect}
            userLocation={userLocation}
          />

          {view === 'main' && selectedWard && (
            <WardPanel
              ward={selectedWard}
              wardCount={currentWardCount}
              onClose={handleClosePanel}
            />
          )}
        </div>

        {tab === 'list' && (
          <ListView
            wardCounts={wardCounts}
            wardGeoJSON={wardGeoJSON}
            reports={reports}
            onReportSelect={handleReportSelect}
          />
        )}

        {view === 'report' && selectedWard && (
          <ReportForm
            ward={selectedWard}
            userLocation={userLocation}
            wardGeoJSON={wardGeoJSON}
            onLocationUpdate={handleLocationUpdate}
            onSuccess={handleSuccess}
            onClose={handleCloseReportSheet}
          />
        )}

        {view === 'success' && selectedWard && (
          <SuccessScreen
            ward={selectedWard}
            onReportAnother={handleReportAnother}
            onBackToMap={handleBackToMap}
          />
        )}

        {selectedReport && selectedReportWard && (
          <ReportDetail
            report={selectedReport}
            ward={selectedReportWard}
            onClose={handleCloseReportDetail}
          />
        )}

        {showOnboarding && <Onboarding onDismiss={dismissOnboarding} />}
      </div>

      {tab === 'map' && view === 'main' && (
        <div className="action-bar">
          <button
            className="action-primary"
            onClick={handlePrimaryReport}
            disabled={detectingGPS}
          >
            {detectingGPS
              ? 'Detecting location…'
              : selectedWard
              ? `+ Report Issue in Ward ${selectedWard.properties.ward_number}`
              : '+ Report Issue'}
          </button>
          <button
            className="action-chart"
            onClick={() => setTab('list')}
            aria-label="View list"
          >
            <span className="chart-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="20" x2="6" y2="11" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="18" y1="20" x2="18" y2="14" />
              </svg>
            </span>
            <span className="chart-count">{stats.total}</span>
          </button>
        </div>
      )}

      <footer className="app-footer">
        Covering 87 of 150 wards · Inner city coming soon
      </footer>
    </div>
  )
}
