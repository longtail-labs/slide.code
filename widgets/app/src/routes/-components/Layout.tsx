import React from 'react'

type LayoutProps = {
  children?: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col h-screen w-screen bg-background">
      <div className="flex grow overflow-hidden">{children}</div>
    </div>
  )
}

export default Layout
