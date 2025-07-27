# Slide Code

**A Graphical Vibe Coding Environment (VCE) for Claude Code**

[Join our Discord](https://discord.gg/2RgudA7g) • [Download Latest Release](https://github.com/your-username/slide-code/releases)

---

## 📸 Screenshots

<div align="center">
  
  ### 🎯 Main Interface
  
  <img src=".screenshots/action-bar.png" alt="Action Bar" width="90%" />
  <p><em>Action Bar - Command Center</em></p>
  
  <br/>
  
  <img src=".screenshots/running.png" alt="Home Light Mode" width="90%" />
  <p><em>Home - Light Mode</em></p>
  
  <br/>
  
  ### 🎨 Features & Modes
  
  <table>
    <tr>
      <td width="50%">
        <img src=".screenshots/home-dark.png" alt="Home Dark Mode" width="100%" />
        <p align="center"><em>Home - Dark Mode</em></p>
      </td>
      <td width="50%">
        <img src=".screenshots/working.png" alt="Claude Code Working" width="100%" />
        <p align="center"><em>Claude Code Working</em></p>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <img src=".screenshots/watching.png" alt="Diff Watching" width="100%" />
        <p align="center"><em>Watching TBPN while coding</em></p>
      </td>
      <td width="50%">
        <img src=".screenshots/reading.png" alt="Reading Mode" width="100%" />
        <p align="center"><em>Reading Mode</em></p>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <img src=".screenshots/settings.png" alt="Settings" width="100%" />
        <p align="center"><em>Settings and Usage</em></p>
      </td>
      <td width="50%">
        <img src=".screenshots/playtime.png" alt="Playtime" width="100%" />
        <p align="center"><em>Playtime</em></p>
      </td>
    </tr>
    <tr>
      <td width="50%">
        <img src=".screenshots/game.png" alt="Game Integration" width="100%" />
        <p align="center"><em>Game Integration</em></p>
      </td>
      <td width="50%">
        <img src=".screenshots/mcp.png" alt="MCP Integration" width="100%" />
        <p align="center"><em>MCP Integration</em></p>
      </td>
    </tr>
  </table>
  
</div>

Slide Code is a intuitive desktop application that ideally makes it a bit easier to run multiple Claude Code agents at once

## ✨ Features

### 🎯 **Effortless Project Management**

- **One-Click Project Creation**: Create new projects instantly or select existing ones, no Github integration required
- **Vibe Directory**: Automatically organizes all your projects in a dedicated vibe folder
- **Multi-Task Execution**: Run multiple Claude Code tasks simultaneously 
- **Session Persistence**: Resume your coding sessions anytime, anywhere

### 🎵 **Vibe While You Code**

- **Integrated Music Player**: Stream from SomaFM while coding 
- **TBPN Channel**: Keep up to date with the latest tech news directly in the VCE
- **Hacker News Reader**: Keep up to date with the latest tech news without leaving your flow
- **Play a massive multiplayer game**: Play a Splatoon inspired multiplayer game where you compete automatically to take over the grid

### 🔧 **Powerful Development Tools**

- **Real-time Diff Viewer**: See exactly what changes Claude Code is making
- **Git Integration**: Quickly commit your (AI generated) changes
- **Task Tracking**: Monitor multiple concurrent tasks
- **Notifications**: Get native OS alerts when tasks complete, fail, or are cancelled
- **Comment System**: Add notes and feedback directly to your diffs
- **Usage Analytics**: Track your Claude Code usage, costs, and token consumption at a glance

### 🎨 **Beautiful UI/UX**

- **Modern Design**: Clean, intuitive interface built with shadcn/ui
- **Dark/Light Mode**: Switch themes to match your preference

## 🚀 Quick Start

### Prerequisites

- **Claude Code CLI**: Follow the setup guide at [docs.anthropic.com/en/docs/claude-code/setup](https://docs.anthropic.com/en/docs/claude-code/setup)

### Getting Started

1. **Launch Slide Code**: Open the application after installation
2. **Create or Select a Project**: 
   - Click "Create New Project" for a fresh start
   - Or "Select Existing Project" to work with existing code
3. **Give it a Prompt**: Describe what you want to build
4. **Watch the Magic**: Claude Code starts working while you vibe to your favorite tunes

## 🏗️ Tech Stack

### **Desktop Application**

- **Electron**: Cross-platform desktop framework
- **React**: Modern UI library with hooks
- **TypeScript**: Type-safe JavaScript
- **Effect-TS**: Functional programming for robust async operations
- **Drizzle ORM**: Type-safe database operations
- **SQLite/Turso**: Local and cloud database support
- **shadcn/ui**: Beautiful, accessible UI components
- **Tailwind CSS**: Utility-first CSS framework
- **ccusage**: Claude Code usage tracking
- **Claude Code SDK**: Official SDK for Claude Code integration

### **Game Server** (`/game`)

- **Go**: High-performance backend language
- **Templ**: Type-safe HTML templating
- **Datastar**: Reactive frontend framework
- **NATS.io**: Cloud-native messaging system

## 🔄 Roadmap

### **Coming Soon**

- [ ] **Git Worktrees**: Isolated development branches
- [ ] **Plugin System**: Extend functionality with custom plugins
- [ ] **Team Collaboration**: Share projects and sessions
- [ ] **MCP Powered Game**: Write code and control bots that play the game while coding

## 🛠️ Development

### **Quick Start**

```bash
# Clone the repository
git clone https://github.com/longtail-labs/slide.code
cd slide-code

# Install dependencies
npm install

# Start the Electron app
npm run start:app
```

### **Architecture Overview**

```bash
slide-code/
├── apps/                 # Electron main & preload processes
├── packages/
│   ├── clients/         # API clients & React hooks
│   ├── core/            # Core business logic with Effect-TS
│   ├── db/              # Database layer with Drizzle ORM
│   └── schema/          # Type definitions & schemas
├── widgets/app/         # React frontend (main UI)
├── game/               # Go game server (BitSplat)
└── bundled_modules/    # Native dependencies (LibSQL)
```

### **Development Commands**

#### **Electron App**

```bash
npm install              # Install all dependencies
npm run start:app       # Start Electron app in development
npm run build           # Build for production
```

#### **Game Server**

```bash
cd game
make setup              # Install Go tools and dependencies
make dev                # Start development server with hot reload
make build              # Build production binary
make clean              # Clean build artifacts
```

#### **Database**

```bash
npm run db:migrate:generate  # Generate new migration
npm run db:migrate:apply     # Apply migrations
npm run studio              # Open Drizzle Studio
```

### **Development Workflow**

1. **Start the Electron app**: `npm run start:app`
2. **Start the game server** (optional): `cd game && make dev`
3. **Make changes**: Edit files in `widgets/app/src/` for UI, `packages/core/src/` for logic
4. **Hot reload**: Changes automatically reload in development


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## 🌟 Support

- ⭐ **Star this repo** if you find it useful
- 🐛 **Report bugs** via GitHub Issues
- 💬 **Chat with us & Request features** on [Discord](https://discord.gg/2RgudA7g)
- 🐦 **Follow me** on Twitter [@jonovono](https://x.com/jonovono)
