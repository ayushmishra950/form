/**
 * Mirrors `strongPassword` in the API (backend/schemas/user.schema.ts), so
 * the checklist a user sees can never disagree with what the server accepts.
 */
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'A lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'An uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'A number', test: (value: string) => /[0-9]/.test(value) },
];

export const isStrongPassword = (value: string): boolean =>
  PASSWORD_RULES.every((rule) => rule.test(value));
