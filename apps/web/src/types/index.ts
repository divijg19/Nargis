// Core type definitions for Nargis productivity app

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "inProgress" | "done";
  dueDate?: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  pomodoroCount: number;
  completed: boolean;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  target: number;
  unit: string;
  frequency: "daily" | "weekly";
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

export interface PomodoroSession {
  id: string;
  type: "work" | "shortBreak" | "longBreak";
  duration: number; // in minutes
  startTime: Date;
  endTime?: Date;
  completed: boolean;
  taskId?: string;
}

export interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
}

export interface UserStats {
  tasksCompletedToday: number;
  pomodorosCompletedToday: number;
  totalStreaks: number;
  weeklyProgress: number;
}

// Component prop types
export interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  className?: string;
}

export interface ActionButtonProps {
  icon: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  iconPosition?: "left" | "right";
}

export interface TaskPreviewProps {
  tasks: Task[];
  limit?: number;
  onToggleTask: (taskId: string) => void;
}

export interface HabitPreviewProps {
  habits: Habit[];
  limit?: number;
  onUpdateHabit: (habitId: string, count: number) => void;
}

// Store types
export interface TaskStore {
  tasks: Task[];
  loading: boolean;
  todayTasks: Task[];
  completedToday: number;
  tasksByStatus: {
    todo: Task[];
    inProgress: Task[];
    done: Task[];
  };
}

export interface HabitStore {
  habits: Habit[];
  loading: boolean;
  todayProgress: Array<
    Habit & {
      todayCount: number;
      progress: number;
      completed: boolean;
    }
  >;
  totalStreaks: number;
}

export interface PomodoroStore {
  isRunning: boolean;
  currentSession: PomodoroSession | null;
  sessions: PomodoroSession[];
  settings: PomodoroSettings;
  timeRemaining: number;
  currentCycle: number;
  todaySessionsCount: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority: Task["priority"];
  dueDate?: Date;
  tags?: string[];
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  id: string;
  status?: Task["status"];
  completed?: boolean;
}

export interface CreateHabitRequest {
  name: string;
  icon: string;
  target: number;
  unit: string;
  frequency: Habit["frequency"];
  color: string;
  category?: string;
}

export interface UpdateHabitRequest extends Partial<CreateHabitRequest> {
  id: string;
  archived?: boolean;
}
