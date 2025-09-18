<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/solid';
import type { Task } from '../stores/tasks';

interface Props {
  tasks: Task[];
  limit?: number;
}

withDefaults(defineProps<Props>(), {
  limit: 5,
});

const emit = defineEmits<{
  toggleTask: [taskId: string];
}>();

const toggleTask = (taskId: string) => {
  emit('toggleTask', taskId);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'todo':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    case 'inProgress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'done':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'todo':
      return 'To Do';
    case 'inProgress':
      return 'In Progress';
    case 'done':
      return 'Done';
    default:
      return 'Unknown';
  }
};
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="task in tasks.slice(0, limit)"
      :key="task.id"
      class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
    >
      <div class="flex items-center space-x-3">
        <button
          class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200"
          :class="
            task.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
          "
          @click="toggleTask(task.id)"
        >
          <CheckIcon v-if="task.completed" class="w-3 h-3" />
        </button>
        <div>
          <p
            class="text-sm font-medium text-gray-900 dark:text-white"
            :class="{ 'line-through text-gray-500': task.completed }"
          >
            {{ task.title }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {{ task.priority }} priority
          </p>
        </div>
      </div>
      <span
        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
        :class="getStatusColor(task.status)"
      >
        {{ getStatusLabel(task.status) }}
      </span>
    </div>
    <div
      v-if="tasks.length === 0"
      class="text-center py-4 text-gray-500 dark:text-gray-400"
    >
      No tasks yet
    </div>
  </div>
</template>
