"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { useToasts } from "@/contexts/ToastContext";
import { buildEvent, emitDomainEvent, onDomainEvent } from "@/events/dispatcher";
import { listSessions, recordSession } from "@/services/endpoints/pomodoro";
import type { PomodoroSession, PomodoroSettings, PomodoroStore } from "@/types";
import { generateId, isToday } from "@/utils";

// Action types
type PomodoroAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SESSIONS"; payload: PomodoroSession[] }
  | { type: "ADD_SESSION"; payload: PomodoroSession }
  | {
    type: "UPDATE_SESSION";
    payload: { id: string; updates: Partial<PomodoroSession> };
  }
  | { type: "SET_CURRENT_SESSION"; payload: PomodoroSession | null }
  | { type: "SET_RUNNING"; payload: boolean }
  | { type: "SET_TIME_REMAINING"; payload: number }
  | { type: "SET_CURRENT_CYCLE"; payload: number }
  | { type: "UPDATE_SETTINGS"; payload: Partial<PomodoroSettings> };
// Initial state
const initialSettings: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
};

const initialState: PomodoroStore = {
  isRunning: false,
  currentSession: null,
  sessions: [],
  settings: initialSettings,
  timeRemaining: 25 * 60, // 25 minutes in seconds
  currentCycle: 1,
  todaySessionsCount: 0,
};

// Persistence keys
const STORAGE_KEYS = {
  pomodoro: "pomodoro.state.v1",
};

// Reducer function
function pomodoroReducer(
  state: PomodoroStore,
  action: PomodoroAction,
): PomodoroStore {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state };

    case "SET_SESSIONS":
      return { ...state, sessions: action.payload };

    case "ADD_SESSION":
      return { ...state, sessions: [...state.sessions, action.payload] };

    case "UPDATE_SESSION": {
      const updatedSessions = state.sessions.map((session) =>
        session.id === action.payload.id
          ? { ...session, ...action.payload.updates }
          : session,
      );
      return { ...state, sessions: updatedSessions };
    }

    case "SET_CURRENT_SESSION":
      return { ...state, currentSession: action.payload };

    case "SET_RUNNING":
      return { ...state, isRunning: action.payload };

    case "SET_TIME_REMAINING":
      return { ...state, timeRemaining: action.payload };

    case "SET_CURRENT_CYCLE":
      return { ...state, currentCycle: action.payload };

    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    default:
      return state;
  }
}

// Context type
interface PomodoroContextType extends PomodoroStore {
  startTimer: (taskId?: string) => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  completeSession: () => void;
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
  loadSessions: () => Promise<void>;
  formattedTime: string;
  progress: number;
  sessionType: "work" | "shortBreak" | "longBreak";
}

// Create context
const PomodoroContext = createContext<PomodoroContextType | undefined>(
  undefined,
);

