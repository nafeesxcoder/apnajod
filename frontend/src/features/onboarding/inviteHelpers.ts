import { Linking, Platform, Share } from "react-native";

import { COUNTRIES } from "../../domain/countries";

export type PickedContact = { name: string; phones: string[] };

type ContactsApi = {
  select: (
    properties: string[],
    options?: { multiple?: boolean },
  ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
};

function contactsApi(): ContactsApi | null {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return null;
  const api = (navigator as unknown as { contacts?: ContactsApi }).contacts;
  return api && typeof api.select === "function" ? api : null;
}

// The browser Contact Picker only exists on Android Chrome (and needs a tap
// to open), so everywhere else the screen falls back to search + invite.
export const canPickContacts = () => contactsApi() !== null;

function localDialCode() {
  try {
    const locale =
      typeof navigator !== "undefined" ? navigator.language || "" : "";
    const region = locale.split("-")[1]?.toUpperCase();
    return COUNTRIES.find((country) => country.code === region)?.dial ?? "+1";
  } catch {
    return "+1";
  }
}

// Turns an address-book number into E.164. Numbers without a country code
// take the device's region (en-IN -> +91, en-US -> +1, ...).
export function toE164(raw: string, dial = localDialCode()) {
  let value = raw.trim().replace(/[^\d+]/g, "");
  if (!value) return "";
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (value.startsWith("+")) return /^\+[1-9]\d{7,14}$/.test(value) ? value : "";
  value = value.replace(/^0+/, "");
  if (dial === "+1" && value.length === 11 && value.startsWith("1")) value = value.slice(1);
  const full = `${dial}${value}`;
  return /^\+[1-9]\d{7,14}$/.test(full) ? full : "";
}

/**
 * Opens the browser's contact picker. `raw` keeps the numbers as written,
 * for matching on Apnajoda (Indian numbers, read the server's way) - a
 * browser set to another region would otherwise give them its own code.
 */
export async function pickContacts(options: { raw?: boolean } = {}): Promise<PickedContact[]> {
  const api = contactsApi();
  if (!api) return [];
  const picked = await api.select(["name", "tel"], { multiple: true });
  const result: PickedContact[] = [];
  for (const entry of picked) {
    const phones = [
      ...new Set(
        (entry.tel ?? []).map((tel) => (options.raw ? tel.trim() : toE164(tel))).filter(Boolean),
      ),
    ];
    if (!phones.length) continue;
    result.push({ name: entry.name?.[0]?.trim() || phones[0]!, phones });
  }
  return result;
}

function inviteLink(senderName?: string) {
  const base =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.origin
      : "https://milaan.in";
  const who = senderName?.trim();
  return who ? `${base}/?invite=${encodeURIComponent(who.slice(0, 40))}` : base;
}

export function inviteMessage(senderName?: string) {
  const who = senderName?.trim() ? `${senderName.trim()} invited you to` : "Join me on";
  return `${who} Apnajoda, a private space for serious, family-minded matches. Create your account here: ${inviteLink(senderName)}`;
}

// Opens the phone's own messaging / share sheet, so the invite goes out from
// the member's number like a WhatsApp invite, with no SMS cost to us.
export async function sendInvite(
  target: { phone?: string; email?: string },
  senderName?: string,
) {
  const body = inviteMessage(senderName);
  if (target.phone) {
    await Linking.openURL(`sms:${target.phone}?body=${encodeURIComponent(body)}`);
    return;
  }
  if (target.email) {
    await Linking.openURL(
      `mailto:${target.email}?subject=${encodeURIComponent("Join me on Apnajoda")}&body=${encodeURIComponent(body)}`,
    );
    return;
  }
  if (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    await navigator.share({ title: "Apnajoda", text: body });
    return;
  }
  await Share.share({ message: body });
}
