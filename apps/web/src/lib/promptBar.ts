import { BarChart3, CalendarDays, Clock, SquarePen } from "lucide-react";

export type PromptBarAction = {
  title: string;
  subtitle: string;
  prompt: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export const PROMPT_BAR_ACTIONS: PromptBarAction[] = [
  {
    title: "Plan my day",
    subtitle: "Then list my top 3 priorities",
    prompt: "Plan my day: list my top 3 priorities",
    icon: CalendarDays,
  },
  {
    title: "Start a journal entry",
    subtitle: "About my progress this week",
    prompt: "Start a journal entry about my progress this week",
    icon: SquarePen,
  },
  {
    title: "Track a new habit",
    subtitle: "Like read for 15 minutes daily",
    prompt: "Track a new habit: read for 15 minutes daily",
    icon: BarChart3,
  },
  {
    title: "Begin a focus session",
    subtitle: "By saying start Pomodoro",
    prompt: "Begin a focus session: start Pomodoro",
    icon: Clock,
  },
];
