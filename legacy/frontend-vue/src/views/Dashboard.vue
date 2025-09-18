<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useTaskStore } from '../stores/tasks';
import { useHabitStore } from '../stores/habits';
import { usePomodoroStore } from '../stores/pomodoro';

import NavBar from '../components/NavBar.vue';
import StatCard from '../components/StatCard.vue';
import DashboardCard from '../components/DashboardCard.vue';
import ActionButton from '../components/ActionButton.vue';
import TaskPreview from '../components/TaskPreview.vue';
import PomodoroPreview from '../components/PomodoroPreview.vue';
import HabitPreview from '../components/HabitPreview.vue';

const taskStore = useTaskStore();
const habitStore = useHabitStore();
const pomodoroStore = usePomodoroStore();

const weeklyProgress = computed(() => {
  // Calculate weekly progress based on completed tasks and habits
  const tasksThisWeek = taskStore.tasks.filter(task => {
    const taskDate = new Date(task.updatedAt);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return taskDate >= weekStart && task.status === 'done';
  }).length;

  const target = 20; // Weekly target
  return Math.min(Math.round((tasksThisWeek / target) * 100), 100);
});

const togglePomodoro = () => {
  if (pomodoroStore.isRunning) {
    pomodoroStore.pauseTimer();
  } else {
    pomodoroStore.startTimer();
  }
};

const resetPomodoro = () => {
  pomodoroStore.resetTimer();
};

onMounted(() => {
  taskStore.loadTasks();
  habitStore.loadHabits();
  pomodoroStore.loadSessions();
});
</script>

<template>
  <div class="dashboard-view">
    <NavBar />

    <main class="main-content">
      <!-- Dashboard Header -->
      <div class="dashboard-header">
        <h1>Welcome back!</h1>
        <p class="dashboard-subtitle">Here's your productivity overview</p>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <StatCard
          title="Tasks Completed Today"
          :value="taskStore.completedToday"
          icon="✅"
        />
        <StatCard
          title="Pomodoros Completed"
          :value="pomodoroStore.todaySessionsCount"
          icon="🍅"
        />
        <StatCard
          title="Total Streaks"
          :value="habitStore.totalStreaks"
          icon="🔥"
        />
        <StatCard title="Weekly Goal" :value="`${weeklyProgress}%`" icon="📊" />
      </div>

      <!-- Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- Quick Actions -->
        <DashboardCard title="Quick Actions" class="quick-actions">
          <div class="action-buttons">
            <ActionButton
              icon="➕"
              label="Add Task"
              variant="primary"
              @click="$router.push('/tasks')"
            />
            <ActionButton
              icon="🍅"
              label="Start Focus"
              variant="secondary"
              @click="$router.push('/pomodoro')"
            />
            <ActionButton
              icon="⚡"
              label="Track Habit"
              variant="secondary"
              @click="$router.push('/habits')"
            />
          </div>
        </DashboardCard>

        <!-- Today's Tasks -->
        <DashboardCard title="Today's Tasks">
          <TaskPreview :tasks="taskStore.todayTasks.slice(0, 3)" />
          <button class="view-all-btn" @click="$router.push('/tasks')">
            View All Tasks
          </button>
        </DashboardCard>

        <!-- Focus Session -->
        <DashboardCard title="Focus Session">
          <PomodoroPreview
            :is-running="pomodoroStore.isRunning"
            :current-time="pomodoroStore.currentTime"
            :session-type="pomodoroStore.sessionType"
            :progress="pomodoroStore.progress"
            :formatted-time="pomodoroStore.formattedTime"
            :today-sessions-count="pomodoroStore.todaySessionsCount"
            @toggle-timer="togglePomodoro"
            @reset-timer="resetPomodoro"
          />
        </DashboardCard>

        <!-- Habit Progress -->
        <DashboardCard title="Habit Progress">
          <HabitPreview :habits="habitStore.todayProgress.slice(0, 3)" />
          <button class="view-all-btn" @click="$router.push('/habits')">
            View All Habits
          </button>
        </DashboardCard>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard-view {
  min-height: 100vh;
  background: var(--bg-primary);
}

.main-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.dashboard-subtitle {
  font-size: 1.125rem;
  color: var(--text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.view-all-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 1rem;
}

.view-all-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }

  .dashboard-header h1 {
    font-size: 2rem;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>
