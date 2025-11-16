"use client";

import { useEffect, useRef, useState } from "react";
import { useJournalStore } from "@/contexts/JournalContext";
import type { CreateJournalEntryRequest, JournalEntry } from "@/types";
import { cn } from "@/utils";

interface JournalModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry?: JournalEntry;
    /** Optional initial date to assign to a newly created entry (for calendar cell) */
    initialDate?: Date;
}

const MOOD_OPTIONS = [
    { value: "great" as const, emoji: "😄", label: "Great" },
    { value: "good" as const, emoji: "🙂", label: "Good" },
    { value: "neutral" as const, emoji: "😐", label: "Neutral" },
    { value: "bad" as const, emoji: "😕", label: "Bad" },
    { value: "terrible" as const, emoji: "😢", label: "Terrible" },
];

export function JournalModal({ isOpen, onClose, entry, initialDate }: JournalModalProps) {
    const { addEntry, updateEntry, getSummary } = useJournalStore();
    const [type, setType] = useState<"text" | "voice">("text");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [mood, setMood] = useState<JournalEntry["mood"]>(undefined);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [aiSummary, setAiSummary] = useState<string | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const contentRef = useRef<HTMLTextAreaElement>(null);

    // Initialize form with entry data if editing
    useEffect(() => {
        if (entry) {
            setTitle(entry.title || "");
            setContent(entry.content);
            setMood(entry.mood);
            setTags(entry.tags || []);
            setAiSummary(entry.aiSummary);
            setType(entry.type);
        } else {
            // Reset form for new entry
            setTitle("");
            setContent("");
            setMood(undefined);
            setTags([]);
            setAiSummary(undefined);
            setType("text");
            setTagInput("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entry]);

    // Auto-resize textarea
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.style.height = "auto";
            contentRef.current.style.height = `${contentRef.current.scrollHeight}px`;
        }
    });

    // Focus the content textarea when modal opens for quick entry
    useEffect(() => {
        if (isOpen && contentRef.current) {
            // schedule after render
            setTimeout(() => contentRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleAddTag = () => {
        const trimmedTag = tagInput.trim().toLowerCase();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags([...tags, trimmedTag]);
            setTagInput("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter((tag) => tag !== tagToRemove));
    };

    const handleGenerateSummary = async () => {
        if (!content.trim()) return;

        setIsGeneratingSummary(true);
        try {
            const summary = await getSummary(content);
            setAiSummary(summary);
        } catch (error) {
            console.error("Failed to generate summary:", error);
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const entryData: CreateJournalEntryRequest = {
                title: title.trim() || undefined,
                content: content.trim(),
                type,
                mood,
                tags: tags.length > 0 ? tags : undefined,
            };

            if (entry) {
                await updateEntry(entry.id, {
                    ...entryData,
                    aiSummary,
                });
            } else {
                // create and optionally backdate the entry when initialDate is provided
                const created = await addEntry(entryData);
                if (initialDate) {
                    try {
                        await updateEntry(created.id, { createdAt: initialDate });
                    } catch (err) {
                        // non-fatal: log and continue
                        console.error("Failed to set entry date:", err);
                    }
                }
            }

            onClose();
        } catch (error) {
            console.error("Failed to save entry:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <button
            type="button"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
            }}
            aria-label="Close modal"
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="journal-modal-title"
            >
                <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h2
                            id="journal-modal-title"
                            className="text-xl font-semibold text-foreground"
                        >
                            {entry ? "Edit Entry" : "New Journal Entry"}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Close modal"
                        >
                            <svg
                                className="w-5 h-5 text-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <title>Close</title>
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Type selector */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setType("text")}
                            className={cn(
                                "flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all",
                                type === "text"
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-foreground",
                            )}
                        >
                            📝 Text Entry
                        </button>
                        <button
                            type="button"
                            onClick={() => setType("voice")}
                            className={cn(
                                "flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all",
                                type === "voice"
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-foreground",
                            )}
                        >
                            🎤 Voice Note
                        </button>
                    </div>

                    {/* Title input */}
                    <div>
                        <label
                            htmlFor="entry-title"
                            className="block text-sm font-medium text-foreground mb-2"
                        >
                            Title (optional)
                        </label>
                        <input
                            type="text"
                            id="entry-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Give your entry a title..."
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Content input */}
                    <div>
                        <label
                            htmlFor="entry-content"
                            className="block text-sm font-medium text-foreground mb-2"
                        >
                            Content <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            ref={contentRef}
                            id="entry-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={
                                type === "voice"
                                    ? "Transcribed voice note will appear here..."
                                    : "Write your thoughts..."
                            }
                            required
                            rows={6}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Mood selector */}
                    <div>
                        <p className="block text-sm font-medium text-foreground mb-2">
                            How are you feeling?
                        </p>
                        <div className="flex gap-2 flex-wrap">
                            {MOOD_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                        setMood(mood === option.value ? undefined : option.value)
                                    }
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium transition-all",
                                        mood === option.value
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-foreground",
                                    )}
                                >
                                    <span className="text-xl">{option.emoji}</span>
                                    <span className="text-sm">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tags input */}
                    <div>
                        <label
                            htmlFor="tag-input"
                            className="block text-sm font-medium text-foreground mb-2"
                        >
                            Tags
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="tag-input"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                                placeholder="Add a tag..."
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleAddTag}
                                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-foreground hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                            >
                                Add
                            </button>
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                                    >
                                        #{tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                                            aria-label={`Remove ${tag} tag`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* AI Summary */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="block text-sm font-medium text-foreground">
                                AI Summary
                            </p>
                            <button
                                type="button"
                                onClick={handleGenerateSummary}
                                disabled={!content.trim() || isGeneratingSummary}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline"
                            >
                                {isGeneratingSummary ? "Generating..." : "Generate"}
                            </button>
                        </div>
                        {aiSummary && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-start gap-2">
                                    <span className="text-sm shrink-0">✨</span>
                                    <p className="text-sm text-foreground">{aiSummary}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-foreground hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!content.trim() || isSubmitting}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting
                                ? "Saving..."
                                : entry
                                    ? "Update Entry"
                                    : "Save Entry"}
                        </button>
                    </div>
                </form>
            </div>
        </button>
    );
}
