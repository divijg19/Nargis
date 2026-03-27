import type { RenderOptions } from "@testing-library/react";
import { render } from "@testing-library/react";
import React from "react";
import { AppProviders } from "@/components/layout/AppProviders";

// Ensure React symbol is retained in transpilation
const __ensureReact = React;

// Provider shell for testing real components. Add/remove providers as needed.
function Providers({ children }: { children: React.ReactNode }) {
  return React.createElement(AppProviders, null, children);
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: Providers, ...options });
}
