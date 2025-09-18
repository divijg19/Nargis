<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  isRunning: boolean;
  currentTime: number;
  sessionType: 'focus' | 'shortBreak' | 'longBreak';
  progress: number;
  formattedTime: string;
  todaySessionsCount: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  toggleTimer: [];
  resetTimer: [];
}>();

const currentSessionLabel = computed(() => {
  switch (props.sessionType) {
    case 'focus':
      return 'Focus Time';
    case 'shortBreak':
      return 'Short Break';
    case 'longBreak':
      return 'Long Break';
    default:
      return 'Pomodoro';
  }
});

const progressPercentage = computed(() => Math.round(props.progress));

const toggleTimer = () => {
  emit('toggleTimer');
};

const resetTimer = () => {
  emit('resetTimer');
};
</script>

<template>
  <div
    class="bg-gradient-to-br from-red-500 to-orange-500 rounded-lg p-6 text-white"
  >
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-2">
        <div
          v-if="isRunning"
          class="w-3 h-3 rounded-full bg-white opacity-75 animate-pulse"
        ></div>
        <div v-else class="w-3 h-3 rounded-full bg-white opacity-50"></div>
        <span class="text-sm font-medium">{{ currentSessionLabel }}</span>
      </div>
      <span class="text-xs opacity-75"
        >{{ todaySessionsCount }} sessions today</span
      >
    </div>

    <div class="text-center mb-4">
      <div class="text-3xl font-bold mb-1">{{ formattedTime }}</div>
      <div class="text-sm opacity-75">{{ progressPercentage }}% complete</div>
    </div>

    <div class="w-full bg-white bg-opacity-25 rounded-full h-2 mb-4">
      <div
        class="bg-white rounded-full h-2 transition-all duration-300"
        :style="{ width: `${progressPercentage}%` }"
      ></div>
    </div>

    <div class="flex justify-center space-x-2">
      <button
        class="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-colors duration-200"
        @click="toggleTimer"
      >
        {{ isRunning ? 'Pause' : 'Start' }}
      </button>
      <button
        class="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-colors duration-200"
        @click="resetTimer"
      >
        Reset
      </button>
    </div>
  </div>
</template>
