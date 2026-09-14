import React, { useEffect, useRef, useState } from 'react'

interface AmbientOceanCanvasProps {
  variant?: 'splash' | 'validation'
  opacity?: number
  posterSrc?: string
  className?: string
}

export const AmbientOceanCanvas: React.FC<AmbientOceanCanvasProps> = ({
  variant = 'splash',
  opacity = 0.08,
  posterSrc,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (reducedMotion || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth)
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight)

    const handleResize = () => {
      if (!canvasRef.current) return
      width = canvasRef.current.width = canvasRef.current.offsetWidth || window.innerWidth
      height = canvasRef.current.height = canvasRef.current.offsetHeight || window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    // Generate marine snow / bioluminescent particles
    const particleCount = variant === 'splash' ? 35 : 16
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      speedY: variant === 'splash' 
        ? Math.random() * 0.35 + 0.1  // Slow downward drift
        : -(Math.random() * 0.3 + 0.08), // Slow upward ember drift
      speedX: (Math.random() - 0.5) * 0.15,
      alpha: Math.random() * 0.6 + 0.2,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.01
    }))

    let lastTime = performance.now()

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time

      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.y += p.speedY * dt * 60
        p.x += p.speedX * dt * 60
        p.pulse += p.pulseSpeed

        // Wrap around boundaries
        if (variant === 'splash' && p.y > height) {
          p.y = -5
          p.x = Math.random() * width
        } else if (variant === 'validation' && p.y < -5) {
          p.y = height + 5
          p.x = Math.random() * width
        }

        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0

        const currentAlpha = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse))

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)

        if (variant === 'splash') {
          // Cool marine snow (desaturated cyan/white)
          ctx.fillStyle = `rgba(199, 210, 218, ${currentAlpha})`
        } else {
          // Signal-orange bioluminescent embers
          ctx.fillStyle = `rgba(232, 100, 47, ${currentAlpha})`
          ctx.shadowColor = 'rgba(232, 100, 47, 0.5)'
          ctx.shadowBlur = 4
        }
        ctx.fill()
        ctx.shadowBlur = 0
      }

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [variant, reducedMotion])

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Static Poster image fallback for zero blank flash */}
      {posterSrc && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${posterSrc})`,
            opacity: opacity
          }}
        />
      )}

      {/* Render canvas only if reduced motion is not requested */}
      {!reducedMotion && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: opacity }}
        />
      )}
    </div>
  )
}
