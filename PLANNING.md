# 📋 Project Planning – Nargis

## Vision Statement

**Nargis** is an AI-powered productivity platform that combines task management, habit tracking, and intelligent assistance into a seamless, voice-enhanced experience. Built to showcase modern full-stack development with real-time architecture and AI/ML integration.

---

## Project Goals

### Primary Objectives
1. **Portfolio Showcase**: Demonstrate full-stack + AI/ML engineering capabilities
2. **Real-World Utility**: Build a tool that's genuinely useful for personal productivity
3. **Modern Patterns**: Implement current best practices in web development
4. **Scalable Architecture**: Design for future growth and feature expansion

### Technical Goals
- Master Next.js 15 with App Router and React Server Components
- Build production-grade FastAPI services
- Implement real-time features with WebSockets
- Integrate AI/ML models (Whisper, LLMs) effectively
- Demonstrate polyglot architecture (TypeScript, Python, Go)

---

## Target Audience

### Primary Users
- **Self**: Personal productivity tool for daily use
- **Recruiters**: Technical showcase for job applications
- **Developers**: Open-source inspiration and learning resource

### User Personas

#### Persona 1: Busy Professional
- Needs quick task capture and organization
- Values streak tracking for habit building
- Uses Pomodoro for focused work sessions
- Wants insights into productivity patterns

#### Persona 2: Developer/Student
- Needs project and learning task management
- Tracks coding habits and study sessions
- Uses timer for deep work
- Interested in AI-powered suggestions

---

## Feature Roadmap

### ✅ Phase 1: Core MVP (Complete)

#### Features
- Task management with CRUD operations
- Habit tracking with streaks
- Pomodoro timer with sessions
- Dashboard with stats
- Theme support (light/dark)
- Toast notifications
- Domain event system
- Voice transcription (Whisper)
- AI chat (Ollama)

#### Technical Achievements
- Monorepo with Turborepo
- Type-safe full-stack
- Event-driven architecture
- Optimistic UI patterns
- Accessibility foundations

---

### 🔨 Phase 2: Data Persistence (Partially Complete)

#### Planned Features
- PostgreSQL database integration
- User authentication
- Multi-user support
- Data migrations
- Backup and export

#### Technical Goals
- ORM integration (Prisma/SQLAlchemy)
- Connection pooling
- Transaction management
- Security hardening
- Environment configuration

---

### 📅 Phase 3: Enhanced AI (Ongoing)

#### Planned Features
- **Natural Language Task Creation**: "Remind me to call mom tomorrow at 2pm"
- **Voice-Driven Workflow**: Hands-free task and habit management
- **AI Coaching**: Personalized productivity insights
- **Smart Prioritization**: AI-suggested task ordering
- **Habit Insights**: Pattern detection and recommendations
- **Context-Aware Responses**: AI remembers your goals and preferences

#### Technical Goals
- Streaming LLM responses
- Text-to-Speech integration
- Vector embeddings for semantic search
- RAG for personalized context
- Fine-tuned models for productivity domain

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                     User Interfaces                     │
│  Web App (Next.js) │ Mobile PWA │ Voice Interface       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   API Gateway Layer                     │
│        WebSocket Server (Go) │ REST API (FastAPI)      │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Business Logic Layer                  │
│  Task Service │ Habit Service │ Pomodoro Service        │
│  Event Dispatcher │ Feature Flags                       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      Data Layer                         │
│  PostgreSQL │ Redis Cache │ File Storage                │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   External Services                     │
│  Whisper STT │ Ollama LLM │ Calendar APIs               │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

#### 1. Event-Driven Architecture
- All state changes emit domain events
- Loose coupling between features
- Easy to add observers and side effects
- Natural audit trail

#### 2. Optimistic UI
- Instant feedback for user actions
- Background synchronization
- Conflict resolution strategies
- Graceful error recovery

#### 3. Feature Flags
- Progressive rollout of features
- A/B testing capabilities
- Easy rollback mechanism
- Per-user or percentage-based

#### 4. Type Safety
- End-to-end TypeScript
- Shared type definitions
- Runtime validation with Pydantic
- OpenAPI schema generation

#### 5. Accessibility First
- WCAG AA compliance target
- Keyboard navigation
- Screen reader support
- High contrast modes

---

## Technical Decisions

### Why Monorepo?
- **Shared code**: Types, utilities, configs
- **Atomic commits**: Change frontend + backend together
- **Consistent tooling**: Single lint/format/test setup
- **Easy refactoring**: IDE understands full codebase

### Why Context API over Redux?
- **Built-in**: No extra dependencies
- **Sufficient scale**: App isn't overly complex
- **Modern patterns**: Hooks + reducers provide Redux-like patterns
- **Performance**: Context + memo handles our use case well

### Why In-Memory First?
- **Fast iteration**: No DB setup during prototyping
- **Clear interfaces**: Repository pattern makes swap easy
- **Easy testing**: No DB mocking needed initially
- **Migration path**: Well-defined when ready for PostgreSQL

### Why Lazy Load Whisper?
- **Startup speed**: Dev server starts instantly
- **Memory efficiency**: 2GB+ model only loaded when needed
- **Better DX**: Iterate on UI without waiting for model
- **Production ready**: Same pattern works in prod

---

## Success Criteria

### MVP Success (✅ Achieved)
- [x] Working task/habit/pomodoro features
- [x] Voice transcription functional
- [x] AI chat responding
- [x] Real-time updates
- [x] Clean, accessible UI
- [x] Type-safe codebase

### Production Success (🎯 Target)
- [ ] 500+ lines of test coverage
- [ ] Database persistence
- [ ] User authentication
- [ ] Deployed and accessible online
- [ ] < 100ms API response time
- [ ] Lighthouse score > 90
- [ ] 10+ GitHub stars
- [ ] Featured on personal portfolio

### Career Success (🎯 Target)
- [ ] Landed job interviews mentioning project
- [ ] Demonstrated in technical interviews
- [ ] Referenced in resume/cover letters
- [ ] Contributed to open-source community
- [ ] Learned and shipped AI/ML in production

---

## Risk Management

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI model costs | High | Use local Ollama, cache responses |
| WebSocket scaling | Medium | Start simple, add Redis pub/sub later |
| Database performance | Medium | Proper indexing, query optimization |
| Complex state management | Low | Keep contexts focused, use events |

### Scope Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Feature creep | High | Strict sprint planning, MVP focus |
| Over-engineering | Medium | Build for today, not future scale |
| Perfectionism | Medium | Ship early, iterate based on feedback |
| Burnout | Low | Consistent pace, celebrate wins |

---

## Learning Objectives

### Core Skills to Develop
- ✅ Next.js 15 App Router
- ✅ React 19 patterns
- ✅ Tailwind CSS v4
- ✅ FastAPI async patterns
- ✅ WebSocket real-time communication
- ✅ AI/ML model integration
- ⏳ PostgreSQL design
- ⏳ Authentication & security
- ⏳ Production deployment
- ⏳ Monitoring & observability

### Soft Skills
- Product thinking and prioritization
- Technical documentation
- Code organization at scale
- Performance optimization
- User experience design

---

## Timeline Summary

| Phase | Status | Key Deliverable |
|-------|----------|--------|-----------------|
| Phase 1: MVP | ✅ Complete | Working productivity suite |
| Phase 2: Persistence | 🔨 Current | Database integration |
| Phase 3: Enhanced AI | 📅 Planned | Voice-driven workflows |
| Phase 4: Polish | 📅 Planned | Production-ready |
