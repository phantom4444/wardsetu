function partyClass(party) {
  if (!party) return 'other'
  const p = party.toUpperCase()
  if (p.includes('BJP')) return 'bjp'
  if (p.includes('INC') || p.includes('CONGRESS')) return 'inc'
  return 'other'
}

export default function WardPanel({ ward, wardCount, onClose }) {
  if (!ward) return null
  const p = ward.properties
  const openReports = wardCount?.open_reports ?? 0
  const totalReports = wardCount?.total_reports ?? 0

  return (
    <>
      <div className="ward-panel-backdrop" onClick={onClose} />
      <div className="ward-panel" role="dialog">
        <div className="drag-handle" />
        <div className="ward-panel-header">
          <div>
            <h2>Ward {p.ward_number}</h2>
            <div className="ward-panel-sub">{p.vidhansabha || ''}</div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ward-stats-row">
          <div className="ward-stat">
            <div className="ward-stat-num red">{openReports}</div>
            <div className="ward-stat-lbl">Open</div>
          </div>
          <div className="ward-stat">
            <div className="ward-stat-num">{totalReports}</div>
            <div className="ward-stat-lbl">Total</div>
          </div>
        </div>

        <div className="ward-info">
          <div className="ward-info-row">
            <span className="ward-info-label">MLA</span>
            <span className="ward-info-value">
              <span className={`party-dot ${partyClass(p.mla_party)}`} />
              {p.mla || '—'}{p.mla_party ? ` (${p.mla_party})` : ''}
            </span>
          </div>
          <div className="ward-info-row">
            <span className="ward-info-label">Lok Sabha</span>
            <span className="ward-info-value">{p.lok_sabha || '—'}</span>
          </div>
          <div className="ward-info-row">
            <span className="ward-info-label">MP</span>
            <span className="ward-info-value">
              <span className={`party-dot ${partyClass(p.mp_party)}`} />
              {p.mp || '—'}{p.mp_party ? ` (${p.mp_party})` : ''}
            </span>
          </div>
        </div>

      </div>
    </>
  )
}
