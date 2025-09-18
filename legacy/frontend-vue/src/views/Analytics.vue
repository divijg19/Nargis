<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
// import { useTaskStore } from '../stores/tasks'
// import { usePomodoroStore } from '../stores/pomodoro'
// import { useHabitStore } from '../stores/habits'
import NavBar from '../components/NavBar.vue';

// const taskStore = useTaskStore()
// const pomodoroStore = usePomodoroStore()
// const habitStore = useHabitStore()

const selectedPeriod = ref('week');
const productivityChart = ref<HTMLCanvasElement>();
const taskChart = ref<HTMLCanvasElement>();

const timePeriods = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
];

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const metrics = computed(() => {
  // Mock data - in a real app, this would be calculated from stores
  return {
    tasksCompleted: 47,
    tasksGrowth: 12,
    focusHours: 28,
    focusGrowth: 8,
    habitSuccess: 85,
    habitGrowth: 5,
    productivityScore: 92,
    scoreGrowth: 15,
  };
});

const insights = computed(() => [
  {
    id: 1,
    icon: '🎯',
    title: 'Peak Performance Time',
    description:
      "You're most productive between 9 AM and 11 AM. Schedule important tasks during this window.",
  },
  {
    id: 2,
    icon: '📈',
    title: 'Streak Building',
    description:
      'Your habit completion rate improved by 15% this month. Keep up the momentum!',
  },
  {
    id: 3,
    icon: '⏰',
    title: 'Focus Sessions',
    description:
      'You completed 23% more Pomodoro sessions compared to last week.',
  },
]);

const recommendations = computed(() => [
  {
    id: 1,
    icon: '🍅',
    title: 'Try Longer Focus Sessions',
    description:
      'Consider 45-minute focus blocks for complex tasks based on your completion patterns.',
  },
  {
    id: 2,
    icon: '📅',
    title: 'Schedule Buffer Time',
    description:
      'Add 15-minute buffers between tasks to improve completion rates.',
  },
  {
    id: 3,
    icon: '🎨',
    title: 'Vary Your Environment',
    description:
      'Your productivity increases 20% when working in different locations.',
  },
]);

const getActivityForDay = (dayIndex: number) => {
  // Mock activity data - returns array of activity levels for each week
  // dayIndex affects the random seed for consistent data
  const weeks = 52;
  const activities = [];
  for (let i = 0; i < weeks; i++) {
    activities.push(Math.floor((Math.random() + dayIndex * 0.1) * 5) % 5);
  }
  return activities;
};

const getActivityColor = (level: number) => {
  const colors = [
    'bg-gray-100 dark:bg-gray-700',
    'bg-green-200 dark:bg-green-800',
    'bg-green-400 dark:bg-green-600',
    'bg-green-600 dark:bg-green-500',
    'bg-green-800 dark:bg-green-400',
  ];
  return colors[level] || colors[0];
};

onMounted(() => {
  // Initialize charts
  initializeCharts();
});

