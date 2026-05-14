const CATEGORY_LABELS = {
  garbage: 'Garbage',
  pothole: 'Pothole',
  street_light: 'Street Light',
  waterlogging: 'Waterlogging',
  stray_animals: 'Stray Animals',
  encroachment: 'Encroachment',
  other: 'Other',
}

function partyClass(party) {
  if (!party) return 'other'
  const p = party.toUpperCase()
  if (p.includes('BJP')) return 'bjp'
  if (p.includes('INC') || p.includes('CONGRESS')) return 'inc'
  return 'other'
}

function initials(name) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('')
}

function daysSince(iso) {
  if (!iso) return 0
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function timeAgo(iso) {
  if (!iso) return 'recently'
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

const CHAIN = [
  {
    code: 'COMM',
    name: 'Commissioner',
    role: 'JMC head · Top of chain',
  },
  {
    code: 'AC',
    name: 'Additional Commissioner',
    role: 'Zone-level oversight',
  },
  {
    code: 'XEN',
    name: 'Executive Engineer',
    role: 'Engineering oversight (XEN)',
  },
  {
    code: 'SI',
    name: 'Sanitary Inspector',
    role: 'Frontline ward officer (SI)',
  },
]

export default function ReportDetail({ report, ward, onClose }) {
  const p = ward?.properties || {}
  const sev = report.severity || 'Moderate'
  const sevClass = sev.toLowerCase()
  const status = (report.status || 'open').toLowerCase()
  const statusLabel = status === 'open' ? 'Unresolved' : 'Resolved'
  const categoryLabel = CATEGORY_LABELS[report.category] || 'Issue'
  const days = daysSince(report.created_at)
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${report.lat},${report.lng}`

  return (
    <>
      <div className="detail-backdrop" onClick={onClose} />
      <div className="detail-sheet" role="dialog">
        <div className="detail-header">
          <div className="drag-handle" />
          <div className="detail-header-row">
            <div className="detail-pills">
              <span className={`sev-badge sev-${sevClass}`}>
                <span className="sev-dot" />
                {sev.toUpperCase()}
              </span>
              <span className={`status-pill status-${status}`}>
                {statusLabel}
              </span>
            </div>
            <button className="close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <h2 className="detail-title">{p.vidhansabha || `Ward ${p.ward_number}`}</h2>
          {report.landmark && (
            <div className="detail-landmark">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              {report.landmark}
            </div>
          )}
          <a
            className="detail-directions"
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Get directions
          </a>
        </div>

        <div className="detail-body">
          {report.photo_url && (
            <div className="detail-photo">
              <img src={report.photo_url} alt="Reported issue" />
            </div>
          )}

          <div className="detail-stats">
            <div className="detail-stat">
              <div className="detail-stat-num">1</div>
              <div className="detail-stat-lbl">Report</div>
            </div>
            <div className="detail-stat">
              <div className="detail-stat-num">{days}</div>
              <div className="detail-stat-lbl">
                {days === 1 ? 'Day' : 'Days'}
              </div>
            </div>
            <div className="detail-stat detail-stat-wide">
              <div className="detail-stat-num cat-label">{categoryLabel}</div>
              <div className="detail-stat-lbl">Category</div>
            </div>
          </div>

          {report.description && (
            <div className="detail-desc">{report.description}</div>
          )}

          <div className="section-label">Accountability</div>

          <div className="accountability">
            <div className="acc-root">
              <div className="acc-root-lbl">Your Ward</div>
              <div className="acc-root-name">
                {p.vidhansabha || '—'} · #{p.ward_number}
              </div>
            </div>

            <div className="acc-branches">
              <div className="acc-branch-node">
                <div className="acc-branch-icon acc-icon-jmc">JMC</div>
                <div className="acc-branch-name">JMC</div>
                <div className="acc-branch-sub">Municipal corporation</div>
              </div>
              <div className="acc-branch-node acc-branch-muted">
                <div className="acc-branch-icon acc-icon-vacant">⚠</div>
                <div className="acc-branch-name">Corporator</div>
                <div className="acc-branch-sub">Vacant since 2024</div>
              </div>
            </div>

            <div className="acc-chain">
              {CHAIN.map((node) => (
                <div key={node.code} className="acc-chain-node">
                  <div className="acc-chain-icon">{node.code}</div>
                  <div className="acc-chain-text">
                    <div className="acc-chain-name">{node.name}</div>
                    <div className="acc-chain-role">{node.role}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="acc-divider">Elected representatives for this ward</div>

            <div className="reps-row">
              <div className="rep-card">
                <div className={`rep-avatar ${partyClass(p.mla_party)}`}>
                  {initials(p.mla)}
                </div>
                <div className="rep-name">{p.mla || '—'}</div>
                <div className="rep-meta">
                  <span className={`party-tag ${partyClass(p.mla_party)}`}>
                    {p.mla_party || 'IND'}
                  </span>
                  <span className="rep-role">· MLA</span>
                </div>
              </div>
              <div className="rep-card">
                <div className={`rep-avatar ${partyClass(p.mp_party)}`}>
                  {initials(p.mp)}
                </div>
                <div className="rep-name">{p.mp || '—'}</div>
                <div className="rep-meta">
                  <span className={`party-tag ${partyClass(p.mp_party)}`}>
                    {p.mp_party || 'IND'}
                  </span>
                  <span className="rep-role">· MP</span>
                </div>
              </div>
            </div>

            <div className="acc-footnote">
              Tap any card for contact options · Municipal elections expected 2025
            </div>
          </div>

          <div className="detail-meta">
            Reported <strong>{timeAgo(report.created_at)}</strong> · 1 citizen reported
          </div>
        </div>

        <div className="detail-footer">
          <button className="btn-secondary detail-complaint">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            File a complaint
          </button>
          <div className="anon-note">All reports are anonymous</div>
        </div>
      </div>
    </>
  )
}
