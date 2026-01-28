"use client";

import { useEffect, useState } from "react";
import type { CreateHabitRequest, Habit } from "@/types";
import { ActionButton } from "./ActionButton";
import { Modal } from "./Modal";

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (habit: CreateHabitRequest) => void;
  initialData?: Habit;
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
] as const;

const COLOR_OPTIONS = [
  "var(--palette-1)", // blue
  "var(--palette-2)", // green
  "var(--palette-3)", // amber
  "var(--palette-4)", // red
  "var(--palette-5)", // purple
  "var(--palette-6)", // pink
  "var(--palette-7)", // cyan
  "var(--palette-8)", // orange
];

const ICON_OPTIONS = ["💪", "📚", "🏃", "💧", "🧘", "🎯", "✍️", "🎨"];

export default function HabitModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: HabitModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [target, setTarget] = useState(1);
  const [unit, setUnit] = useState("times");
  const [frequency, setFrequency] =
    useState<CreateHabitRequest["frequency"]>("daily");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [errors, setErrors] = useState<{ name?: string; target?: string }>({});

  // Pre-populate form when editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setIcon(initialData.icon || ICON_OPTIONS[0]);
      setTarget(initialData.target || 1);
      setUnit(initialData.unit || "times");
      setFrequency(initialData.frequency || "daily");
      setColor(initialData.color || COLOR_OPTIONS[0]);
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: { name?: string; target?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Habit name is required";
    } else if (name.trim().length < 3) {
      newErrors.name = "Habit name must be at least 3 characters";
    }

    if (target < 1) {
      newErrors.target = "Target must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const habitData: CreateHabitRequest = {
      name: name.trim(),
      icon,
      target,
      unit: unit.trim(),
      frequency,
      color,
    };

    onSubmit(habitData);
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setIcon(ICON_OPTIONS[0]);
    setTarget(1);
    setUnit("times");
    setFrequency("daily");
    setColor(COLOR_OPTIONS[0]);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? "Edit Habit" : "Create New Habit"}
      size="md"
    >
      <div className="space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground">
          Build a new habit to track daily or weekly
        </p>

        {/* Name Field */}
        <div>
          <label
            htmlFor="habit-name"
            className="block text-sm font-medium text-muted-foreground mb-1"
          >
            Habit Name *
          </label>
          <input
            id="habit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Exercise, Read, Meditate"
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.name}
            </p>
          )}
        </div>

        {/* Icon Selection */}
        <fieldset>
          <legend className="block text-sm font-medium text-muted-foreground mb-2">
            Icon
          </legend>
          <div className="flex gap-2 flex-wrap">
            {ICON_OPTIONS.map((emojiIcon) => (
              <button
                type="button"
                key={emojiIcon}
                onClick={() => setIcon(emojiIcon)}
                className={`w-12 h-12 text-2xl rounded-lg border-2 transition-all ${
                  icon === emojiIcon
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-110"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
                aria-label={`Select icon ${emojiIcon}`}
              >
                {emojiIcon}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Target & Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="habit-target"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              Target *
            </label>
            <input
              id="habit-target"
              type="number"
              min="1"
              value={target}
              onChange={(e) => setTarget(Number.parseInt(e.target.value, 10))}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.target
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
            {errors.target && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.target}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="habit-unit"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              Unit
            </label>
            <input
              id="habit-unit"
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="times, minutes, pages"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-foreground dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Frequency */}
        <fieldset>
          <legend className="block text-sm font-medium text-muted-foreground mb-2">
            Frequency
          </legend>
          <div className="flex gap-2">
            {FREQUENCY_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setFrequency(option.value)}
                className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                  frequency === option.value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-gray-300 dark:border-gray-600 text-muted-foreground dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Color Selection */}
        <fieldset>
          <legend className="block text-sm font-medium text-muted-foreground mb-2">
            Color
          </legend>
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map((colorOption) => (
              <button
                type="button"
                key={colorOption}
                onClick={() => setColor(colorOption)}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  color === colorOption
                    ? "border-border dark:border-white scale-110"
                    : "border-transparent hover:border-gray-400 dark:hover:border-gray-500"
                }`}
                style={{ backgroundColor: colorOption }}
                aria-label={`Select color ${colorOption}`}
              />
            ))}
          </div>
        </fieldset>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <ActionButton
            label="Create Habit"
            variant="primary"
            onClick={handleSubmit}
            className="flex-1"
            icon="✓"
          />
          <ActionButton
            label="Cancel"
            variant="secondary"
            onClick={handleClose}
            icon="✕"
          />
        </div>
      </div>
    </Modal>
  );
}
