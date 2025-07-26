import React from 'react'
import BottomBar from '@/components/BottomBar/BottomBar'

type LayoutProps = {
  children?: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col h-screen w-screen bg-background relative">
      {/* Draggable area as overlay - doesn't take up layout space */}
      <div 
        style={{ '-webkit-app-region': 'drag' } as React.CSSProperties} 
        className="absolute top-0 left-0 right-0 h-8 z-50 pointer-events-auto"
      />
      {/* Non-draggable areas for window controls */}
      <div 
        style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
        className="absolute top-0 right-0 w-20 h-8 z-50"
      />
      <main className="flex-1 overflow-hidden h-full">{children}</main>
      <BottomBar />
    </div>
  )
}

export default Layout
