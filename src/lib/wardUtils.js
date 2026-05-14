import { booleanPointInPolygon, point } from '@turf/turf'

export function detectWard(lat, lng, wardGeoJSON) {
  if (!wardGeoJSON || !wardGeoJSON.features) return null
  const pt = point([lng, lat])
  for (const feature of wardGeoJSON.features) {
    try {
      if (booleanPointInPolygon(pt, feature)) {
        return feature
      }
    } catch {
      continue
    }
  }
  return null
}
