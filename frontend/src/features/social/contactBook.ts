/**
 * Your phone's contacts, matched against Apnajoda. The numbers go to the
 * server only to find who has an account (nothing is saved there); the
 * names never leave the phone - they are put back next to the numbers here.
 */
export type BookContact = { name: string; phones: string[] };
export type ContactInvite = { name: string; phone: string };

/** The same rule as the server: an Indian mobile number as +91XXXXXXXXXX, or null. */
export function indianMobile(value: string): string | null {
  let digits = String(value).replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("0091")) digits = digits.slice(4);
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

/** The numbers to check (each once), and whose number is whose. */
export function contactBook(contacts: BookContact[]): { phones: string[]; names: Map<string, string> } {
  const names = new Map<string, string>();
  for (const contact of contacts) {
    for (const raw of contact.phones) {
      const phone = indianMobile(raw);
      if (phone && !names.has(phone)) names.set(phone, contact.name.trim());
    }
  }
  return { phones: [...names.keys()], names };
}

/** People to invite: by name A to Z, then the numbers with no name. */
export function invitesFor(unmatched: string[], names: Map<string, string>): ContactInvite[] {
  const list = unmatched.map((phone) => ({ phone, name: names.get(phone) || "" }));
  return list.sort((a, b) => {
    if (!a.name !== !b.name) return a.name ? -1 : 1;
    return a.name.localeCompare(b.name) || a.phone.localeCompare(b.phone);
  });
}

/** The invite with your own link, so a friend who joins earns you a Boost. */
export function contactInviteText(name: string, link: string): string {
  const first = name.trim().split(/\s+/)[0];
  return `Hi${first ? ` ${first}` : ""}! I'm on Apnajoda - an Indian app for people who want a real relationship. Join me here: ${link}`;
}

/** Narrows the lists to what you typed: a name, a username or digits of a number. */
export function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return fields.some((field) => {
    const value = (field || "").toLowerCase();
    return value.includes(q) || (digits.length >= 3 && value.replace(/\D/g, "").includes(digits));
  });
}
