import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DiffViewer } from './DiffViewer'
import { useTaskDiff } from '@slide.code/clients'
import type { TaskWithMessages } from '@slide.code/schema'

interface CenterPanelProps {
  task: TaskWithMessages
}

function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 select-text">
      <span className="font-semibold">{title}</span>
    </div>
  )
}

export function CenterPanel({ task }: CenterPanelProps) {
  // Fetch the diff for this task
  const { data: diffText, isLoading: isDiffLoading, error: diffError } = useTaskDiff(task.id)

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={100}>
        <Tabs defaultValue="diff" className="h-full flex flex-col select-text">
          <div className="p-2">
            <div className="mb-2">
              <TabsList>
                <TabsTrigger value="diff">Diff</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="terminal">Terminal</TabsTrigger>
              </TabsList>
            </div>
          </div>
          <TabsContent value="diff" className="flex-1 overflow-auto">
            <DiffViewer diffText={diffText as string} isLoading={isDiffLoading} error={diffError} />
          </TabsContent>
          <TabsContent value="preview" className="flex-1">
            <PlaceholderView title="Preview capabilities coming soon" />
          </TabsContent>
          <TabsContent value="terminal" className="flex-1">
            <PlaceholderView title="Terminal capabilities coming soon" />
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
