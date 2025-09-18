<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { type Confession, useConfessionsStore } from "@/stores/confessions";

const router = useRouter();
const confessionsStore = useConfessionsStore();

// Form state
const newConfession = ref({
  content: "",
  mood: undefined as Confession["mood"] | undefined,
  tags: [] as string[],
});

const newTag = ref("");
const isSubmitting = ref(false);
const showClearConfirm = ref(false);

// Mood options
const moods = [
  { value: "happy", emoji: "😊", label: "Happy" },
  { value: "sad", emoji: "😢", label: "Sad" },
  { value: "angry", emoji: "😠", label: "Angry" },
  { value: "confused", emoji: "😕", label: "Confused" },
  { value: "excited", emoji: "🤗", label: "Excited" },
  { value: "peaceful", emoji: "😌", label: "Peaceful" },
] as const;

// Computed
const _confessions = computed(() => confessionsStore.confessions);
const _totalConfessions = computed(() => confessionsStore.totalConfessions);

const _unlockMethod = computed(() => {
  const history = confessionsStore.secretAccessHistory;
  if (history.length > 0) {
    const latest = history[history.length - 1];
    return `Unlocked via ${latest.method}`;
  }
  return "Secret access";
});

// Methods
const _goBack = () => {
  router.push("/");
};

const _selectMood = (mood: Confession["mood"]) => {
  newConfession.value.mood =
    newConfession.value.mood === mood ? undefined : mood;
};

const addTag = () => {
  const tag = newTag.value.trim().toLowerCase();
  if (
    tag &&
    !newConfession.value.tags.includes(tag) &&
    newConfession.value.tags.length < 5
  ) {
    newConfession.value.tags.push(tag);
    newTag.value = "";
  }
};

const _handleTagKeydown = (event: KeyboardEvent) => {
  if (event.key === ",") {
    event.preventDefault();
    addTag();
  }
};

const _removeTag = (tagToRemove: string) => {
  const index = newConfession.value.tags.indexOf(tagToRemove);
  if (index > -1) {
    newConfession.value.tags.splice(index, 1);
  }
};

const _submitConfession = async () => {
  if (!newConfession.value.content.trim() || isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate async operation

    confessionsStore.addConfession(
      newConfession.value.content,
      newConfession.value.mood,
      newConfession.value.tags,
    );

    // Reset form
    newConfession.value = {
      content: "",
      mood: undefined,
      tags: [],
    };

    // Show success feedback
    showSuccessMessage();
  } catch (error) {
    console.error("Error saving confession:", error);
  } finally {
    isSubmitting.value = false;
  }
};

const _deleteConfession = (id: string) => {
  confessionsStore.deleteConfession(id);
};

const _exportConfessions = () => {
  confessionsStore.exportConfessions();
};

const _confirmClearAll = () => {
  confessionsStore.clearAllConfessions();
  showClearConfirm.value = false;
};

const _getMoodEmoji = (mood: Confession["mood"]) => {
  return moods.find((m) => m.value === mood)?.emoji || "💭";
};

const _formatDate = (date: Date) => {
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    "day",
  );
};

