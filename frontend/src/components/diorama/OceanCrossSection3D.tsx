import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getThermalRgba } from '../../utils/colormap'

// Persistent dummy for matrix calculations
const dummy = new THREE.Object3D()

// Generate sample vertical cross-section along 15°N (40 lon points x 15 depth levels)
function CrossSectionMesh({ isHovered }: { isHovered: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // 15 depths
  const depths = [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000]
  const numLon = 40
  const numDepths = depths.length
  const count = numLon * numDepths

  const instances = useMemo(() => {
    const data: { position: [number, number, number]; color: THREE.Color }[] = []
    
    for (let d = 0; d < numDepths; d++) {
      const depthVal = depths[d]
      // Logarithmic vertical placement so surface layers are spread out
      const y = - (Math.log10(Math.max(1, depthVal) + 1) / Math.log10(1001)) * 3.5

      for (let l = 0; l < numLon; l++) {
        const x = (l - numLon / 2) * 0.18

        // Realistic temperature gradient with internal thermocline wave
        const sst = 28.5 + Math.sin(l * 0.2) * 0.8
        let temp: number
        if (depthVal <= 30) {
          temp = sst - depthVal * 0.02
        } else if (depthVal <= 150) {
          const wave = Math.sin(l * 0.3) * 1.8
          temp = 27.5 - (depthVal - 30) * 0.11 + wave
        } else {
          temp = 14.2 * Math.exp(-(depthVal - 150) / 380) + 5.5
        }

        const [r, g, b] = getThermalRgba(temp, 5.0, 30.0)
        const color = new THREE.Color(`rgb(${r}, ${g}, ${b})`)
        data.push({ position: [x, y, 0], color })
      }
    }
    return data
  }, [])

  // Initialize instance matrices & colors ONCE
  useEffect(() => {
    if (!meshRef.current) return

    instances.forEach((inst, i) => {
      dummy.position.set(...inst.position)
      dummy.scale.set(0.16, 0.18, 0.4)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
      meshRef.current!.setColorAt(i, inst.color)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  }, [instances])

  // Only update rotation per frame — no matrix recalculation
  useFrame((_state, delta) => {
    if (groupRef.current && !isHovered) {
      groupRef.current.rotation.y += delta * 0.08
    }
  })

  return (
    <group ref={groupRef} position={[0, 1.2, 0]}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.6} metalness={0.1} />
      </instancedMesh>
    </group>
  )
}

export const OceanCrossSection3D: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="instrument-card p-3 flex flex-col items-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-[180px] h-[100px] relative bg-[#060B12] border border-[#1C2C3D] overflow-hidden">
        {/* Geological Core Sample Texture Layer (B.2 #6, opacity ~15%) */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-15 bg-cover bg-center brand-image"
          style={{ backgroundImage: `url('/assets/generated/cross-section-geology-bg.jpg')` }}
        />

        <Canvas 
          camera={{ position: [0, 1, 5], fov: 45 }}
          style={{ width: '100%', height: '100%', position: 'relative', zIndex: 10 }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 10, 5]} intensity={1.2} />
          <CrossSectionMesh isHovered={isHovered} />
        </Canvas>
      </div>

      <span className="font-mono text-[10px] text-[#5C7086] mt-2 tracking-tight">
        Cross-section · 15°N · Jan 2025
      </span>
    </div>
  )
}
