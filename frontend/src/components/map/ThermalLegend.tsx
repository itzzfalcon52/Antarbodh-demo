import React from 'react'
import { useOceanStore } from '../../store/useOceanStore'

export const ThermalLegend: React.FC = () => {
  const { temperatureSlice, selectedDepth } = useOceanStore()

  const minTemp = temperatureSlice?.min_temp ?? 5.0
  const maxTemp = temperatureSlice?.max_temp ?? 29.5
  const midTemp = Number(((minTemp + maxTemp) / 2).toFixed(1))

  return (
    <div 
      className="absolute bottom-20 right-4 z-20 bg-[#0A121C] border border-[#1C2C3D] px-3.5 py-2.5 shadow-md flex flex-col gap-1.5 select-none"
      role="region"
      aria-label="Thermal Colormap Legend"
    >
      <div className="flex items-center justify-between gap-4 font-mono text-[11px] text-[#5C7086]">
        <span>TEMPERATURE ({selectedDepth}m)</span>
        <span className="text-[#EDF2F5]">°C</span>
      </div>

      {/* 5-Stop Thermal Gradient Bar */}
      <div 
        className="w-[180px] h-[10px] border border-[#1C2C3D]"
        style={{
          background: 'linear-gradient(to right, #1E3A8A, #2E8FB0, #E8D95C, #E8642F, #B23A2E)'
        }}
      />

      {/* Temperature Numerical Ticks */}
      <div className="flex justify-between items-center font-mono text-[11px] text-[#C7D2DA]">
        <span>{minTemp.toFixed(1)}°</span>
        <span className="text-[#5C7086]">{midTemp.toFixed(1)}°</span>
        <span>{maxTemp.toFixed(1)}°</span>
      </div>
    </div>
  )
}
