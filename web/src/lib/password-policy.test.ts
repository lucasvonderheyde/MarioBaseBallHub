import { describe, expect, it } from "vitest";
import { validatePassword } from "./password-policy";

describe("validatePassword", () => {
  it("rejects short passwords", () => {
    expect(validatePassword("abc123").ok).toBe(false);
  });

  it("accepts a strong password", () => {
    expect(validatePassword("baseball1234").ok).toBe(true);
  });

  it("requires a number", () => {
    expect(validatePassword("longpassword").ok).toBe(false);
  });
});
