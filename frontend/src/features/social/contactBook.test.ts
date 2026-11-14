import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { contactBook, contactInviteText, indianMobile, invitesFor, matchesQuery } from "./contactBook";

describe("contacts", () => {
  it("reads numbers the way the server does", () => {
    expect(indianMobile("+91 98765 43210")).toBe("+919876543210");
    expect(indianMobile("098765-43210")).toBe("+919876543210");
    expect(indianMobile("00919876543210")).toBe("+919876543210");
    expect(indianMobile("12345")).toBeNull();
    expect(indianMobile("+1 415 555 0100")).toBeNull();
  });

  it("checks each number once and keeps the names on the phone", () => {
    const book = contactBook([
      { name: "Rahul Sharma", phones: ["+91 98765 43210", "9876543210"] },
      { name: "Priya", phones: ["9123456789"] },
      { name: "Office", phones: ["080 1234"] },
    ]);
    expect(book.phones).toEqual(["+919876543210", "+919123456789"]);
    expect(invitesFor(["+919876543210", "+919123456789", "+919000000000"], book.names)).toEqual([
      { phone: "+919123456789", name: "Priya" },
      { phone: "+919876543210", name: "Rahul Sharma" },
      { phone: "+919000000000", name: "" },
    ]);
  });

  it("invites with your own link", () => {
    expect(contactInviteText("Rahul Sharma", "https://apnajoda.com/?invite=aarav")).toBe(
      "Hi Rahul! I'm on Apnajoda - an Indian app for people who want a real relationship. Join me here: https://apnajoda.com/?invite=aarav",
    );
  });

  it("searches by name or digits", () => {
    expect(matchesQuery("rah", "Rahul", "+919876543210")).toBe(true);
    expect(matchesQuery("98765", "Rahul", "+919876543210")).toBe(true);
    expect(matchesQuery("zz", "Rahul", "+919876543210")).toBe(false);
  });

  it("works in the phone app, on Android Chrome by picking, and offers a link elsewhere", () => {
    const app = readFileSync(join(__dirname, "..", "..", "app", "MilaanApp.tsx"), "utf8");
    const screen = readFileSync(join(__dirname, "screens", "FindPeopleScreen.tsx"), "utf8");
    expect(app).toContain('contactsMode={Platform.OS !== "web" ? "device" : canPickContacts() ? "picker" : "none"}');
    expect(screen).toContain("picked = await pickContacts({ raw: true });");
    expect(screen).toContain("Share my invite link");
    expect(screen).toContain('onPress={() => onInvite(person, "sms")}');
    expect(screen).not.toContain("matrimony");
  });
});
