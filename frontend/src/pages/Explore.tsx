import React, { useEffect, useState } from 'react'
import { OceanMap } from '../components/map/OceanMap'
import { DepthLadder } from '../components/navigation/DepthLadder'
import { DateScrubber } from '../components/navigation/DateScrubber'
import { ThermalLegend } from '../components/map/ThermalLegend'
import { CoordinateChip } from '../components/map/CoordinateChip'
import { InspectionPanel } from '../components/location/InspectionPanel'
import { OceanCrossSection3D } from '../components/diorama/OceanCrossSection3D'
import { useOceanStore } from '../store/useOceanStore'

export const Explore: React.FC = () => {
  const { initApp, loadingSlice, selectedDate, selectedDepth } = useOceanStore()
  const [showDiorama, setShowDiorama] = useState(false)

  useEffect(() => {
    initApp()
  }, [initApp])

  return (
    <div className="relative w-full h-[calc(100vh-56px)] flex overflow-hidden bg-[#060B12]">
      {/* Main Map Viewport */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* Full-bleed MapLibre Map */}
        <OceanMap />

        {/* Depth Ladder on Left Edge */}
        <DepthLadder />

        {/* Date Scrubber at Bottom Edge */}
        <DateScrubber />

        {/* Thermal Colormap Legend at Bottom Right */}
        <ThermalLegend />

        {/* Pointer Coordinates Chip at Bottom Left */}
        <CoordinateChip />

        {/* 3D Cross-Section Diorama Widget (Collapsible / Expandable in Top Right) */}
        <div className="absolute top-6 right-4 z-20 flex flex-col items-end">
          <button
            type="button"
            onClick={() => setShowDiorama(!showDiorama)}
            className="btn-secondary text-xs bg-[#0A121C] shadow-md flex items-center gap-1.5"
            aria-expanded={showDiorama}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span>{showDiorama ? 'Hide 3D cross-section' : '3D cross-section'}</span>
          </button>

          {showDiorama && (
            <div className="mt-2 shadow-xl">
              <OceanCrossSection3D />
            </div>
          )}
        </div>

        {/* Slice Fetch Loading Status (Section 12 Copy Guidelines) */}
        {loadingSlice && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-[#0A121C] border border-[#1C2C3D] px-3.5 py-1.5 font-mono text-xs text-[#E8642F] shadow-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E8642F] animate-ping" />
            <span>Loading {selectedDate}, {selectedDepth}m depth…</span>
          </div>
        )}
      </div>

      {/* Inspection Panel (Slides in from Right Edge) */}
      <InspectionPanel />
    </div>
  )
}
