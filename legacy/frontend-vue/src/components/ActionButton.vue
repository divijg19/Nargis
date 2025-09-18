<script setup lang="ts">
import { computed } from "vue";

interface Props {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  icon?: object | string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  type: "button",
  disabled: false,
  icon: undefined,
});

defineEmits<{
  click: [event: MouseEvent];
}>();

const _sizeClasses = computed(() => {
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return sizes[props.size];
});

const _variantClasses = computed(() => {
  const variants = {
    primary:
      "bg-blue-600 text-white border-blue-600 focus:ring-blue-500 hover:bg-blue-700",
    secondary:
      "bg-gray-100 text-gray-900 border-gray-300 focus:ring-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600",
    danger:
      "bg-red-600 text-white border-red-600 focus:ring-red-500 hover:bg-red-700",
    ghost:
      "bg-transparent text-gray-700 border-gray-300 focus:ring-gray-500 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800",
  };
  return variants[props.variant];
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200"
    :class="[
      sizeClasses,
      variantClasses,
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90',
    ]"
    @click="$emit('click', $event)"
  >
    <component
      :is="icon"
      v-if="icon"
      class="w-4 h-4"
      :class="{ 'mr-2': !!$slots.default }"
    />
    <slot />
  </button>
</template>
