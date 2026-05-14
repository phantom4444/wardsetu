import { useEffect, useState } from 'react'

export default function Splash({ onDone }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1200)
    const doneTimer = setTimeout(() => onDone(), 1500)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div className={`splash ${fading ? 'splash-fade' : ''}`}>
      <div className="splash-content">
        <h1 className="splash-title">wardSetu</h1>
        <div className="splash-title-hi">वार्डसेतु</div>
        <div className="splash-loading">Loading...</div>
      </div>
    </div>
  )
}
