# Planning

## Vision

Nargis is an AI-powered productivity platform that combines task management, habit tracking, journaling, and voice-driven assistance into one cohesive experience. It is intended to be both genuinely useful day to day and a strong showcase of modern full-stack engineering.

## Why This Project Exists

- Build a portfolio-quality product that demonstrates frontend, backend, realtime, and AI integration skills together
- Create a tool that is personally useful rather than a purely synthetic demo
- Practice modern product and platform patterns in a real monorepo
- Leave room for future growth without turning the current codebase into speculation-heavy architecture

## Audience

- Primary: personal daily use
- Secondary: recruiters and hiring teams evaluating engineering depth
- Tertiary: developers exploring patterns for polyglot, AI-enabled applications

## Product Goals

- Make capture and organization fast enough to work with voice-first flows
- Support core productivity workflows: tasks, habits, journaling, and focus sessions
- Keep the user experience responsive and approachable even when backend systems are cold or degraded
- Build in a way that stays understandable for future contributors

## Technical Goals

- Demonstrate a production-minded monorepo with shared tooling and clear service boundaries
- Use the right language/runtime for each subsystem instead of forcing a single-stack design
- Favor thin transport layers and reusable service/domain logic
- Keep testing and local development practical enough to iterate quickly

## Success Criteria

### Product

- Core workflows are useful without requiring complex setup
- Voice and AI features improve capture and assistance rather than feeling bolted on
- The project remains understandable enough to demo and discuss clearly

### Engineering

- Local development is straightforward
- The main subsystems can evolve independently without losing integration clarity
- Quality checks are easy to run and hard to forget
- Documentation explains intent, system design, and delivery status without duplication

## Guiding Principles

- Build for the current stage, not imagined scale
- Prefer clarity and leverage over maximal abstraction
- Keep operational knowledge documented where people will actually look for it
- Let product intent, architecture, and roadmap live in separate documents so each can stay concise
