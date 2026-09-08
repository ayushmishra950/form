export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio';

/** A single field inside a form. */
export interface IFormField {
  id: string; // Frontend unique key (e.g., "field_1717381")
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // Dropdown, radio and checkbox choices
}

/** The editable shape of a form while it is being built. */
export interface IFormStructure {
  title: string;
  description?: string;
  fields: IFormField[];
}

/** A form as it comes back from the API. */
export interface ISavedForm extends IFormStructure {
  _id: string;
  /** Owner of the form — the API scopes every query by this. */
  userId?: string;
  /** Public URL a respondent opens; built by the API from APP_ORIGIN. */
  shareUrl?: string;
  isActive?: boolean;
  submissionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** One stored response, as returned to the form's owner. */
export interface ISubmission {
  _id: string;
  responses: FormResponses;
  createdAt: string;
}

/** Value captured for one field on the public form. */
export type FieldValue = string | string[];

/** All answers of a single submission, keyed by field id. */
export type FormResponses = Record<string, FieldValue>;

/** Presentation metadata for every field type in the palette. */
export interface FieldTypeMeta {
  type: FieldType;
  label: string;
  description: string;
}

export const FIELD_TYPE_META: FieldTypeMeta[] = [
  { type: 'text', label: 'Short answer', description: 'Single line of text' },
  { type: 'textarea', label: 'Paragraph', description: 'Long form answer' },
  { type: 'email', label: 'Email', description: 'Validated email address' },
  { type: 'number', label: 'Number', description: 'Numeric value only' },
  { type: 'select', label: 'Dropdown', description: 'Pick one from a list' },
  { type: 'radio', label: 'Multiple choice', description: 'Pick exactly one' },
  { type: 'checkbox', label: 'Checkboxes', description: 'Pick many options' },
];

/** Field types that carry a list of choices. */
export const CHOICE_TYPES: FieldType[] = ['select', 'radio', 'checkbox'];

export const isChoiceField = (type: FieldType): boolean =>
  CHOICE_TYPES.includes(type);
