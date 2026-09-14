import React, { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { motion } from 'framer-motion'
import { useOceanStore } from '../../store/useOceanStore'
import { getThermalRgba } from '../../utils/colormap'

// Free dark basemap — no API key required
const BASEMAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-dark': {
      type: 'raster',
      tiles: [
        'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap'
    }
  },
  layers: [
    {
      id: 'osm-dark-layer',
      type: 'raster',
      source: 'osm-dark',
      minzoom: 0,
      maxzoom: 22
    }
  ]
}

const DATA_SOURCE_ID = 'antarbodh-thermal-source'
const DATA_LAYER_ID = 'antarbodh-thermal-layer'

export const OceanMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const argoMarkersRef = useRef<maplibregl.Marker[]>([])

  const { 
    temperatureSlice, 
    selectedLocation, 
    setSelectedLocation, 
    setCursorLocation,
    argoProfiles
  } = useOceanStore()

  const [mapLoaded, setMapLoaded] = useState(false)
  const [pulsePos, setPulsePos] = useState<{ x: number; y: number } | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [thermalFading, setThermalFading] = useState(false)

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Off-screen canvas for 60x80 thermal grid rendering
    const canvas = document.createElement('canvas')
    canvas.width = 80
    canvas.height = 60
    canvasRef.current = canvas

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [90.0, 12.5], // Center of Bay of Bengal [lon, lat]
      zoom: 4.8,
      minZoom: 3.5,
      maxZoom: 10,
      pitchWithRotate: false,
      dragRotate: false,
      attributionControl: false
    })

    map.on('load', () => {
      // Coordinates of Bay of Bengal [80.0°E, 5.0°N] to [100.0°E, 20.0°N]
      // Corner order: Top-Left (NW), Top-Right (NE), Bottom-Right (SE), Bottom-Left (SW)
      map.addSource(DATA_SOURCE_ID, {
        type: 'canvas',
        canvas: canvas,
        animate: true,
        coordinates: [
          [80.0, 20.0],  // NW
          [100.0, 20.0], // NE
          [100.0, 5.0],  // SE
          [80.0, 5.0]    // SW
        ]
      })

      map.addLayer({
        id: DATA_LAYER_ID,
        type: 'raster',
        source: DATA_SOURCE_ID,
        paint: {
          'raster-opacity': 0.85,
          'raster-resampling': 'nearest',
          'raster-fade-duration': 0
        }
      })

      setMapLoaded(true)
    })

    // Track mouse coordinates over map for Reticle Cursor & Coordinate Chip
    map.on('mousemove', (e: maplibregl.MapMouseEvent) => {
      const { lat, lng } = e.lngLat
      setCursorLocation({ lat, lon: lng })

      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        setMousePos({
          x: e.point.x,
          y: e.point.y
        })
      }
    })

    map.on('mouseout', () => {
      setMousePos(null)
    })

    // Handle map click on ocean domain
    map.on('click', (e: maplibregl.MapMouseEvent) => {
      const lat = Number(e.lngLat.lat.toFixed(4))
      const lon = Number(e.lngLat.lng.toFixed(4))

      // Check within Bay of Bengal domain
      if (lat >= 5.0 && lat <= 20.0 && lon >= 80.0 && lon <= 100.0) {
        // Trigger reticle click pulse (Section 4.2: scale 1 -> 1.4 -> 1)
        setPulsePos({ x: e.point.x, y: e.point.y })
        setTimeout(() => setPulsePos(null), 300)

        setSelectedLocation({ lat, lon })
      }
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [setCursorLocation, setSelectedLocation])

  // Update canvas thermal overlay whenever temperatureSlice changes
  useEffect(() => {
    if (!mapLoaded || !canvasRef.current || !temperatureSlice) return

    // Thermal crossfade pulse
    setThermalFading(true)
    const fadeTimer = setTimeout(() => setThermalFading(false), 400)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const grid = temperatureSlice.temperature_grid
    if (!grid || grid.length === 0) return

    const numLat = grid.length // 60
    const numLon = grid[0].length // 80
    const minTemp = temperatureSlice.min_temp ?? 5.0
    const maxTemp = temperatureSlice.max_temp ?? 30.0

    const imgData = ctx.createImageData(numLon, numLat)
    const data = imgData.data

    // GLORYS / Model grid is stored with latitude descending (North to South) or ascending
    for (let r = 0; r < numLat; r++) {
      // Invert row index if necessary (latitude 20N at top, 5N at bottom)
      const rowIdx = numLat - 1 - r
      const row = grid[rowIdx]

      for (let c = 0; c < numLon; c++) {
        const temp = row ? row[c] : null
        const [red, green, blue, alpha] = getThermalRgba(temp, minTemp, maxTemp)

        const pixelIdx = (r * numLon + c) * 4
        data[pixelIdx] = red
        data[pixelIdx + 1] = green
        data[pixelIdx + 2] = blue
        data[pixelIdx + 3] = alpha
      }
    }

    ctx.putImageData(imgData, 0, 0)

    // Trigger source update
    const src = mapRef.current?.getSource(DATA_SOURCE_ID) as any
    if (src && src.play) {
      src.play()
    }

    return () => clearTimeout(fadeTimer)
  }, [mapLoaded, temperatureSlice])

  // Update Selected Location Marker
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }

    if (selectedLocation) {
      const el = document.createElement('div')
      el.className = 'w-5 h-5 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none'
      el.innerHTML = `
        <div class="relative w-4 h-4 flex items-center justify-center">
          <div class="absolute inset-0 border border-[#E8642F] rotate-45"></div>
          <div class="w-1.5 h-1.5 bg-[#E8642F] rounded-full"></div>
        </div>
      `
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([selectedLocation.lon, selectedLocation.lat])
        .addTo(mapRef.current)
    }
  }, [selectedLocation, mapLoaded])

  // Render ARGO Float Positions as small orange points
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return

    // Clear old markers
    argoMarkersRef.current.forEach(m => m.remove())
    argoMarkersRef.current = []

    if (argoProfiles && argoProfiles.length > 0) {
      argoProfiles.forEach((prof) => {
        const el = document.createElement('div')
        el.className = 'w-2 h-2 rounded-full bg-[#E8642F] opacity-75 hover:opacity-100 hover:scale-150 transition-all cursor-pointer'
        el.title = `ARGO Float #${prof.platform_number} (${prof.time.slice(0, 10)})`
        el.onclick = (e) => {
          e.stopPropagation()
          setSelectedLocation({ lat: prof.latitude, lon: prof.longitude })
        }

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([prof.longitude, prof.latitude])
          .addTo(mapRef.current!)

        argoMarkersRef.current.push(marker)
      })
    }
  }, [argoProfiles, mapLoaded, setSelectedLocation])

  return (
    <motion.div 
      initial={{ filter: 'grayscale(100%)', scale: 1.08 }}
      animate={{ filter: 'grayscale(0%)', scale: 1.0 }}
      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full h-[calc(100vh-56px)] bg-[#060B12] overflow-hidden cursor-crosshair select-none"
    >
      {/* MapLibre WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Reticle Cursor Following Pointer (Section 3.2: 20px crosshair + corner brackets) */}
      {/* Thermal crossfade overlay */}
      {thermalFading && (
        <div 
          className="absolute inset-0 bg-[#060B12] pointer-events-none z-10"
          style={{ animation: 'thermal-fade 0.4s ease forwards', opacity: 0 }}
        />
      )}

      {mousePos && (
        <div 
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
          style={{ left: mousePos.x, top: mousePos.y }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {/* Center Crosshair */}
            <line x1="10" y1="3" x2="10" y2="7" stroke="#E8642F" strokeWidth="1" />
            <line x1="10" y1="13" x2="10" y2="17" stroke="#E8642F" strokeWidth="1" />
            <line x1="3" y1="10" x2="7" y2="10" stroke="#E8642F" strokeWidth="1" />
            <line x1="13" y1="10" x2="17" y2="10" stroke="#E8642F" strokeWidth="1" />
            {/* Corner Brackets */}
            <path d="M 2 5 L 2 2 L 5 2" stroke="#E8642F" strokeWidth="1" />
            <path d="M 18 5 L 18 2 L 15 2" stroke="#E8642F" strokeWidth="1" />
            <path d="M 2 15 L 2 18 L 5 18" stroke="#E8642F" strokeWidth="1" />
            <path d="M 18 15 L 18 18 L 15 18" stroke="#E8642F" strokeWidth="1" />
          </svg>
        </div>
      )}

      {/* Pulse effect on Click (Section 4.2: scale 1 -> 1.4 -> 1) */}
      {pulsePos && (
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="pointer-events-none absolute w-8 h-8 rounded-full border border-[#E8642F] -translate-x-1/2 -translate-y-1/2 z-30"
          style={{ left: pulsePos.x, top: pulsePos.y }}
        />
      )}
    </motion.div>
  )
}
