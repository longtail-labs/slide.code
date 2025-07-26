# widgets/app/CLAUDE.md

## Purpose
The main React-based user interface for Slide Code. This is the renderer process that users interact with, providing the visual interface for managing Claude Code tasks, viewing diffs, and accessing entertainment features.

## Tech Stack
- **React 18**: UI library with hooks
- **TypeScript**: Type-safe JavaScript
- **TanStack Router**: Type-safe routing
- **TanStack Query**: Server state management
- **shadcn/ui**: Pre-built accessible components
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast development and building

## Project Structure
- **src/app/**: Main app component
- **src/routes/**: TanStack Router routes
  - `index.tsx`: Planning screen (project selection)
  - `working/$taskId.tsx`: Working screen (active Claude Code tasks)
  - `watch.lazy.tsx`: Watch/entertainment features
  - `game.lazy.tsx`: Game integration
  - `read.lazy.tsx`: Read mode
- **src/screens/**: Main screen components
  - `Planning/`: Project creation and selection
  - `Working/`: Task management and diff viewing
- **src/components/**: Reusable UI components
  - `ui/`: shadcn/ui components
  - `BottomBar/`: Status and navigation
  - `McpSidebar/`: MCP tools sidebar
  - `GameWebviewManager.tsx`: Game webview integration
- **src/hooks/**: Custom React hooks
- **src/stores/**: Zustand stores for local state
- **src/modules/**: Feature modules (ActionBar, Auth)

## Key Features
- **Project Management**: Create/select projects via Planning screen
- **Task Tracking**: Monitor multiple Claude Code instances
- **Diff Viewer**: Real-time file change visualization
- **Chat Sidebar**: Interact with Claude Code
- **Entertainment**: Integrated music player, news reader
- **Responsive Design**: Resizable panels and mobile support

## IPC Integration
Uses three communication methods from the preload:
- `window.pubsub`: Event-based messaging
- `window.rpc`: Type-safe RPC calls
- `window.ipcRef`: Shared state synchronization

## Development Notes
- Routes are lazy-loaded for performance
- Components use shadcn/ui for consistency
- State management via TanStack Query + IPCRef
- All IPC calls go through the secure preload bridge
- Webviews managed via React components