/**
 * Free passes an admin gives a member: which features each plan turns on, and
 * the lengths the admin can pick. Plain data, no database.
 */
const PASS_PLANS = {
  plus: { label: "Plus", features: ["premium"] },
  pro: { label: "Pro", features: ["premium", "pro"] },
  // Every plan we sell. Today that is Pro's set; it grows if a plan adds one.
  everything: { label: "Everything", features: ["premium", "pro"] },
};

/** Months a pass can run: 1 month, 3 months, 1 year. */
const PASS_MONTHS = [1, 3, 12];

module.exports = { PASS_PLANS, PASS_MONTHS };
