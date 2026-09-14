import React, { useEffect, useCallback } from 'react'
import { useOceanStore } from '../../store/useOceanStore'

const CANONICAL_DEPTHS = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000]

export const DepthLadder: React.FC = () => {
  const { selectedDepth, setSelectedDepth } = useOceanStore()

  // Handle keyboard navigation for depths (Arrow Up / Down)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only capture if not typing in an input
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

    const currentIndex = CANONICAL_DEPTHS.indexOf(selectedDepth)
    if (currentIndex === -1) return

    if (e.key === 'ArrowUp' && currentIndex > 0) {
      e.preventDefault()
      setSelectedDepth(CANONICAL_DEPTHS[currentIndex - 1])
    } else if (e.key === 'ArrowDown' && currentIndex < CANONICAL_DEPTHS.length - 1) {
      e.preventDefault()
      setSelectedDepth(CANONICAL_DEPTHS[currentIndex + 1])
    }
  }, [selectedDepth, setSelectedDepth])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  /**
   * Log-scaled vertical spacing calculator
   * Gives higher physical resolution to 0-150m thermocline region
   */
  const getTopPercent = (depth: number): number => {
    if (depth === 0) return 0
    // log10 scale from depth 5 to 1000
    // log10(5) ~ 0.69897, log10(1000) = 3
    const minLog = Math.log10(5)
    const maxLog = Math.log10(1000)
    const logVal = Math.log10(Math.max(5, depth))
    const ratio = (logVal - minLog) / (maxLog - minLog)
    return 6 + ratio * 88 // 6% to 94% range
  }

  return (
    <div 
      className="absolute top-6 left-4 z-20 flex flex-col items-start select-none"
      role="region"
      aria-label="Subsurface Depth Ladder"
    >
      <div className="bg-[#0A121C] border border-[#1C2C3D] p-3 shadow-md flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-[#1C2C3D]">
          <span className="font-body text-[11px] text-[#5C7086] uppercase tracking-wider">Depth</span>
          <span className="font-mono text-xs text-[#EDF2F5] font-medium">{selectedDepth}m</span>
        </div>

        {/* Vertical Rail */}
        <div className="relative h-[340px] w-[64px] flex flex-col justify-between">
          {/* Central Track Line */}
          <div className="absolute left-[7px] top-1 bottom-1 w-[1px] bg-[#1C2C3D]" />

          {CANONICAL_DEPTHS.map((depth) => {
            const isActive = selectedDepth === depth
            const topPercent = getTopPercent(depth)

            return (
              <button
                key={depth}
                type="button"
                onClick={() => setSelectedDepth(depth)}
                style={{ top: `${topPercent}%` }}
                className="absolute left-0 w-full flex items-center group cursor-pointer text-left focus:outline-none -translate-y-1/2"
                aria-label={`Select depth ${depth} meters`}
                aria-pressed={isActive}
              >
                {/* Tick Indicator */}
                <div 
                  className={`h-[3px] transition-all duration-150 rounded-[1px] ${
                    isActive 
                      ? 'bg-[#E8642F] h-[4px] shadow-[0_0_6px_rgba(232,100,47,0.4)]' 
                      : 'bg-[#1C2C3D] group-hover:bg-[#5C7086]'
                  }`}
                  style={{ width: isActive ? '18px' : '14px' }}
                />

                {/* Depth Label */}
                <span 
                  className={`ml-2 font-mono text-[11px] transition-colors ${
                    isActive 
                      ? 'text-[#EDF2F5] font-semibold' 
                      : 'text-[#5C7086] group-hover:text-[#C7D2DA]'
                  }`}
                >
                  {depth}m
                </span>

                {/* Active Depth Readout Line — extends into the map */}
                {isActive && <div className="depth-readout-line" />}
              </button>
            )
          })}
        </div>
      </div>

      <span className="mt-1 font-mono text-[9px] text-[#5C7086] tracking-tight">
        ↑↓ keys to step depth
      </span>
    </div>
  )
}
