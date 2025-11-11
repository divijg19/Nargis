import type { CreateJournalEntryRequest, JournalEntry } from "@/types";
import { generateId } from "@/utils";
import { mockDelay } from "../apiClient";

// Sample journal entries
const now = new Date();
const today = new Date(now);
today.setHours(9, 30, 0, 0);

const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(20, 0, 0, 0);

const threeDaysAgo = new Date(now);
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
threeDaysAgo.setHours(18, 30, 0, 0);

let mockEntries: JournalEntry[] = [
    {
        id: generateId(),
        title: "Morning Reflection",
        content:
            "Started the day with a clear mind. Planning to focus on the new project proposal. Feeling energized and ready to tackle challenging tasks.",
        type: "text",
        mood: "great",
        tags: ["morning", "planning", "energy"],
        aiSummary:
            "User is starting the day positively, planning to work on a project proposal with high energy.",
        createdAt: today,
    },
    {
        id: generateId(),
        title: "Evening Check-in",
        content:
            "Made good progress today. Completed the design mockups and had a productive meeting with the team. Need to work on time management for tomorrow.",
        type: "text",
        mood: "good",
        tags: ["evening", "progress", "team"],
        aiSummary:
            "Productive day with design completion and team meeting. Identified time management as area for improvement.",
        createdAt: yesterday,
    },
    {
        id: generateId(),
        content:
            "Quick voice note about the presentation ideas. Need to incorporate more visual examples and simplify the technical sections.",
        type: "voice",
        mood: "neutral",
        tags: ["ideas", "presentation"],
        aiSummary:
            "Planning presentation improvements: add visuals, simplify technical content.",
        createdAt: threeDaysAgo,
    },
];

export async function listJournalEntries(): Promise<JournalEntry[]> {
    return mockDelay(
        mockEntries.map((e) => ({ ...e })).sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        120,
    );
}

export async function createJournalEntry(
    data: CreateJournalEntryRequest,
): Promise<JournalEntry> {
    const entry: JournalEntry = {
        id: generateId(),
        ...data,
        createdAt: new Date(),
    };

    // Simulate AI summary generation
    if (data.content.length > 20) {
        entry.aiSummary = `Summary: ${data.content.substring(0, 100)}...`;
    }

    mockEntries = [entry, ...mockEntries];
    return mockDelay({ ...entry }, 150);
}

export async function updateJournalEntry(
    id: string,
    updates: Partial<JournalEntry>,
): Promise<JournalEntry> {
    const index = mockEntries.findIndex((e) => e.id === id);
    if (index === -1) throw new Error("Entry not found");

    const updated = {
        ...mockEntries[index],
        ...updates,
        updatedAt: new Date(),
    };

    mockEntries[index] = updated;
    return mockDelay({ ...updated }, 100);
}

export async function deleteJournalEntry(id: string): Promise<void> {
    mockEntries = mockEntries.filter((e) => e.id !== id);
    return mockDelay(undefined, 80);
}

export async function generateAISummary(content: string): Promise<string> {
    // Simulate AI summary generation
    await mockDelay(undefined, 500);

    if (content.length < 50) {
        return "Brief reflection captured.";
    }

    // Simple extraction of key points
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const firstSentence = sentences[0]?.trim() || content.substring(0, 100);

    return `${firstSentence}${sentences.length > 1 ? '. Additional insights noted.' : ''}`;
}
