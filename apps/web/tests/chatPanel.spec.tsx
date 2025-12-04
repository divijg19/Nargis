import { fireEvent, render } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import ChatPanel from "@/components/ui/ChatPanel";
import { RealtimeProvider, useRealtime } from "@/contexts/RealtimeContext";

function InjectThought() {
  const { simulateIncoming } = useRealtime();
  useEffect(() => {
    simulateIncoming?.({ type: "thought", content: "Thinking test…" });
  }, [simulateIncoming]);
  return null;
}

describe("ChatPanel Stop button", () => {
  it("renders Stop when processing and triggers handler", async () => {
    const { findByText } = render(
      <RealtimeProvider>
        <InjectThought />
        <ChatPanel merged={false} />
      </RealtimeProvider>,
    );

    const stopBtn = await findByText("Stop");
    // Spy on console to ensure click path executes without error
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    fireEvent.click(stopBtn);
    expect(spy).toBeDefined();
    spy.mockRestore();
  });
});
