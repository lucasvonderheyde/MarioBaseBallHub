import { describe, expect, it } from "vitest";
import { canUserReportGame } from "./game-report-access";

describe("canUserReportGame", () => {
  it("allows league admins", () => {
    expect(canUserReportGame("u1", "admin", "u2", "u3")).toBe(true);
  });

  it("allows home or away manager", () => {
    expect(canUserReportGame("u2", "manager", "u2", "u3")).toBe(true);
    expect(canUserReportGame("u3", "manager", "u2", "u3")).toBe(true);
  });

  it("denies unrelated managers", () => {
    expect(canUserReportGame("u9", "manager", "u2", "u3")).toBe(false);
  });

  it("denies visitors without league membership", () => {
    expect(canUserReportGame("u9", null, "u2", "u3")).toBe(false);
  });
});