const showSuccessMessage = () => {
  // Create temporary success notification
  const notification = document.createElement("div");
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 10000;
      font-weight: 500;
      animation: slideDown 0.5s ease-out;
    ">
      💕 Confession saved successfully!
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideDown {
      from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(notification);

  setTimeout(() => {
    document.body.removeChild(notification);
    document.head.removeChild(style);
  }, 3000);
};

onMounted(() => {
  // Load confessions if not already loaded
  confessionsStore.loadFromStorage();
});
</script>

<template>
  <div class="secret-page">
    <!-- Header -->
    <header class="secret-header">
      <div class="header-content">
        <button class="back-button" aria-label="Go back" @click="goBack">
          <ChevronLeftIcon class="w-5 h-5" />
          Back
        </button>

        <div class="header-info">
          <h1 class="page-title">💕 Secret Confessions</h1>
          <p class="page-subtitle">A safe space for your thoughts</p>
        </div>

        <div class="stats">
          <span class="stat-item">{{ totalConfessions }} confessions</span>
          <span class="stat-divider">•</span>
          <span class="stat-item">{{ unlockMethod }}</span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-container">
        <!-- New Confession Form -->
        <section class="confession-form-section">
          <div class="form-card">
            <h2 class="form-title">Share Your Heart 💖</h2>
            <form class="confession-form" @submit.prevent="submitConfession">
              <!-- Confession Text -->
              <div class="form-group">
                <label for="confession-text" class="form-label"
                  >What's on your mind?</label
                >
                <textarea
                  id="confession-text"
                  v-model="newConfession.content"
                  placeholder="Pour your heart out... everything you write here stays completely private and anonymous."
                  class="confession-textarea"
                  rows="6"
                  maxlength="2000"
                  required
                ></textarea>
                <div class="character-count">
                  {{ newConfession.content.length }}/2000
                </div>
              </div>

              <!-- Mood Selection -->
              <div class="form-group">
                <label class="form-label">How are you feeling?</label>
                <div class="mood-selector">
                  <button
                    v-for="mood in moods"
                    :key="mood.value"
                    type="button"
                    class="mood-button"
                    :class="{ selected: newConfession.mood === mood.value }"
                    @click="selectMood(mood.value)"
                  >
                    <span class="mood-emoji">{{ mood.emoji }}</span>
                    <span class="mood-label">{{ mood.label }}</span>
                  </button>
                </div>
              </div>

              <!-- Tags -->
              <div class="form-group">
                <label class="form-label">Tags (optional)</label>
                <div class="tags-input">
                  <div class="tag-chips">
                    <span
                      v-for="tag in newConfession.tags"
                      :key="tag"
                      class="tag-chip"
                    >
                      {{ tag }}
                      <button
                        type="button"
                        class="tag-remove"
                        @click="removeTag(tag)"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                  <input
                    v-model="newTag"
                    placeholder="Add tags... (press Enter or comma)"
                    class="tag-input"
                    maxlength="20"
                    @keydown.enter.prevent="addTag"
                    @keydown="handleTagKeydown"
                  />
                </div>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                :disabled="!newConfession.content.trim() || isSubmitting"
                class="submit-button"
              >
                <span v-if="isSubmitting">Saving...</span>
                <span v-else>💕 Share Confession</span>
              </button>
            </form>
          </div>
        </section>

        <!-- Confessions List -->
        <section class="confessions-section">
          <div class="section-header">
            <h2 class="section-title">Recent Confessions</h2>
            <div class="actions">
              <button
                class="action-button"
                title="Export confessions"
                @click="exportConfessions"
              >
                <DownloadIcon class="w-4 h-4" />
                Export
              </button>
              <button
                class="action-button danger"
                title="Clear all"
                @click="showClearConfirm = true"
              >
                <TrashIcon class="w-4 h-4" />
                Clear All
              </button>
            </div>
          </div>

          <div v-if="confessions.length === 0" class="empty-state">
            <div class="empty-icon">💭</div>
            <h3 class="empty-title">No confessions yet</h3>
            <p class="empty-description">
              Share your first confession above to get started!
            </p>
          </div>

          <div v-else class="confessions-grid">
            <article
              v-for="confession in confessions"
              :key="confession.id"
              class="confession-card"
              :data-mood="confession.mood"
            >
              <div class="confession-header">
                <div class="confession-meta">
                  <span v-if="confession.mood" class="confession-mood">
                    {{ getMoodEmoji(confession.mood) }}
                  </span>
                  <time class="confession-date">
                    {{ formatDate(confession.timestamp) }}
                  </time>
                </div>
                <button
                  class="delete-button"
                  title="Delete confession"
                  @click="deleteConfession(confession.id)"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>

              <div class="confession-content">
                {{ confession.content }}
              </div>

              <div
                v-if="confession.tags && confession.tags.length > 0"
                class="confession-tags"
              >
                <span
                  v-for="tag in confession.tags"
                  :key="tag"
                  class="confession-tag"
                >
                  #{{ tag }}
                </span>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>

    <!-- Clear Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showClearConfirm"
        class="modal-overlay"
        @click="showClearConfirm = false"
      >
        <div class="modal-content" @click.stop>
          <h3 class="modal-title">Clear All Confessions?</h3>
          <p class="modal-description">
            This will permanently delete all your confessions. This action
            cannot be undone.
          </p>
          <div class="modal-actions">
            <button
              class="modal-button secondary"
              @click="showClearConfirm = false"
            >
              Cancel
            </button>
            <button class="modal-button danger" @click="confirmClearAll">
              Clear All
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.secret-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #f3e8ff 100%);
  font-family: 'Inter', sans-serif;
}

