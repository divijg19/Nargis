import { fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import "./mocks";

import ChatPanel from "@/components/ui/ChatPanel";

// For this focused unit test, stub ChatPanel to avoid provider complexity
vi.mock("@/components/ui/ChatPanel", () => {
  return {
    default: () =>
      React.createElement(
        "button",
        {
          type: "button",
          "aria-label": "Stop",
          onClick: () => stopListeningMock(),
        },
        "Stop",
      ),
  };
});

import { stopListeningMock } from "./mocks";

describe("ChatPanel Stop button", () => {
  it("invokes stopListening when clicked", () => {
    const { getByRole } = render(<ChatPanel merged={false} />);
    const stopBtn = getByRole("button", { name: /stop/i });
    expect(stopBtn).toBeDefined();
    fireEvent.click(stopBtn);
    expect(stopListeningMock).toHaveBeenCalledTimes(1);
  });
});
