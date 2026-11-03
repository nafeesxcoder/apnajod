/**
 * India-only validation helpers.
 *
 * Indian mobile numbers are exactly 10 digits and start with 6, 7, 8 or 9.
 * Anything the member types — with or without +91, 0 or spaces — normalises
 * to E.164 (+91XXXXXXXXXX) or is rejected.
 */

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/** Strip +91 / 0091 / 91 / leading 0 and return the bare 10-digit national number. */
const toNationalDigits = (value: string) => {
  let digits = value.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('0091')) digits = digits.slice(4);
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  digits = digits.replace(/^0+/, '');
  return digits;
};

export const normalizeAuthPhone = (value: string) => {
  const national = toNationalDigits(value);
  return INDIAN_MOBILE.test(national) ? `+91${national}` : null;
};

export const isValidPhone = (value: string) => normalizeAuthPhone(value) !== null;

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/**
 * Usernames are what most members will log in with, so the rules stay easy to
 * explain: 3-20 characters, letters/numbers/._ only, must start with a letter
 * or number. Stored and compared lowercase.
 */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
const USERNAME = /^[a-z0-9][a-z0-9._]{2,19}$/;

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const isValidUsername = (value: string) => USERNAME.test(normalizeUsername(value));

export const usernameError = (value: string) => {
  const name = normalizeUsername(value);
  if (!name) return 'Choose a username.';
  if (name.length < USERNAME_MIN) return `Use at least ${USERNAME_MIN} characters.`;
  if (name.length > USERNAME_MAX) return `Use at most ${USERNAME_MAX} characters.`;
  if (!/^[a-z0-9]/.test(name)) return 'Start with a letter or a number.';
  if (!/^[a-z0-9._]+$/.test(name)) return 'Use only letters, numbers, dots and underscores.';
  return '';
};

/**
 * Passwords: 6 characters minimum, nothing else required. The old rule asked
 * for 10 characters with mixed case and a digit, which locked people out of
 * their own accounts. Length is the part that actually matters.
 */
export const PASSWORD_MIN = 6;

export const isValidPassword = (value: string) => value.length >= PASSWORD_MIN;

export const passwordError = (value: string) =>
  value.length >= PASSWORD_MIN ? '' : `Use at least ${PASSWORD_MIN} characters.`;

export const isEligibleMemberAge = (value: string, min = 18, max = 70) => {
  const age = Number(value.replace(/\D/g, ''));
  return Number.isInteger(age) && age >= min && age <= max;
};

/**
 * Build an E.164 number from a country dial code and what the member typed.
 * India-only, so every path ends at a validated +91 number.
 */
export const buildPhoneNumber = (_dial: string, input: string) => normalizeAuthPhone(input);
