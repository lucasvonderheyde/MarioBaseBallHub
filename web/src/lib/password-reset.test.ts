import { describe, expect, it } from "vitest";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  passwordResetExpiresAt,
} from "./password-reset";

describe("password reset tokens", () => {
  it("hashes tokens deterministically", () => {
    const { token, tokenHash } = createPasswordResetToken();
    expect(tokenHash).toBe(hashPasswordResetToken(token));
  });

  it("expires one hour from creation", () => {
    const now = new Date("2026-06-08T12:00:00Z");
    expect(passwordResetExpiresAt(now).toISOString()).toBe(
      "2026-06-08T13:00:00.000Z",
    );
  });
});
