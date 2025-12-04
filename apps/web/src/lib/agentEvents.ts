import type { AgentEvent } from "@/types";

export interface AccumulatedAgentEvents {
  thoughts: string[];
  response: string | null;
}

// Pure accumulator used for unit testing without React hooks.
export function accumulateAgentEvents(
  events: AgentEvent[],
): AccumulatedAgentEvents {
  const thoughts: string[] = [];
  let response: string | null = null;
  for (const evt of events) {
    switch (evt.type) {
      case "thought": {
        const t = evt.content.trim();
        if (t) thoughts.push(t);
        break;
      }
      case "tool_use": {
        const detail = evt.input ? evt.input.trim() : "";
        const t = detail
          ? `Using ${evt.tool} (${detail})…`
          : `Using ${evt.tool}…`;
        thoughts.push(t);
        break;
      }
      case "response": {
        response = evt.content;
        break;
      }
      case "error": {
        response = `Error: ${evt.content}`;
        break;
      }
      case "end": {
        // no-op for accumulation; could mark finalization if needed
        break;
      }
    }
  }
  return { thoughts, response };
}
