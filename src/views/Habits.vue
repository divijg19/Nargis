<script setup lang="ts">
import { computed, ref } from 'vue';
import { useHabitStore } from '../stores/habits';
import NavBar from '../components/NavBar.vue';

const habitStore = useHabitStore();
const newHabitName = ref('');
const newHabitCategory = ref('health');

const habits = computed(() => habitStore.habits);
const activeHabits = computed(() => habits.value.filter(h => !h.archived));
const bestStreakDays = computed(() =>
  Math.max(...habits.value.map(h => h.bestStreak || 0), 0)
);
const overallCompletionRate = computed(() => {
  if (habits.value.length === 0) return 0;
  const total = habits.value.reduce(
    (sum, habit) => sum + getCompletionRate(habit),
    0
  );
  return Math.round(total / habits.value.length);
});
const todayCompletedCount = computed(
  () => habits.value.filter(habit => isCompletedToday(habit.id)).length
);

const categoryIcons = {
  health: '💪',
  productivity: '⚡',
  learning: '📚',
  social: '👥',
  creative: '🎨',
  other: '📝',
};

const categoryColors = {
  health: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
  productivity: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  learning:
    'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
  social: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-400',
  creative:
    'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const addHabit = () => {
  if (newHabitName.value.trim()) {
    habitStore.addHabit({
      name: newHabitName.value.trim(),
      category: newHabitCategory.value,
    });
    newHabitName.value = '';
  }
};

const deleteHabit = (id: string) => {
  habitStore.deleteHabit(id);
};

const toggleHabitForToday = (habitId: string) => {
  habitStore.toggleHabitForDate(habitId, new Date());
};

const isCompletedToday = (habitId: string) => {
  return habitStore.isHabitCompletedOnDate(habitId, new Date());
};

const isHabitCompletedOnDate = (habitId: string, date: Date) => {
  return habitStore.isHabitCompletedOnDate(habitId, date);
};

const getCategoryIcon = (category: string) => {
  return (
    categoryIcons[category as keyof typeof categoryIcons] || categoryIcons.other
  );
};

const getCategoryColors = (category: string) => {
  return (
    categoryColors[category as keyof typeof categoryColors] ||
    categoryColors.other
  );
};

const getCompletionRate = (habit: any) => {
  if (!habit.completedDays || habit.completedDays.length === 0) return 0;

  const daysSinceCreation = Math.ceil(
    (Date.now() - new Date(habit.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceCreation === 0) return 0;

  return Math.round((habit.completedDays.length / daysSinceCreation) * 100);
};

const getLastSevenDays = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date);
  }
  return days;
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <NavBar />

    <main class="container mx-auto px-4 py-8">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Habit Tracker
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            Build lasting habits with consistent tracking and motivation
          </p>
        </div>

        <!-- Add New Habit -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
        >
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Add New Habit
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="md:col-span-2">
              <input
                v-model="newHabitName"
                type="text"
                placeholder="Enter habit name..."
                class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                @keyup.enter="addHabit"
              />
            </div>
            <div>
              <select
                v-model="newHabitCategory"
                class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="health">Health</option>
                <option value="productivity">Productivity</option>
                <option value="learning">Learning</option>
                <option value="social">Social</option>
                <option value="creative">Creative</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <button
                :disabled="!newHabitName.trim()"
                class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
                @click="addHabit"
              >
                Add Habit
              </button>
            </div>
          </div>
        </div>

        <!-- Habit Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                  Active Habits
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ activeHabits.length }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center">
              <div
                class="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center"
              >
                <span class="text-orange-600 dark:text-orange-400 text-lg"
                  >🔥</span
                >
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Best Streak
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ bestStreakDays }} days
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
                <span class="text-blue-600 dark:text-blue-400 text-lg">📊</span>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Completion Rate
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ overallCompletionRate }}%
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
                  >✅</span
                >
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Today's Progress
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ todayCompletedCount }}/{{ activeHabits.length }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Habit Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            v-for="habit in habits"
            :key="habit.id"
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <!-- Habit Header -->
            <div class="p-6 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div
                    class="w-12 h-12 rounded-lg flex items-center justify-center"
                    :class="getCategoryColors(habit.category || 'general')"
                  >
                    <span class="text-xl">{{
                      getCategoryIcon(habit.category || 'general')
                    }}</span>
                  </div>
                  <div>
                    <h3
                      class="text-lg font-semibold text-gray-900 dark:text-white"
                    >
                      {{ habit.name }}
                    </h3>
                    <p
                      class="text-sm text-gray-500 dark:text-gray-400 capitalize"
                    >
                      {{ habit.category }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    class="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                    :class="[
                      isCompletedToday(habit.id)
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-green-500',
                    ]"
                    @click="toggleHabitForToday(habit.id)"
                  >
                    <svg
                      v-if="isCompletedToday(habit.id)"
                      class="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                  </button>

                  <button
                    class="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    @click="deleteHabit(habit.id)"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Habit Stats -->
            <div class="p-6">
              <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="text-center">
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ habit.currentStreak }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Current Streak
                  </p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ habit.bestStreak }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Best Streak
                  </p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ getCompletionRate(habit) }}%
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Success Rate
                  </p>
                </div>
              </div>

              <!-- Weekly Calendar -->
              <div class="mb-4">
                <p
                  class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Last 7 Days
                </p>
                <div class="flex gap-1">
                  <div
                    v-for="(day, index) in getLastSevenDays()"
                    :key="index"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium"
                    :class="[
                      isHabitCompletedOnDate(habit.id, day)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
                    ]"
                    :title="formatDate(day)"
                  >
                    {{ day.getDate() }}
                  </div>
                </div>
              </div>

              <!-- Progress Bar -->
              <div>
                <div
                  class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1"
                >
                  <span>Progress</span>
                  <span>{{ habit.completedDays?.length || 0 }} days</span>
                </div>
                <div
                  class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"
                >
                  <div
                    class="bg-green-500 h-2 rounded-full transition-all duration-300"
                    :style="{
                      width: `${Math.min(getCompletionRate(habit), 100)}%`,
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="habits.length === 0" class="text-center py-12">
          <div
            class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <span class="text-gray-400 text-2xl">🎯</span>
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No habits yet
          </h3>
          <p class="text-gray-500 dark:text-gray-400">
            Start building healthy habits by adding your first one above.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
