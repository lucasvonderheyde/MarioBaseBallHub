import { describe, expect, it } from "vitest";
import { suggestUniqueUsername } from "./suggest-username";

describe("suggestUniqueUsername", () => {
  it("sanitizes email local parts", async () => {
    const username = await suggestUniqueUsername("Zomsoth+Test@example.com");
    expect(username).toMatch(/^[a-z0-9_]+$/);
    expect(username.length).toBeGreaterThanOrEqual(2);
  });
});
