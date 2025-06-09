<script setup lang="ts">
import { onMounted } from 'vue';
import { useThemeStore } from './stores/theme';
import SecretAccess from './components/SecretAccess.vue';

const themeStore = useThemeStore();

onMounted(() => {
  themeStore.initializeTheme();
});
</script>

<template>
  <div id="app" class="app-container">
    <router-view />
    <SecretAccess />
  </div>
</template>

<style>
.app-container {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.3s ease;
}
</style>
