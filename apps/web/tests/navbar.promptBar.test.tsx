import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavBar } from "@/components/ui/NavBar";

const clearMessages = vi.fn();
const sendUserMessage = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { id: "u-1" },
  }),
}));

vi.mock("@/contexts/RealtimeContext", () => ({
  useRealtime: () => ({
    clearMessages,
    sendUserMessage,
  }),
}));

vi.mock("@/lib/toasts", () => ({
  useToasts: () => ({
    push,
    dismiss: vi.fn(),
    toasts: [],
  }),
}));

vi.mock("@/components/ui/ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

describe("NavBar prompt bar", () => {
  afterEach(() => {
    cleanup();
    clearMessages.mockReset();
    sendUserMessage.mockReset();
    push.mockReset();
  });

  it("opens the prompt bar and sends a starter prompt", () => {
    render(<NavBar />);

    fireEvent.click(screen.getByRole("button", { name: /toggle prompt bar/i }));

    expect(screen.getByRole("heading", { name: "Prompt Bar" })).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", {
        name: /plan my day then list my top 3 priorities/i,
      }),
    );

    expect(sendUserMessage).toHaveBeenCalledWith(
      "Plan my day: list my top 3 priorities",
    );
  });

  it("starts a new session from the prompt bar", () => {
    render(<NavBar />);

    fireEvent.click(screen.getByRole("button", { name: /toggle prompt bar/i }));
    fireEvent.click(screen.getByRole("button", { name: /new session/i }));

    expect(clearMessages).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith({
      message: "New session started.",
      variant: "info",
    });
  });
});
