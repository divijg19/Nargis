import { createRouter, createWebHistory } from "vue-router";
import Analytics from "../views/Analytics.vue";
import Calendar from "../views/Calendar.vue";
import Dashboard from "../views/Dashboard.vue";
import Habits from "../views/Habits.vue";
import Pomodoro from "../views/Pomodoro.vue";
import SecretPage from "../views/SecretPage.vue";
import Tasks from "../views/Tasks.vue";

const routes = [
  {
    path: "/",
    name: "Dashboard",
    component: Dashboard,
    meta: { title: "Dashboard - Nargis" },
  },
  {
    path: "/tasks",
    name: "Tasks",
    component: Tasks,
    meta: { title: "Tasks - Nargis" },
  },
  {
    path: "/pomodoro",
    name: "Pomodoro",
    component: Pomodoro,
    meta: { title: "Focus Timer - Nargis" },
  },
  {
    path: "/habits",
    name: "Habits",
    component: Habits,
    meta: { title: "Habit Tracker - Nargis" },
  },
  {
    path: "/analytics",
    name: "Analytics",
    component: Analytics,
    meta: { title: "Analytics - Nargis" },
  },
  {
    path: "/calendar",
    name: "Calendar",
    component: Calendar,
    meta: { title: "Calendar - Nargis" },
  },
  {
    path: "/secret/nargis",
    name: "SecretPage",
    component: SecretPage,
    meta: {
      title: "To, Nargis - A Secret Garden",
      secret: true,
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  document.title = (to.meta.title as string) || "Nargis";
});

export default router;
