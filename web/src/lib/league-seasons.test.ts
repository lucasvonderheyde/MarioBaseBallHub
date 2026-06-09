import { describe, expect, it } from "vitest";
import { sortSeasonsForDisplay, pickDefaultSeasonId } from "@/lib/league-season-sort";

describe("league-seasons", () => {
  const mk = (
    id: string,
    status: "setup" | "active" | "completed",
    createdAt: Date,
  ) => ({ id, status, createdAt });

  it("sorts active before setup before completed", () => {
    const sorted = sortSeasonsForDisplay([
      mk("c", "completed", new Date("2024-01-01")),
      mk("a", "active", new Date("2023-01-01")),
      mk("s", "setup", new Date("2025-01-01")),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["a", "s", "c"]);
  });

  it("picks active season as default", () => {
    const rows = [
      mk("c", "completed", new Date()),
      mk("a", "active", new Date()),
    ];
    expect(pickDefaultSeasonId(sortSeasonsForDisplay(rows))).toBe("a");
  });
});
