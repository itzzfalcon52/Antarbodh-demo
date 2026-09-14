import React, { useEffect, useState } from 'react'
import { BrandLogo } from '../brand/BrandLogo'
import { AmbientOceanCanvas } from './AmbientOceanCanvas'

interface SplashScreenProps {
  onComplete: () => void
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'revealing' | 'holding' | 'fading' | 'done'>('revealing')

  useEffect(() => {
    // Check if splash was already shown in this browser session
    const hasSeenSplash = sessionStorage.getItem('antarbodh_splash_seen')
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (hasSeenSplash || prefersReducedMotion) {
      sessionStorage.setItem('antarbodh_splash_seen', 'true')
      onComplete()
      return
    }

    // Timing sequence
    const holdTimer = setTimeout(() => {
      setStage('holding')
    }, 800)

    const fadeTimer = setTimeout(() => {
      setStage('fading')
    }, 1300)

    const doneTimer = setTimeout(() => {
      setStage('done')
      sessionStorage.setItem('antarbodh_splash_seen', 'true')
      onComplete()
    }, 1750)

    return () => {
      clearTimeout(holdTimer)
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onComplete])

  if (stage === 'done') return null

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060B12] transition-opacity duration-400 ease-out select-none ${
        stage === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Ambient Ocean Texture */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-50"
        style={{ backgroundImage: `url('/assets/generated/splash-bg.jpg')` }}
      />
      <AmbientOceanCanvas variant="splash" opacity={0.35} />

      {/* Dark vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060B12] via-transparent to-[#060B12] opacity-85" />

      {/* Centered 3D Ocean Cube & Identity */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="p-3.5 rounded-lg bg-[#0A121C]/90 border border-[#1C2C3D] shadow-2xl backdrop-blur-none">
          <BrandLogo size={108} animated={true} />
        </div>

        <div className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${
          stage === 'holding' || stage === 'fading' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          <h1 className="font-display text-3xl font-normal text-[#EDF2F5] tracking-tight">
            AntarBodh
          </h1>
          <p className="font-mono text-xs text-[#5C7086] tracking-wider uppercase">
            AI Subsurface Ocean Intelligence · Bay of Bengal
          </p>
        </div>
      </div>
    </div>
  )
}
