import { defineStore } from "pinia";
import { v4 as uuidv4 } from "uuid";
import { computed, ref } from "vue";

export interface Confession {
  id: string;
  content: string;
  timestamp: Date;
  mood?: "happy" | "sad" | "angry" | "confused" | "excited" | "peaceful";
  isAnonymous: boolean;
  tags?: string[];
}

export const useConfessionsStore = defineStore("confessions", () => {
  // State
  const confessions = ref<Confession[]>([]);
  const isSecretPageUnlocked = ref(false);
  const secretAccessHistory = ref<Array<{ method: string; timestamp: Date }>>(
    [],
  );

  // Getters
  const totalConfessions = computed(() => confessions.value.length);
  const recentConfessions = computed(() =>
    confessions.value
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 5),
  );

  const confessionsByMood = computed(() => {
    const moodCounts: Record<string, number> = {};
    confessions.value.forEach((confession) => {
      if (confession.mood) {
        moodCounts[confession.mood] = (moodCounts[confession.mood] || 0) + 1;
      }
    });
    return moodCounts;
  });

  // Actions
  const addConfession = (
    content: string,
    mood?: Confession["mood"],
    tags?: string[],
  ) => {
    const newConfession: Confession = {
      id: uuidv4(),
      content: content.trim(),
      timestamp: new Date(),
      mood,
      isAnonymous: true,
      tags: tags?.filter((tag) => tag.trim()) || [],
    };

    confessions.value.unshift(newConfession);
    saveToStorage();
    return newConfession;
  };

  const deleteConfession = (id: string) => {
    const index = confessions.value.findIndex((c) => c.id === id);
    if (index > -1) {
      confessions.value.splice(index, 1);
      saveToStorage();
      return true;
    }
    return false;
  };

  const updateConfession = (
    id: string,
    updates: Partial<Omit<Confession, "id" | "timestamp">>,
  ) => {
    const confession = confessions.value.find((c) => c.id === id);
    if (confession) {
      Object.assign(confession, updates);
      saveToStorage();
      return confession;
    }
    return null;
  };

  const unlockSecretPage = (method: string) => {
    isSecretPageUnlocked.value = true;
    secretAccessHistory.value.push({
      method,
      timestamp: new Date(),
    });

    // Store unlock status
    try {
      localStorage.setItem("secretPageUnlocked", "true");
      localStorage.setItem(
        "secretAccessHistory",
        JSON.stringify(secretAccessHistory.value),
      );
    } catch (error) {
      console.warn("Could not save secret page status to localStorage:", error);
    }
  };

  const lockSecretPage = () => {
    isSecretPageUnlocked.value = false;
    try {
      localStorage.removeItem("secretPageUnlocked");
    } catch (error) {
      console.warn(
        "Could not remove secret page status from localStorage:",
        error,
      );
    }
  };

  const clearAllConfessions = () => {
    confessions.value = [];
    saveToStorage();
  };

  const exportConfessions = () => {
    const data = {
      confessions: confessions.value,
      exportDate: new Date().toISOString(),
      totalCount: confessions.value.length,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `confessions-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const saveToStorage = () => {
    try {
      localStorage.setItem("confessions", JSON.stringify(confessions.value));
    } catch (error) {
      console.warn("Could not save confessions to localStorage:", error);
    }
  };

  const loadFromStorage = () => {
    try {
      // Load confessions
      const stored = localStorage.getItem("confessions");
      if (stored) {
        const parsed = JSON.parse(stored);
        confessions.value = parsed.map(
          (c: Omit<Confession, "timestamp"> & { timestamp: string }) => ({
            ...c,
            timestamp: new Date(c.timestamp),
          }),
        );
      }

      // Load secret page status
      isSecretPageUnlocked.value =
        localStorage.getItem("secretPageUnlocked") === "true";

      // Load access history
      const historyStored = localStorage.getItem("secretAccessHistory");
      if (historyStored) {
        const parsed = JSON.parse(historyStored);
        secretAccessHistory.value = parsed.map(
          (
            h: Omit<(typeof secretAccessHistory.value)[0], "timestamp"> & {
              timestamp: string;
            },
          ) => ({
            ...h,
            timestamp: new Date(h.timestamp),
          }),
        );
      }
    } catch (error) {
      console.warn("Could not load data from localStorage:", error);
    }
  };

  // Initialize
  loadFromStorage();

  return {
    // State
    confessions,
    isSecretPageUnlocked,
    secretAccessHistory,

    // Getters
    totalConfessions,
    recentConfessions,
    confessionsByMood,

    // Actions
    addConfession,
    deleteConfession,
    updateConfession,
    unlockSecretPage,
    lockSecretPage,
    clearAllConfessions,
    exportConfessions,
    loadFromStorage,
  };
});
