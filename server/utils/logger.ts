/**
 * Structured Logger with Colors and Timestamps
 * Production-ready logging for debugging offline incidents
 */

import chalk from "chalk";
import { format } from "date-fns";

// ============================================
// TYPES
// ============================================

type LogLevel =
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "success"
  | "db"
  | "server";

interface LogMetadata {
  [key: string]: unknown;
}

// ============================================
// LOGGER CLASS
// ============================================

class Logger {
  private logLevel: string;

  constructor() {
    this.logLevel = process.env.LOG_LEVEL || "info";
  }

  /**
   * Get formatted timestamp
   */
  private getTimestamp(): string {
    return format(new Date(), "yyyy-MM-dd HH:mm:ss.SSS");
  }

  /**
   * Check if message should be logged based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.logLevel as LogLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format metadata as pretty JSON
   */
  private formatMetadata(meta?: LogMetadata): string {
    if (!meta || Object.keys(meta).length === 0) return "";
    try {
      return chalk.gray(`\n${JSON.stringify(meta, null, 2)}`);
    } catch {
      return chalk.red("\n[Metadata serialization failed]");
    }
  }

  /**
   * Debug log (lowest priority)
   */
  debug(message: string, meta?: LogMetadata): void {
    if (!this.shouldLog("debug")) return;
    console.log(
      `${chalk.gray("[DEBUG]")} ${this.getTimestamp()} - ${message}${this.formatMetadata(meta)}`,
    );
  }

  /**
   * Info log (general information)
   */
  info(message: string, meta?: LogMetadata): void {
    if (!this.shouldLog("info")) return;
    console.log(
      `${chalk.cyan("[INFO]")} ${this.getTimestamp()} - ${message}${this.formatMetadata(meta)}`,
    );
  }

  /**
   * Success log (operations completed successfully)
   */
  success(message: string, meta?: LogMetadata): void {
    console.log(
      `${chalk.green("[SUCCESS]")} ${this.getTimestamp()} - ${message}${this.formatMetadata(meta)}`,
    );
  }

  /**
   * Warning log (non-critical issues)
   */
  warn(message: string, meta?: LogMetadata): void {
    if (!this.shouldLog("warn")) return;
    console.warn(
      `${chalk.yellow("[WARN]")} ${this.getTimestamp()} - ${message}${this.formatMetadata(meta)}`,
    );
  }

  /**
   * Error log (critical issues)
   */
  error(message: string, error?: Error | unknown, meta?: LogMetadata): void {
    let errorInfo = "";

    if (error instanceof Error) {
      errorInfo = `\n${chalk.red("Error Stack:")}\n${error.stack || error.message}`;
    } else if (error) {
      errorInfo = `\n${chalk.red("Error:")}\n${JSON.stringify(error, null, 2)}`;
    }

    console.error(
      `${chalk.red("[ERROR]")} ${this.getTimestamp()} - ${message}${errorInfo}${this.formatMetadata(meta)}`,
    );
  }

  /**
   * Database operation log
   */
  db(message: string, meta?: LogMetadata): void {
    if (!this.shouldLog("debug")) return;
    console.log(
      `${chalk.magenta("[DB]")} ${this.getTimestamp()} - ${message}${this.formatMetadata(meta)}`,
    );
  }

  /**
   * Server event log
   */
  server(message: string, meta?: LogMetadata): void {
    console.log(
      `${chalk.blue("[SERVER]")} ${this.getTimestamp()} - ${message}${this.formatMetadata(meta)}`,
    );
  }

  /**
   * HTTP request log (structured format)
   *
   * @example
   * logger.http('POST', '/api/transactions', 201, 15);
   * // [HTTP] 2025-02-07 14:30:00.123 - POST /api/transactions 201 15ms
   */
  http(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
  ): void {
    const statusColor =
      statusCode >= 500
        ? chalk.red
        : statusCode >= 400
          ? chalk.yellow
          : statusCode >= 300
            ? chalk.cyan
            : chalk.green;

    console.log(
      `${chalk.blue("[HTTP]")} ${this.getTimestamp()} - ${chalk.bold(method)} ${path} ${statusColor(
        statusCode,
      )} ${chalk.gray(`${duration}ms`)}`,
    );
  }

  /**
   * Transaction creation log
   *
   * @param id - Transaction UUID
   * @param type - Transaction type (entry, membership, etc.)
   * @param amountCents - Amount in cents (e.g., 5000 = 50.00 MAD)
   * @param success - Whether transaction was successful
   *
   * @example
   * logger.transaction('550e8400-...', 'entry', 5000, true);
   * // [TRANSACTION ✓] 2025-02-07 14:30:00.123 - ENTRY | 50.00 MAD | ID: 550e8400...
   */
  transaction(
    id: string,
    type: string,
    amountCents: number,
    success: boolean,
  ): void {
    const emoji = success ? "✓" : "✗";
    const color = success ? chalk.green : chalk.red;
    const amountMAD = (amountCents / 100).toFixed(2);

    console.log(
      `${color(`[TRANSACTION ${emoji}]`)} ${this.getTimestamp()} - ${type.toUpperCase()} | ${amountMAD} MAD | ID: ${id.slice(0, 8)}...`,
    );
  }

  /**
   * Audit log (security-related events)
   *
   * @example
   * logger.audit('CREATE_TRANSACTION', 'kiosk-001', '192.168.1.100');
   * // [AUDIT] 2025-02-07 14:30:00.123 - CREATE_TRANSACTION by kiosk-001 from 192.168.1.100
   */
  audit(
    action: string,
    user: string,
    ipAddress?: string,
    meta?: LogMetadata,
  ): void {
    const ip = ipAddress ? chalk.gray(` from ${ipAddress}`) : "";
    console.log(
      `${chalk.magenta("[AUDIT]")} ${this.getTimestamp()} - ${chalk.bold(action)} by ${user}${ip}${this.formatMetadata(meta)}`,
    );
  }

  /**
   * Sync operation log
   *
   * @example
   * logger.sync('STARTED', 5);
   * // [SYNC] 2025-02-07 14:30:00.123 - STARTED - 5 transactions queued
   */
  sync(
    status: "STARTED" | "SUCCESS" | "FAILED" | "RETRY",
    count?: number,
    meta?: LogMetadata,
  ): void {
    const statusColor =
      status === "SUCCESS"
        ? chalk.green
        : status === "FAILED"
          ? chalk.red
          : status === "RETRY"
            ? chalk.yellow
            : chalk.cyan;

    const countInfo =
      count !== undefined ? chalk.gray(` - ${count} transactions`) : "";

    console.log(
      `${chalk.blue("[SYNC]")} ${this.getTimestamp()} - ${statusColor(status)}${countInfo}${this.formatMetadata(meta)}`,
    );
  }

  /**
   * Print a separator line (useful for visual grouping)
   */
  separator(): void {
    console.log(chalk.gray("─".repeat(80)));
  }

  /**
   * Print startup banner
   */
  banner(appName: string, version: string, port: number): void {
    console.log("\n");
    console.log(
      chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),
    );
    console.log(chalk.cyan.bold(`  ${appName} v${version}`));
    console.log(
      chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),
    );
    console.log(chalk.white(`  🚀 Server running on port ${chalk.bold(port)}`));
    console.log(chalk.white(`  📅 Started at ${this.getTimestamp()}`));
    console.log(
      chalk.white(
        `  🌍 Environment: ${chalk.bold(process.env.NODE_ENV || "development")}`,
      ),
    );
    console.log(
      chalk.cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),
    );
    console.log("\n");
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const logger = new Logger();
