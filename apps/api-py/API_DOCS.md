# Nargis API - Backend Documentation

## Overview

FastAPI backend for the Nargis productivity assistant. Provides REST API endpoints for tasks, habits, goals, journal, and AI integration.

## Quick Start

```bash
# Install dependencies
cd apps/api-py
uv pip install -e .

# Run development server
uvicorn main:app --reload --port 8080

# Or with environment variables
LOG_LEVEL=DEBUG uvicorn main:app --reload --port 8080
```

## API Endpoints

### Authentication (`/v1/auth`)

#### POST `/v1/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"  // optional
}
```

**Response:** `201 Created`
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

#### POST `/v1/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

#### GET `/v1/auth/me`
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2025-11-10T12:00:00Z"
}
```

### Tasks (`/v1/tasks`)

#### GET `/v1/tasks`
List all tasks for the current user.

#### POST `/v1/tasks`
Create a new task.

**Request Body:**
```json
{
  "title": "Complete project proposal",
  "description": "Write and submit the Q4 project proposal",
  "status": "pending",
  "priority": "high",
  "due_date": "2025-11-15"
}
```

#### GET `/v1/tasks/{task_id}`
Get a specific task by ID.

#### PATCH `/v1/tasks/{task_id}`
Update a task (partial update).

#### DELETE `/v1/tasks/{task_id}`
Delete a task.

### Habits (`/v1/habits`)

Similar CRUD endpoints for habit tracking:
- `GET /v1/habits` - List all habits
- `POST /v1/habits` - Create habit
- `GET /v1/habits/{habit_id}` - Get habit
- `PATCH /v1/habits/{habit_id}` - Update habit
- `DELETE /v1/habits/{habit_id}` - Delete habit

### Goals (`/v1/goals`)

CRUD endpoints for goal management:
- `GET /v1/goals` - List all goals
- `POST /v1/goals` - Create goal
- `GET /v1/goals/{goal_id}` - Get goal
- `PATCH /v1/goals/{goal_id}` - Update goal
- `DELETE /v1/goals/{goal_id}` - Delete goal

### Pomodoro Sessions (`/v1/pomodoro`)

Track focus sessions:
- `GET /v1/pomodoro` - List sessions
- `POST /v1/pomodoro` - Log session
- `GET /v1/pomodoro/{session_id}` - Get session
- `PATCH /v1/pomodoro/{session_id}` - Update session
- `DELETE /v1/pomodoro/{session_id}` - Delete session

### Journal (`/v1/journal`)

#### GET `/v1/journal`
List all journal entries (sorted newest first).

#### POST `/v1/journal`
Create a new journal entry.

**Request Body:**
```json
{
  "title": "Morning Reflection",  // optional
  "content": "Today I'm grateful for...",
  "type": "text",  // "text" | "voice"
  "mood": "great",  // "great" | "good" | "neutral" | "bad" | "terrible"
  "tags": ["gratitude", "morning"],
  "audioUrl": null  // for voice entries
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid-here",
  "title": "Morning Reflection",
  "content": "Today I'm grateful for...",
  "type": "text",
  "mood": "great",
  "tags": ["gratitude", "morning"],
  "aiSummary": "Today I'm grateful for...",
  "createdAt": "2025-11-10T09:30:00Z",
  "updatedAt": "2025-11-10T09:30:00Z"
}
```

#### POST `/v1/journal/{entry_id}/summary`
Generate or regenerate AI summary for an entry.

### AI Integration

#### POST `/api/v1/process-audio`
Process audio file for speech-to-text and LLM response.

**Request:** Multipart form with audio file

**Response:**
```json
{
  "transcript": "Create a task to write documentation",
  "llm": {
    "choices": [{
      "message": {
        "content": "I'll help you create that task..."
      }
    }]
  }
}
```

### Health Checks

#### GET `/health`
Basic health check.

**Response:**
```json
{"status": "ok"}
```

#### GET `/ready`
Readiness probe with service status.

**Response:**
```json
{
  "status": "ready",
  "sttLoaded": true,
  "ollamaClient": false,
  "sttExternalConfigured": true,
  "llmExternalConfigured": true
}
```

## Environment Variables

```bash
# Core API
PORT=8080
LOG_LEVEL=INFO
ALLOWED_ORIGINS=http://localhost:3000,https://app.nargis.ai

# Authentication
JWT_SECRET_KEY=your-secret-key-here

# AI Services
DEEPGRAM_API_KEY=your-deepgram-key
GROQ_API_KEY=your-groq-key
STT_URL=https://api.deepgram.com/v1/listen
LLM_URL=https://api.groq.com/openai/v1/chat/completions

# Optional
TTS_URL=https://api.elevenlabs.io/v1/text-to-speech
TTS_API_KEY=your-elevenlabs-key
PRELOAD_STT=false
```

## Authentication Flow

1. **Register** or **Login** to get JWT token
2. Include token in subsequent requests:
   ```
   Authorization: Bearer <access_token>
   ```
3. Token expires after 7 days
4. Refresh by logging in again

## Storage

**V1 Implementation:**
- In-memory storage (no persistence)
- Data resets on server restart
- Thread-safe with locks
- Idempotency support for POST requests

**V2 Migration Path:**
- PostgreSQL database
- SQLAlchemy ORM
- Alembic migrations
- User data isolation

## Development

```bash
# Install with dev dependencies
uv pip install -e '.[ml]'  # Include ML dependencies

# Run tests (when added)
pytest

# Type checking
mypy main.py routers/ services/ storage/

# Format code
black .
isort .
```

## API Design Principles

1. **RESTful conventions**: Standard HTTP methods and status codes
2. **Consistent response format**: All resources follow same structure
3. **Error handling**: Detailed error messages with codes
4. **Idempotency**: POST requests support `Idempotency-Key` header
5. **CORS**: Configurable origins for frontend integration
6. **Logging**: Structured logging with request IDs

## Next Steps

- [ ] Add PostgreSQL database integration
- [ ] Implement user-scoped data isolation
- [ ] Add rate limiting
- [ ] Implement refresh tokens
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Add integration tests
- [ ] Deploy to production (Fly.io/Railway)
