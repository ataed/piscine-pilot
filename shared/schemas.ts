/**
 * Zod Validation Schemas
 *
 * Enterprise-grade input validation with sanitization for the Piscine Pilot kiosk system.
 * All schemas enforce strict validation, sanitization, and security best practices to prevent
 * injection attacks, data corruption, and business logic violations.
 *
 * @module shared/schemas
 *
 * Security Layers:
 * 1. Type validation (Zod runtime checks)
 * 2. Input sanitization (XSS prevention)
 * 3. Business rule enforcement (positive amounts, reasonable limits)
 * 4. Format validation (UUIDs, dates, enums)
 *
 * @remarks
 * All monetary amounts are validated as INTEGERS in cents to avoid floating-point errors.
 * All date strings must be ISO 8601 format in UTC.
 * All user-provided strings are sanitized to prevent XSS and injection attacks.
 */

import { z } from "zod";
import { TRANSACTION_TYPES, PAYMENT_METHODS } from "./types";

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum length for customer name field.
 * Balances usability with database efficiency.
 */
const MAX_CUSTOMER_NAME_LENGTH = 100;

/**
 * Maximum length for transaction notes field.
 * Allows detailed notes without excessive database bloat.
 */
const MAX_NOTES_LENGTH = 500;

/**
 * Maximum amount in cents (1,000,000 MAD = ~$100,000 USD).
 * Prevents absurd values from typos or attacks while allowing
 * high-value memberships and package deals.
 */
const MAX_AMOUNT_CENTS = 100_000_000; // 1,000,000 MAD

/**
 * Maximum number of transactions that can be synced in a single batch.
 * Prevents memory exhaustion and API rate limit issues.
 */
const MAX_SYNC_BATCH_SIZE = 100;

/**
 * Maximum number of transactions that can be fetched in a single query.
 * Prevents database overload and slow API responses.
 */
const MAX_QUERY_LIMIT = 1000;

/**
 * Default number of transactions to return in paginated queries.
 */
const DEFAULT_QUERY_LIMIT = 50;

/**
 * Maximum length for setting keys.
 */
const MAX_SETTING_KEY_LENGTH = 50;

/**
 * Maximum length for setting values.
 */
const MAX_SETTING_VALUE_LENGTH = 1000;

/**
 * Minimum length for customer name (if provided).
 */
const MIN_CUSTOMER_NAME_LENGTH = 2;

// ============================================
// SANITIZATION HELPERS
// ============================================

/**
 * Sanitizes string input to prevent XSS, SQL injection, and data corruption.
 *
 * Applies multiple layers of sanitization to remove dangerous characters
 * and enforce safe length limits.
 *
 * @param value - Raw user input string
 * @param maxLength - Maximum allowed length after sanitization (default: 255)
 * @returns Sanitized string safe for storage and display
 *
 * @example
 * ```typescript
 * sanitizeString('<script>alert("xss")</script>');
 * // Returns: "scriptalert(xss)/script"
 *
 * sanitizeString("John'; DROP TABLE users; --");
 * // Returns: "John DROP TABLE users --"
 *
 * sanitizeString("  Hello World  ");
 * // Returns: "Hello World"
 * ```
 *
 * @remarks
 * Security layers applied:
 * 1. Trim removes leading/trailing whitespace
 * 2. Remove HTML tag characters (< >)
 * 3. Remove SQL-dangerous characters (' " ` ; \)
 * 4. Remove control characters (ASCII 0-31, 127-159)
 * 5. Enforce length limit
 *
 * Note: This is defense-in-depth. Primary SQL injection protection
 * comes from prepared statements in the database layer.
 */
