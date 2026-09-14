import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useOceanStore } from '../../store/useOceanStore'

const MONTH_TICKS = [
  { label: 'Jan', dayIndex: 0, dateStr: '2025-01-01' },
  { label: 'Feb', dayIndex: 31, dateStr: '2025-02-01' },
  { label: 'Mar', dayIndex: 59, dateStr: '2025-03-01' },
  { label: 'Apr', dayIndex: 90, dateStr: '2025-04-01' },
  { label: 'May', dayIndex: 120, dateStr: '2025-05-01' },
  { label: 'Jun', dayIndex: 151, dateStr: '2025-06-01' },
  { label: 'Jul', dayIndex: 181, dateStr: '2025-07-01' },
  { label: 'Aug', dayIndex: 212, dateStr: '2025-08-01' },
  { label: 'Sep', dayIndex: 243, dateStr: '2025-09-01' },
  { label: 'Oct', dayIndex: 273, dateStr: '2025-10-01' },
  { label: 'Nov', dayIndex: 304, dateStr: '2025-11-01' },
  { label: 'Dec', dayIndex: 334, dateStr: '2025-12-01' },
]

export const DateScrubber: React.FC = () => {
  const { selectedDate, setSelectedDate } = useOceanStore()
  const [isPlaying, setIsPlaying] = useState(false)
  const debounceTimerRef = useRef<number | null>(null)
  const playIntervalRef = useRef<number | null>(null)

  // Calculate current date index (0 to 364)
  const startDate = new Date('2025-01-01').getTime()
  const currentDate = new Date(selectedDate).getTime()
  const dayIndex = Math.max(0, Math.min(364, Math.round((currentDate - startDate) / (1000 * 60 * 60 * 24))))

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    const targetTime = startDate + val * (1000 * 60 * 60 * 24)
    const dateObj = new Date(targetTime)
    const yyyy = dateObj.getUTCFullYear()
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(dateObj.getUTCDate()).padStart(2, '0')
    const newDateStr = `${yyyy}-${mm}-${dd}`

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = window.setTimeout(() => {
      setSelectedDate(newDateStr)
    }, 150)
  }

  // Keyboard navigation for Left/Right dates
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const newIndex = Math.max(0, dayIndex - 1)
      const targetTime = startDate + newIndex * (1000 * 60 * 60 * 24)
      const dateObj = new Date(targetTime)
      const newDateStr = dateObj.toISOString().split('T')[0]
      setSelectedDate(newDateStr)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const newIndex = Math.min(364, dayIndex + 1)
      const targetTime = startDate + newIndex * (1000 * 60 * 60 * 24)
      const dateObj = new Date(targetTime)
      const newDateStr = dateObj.toISOString().split('T')[0]
      setSelectedDate(newDateStr)
    } else if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      setIsPlaying(p => !p)
    }
  }, [dayIndex, startDate, setSelectedDate])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        const nextIndex = (dayIndex + 1) % 365
        const targetTime = startDate + nextIndex * (1000 * 60 * 60 * 24)
        const dateObj = new Date(targetTime)
        const newDateStr = dateObj.toISOString().split('T')[0]
        setSelectedDate(newDateStr)
      }, 700)
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
    }
  }, [isPlaying, dayIndex, startDate, setSelectedDate])

  return (
    <div 
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-[760px] bg-[#0A121C] border border-[#1C2C3D] px-4 py-2.5 shadow-lg select-none"
      role="region"
      aria-label="2025 Temporal Scrubber"
    >
      <div className="flex items-center justify-between gap-4 mb-1.5">
        {/* Play / Pause toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-7 h-7 flex items-center justify-center border border-[#1C2C3D] hover:border-[#7A3B22] bg-[#101B28] text-[#EDF2F5] transition-colors focus:outline-none"
            title={isPlaying ? "Pause playback (Space)" : "Play temporal series (Space)"}
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <span className="font-body text-xs text-[#5C7086] uppercase tracking-wider">
            2025 Test Sequence
          </span>
        </div>

        {/* Date Monospace readout */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-[#E8642F]">
            {selectedDate}
          </span>
          <span className="font-mono text-xs text-[#5C7086]">
            (Day {dayIndex + 1}/365)
          </span>
        </div>
      </div>

      {/* Scrubber Rail & Month Ticks */}
      <div className="relative pt-1 pb-3">
        {/* Month tick marks */}
        <div className="absolute left-0 right-0 top-3 flex justify-between pointer-events-none px-1">
          {MONTH_TICKS.map((m) => (
            <div key={m.label} className="flex flex-col items-center">
              <div className="w-[1px] h-2 bg-[#1C2C3D]" />
              <span className="font-mono text-[10px] text-[#5C7086] mt-1">
                {m.label}
              </span>
            </div>
          ))}
        </div>

        {/* Custom Range Slider */}
        <input
          type="range"
          min="0"
          max="364"
          value={dayIndex}
          onChange={handleSliderChange}
          className="relative z-10 w-full h-[4px] bg-[#1C2C3D] appearance-none rounded-none cursor-ew-resize accent-[#E8642F] focus:outline-none focus:ring-1 focus:ring-[#E8642F]"
          aria-label="Temporal scrubber"
        />
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-[#5C7086] pt-1">
        <span>← → keys to step day</span>
        <span>Space to animate</span>
      </div>
    </div>
  )
}
