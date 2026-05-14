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

export default function ListView({ wardCounts, wardGeoJSON, onWardTap }) {
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
          return (
            <button
              key={w.ward_number}
              className="ward-row"
              onClick={() => onWardTap(w)}
            >
              <span className="ward-rank">{i + 1}</span>
              <span className="ward-row-main">
                <span className="ward-row-title">Ward {w.ward_number}</span>
                <span className="ward-row-sub">
                  {w.vidhansabha} · #{w.ward_number}
                </span>
                <span className="ward-progress">
                  <span
                    className="ward-progress-bar"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="ward-row-mla">
                  MLA: {w.mla || '—'}
                  {w.mla_party ? ` (${w.mla_party})` : ''}
                </span>
              </span>
              <span className="ward-row-count">{w.open_reports}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
