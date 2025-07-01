import React from 'react'
import BottomBar from '@/components/BottomBar/BottomBar'

type LayoutProps = {
  children?: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col h-screen w-screen bg-background">
      <div style={{ '-webkit-app-region': 'drag' } as React.CSSProperties} className="h-8 w-full" />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <BottomBar />
    </div>
  )
}

export default Layout