// Provider component
export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(pomodoroReducer, initialState);
  const { push } = useToasts();

  // Hydrate from storage (once)
  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEYS.pomodoro)
          : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        currentSession: PomodoroSession | null;
        isRunning: boolean;
        timeRemaining: number;
        currentCycle: number;
        settings: PomodoroSettings;
        timestamp: string;
      };
      // If there was an active session, recompute remaining time based on wall clock
      if (parsed.currentSession && parsed.isRunning) {
        const startedAt = new Date(parsed.currentSession.startTime).getTime();
        const now = Date.now();
        const elapsedSec = Math.floor((now - startedAt) / 1000);
        const totalSec = parsed.currentSession.duration * 60;
        const remaining = Math.max(totalSec - elapsedSec, 0);
        dispatch({
          type: "SET_CURRENT_SESSION",
          payload: remaining > 0 ? parsed.currentSession : null,
        });
        dispatch({
          type: "SET_TIME_REMAINING",
          payload:
            remaining > 0 ? remaining : parsed.settings.workDuration * 60,
        });
        dispatch({
          type: "SET_RUNNING",
          payload: remaining > 0 && parsed.isRunning,
        });
      } else {
        if (parsed.currentSession) {
          dispatch({
            type: "SET_CURRENT_SESSION",
            payload: parsed.currentSession,
          });
          dispatch({
            type: "SET_TIME_REMAINING",
            payload: parsed.timeRemaining,
          });
        }
        dispatch({ type: "SET_RUNNING", payload: false });
      }
      dispatch({ type: "SET_CURRENT_CYCLE", payload: parsed.currentCycle });
      dispatch({ type: "UPDATE_SETTINGS", payload: parsed.settings });
    } catch {
      /* ignore corrupted state */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist lightweight state (exclude sessions array for now – loaded via API)
  useEffect(() => {
    try {
      const snapshot = {
        currentSession: state.currentSession,
        isRunning: state.isRunning,
        timeRemaining: state.timeRemaining,
        currentCycle: state.currentCycle,
        settings: state.settings,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.pomodoro, JSON.stringify(snapshot));
    } catch {
      /* noop */
    }
  }, [
    state.currentSession,
    state.isRunning,
    state.timeRemaining,
    state.currentCycle,
    state.settings,
  ]);

  // Computed values
  const todaySessionsCount = useMemo(
    () =>
      state.sessions.filter(
        (session) => session.completed && isToday(session.startTime),
      ).length,
    [state.sessions],
  );

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [state.timeRemaining]);

  const sessionType: "work" | "shortBreak" | "longBreak" = useMemo(() => {
    if (!state.currentSession) return "work";

    if (state.currentSession.type === "work") return "work";
    if (state.currentSession.type === "shortBreak") return "shortBreak";
    return "longBreak";
  }, [state.currentSession]);

  const progress = useMemo(() => {
    if (!state.currentSession) return 0;

    const totalDuration = state.currentSession.duration * 60; // Convert to seconds
    return ((totalDuration - state.timeRemaining) / totalDuration) * 100;
  }, [state.currentSession, state.timeRemaining]);

  // Actions
  const startTimer = (taskId?: string) => {
    if (!state.currentSession) {
      // Create new work session
      const newSession: PomodoroSession = {
        id: generateId(),
        type: "work",
        duration: state.settings.workDuration,
        startTime: new Date(),
        completed: false,
        taskId,
      };

      dispatch({ type: "SET_CURRENT_SESSION", payload: newSession });
      dispatch({
        type: "SET_TIME_REMAINING",
        payload: state.settings.workDuration * 60,
      });
      emitDomainEvent(
        buildEvent("pomodoro.session.started", {
          id: newSession.id,
          type: newSession.type,
        }),
      );
      push({
        title: "Focus Started",
        message: `${newSession.duration} min work`,
        variant: "success",
      });
    }

    dispatch({ type: "SET_RUNNING", payload: true });
    if (state.currentSession) {
      emitDomainEvent(
        buildEvent("pomodoro.session.resumed", { id: state.currentSession.id }),
      );
      push({ title: "Resumed", message: "Timer running", variant: "info" });
    }
  };

  const pauseTimer = () => {
    dispatch({ type: "SET_RUNNING", payload: false });
    if (state.currentSession) {
      emitDomainEvent(
        buildEvent("pomodoro.session.paused", {
          id: state.currentSession.id,
          remaining: state.timeRemaining,
        }),
      );
      push({ title: "Paused", message: "Timer paused", variant: "warning" });
    }
  };

  const resetTimer = () => {
    dispatch({ type: "SET_RUNNING", payload: false });
    dispatch({ type: "SET_CURRENT_SESSION", payload: null });
    dispatch({
      type: "SET_TIME_REMAINING",
      payload: state.settings.workDuration * 60,
    });
    dispatch({ type: "SET_CURRENT_CYCLE", payload: 1 });
    emitDomainEvent(buildEvent("pomodoro.reset", {}));
    push({ title: "Reset", message: "Timer cleared", variant: "info" });
  };

  const completeSession = useCallback(async () => {
    if (!state.currentSession) return;

    // Complete current session
    const completedSession = {
      ...state.currentSession,
      endTime: new Date(),
      completed: true,
    };

    dispatch({ type: "ADD_SESSION", payload: completedSession });
    emitDomainEvent(
      buildEvent("pomodoro.session.completed", {
        id: completedSession.id,
        type: completedSession.type,
      }),
    );
    push({
      title: "Session Complete",
      message:
        completedSession.type === "work" ? "Great job!" : "Break finished",
      variant: "success",
    });
    // Fire and forget persistence
    try {
      await recordSession(completedSession);
    } catch {
      /* noop */
    }
    dispatch({ type: "SET_RUNNING", payload: false });

    // Determine next session type
    let nextSessionType: "work" | "shortBreak" | "longBreak";
    let nextDuration: number;
    let nextCycle = state.currentCycle;

    if (state.currentSession.type === "work") {
      if (state.currentCycle % state.settings.longBreakInterval === 0) {
        nextSessionType = "longBreak";
        nextDuration = state.settings.longBreakDuration;
      } else {
        nextSessionType = "shortBreak";
        nextDuration = state.settings.shortBreakDuration;
      }
      nextCycle++;
    } else {
      nextSessionType = "work";
      nextDuration = state.settings.workDuration;
    }

    // Create next session if auto-start is enabled
    if (
      (nextSessionType !== "work" && state.settings.autoStartBreaks) ||
      (nextSessionType === "work" && state.settings.autoStartWork)
    ) {
      const nextSession: PomodoroSession = {
        id: generateId(),
        type: nextSessionType,
        duration: nextDuration,
        startTime: new Date(),
        completed: false,
      };

      dispatch({ type: "SET_CURRENT_SESSION", payload: nextSession });
      dispatch({ type: "SET_TIME_REMAINING", payload: nextDuration * 60 });
      dispatch({ type: "SET_CURRENT_CYCLE", payload: nextCycle });
      dispatch({ type: "SET_RUNNING", payload: true });
      emitDomainEvent(
        buildEvent("pomodoro.session.autoStarted", {
          id: nextSession.id,
          type: nextSessionType,
        }),
      );
      push({
        title: nextSessionType === "work" ? "New Focus" : "Break",
        message: `${nextDuration} min`,
        variant: "info",
      });
    } else {
      dispatch({ type: "SET_CURRENT_SESSION", payload: null });
      dispatch({
        type: "SET_TIME_REMAINING",
        payload: state.settings.workDuration * 60,
      });
      dispatch({ type: "SET_CURRENT_CYCLE", payload: nextCycle });
    }
  }, [
    state.currentSession,
    state.currentCycle,
    state.settings.autoStartBreaks,
    state.settings.autoStartWork,
    state.settings.longBreakDuration,
    state.settings.longBreakInterval,
    state.settings.shortBreakDuration,
    state.settings.workDuration,
    push,
  ]);

  // Timer effect (after completeSession defined)
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (state.isRunning && state.timeRemaining > 0) {
      interval = setInterval(() => {
        dispatch({
          type: "SET_TIME_REMAINING",
          payload: state.timeRemaining - 1,
        });
      }, 1000);
    } else if (state.timeRemaining === 0 && state.currentSession) {
      completeSession();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    state.isRunning,
    state.timeRemaining,
    state.currentSession,
    completeSession,
  ]);

  const updateSettings = (settings: Partial<PomodoroSettings>) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: settings });
    emitDomainEvent(buildEvent("pomodoro.settings.updated", { settings }));
    push({
      title: "Settings",
      message: "Pomodoro settings saved",
      variant: "success",
    });
  };

  const loadSessions = async () => {
    try {
      const sessions = await listSessions();
      dispatch({ type: "SET_SESSIONS", payload: sessions });
      emitDomainEvent(
        buildEvent("pomodoro.sessions.synced", { count: sessions.length }),
      );
      // Silent load - no toast notification to avoid spam
    } catch (error) {
      console.error("Failed to load pomodoro sessions:", error);
      push({
        title: "Sync Failed",
        message: "Could not load sessions",
        variant: "error",
      });
    }
  };

  // Listen for remote tool events
  useEffect(() => {
    const unsubscribe = onDomainEvent((event) => {
      if (event.type === "remote.tool_completed") {
        const data = event.data as { tool: string; result: any };
        if (data.tool === "start_focus") {
          const result = data.result;
          if (result && result.id) {
            const newSession: PomodoroSession = {
              id: result.id,
              type: (result.type as "work" | "shortBreak" | "longBreak") || "work",
              duration: result.duration_minutes || 25,
              startTime: new Date(result.started_at),
              completed: result.completed,
              taskId: result.taskId,
            };

            dispatch({ type: "SET_CURRENT_SESSION", payload: newSession });
            dispatch({
              type: "SET_TIME_REMAINING",
              payload: newSession.duration * 60,
            });
            dispatch({ type: "SET_RUNNING", payload: true });

            loadSessions();
            push({
              title: "Focus Session Started",
              message: `AI started a ${newSession.duration}m session.`,
              variant: "success",
            });
          }
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadSessions, push]);

  const contextValue: PomodoroContextType = {
    ...state,
    todaySessionsCount,
    formattedTime,
    progress,
    sessionType,
    startTimer,
    pauseTimer,
    resetTimer,
    completeSession,
    updateSettings,
    loadSessions,
  };

  return (
    <PomodoroContext.Provider value={contextValue}>
      {children}
    </PomodoroContext.Provider>
  );
}

// Hook to use the context
export function usePomodoroStore() {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error("usePomodoroStore must be used within a PomodoroProvider");
  }
  return context;
}
