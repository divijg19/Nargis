<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTaskStore } from '../stores/tasks';
// import { usePomodoroStore } from '../stores/pomodoro'
import { useHabitStore } from '../stores/habits';
import NavBar from '../components/NavBar.vue';

const taskStore = useTaskStore();
// const pomodoroStore = usePomodoroStore()
const habitStore = useHabitStore();

const currentDate = ref(new Date());
const selectedDate = ref<Date | null>(null);

const daysOfWeek = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const currentMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
});

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);

  // Start from the beginning of the week for the first day
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // End at the end of the week for the last day
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    days.push({
      date: new Date(current),
      isCurrentMonth: current.getMonth() === month,
      isToday: isSameDay(current, new Date()),
    });
    current.setDate(current.getDate() + 1);
  }

  return days;
});

const previousMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  );
};

const nextMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  );
};

const goToToday = () => {
  currentDate.value = new Date();
  selectedDate.value = new Date();
};

const selectDate = (date: Date) => {
  selectedDate.value = date;
};

const openQuickAdd = (date: Date) => {
  // Mock function - would open a modal to quickly add tasks/habits
  console.log('Quick add for', date);
};

const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

const getTasksForDate = (date: Date) => {
  // Mock function - would filter tasks for the specific date
  return taskStore.tasks.filter(task => {
    const taskDate = new Date(task.createdAt);
    return isSameDay(taskDate, date);
  });
};

const getFocusSessionsForDate = (date: Date) => {
  // Mock function - would return focus sessions count for the date
  // Use date to create consistent mock data
  return Math.floor((date.getDate() + date.getMonth()) / 8) % 5;
};

const getHabitsForDate = (date: Date) => {
  // Mock function - would return completed habits for the date
  return habitStore.habits.filter(habit =>
    habitStore.isHabitCompletedOnDate(habit.id, date)
  );
};

const getDueTasksForDate = (date: Date) => {
  // Mock function - would return tasks due on this date
  return taskStore.tasks.filter(task => {
    // Assuming tasks have a dueDate property
    return (
      task.dueDate && isSameDay(new Date(task.dueDate), date) && !task.completed
    );
  });
};

const getProductivityScore = (date: Date) => {
  // Mock calculation of productivity score for the date
  const tasks = getTasksForDate(date);
  const completedTasks = tasks.filter(t => t.completed).length;
  const focusSessions = getFocusSessionsForDate(date);
  const habits = getHabitsForDate(date).length;

  // Simple scoring algorithm
  const score = completedTasks * 20 + focusSessions * 15 + habits * 10;
  return Math.min(100, score);
};

const formatSelectedDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <NavBar />

    <main class="container mx-auto px-4 py-8">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <div
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Calendar
              </h1>
              <p class="text-gray-600 dark:text-gray-400">
                View and manage your tasks, habits, and focus sessions
              </p>
            </div>

            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <button
                  class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  @click="previousMonth"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 19l-7-7 7-7"
                    ></path>
                  </svg>
                </button>

                <h2
                  class="text-xl font-semibold text-gray-900 dark:text-white min-w-max"
                >
                  {{ currentMonthYear }}
                </h2>

                <button
                  class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  @click="nextMonth"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    ></path>
                  </svg>
                </button>
              </div>

              <button
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                @click="goToToday"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        <!-- Calendar Legend -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6"
        >
          <div class="flex flex-wrap items-center gap-6">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              <span class="text-sm text-gray-600 dark:text-gray-400"
                >Completed Tasks</span
              >
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span class="text-sm text-gray-600 dark:text-gray-400"
                >Focus Sessions</span
              >
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span class="text-sm text-gray-600 dark:text-gray-400"
                >Habit Streaks</span
              >
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span class="text-sm text-gray-600 dark:text-gray-400"
                >Due Tasks</span
              >
            </div>
          </div>
        </div>

        <!-- Calendar Grid -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <!-- Days of Week Header -->
          <div
            class="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700"
          >
            <div
              v-for="day in daysOfWeek"
              :key="day"
              class="p-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700"
            >
              {{ day }}
            </div>
          </div>

          <!-- Calendar Days -->
          <div class="grid grid-cols-7">
            <div
              v-for="day in calendarDays"
              :key="`${day.date.getMonth()}-${day.date.getDate()}`"
              class="min-h-[120px] p-2 border-b border-r border-gray-200 dark:border-gray-700 relative last:border-r-0"
              :class="[
                day.isCurrentMonth
                  ? 'bg-white dark:bg-gray-800'
                  : 'bg-gray-50 dark:bg-gray-700',
                day.isToday ? 'ring-2 ring-blue-500 ring-inset' : '',
              ]"
              @click="selectDate(day.date)"
            >
              <!-- Date Number -->
              <div class="flex justify-between items-start mb-2">
                <span
                  class="text-sm font-medium"
                  :class="[
                    day.isCurrentMonth
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-500',
                    day.isToday
                      ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs'
                      : '',
                  ]"
                >
                  {{ day.date.getDate() }}
                </span>
              </div>

              <!-- Day Activities -->
              <div class="space-y-1">
                <!-- Tasks -->
                <div
                  v-if="getTasksForDate(day.date).length > 0"
                  class="flex items-center gap-1"
                >
                  <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span class="text-xs text-gray-600 dark:text-gray-400">
                    {{ getTasksForDate(day.date).length }} tasks
                  </span>
                </div>

                <!-- Focus Sessions -->
                <div
                  v-if="getFocusSessionsForDate(day.date) > 0"
                  class="flex items-center gap-1"
                >
                  <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span class="text-xs text-gray-600 dark:text-gray-400">
                    {{ getFocusSessionsForDate(day.date) }} sessions
                  </span>
                </div>

                <!-- Habits -->
                <div
                  v-if="getHabitsForDate(day.date).length > 0"
                  class="flex items-center gap-1"
                >
                  <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span class="text-xs text-gray-600 dark:text-gray-400">
                    {{ getHabitsForDate(day.date).length }} habits
                  </span>
                </div>

                <!-- Due Tasks -->
                <div
                  v-if="getDueTasksForDate(day.date).length > 0"
                  class="flex items-center gap-1"
                >
                  <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span class="text-xs text-gray-600 dark:text-gray-400">
                    {{ getDueTasksForDate(day.date).length }} due
                  </span>
                </div>
              </div>

              <!-- Quick Actions (on hover) -->
              <div
                class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <button
                  class="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                  @click.stop="openQuickAdd(day.date)"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Date Details -->
        <div
          v-if="selectedDate"
          class="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {{ formatSelectedDate(selectedDate) }}
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Tasks for Selected Date -->
            <div>
              <h4
                class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2"
              >
                <span class="w-3 h-3 bg-green-500 rounded-full"></span>
                Tasks ({{ getTasksForDate(selectedDate).length }})
              </h4>
              <div class="space-y-2">
                <div
                  v-for="task in getTasksForDate(selectedDate).slice(0, 5)"
                  :key="task.id"
                  class="p-2 rounded-lg bg-gray-50 dark:bg-gray-700"
                >
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ task.title }}
                  </p>
                  <p
                    class="text-xs text-gray-500 dark:text-gray-400 capitalize"
                  >
                    {{ task.priority }} priority
                  </p>
                </div>
                <div
                  v-if="getTasksForDate(selectedDate).length === 0"
                  class="text-sm text-gray-500 dark:text-gray-400"
                >
                  No tasks scheduled
                </div>
              </div>
            </div>

            <!-- Habits for Selected Date -->
            <div>
              <h4
                class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2"
              >
                <span class="w-3 h-3 bg-orange-500 rounded-full"></span>
                Habits ({{ getHabitsForDate(selectedDate).length }})
              </h4>
              <div class="space-y-2">
                <div
                  v-for="habit in getHabitsForDate(selectedDate).slice(0, 5)"
                  :key="habit.id"
                  class="p-2 rounded-lg bg-gray-50 dark:bg-gray-700"
                >
                  <p class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ habit.name }}
                  </p>
                  <p
                    class="text-xs text-gray-500 dark:text-gray-400 capitalize"
                  >
                    {{ habit.category }}
                  </p>
                </div>
                <div
                  v-if="getHabitsForDate(selectedDate).length === 0"
                  class="text-sm text-gray-500 dark:text-gray-400"
                >
                  No habits tracked
                </div>
              </div>
            </div>

            <!-- Stats for Selected Date -->
            <div>
              <h4
                class="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2"
              >
                <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
                Daily Stats
              </h4>
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400"
                    >Focus Sessions</span
                  >
                  <span
                    class="text-sm font-medium text-gray-900 dark:text-white"
                    >{{ getFocusSessionsForDate(selectedDate) }}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400"
                    >Tasks Completed</span
                  >
                  <span
                    class="text-sm font-medium text-gray-900 dark:text-white"
                    >{{
                      getTasksForDate(selectedDate).filter(t => t.completed)
                        .length
                    }}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400"
                    >Habits Done</span
                  >
                  <span
                    class="text-sm font-medium text-gray-900 dark:text-white"
                    >{{ getHabitsForDate(selectedDate).length }}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400"
                    >Productivity Score</span
                  >
                  <span
                    class="text-sm font-medium text-gray-900 dark:text-white"
                    >{{ getProductivityScore(selectedDate) }}%</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
