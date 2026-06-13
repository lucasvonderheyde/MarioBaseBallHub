import { afterEach, describe, expect, it } from "vitest";
import { getOAuthAppUrl, getPublicOrigin, publicUrlForRequest } from "./app-url";

describe("getOAuthAppUrl", () => {
  const originalAppUrl = process.env.APP_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalAppUrl;
  });

  it("uses the browser origin for local dev", () => {
    delete process.env.APP_URL;
    expect(getOAuthAppUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("uses APP_URL when Railway reports an internal localhost origin", () => {
    process.env.APP_URL = "https://staging-production-bbc6.up.railway.app";
    expect(getOAuthAppUrl("http://localhost:8080")).toBe(
      "https://staging-production-bbc6.up.railway.app",
    );
  });

  it("uses the public origin when it is not internal localhost", () => {
    process.env.APP_URL = "https://staging-production-bbc6.up.railway.app";
    expect(getOAuthAppUrl("https://staging-production-bbc6.up.railway.app")).toBe(
      "https://staging-production-bbc6.up.railway.app",
    );
  });
});

describe("getPublicOrigin", () => {
  const originalAppUrl = process.env.APP_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalAppUrl;
  });

  it("prefers proxy headers on Railway", () => {
    const origin = getPublicOrigin({
      headers: {
        get(name: string) {
          if (name === "x-forwarded-host") return "staging-production-bbc6.up.railway.app";
          if (name === "x-forwarded-proto") return "https";
          return null;
        },
      },
      nextUrl: { origin: "http://localhost:8080" },
    });
    expect(origin).toBe("https://staging-production-bbc6.up.railway.app");
  });

  it("builds redirect URLs from the public origin", () => {
    const url = publicUrlForRequest(
      {
        headers: {
          get(name: string) {
            if (name === "x-forwarded-host") return "staging-production-bbc6.up.railway.app";
            if (name === "x-forwarded-proto") return "https";
            return null;
          },
        },
        nextUrl: { origin: "http://localhost:8080" },
      },
      "/leagues",
    );
    expect(url.toString()).toBe("https://staging-production-bbc6.up.railway.app/leagues");
  });
});
