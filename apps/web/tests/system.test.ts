import { describe, expect, it } from "vitest";
import {
  coerceSystemStatusResponse,
  getEngineStatusMeta,
  UNKNOWN_ENGINE_STATUS,
} from "@/types/system";

describe("system status contracts", () => {
  it("coerces malformed payloads into a safe fallback shape", () => {
    const status = coerceSystemStatusResponse({
      go: { hf_status: "RUNNING", ready: true },
      py: null,
    });

    expect(status.go.ready).toBe(true);
    expect(status.py).toEqual(UNKNOWN_ENGINE_STATUS);
    expect(typeof status.checked_at).toBe("string");
  });

  it("derives UI metadata from runtime health", () => {
    expect(
      getEngineStatusMeta({ hf_status: "RUNNING", ready: true }).label,
    ).toBe("Online");
    expect(
      getEngineStatusMeta({ hf_status: "BUILDING", ready: false }).label,
    ).toBe("Waking");
    expect(
      getEngineStatusMeta({ hf_status: "RUNNING", ready: false }).label,
    ).toBe("Booting");
  });
});
