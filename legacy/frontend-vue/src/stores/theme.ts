import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

export type Theme = "light" | "dark" | "auto";

export const useThemeStore = defineStore("theme", () => {
  const theme = ref<Theme>("auto");
  const systemTheme = ref<"light" | "dark">("light");

  const currentTheme = computed(() => {
    if (theme.value === "auto") {
      return systemTheme.value;
    }
    return theme.value;
  });

  const isDark = computed(() => currentTheme.value === "dark");

  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme;
    applyTheme();
    localStorage.setItem("nargis_theme", newTheme);
  };

  const applyTheme = () => {
    const root = document.documentElement;

    if (isDark.value) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  };

  const detectSystemTheme = () => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    systemTheme.value = mediaQuery.matches ? "dark" : "light";

    mediaQuery.addEventListener("change", (e) => {
      systemTheme.value = e.matches ? "dark" : "light";
    });
  };

  const initializeTheme = () => {
    const saved = localStorage.getItem("nargis_theme") as Theme;
    if (saved && ["light", "dark", "auto"].includes(saved)) {
      theme.value = saved;
    }

    detectSystemTheme();
    applyTheme();
  };

  // Watch for theme changes
  watch(currentTheme, applyTheme);

  return {
    theme,
    currentTheme,
    isDark,
    setTheme,
    initializeTheme,
  };
});
