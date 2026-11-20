/**
 * A pass code picked up outside Premium (the offer popup's button), waiting
 * to be filled in when Premium opens.
 */
let pending: string | null = null;

export function setPendingCoupon(code: string | null) {
  pending = code ? code.trim().toUpperCase() : null;
}

/** Is a code waiting (without taking it)? */
export function hasPendingCoupon() {
  return !!pending;
}

/** The waiting coupon, once: reading it clears it. */
export function takePendingCoupon() {
  const code = pending;
  pending = null;
  return code;
}
