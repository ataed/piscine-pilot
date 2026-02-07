/**
 * Shared Types & Constants
 * Used across server, client, and database layers
 */

// ============================================
// BRANDED TYPES (IMPROVEMENT #1)
// ============================================

/**
 * Represents a positive monetary amount in the smallest currency unit (cents/centimes).
 * Using branded types prevents accidental mixing of regular numbers with currency.
 *
 * @example
 * const price: PositiveAmount = 5000; // $50.00
 */
export type PositiveAmount = number & { __brand: "PositiveAmount" };

/**
 * ISO 8601 date-time string in UTC format.
 *
 * @example
 * const timestamp: ISODateString = "2025-02-07T14:30:00.000Z";
 */
export type ISODateString = string & { __brand: "ISODate" };

/**
 * SHA-256 hash string (64 hexadecimal characters).
 * Used for transaction integrity verification.
 *
 * @example
 * const hash: SHA256Hash = "a3f5e8b2...";
 */
export type SHA256Hash = string & { __brand: "SHA256" };

/**
 * UUID v4 identifier string.
 *
 * @example
 * const id: UUID = "550e8400-e29b-41d4-a716-446655440000";
 */
export type UUID = string & { __brand: "UUID" };

// ============================================
// TRANSACTION TYPES
// ============================================

