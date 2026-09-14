import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from './components/layout/Header'
import { Explore } from './pages/Explore'
import { Validation } from './pages/Validation'
import { Architecture } from './pages/Architecture'
import { SplashScreen } from './components/motion/SplashScreen'

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease: 'easeIn' as const } }
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        className="flex-1 relative overflow-hidden flex flex-col"
      >
        <Routes location={location}>
          <Route path="/" element={<Explore />} />
          <Route path="/validation" element={<Validation />} />
          <Route path="/architecture" element={<Architecture />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show if not previously seen in this session and not prefers-reduced-motion
    if (typeof window === 'undefined') return false
    const seen = sessionStorage.getItem('antarbodh_splash_seen')
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return !seen && !prefersReducedMotion
  })

  return (
    <BrowserRouter>
      {/* C.1 App-Level Splash Screen Sequence (Runs once per session) */}
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      <div className="relative w-full h-full min-h-screen flex flex-col bg-[#060B12] text-[#C7D2DA]">
        {/* Global Bathymetric Texture Layer (B.2 #1, opacity ~4%) */}
        <div 
          className="fixed inset-0 pointer-events-none opacity-[0.04] bg-repeat z-0"
          style={{ 
            backgroundImage: `url('/assets/generated/global-bathy-texture.jpg')`,
            backgroundSize: '512px 512px'
          }}
        />

        {/* 56px Persistent Header */}
        <Header />

        {/* Route Pages with animated transitions */}
        <main className="flex-1 relative overflow-hidden flex flex-col z-10">
          <AnimatedRoutes />
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
