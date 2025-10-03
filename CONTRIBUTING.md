# 🤝 Contributing to Nargis

Thank you for your interest in contributing to Nargis! This document provides guidelines and instructions for contributing.

---

## 📋 Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

---

## Code of Conduct

This project follows a simple code of conduct:
- Be respectful and constructive
- Welcome newcomers and help them learn
- Focus on what's best for the project
- Show empathy towards other community members

---

## Getting Started

### Prerequisites
- **Bun** >= 1.2
- **Python** >= 3.12 with **uv**
- **Go** >= 1.25
- **Git** for version control

### Initial Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/divijg19/Nargis.git
cd Nargis

# 2. Install dependencies
bun install

# 3. Configure environment files
Copy the example env for the frontend and adjust values if needed:

```bash
cp apps/web/.env.example apps/web/.env.local
# edit apps/web/.env.local to change API/WS endpoints
```

# 4. Start development servers
bun run dev

# The following services will start (unless you change envs):
# - Web: http://localhost:3000
# - Python API: http://localhost:8000
# - Go WebSocket: ws://localhost:8080
```

---

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `testing`: Integration and testing
- `feature/*`: New features
- `fix/*`: Bug fixes
- `docs/*`: Documentation updates

### Making Changes

```bash
# 1. Create a new branch
git checkout -b feature/your-feature-name

# 2. Make your changes
# ... edit files ...

# 3. Run checks
bun run typecheck  # TypeScript
bun run lint       # Biome linting
bun run format     # Code formatting

# 4. Commit your changes
git add .
git commit -m "feat: add new feature"

# 5. Push to your fork
git push origin feature/your-feature-name

# 6. Open a Pull Request
```

---

## Code Style

### TypeScript/JavaScript
- Use **TypeScript** for all new code
- Follow **Biome** formatting rules (runs automatically)
- Prefer **functional components** with hooks
- Use **meaningful variable names**
- Add **JSDoc comments** for complex functions

Example:
```typescript
/**
 * Calculates the streak for a habit based on completion history
 * @param history - Array of habit entries
 * @returns The current streak count
 */
export function calculateStreak(history: HabitEntry[]): number {
  // Implementation...
}
```

### Python
- Follow **PEP 8** style guide
- Use **type hints** for all function signatures
- Write **docstrings** for modules, classes, and functions
- Keep functions **small and focused**

Example:
```python
def calculate_streak(entries: list[HabitEntry]) -> int:
    """
    Calculate habit streak from completion history.
    
    Args:
        entries: List of habit completion entries
        
    Returns:
        Current streak count
    """
    # Implementation...
```

### React Components
- One component per file
- Use **named exports**
- Props interface at the top
- Organize imports: external → internal → types → styles

Example:
```typescript
import { useState } from 'react';
import { formatDate } from '@/utils';
import type { Task } from '@/types';
import './TaskCard.css';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
}

export function TaskCard({ task, onToggle }: TaskCardProps) {
  // Implementation...
}
```

---

## Commit Guidelines

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, etc.

### Examples
```bash
feat(tasks): add priority filtering
fix(pomodoro): resolve timer countdown issue
docs(readme): update installation instructions
refactor(contexts): simplify state management
```

---

## Pull Request Process

### Before Submitting
1. ✅ Code passes `bun run typecheck`
2. ✅ Code passes `bun run lint`
3. ✅ Code is formatted with `bun run format`
4. ✅ All features work as expected
5. ✅ Documentation is updated if needed
6. ✅ Commit messages follow guidelines

### PR Template
```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process
1. Submit PR with clear description
2. Wait for automated checks to pass
3. Address review feedback
4. Maintainer will merge once approved

---

## Project Structure

### Monorepo Layout
```
Nargis/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api-py/       # FastAPI backend
│   └── api-go/       # Go WebSocket server
├── packages/
│   └── tsconfig/     # Shared TypeScript configs
└── docs/             # Documentation
```

### Frontend Structure
```
apps/web/src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   └── layout/      # Layout components
├── contexts/         # React Context providers
├── services/         # API clients
├── types/           # TypeScript types
├── utils/           # Helper functions
├── events/          # Domain event system
├── flags/           # Feature flags
└── realtime/        # WebSocket client
```

### Backend Structure
```
apps/api-py/
├── main.py          # FastAPI app
├── routers/         # API route handlers
└── storage/         # Data repositories
```

---

## Adding New Features

### Frontend Feature Checklist
- [ ] Create component in `components/ui/`
- [ ] Add types in `types/index.ts`
- [ ] Create context if needed in `contexts/`
- [ ] Add API service in `services/endpoints/`
- [ ] Update documentation
- [ ] Add to relevant page

### Backend Feature Checklist
- [ ] Create router in `routers/`
- [ ] Add repository in `storage/`
- [ ] Define request/response models
- [ ] Update API documentation
- [ ] Test endpoints

---

## Testing

### Manual Testing
```bash
# Start all services
bun run dev

# Test in browser
open http://localhost:3000

# Test API directly
curl http://localhost:8000/health
```

### Type Checking
```bash
# Check TypeScript types
bun run typecheck
```

---

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues and PRs first

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

*Thank you for contributing to Nargis! 🌸*
