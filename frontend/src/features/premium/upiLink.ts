/**
 * Paying by UPI to our own UPI ID, checked by hand.
 * Pure helpers, so they can be tested without React Native.
 */

/** Opens any UPI app with our ID, the amount and a note filled in. */
export function upiLink({
  upiId,
  payeeName,
  amountPaise,
  note,
}: {
  upiId: string;
  payeeName: string;
  amountPaise: number;
  note: string;
}) {
  const params = [
    `pa=${encodeURIComponent(upiId)}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${(amountPaise / 100).toFixed(2)}`,
    "cu=INR",
    `tn=${encodeURIComponent(note)}`,
  ];
  return `upi://pay?${params.join("&")}`;
}

/** What the member typed, cut down to the digits of a UTR. */
export function cleanUtr(text: string) {
  return text.replace(/\D/g, "").slice(0, 12);
}

/** A UTR / UPI Ref No. is 12 digits. */
export function utrValid(text: string) {
  return /^\d{12}$/.test(text);
}

export const UPI_STATUS_LABEL = {
  pending: "Checking",
  approved: "Approved",
  rejected: "Not verified",
} as const;
