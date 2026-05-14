function partyClass(party) {
  if (!party) return 'other'
  const p = party.toUpperCase()
  if (p.includes('BJP')) return 'bjp'
  if (p.includes('INC') || p.includes('CONGRESS')) return 'inc'
  return 'other'
}

export default function SuccessScreen({ ward, onReportAnother, onBackToMap }) {
  const p = ward?.properties || {}
  return (
    <div className="success-screen">
      <div className="success-body">
        <div className="success-check">
          <svg viewBox="0 0 24 24">
            <polyline
              points="4,12 10,18 20,6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1>Report Submitted!</h1>
        <p className="success-subtitle">Thank you for making Jaipur better</p>

        <div className="success-card">
          <span className="ward-tag">Ward {p.ward_number}</span>
          <div className="vidhansabha">{p.vidhansabha || '—'}</div>
          <div className="rep-row">
            <span className="label">Your MLA</span>
            <span className="value">
              <span className={`party-dot ${partyClass(p.mla_party)}`} />
              {p.mla || '—'}
            </span>
          </div>
          <div className="rep-row">
            <span className="label">Your MP</span>
            <span className="value">
              <span className={`party-dot ${partyClass(p.mp_party)}`} />
              {p.mp || '—'}
            </span>
          </div>
        </div>

        <p className="success-note">
          This report has been logged under Ward {p.ward_number}. Your elected
          representatives are accountable.
        </p>

        <div className="success-actions">
          <button className="btn-primary" onClick={onReportAnother}>
            Report Another Issue
          </button>
          <button className="btn-secondary" onClick={onBackToMap}>
            Back to Map
          </button>
        </div>
      </div>
    </div>
  )
}
