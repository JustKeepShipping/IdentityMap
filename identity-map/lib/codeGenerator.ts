/**
 * Generate a session join code consisting of easily distinguishable
 * characters. This avoids ambiguous characters like 0, O, 1, I and
 * uses uppercase letters and digits 2–9. The default length is 6
 * characters, but it can be configured to generate up to 8.
 *
 * @param length The desired length of the code (between 6 and 8)
 */
export function generateSessionCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const safeLength = Math.min(Math.max(length, 6), 8);
  let code = '';
  for (let i = 0; i < safeLength; i++) {
    code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return code;
}

// Alias `generateCode` to `generateSessionCode` for backwards compatibility.
// Some components (e.g. the admin page) import generateCode directly. Exporting
// this alias prevents module resolution errors without changing all imports.
export const generateCode = generateSessionCode;