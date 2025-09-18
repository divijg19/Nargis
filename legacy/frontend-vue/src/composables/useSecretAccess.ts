import { ref, onMounted, onUnmounted } from 'vue';
import { useConfessionsStore } from '@/stores/confessions';

interface SecretAccessOptions {
  konamiCode?: string[];
  secretTriggers?: string[];
  clickThreshold?: number;
  resetDelay?: number;
}

export const useSecretAccess = (options: SecretAccessOptions = {}) => {
  const confessionsStore = useConfessionsStore();

  const defaultOptions = {
    konamiCode: [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'KeyB',
      'KeyA',
    ],
    secretTriggers: ['nargis', 'divij', 'confession', 'love'],
    clickThreshold: 7,
    resetDelay: 3000,
  };

  const config = { ...defaultOptions, ...options };

  // State
  const konamiIndex = ref(0);
  const clickCount = ref(0);
  const typedString = ref('');
  const isListening = ref(false);
  const lastActivity = ref<Date | null>(null);

  // Event handlers
  let keydownHandler: ((_e: KeyboardEvent) => void) | null = null;
  let clickHandler: ((_e: MouseEvent) => void) | null = null;
  let keypressHandler: ((_e: KeyboardEvent) => void) | null = null;
  let resetTimeout: NodeJS.Timeout | null = null;

  const triggerSecret = (method: string) => {
    confessionsStore.unlockSecretPage(method);

    // Visual feedback
    showSecretUnlockedFeedback(method);

    // Reset all counters
    resetCounters();

    console.log(`🔓 Secret page unlocked via: ${method}`);
  };

  const showSecretUnlockedFeedback = (method: string) => {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: 'Inter', sans-serif;
        font-weight: 500;
        animation: slideInRight 0.5s ease-out;
        backdrop-filter: blur(10px);
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 24px;">🔓</span>
          <div>
            <div style="font-size: 14px; font-weight: 600;">Secret Unlocked!</div>
            <div style="font-size: 12px; opacity: 0.9;">Method: ${method}</div>
          </div>
        </div>
      </div>
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.5s ease-out';
      setTimeout(() => {
        document.body.removeChild(notification);
        document.head.removeChild(style);
      }, 500);
    }, 3000);
  };

  const resetCounters = () => {
    konamiIndex.value = 0;
    clickCount.value = 0;
    typedString.value = '';
    lastActivity.value = new Date();
  };

  const setupKonamiCode = () => {
    keydownHandler = (_e: KeyboardEvent) => {
      if (_e.code === config.konamiCode[konamiIndex.value]) {
        konamiIndex.value++;

        if (konamiIndex.value === config.konamiCode.length) {
          triggerSecret('konami-code');
        }
      } else {
        konamiIndex.value = 0;
      }
    };

    document.addEventListener('keydown', keydownHandler);
  };

  const setupClickTrigger = () => {
    clickHandler = (_e: MouseEvent) => {
      const target = _e.target as HTMLElement;

      // Check if clicking on logo/title
      if (
        target.closest('.navbar-title') ||
        target.closest('[data-secret-trigger]')
      ) {
        clickCount.value++;

        if (clickCount.value === config.clickThreshold) {
          triggerSecret('multiple-clicks');
        }

        // Reset click count after delay
        if (resetTimeout) clearTimeout(resetTimeout);
        resetTimeout = setTimeout(() => {
          clickCount.value = 0;
        }, config.resetDelay);
      }
    };

    document.addEventListener('click', clickHandler);
  };

  const setupTypeTrigger = () => {
    keypressHandler = (_e: KeyboardEvent) => {
      // Only track if not in an input field
      const target = _e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      typedString.value += _e.key.toLowerCase();

      // Keep only last 20 characters to prevent memory issues
      if (typedString.value.length > 20) {
        typedString.value = typedString.value.slice(-20);
      }

      // Check for secret triggers
      for (const trigger of config.secretTriggers) {
        if (typedString.value.includes(trigger)) {
          triggerSecret(`typed-word: ${trigger}`);
          break;
        }
      }

      // Clear typed string after delay
      if (resetTimeout) clearTimeout(resetTimeout);
      resetTimeout = setTimeout(() => {
        typedString.value = '';
      }, config.resetDelay);
    };

    document.addEventListener('keypress', keypressHandler);
  };

  const setupSpecialCombinations = () => {
    let ctrlCount = 0;
    let shiftCount = 0;

    const specialKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        ctrlCount++;
        setTimeout(() => ctrlCount--, 1000);
      }

      if (e.key === 'Shift') {
        shiftCount++;
        setTimeout(() => shiftCount--, 1000);
      }

      // Secret combination: Ctrl pressed 5 times + Shift pressed 3 times
      if (ctrlCount >= 5 && shiftCount >= 3) {
        triggerSecret('key-combination');
        ctrlCount = 0;
        shiftCount = 0;
      }
    };

    document.addEventListener('keydown', specialKeyHandler);
  };

  const startListening = () => {
    if (isListening.value) return;

    isListening.value = true;
    setupKonamiCode();
    setupClickTrigger();
    setupTypeTrigger();
    setupSpecialCombinations();
  };

  const stopListening = () => {
    if (!isListening.value) return;

    isListening.value = false;

    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }

    if (clickHandler) {
      document.removeEventListener('click', clickHandler);
      clickHandler = null;
    }

    if (keypressHandler) {
      document.removeEventListener('keypress', keypressHandler);
      keypressHandler = null;
    }

    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }
  };

  // Lifecycle
  onMounted(() => {
    startListening();
  });

  onUnmounted(() => {
    stopListening();
  });

  return {
    // State
    isListening,
    konamiIndex: konamiIndex.value,
    clickCount: clickCount.value,
    lastActivity,

    // Methods
    startListening,
    stopListening,
    triggerSecret,
    resetCounters,

    // Store access
    isSecretUnlocked: confessionsStore.isSecretPageUnlocked,
    secretHistory: confessionsStore.secretAccessHistory,
  };
};
