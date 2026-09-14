import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useOceanStore } from '../../store/useOceanStore'
import { BrandLogo } from '../brand/BrandLogo'

export const Header: React.FC = () => {
  const location = useLocation()
  const { selectedDate, selectedDepth } = useOceanStore()
  const isValidationPage = location.pathname === '/validation'
  const isArchitecturePage = location.pathname === '/architecture'
  const isFullBleed = !isValidationPage && !isArchitecturePage

  return (
    <header className="relative w-full h-[56px] min-h-[56px] bg-[#0A121C] border-b border-[#1C2C3D] z-30 select-none overflow-hidden">
      {/* Background panel texture overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10 bg-repeat bg-center"
        style={{ backgroundImage: `url('/assets/generated/header-panel-texture.png')` }}
      />

      {/* Inner Header Content Container — matching max-w-[1400px] & padding exactly with PageShell on non-fullbleed */}
      <div className={`relative h-full flex items-center justify-between ${
        isFullBleed 
          ? 'w-full px-6 md:px-8 lg:px-12' 
          : 'mx-auto w-full max-w-[1400px] px-6 md:px-12 lg:px-20'
      }`}>
        {/* Left: Brand & Geographic Domain */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 text-decoration-none group">
            {/* Resolution-independent SVG Brand Mark */}
            <BrandLogo size="md" className="transition-transform group-hover:scale-105" />

            <span className="font-display text-[20px] font-normal text-[#EDF2F5] tracking-tight leading-none">
              AntarBodh
            </span>
          </Link>

          <div className="h-4 w-[1px] bg-[#1C2C3D] hidden md:block" />

          {/* Center-left: Canonical survey domain */}
          <span className="font-mono text-xs text-[#5C7086] hidden lg:inline-block tracking-normal">
            BAY OF BENGAL · 5°N–20°N, 80°E–100°E · 0.25° GRID
          </span>
        </div>

        {/* Center: Live Instrument State indicator */}
        {!isValidationPage && !isArchitecturePage && (
          <div className="hidden sm:flex items-center gap-3 font-mono text-xs text-[#5C7086] bg-[#101B28] px-3 py-1 border border-[#1C2C3D]">
            <span className="flex items-center gap-1.5 text-[#C7D2DA]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8642F] animate-pulse" />
              <span>DEPTH: <strong className="text-[#EDF2F5] font-normal">{selectedDepth}m</strong></span>
            </span>
            <span className="text-[#1C2C3D]">|</span>
            <span className="text-[#C7D2DA]">
              DATE: <strong className="text-[#EDF2F5] font-normal">{selectedDate}</strong>
            </span>
          </div>
        )}

        {/* Right: Scientific Navigation Actions */}
        <div className="flex items-center gap-3">
          {isValidationPage || isArchitecturePage ? (
            <Link 
              to="/" 
              className="btn-secondary text-xs"
              style={{ borderBottom: '2px solid #E8642F', borderRadius: '4px 4px 0 0' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="1" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              Live console
            </Link>
          ) : (
            <>
              <Link 
                to="/architecture" 
                className="btn-secondary text-xs hidden sm:inline-flex"
                style={isArchitecturePage ? { borderBottom: '2px solid #E8642F', borderRadius: '4px 4px 0 0' } : undefined}
              >
                Architecture
              </Link>

              <Link to="/validation" className="btn-primary text-xs">
                <span>Validation results</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25" />
                  <path d="M6.5 5.5L9.5 8L6.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
