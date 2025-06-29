import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DiffViewer } from './DiffViewer'

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 select-text">
      <span className="font-semibold">{title}</span>
    </div>
  )
}

export function CenterPanel() {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={100}>
        <Tabs defaultValue="diff" className="h-full flex flex-col select-text">
          <div className="p-2">
            <TabsList>
              <TabsTrigger value="diff">Diff</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="terminal">Terminal</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="diff" className="flex-1 overflow-auto">
            <DiffViewer />
          </TabsContent>
          <TabsContent value="preview" className="flex-1">
            <PlaceholderView title="Preview" />
          </TabsContent>
          <TabsContent value="terminal" className="flex-1">
            <PlaceholderView title="Terminal" />
          </TabsContent>
        </Tabs>
      </ResizablePanel>
      {/* <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <PlaceholderView title="Second Panel (e.g. Browser)" />
      </ResizablePanel> */}
    </ResizablePanelGroup>
  )
}
