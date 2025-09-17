# 🌸 Nargis – AI-Powered Productivity Manager

**Nargis** is a real-time **AI productivity companion** that unifies **voice chat, journaling, task management, habit tracking, and productivity insights** into one adaptive platform.  
It integrates with **web dashboards and spreadsheets**, ensuring that **voice, text, and sheet edits all share one unified context**.  

Think of Nargis as your **AI-powered life operating system** — voice-first, context-aware, and always in sync.

---

## 🚀 Core Philosophy
- **Voice-first**: Interact naturally with Nargis via real-time voice conversations.  
- **Unified context**: Tasks, journals, and habits stay in sync across voice, web, and spreadsheets.  
- **AI-native**: Intelligent insights, adaptive coaching, and context-aware assistance.  
- **Personal utility, portfolio strength**: Useful in daily life and an impressive full-stack + AIML showcase.

---

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Tailwind, WebSockets/GraphQL  
- **Backend**: FastAPI (Python) + Go (real-time services)  
- **Event Bus**: Redis Streams / NATS  
- **Database**: PostgreSQL (core), TimescaleDB (metrics), Redis (cache/context)  
- **AI Services**:
  - Speech-to-Text (STT): Whisper / Coqui  
  - Text-to-Speech (TTS): ElevenLabs / Coqui / Piper  
  - LLM: OpenAI / Anthropic / Local model  
- **Integrations**: Google Sheets, Notion, Google Calendar  

---

## ✨ Feature List

### 🎙️ Real-Time Voice Chat (Core)
- Bi-directional **voice conversation** with Nargis (WebRTC/gRPC streaming).  
- **Low-latency STT → LLM → TTS** pipeline.  
- Wake word activation: “Hey Nargis”.  
- Context-aware, multi-turn conversations.  
- Unified memory: updates tasks, journals, and habits directly via conversation.  

---

### 📓 Journaling & Reflection
- Dictate journal entries via voice or type in dashboard.  
- Sentiment & mood tagging using NLP.  
- AI-generated **summaries & highlights**.  
- Pattern detection: recurring topics, mood shifts, personal growth tracking.  
- Exportable to Google Sheets / Notion with AI summaries.  
- Voice playback: “Read me last week’s journal summary.”  

---

### ✅ Task & To-Do Management
- Add, edit, or delete tasks via **voice, web, or sheet**.  
- Natural language input: “Remind me to submit my essay on Friday.”  
- Smart AI **categorization & prioritization** (urgent vs important).  
- Dependencies, sub-tasks, recurring tasks.  
- Real-time sync with Google Sheets & Notion.  
- Daily AI-generated **focus list**.  

---

### 🔄 Habit Tracking
- Define daily/weekly habits (exercise, reading, coding, etc).  
- Voice check-ins: “I finished my workout.”  
- Habit streaks + consistency visualizations.  
- AI habit coach: identifies weak spots, optimal times, motivational nudges.  
- Automatic sync to Google Sheets (habit logs).  

---

### 📊 Productivity Metrics & Insights
- Dashboard analytics:  
  - Task completion rates.  
  - Habit streaks.  
  - Journaling frequency.  
  - Time allocation (work vs personal).  
- AI insights:  
  - “You’re most productive in mornings.”  
  - “You tend to miss tasks after late meetings.”  
- Weekly reports: **voice summaries + exportable reports**.  

---

### 🤝 Collaboration (Optional/Future)
- Share task lists or habit challenges with friends.  
- AI-generated summaries for meetings & shared journals.  
- Accountability partner mode.  

---

### 🔗 Integrations
- **Google Sheets / Notion**: bi-directional sync (edits in sheet update AI context).  
- **Google Calendar**: sync tasks, schedule events via voice.  
- **Zapier/IFTTT hooks** (future).  

---

### 🔒 Security & Privacy
- End-to-end encrypted journaling and voice streams.  
- Local-first option with cloud sync.  
- Full data export/delete (GDPR-style).  

---

## 🧩 Stretch Features
- Cross-platform apps (Electron, Flutter, mobile).  
- Gamification (XP, levels, habit streak rewards).  
- Multi-agent AI system (coach, planner, motivator modes).  
- Plugin ecosystem for custom extensions.  
- Multiplayer voice productivity (team sessions).  

---

## 🔥 Differentiators
- **Voice-native**: Not just voice commands — full **real-time conversations with AI**.  
- **Unified context**: Seamless sync between **voice, dashboard, and spreadsheets**.  
- **AI-integrated productivity**: Tasks, journals, and habits all enhanced with **AI insights**.  
- **Practical + visionary**: A tool you’ll use daily, but also a **portfolio-grade project**.  

---

## 📌 Roadmap (MVP → Advanced)
1. **MVP Core**:  
   - Voice chat (STT → LLM → TTS).  
   - Task manager (web + sheet sync).  
   - Unified context core (event bus + DB).  

2. **Phase 2**:  
   - Journaling (voice + AI summaries).  
   - Habit tracking (voice + streaks).  
   - Productivity metrics.  

3. **Phase 3**:  
   - AI insights + coaching.  
   - Bi-directional calendar sync.  
   - Multi-agent extensions.  

4. **Phase 4**:  
   - Collaboration features.  
   - Gamification + advanced reporting.  
   - Full plugin ecosystem.  

---

## 🌱 Inspiration
- **Jarvis (Iron Man)** for voice-first productivity.  
- **Notion & Obsidian** for knowledge structuring.  
- **Todoist & Habitica** for productivity gamification.  
- **Reflectly** for AI-driven journaling.  

---

## 👤 Author
Built by **Divij Ganjoo** – aspiring **Solutions Architect & Backend + AIML Engineer**, with a passion for **systems design and human-centered tools**.  
