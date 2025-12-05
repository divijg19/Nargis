"use client";

import { useState } from "react";
import { useJournalStore } from "@/contexts/JournalContext";
import type { JournalEntry } from "@/types";
import { cn } from "@/utils";

interface JournalEntryCardProps {
  entry: JournalEntry;
  onEdit?: (entry: JournalEntry) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function JournalEntryCard({
  entry,
  onEdit,
  onDelete,
  showActions = true,
  compact = false,
}: JournalEntryCardProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { summarizeEntry } = useJournalStore();

  const getMoodColor = (mood?: JournalEntry["mood"]) => {
    switch (mood) {
      case "great":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300";
      case "good":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300";
      case "neutral":
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300";
      case "bad":
        return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300";
      case "terrible":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300";
      default:
        return "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-foreground";
    }
  };

  const getMoodEmoji = (mood?: JournalEntry["mood"]) => {
    switch (mood) {
      case "great":
        return "😄";
      case "good":
        return "🙂";
      case "neutral":
        return "😐";
      case "bad":
        return "😕";
      case "terrible":
        return "😢";
      default:
        return "📝";
    }
  };

  const formatDate = (date: Date) => {
    const entryDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    entryDate.setHours(0, 0, 0, 0);

    if (entryDate.getTime() === today.getTime()) {
      return `Today, ${new Date(date).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (entryDate.getTime() === yesterday.getTime()) {
      return `Yesterday, ${new Date(date).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    }

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleDelete = () => {
    if (deletingId === entry.id) {
      onDelete?.(entry.id);
      setDeletingId(null);
    } else {
      setDeletingId(entry.id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          "p-3 rounded-lg border transition-all hover:shadow-md",
          getMoodColor(entry.mood),
        )}
      >
        <div className="flex items-start gap-3">
          <div className="text-xl shrink-0" aria-hidden="true">
            {entry.type === "voice" ? "🎤" : getMoodEmoji(entry.mood)}
          </div>
          <div className="flex-1 min-w-0">
            {entry.title && (
              <h4 className="text-sm font-semibold text-foreground mb-1 truncate">
                {entry.title}
              </h4>
            )}
            <p className="text-xs text-muted-foreground line-clamp-2">
              {entry.content}
            </p>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDate(entry.createdAt)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group p-4 rounded-xl border transition-all hover:shadow-lg",
        getMoodColor(entry.mood),
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="text-2xl shrink-0" aria-hidden="true">
            {entry.type === "voice" ? "🎤" : getMoodEmoji(entry.mood)}
          </div>
          <div className="flex-1 min-w-0">
            {entry.title && (
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {entry.title}
              </h3>
            )}
            <p className="text-sm text-muted-foreground">
              {formatDate(entry.createdAt)}
            </p>
          </div>
        </div>

        {showActions && (onEdit || onDelete) && (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(entry)}
                className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
                aria-label="Edit entry"
              >
                <svg
                  className="w-4 h-4 text-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <title>Edit</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => summarizeEntry(entry.id)}
              className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
              aria-label="Refresh AI summary"
              title="Refresh Summary"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Refresh Summary</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0019 5"
                />
              </svg>
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  deletingId === entry.id
                    ? "bg-red-500 text-white"
                    : "hover:bg-white/50 dark:hover:bg-gray-700/50 text-foreground",
                )}
                aria-label={
                  deletingId === entry.id
                    ? "Click again to confirm deletion"
                    : "Delete entry"
                }
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <title>
                    {deletingId === entry.id ? "Confirm Delete" : "Delete"}
                  </title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      deletingId === entry.id
                        ? "M5 13l4 4L19 7"
                        : "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    }
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mb-3">
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {entry.content}
        </p>
      </div>

      {entry.aiSummary && (
        <div className="mb-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2">
            <span className="text-sm" aria-hidden="true">
              ✨
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                AI Summary
              </p>
              <p className="text-sm text-foreground">{entry.aiSummary}</p>
            </div>
          </div>
        </div>
      )}

      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/70 dark:bg-gray-700/70 text-foreground border border-gray-300 dark:border-gray-600"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
