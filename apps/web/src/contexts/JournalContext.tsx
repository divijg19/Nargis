"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { useToasts } from "@/contexts/ToastContext";
import { buildEvent, emitDomainEvent } from "@/events/dispatcher";
import {
  createJournalEntry,
  deleteJournalEntry,
  generateAISummary,
  listJournalEntries,
  summarizeEntry as summarizeEntryApi,
  updateJournalEntry,
} from "@/services/endpoints/journal";
import type {
  CreateJournalEntryRequest,
  JournalEntry,
  JournalStore,
} from "@/types";
import { isToday } from "@/utils";

// Action types
type JournalAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ENTRIES"; payload: JournalEntry[] }
  | { type: "ADD_ENTRY"; payload: JournalEntry }
  | {
      type: "UPDATE_ENTRY";
      payload: { id: string; updates: Partial<JournalEntry> };
    }
  | { type: "DELETE_ENTRY"; payload: string };

// Initial state
const initialState: JournalStore = {
  entries: [],
  loading: false,
  todayEntries: [],
  weekEntries: [],
};

// Reducer function
function journalReducer(
  state: JournalStore,
  action: JournalAction,
): JournalStore {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ENTRIES":
      return { ...state, entries: action.payload, loading: false };

    case "ADD_ENTRY":
      return { ...state, entries: [action.payload, ...state.entries] };

    case "UPDATE_ENTRY": {
      const updatedEntries = state.entries.map((entry) =>
        entry.id === action.payload.id
          ? { ...entry, ...action.payload.updates }
          : entry,
      );
      return { ...state, entries: updatedEntries };
    }

    case "DELETE_ENTRY": {
      const filteredEntries = state.entries.filter(
        (entry) => entry.id !== action.payload,
      );
      return { ...state, entries: filteredEntries };
    }

    default:
      return state;
  }
}

// Context type
interface JournalContextType extends JournalStore {
  addEntry: (
    data: CreateJournalEntryRequest,
  ) => Promise<import("@/types").JournalEntry>;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  deleteEntry: (id: string) => void;
  loadEntries: () => Promise<void>;
  getSummary: (content: string) => Promise<string>;
  summarizeEntry: (id: string) => Promise<void>;
}

// Create context
const JournalContext = createContext<JournalContextType | undefined>(undefined);

// Provider component
export function JournalProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(journalReducer, initialState);
  const { push } = useToasts();

  // Computed values
  const todayEntries = useMemo(
    () => state.entries.filter((entry) => isToday(entry.createdAt)),
    [state.entries],
  );

  const weekEntries = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return state.entries.filter(
      (entry) => new Date(entry.createdAt) >= weekAgo,
    );
  }, [state.entries]);

  // Actions
  const addEntry = useCallback(
    async (data: CreateJournalEntryRequest) => {
      try {
        const entry = await createJournalEntry(data);
        dispatch({ type: "ADD_ENTRY", payload: entry });
        emitDomainEvent(
          buildEvent("journal.entry.created", {
            id: entry.id,
            type: entry.type,
          }),
        );
        push({
          title: "Entry Created",
          message: "Your journal entry has been saved",
          variant: "success",
        });
        return entry;
      } catch (error) {
        console.error("Failed to create journal entry:", error);
        push({
          title: "Error",
          message: "Failed to create entry",
          variant: "error",
        });
        throw error;
      }
    },
    [push],
  );

  const updateEntry = useCallback(
    async (id: string, updates: Partial<JournalEntry>) => {
      try {
        const updated = await updateJournalEntry(id, updates);
        dispatch({
          type: "UPDATE_ENTRY",
          payload: { id, updates: updated },
        });
        emitDomainEvent(buildEvent("journal.entry.updated", { id }));
        push({
          title: "Entry Updated",
          message: "Your changes have been saved",
          variant: "success",
        });
      } catch (error) {
        console.error("Failed to update journal entry:", error);
        push({
          title: "Error",
          message: "Failed to update entry",
          variant: "error",
        });
      }
    },
    [push],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      try {
        await deleteJournalEntry(id);
        dispatch({ type: "DELETE_ENTRY", payload: id });
        emitDomainEvent(buildEvent("journal.entry.deleted", { id }));
        push({
          title: "Entry Deleted",
          message: "Journal entry removed",
          variant: "success",
        });
      } catch (error) {
        console.error("Failed to delete journal entry:", error);
        push({
          title: "Error",
          message: "Failed to delete entry",
          variant: "error",
        });
      }
    },
    [push],
  );

  const loadEntries = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const entries = await listJournalEntries();
      dispatch({ type: "SET_ENTRIES", payload: entries });
      emitDomainEvent(
        buildEvent("journal.entries.synced", { count: entries.length }),
      );
    } catch (error) {
      console.error("Failed to load journal entries:", error);
      dispatch({ type: "SET_LOADING", payload: false });
      push({
        title: "Sync Failed",
        message: "Could not load journal entries",
        variant: "error",
      });
    }
  }, [push]);

  const getSummary = useCallback(async (content: string): Promise<string> => {
    try {
      return await generateAISummary(content);
    } catch (error) {
      console.error("Failed to generate AI summary:", error);
      return "Unable to generate summary.";
    }
  }, []);

  const summarizeEntry = useCallback(
    async (id: string) => {
      try {
        const updated = await summarizeEntryApi(id);
        dispatch({
          type: "UPDATE_ENTRY",
          payload: { id, updates: updated },
        });
        emitDomainEvent(buildEvent("journal.entry.summarized", { id }));
        push({
          title: "Summary Updated",
          message: "AI summary refreshed",
          variant: "success",
        });
      } catch (error) {
        console.error("Failed to summarize journal entry:", error);
        push({
          title: "Error",
          message: "Failed to refresh summary",
          variant: "error",
        });
      }
    },
    [push],
  );

  const contextValue: JournalContextType = {
    ...state,
    todayEntries,
    weekEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    loadEntries,
    getSummary,
    summarizeEntry,
  };

  return (
    <JournalContext.Provider value={contextValue}>
      {children}
    </JournalContext.Provider>
  );
}

// Hook to use the context
export function useJournalStore() {
  const context = useContext(JournalContext);
  if (context === undefined) {
    throw new Error("useJournalStore must be used within a JournalProvider");
  }
  return context;
}
