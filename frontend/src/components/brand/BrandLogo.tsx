import React from 'react'

interface BrandLogoProps {
  size?: number | 'sm' | 'md' | 'lg' | 'og'
  className?: string
  animated?: boolean
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
  animated = false
}) => {
  const pixelSize = typeof size === 'number' 
    ? size 
    : size === 'sm' ? 18 
    : size === 'md' ? 32 
    : size === 'lg' ? 64 
    : size === 'og' ? 128 
    : 32

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-[4px] border border-[#1C2C3D] bg-[#0A121C] shadow-md ${
        animated ? 'antarbodh-cube-pulse' : ''
      } ${className}`}
      style={{
        width: `${pixelSize}px`,
        height: `${pixelSize}px`
      }}
      aria-label="AntarBodh 3D Ocean Cube Logo"
    >
      <img
        src="/logo-cube.png"
        alt="AntarBodh Subsurface Cube"
        className="w-full h-full object-cover object-center transition-transform duration-200 hover:scale-110"
        loading="eager"
      />
    </div>
  )
}
