import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/helpers'

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
