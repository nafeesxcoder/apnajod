import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { chatMoreAttachments, chatPrimaryAttachments } from "../../domain/featureFocus";

const read = (p: string) => readFileSync(join(__dirname, p), "utf8");
const chat = read("ChatFeature.tsx");
const cards = read("planCards.tsx");

describe("date plan, poll and contact in the chat", () => {
  it("has a Date button that opens the planner", () => {
    expect(chatPrimaryAttachments.map((a) => a.id)).toContain("date");
    expect(chat).toContain("setDatePlannerOpen(true);");
    // "Meet up" with a cup: "Date" with a calendar read as picking a day.
    expect(cards).toContain('accessibilityLabel="Send meet-up plan"');
  });

  it("answers, cancels and checks in from the card", () => {
    expect(cards).toContain('button("Accept", "accepted", true), button("Decline", "declined")');
    expect(cards).toContain('button("I\'m safe ✓", "safe", true)');
    expect(chat).toContain("chatApi.dateCheckIn(accessToken, proposalId)");
  });

  it("sends real polls and contacts, not canned text", () => {
    expect(chatMoreAttachments.map((a) => a.id)).toEqual(expect.arrayContaining(["poll", "contact"]));
    expect(chat).not.toContain("Trusted contact card");
    expect(chat).not.toContain("Which date feels best?");
    expect(chat).toContain('createMessage({ type: "poll", poll })');
    expect(chat).toContain('createMessage({ type: "contact", contact })');
    expect(cards).toContain("Contacts.presentContactPickerAsync()");
  });
});
