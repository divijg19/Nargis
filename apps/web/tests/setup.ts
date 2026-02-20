import "@testing-library/jest-dom/vitest";
// Ensure React is globally available for files compiled to React.createElement
// under Vitest when not using the automatic JSX runtime.
import React from "react";

// Provide global React for classic JSX without suppressions
(globalThis as unknown as { React?: unknown }).React = React;
