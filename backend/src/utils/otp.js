const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

function generateNumericCode(length = env.otp.length) {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += digits[crypto.randomInt(0, digits.length)];
  }
  return code;
}

async function hashCode(code) {
  return bcrypt.hash(code, 10);
}

async function compareCode(code, hash) {
  return bcrypt.compare(code, hash);
}

// India-only product: every phone number normalizes to +91 followed by a
// 10-digit mobile number starting with 6, 7, 8 or 9. Accepts whatever the
// member types -- 9876543210, 09876543210, +91 98765 43210, 0091...
function normalizeIndianPhone(value) {
  let digits = String(value).replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('0091')) digits = digits.slice(4);
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  digits = digits.replace(/^0+/, '');
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

function normalizeIdentifier(channel, value) {
  if (channel === 'email') return String(value).trim().toLowerCase();
  // Returns the normalized +91 number, or the raw digits so isValidPhone()
  // can reject it with a clear message.
  return normalizeIndianPhone(value) ?? String(value).trim().replace(/[^\d+]/g, '');
}

function isValidPhone(phone) {
  return /^\+91[6-9]\d{9}$/.test(phone);
}

module.exports = { generateNumericCode, hashCode, compareCode, normalizeIdentifier, isValidPhone, normalizeIndianPhone };
