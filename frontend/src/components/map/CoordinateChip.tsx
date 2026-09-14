import React from 'react'
import { useOceanStore } from '../../store/useOceanStore'

export const CoordinateChip: React.FC = () => {
  const { cursorLocation } = useOceanStore()

  const lat = cursorLocation?.lat ?? 13.25
  const lon = cursorLocation?.lon ?? 87.75

  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`
  const lonStr = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`

  return (
    <div 
      className="absolute bottom-20 left-4 z-20 bg-[#0A121C] border border-[#1C2C3D] px-3 py-1.5 font-mono text-xs text-[#EDF2F5] shadow-md pointer-events-none select-none flex items-center gap-2"
      aria-live="polite"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#E8642F]" />
      <span>{latStr} &nbsp;{lonStr}</span>
    </div>
  )
}
