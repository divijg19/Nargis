import { z } from "zod";
import type { AgentEvent } from "@/types";

const agentEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("transcript"), content: z.string() }),
  z.object({ type: z.literal("thought"), content: z.string() }),
  z.object({
    type: z.literal("tool_use"),
    tool: z.string(),
    input: z.string().optional(),
  }),
  z.object({
    type: z.literal("tool_result"),
    tool: z.string(),
    result: z.string().optional(),
    output: z.string().optional(),
  }),
  z.object({ type: z.literal("response"), content: z.string() }),
  z.object({ type: z.literal("error"), content: z.string() }),
  z.object({ type: z.literal("end"), content: z.string().optional() }),
]);

export type AgentStreamState = {
  pendingThoughts: string[];
  currentAgentState: string | null;
  processing: boolean;
  terminalSeen: boolean;
};

export type AgentStreamTransition = {
  next: AgentStreamState;
  transcript?: string;
  finalResponse?: string;
  finalThoughts?: string[];
  toolCompleted?: { tool: string; result: string };
  invalidateQueryKeys?: Array<readonly string[]>;
  errorMessage?: string;
  endContent?: string;
  canceled?: boolean;
};

export const initialAgentStreamState: AgentStreamState = {
  pendingThoughts: [],
  currentAgentState: null,
  processing: false,
  terminalSeen: false,
};

export function parseAgentEvent(input: unknown): AgentEvent | null {
  const parsed = agentEventSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }
  return parsed.data as AgentEvent;
}

export function buildToolThought(tool: string, input?: string): string {
  const detail = typeof input === "string" ? input.trim() : "";
  return detail ? `Using ${tool} (${detail})…` : `Using ${tool}…`;
}

export function extractToolResult(
  evt: Extract<AgentEvent, { type: "tool_result" }>,
) {
  return typeof evt.result === "string"
    ? evt.result
    : typeof evt.output === "string"
      ? evt.output
      : "";
}

export function getToolInvalidationKeys(
  tool: string,
  input?: string,
): Array<readonly string[]> {
  const detect =
    `${String(tool || "")} ${typeof input === "string" ? input : ""}`.toLowerCase();
  const keys: Array<readonly string[]> = [];

  if (
    detect.includes("task") ||
    detect.includes("todo") ||
    detect.includes("kanban")
  ) {
    keys.push(["tasks"]);
  }
  if (detect.includes("habit") || detect.includes("streak")) {
    keys.push(["habits"]);
  }
  if (
    detect.includes("pomodoro") ||
    detect.includes("focus") ||
    detect.includes("session")
  ) {
    keys.push(["pomodoro", "sessions"]);
  }
  if (detect.includes("journal") || detect.includes("entry")) {
    keys.push(["journal"]);
  }

  return keys;
}

function isCanceledContent(content: string | undefined): boolean {
  const normalized = String(content || "").toLowerCase();
  return normalized.includes("canceled") || normalized.includes("cancelled");
}

export function reduceAgentStreamState(
  state: AgentStreamState,
  evt: AgentEvent,
): AgentStreamTransition {
  switch (evt.type) {
    case "transcript":
      return {
        next: state,
        transcript: evt.content,
      };
    case "thought": {
      const thought = String(evt.content || "").trim();
      return {
        next: {
          ...state,
          pendingThoughts: thought
            ? [...state.pendingThoughts, thought]
            : state.pendingThoughts,
          currentAgentState: thought || "Thinking…",
          processing: true,
        },
      };
    }
    case "tool_use": {
      const thought = buildToolThought(evt.tool, evt.input);
      return {
        next: {
          ...state,
          pendingThoughts: [...state.pendingThoughts, thought],
          currentAgentState: thought,
          processing: true,
        },
        invalidateQueryKeys: getToolInvalidationKeys(evt.tool, evt.input),
      };
    }
    case "tool_result":
      return {
        next: state,
        toolCompleted: {
          tool: evt.tool,
          result: extractToolResult(evt),
        },
      };
    case "response":
      return {
        next: {
          pendingThoughts: [],
          currentAgentState: null,
          processing: false,
          terminalSeen: true,
        },
        finalResponse: evt.content,
        finalThoughts: state.pendingThoughts,
      };
    case "error":
      return {
        next: {
          ...state,
          pendingThoughts: [],
          currentAgentState: null,
          processing: false,
        },
        errorMessage: String(evt.content),
      };
    case "end":
      return {
        next: {
          pendingThoughts: [],
          currentAgentState: null,
          processing: false,
          terminalSeen: true,
        },
        finalThoughts: state.pendingThoughts,
        endContent: String(evt.content || ""),
        canceled: isCanceledContent(evt.content),
      };
  }
}
