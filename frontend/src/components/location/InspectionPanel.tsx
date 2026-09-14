import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts'
import { useOceanStore } from '../../store/useOceanStore'

export const InspectionPanel: React.FC = () => {
  const { 
    inspectionOpen, 
    setInspectionOpen, 
    selectedLocation, 
    selectedDate, 
    pointProfile, 
    surfaceConditions,
    loadingProfile 
  } = useOceanStore()

  if (!inspectionOpen || !selectedLocation) return null

  const lat = selectedLocation.lat
  const lon = selectedLocation.lon
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`
  const lonStr = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`

  // Prepare profile data for Recharts vertical CTD format (Y = depth inverted, X = temperature)
  const depths = pointProfile?.depths || [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000]
  const temps = pointProfile?.temperatures || []
  const climTemps = pointProfile?.climatology_temperatures || []

  const chartData = depths.map((d, i) => ({
    depth: d,
    antarbodh: temps[i] !== undefined && temps[i] !== null ? Number(temps[i]) : null,
    climatology: climTemps[i] !== undefined && climTemps[i] !== null ? Number(climTemps[i]) : null
  }))

  const validTemps = temps.filter((t): t is number => t !== null && !isNaN(t))
  const minChartTemp = validTemps.length > 0 ? Math.floor(Math.min(...validTemps) - 1) : 4
  const maxChartTemp = validTemps.length > 0 ? Math.ceil(Math.max(...validTemps) + 1) : 31

  // 7 Surface Sensors
  const sensors = [
    { label: 'SST', name: 'Sea Surface Temp', obs: surfaceConditions?.sst, defaultUnit: '°C' },
    { label: 'SSS', name: 'Sea Surface Salinity', obs: surfaceConditions?.sss, defaultUnit: 'PSU' },
    { label: 'SSH', name: 'Sea Level Anomaly', obs: surfaceConditions?.ssh, defaultUnit: 'm' },
    { label: 'Curr U', name: 'Zonal Current', obs: surfaceConditions?.current_u, defaultUnit: 'm/s' },
    { label: 'Curr V', name: 'Meridional Current', obs: surfaceConditions?.current_v, defaultUnit: 'm/s' },
    { label: 'Wind U', name: 'Zonal Wind', obs: surfaceConditions?.wind_u, defaultUnit: 'm/s' },
    { label: 'Wind V', name: 'Meridional Wind', obs: surfaceConditions?.wind_v, defaultUnit: 'm/s' }
  ]

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 360, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 360, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="w-full md:w-[360px] h-[calc(100vh-56px)] bg-[#0A121C] border-l border-[#1C2C3D] flex flex-col z-20 shrink-0 shadow-[-4px_0_12px_rgba(0,0,0,0.35)] overflow-y-auto"
        aria-label="Location Subsurface Inspection"
      >
        {/* Header Strip */}
        <div className="p-4 border-b border-[#1C2C3D] bg-[#101B28] flex items-start justify-between">
          <div>
            <div className="font-mono text-base font-semibold text-[#EDF2F5] tracking-tight">
              LAT {latStr} &nbsp;LON {lonStr}
            </div>
            <div className="font-mono text-xs text-[#5C7086] mt-0.5">
              OBS DATE: {selectedDate}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInspectionOpen(false)}
            className="w-7 h-7 flex items-center justify-center text-[#5C7086] hover:text-[#EDF2F5] hover:bg-[#1C2C3D] rounded-[2px] transition-colors focus:outline-none"
            aria-label="Close inspection panel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Loading Indicator */}
        {loadingProfile && (
          <div className="px-4 py-2 bg-[#101B28] border-b border-[#1C2C3D] font-mono text-xs text-[#E8642F] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8642F] animate-ping" />
            <span>Interpolating CTD vertical profile...</span>
          </div>
        )}

        {/* Section 1: Thermocline Profile Chart (Inverted Y-Axis: Depth increases downwards) */}
        <div className="p-4 border-b border-[#1C2C3D]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-body text-xs text-[#5C7086] uppercase tracking-wider">
              Vertical Temperature Profile
            </h2>
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="flex items-center gap-1 text-[#E8642F]">
                <span className="w-2.5 h-[2px] bg-[#E8642F]" />
                AntarBodh
              </span>
              <span className="flex items-center gap-1 text-[#5C7086]">
                <span className="w-2.5 h-[2px] border-b border-dashed border-[#5C7086]" />
                WOA23 Climatology
              </span>
            </div>
          </div>

          {/* Chart Container (Inverted CTD vertical style) */}
          {loadingProfile ? (
            <div className="h-[260px] w-full bg-[#060B12] border border-[#1C2C3D] p-4 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-end gap-1 h-[120px]">
                  {[40, 60, 80, 100, 90, 70, 50, 35, 25, 20].map((h, i) => (
                    <div 
                      key={i}
                      className="w-2 bg-[#1C2C3D] animate-pulse rounded-t-[1px]"
                      style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[10px] text-[#5C7086]">Interpolating profile...</span>
              </div>
            </div>
          ) : temps.length === 0 ? (
            <div className="h-[260px] w-full bg-[#060B12] border border-[#1C2C3D] p-4 flex items-center justify-center">
              <span className="font-mono text-xs text-[#5C7086]">No profile data available</span>
            </div>
          ) : (
          <div className="h-[260px] w-full bg-[#060B12] border border-[#1C2C3D] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <CartesianGrid strokeDasharray="2 2" stroke="#1C2C3D" />
                
                {/* X Axis: Temperature °C */}
                <XAxis 
                  type="number" 
                  dataKey="antarbodh" 
                  domain={[minChartTemp, maxChartTemp]}
                  stroke="#5C7086"
                  tick={{ fill: '#5C7086', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                  unit="°"
                />

                {/* Y Axis: Depth in Meters (Inverted) */}
                <YAxis 
                  type="number" 
                  dataKey="depth" 
                  reversed={true}
                  domain={[0, 1000]}
                  ticks={[0, 100, 200, 500, 1000]}
                  stroke="#5C7086"
                  tick={{ fill: '#5C7086', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                  unit="m"
                />

                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-[#0A121C] border border-[#1C2C3D] p-2 font-mono text-xs shadow-lg">
                          <div className="text-[#5C7086] mb-1">Depth: <strong className="text-[#EDF2F5]">{data.depth}m</strong></div>
                          <div className="text-[#E8642F]">AntarBodh: <strong>{data.antarbodh?.toFixed(2)}°C</strong></div>
                          {data.climatology !== null && (
                            <div className="text-[#5C7086]">WOA23: <strong>{data.climatology?.toFixed(2)}°C</strong></div>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />

                {/* WOA23 Climatology Baseline (Dashed) */}
                <Line 
                  type="monotone" 
                  dataKey="climatology" 
                  stroke="#5C7086" 
                  strokeDasharray="4 3" 
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />

                {/* AntarBodh CNN Subsurface Reconstruction (Signal Orange) */}
                <Line 
                  type="monotone" 
                  dataKey="antarbodh" 
                  stroke="#E8642F" 
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#E8642F' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          )}
        </div>

        {/* Section 2: Sensor Telemetry Panel (14-Channel Contract Visualization) */}
        <div className="p-4 border-b border-[#1C2C3D] flex-1">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-body text-xs text-[#5C7086] uppercase tracking-wider">
              Surface Sensor Telemetry
            </h2>
            <span className="font-mono text-[10px] text-[#5C7086]">
              14-Channel Mask Contract
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {sensors.map((s) => {
              const isAvailable = s.obs?.available ?? false
              const val = s.obs?.value !== null && s.obs?.value !== undefined ? s.obs.value : null
              const units = s.obs?.units || s.defaultUnit

              return (
                <div 
                  key={s.label}
                  className="bg-[#101B28] border border-[#1C2C3D] p-2 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-medium text-[#C7D2DA]">
                      {s.label}
                    </span>
                    {/* Validity Dot Indicator */}
                    {isAvailable ? (
                      <span 
                        className="w-2 h-2 rounded-full bg-[#4F9C6D]" 
                        title="Sensor telemetry valid and observed (mask=1)"
                      />
                    ) : (
                      <span 
                        className="w-2 h-2 rounded-full border border-[#D9A441] bg-transparent" 
                        title={s.obs?.reason || "Sensor masked / unobserved (mask=0)"}
                      />
                    )}
                  </div>

                  <div className="mt-1 flex items-baseline justify-between font-mono">
                    <span className={`text-xs ${isAvailable ? 'text-[#EDF2F5]' : 'text-[#D9A441]'}`}>
                      {val !== null ? `${val} ${units}` : 'MASKED'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex items-center gap-4 text-[10px] font-mono text-[#5C7086]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4F9C6D]" />
              Observed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border border-[#D9A441]" />
              Masked / Prior Fallback
            </span>
          </div>
        </div>

        {/* Section 3: Bottom Instrument Caption (Plain, Non-Marketing) */}
        <div className="p-4 bg-[#060B12] text-xs text-[#5C7086] leading-relaxed border-t border-[#1C2C3D]">
          Reconstructed from surface observations. Where a sensor was unavailable, the model used its learned climatological prior for that channel.
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
