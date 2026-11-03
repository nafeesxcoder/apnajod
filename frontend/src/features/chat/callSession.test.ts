import { describe, expect, it } from "vitest";
import { callSession } from "./callSession";

const match = { id: "m1", name: "Asha" } as never;

describe("callSession", () => {
  it("keeps the call alive when minimised and ends it for the right match", () => {
    callSession.reset();
    callSession.begin({ mode: "audio", callId: "c1", isCaller: true, match, isCoupleMode: false });
    callSession.setMinimized(true);
    expect(callSession.get().mode).toBe("audio");
    expect(callSession.get().minimized).toBe(true);
    callSession.end("other");
    expect(callSession.get().mode).toBe("audio");
    callSession.end("m1");
    expect(callSession.get().mode).toBeNull();
  });
});
