"use client";

import { useState } from "react";
import { usePomodoroStore } from "@/contexts/PomodoroContext";
import type { PomodoroSettings as PomodoroSettingsType } from "@/types";
import { ActionButton } from "./ActionButton";
import { Modal } from "./Modal";

interface PomodoroSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PomodoroSettings({ isOpen, onClose }: PomodoroSettingsProps) {
  const { settings, updateSettings } = usePomodoroStore();

  const [workDuration, setWorkDuration] = useState(settings.workDuration);
  const [shortBreakDuration, setShortBreakDuration] = useState(
    settings.shortBreakDuration,
  );
  const [longBreakDuration, setLongBreakDuration] = useState(
    settings.longBreakDuration,
  );
  const [longBreakInterval, setLongBreakInterval] = useState(
    settings.longBreakInterval,
  );
  const [autoStartBreaks, setAutoStartBreaks] = useState(
    settings.autoStartBreaks,
  );
  const [autoStartWork, setAutoStartWork] = useState(settings.autoStartWork);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);

  const handleSave = () => {
    const newSettings: PomodoroSettingsType = {
      workDuration,
      shortBreakDuration,
      longBreakDuration,
      longBreakInterval,
      autoStartBreaks,
      autoStartWork,
      soundEnabled,
    };
    updateSettings(newSettings);
    onClose();
  };

  const handleReset = () => {
    setWorkDuration(25);
    setShortBreakDuration(5);
    setLongBreakDuration(15);
    setLongBreakInterval(4);
    setAutoStartBreaks(false);
    setAutoStartWork(false);
    setSoundEnabled(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pomodoro Settings"
      size="md"
    >
      <div className="space-y-6">
        {/* Duration Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Timer Durations
          </h3>

          {/* Work Duration */}
          <div className="space-y-2">
            <label
              htmlFor="work-duration"
              className="block text-sm font-medium text-foreground"
            >
              Focus Duration
            </label>
            <div className="flex items-center gap-3">
              <input
                id="work-duration"
                type="number"
                min="1"
                max="60"
                value={workDuration}
                onChange={(e) =>
                  setWorkDuration(Number.parseInt(e.target.value, 10) || 25)
                }
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <span className="text-sm text-muted-foreground min-w-[60px]">
                minutes
              </span>
            </div>
          </div>

          {/* Short Break Duration */}
          <div className="space-y-2">
            <label
              htmlFor="short-break-duration"
              className="block text-sm font-medium text-foreground"
            >
              Short Break Duration
            </label>
            <div className="flex items-center gap-3">
              <input
                id="short-break-duration"
                type="number"
                min="1"
                max="30"
                value={shortBreakDuration}
                onChange={(e) =>
                  setShortBreakDuration(
                    Number.parseInt(e.target.value, 10) || 5,
                  )
                }
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <span className="text-sm text-muted-foreground min-w-[60px]">
                minutes
              </span>
            </div>
          </div>

          {/* Long Break Duration */}
          <div className="space-y-2">
            <label
              htmlFor="long-break-duration"
              className="block text-sm font-medium text-foreground"
            >
              Long Break Duration
            </label>
            <div className="flex items-center gap-3">
              <input
                id="long-break-duration"
                type="number"
                min="1"
                max="60"
                value={longBreakDuration}
                onChange={(e) =>
                  setLongBreakDuration(
                    Number.parseInt(e.target.value, 10) || 15,
                  )
                }
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <span className="text-sm text-muted-foreground min-w-[60px]">
                minutes
              </span>
            </div>
          </div>

          {/* Long Break Interval */}
          <div className="space-y-2">
            <label
              htmlFor="long-break-interval"
              className="block text-sm font-medium text-foreground"
            >
              Long Break Interval
            </label>
            <div className="flex items-center gap-3">
              <input
                id="long-break-interval"
                type="number"
                min="1"
                max="10"
                value={longBreakInterval}
                onChange={(e) =>
                  setLongBreakInterval(Number.parseInt(e.target.value, 10) || 4)
                }
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <span className="text-sm text-muted-foreground min-w-[60px]">
                sessions
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Take a long break after this many focus sessions
            </p>
          </div>
        </div>

        {/* Auto-start Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Automation
          </h3>

          {/* Auto-start Breaks */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label
                htmlFor="auto-start-breaks"
                className="block text-sm font-medium text-foreground"
              >
                Auto-start Breaks
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically start break timers
              </p>
            </div>
            <button
              type="button"
              id="auto-start-breaks"
              onClick={() => setAutoStartBreaks(!autoStartBreaks)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoStartBreaks ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
              }`}
              role="switch"
              aria-checked={autoStartBreaks}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoStartBreaks ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Auto-start Work */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label
                htmlFor="auto-start-work"
                className="block text-sm font-medium text-foreground"
              >
                Auto-start Focus
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically start focus timers after breaks
              </p>
            </div>
            <button
              type="button"
              id="auto-start-work"
              onClick={() => setAutoStartWork(!autoStartWork)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoStartWork ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
              }`}
              role="switch"
              aria-checked={autoStartWork}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoStartWork ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Sound Enabled */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label
                htmlFor="sound-enabled"
                className="block text-sm font-medium text-foreground"
              >
                Sound Notifications
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Play sounds when sessions complete
              </p>
            </div>
            <button
              type="button"
              id="sound-enabled"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                soundEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
              }`}
              role="switch"
              aria-checked={soundEnabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  soundEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <ActionButton
            icon="↺"
            label="Reset to Defaults"
            variant="secondary"
            size="md"
            onClick={handleReset}
            className="flex-1"
          />
          <ActionButton
            icon="✓"
            label="Save Settings"
            variant="primary"
            size="md"
            onClick={handleSave}
            className="flex-1"
          />
        </div>
      </div>
    </Modal>
  );
}
