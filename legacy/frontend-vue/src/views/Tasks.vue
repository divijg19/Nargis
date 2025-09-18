<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTaskStore } from '../stores/tasks';
import NavBar from '../components/NavBar.vue';

const taskStore = useTaskStore();
const newTaskTitle = ref('');
const filter = ref('all');

const tasks = computed(() => taskStore.tasks);
const completedTasks = computed(() =>
  tasks.value.filter(task => task.completed)
);
const inProgressTasks = computed(() =>
  tasks.value.filter(task => task.status === 'inProgress')
);
const highPriorityTasks = computed(() =>
  tasks.value.filter(task => task.priority === 'high')
);

const filteredTasks = computed(() => {
  const allTasks = tasks.value;

  switch (filter.value) {
    case 'todo':
      return allTasks.filter(task => !task.completed && task.status === 'todo');
    case 'in-progress':
      return allTasks.filter(
        task => !task.completed && task.status === 'inProgress'
      );
    case 'completed':
      return allTasks.filter(task => task.completed);
    default:
      return allTasks;
  }
});

const addTask = () => {
  if (newTaskTitle.value.trim()) {
    taskStore.addTask({
      title: newTaskTitle.value.trim(),
      priority: 'medium',
    });
    newTaskTitle.value = '';
  }
};

const toggleTask = (id: string) => {
  taskStore.toggleTask(id);
};

const deleteTask = (id: string) => {
  taskStore.deleteTask(id);
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
            Task Management
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            Organize and track your tasks efficiently
          </p>
        </div>

        <!-- Quick Actions -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
        >
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="flex-1">
              <input
                v-model="newTaskTitle"
                type="text"
                placeholder="Add a new task..."
                class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                @keyup.enter="addTask"
              />
            </div>
            <button
              :disabled="!newTaskTitle.trim()"
              class="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
              @click="addTask"
            >
              Add Task
            </button>
          </div>
        </div>

        <!-- Task Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center">
              <div
                class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center"
              >
                <span class="text-blue-600 dark:text-blue-400 text-lg">📋</span>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Tasks
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ tasks.length }}
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
                  >✅</span
                >
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Completed
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ completedTasks.length }}
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
                  >⏳</span
                >
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  In Progress
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ inProgressTasks.length }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div class="flex items-center">
              <div
                class="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center"
              >
                <span class="text-red-600 dark:text-red-400 text-lg">❗</span>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  High Priority
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ highPriorityTasks.length }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Task List -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div class="p-6 border-b border-gray-200 dark:border-gray-700">
            <div
              class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                Your Tasks
              </h2>
              <div class="flex gap-2">
                <select
                  v-model="filter"
                  class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">All Tasks</option>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div class="p-6">
            <div v-if="filteredTasks.length === 0" class="text-center py-12">
              <div
                class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <span class="text-gray-400 text-2xl">📝</span>
              </div>
              <p class="text-gray-500 dark:text-gray-400">No tasks found</p>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="task in filteredTasks"
                :key="task.id"
                class="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <input
                  type="checkbox"
                  :checked="task.completed"
                  class="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                  @change="toggleTask(task.id)"
                />

                <div class="ml-4 flex-1">
                  <h3
                    class="font-medium"
                    :class="[
                      task.completed
                        ? 'text-gray-500 dark:text-gray-400 line-through'
                        : 'text-gray-900 dark:text-white',
                    ]"
                  >
                    {{ task.title }}
                  </h3>
                  <div class="flex items-center gap-4 mt-1">
                    <span
                      class="px-2 py-1 text-xs rounded-full"
                      :class="[
                        {
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200':
                            task.priority === 'low',
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200':
                            task.priority === 'medium',
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200':
                            task.priority === 'high',
                        },
                      ]"
                    >
                      {{ task.priority }} priority
                    </span>
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDate(task.createdAt) }}
                    </span>
                  </div>
                </div>

                <button
                  class="ml-4 p-2 text-gray-400 hover:text-red-600 transition-colors"
                  @click="deleteTask(task.id)"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