const initializeCharts = () => {
  // Mock chart initialization
  // In a real app, you would use Chart.js or similar library
  console.log('Charts would be initialized here');
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <NavBar />

    <main class="container mx-auto px-4 py-8">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            Track your productivity patterns and insights
          </p>
        </div>

        <!-- Time Period Selector -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
        >
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Overview
            </h2>
            <div class="flex gap-2">
              <button
                v-for="period in timePeriods"
                :key="period.value"
                class="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                :class="[
                  selectedPeriod === period.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
                ]"
                @click="selectedPeriod = period.value"
              >
                {{ period.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Key Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Tasks Completed
                </p>
                <p
                  class="text-3xl font-bold text-gray-900 dark:text-white mt-1"
                >
                  {{ metrics.tasksCompleted }}
                </p>
                <p class="text-sm text-green-600 dark:text-green-400 mt-1">
                  +{{ metrics.tasksGrowth }}% from last period
                </p>
              </div>
              <div
                class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center"
              >
                <span class="text-green-600 dark:text-green-400 text-xl"
                  >✅</span
                >
              </div>
            </div>
          </div>

          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Focus Hours
                </p>
                <p
                  class="text-3xl font-bold text-gray-900 dark:text-white mt-1"
                >
                  {{ metrics.focusHours }}
                </p>
                <p class="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  +{{ metrics.focusGrowth }}% from last period
                </p>
              </div>
              <div
                class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center"
              >
                <span class="text-blue-600 dark:text-blue-400 text-xl">🍅</span>
              </div>
            </div>
          </div>

          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Habit Success
                </p>
                <p
                  class="text-3xl font-bold text-gray-900 dark:text-white mt-1"
                >
                  {{ metrics.habitSuccess }}%
                </p>
                <p class="text-sm text-orange-600 dark:text-orange-400 mt-1">
                  +{{ metrics.habitGrowth }}% from last period
                </p>
              </div>
              <div
                class="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center"
              >
                <span class="text-orange-600 dark:text-orange-400 text-xl"
                  >🔥</span
                >
              </div>
            </div>
          </div>

          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Productivity Score
                </p>
                <p
                  class="text-3xl font-bold text-gray-900 dark:text-white mt-1"
                >
                  {{ metrics.productivityScore }}
                </p>
                <p class="text-sm text-purple-600 dark:text-purple-400 mt-1">
                  +{{ metrics.scoreGrowth }}% from last period
                </p>
              </div>
              <div
                class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center"
              >
                <span class="text-purple-600 dark:text-purple-400 text-xl"
                  >📊</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <!-- Productivity Trend Chart -->
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
              Productivity Trend
            </h3>
            <div class="h-64 flex items-center justify-center">
              <canvas ref="productivityChart" class="w-full h-full"></canvas>
            </div>
          </div>

          <!-- Task Completion Chart -->
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
              Task Categories
            </h3>
            <div class="h-64 flex items-center justify-center">
              <canvas ref="taskChart" class="w-full h-full"></canvas>
            </div>
          </div>
        </div>

        <!-- Activity Heatmap -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Activity Heatmap
          </h3>
          <div class="overflow-x-auto">
            <div class="inline-flex flex-col gap-1 min-w-max">
              <!-- Days of week labels -->
              <div class="flex gap-1 mb-2">
                <div class="w-8"></div>
                <!-- Spacer -->
                <div
                  class="text-xs text-gray-500 dark:text-gray-400 grid grid-cols-12 gap-1 w-96"
                >
                  <span
                    v-for="month in monthLabels"
                    :key="month"
                    class="text-center"
                    >{{ month }}</span
                  >
                </div>
              </div>

              <!-- Heatmap rows -->
              <div
                v-for="(day, dayIndex) in daysOfWeek"
                :key="day"
                class="flex items-center gap-1"
              >
                <div class="w-8 text-xs text-gray-500 dark:text-gray-400">
                  {{ day }}
                </div>
                <div class="flex gap-1">
                  <div
                    v-for="(activity, weekIndex) in getActivityForDay(dayIndex)"
                    :key="weekIndex"
                    class="w-3 h-3 rounded-sm"
                    :class="[getActivityColor(activity)]"
                    :title="`${activity} activities`"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Legend -->
            <div class="flex items-center gap-4 mt-4">
              <span class="text-sm text-gray-500 dark:text-gray-400">Less</span>
              <div class="flex gap-1">
                <div
                  class="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700"
                ></div>
                <div
                  class="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-800"
                ></div>
                <div
                  class="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600"
                ></div>
                <div
                  class="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500"
                ></div>
                <div
                  class="w-3 h-3 rounded-sm bg-green-800 dark:bg-green-400"
                ></div>
              </div>
              <span class="text-sm text-gray-500 dark:text-gray-400">More</span>
            </div>
          </div>
        </div>

        <!-- Insights and Recommendations -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Insights -->
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
              📈 Insights
            </h3>
            <div class="space-y-4">
              <div
                v-for="insight in insights"
                :key="insight.id"
                class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700"
              >
                <div class="flex items-start gap-3">
                  <span class="text-lg">{{ insight.icon }}</span>
                  <div>
                    <h4 class="font-medium text-gray-900 dark:text-white">
                      {{ insight.title }}
                    </h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {{ insight.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recommendations -->
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white mb-4"
            >
              💡 Recommendations
            </h3>
            <div class="space-y-4">
              <div
                v-for="recommendation in recommendations"
                :key="recommendation.id"
                class="p-4 rounded-lg bg-gray-50 dark:bg-gray-700"
              >
                <div class="flex items-start gap-3">
                  <span class="text-lg">{{ recommendation.icon }}</span>
                  <div>
                    <h4 class="font-medium text-gray-900 dark:text-white">
                      {{ recommendation.title }}
                    </h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {{ recommendation.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
