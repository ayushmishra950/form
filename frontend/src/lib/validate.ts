import type { FormResponses, IFormStructure } from '../types/form.types';

/**
 * Validates a submission against its schema.
 *
 * Native HTML validation covers most controls, but a required *checkbox
 * group* is only satisfied when at least one box is ticked — the browser
 * cannot express that — so the whole form is checked here.
 */
export function validateResponses(
  schema: IFormStructure,
  values: FormResponses,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of schema.fields) {
    const value = values[field.id];
    const isEmpty = Array.isArray(value)
      ? value.length === 0
      : !value || value.trim() === '';

    if (field.required && isEmpty) {
      errors[field.id] =
        field.type === 'checkbox'
          ? 'Select at least one option.'
          : 'This field is required.';
      continue;
    }

    if (isEmpty || Array.isArray(value)) continue;

    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      errors[field.id] = 'Enter a valid email address.';
    }

    if (field.type === 'number' && Number.isNaN(Number(value))) {
      errors[field.id] = 'Enter a number.';
    }
  }

  return errors;
}
