import { describe, expect, it } from "vitest";
import { parseYouTubeVideoId, youTubeEmbedUrl } from "./youtube";

describe("youtube", () => {
  it("parses watch URLs including playlist params", () => {
    expect(
      parseYouTubeVideoId(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLunlisted",
      ),
    ).toBe("dQw4w9WgXcQ");
  });

  it("parses youtu.be links", () => {
    expect(parseYouTubeVideoId("https://youtu.be/abc123XYZ_0")).toBe("abc123XYZ_0");
  });

  it("parses embed URLs", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/embed/abc123XYZ_0")).toBe(
      "abc123XYZ_0",
    );
  });

  it("builds embed URL", () => {
    expect(youTubeEmbedUrl("abc123")).toBe(
      "https://www.youtube-nocookie.com/embed/abc123",
    );
  });
});
