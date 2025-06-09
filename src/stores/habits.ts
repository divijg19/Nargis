import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import dayjs from 'dayjs';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  target: number;
  unit: string;
  frequency: 'daily' | 'weekly';
  color: string;
  createdAt: Date;
  streak: number;
  history: HabitEntry[];
  category?: string;
  currentStreak?: number;
  bestStreak?: number;
  completedDays?: HabitEntry[];
  archived?: boolean;
}

export interface HabitEntry {
  date: string; // YYYY-MM-DD
  count: number;
  completed: boolean;
}

export const useHabitStore = defineStore('habits', () => {
  const habits = ref<Habit[]>([]);
  const loading = ref(false);

  // Computed
  const todayProgress = computed(() => {
    const today = dayjs().format('YYYY-MM-DD');
    return habits.value.map(habit => {
      const todayEntry = habit.history.find(entry => entry.date === today);
      const progress = todayEntry ? (todayEntry.count / habit.target) * 100 : 0;
      return {
        ...habit,
        todayCount: todayEntry?.count || 0,
        progress: Math.min(progress, 100),
        completed: todayEntry?.completed || false,
      };
    });
  });

  const totalStreaks = computed(() =>
    habits.value.reduce((total, habit) => total + habit.streak, 0)
  );

  // Actions
  const addHabit = (
    habitData: Partial<
      Omit<Habit, 'id' | 'createdAt' | 'streak' | 'history'>
    > & { name: string }
  ) => {
    const newHabit: Habit = {
      ...habitData,
      id: crypto.randomUUID(),
      name: habitData.name,
      icon: habitData.icon || '⭐',
      target: habitData.target || 1,
      unit: habitData.unit || 'times',
      frequency: habitData.frequency || 'daily',
      color: habitData.color || '#3B82F6',
      category: habitData.category || 'general',
      createdAt: new Date(),
      streak: 0,
      history: [],
      currentStreak: 0,
      bestStreak: 0,
      completedDays: [],
      archived: false,
    };
    habits.value.push(newHabit);
    saveHabits();
  };

  const updateHabitProgress = (habitId: string, count: number) => {
    const habit = habits.value.find(h => h.id === habitId);
    if (!habit) return;

    const today = dayjs().format('YYYY-MM-DD');
    const existingEntryIndex = habit.history.findIndex(
      entry => entry.date === today
    );

    const completed = count >= habit.target;
    const entry: HabitEntry = {
      date: today,
      count,
      completed,
    };

    if (existingEntryIndex !== -1) {
      habit.history[existingEntryIndex] = entry;
    } else {
      habit.history.push(entry);
    }

    // Update streak
    updateStreak(habit);
    saveHabits();
  };

  const updateStreak = (habit: Habit) => {
    const sortedHistory = habit.history.sort(
      (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
    );

    let streak = 0;
    let currentDate = dayjs();

    for (const entry of sortedHistory) {
      if (dayjs(entry.date).isSame(currentDate, 'day') && entry.completed) {
        streak++;
        currentDate = currentDate.subtract(1, 'day');
      } else {
        break;
      }
    }

    habit.streak = streak;
  };

  const deleteHabit = (id: string) => {
    habits.value = habits.value.filter(h => h.id !== id);
    saveHabits();
  };

  const toggleHabitForDate = (habitId: string, date: Date) => {
    const habit = habits.value.find(h => h.id === habitId);
    if (!habit) return;

    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const existingEntry = habit.history.find(entry => entry.date === dateStr);

    if (existingEntry) {
      existingEntry.completed = !existingEntry.completed;
      existingEntry.count = existingEntry.completed ? habit.target : 0;
    } else {
      habit.history.push({
        date: dateStr,
        count: habit.target,
        completed: true,
      });
    }

    updateStreak(habit);
    saveHabits();
  };

  const isHabitCompletedOnDate = (habitId: string, date: Date): boolean => {
    const habit = habits.value.find(h => h.id === habitId);
    if (!habit) return false;

    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const entry = habit.history.find(entry => entry.date === dateStr);
    return entry?.completed || false;
  };

  const saveHabits = () => {
    localStorage.setItem('nargis_habits', JSON.stringify(habits.value));
  };

  const loadHabits = () => {
    const saved = localStorage.getItem('nargis_habits');
    if (saved) {
      habits.value = JSON.parse(saved).map(
        (habit: Omit<Habit, 'createdAt'> & { createdAt: string }) => ({
          ...habit,
          createdAt: new Date(habit.createdAt),
        })
      );
    }
  };

  return {
    habits,
    loading,
    todayProgress,
    totalStreaks,
    addHabit,
    updateHabitProgress,
    deleteHabit,
    toggleHabitForDate,
    isHabitCompletedOnDate,
    loadHabits,
  };
});
