<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/solid';
import type { Habit } from '../stores/habits';

interface Props {
  habits: Habit[];
  limit?: number;
}

withDefaults(defineProps<Props>(), {
  limit: 5,
});

const emit = defineEmits<{
  toggleHabit: [habitId: string];
  checkCompletion: [habitId: string];
}>();

const toggleHabit = (habitId: string) => {
  emit('toggleHabit', habitId);
};

const isCompletedToday = (habitId: string) => {
  // This would typically check the habit completion for today
  // For now, we'll emit an event to let the parent handle it
  emit('checkCompletion', habitId);
  return false; // Default to false, parent should handle the actual logic
};
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="habit in habits.slice(0, limit)"
      :key="habit.id"
      class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
    >
      <div class="flex items-center space-x-3">
        <div class="text-2xl">{{ habit.icon }}</div>
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            {{ habit.name }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ habit.streak || 0 }} day streak
          </p>
        </div>
      </div>
      <button
        class="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-200"
        :class="
          isCompletedToday(habit.id)
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
        "
        @click="toggleHabit(habit.id)"
      >
        <CheckIcon v-if="isCompletedToday(habit.id)" class="w-4 h-4" />
      </button>
    </div>
    <div
      v-if="habits.length === 0"
      class="text-center py-4 text-gray-500 dark:text-gray-400"
    >
      No habits yet
    </div>
  </div>
</template>
