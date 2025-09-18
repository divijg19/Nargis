import { defineStore } from "pinia";
import { computed, ref } from "vue";

export interface PomodoroSession {
  id: string;
  type: "focus" | "shortBreak" | "longBreak";
  duration: number; // in seconds
  completedAt: Date;
  taskId?: string;
}

export const usePomodoroStore = defineStore("pomodoro", () => {
  const isRunning = ref(false);
  const isPaused = ref(false);
  const currentTime = ref(25 * 60); // 25 minutes in seconds
  const sessionType = ref<"focus" | "shortBreak" | "longBreak">("focus");
  const sessionCount = ref(0);
  const sessions = ref<PomodoroSession[]>([]);

  const settings = ref({
    focusDuration: 25 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsUntilLongBreak: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
    soundEnabled: true,
  });

  let intervalId: NodeJS.Timeout | null = null;

  // Computed
  const progress = computed(() => {
    const totalTime =
      settings.value[`${sessionType.value}Duration`] ||
      settings.value.focusDuration;
    return ((totalTime - currentTime.value) / totalTime) * 100;
  });

  const formattedTime = computed(() => {
    const minutes = Math.floor(currentTime.value / 60);
    const seconds = currentTime.value % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  });

  const todaySessionsCount = computed(() => {
    const today = new Date().toDateString();
    return sessions.value.filter(
      (session) => session.completedAt.toDateString() === today,
    ).length;
  });

  const currentMode = computed(() => sessionType.value);
  const timeLeft = computed(() => currentTime.value);
  const totalFocusTime = computed(() => {
    return sessions.value
      .filter((s) => s.type === "focus")
      .reduce((total, session) => total + session.duration, 0);
  });
  const bestStreak = computed(() => {
    // Calculate best streak of focus sessions
    let maxStreak = 0;
    let currentStreak = 0;

    for (const session of sessions.value) {
      if (session.type === "focus") {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    return maxStreak;
  });
  const weeklySessionsCount = computed(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return sessions.value.filter((session) => session.completedAt >= oneWeekAgo)
      .length;
  });

  // Actions
  const start = () => {
    if (isPaused.value) {
      isPaused.value = false;
    } else {
      reset();
    }

    isRunning.value = true;

    intervalId = setInterval(() => {
      if (currentTime.value > 0) {
        currentTime.value--;
      } else {
        complete();
      }
    }, 1000) as NodeJS.Timeout;
  };

  const pause = () => {
    isPaused.value = true;
    isRunning.value = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const reset = () => {
    isRunning.value = false;
    isPaused.value = false;
    currentTime.value =
      settings.value[`${sessionType.value}Duration`] ||
      settings.value.focusDuration;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const complete = () => {
    // Save completed session
    const session: PomodoroSession = {
      id: crypto.randomUUID(),
      type: sessionType.value,
      duration:
        settings.value[`${sessionType.value}Duration`] ||
        settings.value.focusDuration,
      completedAt: new Date(),
    };
    sessions.value.push(session);

    // Update session count
    if (sessionType.value === "focus") {
      sessionCount.value++;
    }

    // Determine next session type
    if (sessionType.value === "focus") {
      if (sessionCount.value % settings.value.sessionsUntilLongBreak === 0) {
        sessionType.value = "longBreak";
      } else {
        sessionType.value = "shortBreak";
      }
    } else {
      sessionType.value = "focus";
    }

    reset();
    saveSessions();

    // Play sound if enabled
    if (settings.value.soundEnabled) {
      playNotificationSound();
    }

    // Show notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Pomodoro Session Complete!", {
        body: `${session.type} session finished. Time for a ${sessionType.value}!`,
        icon: "/icons/icon-192x192.png",
      });
    }
  };

  const switchSession = (type: "focus" | "shortBreak" | "longBreak") => {
    sessionType.value = type;
    reset();
  };

  // Alias methods for component compatibility
  const startTimer = start;
  const pauseTimer = pause;
  const resetTimer = reset;
  const tick = () => {
    if (currentTime.value > 0) {
      currentTime.value--;
    } else {
      complete();
    }
  };
  const completeSession = complete;
  const skipSession = () => {
    // Skip current session and move to next
    if (sessionType.value === "focus") {
      sessionCount.value++;
      if (sessionCount.value % settings.value.sessionsUntilLongBreak === 0) {
        sessionType.value = "longBreak";
      } else {
        sessionType.value = "shortBreak";
      }
    } else {
      sessionType.value = "focus";
    }
    reset();
  };
  const setMode = (mode: "focus" | "shortBreak" | "longBreak") => {
    sessionType.value = mode;
    reset();
  };

  const updateSettings = (newSettings: Partial<typeof settings.value>) => {
    settings.value = { ...settings.value, ...newSettings };
    localStorage.setItem(
      "nargis_pomodoro_settings",
      JSON.stringify(settings.value),
    );
    reset();
  };

  const playNotificationSound = () => {
    const audio = new Audio("/assets/audio/notification.mp3");
    audio.play().catch(() => {
      // Fallback to beep if audio file not available
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.5,
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    });
  };

  const saveSessions = () => {
    localStorage.setItem(
      "nargis_pomodoro_sessions",
      JSON.stringify(sessions.value),
    );
  };

  const loadSessions = () => {
    const saved = localStorage.getItem("nargis_pomodoro_sessions");
    if (saved) {
      sessions.value = JSON.parse(saved).map(
        (
          session: Omit<PomodoroSession, "completedAt"> & {
            completedAt: string;
          },
        ) => ({
          ...session,
          completedAt: new Date(session.completedAt),
        }),
      );
    }

    const savedSettings = localStorage.getItem("nargis_pomodoro_settings");
    if (savedSettings) {
      settings.value = { ...settings.value, ...JSON.parse(savedSettings) };
    }
  };

  const loadState = loadSessions;

  return {
    isRunning,
    isPaused,
    currentTime,
    sessionType,
    sessionCount,
    sessions,
    settings,
    progress,
    formattedTime,
    todaySessionsCount,
    currentMode,
    timeLeft,
    totalFocusTime,
    bestStreak,
    weeklySessionsCount,
    start,
    pause,
    reset,
    complete,
    switchSession,
    updateSettings,
    loadSessions,
    startTimer,
    pauseTimer,
    resetTimer,
    tick,
    completeSession,
    skipSession,
    setMode,
    loadState,
  };
});
