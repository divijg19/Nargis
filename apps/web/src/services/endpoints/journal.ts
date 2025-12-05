import { authService } from "@/services/auth";
import type { CreateJournalEntryRequest, JournalEntry } from "@/types";
import { fetchJson } from "../apiClient";

type JournalEntryApi = {
  id: string;
  title?: string | null;
  content: string;
  type?: JournalEntry["type"] | string | null;
  mood?: JournalEntry["mood"] | string | null;
  tags?: string[] | null;
  aiSummary?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  audioUrl?: string | null;
};

function mapApiToEntry(api: JournalEntryApi): JournalEntry {
  const type: JournalEntry["type"] = api.type === "voice" ? "voice" : "text";
  const allowedMoods = new Set(["great", "good", "neutral", "bad", "terrible"]);
  const mood: JournalEntry["mood"] | undefined =
    api.mood && allowedMoods.has(api.mood as string)
      ? (api.mood as JournalEntry["mood"])
      : undefined;
  return {
    id: api.id,
    title: api.title ?? undefined,
    content: api.content,
    type,
    mood,
    tags: Array.isArray(api.tags) ? api.tags : undefined,
    aiSummary: api.aiSummary ?? undefined,
    createdAt: api.createdAt ? new Date(api.createdAt) : new Date(),
    updatedAt: api.updatedAt ? new Date(api.updatedAt) : undefined,
    audioUrl: api.audioUrl ?? undefined,
  };
}

export async function listJournalEntries(): Promise<JournalEntry[]> {
  const headers = authService.getAuthHeaders();
  const apiEntries = await fetchJson<JournalEntryApi[]>("/v1/journal", {
    headers,
  });
  return apiEntries.map(mapApiToEntry);
}

export async function createJournalEntry(
  data: CreateJournalEntryRequest,
): Promise<JournalEntry> {
  const headers = { ...authService.getAuthHeaders() };
  const body = JSON.stringify(data);
  const apiEntry = await fetchJson<JournalEntryApi>("/v1/journal", {
    method: "POST",
    headers,
    body,
  });
  return mapApiToEntry(apiEntry);
}

export async function updateJournalEntry(
  id: string,
  updates: Partial<JournalEntry>,
): Promise<JournalEntry> {
  const headers = { ...authService.getAuthHeaders() };
  const body = JSON.stringify(updates);
  const apiEntry = await fetchJson<JournalEntryApi>(`/v1/journal/${id}`, {
    method: "PATCH",
    headers,
    body,
  });
  return mapApiToEntry(apiEntry);
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const headers = authService.getAuthHeaders();
  await fetchJson<void>(`/v1/journal/${id}`, { method: "DELETE", headers });
}

// Server-side summary generation for an existing entry
export async function summarizeEntry(id: string): Promise<JournalEntry> {
  const headers = authService.getAuthHeaders();
  const result = await fetchJson<{ summary: string; entry: JournalEntryApi }>(
    `/v1/journal/${id}/summary`,
    { method: "POST", headers },
  );
  return mapApiToEntry(result.entry ?? {});
}

export async function generateAISummary(content: string): Promise<string> {
  // If/when backend exposes summary endpoint, call it; for now keep client helper simple.
  // This method is used by JournalContext; preserve behavior by returning a naive summary.
  if (content.length < 50) {
    return "Brief reflection captured.";
  }
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const firstSentence = sentences[0]?.trim() || content.substring(0, 100);
  return `${firstSentence}${sentences.length > 1 ? ". Additional insights noted." : ""}`;
}
