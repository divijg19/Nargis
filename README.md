# 🌸 Nargis – AI-Powered Productivity Platform

**Nargis** is a modern **AI productivity companion** that unifies **task management, habit tracking, Pomodoro timer, and voice-powered insights** into one cohesive platform.

Built as a **full-stack TypeScript + Python + Go** showcase demonstrating real-time architecture, domain-driven design, and AI/ML integration patterns.

---

## 🚀 Core Philosophy
- **Modern web-first**: Built with Next.js 15, React 19, and Tailwind CSS v4
- **Real-time by design**: WebSocket-powered live updates and event-driven architecture
- **AI-enhanced**: Voice transcription (Whisper), intelligent chat (Ollama), and contextual insights
- **Developer-friendly**: Type-safe, well-documented, and production-ready patterns

---

## 🛠️ Current Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS v4 + CSS custom properties
- **State**: React Context API with optimistic updates
- **Real-time**: WebSocket connections with auto-reconnect
- **Icons**: Heroicons v2

### Backend
- **Python API**: FastAPI + uvicorn (async ASGI)
  - Speech-to-Text: OpenAI Whisper (lazy-loaded)
  - LLM Integration: Ollama (local) / OpenAI-compatible
  - REST endpoints: Tasks, Habits, Pomodoro CRUD
- **Go WebSocket**: Real-time streaming bridge (port 8080)
- **Storage**: In-memory repositories (PostgreSQL ready)

### Infrastructure
- **Monorepo**: Turborepo + Bun workspaces
- **Linting**: Biome (unified JS/TS/JSON formatter)
- **Type Safety**: Shared TypeScript configs across apps
- **Dev Tools**: Concurrent dev servers, hot reload

---

## ✨ Implemented Features

### ✅ Core Productivity Suite
- **Task Management**: Full CRUD with priority, status, tags, due dates
- **Habit Tracking**: Daily/weekly habits with streak counting and progress visualization
- **Pomodoro Timer**: Configurable work/break cycles with session history and crash recovery
- **Dashboard**: Real-time overview with stats cards and activity previews

### ✅ Real-Time & Events
- **Toast Notifications**: Context-aware success/error/info feedback system
- **Domain Events**: Event dispatcher for cross-context communication
- **WebSocket Connection**: Auto-reconnecting realtime bridge (feature-flagged)
- **Optimistic Updates**: Instant UI feedback with backend sync

### ✅ AI Integration
- **Voice Transcription**: Whisper-based STT with lazy model loading
- **AI Chat**: Local Ollama integration with OpenAI-compatible interface
- **Context Awareness**: Feature flag system for progressive AI enhancement

### ✅ Developer Experience
- **Type Safety**: End-to-end TypeScript with shared type definitions
- **Accessibility**: ARIA roles, keyboard navigation, skip links, focus management
- **Theme Support**: Light/dark mode with system preference detection
- **Error Handling**: Comprehensive error boundaries and fallback UI

---

## 🏗️ Project Structure

```
Nargis/
├── apps/
│   ├── web/                 # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/        # App Router pages
│   │   │   ├── components/ # React components
│   │   │   ├── contexts/   # State management
│   │   │   ├── services/   # API clients
│   │   │   ├── types/      # TypeScript definitions
│   │   │   ├── utils/      # Helpers
│   │   │   ├── events/     # Domain events
│   │   │   ├── flags/      # Feature flags
│   │   │   └── realtime/   # WebSocket client
│   │   └── global.d.ts     # Ambient declarations
│   ├── api-py/             # FastAPI backend
│   │   ├── main.py         # Server entry point
│   │   ├── routers/        # REST endpoints
│   │   ├── storage/        # Data repositories
│   │   └── pyproject.toml  # Python dependencies
│   └── api-go/             # Go WebSocket server
│       ├── main.go         # WebSocket handler
│       └── go.mod          # Go dependencies
├── packages/
│   └── tsconfig/           # Shared TypeScript configs
│       ├── base.json       # Base TS settings
│       └── nextjs.json     # Next.js preset
├── docs/                   # Documentation
└── package.json            # Workspace root
```

---

## 🚀 Getting Started

### Prerequisites
- **Bun** >= 1.2 (JavaScript runtime & package manager)
- **Python** >= 3.12 with **uv** (fast Python package manager)
- **Go** >= 1.25 (for WebSocket server)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/divijg19/Nargis.git
cd Nargis

