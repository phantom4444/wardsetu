import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { detectWard } from '../lib/wardUtils'

const CATEGORIES = [
  { id: 'garbage', emoji: '🗑️', label: 'Garbage / Solid Waste' },
  { id: 'pothole', emoji: '🕳️', label: 'Pothole / Road Damage' },
  { id: 'street_light', emoji: '💡', label: 'Street Light Out' },
  { id: 'waterlogging', emoji: '💧', label: 'Waterlogging' },
  { id: 'stray_animals', emoji: '🐄', label: 'Stray Animals' },
  { id: 'encroachment', emoji: '🚧', label: 'Encroachment' },
  { id: 'other', emoji: '📋', label: 'Other' },
]

const SEVERITIES = ['Minor', 'Moderate', 'Severe']

export default function ReportForm({
  ward,
  userLocation,
  wardGeoJSON,
  onLocationUpdate,
  onSuccess,
  onClose,
}) {
  const fileInputRef = useRef(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [landmark, setLandmark] = useState('')
  const [category, setCategory] = useState(null)
  const [severity, setSeverity] = useState('Moderate')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [retrying, setRetrying] = useState(false)

  const wardNumber = ward?.properties?.ward_number

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const retryGPS = () => {
    if (!navigator.geolocation) return
    setRetrying(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRetrying(false)
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const newWard = wardGeoJSON ? detectWard(lat, lng, wardGeoJSON) : null
        onLocationUpdate({ lat, lng }, newWard)
      },
      () => {
        setRetrying(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const canSubmit = photoFile && category && severity && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      let photoUrl = null
      const ext = photoFile.name.split('.').pop() || 'jpg'
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('report-photos')
        .upload(filename, photoFile, { cacheControl: '3600', upsert: false })
      if (uploadErr) {
        console.warn('Photo upload failed:', uploadErr.message)
      } else {
        const { data } = supabase.storage
          .from('report-photos')
          .getPublicUrl(filename)
        photoUrl = data?.publicUrl ?? null
      }

      const lat = userLocation?.lat ?? ward.properties.centroid_lat
      const lng = userLocation?.lng ?? ward.properties.centroid_lng

      const { error: insertErr } = await supabase.from('reports').insert({
        lat,
        lng,
        ward_number: wardNumber,
        category,
        landmark: landmark.trim() || null,
        severity,
        photo_url: photoUrl,
        status: 'open',
        upvotes: 0,
      })
      if (insertErr) throw insertErr

      const { data: wardRow } = await supabase
        .from('wards')
        .select('total_reports, open_reports')
        .eq('ward_number', wardNumber)
        .maybeSingle()

      if (wardRow) {
        await supabase
          .from('wards')
          .update({
            total_reports: (wardRow.total_reports ?? 0) + 1,
            open_reports: (wardRow.open_reports ?? 0) + 1,
          })
          .eq('ward_number', wardNumber)
      } else {
        await supabase.from('wards').insert({
          ward_number: wardNumber,
          vidhansabha: ward.properties.vidhansabha,
          mla: ward.properties.mla,
          mla_party: ward.properties.mla_party,
          lok_sabha: ward.properties.lok_sabha,
          mp: ward.properties.mp,
          mp_party: ward.properties.mp_party,
          total_reports: 1,
          open_reports: 1,
        })
      }

      onSuccess()
    } catch (e) {
      console.error(e)
      setError(e.message || 'Submit failed. Try again.')
      setSubmitting(false)
    }
  }

  const hasGPS = !!userLocation

  return (
    <>
      <div className="report-sheet-backdrop" onClick={onClose} />
      <div className="report-sheet" role="dialog">
        <div className="report-sheet-header">
          <h2>Report Issue</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="report-sheet-body">
          {/* PHOTO — required */}
          <div className="form-section">
            <div className="form-label-row">
              <span className="form-label">Photo</span>
              <span className="form-required">Required</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
            {!photoPreview ? (
              <button
                type="button"
                className="photo-tap"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="photo-tap-icon">📷</span>
                <span className="photo-tap-text">Tap to add photo</span>
                <span className="photo-tap-sub">Photo evidence is required</span>
              </button>
            ) : (
              <button
                type="button"
                className="photo-preview-wrap"
                onClick={() => fileInputRef.current?.click()}
              >
                <img src={photoPreview} alt="Preview" />
                <span className="photo-replace">Tap to change</span>
              </button>
            )}
          </div>

          {/* Location status */}
          <div className="form-section">
            <span className="form-label">Location</span>
            <div className={`gps-card ${hasGPS ? 'gps-ok' : 'gps-warn'}`}>
              <div className="gps-icon">{hasGPS ? '📍' : '⚠️'}</div>
              <div className="gps-text">
                {hasGPS ? (
                  <>
                    <div className="gps-title">GPS locked</div>
                    <div className="gps-sub">
                      Ward {wardNumber} · {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="gps-title">GPS unavailable</div>
                    <div className="gps-sub">Using Ward {wardNumber} centre</div>
                  </>
                )}
              </div>
              {!hasGPS && (
                <button
                  type="button"
                  className="gps-retry"
                  onClick={retryGPS}
                  disabled={retrying}
                >
                  {retrying ? '…' : 'Try Again'}
                </button>
              )}
            </div>
          </div>

          {/* Landmark */}
          <div className="form-section">
            <span className="form-label">Landmark / Address</span>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Near Sindhi Camp, opposite SBI"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Category */}
          <div className="form-section">
            <span className="form-label">Category</span>
            <div className="radio-list">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`radio-row ${category === c.id ? 'selected' : ''}`}
                  onClick={() => setCategory(c.id)}
                >
                  <span className="radio-emoji">{c.emoji}</span>
                  <span className="radio-label">{c.label}</span>
                  <span className="radio-check">
                    {category === c.id ? '●' : '○'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div className="form-section">
            <span className="form-label">Severity</span>
            <div className="severity-row">
              {SEVERITIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`severity-btn ${severity === s ? 'selected' : ''}`}
                  onClick={() => setSeverity(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="report-sheet-footer">
          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
          <div className="anon-note">All reports are anonymous</div>
        </div>
      </div>
    </>
  )
}
