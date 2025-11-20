import { describe, expect, it } from "vitest";
import { dateKey } from "../../src/utils";

// Tests focus on local-date boundaries (midnight) and month transitions
describe("dateKey", () => {
  it("returns YYYY-MM-DD for local date", () => {
    const d = new Date("2025-11-19T12:34:56");
    expect(dateKey(d)).toBe("2025-11-19");
  });

  it("preserves local date near midnight (before)", () => {
    // 2025-11-19 00:30 local
    const d = new Date();
    d.setFullYear(2025, 10, 19); // month is 0-based -> 10 = November
    d.setHours(0, 30, 0, 0);
    expect(dateKey(d)).toBe("2025-11-19");
  });

  it("preserves local date near midnight (after)", () => {
    // 2025-11-19 23:59 local
    const d = new Date();
    d.setFullYear(2025, 10, 19);
    d.setHours(23, 59, 0, 0);
    expect(dateKey(d)).toBe("2025-11-19");
  });

  it("handles month boundary correctly", () => {
    const d = new Date("2025-12-01T00:00:00");
    expect(dateKey(d)).toBe("2025-12-01");
  });
});
