"use client";

import { useMemo, useState } from "react";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { JournalCard } from "@/components/ui/JournalCard";
import { JournalModal } from "@/components/ui/JournalModal";
import { useJournalEntries } from "@/hooks/queries";
import type { JournalEntry } from "@/types";
import { dateKey } from "@/utils";

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  const mod10 = value % 10;
  if (mod10 === 1) return `${value}st`;
  if (mod10 === 2) return `${value}nd`;
  if (mod10 === 3) return `${value}rd`;
  return `${value}th`;
}

function timelineLabel(day: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(day);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return "Today";

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (target.getTime() === yesterday.getTime()) return "Yesterday";

  const month = target.toLocaleDateString(undefined, { month: "long" });
  const dayNum = ordinal(target.getDate());
  const sameYear = target.getFullYear() === today.getFullYear();

  return sameYear
    ? `${month} ${dayNum}`
    : `${month} ${dayNum}, ${target.getFullYear()}`;
}

export default function JournalPage() {
  const journalQuery = useJournalEntries();
  const entries = journalQuery.data ?? [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | undefined>(
    undefined,
  );

  const grouped = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const buckets = new Map<string, JournalEntry[]>();
    for (const entry of sorted) {
      const key = dateKey(entry.createdAt);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)?.push(entry);
    }

    return Array.from(buckets.entries()).map(([key, dayEntries]) => {
      const anchor = dayEntries[0]?.createdAt ?? new Date(key);
      return {
        key,
        label: timelineLabel(anchor),
        entries: dayEntries,
      };
    });
  }, [entries]);

  if (journalQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-muted-foreground">Loading your journal...</p>
        </div>
      </div>
    );
  }

  if (journalQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Could not load journal entries right now.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-app-light transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-300">
      <PageCanvas className="max-w-264 gap-8 pb-16">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
              Journal
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              A calm timeline of your reflections and AI briefings.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedEntry(undefined);
              setIsModalOpen(true);
            }}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-medium text-white transition-all duration-200 hover:bg-sky-700 hover:shadow-md"
          >
            New Entry
          </button>
        </header>

        {grouped.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border/45 bg-card/70 px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-foreground">
              No entries yet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Speak to Nargis or write your first note to begin your timeline.
            </p>
          </section>
        ) : (
          <section className="relative pl-7 sm:pl-9">
            <div className="absolute bottom-0 left-2 top-0 w-px bg-border/45" />

            <div className="space-y-10">
              {grouped.map((group) => (
                <div key={group.key} className="relative">
                  <span className="absolute -left-[1.85rem] top-2 h-2.5 w-2.5 rounded-full bg-muted-foreground/45 sm:-left-[2.1rem]" />

                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {group.label}
                  </h2>

                  <div className="space-y-4">
                    {group.entries.map((entry) => (
                      <JournalCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </PageCanvas>

      <JournalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEntry(undefined);
        }}
        entry={selectedEntry}
      />
    </div>
  );
}
