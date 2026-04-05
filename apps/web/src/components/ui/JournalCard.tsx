"use client";

import { Sparkles } from "lucide-react";
import type { JournalEntry } from "@/types";
import { cn } from "@/utils";
import { MarkdownText } from "./MarkdownText";

function isSystemBriefing(entry: JournalEntry): boolean {
  const tags = (entry.tags || []).map((tag) => tag.toLowerCase());
  return tags.includes("system_briefing") || tags.includes("auto");
}

function formatEntryTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JournalCard({ entry }: { entry: JournalEntry }) {
  const system = isSystemBriefing(entry);

  return (
    <article
      className={cn(
        "rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md",
        system
          ? "border-sky-200/60 bg-linear-to-br from-sky-50 to-indigo-50 dark:border-sky-900/40 dark:from-sky-950/30 dark:to-indigo-950/20"
          : "border-border/35 bg-card",
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {system ? (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          ) : null}

          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {system
              ? "AI Briefing"
              : entry.type === "voice"
                ? "Voice Note"
                : "Journal"}
          </span>
        </div>

        <time className="text-xs text-muted-foreground">
          {formatEntryTime(entry.createdAt)}
        </time>
      </header>

      {entry.title ? (
        <h3 className="mb-2 text-base font-semibold text-foreground">
          {entry.title}
        </h3>
      ) : null}

      <MarkdownText content={entry.content} />

      {entry.aiSummary ? (
        <div className="mt-4 rounded-xl border border-border/35 bg-black/2 p-3 dark:bg-white/3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Summary
          </p>
          <p className="mt-1 text-sm text-foreground/85">{entry.aiSummary}</p>
        </div>
      ) : null}
    </article>
  );
}
