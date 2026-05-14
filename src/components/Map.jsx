import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const JAIPUR_CENTER = [75.7873, 26.9124]
const DEFAULT_ZOOM = 11

const Map = forwardRef(function Map(
  {
    wardGeoJSON,
    wardCounts,
    reports,
    selectedWard,
    onWardSelect,
    onReportSelect,
    userLocation,
  },
  ref
) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const userMarkerRef = useRef(null)
  const hoveredWardRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)

  useImperativeHandle(ref, () => ({
    flyTo: (lng, lat, zoom = 15) => {
      if (!mapRef.current) return
      mapRef.current.flyTo({ center: [lng, lat], zoom, duration: 900 })
    },
  }))

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: JAIPUR_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    })

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    )

    map.on('load', () => setMapReady(true))
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Ward fills, borders, and labels
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !wardGeoJSON) return
    if (map.getSource('wards')) return

    // Inject feature `id` so we can use feature-state for hover
    const wardsWithIds = {
      ...wardGeoJSON,
      features: wardGeoJSON.features.map((f, i) => ({ ...f, id: i })),
    }
    map.addSource('wards', { type: 'geojson', data: wardsWithIds })

    // Centroid source for ward number labels
    const centroids = {
      type: 'FeatureCollection',
      features: wardGeoJSON.features
        .filter(
          (f) => f.properties.centroid_lat && f.properties.centroid_lng
        )
        .map((f) => ({
          type: 'Feature',
          properties: { ward_number: f.properties.ward_number },
          geometry: {
            type: 'Point',
            coordinates: [
              parseFloat(f.properties.centroid_lng),
              parseFloat(f.properties.centroid_lat),
            ],
          },
        })),
    }
    map.addSource('ward-centroids', { type: 'geojson', data: centroids })

    // Base fill — all 87 wards, light red
    map.addLayer({
      id: 'ward-fills',
      type: 'fill',
      source: 'wards',
      paint: {
        'fill-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#FFB3B3',
          ['boolean', ['feature-state', 'hot'], false],
          '#FFCCCC',
          '#FFF0F0',
        ],
        'fill-opacity': 0.85,
      },
    })

    map.addLayer({
      id: 'ward-borders',
      type: 'line',
      source: 'wards',
      paint: {
        'line-color': '#C0392B',
        'line-width': 1.5,
      },
    })

    map.addLayer({
      id: 'ward-selected',
      type: 'line',
      source: 'wards',
      paint: {
        'line-color': '#8B1A1A',
        'line-width': 3,
      },
      filter: ['==', 'ward_number', '___none___'],
    })

    map.addLayer({
      id: 'ward-labels',
      type: 'symbol',
      source: 'ward-centroids',
      minzoom: 12,
      layout: {
        'text-field': ['to-string', ['get', 'ward_number']],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
      },
      paint: {
        'text-color': '#666666',
      },
    })

    const handleClick = (e) => {
      const feature = e.features?.[0]
      if (feature) onWardSelect(feature)
    }
    map.on('click', 'ward-fills', handleClick)

    const handleMouseMove = (e) => {
      if (!e.features?.length) return
      const id = e.features[0].id
      if (hoveredWardRef.current !== null && hoveredWardRef.current !== id) {
        map.setFeatureState(
          { source: 'wards', id: hoveredWardRef.current },
          { hover: false }
        )
      }
      hoveredWardRef.current = id
      map.setFeatureState({ source: 'wards', id }, { hover: true })
      map.getCanvas().style.cursor = 'pointer'
    }
    const handleMouseLeave = () => {
      if (hoveredWardRef.current !== null) {
        map.setFeatureState(
          { source: 'wards', id: hoveredWardRef.current },
          { hover: false }
        )
        hoveredWardRef.current = null
      }
      map.getCanvas().style.cursor = ''
    }
    map.on('mousemove', 'ward-fills', handleMouseMove)
    map.on('mouseleave', 'ward-fills', handleMouseLeave)

    return () => {
      map.off('click', 'ward-fills', handleClick)
      map.off('mousemove', 'ward-fills', handleMouseMove)
      map.off('mouseleave', 'ward-fills', handleMouseLeave)
    }
  }, [mapReady, wardGeoJSON, onWardSelect])

  // Update "hot" feature-state when wardCounts changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !wardGeoJSON || !map.getSource('wards')) return

    wardGeoJSON.features.forEach((f, i) => {
      const count = wardCounts?.[f.properties.ward_number]
      const isHot = (count?.open_reports ?? 0) > 0
      map.setFeatureState({ source: 'wards', id: i }, { hot: isHot })
    })
  }, [mapReady, wardGeoJSON, wardCounts])

  // Report markers as clusters
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const fc = {
      type: 'FeatureCollection',
      features: (reports || [])
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => ({
          type: 'Feature',
          properties: { id: r.id, status: r.status },
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(r.lng), parseFloat(r.lat)],
          },
        })),
    }

    if (!map.getSource('reports')) {
      map.addSource('reports', {
        type: 'geojson',
        data: fc,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 45,
      })

      map.addLayer({
        id: 'report-clusters',
        type: 'circle',
        source: 'reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#8B1A1A',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            18,
            5,
            22,
            20,
            28,
          ],
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2,
          'circle-opacity': 0,
        },
      })

      map.addLayer({
        id: 'report-cluster-count',
        type: 'symbol',
        source: 'reports',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Noto Sans Bold'],
          'text-size': 13,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-opacity': 0,
        },
      })

      map.addLayer({
        id: 'report-points',
        type: 'circle',
        source: 'reports',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#8B1A1A',
          'circle-radius': 7,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2,
          'circle-opacity': 0,
        },
      })

      // Fade-in animation
      requestAnimationFrame(() => {
        map.setPaintProperty('report-clusters', 'circle-opacity', 0.9)
        map.setPaintProperty('report-cluster-count', 'text-opacity', 1)
        map.setPaintProperty('report-points', 'circle-opacity', 0.9)
      })

      map.on('click', 'report-clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['report-clusters'],
        })
        const clusterId = features[0].properties.cluster_id
        map
          .getSource('reports')
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            map.flyTo({
              center: features[0].geometry.coordinates,
              zoom,
              duration: 700,
            })
          })
      })

      map.on('click', 'report-points', (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const id = feature.properties.id
        if (id != null && onReportSelect) onReportSelect(id)
      })

      const setPointer = () => (map.getCanvas().style.cursor = 'pointer')
      const unsetPointer = () => (map.getCanvas().style.cursor = '')
      map.on('mouseenter', 'report-clusters', setPointer)
      map.on('mouseleave', 'report-clusters', unsetPointer)
      map.on('mouseenter', 'report-points', setPointer)
      map.on('mouseleave', 'report-points', unsetPointer)
    } else {
      map.getSource('reports').setData(fc)
    }
  }, [mapReady, reports, onReportSelect])

  // Selected ward outline
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !map.getLayer('ward-selected')) return
    if (selectedWard) {
      map.setFilter('ward-selected', [
        '==',
        'ward_number',
        selectedWard.properties.ward_number,
      ])
    } else {
      map.setFilter('ward-selected', ['==', 'ward_number', '___none___'])
    }
  }, [mapReady, selectedWard])

  // User location marker
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }

    if (userLocation) {
      const el = document.createElement('div')
      el.className = 'user-location-dot'
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map)
      userMarkerRef.current = marker

      map.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: Math.max(map.getZoom(), 14),
        duration: 800,
      })
    }
  }, [mapReady, userLocation])

  return (
    <div className="map-container">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {!mapReady && <div className="map-loading">Loading map…</div>}
      <div className="map-legend">
        <div className="legend-row">
          <span className="legend-dot legend-dot-active" />
          Active wards (87)
        </div>
        <div className="legend-row legend-muted">
          <span className="legend-dot legend-dot-soon" />
          Inner city coming soon
        </div>
      </div>
    </div>
  )
})

export default Map
