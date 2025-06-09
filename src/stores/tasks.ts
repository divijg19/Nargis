import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'inProgress' | 'done';
  dueDate?: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  pomodoroCount: number;
  completed: boolean; // Add compatibility property
}

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const loading = ref(false);

  // Computed
  const todayTasks = computed(() => {
    const today = new Date().toDateString();
    return tasks.value.filter(
      task => task.dueDate && new Date(task.dueDate).toDateString() === today
    );
  });

  const completedToday = computed(
    () => todayTasks.value.filter(task => task.status === 'done').length
  );

  const tasksByStatus = computed(() => ({
    todo: tasks.value.filter(t => t.status === 'todo'),
    inProgress: tasks.value.filter(t => t.status === 'inProgress'),
    done: tasks.value.filter(t => t.status === 'done'),
  }));

  // Actions
  const addTask = (
    taskData: Partial<
      Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completed'>
    > & { title: string }
  ) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority || 'medium',
      status: taskData.status || 'todo',
      dueDate: taskData.dueDate,
      tags: taskData.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      pomodoroCount: taskData.pomodoroCount || 0,
      completed: false,
    };
    tasks.value.push(newTask);
    saveTasks();
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    const index = tasks.value.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks.value[index] = {
        ...tasks.value[index],
        ...updates,
        updatedAt: new Date(),
      };
      saveTasks();
    }
  };

  const toggleTask = (id: string) => {
    const task = tasks.value.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      task.status = task.completed ? 'done' : 'todo';
      task.updatedAt = new Date();
      saveTasks();
    }
  };

  const deleteTask = (id: string) => {
    tasks.value = tasks.value.filter(t => t.id !== id);
    saveTasks();
  };

  const saveTasks = () => {
    localStorage.setItem('nargis_tasks', JSON.stringify(tasks.value));
  };

  const loadTasks = () => {
    const saved = localStorage.getItem('nargis_tasks');
    if (saved) {
      tasks.value = JSON.parse(saved).map((task: any) => ({
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        completed: task.completed ?? task.status === 'done',
      }));
    }
  };

  return {
    tasks,
    loading,
    todayTasks,
    completedToday,
    tasksByStatus,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    loadTasks,
  };
});
