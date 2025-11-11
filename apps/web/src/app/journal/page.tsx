"use client";

import { useEffect, useMemo, useState } from "react";
import { JournalEntryCard } from "@/components/ui/JournalEntryCard";
import { JournalModal } from "@/components/ui/JournalModal";
import { useJournalStore } from "@/contexts/JournalContext";
import type { JournalEntry } from "@/types";

type FilterType = "all" | "text" | "voice";
type FilterMood = "all" | JournalEntry["mood"];

export default function JournalPage() {
    const { entries, loading, loadEntries, deleteEntry } = useJournalStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | undefined>(
        undefined,
    );
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [filterMood, setFilterMood] = useState<FilterMood>("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
    }, [filteredEntries]);

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

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                        Journal
                    </h1>
                    <p className="text-muted-foreground">
                        Reflect on your thoughts and track your mood
                    </p>
                </div>

                {/* Search and Filters */}
                <div className="mb-6 space-y-4">
                    {/* Search bar */}
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search entries..."
                            className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <svg
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
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
                                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filterType === "all"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600"
                                    }`}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterType("text")}
                                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filterType === "text"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600"
                                    }`}
                            >
                                📝 Text
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterType("voice")}
                                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filterType === "voice"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600"
                                    }`}
                            >
                                🎤 Voice
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
                                className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filterMood === "all"
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
                                        className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${filterMood === mood
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600"
                                            }`}
                                        title={mood.charAt(0).toUpperCase() + mood.slice(1)}
                                        aria-label={`Filter by ${mood} mood`}
                                    >
                                        {mood === "great" && "😄"}
                                        {mood === "good" && "🙂"}
                                        {mood === "neutral" && "😐"}
                                        {mood === "bad" && "😕"}
                                        {mood === "terrible" && "😢"}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>
                </div>

                {/* Empty state */}
                {filteredEntries.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">📔</div>
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
                                            onDelete={deleteEntry}
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
                                            onDelete={deleteEntry}
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
                                            onDelete={deleteEntry}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* Floating Action Button */}
                <button
                    type="button"
                    onClick={handleNewEntry}
                    className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group z-50"
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
            </div>

            {/* Journal Modal */}
            <JournalModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                entry={selectedEntry}
            />
        </div>
    );
}
