import { describe, expect, it } from "vitest";

import { serverMs } from "./serverTime";
import { timeAgo } from "../features/posts/postFormat";
import { liveStories } from "../features/stories/storySeen";

describe("server times", () => {
  it("reads plain database text as UTC", () => {
    expect(serverMs("2026-11-15 06:30:00")).toBe(Date.UTC(2026, 10, 15, 6, 30, 0));
    expect(serverMs("2026-11-15 06:30:00.123456")).toBe(Date.UTC(2026, 10, 15, 6, 30, 0, 123));
    expect(serverMs("2026-11-15T06:30")).toBe(Date.UTC(2026, 10, 15, 6, 30, 0));
  });

  it("leaves times that carry a zone, numbers and bad text alone", () => {
    expect(serverMs("2026-11-15T12:00:00+05:30")).toBe(Date.UTC(2026, 10, 15, 6, 30, 0));
    expect(serverMs("2026-11-15T06:30:00.000Z")).toBe(Date.UTC(2026, 10, 15, 6, 30, 0));
    expect(serverMs(1700000000000)).toBe(1700000000000);
    expect(Number.isNaN(serverMs("soon"))).toBe(true);
    expect(Number.isNaN(serverMs(null))).toBe(true);
  });

  it("calls a story posted a moment ago 'now', not '5h'", () => {
    const now = Date.UTC(2026, 10, 15, 6, 30, 20);
    expect(timeAgo("2026-11-15 06:30:00.000000", now)).toBe("now");
    expect(timeAgo("2026-11-15 04:30:00", now)).toBe("2h");
  });

  it("keeps a story until its real end time", () => {
    const now = Date.UTC(2026, 10, 15, 6, 0, 0);
    const stories = [{ expiresAt: "2026-11-15 08:00:00" }, { expiresAt: "2026-11-15 05:59:00" }];
    expect(liveStories(stories, now)).toEqual([{ expiresAt: "2026-11-15 08:00:00" }]);
  });
});
