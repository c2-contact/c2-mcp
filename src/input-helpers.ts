/**
 * Utility functions for normalizing and validating input data
 */

/**
 * Normalizes string or array input to array format
 */
export function normalizeToArray<T>(
  value: T | T[] | undefined,
): T[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

/**
 * Normalizes contact input fields that can be string or array
 */
export function normalizeContactFields(input: {
  email?: string | string[];
  phone?: string | string[];
  links?: string | string[];
  tags?: string | string[];
  [key: string]: any;
}) {
  return {
    ...input,
    email: normalizeToArray(input.email),
    phone: normalizeToArray(input.phone),
    links: normalizeToArray(input.links),
    tags: normalizeToArray(input.tags),
  };
}

/**
 * Validates that a string is a valid UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates contact input data
 */
export function validateContactInput(input: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    !input.name ||
    typeof input.name !== "string" ||
    input.name.trim().length === 0
  ) {
    errors.push("Name is required and must be a non-empty string");
  }

  if (
    input.email &&
    !Array.isArray(input.email) &&
    typeof input.email !== "string"
  ) {
    errors.push("Email must be a string or array of strings");
  }

  if (
    input.phone &&
    !Array.isArray(input.phone) &&
    typeof input.phone !== "string"
  ) {
    errors.push("Phone must be a string or array of strings");
  }

  if (input.birthdate && typeof input.birthdate === "string") {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.birthdate)) {
      errors.push("Birthdate must be in YYYY-MM-DD format");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
