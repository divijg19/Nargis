<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useTaskStore } from "../stores/tasks";
import { useThemeStore } from "../stores/theme";

const themeStore = useThemeStore();
const taskStore = useTaskStore();

const isMobileMenuOpen = ref(false);
const showQuickAdd = ref(false);
const quickTaskTitle = ref("");
const quickTaskPriority = ref("medium");
const quickTaskInput = ref<HTMLInputElement>();

const isDark = computed(() => themeStore.isDark);

const _navigationItems = [
  { label: "Dashboard", path: "/", icon: "🏠" },
  { label: "Tasks", path: "/tasks", icon: "✅" },
  { label: "Focus", path: "/pomodoro", icon: "🍅" },
  { label: "Habits", path: "/habits", icon: "🎯" },
  { label: "Calendar", path: "/calendar", icon: "📅" },
  { label: "Analytics", path: "/analytics", icon: "📊" },
];

const _toggleTheme = () => {
  themeStore.setTheme(isDark.value ? "light" : "dark");
};

const _toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const _closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

const _quickAddTask = async () => {
  showQuickAdd.value = true;
  await nextTick();
  quickTaskInput.value?.focus();
};

const _addQuickTask = () => {
  if (quickTaskTitle.value.trim()) {
    taskStore.addTask({
      title: quickTaskTitle.value.trim(),
      priority: quickTaskPriority.value as "low" | "medium" | "high",
    });
    closeQuickAdd();
  }
};

const closeQuickAdd = () => {
  showQuickAdd.value = false;
  quickTaskTitle.value = "";
  quickTaskPriority.value = "medium";
};
</script>

<template>
  <nav
    class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50"
  >
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo and Brand -->
        <div class="flex items-center gap-8">
          <router-link to="/" class="flex items-center gap-3">
            <div
              class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
            >
              <span class="text-white font-bold text-sm">N</span>
            </div>
            <span class="text-xl font-bold text-gray-900 dark:text-white"
              >Nargis</span
            >
          </router-link>

          <!-- Navigation Links -->
          <div class="hidden md:flex items-center space-x-6">
            <router-link
              v-for="item in navigationItems"
              :key="item.path"
              :to="item.path"
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              :class="[
                $route.path === item.path
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700',
              ]"
            >
              <span class="text-lg">{{ item.icon }}</span>
              {{ item.label }}
            </router-link>
          </div>
        </div>

        <!-- Right Side Actions -->
        <div class="flex items-center gap-4">
          <!-- Theme Toggle -->
          <button
            class="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleTheme"
          >
            <svg
              v-if="isDark"
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              ></path>
            </svg>
            <svg
              v-else
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              ></path>
            </svg>
          </button>

          <!-- Quick Actions -->
          <div class="hidden sm:flex items-center gap-2">
            <button
              class="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
              title="Quick add task"
              @click="quickAddTask"
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
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
            </button>
          </div>

          <!-- Mobile Menu Toggle -->
          <button
            class="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
            @click="toggleMobileMenu"
          >
            <svg
              v-if="!isMobileMenuOpen"
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
            <svg
              v-else
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Menu -->
      <div
        v-show="isMobileMenuOpen"
        class="md:hidden border-t border-gray-200 dark:border-gray-700 py-4"
      >
        <div class="space-y-2">
          <router-link
            v-for="item in navigationItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200"
            :class="[
              $route.path === item.path
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700',
            ]"
            @click="closeMobileMenu"
          >
            <span class="text-xl">{{ item.icon }}</span>
            {{ item.label }}
          </router-link>
        </div>

        <!-- Mobile Quick Actions -->
        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            class="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors duration-200"
            @click="quickAddTask"
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
                d="M12 4v16m8-8H4"
              ></path>
            </svg>
            Quick Add Task
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Add Modal -->
    <div
      v-if="showQuickAdd"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      @click="closeQuickAdd"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md"
        @click.stop
      >
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Add Task
          </h3>
          <div class="space-y-4">
            <input
              ref="quickTaskInput"
              v-model="quickTaskTitle"
              type="text"
              placeholder="Enter task title..."
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              @keyup.enter="addQuickTask"
            />
            <select
              v-model="quickTaskPriority"
              class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
          <div class="flex gap-3 mt-6">
            <button
              :disabled="!quickTaskTitle.trim()"
              class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
              @click="addQuickTask"
            >
              Add Task
            </button>
            <button
              class="px-4 py-2 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors duration-200"
              @click="closeQuickAdd"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