# Install dependencies
bun install

# Start all services concurrently
bun run dev

# Or start individually:
bun run dev:web      # Next.js on http://localhost:3000
bun run dev:api-py   # FastAPI on http://localhost:8000
bun run dev:api-go   # Go WebSocket on ws://localhost:8080
```

### Available Commands

```bash
bun run dev          # Start all services
bun run build        # Build all apps
bun run typecheck    # Type-check TypeScript
bun run lint         # Lint with Biome
bun run format       # Format code with Biome
bun run clean        # Clean build artifacts
```

---

## 🚧 Roadmap

### Phase 1: Foundation (✅ Complete)
- [x] Monorepo setup with Turborepo
- [x] Next.js frontend with App Router
- [x] FastAPI backend with async endpoints
- [x] Go WebSocket server
- [x] Context-based state management
- [x] Toast notification system
- [x] Domain event dispatcher
- [x] Accessibility improvements

### Phase 2: Enhanced AI (🔨 In Progress)
- [x] Whisper STT integration
- [x] Ollama LLM integration
- [ ] Streaming chat responses
- [ ] Voice-to-task natural language processing
- [ ] AI-powered habit insights and coaching
- [ ] Smart task prioritization

### Phase 3: Persistence & Sync
- [ ] PostgreSQL integration with Prisma/SQLAlchemy
- [ ] Redis for caching and sessions
- [ ] Real-time collaboration features
- [ ] Offline-first with service workers
- [ ] Cross-device sync

### Phase 4: Integrations
- [ ] Google Calendar sync
- [ ] Notion export/import
- [ ] Slack notifications
- [ ] Mobile PWA enhancements

---

## 🎯 Design Principles

### Architecture
- **Event-driven**: Domain events for loose coupling
- **Optimistic UI**: Instant feedback, eventual consistency
- **Feature flags**: Progressive enhancement and A/B testing
- **Type-safe**: End-to-end TypeScript contracts

### Code Quality
- **Biome**: Fast, unified linting and formatting
- **Strict TypeScript**: No implicit any, full type coverage
- **Accessibility-first**: WCAG AA compliance target
- **Modern patterns**: React 19 features, async/await, ES modules

---

## 📚 Documentation

- [Planning & Vision](./docs/PLANNING.md)
- [Sprint Roadmap](./docs/SPRINTS.md)
- [Tech Stack Details](./docs/TECHSTACK.md)
- [AI Agent Guidelines](./AGENTS.md)

---

## 📋 Recent Updates

### Phase 1: Critical UX Improvements (2025-01-XX)
- **✅ Fixed Toast Positioning**: Moved toasts from bottom to top to prevent footer overlap
- **✅ Modal System**: Created accessible `Modal`, `TaskModal`, and `HabitModal` components with:
  - Full keyboard navigation (Escape to close)
  - ARIA roles and labels for screen readers
  - Form validation with error messages
  - Backdrop click-to-close
- **✅ Action Buttons Wired**: All placeholder console.logs replaced with real functionality:
  - Dashboard quick actions now create tasks/habits and navigate to Pomodoro
  - Task and Habit pages have working creation modals
  - Habit increment buttons fully functional
- **✅ Code Cleanup**: Removed all console.log statements and debug code
- **✅ Documentation**: Cleaned up temporary audit files, keeping only essential docs

---

## 🤝 Contributing

This is currently a personal portfolio project, but suggestions and feedback are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - feel free to use this project for learning and inspiration.

---

## 👤 Author

**Divij Ganjoo**  
Aspiring Solutions Architect & Backend + AI/ML Engineer

- Portfolio: [Lys](https://divijganjoo.me)
- LinkedIn: [divij-ganjoo](https://linkedin.com/in/divij-ganjoo)
- GitHub: [@divijg19](https://github.com/divijg19)

---

## 🌟 Acknowledgments

- **Next.js Team** for the incredible React framework
- **FastAPI** for elegant Python async APIs
- **Tailwind CSS** for utility-first styling
- **OpenAI** for Whisper and inspiration
- **Vercel** for Next.js and deployment platform

---

*Built with ❤️ and ☕ as a demonstration of modern full-stack development with AI/ML integration.*