.secret-header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(219, 39, 119, 0.1);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(219, 39, 119, 0.1);
  border: 1px solid rgba(219, 39, 119, 0.2);
  border-radius: 8px;
  color: #be185d;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}

.back-button:hover {
  background: rgba(219, 39, 119, 0.2);
  transform: translateX(-2px);
}

.header-info {
  flex: 1;
  text-align: center;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #be185d, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.stat-divider {
  opacity: 0.5;
}

.main-content {
  padding: 2rem 0;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

.confession-form-section,
.confessions-section {
  min-height: 0;
}

.form-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(219, 39, 119, 0.1);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 120px;
}

.form-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #be185d;
  margin-bottom: 1.5rem;
  text-align: center;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.confession-textarea {
  width: 100%;
  padding: 1rem;
  border: 2px solid rgba(219, 39, 119, 0.2);
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s ease;
  background: rgba(255, 255, 255, 0.5);
}

.confession-textarea:focus {
  outline: none;
  border-color: #be185d;
  box-shadow: 0 0 0 3px rgba(190, 24, 93, 0.1);
}

.character-count {
  text-align: right;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.mood-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.mood-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem;
  border: 2px solid rgba(219, 39, 119, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mood-button:hover {
  border-color: rgba(219, 39, 119, 0.3);
  transform: translateY(-1px);
}

.mood-button.selected {
  border-color: #be185d;
  background: rgba(190, 24, 93, 0.1);
}

.mood-emoji {
  font-size: 1.5rem;
}

.mood-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
}

.tags-input {
  border: 2px solid rgba(219, 39, 119, 0.2);
  border-radius: 8px;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.5);
  transition: border-color 0.2s ease;
}

.tags-input:focus-within {
  border-color: #be185d;
}

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.tag-chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(190, 24, 93, 0.1);
  color: #be185d;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.tag-remove {
  background: none;
  border: none;
  color: #be185d;
  cursor: pointer;
  font-weight: bold;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
}

.submit-button {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #be185d, #7c3aed);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(190, 24, 93, 0.3);
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(190, 24, 93, 0.4);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #be185d;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(219, 39, 119, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: #be185d;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: rgba(190, 24, 93, 0.1);
}

.action-button.danger {
  border-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.action-button.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
}

.confessions-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.confession-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(219, 39, 119, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  position: relative;
}

.confession-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.confession-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.confession-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.confession-mood {
  font-size: 1.25rem;
}

.confession-date {
  font-size: 0.75rem;
  color: #6b7280;
}

.delete-button {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.delete-button:hover {
  background: rgba(239, 68, 68, 0.1);
}

.confession-content {
  font-size: 0.875rem;
  line-height: 1.6;
  color: #374151;
  margin-bottom: 1rem;
  white-space: pre-wrap;
}

.confession-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.confession-tag {
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 0.5rem;
}

.modal-description {
  color: #6b7280;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-button {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-button.secondary {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #374151;
}

.modal-button.secondary:hover {
  background: #e5e7eb;
}

.modal-button.danger {
  background: #ef4444;
  border: 1px solid #ef4444;
  color: white;
}

.modal-button.danger:hover {
  background: #dc2626;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .content-container {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .form-card {
    position: static;
  }

  .mood-selector {
    grid-template-columns: repeat(2, 1fr);
  }

  .modal-content {
    margin: 1rem;
  }

  .modal-actions {
    flex-direction: column;
  }
}
</style>