const sanitizeString = (value: string, maxLength: number = 255): string => {
  return value
    .trim() // Remove whitespace
    .replace(/[<>]/g, "") // Remove HTML tag chars
    .replace(/['"`;\\]/g, "") // Remove SQL-dangerous chars
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove control chars
    .slice(0, maxLength); // Enforce length limit
};

/**
 * Creates a reusable Zod schema for safe, sanitized string fields.
 *
 * Applies sanitization transform and enforces maximum length.
 * The resulting field is optional (can be undefined).
 *
 * @param maxLength - Maximum length after sanitization
 * @returns Zod schema for optional sanitized string
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   notes: safeString(500),
 * });
 *
 * schema.parse({ notes: '<script>bad</script>' });
 * // Returns: { notes: "scriptbad/script" }
 *
 * schema.parse({});
 * // Returns: { notes: undefined }
 * ```
 */
const safeString = (maxLength: number) =>
  z
    .string()
    .trim()
    .transform((val) => sanitizeString(val, maxLength))
    .pipe(z.string().max(maxLength))
    .optional();

/**
 * Creates a reusable Zod schema for required safe strings with minimum length.
 *
 * Similar to safeString but enforces the field is provided and meets
 * a minimum length requirement (when present).
 *
 * @param minLength - Minimum length requirement
 * @param maxLength - Maximum length after sanitization
 * @returns Zod schema for required sanitized string
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   name: safeStringRequired(2, 100),
 * });
 *
 * schema.parse({ name: 'J' });
 * // Error: String must contain at least 2 character(s)
 *
 * schema.parse({ name: 'John' });
 * // Returns: { name: 'John' }
 * ```
 */
const safeStringRequired = (minLength: number, maxLength: number) =>
  z
    .string()
    .trim()
    .min(minLength, `Must be at least ${minLength} characters`)
    .transform((val) => sanitizeString(val, maxLength))
    .pipe(z.string().max(maxLength));

// ============================================
// REUSABLE FIELD SCHEMAS
// ============================================

/**
 * UUID v4 validation schema.
 *
 * Validates string matches UUID v4 format (8-4-4-4-12 hex digits with version 4).
 * Used for transaction IDs and other unique identifiers.
 *
 * @example
 * ```typescript
 * UUIDSchema.parse('550e8400-e29b-41d4-a716-446655440000');
 * // Returns: '550e8400-e29b-41d4-a716-446655440000'
 *
 * UUIDSchema.parse('not-a-uuid');
 * // Error: Invalid UUID v4 format
 * ```
 */
export const UUIDSchema = z
  .string({ message: "UUID must be a string" })
  .uuid({ message: "Invalid UUID v4 format" });

/**
 * ISO 8601 date-time string validation schema.
 *
 * Validates string is a valid ISO 8601 datetime in UTC format.
 * Used for all timestamp fields (created_at, synced_at, etc.).
 *
 * @example
 * ```typescript
 * ISODateTimeSchema.parse('2025-02-07T14:30:00.000Z');
 * // Returns: '2025-02-07T14:30:00.000Z'
 *
 * ISODateTimeSchema.parse('2025-02-07');
 * // Error: Invalid datetime
 * ```
 */
export const ISODateTimeSchema = z
  .string({ message: "Datetime must be a string" })
  .datetime({ message: "Must be a valid ISO 8601 datetime string" });

/**
 * Positive integer amount in cents validation schema.
 *
 * Enforces monetary amounts as positive integers to avoid floating-point
 * arithmetic errors. All amounts throughout the system are in cents.
 *
 * @example
 * ```typescript
 * AmountSchema.parse(5000);
 * // Returns: 5000 (represents 50.00 MAD)
 *
 * AmountSchema.parse(50.5);
 * // Error: Amount must be an integer (cents)
 *
 * AmountSchema.parse(-100);
 * // Error: Amount must be positive
 * ```
 *
 * @remarks
 * Storing as integers prevents:
 * - Floating-point precision errors (0.1 + 0.2 !== 0.3)
 * - Rounding inconsistencies in financial calculations
 * - Ambiguity in database storage
 */
export const AmountSchema = z
  .number({ message: "Amount must be a number" })
  .int({ message: "Amount must be an integer (cents)" })
  .positive({ message: "Amount must be positive" })
  .finite({ message: "Amount must be finite" })
  .max(MAX_AMOUNT_CENTS, {
    message: `Amount too large (max ${MAX_AMOUNT_CENTS / 100} MAD)`,
  });

/**
 * Transaction type enum validation schema.
 *
 * Validates value is one of the predefined transaction types.
 * Provides clear error messages for invalid types.
 */
export const TransactionTypeSchema = z.enum(
  [
    TRANSACTION_TYPES.ENTRY,
    TRANSACTION_TYPES.MEMBERSHIP,
    TRANSACTION_TYPES.LESSON,
    TRANSACTION_TYPES.RENTAL,
    TRANSACTION_TYPES.OTHER,
  ],
  {
    message:
      "Invalid transaction type. Must be: entry, membership, lesson, rental, or other",
  },
);

/**
 * Payment method enum validation schema.
 *
 * Validates value is one of the supported payment methods.
 * Defaults to 'cash' if not provided.
 */
export const PaymentMethodSchema = z
  .enum(
    [PAYMENT_METHODS.CASH, PAYMENT_METHODS.CARD, PAYMENT_METHODS.TRANSFER],
    {
      message: "Invalid payment method. Must be: cash, card, or transfer",
    },
  )
  .default(PAYMENT_METHODS.CASH);

/**
 * Sync status enum validation schema.
 *
 * Validates value is one of the valid sync states.
 */
export const SyncStatusSchema = z.enum(["pending", "synced", "failed"], {
  message: "Invalid sync status. Must be: pending, synced, or failed",
});

/**
 * IP address validation schema (IPv4 or IPv6).
 *
 * Validates string is a valid IP address format.
 * Used for audit logging and security monitoring.
 *
 * @example
 * ```typescript
 * IPAddressSchema.parse('192.168.1.1');
 * // Returns: '192.168.1.1'
 *
 * IPAddressSchema.parse('2001:0db8:85a3::8a2e:0370:7334');
 * // Returns: '2001:0db8:85a3::8a2e:0370:7334'
 *
 * IPAddressSchema.parse('not-an-ip');
 * // Error: Invalid IP address
 * ```
 */
export const IPAddressSchema = z
  .string({ message: "IP address must be a string" })
  .refine(
    (val) => {
      // IPv4 regex
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      // IPv6 regex (simplified)
      const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;

      return ipv4Regex.test(val) || ipv6Regex.test(val);
    },
    { message: "Must be a valid IPv4 or IPv6 address" },
  );

// ============================================
// TRANSACTION VALIDATION
// ============================================

/**
 * Schema for creating a new transaction.
 *
 * Validates all user input when creating a transaction through the kiosk.
 * Applies sanitization to prevent injection attacks and enforces business rules.
 *
 * @example
 * ```typescript
 * // Valid input
 * const input = {
 *   amount: 5000,
 *   type: 'entry',
 *   payment_method: 'cash',
 *   customer_name: 'John Doe',
 *   notes: 'VIP member',
 * };
 * const validated = CreateTransactionSchema.parse(input);
 *
 * // Invalid input
 * const bad = {
 *   amount: -50,  // Negative
 *   type: 'invalid',  // Not in enum
 * };
 * CreateTransactionSchema.parse(bad);
 * // Throws ZodError with detailed validation errors
 * ```
 *
 * @remarks
 * Server-generated fields (id, created_at, hash, etc.) are NOT included
 * in this schema - they are added by the server after validation.
 */
export const CreateTransactionSchema = z.object({
  /**
   * Transaction amount in cents (e.g., 5000 = 50.00 MAD).
   * Must be a positive integer.
   */
  amount: AmountSchema,

  /**
   * Type of transaction (entry, membership, lesson, rental, other).
   */
  type: TransactionTypeSchema,

  /**
   * Payment method used (cash, card, transfer).
   * Defaults to 'cash' if not provided.
   */
  payment_method: PaymentMethodSchema,

  /**
   * Optional customer name for record-keeping.
   * Sanitized to prevent XSS/injection attacks.
   * Must be at least 2 characters if provided.
   */
  customer_name: safeString(MAX_CUSTOMER_NAME_LENGTH).refine(
    (val) => val === undefined || val.length >= MIN_CUSTOMER_NAME_LENGTH,
    {
      message: `Customer name must be at least ${MIN_CUSTOMER_NAME_LENGTH} characters if provided`,
    },
  ),

  /**
   * Optional notes or description.
   * Sanitized to prevent XSS/injection attacks.
   */
  notes: safeString(MAX_NOTES_LENGTH),
});

/**
 * TypeScript type inferred from CreateTransactionSchema.
 * Use this type for function parameters and return values.
 */
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

// ============================================
// ADMIN VALIDATION
// ============================================

/**
 * Schema for admin PIN authentication.
 *
 * Validates admin PIN is exactly 4 digits.
 * Used for restricted operations like refunds, settings changes, etc.
 *
 * @example
 * ```typescript
 * AdminPinSchema.parse({ pin: '1234' });
 * // Returns: { pin: '1234' }
 *
 * AdminPinSchema.parse({ pin: '12345' });
 * // Error: PIN must be exactly 4 digits
 *
 * AdminPinSchema.parse({ pin: 'abcd' });
 * // Error: PIN must be exactly 4 digits
 * ```
 *
 * @security
 * In production, the PIN should be hashed (e.g., bcrypt) before storage.
 * This schema only validates format, not authentication.
 */
export const AdminPinSchema = z.object({
  /**
   * 4-digit numeric PIN.
   */
  pin: z
    .string({ message: "PIN must be a string" })
    .regex(/^\d{4}$/, { message: "PIN must be exactly 4 digits" })
    .length(4, { message: "PIN must be exactly 4 digits" }),
});

/**
 * TypeScript type for admin PIN validation.
 */
export type AdminPinInput = z.infer<typeof AdminPinSchema>;

// ============================================
// SYNC VALIDATION
// ============================================

/**
 * Schema for cloud sync request.
 *
 * Validates batch of transaction IDs to sync to cloud backend.
 * Enforces reasonable batch sizes to prevent API overload.
 *
 * @example
 * ```typescript
 * const request = {
 *   transaction_ids: [
 *     '550e8400-e29b-41d4-a716-446655440000',
 *     '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
 *   ],
 * };
 * SyncRequestSchema.parse(request);
 * // Returns validated request
 * ```
 *
 * @remarks
 * Batch size limited to prevent:
 * - API rate limiting
 * - Memory exhaustion
 * - Database transaction timeouts
 * - Network timeouts
 */
export const SyncRequestSchema = z.object({
  /**
   * Array of transaction UUIDs to sync.
   * Must contain 1-100 valid UUIDs.
   */
  transaction_ids: z
    .array(UUIDSchema, { message: "Transaction IDs must be an array" })
    .min(1, { message: "At least one transaction ID required" })
    .max(MAX_SYNC_BATCH_SIZE, {
      message: `Maximum ${MAX_SYNC_BATCH_SIZE} transactions per sync batch`,
    }),
});

/**
 * TypeScript type for sync request.
 */
export type SyncRequest = z.infer<typeof SyncRequestSchema>;

// ============================================
// QUERY VALIDATION
// ============================================

/**
 * Schema for transaction query parameters.
 *
 * Validates pagination, filtering, and sorting parameters for transaction queries.
 * All query params come as strings from URL and are coerced to proper types.
 *
 * @example
 * ```typescript
 * // URL: /api/transactions?limit=20&offset=40&type=entry&sync_status=pending
 * const query = TransactionQuerySchema.parse(req.query);
 * // Returns: {
 * //   limit: 20,
 * //   offset: 40,
 * //   type: 'entry',
 * //   sync_status: 'pending',
 * // }
 *
 * // URL: /api/transactions (no params)
 * const query = TransactionQuerySchema.parse(req.query);
 * // Returns: { limit: 50, offset: 0 } (defaults applied)
 * ```
 *
 * @remarks
 * Uses `.coerce` because URL query parameters are always strings.
 * Enforces reasonable limits to prevent database overload.
 */
export const TransactionQuerySchema = z
  .object({
    /**
     * Maximum number of results to return.
     * Default: 50, Max: 1000
     */
    limit: z.coerce
      .number({ message: "Limit must be a number" })
      .int({ message: "Limit must be an integer" })
      .positive({ message: "Limit must be positive" })
      .max(MAX_QUERY_LIMIT, {
        message: `Limit cannot exceed ${MAX_QUERY_LIMIT}`,
      })
      .default(DEFAULT_QUERY_LIMIT),

    /**
     * Number of results to skip (for pagination).
     * Default: 0, Min: 0
     */
    offset: z.coerce
      .number({ message: "Offset must be a number" })
      .int({ message: "Offset must be an integer" })
      .min(0, { message: "Offset cannot be negative" })
      .default(0),

    /**
     * Filter by transaction type (optional).
     */
    type: TransactionTypeSchema.optional(),

    /**
     * Filter by sync status (optional).
     */
    sync_status: SyncStatusSchema.optional(),

    /**
     * Filter transactions created after this date (optional).
     * Must be ISO 8601 datetime string.
     */
    from_date: ISODateTimeSchema.optional(),

    /**
     * Filter transactions created before this date (optional).
     * Must be ISO 8601 datetime string.
     */
    to_date: ISODateTimeSchema.optional(),
  })
  .refine(
    (data) => {
      // Validate date range: from_date must be before to_date
      if (data.from_date && data.to_date) {
        return new Date(data.from_date) <= new Date(data.to_date);
      }
      return true;
    },
    {
      message: "from_date must be before or equal to to_date",
      path: ["from_date"],
    },
  );

/**
 * TypeScript type for transaction query parameters.
 */
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>;

// ============================================
// SETTINGS VALIDATION
// ============================================

/**
 * Schema for updating kiosk settings.
 *
 * Validates key-value pairs for runtime configuration changes.
 * Keys and values have length limits to prevent database bloat.
 *
 * @example
 * ```typescript
 * const setting = {
 *   key: 'printer_enabled',
 *   value: 'true',
 * };
 * UpdateSettingSchema.parse(setting);
 * // Returns validated setting
 * ```
 *
 * @remarks
 * Settings are stored as strings and parsed as needed by consumers.
 * Boolean values stored as 'true'/'false', numbers as numeric strings.
 */
export const UpdateSettingSchema = z.object({
  /**
   * Setting key (unique identifier).
   * Must be 1-50 characters, lowercase alphanumeric with underscores.
   */
  key: z
    .string({ message: "Setting key must be a string" })
    .min(1, { message: "Setting key is required" })
    .max(MAX_SETTING_KEY_LENGTH, {
      message: `Key cannot exceed ${MAX_SETTING_KEY_LENGTH} characters`,
    })
    .regex(/^[a-z0-9_]+$/, {
      message:
        "Key must contain only lowercase letters, numbers, and underscores",
    }),

  /**
   * Setting value (stored as string).
   * Must be 1-1000 characters.
   */
  value: z
    .string({ message: "Setting value must be a string" })
    .min(1, { message: "Setting value is required" })
    .max(MAX_SETTING_VALUE_LENGTH, {
      message: `Value cannot exceed ${MAX_SETTING_VALUE_LENGTH} characters`,
    }),
});

/**
 * TypeScript type for setting update.
 */
export type UpdateSettingInput = z.infer<typeof UpdateSettingSchema>;

// ============================================
// HEALTH CHECK VALIDATION
// ============================================

/**
 * Schema for system health check response.
 *
 * Validates the structure of health check responses.
 * Used for monitoring and debugging system status.
 *
 * @example
 * ```typescript
 * const health = {
 *   status: 'healthy',
 *   database: true,
 *   printer: true,
 *   sync: false,
 *   uptime: 86400,
 *   version: '1.0.0',
 *   timestamp: '2025-02-07T14:30:00.000Z',
 * };
 * HealthCheckResponseSchema.parse(health);
 * ```
 */
export const HealthCheckResponseSchema = z.object({
  /**
   * Overall system status.
   * - healthy: All systems operational
   * - degraded: Some non-critical systems down
   * - unhealthy: Critical systems down
   */
  status: z.enum(["healthy", "degraded", "unhealthy"], {
    message: "Status must be: healthy, degraded, or unhealthy",
  }),

  /**
   * Database connectivity status.
   */
  database: z.boolean({ message: "Database status must be a boolean" }),

  /**
   * Thermal printer availability.
   */
  printer: z.boolean({ message: "Printer status must be a boolean" }),

  /**
   * Cloud sync connectivity.
   */
  sync: z.boolean({ message: "Sync status must be a boolean" }),

  /**
   * Server uptime in seconds.
   */
  uptime: z
    .number({ message: "Uptime must be a number" })
    .nonnegative({ message: "Uptime cannot be negative" }),

  /**
   * Application version (semantic versioning).
   */
  version: z
    .string({ message: "Version must be a string" })
    .regex(/^\d+\.\d+\.\d+$/, {
      message: "Version must follow semver format (e.g., 1.0.0)",
    }),

  /**
   * Health check timestamp (ISO 8601).
   */
  timestamp: ISODateTimeSchema,
});

/**
 * TypeScript type for health check response.
 */
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

// ============================================
// AUDIT LOG VALIDATION
// ============================================

/**
 * Schema for creating audit log entries.
 *
 * Validates audit log data for security monitoring.
 * Tracks all significant actions in the system.
 *
 * @example
 * ```typescript
 * const log = {
 *   action: 'CREATE_TRANSACTION',
 *   resource: 'transaction',
 *   resource_id: '550e8400-e29b-41d4-a716-446655440000',
 *   user: 'kiosk-001',
 *   ip_address: '192.168.1.100',
 *   metadata: JSON.stringify({ amount: 5000, type: 'entry' }),
 * };
 * CreateAuditLogSchema.parse(log);
 * ```
 */
export const CreateAuditLogSchema = z.object({
  /**
   * Action performed (e.g., 'CREATE_TRANSACTION', 'UPDATE_SETTINGS').
   * Use SCREAMING_SNAKE_CASE for consistency.
   */
  action: safeStringRequired(1, 100),

  /**
   * Type of resource affected (e.g., 'transaction', 'setting').
   */
  resource: safeStringRequired(1, 50),

  /**
   * ID of the affected resource (optional).
   */
  resource_id: z
    .string({ message: "Resource ID must be a string" })
    .max(255)
    .optional(),

  /**
   * User or kiosk identifier who performed the action.
   */
  user: safeStringRequired(1, 100),

  /**
   * IP address of the request (optional).
   */
  ip_address: IPAddressSchema.optional(),

  /**
   * Additional context as JSON string (optional).
   */
  metadata: z
    .string({ message: "Metadata must be a string" })
    .max(2000)
    .optional(),
});

/**
 * TypeScript type for audit log creation.
 */
export type CreateAuditLogInput = z.infer<typeof CreateAuditLogSchema>;

// ============================================
// EXPORTS
// ============================================

/**
 * Collection of all validation schemas for easy import.
 *
 * @example
 * ```typescript
 * import { schemas } from '@shared/schemas';
 *
 * const validated = schemas.createTransaction.parse(input);
 * ```
 */
export const schemas = {
  createTransaction: CreateTransactionSchema,
  adminPin: AdminPinSchema,
  syncRequest: SyncRequestSchema,
  transactionQuery: TransactionQuerySchema,
  updateSetting: UpdateSettingSchema,
  healthCheck: HealthCheckResponseSchema,
  createAuditLog: CreateAuditLogSchema,
} as const;
