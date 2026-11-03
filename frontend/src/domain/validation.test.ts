import { describe, expect, it } from 'vitest';
import {
  buildPhoneNumber,
  isEligibleMemberAge,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidUsername,
  normalizeAuthPhone,
  normalizeUsername,
  passwordError,
  usernameError,
} from './validation';

describe('authentication validation', () => {
  it('normalizes Indian mobile numbers to E.164', () => {
    expect(normalizeAuthPhone('98765 43210')).toBe('+919876543210');
    expect(normalizeAuthPhone('098765-43210')).toBe('+919876543210');
    expect(normalizeAuthPhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizeAuthPhone('0091 9876543210')).toBe('+919876543210');
    expect(isValidPhone('9876543210')).toBe(true);
  });

  it('rejects numbers that are not Indian mobiles', () => {
    expect(normalizeAuthPhone('12345')).toBeNull();
    // Landline-style first digit
    expect(normalizeAuthPhone('1234567890')).toBeNull();
    // Nine digits
    expect(normalizeAuthPhone('987654321')).toBeNull();
    // Eleven digits
    expect(normalizeAuthPhone('98765432101')).toBeNull();
    expect(normalizeAuthPhone('+1 (415) 555-0199')).toBeNull();
  });

  it('builds E.164 numbers whatever the member types', () => {
    expect(buildPhoneNumber('+91', '098765 43210')).toBe('+919876543210');
    expect(buildPhoneNumber('+91', '123')).toBeNull();
    expect(buildPhoneNumber('+91', '+91 98765 43210')).toBe('+919876543210');
  });

  it('rejects malformed emails', () => expect(isValidEmail('hello@')).toBe(false));

  it('accepts simple usernames and explains the bad ones', () => {
    expect(isValidUsername('Riya_07')).toBe(true);
    expect(normalizeUsername('  Riya_07 ')).toBe('riya_07');
    expect(isValidUsername('ab')).toBe(false);
    expect(usernameError('ab')).toBe('Use at least 3 characters.');
    expect(isValidUsername('_riya')).toBe(false);
    expect(usernameError('_riya')).toBe('Start with a letter or a number.');
    expect(usernameError('riya patel')).toBe('Use only letters, numbers, dots and underscores.');
    expect(usernameError('riya.07')).toBe('');
  });

  it('only asks for a six-character password', () => {
    expect(isValidPassword('12345')).toBe(false);
    expect(isValidPassword('123456')).toBe(true);
    expect(isValidPassword('milaan')).toBe(true);
    expect(passwordError('12345')).toBe('Use at least 6 characters.');
    expect(passwordError('123456')).toBe('');
  });

  it('keeps membership within the adult 18 to 70 range', () => {
    expect(isEligibleMemberAge('17')).toBe(false);
    expect(isEligibleMemberAge('18')).toBe(true);
    expect(isEligibleMemberAge('70')).toBe(true);
    expect(isEligibleMemberAge('71')).toBe(false);
  });
});
