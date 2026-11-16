const crypto = require("crypto");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn("Razorpay keys missing — billing disabled");
}

async function createOrder({
  amountPaise,
  currency = "INR",
  receipt,
  notes = {},
}) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay is not configured");
  }
  const auth = Buffer.from(
    `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`,
  ).toString("base64");
  const response = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency,
      receipt,
      notes,
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Razorpay order failed: ${error}`);
  }
  return await response.json();
}

function verifyWebhookSignature(rawBody, signature) {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("Webhook secret not configured");
  }
  const expected = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Checkout's own proof that a payment went through: Razorpay signs
 * "order_id|payment_id" with our key secret. Only our server and Razorpay
 * know the secret, so a member's app cannot forge it.
 */
function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!RAZORPAY_KEY_SECRET) return false;
  if (!orderId || !paymentId || typeof signature !== "string") return false;
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** "live", "test" (rzp_test_ keys, for trying checkout) or "none". */
function keyMode() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "");
  if (!process.env.RAZORPAY_KEY_SECRET) return "none";
  if (keyId.startsWith("rzp_live_")) return "live";
  if (keyId.startsWith("rzp_test_")) return "test";
  return "none";
}

module.exports = {
  createOrder,
  verifyWebhookSignature,
  verifyPaymentSignature,
  keyMode,
  isConfigured: () => !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
};
