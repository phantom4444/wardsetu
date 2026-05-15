import { useMemo, useState } from 'react'

const CATEGORY_LABELS = {
  garbage: 'Garbage',
  pothole: 'Pothole',
  street_light: 'Street Light',
  waterlogging: 'Waterlogging',
  stray_animals: 'Stray Animals',
  encroachment: 'Encroachment',
  other: 'Other',
}

function timeAgo(iso) {
  if (!iso) return 'recently'
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function capitalize(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function buildWorstWards(wardCounts, wardGeoJSON) {
  if (!wardGeoJSON) return []
  const propsByWard = {}
  for (const f of wardGeoJSON.features) {
    propsByWard[f.properties.ward_number] = f.properties
  }
  const rows = []
  for (const [wardNum, c] of Object.entries(wardCounts || {})) {
    const open = c.open_reports ?? 0
    if (open <= 0) continue
    const props = propsByWard[parseInt(wardNum, 10)] || propsByWard[wardNum]
    if (!props) continue
    rows.push({
      ward_number: props.ward_number,
      vidhansabha: props.vidhansabha,
      mla: props.mla,
      mla_party: props.mla_party,
      centroid_lat: props.centroid_lat,
      centroid_lng: props.centroid_lng,
      open_reports: open,
      total_reports: c.total_reports ?? 0,
    })
  }
  rows.sort((a, b) => b.open_reports - a.open_reports)
  return rows
}

export default function ListView({ wardCounts, wardGeoJSON, reports, onReportSelect }) {
  const [expandedWard, setExpandedWard] = useState(null)

  const reportsByWard = useMemo(() => {
    const m = {}
    for (const r of reports || []) {
      if (r.ward_number == null) continue
      if (!m[r.ward_number]) m[r.ward_number] = []
      m[r.ward_number].push(r)
    }
    for (const w in m) {
      m[w].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    return m
  }, [reports])

  const totals = Object.values(wardCounts || {}).reduce(
    (acc, c) => {
      acc.open += c.open_reports ?? 0
      acc.total += c.total_reports ?? 0
      return acc
    },
    { open: 0, total: 0 }
  )
  const resolved = Math.max(0, totals.total - totals.open)
  const fixRate = totals.total > 0 ? Math.round((resolved / totals.total) * 100) : 0
  const worst = buildWorstWards(wardCounts, wardGeoJSON)
  const maxOpen = worst[0]?.open_reports || 1

  return (
    <div className="list-view">
      <div className="stat-cards">
        <div className="stat-card stat-red">
          <div className="stat-number">{totals.open}</div>
          <div className="stat-label">Unresolved</div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-number">{resolved}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="stat-card stat-grey">
          <div className="stat-number">{fixRate}%</div>
          <div className="stat-label">Fix Rate</div>
        </div>
      </div>

      <div className="list-section-label">Worst Wards by Unresolved Reports</div>

      <div className="ward-list">
        {worst.length === 0 && (
          <div className="ward-list-empty">
            No reports yet. Be the first to report an issue.
          </div>
        )}
        {worst.map((w, i) => {
          const pct = Math.round((w.open_reports / maxOpen) * 100)
          const total = w.total_reports || w.open_reports
          const resolvedPct = total > 0
            ? Math.round(((total - w.open_reports) / total) * 100)
            : 0
          const topN = i < 3
          const isOpen = expandedWard === w.ward_number
          const wardReports = reportsByWard[w.ward_number] || []
          return (
            <div key={w.ward_number} className="ward-group">
              <button
                className={`ward-row ${topN ? 'ward-row-hot' : ''} ${isOpen ? 'is-open' : ''}`}
                onClick={() => setExpandedWard(isOpen ? null : w.ward_number)}
                aria-expanded={isOpen}
              >
                <span className={`ward-rank ${topN ? 'rank-hot' : ''}`}>{i + 1}</span>
                <span className="ward-row-main">
                  <span className="ward-row-title-line">
                    <span className="ward-row-title">Ward {w.ward_number}</span>
                    <span className="ward-row-zone">{w.vidhansabha} · #{w.ward_number}</span>
                  </span>
                  <span className="ward-progress">
                    <span
                      className={`ward-progress-bar ${topN ? '' : 'bar-muted'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="ward-row-meta">
                    {w.open_reports} report{w.open_reports === 1 ? '' : 's'} · {resolvedPct}% resolved
                  </span>
                </span>
                <span className={`ward-row-count ${topN ? '' : 'count-muted'}`}>
                  {w.open_reports}
                </span>
                <span className={`ward-row-chevron ${isOpen ? 'is-open' : ''}`} aria-hidden>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>

              {isOpen && (
                <div className="ward-reports">
                  {wardReports.length === 0 ? (
                    <div className="ward-reports-empty">No reports to show.</div>
                  ) : (
                    wardReports.map((r) => {
                      const sev = (r.severity || 'moderate').toLowerCase()
                      const title =
                        r.landmark?.trim() ||
                        CATEGORY_LABELS[r.category] ||
                        'Issue'
                      return (
                        <button
                          key={r.id}
                          className="ward-report-row"
                          onClick={() => onReportSelect?.(r.id)}
                        >
                          <span className="ward-report-badge">1</span>
                          <span className="ward-report-main">
                            <span className="ward-report-title">{title}</span>
                            <span className="ward-report-time">
                              {timeAgo(r.created_at)}
                            </span>
                          </span>
                          <span className={`ward-report-sev sev-${sev}`}>
                            {capitalize(sev)}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
