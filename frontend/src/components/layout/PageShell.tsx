import React from 'react'

interface PageShellProps {
  children: React.ReactNode
  className?: string
}

export function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div className={`mx-auto w-full max-w-[1400px] px-6 md:px-12 lg:px-20 ${className}`}>
      {children}
    </div>
  )
}
