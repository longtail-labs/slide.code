import React from 'react'
import BottomBar from '@/components/BottomBar/BottomBar'

type LayoutProps = {
  children?: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col h-screen w-screen bg-background">
      <div style={{ '-webkit-app-region': 'drag' } as React.CSSProperties} className="h-8 w-full" />
      <div className="flex grow overflow-hidden">{children}</div>
      <BottomBar />
    </div>
  )
}

export default Layout
