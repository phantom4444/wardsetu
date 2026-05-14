export default function Onboarding({ onDismiss }) {
  return (
    <div className="onboarding-overlay" onClick={onDismiss}>
      <div className="onboarding-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="onboarding-headline">Jaipur has a civic problem.</h2>
        <p className="onboarding-subtext">
          Report it. Photograph it. Track who is responsible.
        </p>
        <p className="onboarding-detail">
          Every issue is mapped to the responsible ward, MLA, and MP. When
          enough citizens report, it becomes impossible to ignore.
        </p>
        <div className="onboarding-stats">
          87 wards · 5 MLAs · 2 MPs · Jaipur
        </div>
        <button className="onboarding-cta" onClick={onDismiss}>
          Tap anywhere to continue
        </button>
      </div>
    </div>
  )
}
