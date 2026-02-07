import { PositiveAmount, UUID, ISODateString, SHA256Hash } from "./types";

/**
 * Validates and converts a number to PositiveAmount.
 * @throws Error if amount is not positive
 */
export function toPositiveAmount(value: number): PositiveAmount {
  if (!Number.isFinite(value)) {
    throw new Error("Amount must be a finite number");
  }
  if (value <= 0) {
    throw new Error(`Amount must be positive, got: ${value}`);
  }
  if (!Number.isInteger(value)) {
    throw new Error("Amount must be an integer (cents)");
  }
  return value as PositiveAmount;
}

/**
 * Validates and converts a string to UUID.
 * @throws Error if not a valid UUID v4
 */
export function toUUID(value: string): UUID {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new Error(`Invalid UUID: ${value}`);
  }
  return value as UUID;
}

/**
 * Validates and converts a string to ISODateString.
 * @throws Error if not a valid ISO 8601 date
 */
export function toISODateString(value: string | Date): ISODateString {
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date.toISOString() as ISODateString;
}

/**
 * Validates and converts a string to SHA256Hash.
 * @throws Error if not a valid SHA-256 hash
 */
export function toSHA256Hash(value: string): SHA256Hash {
  if (!/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error(`Invalid SHA-256 hash: ${value}`);
  }
  return value as SHA256Hash;
}

/**
 * Type guard: checks if value is PositiveAmount.
 */
export function isPositiveAmount(value: unknown): value is PositiveAmount {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  );
}
