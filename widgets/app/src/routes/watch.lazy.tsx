import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/watch')({
  component: WatchPage
})

function WatchPage() {
  return (
    <div className="flex-1 w-full h-full">
      {/* 
        The actual webview is managed by WatchWebviewManager and is positioned
        absolutely. This component is just a placeholder for the route.
      */}
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold">TV is loading...</h1>
        <p>If you don't see anything, there might be an issue.</p>
      </div>
    </div>
  )
}
