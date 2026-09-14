import React, { useEffect, useState } from 'react'

interface PageRevealProps {
  children: (stage: { bgReady: boolean; headerReady: boolean; contentReady: boolean }) => React.ReactNode
}

export const PageReveal: React.FC<PageRevealProps> = ({ children }) => {
  const [bgReady, setBgReady] = useState(false)
  const [headerReady, setHeaderReady] = useState(false)
  const [contentReady, setContentReady] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setBgReady(true)
      setHeaderReady(true)
      setContentReady(true)
      return
    }

    // Beat 1: Background fades in (0ms)
    setBgReady(true)

    // Beat 2: Heading + subhead blur-in & slide up (starting at 50ms, lasting 500ms)
    const headerTimer = setTimeout(() => {
      setHeaderReady(true)
    }, 50)

    // Beat 3: Content below fades up as one group (starting 150ms after heading, lasting 400ms)
    const contentTimer = setTimeout(() => {
      setContentReady(true)
    }, 200)

    return () => {
      clearTimeout(headerTimer)
      clearTimeout(contentTimer)
    }
  }, [])

  return (
    <>
      {children({ bgReady, headerReady, contentReady })}
    </>
  )
}
