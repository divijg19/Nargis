import { cn } from "@/utils";

interface PomodoroPreviewProps {
  isRunning: boolean;
  currentTime: number;
  sessionType: "focus" | "shortBreak" | "longBreak";
  progress: number;
  formattedTime: string;
  todaySessionsCount: number;
  onToggleTimer: () => void;
  onResetTimer: () => void;
}

/**
 * Pomodoro timer preview component
 * Converted from Vue PomodoroPreview.vue
 */
export function PomodoroPreview({
  isRunning,
  sessionType,
  progress,
  formattedTime,
  todaySessionsCount,
  onToggleTimer,
  onResetTimer,
}: PomodoroPreviewProps) {
  const getCurrentSessionLabel = () => {
    switch (sessionType) {
      case "focus":
        return "Focus Time";
      case "shortBreak":
        return "Short Break";
      case "longBreak":
        return "Long Break";
      default:
        return "Pomodoro";
    }
  };

  const progressPercentage = Math.round(progress);

  return (
    <div className="bg-linear-to-br from-red-500 to-orange-500 rounded-lg p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div
            className={cn(
              "w-3 h-3 rounded-full bg-white",
              isRunning ? "opacity-75 animate-pulse" : "opacity-50",
            )}
          />
          <span className="text-sm font-medium">
            {getCurrentSessionLabel()}
          </span>
        </div>
        <span className="text-xs opacity-75">
          {todaySessionsCount} sessions today
        </span>
      </div>

      <div className="text-center mb-4">
        <div className="text-3xl font-bold mb-1">{formattedTime}</div>
        <div className="text-sm opacity-75">{progressPercentage}% complete</div>
      </div>

      <div className="w-full bg-white bg-opacity-25 rounded-full h-2 mb-4">
        <div
          className="bg-white rounded-full h-2 transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="flex justify-center space-x-2">
        <button
          type="button"
          className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-colors duration-200"
          onClick={onToggleTimer}
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-colors duration-200"
          onClick={onResetTimer}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
