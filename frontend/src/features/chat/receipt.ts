/**
 * The ticks under your own message.
 *
 * One grey-white tick when it is sent, two when it is delivered, two blue
 * when the other person has read it - the convention every messaging app
 * shares, so it needs no explanation.
 *
 * The read state used to be #898F96, a mid grey, on the navy bubble these
 * sit on. That is dimmer than the unread tick beside it, so reading a
 * message made its ticks fade rather than turn blue, and the receipt that
 * the server was delivering correctly looked broken.
 */
import type { ChatMessage } from "../../storage";
import { palette } from "../../theme";

/** White-ish, legible on the navy bubble, for a message not yet read. */
export const TICK_PENDING = "rgba(255,255,255,.78)";

export function receiptIcon(status: ChatMessage["status"]) {
  return status === "sent" ? "checkmark" : "checkmark-done";
}

export function receiptColor(status: ChatMessage["status"]) {
  return status === "read" ? palette.tickRead : TICK_PENDING;
}

export function receiptLabel(status: ChatMessage["status"]) {
  if (status === "sent") return "Sent · one tick";
  if (status === "delivered") return "Delivered · two ticks";
  return "Read · blue ticks";
}
