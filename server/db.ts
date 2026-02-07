/**
 * Enterprise SQLite Database Layer
 * Features: WAL mode, migrations, checksums, audit logging
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { logger } from "./utils/logger";

// Import our improved types and type guards
import type {
  Transaction,
  AuditLog,
  CreateTransactionInput,
  SHA256Hash,
} from "@shared/types";

import {
  toUUID,
  toPositiveAmount,
  toISODateString,
  toSHA256Hash,
} from "@shared/type-guards";

// ============================================
// CONFIGURATION
// ============================================

const DB_PATH =
  process.env.DATABASE_PATH || path.join(__dirname, "../data/local.db");
const DATA_DIR = path.dirname(DB_PATH);
const BACKUP_DIR =
  process.env.DATABASE_BACKUP_DIR || path.join(DATA_DIR, "backups");

// ============================================
// DATABASE MANAGER CLASS
// ============================================

class DatabaseManager {
  private db: Database.Database;
  private isInitialized = false;

  constructor() {
    // Ensure directories exist
    this.ensureDirectories();

    // Initialize database connection
    try {
      this.db = new Database(DB_PATH, {
        verbose: (message) => logger.db(message?.toString() || "SQL executed"),
      });

      this.configurePragmas();
      logger.success("SQLite database connected", { path: DB_PATH });
    } catch (error) {
      logger.error("Failed to initialize database", error as Error);
      throw error;
    }
  }

  /**
   * Ensure data directories exist
   */
  private ensureDirectories(): void {
    [DATA_DIR, BACKUP_DIR].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info("Created directory", { path: dir });
      }
    });
  }

  /**
   * Configure SQLite pragmas for performance and safety
   */
  private configurePragmas(): void {
    // Enable Write-Ahead Logging (crash resistance)
    this.db.pragma("journal_mode = WAL");

    // Performance optimizations
    this.db.pragma("synchronous = NORMAL"); // Balance safety vs speed
    this.db.pragma("cache_size = 10000"); // 10MB cache
    this.db.pragma("temp_store = MEMORY");
    this.db.pragma("mmap_size = 30000000000"); // 30GB memory-mapped I/O
    this.db.pragma("page_size = 4096");

    // Enable foreign keys
    this.db.pragma("foreign_keys = ON");

    logger.db("Database pragmas configured");
  }

  /**
   * Initialize database schema with migrations
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn("Database already initialized");
      return;
    }

    try {
      logger.info("Initializing database schema...");

      // Create migrations table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version INTEGER UNIQUE NOT NULL,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
        );
      `);

      // Run migrations
      await this.runMigrations();

      this.isInitialized = true;
      logger.success("Database initialized successfully");

      // Log statistics
      this.logStats();
    } catch (error) {
      logger.error("Failed to initialize database", error as Error);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    const migrations = [
      {
        version: 1,
        name: "initial_schema",
        up: () => this.migration_001_initial_schema(),
      },
      {
        version: 2,
        name: "audit_logging",
        up: () => this.migration_002_audit_logging(),
      },
    ];

    for (const migration of migrations) {
      const applied = this.db
        .prepare("SELECT 1 FROM migrations WHERE version = ?")
        .get(migration.version);

      if (!applied) {
        logger.info(`Running migration: ${migration.name}`);
        migration.up();
        this.db
          .prepare("INSERT INTO migrations (version, name) VALUES (?, ?)")
          .run(migration.version, migration.name);
        logger.success(`Migration applied: ${migration.name}`);
      }
    }
  }

  // ============================================
  // MIGRATION: Initial Schema
  // ============================================

  private migration_001_initial_schema(): void {
    // Transactions table
    // CRITICAL CHANGE: amount is now INTEGER (cents) not REAL (decimals)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        amount INTEGER NOT NULL CHECK(amount > 0),
        type TEXT NOT NULL CHECK(type IN ('entry', 'membership', 'lesson', 'rental', 'other')),
        payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash', 'card', 'transfer')),
        customer_name TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        synced_status TEXT NOT NULL DEFAULT 'pending' CHECK(synced_status IN ('pending', 'synced', 'failed')),
        synced_at TEXT,
        created_by TEXT NOT NULL DEFAULT 'kiosk',
        version INTEGER NOT NULL DEFAULT 1,
        hash TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_synced_status 
        ON transactions(synced_status, created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_created_at 
        ON transactions(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_type 
        ON transactions(type, created_at DESC);
    `);

    // Sync log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT NOT NULL,
        attempt_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        status TEXT NOT NULL CHECK(status IN ('success', 'failed')),
        error_message TEXT,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sync_log_transaction 
        ON sync_log(transaction_id);
    `);

    // Settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
      );
    `);

    // Insert default settings
    const defaultSettings = [
      ["last_sync_at", new Date(0).toISOString()],
      ["kiosk_name", process.env.KIOSK_NAME || "Piscine Principale"],
      ["kiosk_id", process.env.KIOSK_ID || "kiosk_001"],
      ["auto_sync_enabled", "true"],
      ["printer_enabled", "true"],
      ["currency", "MAD"],
    ];

    const insertSetting = this.db.prepare(`
      INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
    `);

    defaultSettings.forEach(([key, value]) => {
      insertSetting.run(key, value);
    });
  }

  // ============================================
  // MIGRATION: Audit Logging
  // ============================================

  private migration_002_audit_logging(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        resource_id TEXT,
        user TEXT NOT NULL,
        ip_address TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
      );

      CREATE INDEX IF NOT EXISTS idx_audit_created_at 
        ON audit_log(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_audit_resource 
        ON audit_log(resource, resource_id);
    `);
  }

  // ============================================
  // TRANSACTION OPERATIONS
  // ============================================

  /**
   * Create a new transaction with validation and checksum
   *
   * @param input - Validated transaction input
   * @returns Created transaction with all metadata
   *
   * @example
   * ```typescript
   * const transaction = dbManager.createTransaction({
   *   amount: 5000, // 50.00 MAD in cents
   *   type: 'entry',
   *   payment_method: 'cash',
   *   customer_name: 'Ahmed',
   *   notes: 'Morning swim'
   * });
   * ```
   */
  public createTransaction(input: CreateTransactionInput): Transaction {
    try {
      // Generate server-side UUID (never trust client)
      const id = toUUID(uuidv4());

      // Validate amount using our type guard
      const amount = toPositiveAmount(input.amount);

      // Get created_by from environment or default
      const created_by = process.env.KIOSK_ID || "kiosk_001";

      // Generate timestamp (ISO 8601 UTC)
      const created_at = toISODateString(new Date());

      // Generate checksum for tamper detection
      const hash = this.generateChecksum({
        id,
        amount,
        type: input.type,
        created_by,
      });

      // Prepare statement (SQL injection proof)
      const stmt = this.db.prepare(`
        INSERT INTO transactions (
          id, amount, type, payment_method, customer_name, notes, created_by, created_at, hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Execute insert
      stmt.run(
        id,
        amount,
        input.type,
        input.payment_method || "cash",
        input.customer_name || null,
        input.notes || null,
        created_by,
        created_at,
        hash,
      );

      // Retrieve created transaction
      const transaction = this.getTransactionById(id);
      if (!transaction) {
        throw new Error("Failed to retrieve created transaction");
      }

      // Log success
      logger.transaction(id, input.type, amount, true);

      return transaction;
    } catch (error) {
      logger.error("Failed to create transaction", error as Error, {
        type: input.type,
        amount: input.amount,
      });
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  public getTransactionById(id: string): Transaction | null {
    try {
      // Validate UUID format
      const validId = toUUID(id);

      const stmt = this.db.prepare("SELECT * FROM transactions WHERE id = ?");
      const result = stmt.get(validId) as Transaction | undefined;

      return result || null;
    } catch (error) {
      logger.error("Failed to get transaction", error as Error, { id });
      return null;
    }
  }

  /**
   * Get all transactions (with pagination)
   */
  public getTransactions(
    limit: number = 50,
    offset: number = 0,
  ): Transaction[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM transactions 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `);
      return stmt.all(limit, offset) as Transaction[];
    } catch (error) {
      logger.error("Failed to get transactions", error as Error);
      return [];
    }
  }

  /**
   * Get pending transactions for sync
   */
  public getPendingTransactions(limit: number = 100): Transaction[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM transactions 
        WHERE synced_status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT ?
      `);
      return stmt.all(limit) as Transaction[];
    } catch (error) {
      logger.error("Failed to get pending transactions", error as Error);
      return [];
    }
  }

  /**
   * Mark transaction as synced
   */
  public markTransactionSynced(id: string): void {
    try {
      const validId = toUUID(id);

      const stmt = this.db.prepare(`
        UPDATE transactions 
        SET synced_status = 'synced', synced_at = datetime('now', 'utc')
        WHERE id = ?
      `);

      const result = stmt.run(validId);

      if (result.changes === 0) {
        throw new Error(`Transaction not found: ${id}`);
      }

      logger.db("Transaction marked as synced", { id });
    } catch (error) {
      logger.error("Failed to mark transaction as synced", error as Error, {
        id,
      });
      throw error;
    }
  }

  /**
   * Verify transaction checksum (detect tampering)
   */
  public verifyTransactionChecksum(transaction: Transaction): boolean {
    try {
      const expectedHash = this.generateChecksum({
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        created_by: transaction.created_by,
      });

      const isValid = transaction.hash === expectedHash;

      if (!isValid) {
        logger.warn("Transaction checksum mismatch - possible tampering!", {
          id: transaction.id,
          expected: expectedHash,
          actual: transaction.hash,
        });
      }

      return isValid;
    } catch (error) {
      logger.error("Failed to verify checksum", error as Error, {
        id: transaction.id,
      });
      return false;
    }
  }

  // ============================================
  // AUDIT LOGGING
  // ============================================

  /**
   * Log audit event for security monitoring
   */
  public logAudit(
    action: string,
    resource: string,
    resourceId: string | null,
    user: string,
    ipAddress: string | null = null,
    metadata: Record<string, unknown> | null = null,
  ): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO audit_log (action, resource, resource_id, user, ip_address, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        action,
        resource,
        resourceId,
        user,
        ipAddress,
        metadata ? JSON.stringify(metadata) : null,
      );
    } catch (error) {
      logger.error("Failed to log audit", error as Error);
    }
  }

  /**
   * Get recent audit logs
   */
  public getAuditLogs(limit: number = 100): AuditLog[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM audit_log 
        ORDER BY created_at DESC 
        LIMIT ?
      `);
      return stmt.all(limit) as AuditLog[];
    } catch (error) {
      logger.error("Failed to get audit logs", error as Error);
      return [];
    }
  }

  // ============================================
  // SETTINGS OPERATIONS
  // ============================================

  /**
   * Get setting value
   */
  public getSetting(key: string): string | null {
    try {
      const stmt = this.db.prepare("SELECT value FROM settings WHERE key = ?");
      const result = stmt.get(key) as { value: string } | undefined;
      return result?.value || null;
    } catch (error) {
      logger.error("Failed to get setting", error as Error, { key });
      return null;
    }
  }

  /**
   * Set setting value
   */
  public setSetting(key: string, value: string): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES (?, ?, datetime('now', 'utc'))
        ON CONFLICT(key) DO UPDATE SET 
          value = excluded.value,
          updated_at = excluded.updated_at
      `);
      stmt.run(key, value);
      logger.db("Setting updated", { key, value });
    } catch (error) {
      logger.error("Failed to set setting", error as Error, { key });
      throw error;
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Generate SHA-256 checksum for data integrity
   */
  private generateChecksum(data: Record<string, unknown>): SHA256Hash {
    const payload = JSON.stringify(data);
    const hash = createHash("sha256").update(payload).digest("hex");
    return toSHA256Hash(hash);
  }

  /**
   * Database health check
   */
  public healthCheck(): boolean {
    try {
      const result = this.db.prepare("SELECT 1 as ok").get() as { ok: number };
      return result.ok === 1;
    } catch (error) {
      logger.error("Database health check failed", error as Error);
      return false;
    }
  }

  /**
   * Log database statistics
   */
  private logStats(): void {
    try {
      const stats = this.db
        .prepare(
          `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN synced_status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN synced_status = 'synced' THEN 1 ELSE 0 END) as synced,
          SUM(amount) as total_revenue_cents
        FROM transactions
      `,
        )
        .get() as {
        total: number;
        pending: number;
        synced: number;
        total_revenue_cents: number;
      };

      logger.info("Database statistics", {
        ...stats,
        total_revenue_mad: (stats.total_revenue_cents / 100).toFixed(2),
      });
    } catch (error) {
      logger.warn("Failed to log stats", { error });
    }
  }

  /**
   * Get database statistics
   */
  public getStats() {
    try {
      const stats = this.db
        .prepare(
          `
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN synced_status = 'pending' THEN 1 ELSE 0 END) as pending_sync,
          SUM(CASE WHEN synced_status = 'synced' THEN 1 ELSE 0 END) as synced,
          SUM(amount) as total_revenue_cents,
          COUNT(DISTINCT DATE(created_at)) as days_active
        FROM transactions
      `,
        )
        .get() as {
        total_transactions: number;
        pending_sync: number;
        synced: number;
        total_revenue_cents: number;
        days_active: number;
      };

      return {
        ...stats,
        total_revenue_mad: stats.total_revenue_cents / 100,
      };
    } catch (error) {
      logger.error("Failed to get stats", error as Error);
      return null;
    }
  }

  /**
   * Close database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      logger.info("Database connection closed");
    }
  }

  /**
   * Get raw database instance (use with caution)
   */
  public getDb(): Database.Database {
    return this.db;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const dbManager = new DatabaseManager();

// Graceful shutdown handlers
process.on("SIGINT", () => {
  logger.info("Received SIGINT, closing database...");
  dbManager.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Received SIGTERM, closing database...");
  dbManager.close();
  process.exit(0);
});
