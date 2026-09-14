import React, { useEffect, useState } from 'react'

const DEPTH_STAGES = [
  { depth: 0, label: 'SURFACE LAYER', desc: 'Satellite L4 Observation', temp: '29.2°C' },
  { depth: 75, label: 'MIXED LAYER BASE', desc: 'Wind-driven mixing', temp: '27.4°C' },
  { depth: 125, label: 'ACTIVE THERMOCLINE', desc: 'Steep gradient & wave shear', temp: '18.1°C' },
  { depth: 300, label: 'INTERMEDIATE WATER', desc: 'Sub-thermocline transition', temp: '11.8°C' },
  { depth: 700, label: 'DEEP COLUMN', desc: 'High hydrostatic pressure', temp: '7.4°C' },
  { depth: 1000, label: 'ABYSSAL HORIZON', desc: 'Boundary verification limit', temp: '5.8°C' },
]

export const DepthScrollIndicator: React.FC = () => {
  const [scrollDepth, setScrollDepth] = useState(0)
  const [activeStageIndex, setActiveStageIndex] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const fraction = Math.min(Math.max(scrollY / maxScroll, 0), 1)

      const virtualDepth = Math.round(fraction * 1000)
      setScrollDepth(virtualDepth)

      // Find active stage
      let idx = 0
      for (let i = DEPTH_STAGES.length - 1; i >= 0; i--) {
        if (virtualDepth >= DEPTH_STAGES[i].depth * 0.75) {
          idx = i
          break
        }
      }
      setActiveStageIndex(idx)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const currentStage = DEPTH_STAGES[activeStageIndex]

  return (
    <div className="fixed right-4 bottom-8 hidden xl:flex flex-col items-end gap-2 z-20 pointer-events-none select-none">
      {/* Dynamic 3D Depth Card */}
      <div className="bg-[#0A121C]/90 border border-[#1C2C3D] p-3 shadow-2xl flex flex-col gap-1 w-[200px] backdrop-blur-none pointer-events-auto">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#5C7086] border-b border-[#1C2C3D] pb-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8642F] animate-pulse" />
            <span>VIRTUAL DESCENT</span>
          </span>
          <span className="text-[#3FA7C4] font-semibold">{currentStage.temp}</span>
        </div>

        <div className="flex items-baseline justify-between mt-0.5">
          <span className="font-display text-2xl text-[#EDF2F5] font-normal tracking-tight">
            {scrollDepth}<span className="text-xs font-mono text-[#5C7086] ml-0.5">m</span>
          </span>
          <span className="font-mono text-[10px] text-[#E8642F] uppercase font-semibold">
            {currentStage.label}
          </span>
        </div>

        <div className="font-body text-[10px] text-[#5C7086] leading-tight">
          {currentStage.desc}
        </div>

        {/* Vertical Depth Gauge Bar */}
        <div className="w-full h-1 bg-[#101B28] border border-[#1C2C3D] mt-1 relative overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#3FA7C4] via-[#E8642F] to-[#E8642F] transition-all duration-100 ease-out"
            style={{ width: `${(scrollDepth / 1000) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
