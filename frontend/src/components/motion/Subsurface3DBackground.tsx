import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'

interface Subsurface3DBackgroundProps {
  opacity?: number
  className?: string
}

export const Subsurface3DBackground: React.FC<Subsurface3DBackgroundProps> = ({
  opacity = 0.35,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Scene, Camera, Renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 18, 42)
    camera.lookAt(0, -5, 0)

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // ── 1. Undulating 3D Bathymetric Mesh (Sonar Depth Grid) ──
    const gridWidth = 90
    const gridHeight = 70
    const segmentsW = 75
    const segmentsH = 55

    const geometry = new THREE.PlaneGeometry(gridWidth, gridHeight, segmentsW, segmentsH)
    geometry.rotateX(-Math.PI / 2.3)

    // Material with custom depth-gradient wireframe
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#1C2C3D'),
      wireframe: true,
      transparent: true,
      opacity: 0.55
    })

    const bathyMesh = new THREE.Mesh(geometry, wireframeMaterial)
    bathyMesh.position.set(0, -12, -10)
    scene.add(bathyMesh)

    // Secondary Accent Glow Grid (Thermocline & Trench ridges)
    const accentMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#E8642F'),
      transparent: true,
      opacity: 0.2
    })
    
    // ── 2. Deep Marine Particle Cloud (Suspended Subsurface Particulate) ──
    const particleCount = 140
    const particleGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    const colorNavy = new THREE.Color('#3FA7C4')
    const colorOrange = new THREE.Color('#E8642F')

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80
      positions[i * 3 + 1] = Math.random() * 35 - 15
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60

      const isWarm = Math.random() > 0.8
      const col = isWarm ? colorOrange : colorNavy
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const particleMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    })

    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // ── 3. Interactive Mouse Parallax & Scroll Depth Control ──
    let mouseX = 0
    let mouseY = 0
    let targetCameraX = 0
    let targetCameraY = 18
    let targetCameraZ = 42

    const handleMouseMove = (e: MouseEvent) => {
      const windowHalfX = window.innerWidth / 2
      const windowHalfY = window.innerHeight / 2
      mouseX = (e.clientX - windowHalfX) / windowHalfX
      mouseY = (e.clientY - windowHalfY) / windowHalfY
    }

    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const scrollFraction = Math.min(Math.max(scrollY / maxScroll, 0), 1)

      // Descend camera into depth strata as user scrolls (42 -> 16 on Z, 18 -> -2 on Y)
      targetCameraZ = 42 - scrollFraction * 24
      targetCameraY = 18 - scrollFraction * 18
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    // Animation Loop
    let animationFrameId: number
    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const originalY = new Float32Array(posAttr.count)
    for (let i = 0; i < posAttr.count; i++) {
      originalY[i] = posAttr.getY(i)
    }

    let clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      const elapsedTime = clock.getElapsedTime()

      if (!prefersReducedMotion) {
        // Undulate bathymetric ocean floor with multi-frequency waves
        for (let i = 0; i < posAttr.count; i++) {
          const u = posAttr.getX(i)
          const v = posAttr.getZ(i)
          const elevation =
            Math.sin(u * 0.12 + elapsedTime * 0.6) * 1.8 +
            Math.cos(v * 0.14 + elapsedTime * 0.5) * 1.4 +
            Math.sin((u + v) * 0.08 + elapsedTime * 0.3) * 1.0
          posAttr.setY(i, originalY[i] + elevation)
        }
        posAttr.needsUpdate = true

        // Particle subtle drift
        particles.rotation.y = elapsedTime * 0.02
        particles.rotation.x = Math.sin(elapsedTime * 0.01) * 0.02
      }

      // Smooth camera interpolation
      targetCameraX = mouseX * 6
      camera.position.x += (targetCameraX - camera.position.x) * 0.05
      camera.position.y += (targetCameraY - mouseY * 3 - camera.position.y) * 0.05
      camera.position.z += (targetCameraZ - camera.position.z) * 0.05
      camera.lookAt(0, -6, 0)

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      renderer.dispose()
      geometry.dispose()
      wireframeMaterial.dispose()
      accentMaterial.dispose()
      particleGeo.dispose()
      particleMat.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
      style={{ opacity }}
    />
  )
}
