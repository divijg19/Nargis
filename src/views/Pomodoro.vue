<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { usePomodoroStore } from '../stores/pomodoro';
import NavBar from '../components/NavBar.vue';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const pomodoroStore = usePomodoroStore();
const timerInterval = ref<NodeJS.Timeout | null>(null);
const autoStart = ref(false);
const soundEnabled = ref(true);

const modes = {
  focus: { name: 'Focus', duration: 25, icon: '🍅' },
  shortBreak: { name: 'Short Break', duration: 5, icon: '☕' },
  longBreak: { name: 'Long Break', duration: 15, icon: '🏖️' },
};

const timerColors = {
  focus: 'text-red-500',
  shortBreak: 'text-green-500',
  longBreak: 'text-blue-500',
};

const circumference = 2 * Math.PI * 45;

const currentMode = computed(() => pomodoroStore.currentMode);
const timeLeft = computed(() => pomodoroStore.timeLeft);
const isRunning = computed(() => pomodoroStore.isRunning);
const sessionCount = computed(() => pomodoroStore.sessionCount);
const todaySessionsCount = computed(() => pomodoroStore.todaySessionsCount);
const totalFocusTime = computed(() =>
  Math.round(pomodoroStore.totalFocusTime / 60)
);
const bestStreak = computed(() => pomodoroStore.bestStreak);
const weeklySessionsCount = computed(() => pomodoroStore.weeklySessionsCount);

const formattedTime = computed(() => {
  const minutes = Math.floor(timeLeft.value / 60);
  const seconds = timeLeft.value % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

const strokeDashoffset = computed(() => {
  const totalTime = modes[currentMode.value].duration * 60;
  const progress = (totalTime - timeLeft.value) / totalTime;
  return circumference - progress * circumference;
});

const toggleTimer = () => {
  if (isRunning.value) {
    pomodoroStore.pauseTimer();
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
  } else {
    pomodoroStore.startTimer();
    startInterval();
  }
};

const resetTimer = () => {
  pomodoroStore.resetTimer();
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
};

const skipSession = () => {
  pomodoroStore.skipSession();
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }

  if (autoStart.value) {
    setTimeout(() => {
      pomodoroStore.startTimer();
      startInterval();
    }, 1000);
  }
};

const setMode = (mode: TimerMode) => {
  pomodoroStore.setMode(mode);
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
};

const startInterval = () => {
  timerInterval.value = setInterval(() => {
    pomodoroStore.tick();

    if (timeLeft.value <= 0) {
      clearInterval(timerInterval.value!);
      timerInterval.value = null;

      if (soundEnabled.value) {
        playNotificationSound();
      }

      pomodoroStore.completeSession();

      if (autoStart.value) {
        setTimeout(() => {
          pomodoroStore.startTimer();
          startInterval();
        }, 1000);
      }
    }
  }, 1000) as NodeJS.Timeout;
};

const playNotificationSound = () => {
  // Create a simple notification sound
  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.5
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

onMounted(() => {
  pomodoroStore.loadState();
});

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <NavBar />

    <main class="container mx-auto px-4 py-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Focus Timer
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            Use the Pomodoro Technique to boost your productivity
          </p>
        </div>

        <!-- Timer Section -->
        <div
          class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8"
        >
          <div class="text-center">
            <!-- Timer Display -->
            <div class="relative inline-block">
              <svg class="w-64 h-64 transform -rotate-90" viewBox="0 0 100 100">
                <!-- Background circle -->
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                  class="text-gray-200 dark:text-gray-700"
                />
                <!-- Progress circle -->
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  stroke-width="4"
                  fill="none"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="strokeDashoffset"
                  :class="timerColors[currentMode]"
                  class="transition-all duration-1000 ease-linear"
                  stroke-linecap="round"
                />
              </svg>

              <!-- Timer Text -->
              <div
                class="absolute inset-0 flex flex-col items-center justify-center"
              >
                <div
                  class="text-5xl font-bold text-gray-900 dark:text-white mb-2"
                >
                  {{ formattedTime }}
                </div>
                <div
                  class="text-lg font-medium capitalize"
                  :class="timerColors[currentMode]"
                >
                  {{ currentMode.replace('-', ' ') }}
                </div>
                <div
                  v-if="isRunning"
                  class="text-sm text-gray-500 dark:text-gray-400 mt-1"
                >
                  Session {{ sessionCount + 1 }}
                </div>
              </div>
            </div>

            <!-- Timer Controls -->
            <div class="flex items-center justify-center gap-4 mt-8">
              <button
                class="px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg"
                :class="[
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600',
                ]"
                @click="toggleTimer"
              >
                {{ isRunning ? 'Pause' : 'Start' }}
              </button>

              <button
                class="px-6 py-3 rounded-xl font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                @click="resetTimer"
              >
                Reset
              </button>

              <button
                class="px-6 py-3 rounded-xl font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                @click="skipSession"
              >
                Skip
              </button>
            </div>
          </div>
        </div>

        <!-- Mode Selection -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Session Types
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              v-for="(mode, key) in modes"
              :key="key"
              class="p-4 rounded-lg border-2 transition-all duration-200 text-left"
              :class="[
                currentMode === key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
              ]"
              @click="setMode(key as TimerMode)"
            >
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ mode.icon }}</span>
                <div>
                  <h4 class="font-medium text-gray-900 dark:text-white">
                    {{ mode.name }}
                  </h4>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ mode.duration }} minutes
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center">
              <div
                class="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center"
              >
                <span class="text-red-600 dark:text-red-400 text-lg">🍅</span>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Today's Sessions
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ todaySessionsCount }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center">
              <div
                class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center"
              >
                <span class="text-blue-600 dark:text-blue-400 text-lg">⏱️</span>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Focus Time
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ totalFocusTime }}h
                </p>
              </div>
            </div>
          </div>

          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center">
              <div
                class="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center"
              >
                <span class="text-green-600 dark:text-green-400 text-lg"
                  >🎯</span
                >
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Best Streak
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ bestStreak }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center">
              <div
                class="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center"
              >
                <span class="text-purple-600 dark:text-purple-400 text-lg"
                  >📈</span
                >
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  This Week
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ weeklySessionsCount }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Settings
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Auto-start next session
              </label>
              <input
                v-model="autoStart"
                type="checkbox"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Sound notifications
              </label>
              <input
                v-model="soundEnabled"
                type="checkbox"
                class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
