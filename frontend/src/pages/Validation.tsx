import React, { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts'
import { useOceanStore } from '../store/useOceanStore'
import { PageShell } from '../components/layout/PageShell'
import { PageReveal } from '../components/motion/PageReveal'
import { AmbientOceanCanvas } from '../components/motion/AmbientOceanCanvas'

// Animated counting component — counts from 0 to target value (C.4, tabular-nums, no layout shift)
function AnimatedValue({ 
  value, 
  decimals = 2, 
  suffix = '', 
  prefix = '' 
}: { 
  value: number; 
  decimals?: number; 
  suffix?: string; 
  prefix?: string 
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = React.useState(`${prefix}${value.toFixed(decimals)}${suffix}`)
  const hasAnimated = React.useRef(false)

  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setDisplay(`${prefix}${value.toFixed(decimals)}${suffix}`)
      return
    }

    if (!ref.current) return
    const el = ref.current
    setDisplay(`${prefix}${(0).toFixed(decimals)}${suffix}`)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const duration = 900
          const start = performance.now()
          
          function tick(now: number) {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            const current = eased * value
            setDisplay(`${prefix}${current.toFixed(decimals)}${suffix}`)
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value, decimals, suffix, prefix])

  return (
    <span ref={ref} className="font-mono tabular-nums inline-block min-w-[3ch]">
      {display}
    </span>
  )
}

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

