import { describe, expect, it } from "vitest";
import { loginFailureMessage } from "./auth-login";

describe("loginFailureMessage", () => {
  it("guides Google-only accounts after a failed password attempt", () => {
    expect(
      loginFailureMessage({ hasPasswordSetAt: false, hasGoogleLink: true }),
    ).toBe("This account uses Google sign-in. Continue with Google instead.");
  });

  it("uses generic invalid credentials for password accounts", () => {
    expect(
      loginFailureMessage({ hasPasswordSetAt: true, hasGoogleLink: false }),
    ).toBe("Invalid credentials.");
  });

  it("uses generic invalid credentials for legacy accounts without Google", () => {
    expect(
      loginFailureMessage({ hasPasswordSetAt: false, hasGoogleLink: false }),
    ).toBe("Invalid credentials.");
  });
});
