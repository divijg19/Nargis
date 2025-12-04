import type { RenderOptions } from "@testing-library/react";
import { render } from "@testing-library/react";
import React from "react";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { TaskProvider } from "@/contexts/TaskContext";
import { ToastProvider } from "@/contexts/ToastContext";

// Ensure React symbol is retained in transpilation
const __ensureReact = React;

// Provider shell for testing real components. Add/remove providers as needed.
function Providers({ children }: { children: React.ReactNode }) {
  return React.createElement(
    ToastProvider,
    null,
    React.createElement(
      TaskProvider,
      null,
      React.createElement(RealtimeProvider, null, children),
    ),
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: Providers, ...options });
}
