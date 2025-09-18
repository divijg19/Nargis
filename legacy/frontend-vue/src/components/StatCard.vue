<script setup lang="ts">
interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: object | string;
  iconBg?: string;
  iconColor?: string;
}

withDefaults(defineProps<Props>(), {
  subtitle: undefined,
  icon: undefined,
  iconBg: 'bg-blue-100 dark:bg-blue-900',
  iconColor: 'text-blue-600 dark:text-blue-400',
});
</script>

<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
  >
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
          {{ title }}
        </p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ value }}
        </p>
        <p v-if="subtitle" class="text-sm text-gray-500 dark:text-gray-400">
          {{ subtitle }}
        </p>
      </div>
      <div v-if="icon" class="p-2 rounded-lg" :class="iconBg">
        <component :is="icon" class="h-6 w-6" :class="iconColor" />
      </div>
    </div>
  </div>
</template>
