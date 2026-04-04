"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { PageCanvas } from "@/components/layout/PageCanvas";
import { JournalEntryCard } from "@/components/ui/JournalEntryCard";
import { JournalModal } from "@/components/ui/JournalModal";
import { useJournalEntries } from "@/hooks/queries";
import { deleteJournalEntry } from "@/services/endpoints/journal";
import type { JournalEntry } from "@/types";
import { dateKey } from "@/utils";

type FilterType = "all" | "text" | "voice";
type FilterMood = "all" | JournalEntry["mood"];

export default function JournalPage() {
  const queryClient = useQueryClient();
  const journalQuery = useJournalEntries();
  const entries = journalQuery.data ?? [];
  const loading = journalQuery.isLoading;

  const deleteMutation = useMutation({
    mutationFn: deleteJournalEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | undefined>(
    undefined,
  );
  // View controls
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [rangeMode, setRangeMode] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    return new Date("2024-01-01T00:00:00");
  });

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  }, []);

  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setToday(d);
  }, []);

  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterMood, setFilterMood] = useState<FilterMood>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleDeleteEntry = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  // Filter entries based on selected filters and search
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Type filter
      if (filterType !== "all" && entry.type !== filterType) return false;

      // Mood filter
      if (filterMood !== "all" && entry.mood !== filterMood) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesContent =
          entry.content.toLowerCase().includes(query) ||
          entry.title?.toLowerCase().includes(query);
        const matchesTags = entry.tags?.some((tag) =>
          tag.toLowerCase().includes(query),
        );
        const matchesSummary = entry.aiSummary?.toLowerCase().includes(query);

        if (!matchesContent && !matchesTags && !matchesSummary) return false;
      }

      return true;
    });
  }, [entries, filterType, filterMood, searchQuery]);

  // Group entries by time period
  const { todayFiltered, weekFiltered, earlierFiltered } = useMemo(() => {
    if (!today)
      return { todayFiltered: [], weekFiltered: [], earlierFiltered: [] };

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayFiltered: JournalEntry[] = [];
    const weekFiltered: JournalEntry[] = [];
    const earlierFiltered: JournalEntry[] = [];

    filteredEntries.forEach((entry) => {
      const entryDate = new Date(entry.createdAt);
      entryDate.setHours(0, 0, 0, 0);

      if (entryDate.getTime() === today.getTime()) {
        todayFiltered.push(entry);
      } else if (entryDate >= weekAgo) {
        weekFiltered.push(entry);
      } else {
        earlierFiltered.push(entry);
      }
    });

    return { todayFiltered, weekFiltered, earlierFiltered };
  }, [filteredEntries, today]);

  // helper: group entries by date (YYYY-MM-DD)
  const entriesByDate = useMemo(() => {
    const map: Record<string, JournalEntry[]> = {};
    (entries || []).forEach((e) => {
      const key = dateKey(e.createdAt);
      map[key] = map[key] || [];
      map[key].push(e);
    });
    return map;
  }, [entries]);

  // build week dates (Sunday..Saturday) around selectedDate
  const weekDates = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const dd = new Date(start);
      dd.setDate(start.getDate() + i);
      days.push(dd);
    }
    return days;
  }, [selectedDate]);

  // build month grid (6 rows x 7 cols) for selectedDate's month
  const monthGrid = useMemo(() => {
    const d = new Date(selectedDate);
    const year = d.getFullYear();
    const month = d.getMonth();
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const start = new Date(first);
    start.setDate(first.getDate() - startDay);
    start.setHours(0, 0, 0, 0);
    const grid: Date[][] = [];
    const cur = new Date(start);
    for (let week = 0; week < 6; week++) {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) {
        row.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      grid.push(row);
    }
    return grid;
  }, [selectedDate]);

  const handleEdit = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEntry(undefined);
  };

  const handleNewEntry = () => {
    setSelectedEntry(undefined);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your journal...</p>
        </div>
      </div>
    );
  }
  const openNewForDate = (date: Date) => {
    setSelectedEntry(undefined);
    setSelectedDate(new Date(date));
    setIsModalOpen(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const changeRange = (mode: "day" | "week" | "month") => {
    setRangeMode(mode);
    // keep selectedDate the same
  };

  return (
    <div className="min-h-full bg-app-light transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-300">
      <PageCanvas className="gap-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-foreground md:text-4xl">
              Journal
            </h1>
            <p className="text-base text-muted-foreground">
              Reflect on your thoughts and track your mood over time.
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewEntry}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            New Entry
          </button>
        </div>

        {/* View controls, Search and Filters */}
        <div className="space-y-4 rounded-2xl border border-border/25 bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-foreground"}`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${viewMode === "calendar" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-foreground"}`}
              >
                Calendar
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => changeRange("day")}
                className={`px-2 py-1 rounded-lg text-sm ${rangeMode === "day" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => changeRange("week")}
                className={`px-2 py-1 rounded-lg text-sm ${rangeMode === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => changeRange("month")}
                className={`px-2 py-1 rounded-lg text-sm ${rangeMode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Month
              </button>
            </div>
          </div>
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entries..."
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Search</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Filters - Improved mobile layout */}
          <div className="space-y-3">
            {/* Type filter */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-2 pr-2 hidden sm:inline">
                Type:
              </span>
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterType === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType("text")}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterType === "text"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setFilterType("voice")}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterType === "voice"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                Voice
              </button>
            </div>

            {/* Mood filter */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-2 pr-2 hidden sm:inline">
                Mood:
              </span>
              <button
                type="button"
                onClick={() => setFilterMood("all")}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterMood === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                All Moods
              </button>
              {(["great", "good", "neutral", "bad", "terrible"] as const).map(
                (mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setFilterMood(mood)}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                      filterMood === mood
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                    title={mood.charAt(0).toUpperCase() + mood.slice(1)}
                    aria-label={`Filter by ${mood} mood`}
                  >
                    {mood.charAt(0).toUpperCase() + mood.slice(1)}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filteredEntries.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {entries.length === 0 ? "Start Your Journal" : "No entries found"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {entries.length === 0
                ? "Capture your thoughts, reflections, and daily experiences"
                : "Try adjusting your filters or search query"}
            </p>
            {entries.length === 0 && (
              <button
                type="button"
                onClick={handleNewEntry}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Create Your First Entry
              </button>
            )}
          </div>
        )}

        {/* Entry sections */}
        {filteredEntries.length > 0 && (
          <div className="space-y-8">
            {viewMode === "list" ? (
              <div className="space-y-8">
                {/* Today */}
                {todayFiltered.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                      Today
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {todayFiltered.map((entry) => (
                        <JournalEntryCard
                          key={entry.id}
                          entry={entry}
                          onEdit={handleEdit}
                          onDelete={handleDeleteEntry}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* This Week */}
                {weekFiltered.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                      This Week
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {weekFiltered.map((entry) => (
                        <JournalEntryCard
                          key={entry.id}
                          entry={entry}
                          onEdit={handleEdit}
                          onDelete={handleDeleteEntry}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Earlier */}
                {earlierFiltered.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                      Earlier
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {earlierFiltered.map((entry) => (
                        <JournalEntryCard
                          key={entry.id}
                          entry={entry}
                          onEdit={handleEdit}
                          onDelete={handleDeleteEntry}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              // Calendar view
              <div className="rounded-2xl border border-border/25 bg-card p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // prev
                        if (rangeMode === "day") {
                          const d = new Date(selectedDate);
                          d.setDate(d.getDate() - 1);
                          setSelectedDate(d);
                        } else if (rangeMode === "week") {
                          const d = new Date(selectedDate);
                          d.setDate(d.getDate() - 7);
                          setSelectedDate(d);
                        } else {
                          const d = new Date(selectedDate);
                          d.setMonth(d.getMonth() - 1);
                          setSelectedDate(d);
                        }
                      }}
                      className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700"
                    >
                      ←
                    </button>

                    <div className="text-lg font-semibold">
                      {rangeMode === "day" && selectedDate.toLocaleDateString()}
                      {rangeMode === "week" && (
                        <span>
                          {weekDates[0].toLocaleDateString()} -{" "}
                          {weekDates[6].toLocaleDateString()}
                        </span>
                      )}
                      {rangeMode === "month" && (
                        <span>
                          {selectedDate.toLocaleString(undefined, {
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        // next
                        if (rangeMode === "day") {
                          const d = new Date(selectedDate);
                          d.setDate(d.getDate() + 1);
                          setSelectedDate(d);
                        } else if (rangeMode === "week") {
                          const d = new Date(selectedDate);
                          d.setDate(d.getDate() + 7);
                          setSelectedDate(d);
                        } else {
                          const d = new Date(selectedDate);
                          d.setMonth(d.getMonth() + 1);
                          setSelectedDate(d);
                        }
                      }}
                      className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700"
                    >
                      →
                    </button>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => openNewForDate(selectedDate)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg"
                    >
                      New on {selectedDate.toLocaleDateString()}
                    </button>
                  </div>
                </div>

                {rangeMode === "day" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium mb-3">
                      {selectedDate.toLocaleDateString()}
                    </h3>
                    <div className="space-y-3">
                      {(entriesByDate[dateKey(selectedDate)] || []).map((e) => (
                        <JournalEntryCard
                          key={e.id}
                          entry={e}
                          onEdit={openEdit}
                          onDelete={handleDeleteEntry}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => openNewForDate(selectedDate)}
                        className="text-sm text-blue-600"
                      >
                        + Add entry
                      </button>
                    </div>
                  </div>
                )}

                {rangeMode === "week" && (
                  <div className="overflow-x-auto">
                    <table
                      className="min-w-4xl w-full border-separate border-spacing-3"
                      aria-label="Week calendar"
                    >
                      <tbody>
                        <tr
                          onKeyDown={(e) => {
                            const key = e.key;
                            if (key === "ArrowLeft") {
                              setSelectedDate((d) => {
                                const nd = new Date(d);
                                nd.setDate(nd.getDate() - 1);
                                return nd;
                              });
                            } else if (key === "ArrowRight") {
                              setSelectedDate((d) => {
                                const nd = new Date(d);
                                nd.setDate(nd.getDate() + 1);
                                return nd;
                              });
                            } else if (key === "ArrowUp") {
                              setSelectedDate((d) => {
                                const nd = new Date(d);
                                nd.setDate(nd.getDate() - 7);
                                return nd;
                              });
                            } else if (key === "ArrowDown") {
                              setSelectedDate((d) => {
                                const nd = new Date(d);
                                nd.setDate(nd.getDate() + 7);
                                return nd;
                              });
                            }
                          }}
                        >
                          {weekDates.map((d) => {
                            const key = dateKey(d);
                            const list = entriesByDate[key] || [];
                            return (
                              <td
                                key={key}
                                className="min-w-48 align-top rounded-2xl border border-border/25 bg-background p-3"
                                aria-label={`Entries for ${d.toDateString()}`}
                              >
                                <div className="h-full">
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium">
                                      {d.toLocaleDateString(undefined, {
                                        weekday: "short",
                                        day: "numeric",
                                      })}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => openNewForDate(d)}
                                      className="text-xs text-blue-600"
                                    >
                                      New
                                    </button>
                                  </div>
                                  <div className="space-y-2 overflow-hidden">
                                    {list.slice(0, 3).map((e) => (
                                      <JournalEntryCard
                                        key={e.id}
                                        entry={e}
                                        onEdit={openEdit}
                                        onDelete={handleDeleteEntry}
                                        compact
                                      />
                                    ))}
                                    {list.length > 3 && (
                                      <div
                                        className="mt-1 text-xs text-muted-foreground"
                                        title={`${list.length - 3} more entries`}
                                      >
                                        +{list.length - 3} more
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {rangeMode === "month" && (
                  <div className="overflow-x-auto">
                    <table
                      className="min-w-5xl w-full border-separate border-spacing-3"
                      aria-label="Month calendar"
                    >
                      <tbody>
                        {monthGrid.map((row) => (
                          <tr key={dateKey(row[0])}>
                            {row.map((d) => {
                              const key = dateKey(d);
                              const list = entriesByDate[key] || [];
                              const isCurrentMonth =
                                d.getMonth() === selectedDate.getMonth();
                              return (
                                <td
                                  key={key}
                                  className={`min-h-30 min-w-40 align-top rounded-2xl border p-3 ${isCurrentMonth ? "border-border/25 bg-background" : "border-border/15 bg-muted/30 text-muted-foreground"}`}
                                >
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium">
                                      {d.getDate()}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => openNewForDate(d)}
                                      className="text-xs text-blue-600"
                                    >
                                      New
                                    </button>
                                  </div>
                                  <div className="space-y-2 overflow-hidden">
                                    {list.slice(0, 3).map((e) => (
                                      <JournalEntryCard
                                        key={e.id}
                                        entry={e}
                                        onEdit={openEdit}
                                        onDelete={handleDeleteEntry}
                                      />
                                    ))}
                                    {list.length > 3 && (
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        +{list.length - 3} more
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Floating Action Button */}
        <button
          type="button"
          onClick={handleNewEntry}
          className="group fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-[color,background-color,border-color,opacity,box-shadow,transform] hover:bg-blue-700 hover:shadow-xl sm:bottom-8 sm:right-8 md:hidden"
          aria-label="New journal entry"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>Add Entry</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="absolute right-full mr-3 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            New Entry
          </span>
        </button>
      </PageCanvas>

      {/* Journal Modal */}
      <JournalModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        entry={selectedEntry}
        initialDate={selectedEntry ? undefined : selectedDate}
      />
    </div>
  );
}
