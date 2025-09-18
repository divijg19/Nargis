<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useSecretAccess } from "@/composables/useSecretAccess";

// import { useConfessionsStore } from '@/stores/confessions'

const router = useRouter();
// Remove unused store
// const confessionsStore = useConfessionsStore()

// Initialize secret access system
const { konamiIndex, clickCount, isSecretUnlocked, secretHistory } =
  useSecretAccess();

// UI state
const showUnlockedNotification = ref(false);
const lastUnlockMethod = ref("");

// Check if in development mode
const _isDevelopment = computed(
  () => import.meta.env.DEV || import.meta.env.MODE === "development",
);

// Watch for secret unlock events
watch(
  () => isSecretUnlocked,
  (isUnlocked) => {
    if (isUnlocked && secretHistory.length > 0) {
      const latestAccess = secretHistory[secretHistory.length - 1];
      lastUnlockMethod.value = latestAccess.method;
      showUnlockedNotification.value = true;

      // Navigate to secret page after showing notification
      setTimeout(() => {
        router.push("/secret/nargis");
      }, 2000);
    }
  },
);
</script>

<template>
  <div class="secret-access">
    <!-- Debug indicators - only show in development -->
    <div v-if="isDevelopment" class="debug-indicators">
      <div
        v-if="konamiIndex > 0"
        class="debug-indicator konami-indicator"
        :class="{ pulse: konamiIndex > 0 }"
      >
        Konami: {{ konamiIndex }}/10 ⬆⬆⬇⬇⬅➡⬅➡BA
      </div>

      <div v-if="clickCount > 0" class="debug-indicator click-indicator">
        Clicks: {{ clickCount }}/7
      </div>
    </div>

    <!-- Secret unlocked notification -->
    <Teleport to="body">
      <div
        v-if="showUnlockedNotification"
        class="secret-unlocked-notification"
        @click="showUnlockedNotification = false"
      >
        <div class="notification-content">
          <span class="unlock-icon">🔓</span>
          <div class="unlock-text">
            <div class="unlock-title">Secret Page Unlocked!</div>
            <div class="unlock-method">via {{ lastUnlockMethod }}</div>
          </div>
          <button
            class="unlock-close"
            @click="showUnlockedNotification = false"
          >
            ×
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.secret-access {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

.debug-indicators {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.debug-indicator {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Inter', monospace;
  opacity: 0;
  animation: fadeInOut 3s ease-in-out;
  backdrop-filter: blur(4px);
}

.pulse {
  animation:
    pulse 0.5s ease-in-out,
    fadeInOut 3s ease-in-out;
}

.secret-unlocked-notification {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(10px);
  pointer-events: all;
  animation: fadeIn 0.5s ease-out;
}

.notification-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  gap: 20px;
  max-width: 500px;
  position: relative;
  animation: slideInScale 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.unlock-icon {
  font-size: 48px;
  animation: rotate 2s ease-in-out infinite;
}

.unlock-text {
  flex: 1;
}

.unlock-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  font-family: 'Inter', sans-serif;
}

.unlock-method {
  font-size: 14px;
  opacity: 0.9;
  font-weight: 400;
}

.unlock-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.unlock-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  10%,
  90% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-10px);
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInScale {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .debug-indicator {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .secret-access {
    top: 10px;
    right: 10px;
  }

  .notification-content {
    margin: 20px;
    padding: 24px;
    flex-direction: column;
    text-align: center;
  }

  .unlock-icon {
    font-size: 36px;
  }

  .unlock-title {
    font-size: 20px;
  }
}
</style>