export const TRANSACTION_TYPES = {
  ENTRY: "entry",
  MEMBERSHIP: "membership",
  LESSON: "lesson",
  RENTAL: "rental",
  OTHER: "other",
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

export const PAYMENT_METHODS = {
  CASH: "cash",
  CARD: "card",
  TRANSFER: "transfer",
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const SYNC_STATUS = {
  PENDING: "pending",
  SYNCED: "synced",
  FAILED: "failed",
} as const;

export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];

// ============================================
// DATABASE MODELS (IMPROVEMENT #3: Added JSDoc)
// ============================================

/**
 * Represents a single transaction in the system.
 *
 * @remarks
 * - All monetary amounts are stored as positive integers in cents to avoid floating-point errors
 * - Timestamps are stored as ISO 8601 strings in UTC
 * - Each transaction has a SHA-256 hash for tamper detection
 * - Version field enables optimistic locking for concurrent updates
 *
 * @example
 * ```typescript
 * const transaction: Transaction = {
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   amount: 5000, // $50.00
 *   type: "entry",
 *   payment_method: "cash",
 *   customer_name: "John Doe",
 *   notes: null,
 *   created_at: "2025-02-07T14:30:00.000Z",
 *   synced_status: "pending",
 *   synced_at: null,
 *   created_by: "kiosk-001",
 *   version: 1,
 *   hash: "a3f5e8b2..."
 * };
 * ```
 */
export interface Transaction {
  /** Unique identifier (UUID v4) - Generated server-side */
  id: UUID;

  /** Transaction amount in cents (e.g., 5000 = $50.00) - Must be positive */
  amount: PositiveAmount;

  /** Type of transaction (entry, membership, lesson, rental, other) */
  type: TransactionType;

  /** Payment method used (cash, card, transfer) */
  payment_method: PaymentMethod;

  /** Optional customer name for record keeping */
  customer_name: string | null;

  /** Optional additional notes or description */
  notes: string | null;

  /** Transaction creation timestamp (ISO 8601 UTC) */
  created_at: ISODateString;

  /** Sync status with cloud backend (pending, synced, failed) */
  synced_status: SyncStatus;

  /** Timestamp when successfully synced to cloud (ISO 8601 UTC) */
  synced_at: ISODateString | null;

  /** Identifier of the kiosk/user who created this transaction */
  created_by: string;

  /** Version number for optimistic locking (increments on each update) */
  version: number;

  /** SHA-256 hash of transaction data for tamper detection */
  hash: SHA256Hash | null;
}

/**
 * Input data required to create a new transaction.
 * Server will generate id, timestamps, hash, and other metadata.
 *
 * @example
 * ```typescript
 * const input: CreateTransactionInput = {
 *   amount: 5000,
 *   type: "entry",
 *   payment_method: "cash",
 *   customer_name: "John Doe"
 * };
 * ```
 */
export interface CreateTransactionInput {
  /** Transaction amount in cents (must be positive) */
  amount: number;

  /** Type of transaction */
  type: TransactionType;

  /** Payment method (defaults to 'cash' if not provided) */
  payment_method?: PaymentMethod;

  /** Optional customer name */
  customer_name?: string;

  /** Optional notes or description */
  notes?: string;
}

/**
 * Record of sync attempt to cloud backend.
 * Tracks success/failure for debugging and monitoring.
 */
export interface SyncLog {
  /** Auto-increment primary key */
  id: number;

  /** ID of the transaction being synced */
  transaction_id: UUID;

  /** Timestamp of sync attempt (ISO 8601 UTC) */
  attempt_at: ISODateString;

  /** Result of sync attempt */
  status: "success" | "failed";

  /** Error message if sync failed */
  error_message: string | null;
}

/**
 * Key-value settings stored in database.
 * Used for kiosk configuration and runtime settings.
 */
export interface Setting {
  /** Setting key (unique identifier) */
  key: string;

  /** Setting value (stored as string, parse as needed) */
  value: string;

  /** Last update timestamp (ISO 8601 UTC) */
  updated_at: ISODateString;
}

// ============================================
// API RESPONSE TYPES (IMPROVEMENT #2: Discriminated Union)
// ============================================

/**
 * Standardized API response wrapper.
 * Uses discriminated union for type-safe success/error handling.
 *
 * @typeParam T - Type of the success data payload
 *
 * @example
 * ```typescript
 * // Success case
 * const success: ApiResponse<Transaction> = {
 *   success: true,
 *   data: transaction,
 *   timestamp: "2025-02-07T14:30:00.000Z"
 * };
 *
 * // Error case
 * const error: ApiResponse<Transaction> = {
 *   success: false,
 *   error: {
 *     code: "VALIDATION_ERROR",
 *     message: "Amount must be positive"
 *   },
 *   timestamp: "2025-02-07T14:30:00.000Z"
 * };
 *
 * // Type-safe handling
 * if (response.success) {
 *   console.log(response.data); // TypeScript knows 'data' exists
 * } else {
 *   console.error(response.error); // TypeScript knows 'error' exists
 * }
 * ```
 */
export type ApiResponse<T = unknown> =
  | {
      /** Indicates successful response */
      success: true;

      /** Response payload data */
      data: T;

      /** Response timestamp (ISO 8601 UTC) */
      timestamp: ISODateString;
    }
  | {
      /** Indicates error response */
      success: false;

      /** Error details */
      error: {
        /** Machine-readable error code */
        code: string;

        /** Human-readable error message */
        message: string;

        /** Optional additional error context (validation errors, stack trace, etc.) */
        details?: unknown;
      };

      /** Response timestamp (ISO 8601 UTC) */
      timestamp: ISODateString;
    };

/**
 * Response returned after creating a transaction.
 * Includes transaction data and operation metadata.
 */
export interface TransactionResponse {
  /** The created transaction record */
  transaction: Transaction;

  /** Whether receipt was successfully printed */
  printed: boolean;

  /** Whether transaction was queued for cloud sync */
  queued_for_sync: boolean;
}

// ============================================
// SECURITY TYPES
// ============================================

/**
 * Request signature for API authentication.
 * Used to verify request integrity and prevent replay attacks.
 */
export interface RequestSignature {
  /** HMAC-SHA256 signature of request body */
  signature: string;

  /** Unix timestamp in milliseconds (for replay attack prevention) */
  timestamp: number;

  /** Random nonce (number used once) to prevent replay attacks */
  nonce: string;
}

/**
 * Audit log entry for security monitoring.
 * Tracks all significant actions in the system.
 */
export interface AuditLog {
  /** Auto-increment primary key */
  id: number;

  /** Action performed (e.g., "CREATE_TRANSACTION", "UPDATE_SETTINGS") */
  action: string;

  /** Type of resource affected (e.g., "transaction", "setting") */
  resource: string;

  /** ID of the affected resource */
  resource_id: string | null;

  /** User/kiosk identifier who performed the action */
  user: string;

  /** IP address of the request (if available) */
  ip_address: string | null;

  /** Additional context as JSON string */
  metadata: string | null;

  /** Timestamp of the action (ISO 8601 UTC) */
  created_at: ISODateString;
}

// ============================================
// CONFIGURATION TYPES
// ============================================

/**
 * Kiosk configuration stored in database or environment.
 * Controls kiosk behavior and feature flags.
 */
export interface KioskConfig {
  /** Unique kiosk identifier (e.g., "kiosk-001") */
  kioskId: string;

  /** Human-readable kiosk name (e.g., "Main Entrance") */
  kioskName: string;

  /** Currency code (ISO 4217) - e.g., "MAD" for Moroccan Dirham */
  currency: string;

  /** Whether thermal printer is enabled and available */
  printerEnabled: boolean;

  /** Whether cloud sync is enabled */
  syncEnabled: boolean;

  /** Admin PIN for restricted operations (hashed in production!) */
  adminPin: string;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Machine-readable error codes for API responses.
 * Used for programmatic error handling and internationalization.
 */
export const ERROR_CODES = {
  /** Input validation failed (400) */
  VALIDATION_ERROR: "VALIDATION_ERROR",

  /** Database operation failed (500) */
  DATABASE_ERROR: "DATABASE_ERROR",

  /** Cloud sync operation failed (503) */
  SYNC_ERROR: "SYNC_ERROR",

  /** Thermal printer error (500) */
  PRINTER_ERROR: "PRINTER_ERROR",

  /** Authentication required or failed (401) */
  UNAUTHORIZED: "UNAUTHORIZED",

  /** Too many requests from client (429) */
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  /** Unexpected server error (500) */
  INTERNAL_ERROR: "INTERNAL_ERROR",

  /** Forbidden access (403) */
  FORBIDDEN: "FORBIDDEN",
} as const;

/**
 * HTTP status codes as named constants.
 * Improves code readability compared to magic numbers.
 */
export const HTTP_STATUS = {
  /** Request succeeded (200) */
  OK: 200,

  /** Resource created successfully (201) */
  CREATED: 201,

  /** Invalid request data (400) */
  BAD_REQUEST: 400,

  /** Authentication required (401) */
  UNAUTHORIZED: 401,

  /** Authenticated but not authorized (403) */
  FORBIDDEN: 403,

  /** Resource not found (404) */
  NOT_FOUND: 404,

  /** Resource conflict (409) */
  CONFLICT: 409,

  /** Rate limit exceeded (429) */
  TOO_MANY_REQUESTS: 429,

  /** Server error (500) */
  INTERNAL_ERROR: 500,

  /** Service temporarily unavailable (503) */
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Default prices for each transaction type in cents.
 * Used as fallback when custom pricing is not configured.
 *
 * @example
 * ```typescript
 * const price = DEFAULT_PRICES[transactionType] ?? DEFAULT_PRICES.entry;
 * ```
 */
export const DEFAULT_PRICES = {
  /** Single entry ticket price in cents */
  entry: 2000, // 20 MAD

  /** Monthly membership price in cents */
  membership: 50000, // 500 MAD

  /** Single lesson price in cents */
  lesson: 10000, // 100 MAD

  /** Equipment rental price in cents */
  rental: 3000, // 30 MAD
} as const;