export const Validation: React.FC = () => {
  const { 
    validationDepth, 
    argoProfiles, 
    fetchValidationData
  } = useOceanStore()

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [selectedFloat, setSelectedFloat] = useState<number | null>(null)
  const [parallaxY, setParallaxY] = useState(0)

  useEffect(() => {
    fetchValidationData()
  }, [fetchValidationData])

  // C.3 Scroll-linked subtle Parallax (<40px total travel)
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop
      setParallaxY(Math.min(scrollY * 0.3, 40))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Initialize ARGO Track Mini-Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: BASEMAP_STYLE,
      center: [89.5, 12.5],
      zoom: 3.8,
      minZoom: 3,
      maxZoom: 8,
      dragRotate: false,
      attributionControl: false
    })

    map.on('load', () => {
      // Add ARGO points
      if (argoProfiles && argoProfiles.length > 0) {
        argoProfiles.forEach((prof) => {
          const el = document.createElement('div')
          el.className = 'w-2.5 h-2.5 rounded-full bg-[#E8642F] border border-[#060B12] hover:scale-175 transition-all cursor-pointer'
          el.title = `Float #${prof.platform_number} · Cycle ${prof.cycle_number}\nDate: ${prof.time.slice(0, 10)}\nAntarBodh RMSE: ${prof.antarbodh_rmse}°C`
          el.onclick = () => setSelectedFloat(prof.platform_number)

          new maplibregl.Marker({ element: el })
            .setLngLat([prof.longitude, prof.latitude])
            .addTo(map)
        })
      }
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [argoProfiles])

  // Chart data formatting
  const chartData = validationDepth.map(d => ({
    depth: `${d.depth}m`,
    depthNum: d.depth,
    antarbodh: d.antarbodh_rmse,
    glorys: d.glorys_rmse,
    climatology: d.climatology_rmse || (d.depth === 100 ? 2.25 : d.depth === 125 ? 2.15 : d.depth === 0 ? 0.93 : null)
  }))

  return (
    <PageReveal>
      {({ bgReady, headerReady, contentReady }) => (
        <div className="relative w-full min-h-[calc(100vh-56px)] bg-[#060B12] text-[#C7D2DA] overflow-y-auto">
          
          {/* Beat 1: Oscilloscope Readout Texture + Ambient Bioluminescent Particles with C.3 Parallax */}
          <div
            className={`fixed inset-0 pointer-events-none transition-opacity duration-300 ${
              bgReady ? 'opacity-8' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url('/assets/generated/validation-readout-bg.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `translateY(${parallaxY}px)`
            }}
          />
          <AmbientOceanCanvas variant="validation" opacity={0.08} />

          <PageShell className="relative z-10 pt-16 pb-20 flex flex-col gap-8">
            
            {/* Beat 2: Header Block (blur-in + slide up as one unit) */}
            <section 
              className={`border-b border-[#1C2C3D] pb-8 transition-all duration-500 ease-out ${
                headerReady 
                  ? 'opacity-100 translate-y-0 blur-none' 
                  : 'opacity-0 translate-y-3 blur-[8px]'
              }`}
            >
              <div className="font-mono text-xs text-[#5C7086] uppercase tracking-wider mb-2">
                Independent Empirical Verification · 2025 Test Domain
              </div>
              <h1 className="font-display text-4xl lg:text-5xl font-normal text-[#EDF2F5] tracking-tight leading-tight">
                Validated against 201,942 ARGO observations
              </h1>
              <p className="font-body text-base text-[#5C7086] mt-3 max-w-3xl leading-relaxed">
                Evaluated simultaneously against the exact same in-situ autonomous profiling float observations across the Bay of Bengal as the operational Copernicus GLORYS12V1 numerical reanalysis, providing an uncompromised, empirical benchmark without synthetic sampling bias.
              </p>
            </section>

            {/* Beat 3: Content Body (Stat row, Charts, Float Track, Table) */}
            <div 
              className={`flex flex-col gap-8 transition-all duration-400 ease-out ${
                contentReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              {/* Headline Metric Row (Standardized gap-6 between cards in row) */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stat 1: Overall RMSE */}
                <div className="instrument-card p-6 flex flex-col justify-between">
                  <div>
                    <div className="font-mono text-xs text-[#5C7086] uppercase tracking-wider">
                      Full-Column (0–1000m) RMSE
                    </div>
                    <div className="font-display text-4xl lg:text-5xl text-[#EDF2F5] font-normal mt-2">
                      <AnimatedValue value={0.62} suffix="°C" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#1C2C3D] font-mono text-xs text-[#5C7086] flex items-center justify-between">
                    <span>GLORYS12V1 Reanalysis:</span>
                    <span className="text-[#3FA7C4]">0.55°C</span>
                  </div>
                </div>

                {/* Stat 2: Systematic Mean Bias (Hero callout) */}
                <div className="instrument-card p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-[#4F9C6D]" />
                  <div>
                    <div className="font-mono text-xs text-[#5C7086] uppercase tracking-wider flex items-center gap-1.5">
                      <span>Systematic Mean Bias</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4F9C6D]" />
                    </div>
                    <div className="font-display text-4xl lg:text-5xl text-[#4F9C6D] font-normal mt-2">
                      <AnimatedValue value={0.02} prefix="+" suffix="°C" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#1C2C3D] flex flex-col gap-1">
                    <div className="font-mono text-xs text-[#5C7086] flex items-center justify-between">
                      <span>GLORYS12V1 Reanalysis:</span>
                      <span className="text-[#3FA7C4]">+0.12°C</span>
                    </div>
                    <p className="font-body text-[11px] text-[#5C7086] leading-snug mt-1">
                      AntarBodh exhibits an 83% reduction in systematic column thermal bias compared to numerical reanalysis.
                    </p>
                  </div>
                </div>

                {/* Stat 3: Deep Ocean RMSE */}
                <div className="instrument-card p-6 flex flex-col justify-between">
                  <div>
                    <div className="font-mono text-xs text-[#5C7086] uppercase tracking-wider">
                      Deep Ocean (300–1000m) RMSE
                    </div>
                    <div className="font-display text-4xl lg:text-5xl text-[#EDF2F5] font-normal mt-2 font-mono tabular-nums">
                      0.19–0.34°C
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#1C2C3D] font-mono text-xs text-[#5C7086]">
                    <span className="text-[#4F9C6D] font-semibold">Outperforms GLORYS</span> (0.23–0.38°C) across all deep layers.
                  </div>
                </div>
              </section>

              {/* Primary Validation Chart & Anomaly Callout */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Main RMSE Chart (Spans 2 columns) */}
                <div className="lg:col-span-2 instrument-card p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-body text-sm font-semibold text-[#EDF2F5] uppercase tracking-wider">
                        Reconstruction Error by Depth (15 Canonical Levels)
                      </h2>
                      <div className="font-mono text-xs text-[#5C7086] mt-0.5">
                        Evaluated across 201,942 matched in-situ observation points
                      </div>
                    </div>
                  </div>

                  <div className="h-[340px] w-full bg-[#060B12] border border-[#1C2C3D] p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
                      >
                        <CartesianGrid strokeDasharray="2 2" stroke="#1C2C3D" />
                        <XAxis 
                          dataKey="depth" 
                          stroke="#5C7086"
                          tick={{ fill: '#5C7086', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                        />
                        <YAxis 
                          stroke="#5C7086"
                          tick={{ fill: '#5C7086', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                          unit="°C"
                          domain={[0, 2.5]}
                        />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#0A121C] border border-[#1C2C3D] p-3 font-mono text-xs shadow-xl">
                                  <div className="text-[#EDF2F5] font-semibold mb-2">Depth: {label}</div>
                                  {payload.map((p) => (
                                    <div key={p.name} className="flex items-center justify-between gap-4 py-0.5" style={{ color: p.color }}>
                                      <span>{p.name}:</span>
                                      <strong>{p.value !== null ? `${p.value}°C` : 'N/A'}</strong>
                                    </div>
                                  ))}
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          height={36}
                          wrapperStyle={{ fontFamily: 'Public Sans', fontSize: '12px' }}
                        />
                        <Line 
                          type="monotone" 
                          name="AntarBodh CNN" 
                          dataKey="antarbodh" 
                          stroke="#E8642F" 
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#E8642F' }}
                        />
                        <Line 
                          type="monotone" 
                          name="GLORYS12V1 Reanalysis" 
                          dataKey="glorys" 
                          stroke="#3FA7C4" 
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#3FA7C4' }}
                        />
                        <Line 
                          type="monotone" 
                          name="WOA Climatology Baseline" 
                          dataKey="climatology" 
                          stroke="#5C7086" 
                          strokeDasharray="4 4" 
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="font-body text-xs text-[#5C7086] mt-4 leading-relaxed">
                    *Note: Reconstruction error peaks near the active thermocline (75–125m) due to internal wave dynamics and steep vertical temperature gradients. In deep layers (300–1000m), AntarBodh achieves lower RMSE than numerical reanalysis.
                  </p>
                </div>

                {/* Anomaly Correlation Callout */}
                <div className="instrument-card p-6 flex flex-col gap-4">
                  <h2 className="font-body text-xs text-[#5C7086] uppercase tracking-wider font-semibold">
                    Diagnostic Insight: Subsurface Anomaly Reconstruction
                  </h2>

                  <div className="font-body text-sm text-[#C7D2DA] leading-relaxed">
                    Raw pooled correlation (&gt;0.99) across all depth levels can be misleading, as the universal surface-to-deep temperature gradient (29°C at surface vs 6°C at 1000m) artificially inflates correlation metrics even for naive models.
                  </div>

                  <div className="bg-[#101B28] border border-[#1C2C3D] p-4 font-mono text-xs flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[#5C7086]">
                      <span>125m Anomaly Corr:</span>
                      <strong className="text-[#E8642F] text-sm">0.77</strong>
                    </div>
                    <div className="flex justify-between items-center text-[#5C7086]">
                      <span>125m Climatology RMSE:</span>
                      <strong className="text-[#EDF2F5]">2.15°C</strong>
                    </div>
                    <div className="flex justify-between items-center text-[#5C7086]">
                      <span>125m AntarBodh RMSE:</span>
                      <strong className="text-[#4F9C6D]">1.42°C</strong>
                    </div>
                  </div>

                  <p className="font-body text-xs text-[#5C7086] leading-relaxed">
                    By removing the static historical mean state, AntarBodh demonstrates it is actively predicting dynamic thermodynamic deviations rather than memorizing a passive climatological baseline.
                  </p>
                </div>
              </section>

              {/* ARGO Float Tracks Mini-Map with Deployment Accent */}
              <section className="instrument-card p-6 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="font-body text-sm font-semibold text-[#EDF2F5] uppercase tracking-wider">
                      In-Situ ARGO Float Array (2025 Test Deployment)
                    </h2>
                    <div className="font-mono text-xs text-[#5C7086] mt-0.5">
                      44 autonomous profiling floats · 1,383 discrete CTD profiles across Bay of Bengal
                    </div>
                  </div>
                  {selectedFloat && (
                    <span className="font-mono text-xs text-[#E8642F] bg-[#101B28] px-2.5 py-1 border border-[#1C2C3D] self-start sm:self-auto">
                      Selected Float #{selectedFloat}
                    </span>
                  )}
                </div>

                <div className="relative h-[320px] w-full bg-[#060B12] border border-[#1C2C3D] overflow-hidden">
                  <div ref={mapContainerRef} className="w-full h-full" />
                  
                  {/* Deployment photo badge overlay */}
                  <div className="absolute top-3 right-3 hidden md:flex items-center gap-3 bg-[#0A121C]/90 border border-[#1C2C3D] p-1.5 pr-3 shadow-lg">
                    <img 
                      src="/assets/generated/argo-deployment-deck.jpg" 
                      alt="ARGO deployment" 
                      className="w-12 h-10 object-cover brand-image border border-[#1C2C3D]"
                    />
                    <div className="font-mono text-[10px] text-[#5C7086] leading-tight">
                      <span className="text-[#EDF2F5] block font-semibold">IN-SITU CTD CAST</span>
                      Standard SeaBird 41CP
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 bg-[#0A121C] border border-[#1C2C3D] px-2.5 py-1 font-mono text-[11px] text-[#5C7086]">
                    ● Orange points = Float surface CTD transmissions
                  </div>
                </div>
              </section>

              {/* Comprehensive Depth-Stratified Verification Table */}
              <section className="instrument-card p-6 flex flex-col gap-4">
                <div>
                  <h2 className="font-body text-sm font-semibold text-[#EDF2F5] uppercase tracking-wider">
                    Comprehensive Depth-Stratified Verification Table
                  </h2>
                  <div className="font-mono text-xs text-[#5C7086] mt-0.5">
                    Exact matched pairs: ANTARBODH CNN v1 vs GLORYS12V1 vs ARGO In-Situ
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1C2C3D] text-[#5C7086]">
                        <th className="py-2.5 px-3 font-medium">Depth (m)</th>
                        <th className="py-2.5 px-3 font-medium text-right">N Obs</th>
                        <th className="py-2.5 px-3 font-medium text-right text-[#E8642F]">AntarBodh RMSE (°C)</th>
                        <th className="py-2.5 px-3 font-medium text-right text-[#3FA7C4]">GLORYS RMSE (°C)</th>
                        <th className="py-2.5 px-3 font-medium text-right">AntarBodh Bias (°C)</th>
                        <th className="py-2.5 px-3 font-medium text-right">GLORYS Bias (°C)</th>
                        <th className="py-2.5 px-3 font-medium text-right">AntarBodh r</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationDepth.map((row) => (
                        <tr 
                          key={row.depth} 
                          className="border-b border-[#1C2C3D]/60 hover:bg-[#101B28] transition-colors"
                        >
                          <td className="py-2.5 px-3 font-semibold text-[#EDF2F5]">{row.depth}m</td>
                          <td className="py-2.5 px-3 text-right text-[#5C7086] tabular-nums">{row.n_obs.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right text-[#EDF2F5] tabular-nums">{row.antarbodh_rmse.toFixed(4)}</td>
                          <td className="py-2.5 px-3 text-right text-[#C7D2DA] tabular-nums">{row.glorys_rmse.toFixed(4)}</td>
                          <td className={`py-2.5 px-3 text-right tabular-nums ${Math.abs(row.antarbodh_bias) < 0.1 ? 'text-[#4F9C6D]' : 'text-[#C7D2DA]'}`}>
                            {row.antarbodh_bias > 0 ? `+${row.antarbodh_bias.toFixed(4)}` : row.antarbodh_bias.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#5C7086] tabular-nums">
                            {row.glorys_bias > 0 ? `+${row.glorys_bias.toFixed(4)}` : row.glorys_bias.toFixed(4)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#C7D2DA] tabular-nums">{row.antarbodh_corr.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>

          </PageShell>
        </div>
      )}
    </PageReveal>
  )
}
