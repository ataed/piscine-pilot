/**
 * Authentication Service with Rate Limiting
 * Prevents brute force attacks with login attempt tracking
 */

import crypto from "crypto";
import { dbManager } from "../db";
import { logger } from "./logger";

export interface User {
  id: string;
  username: string;
  role: "cashier" | "manager" | "admin";
  full_name: string;
  location_id: string;
  created_at?: string;
  last_login_at?: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
}

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

export class AuthService {
  private readonly SESSION_DURATION_HOURS = 8;
  private readonly MAX_ATTEMPTS = 3;
  private readonly LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  private loginAttempts = new Map<string, LoginAttempt>();

  /**
   * Authenticate user with username and PIN
   */
  public login(
    username: string,
    pin: string,
    ipAddress?: string,
  ): { user: User; session: Session } | { error: string } | null {
    try {
      // Check if user is locked out
      const lockoutCheck = this.checkLockout(username);
      if (lockoutCheck.isLocked) {
        logger.warn("Login blocked: User locked out", {
          username,
          remainingTime: lockoutCheck.remainingSeconds,
        });
        return {
          error: `Compte verrouillé. Réessayez dans ${lockoutCheck.remainingSeconds} secondes.`,
        };
      }

      const pinHash = this.hashPin(pin);

      const stmt = dbManager.getDb().prepare(`
        SELECT id, username, pin_hash, role, full_name, location_id, is_active
        FROM users
        WHERE username = ? AND is_active = 1
      `);

      const user = stmt.get(username) as any;

      if (!user) {
        this.recordFailedAttempt(username);
        logger.warn("Login failed: User not found", { username });
        return null;
      }

      if (user.pin_hash !== pinHash) {
        this.recordFailedAttempt(username);
        logger.warn("Login failed: Invalid PIN", {
          username,
          attemptsRemaining: this.getRemainingAttempts(username),
        });
        return null;
      }

      // Success - clear attempts
      this.clearAttempts(username);

      // Create session
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.SESSION_DURATION_HOURS);

      const insertSession = dbManager.getDb().prepare(`
        INSERT INTO sessions (id, user_id, ip_address, expires_at)
        VALUES (?, ?, ?, ?)
      `);

      insertSession.run(
        sessionId,
        user.id,
        ipAddress || "unknown",
        expiresAt.toISOString(),
      );

      // Update last login
      const updateLogin = dbManager.getDb().prepare(`
        UPDATE users SET last_login_at = datetime('now', 'utc') WHERE id = ?
      `);
      updateLogin.run(user.id);

      // Log successful login
      dbManager.logAudit(
        "USER_LOGIN",
        "session",
        sessionId,
        user.id,
        ipAddress || "unknown",
      );

      logger.success("User logged in", {
        username: user.username,
        role: user.role,
        session_id: sessionId,
      });

      const session: Session = {
        id: sessionId,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
      };

      const userInfo: User = {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        location_id: user.location_id,
      };

      return { user: userInfo, session };
    } catch (error) {
      logger.error("Login error", error as Error);
      return null;
    }
  }

  /**
   * Check if user is locked out
   */
  private checkLockout(username: string): {
    isLocked: boolean;
    remainingSeconds: number;
  } {
    const attempts = this.loginAttempts.get(username);

    if (!attempts || attempts.count < this.MAX_ATTEMPTS) {
      return { isLocked: false, remainingSeconds: 0 };
    }

    const now = Date.now();
    const lockoutEnd = attempts.lastAttempt + this.LOCKOUT_DURATION_MS;

    if (now < lockoutEnd) {
      const remainingMs = lockoutEnd - now;
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      return { isLocked: true, remainingSeconds };
    }

    // Lockout expired, clear attempts
    this.loginAttempts.delete(username);
    return { isLocked: false, remainingSeconds: 0 };
  }

  /**
   * Record failed login attempt
   */
  private recordFailedAttempt(username: string): void {
    const current = this.loginAttempts.get(username) || {
      count: 0,
      lastAttempt: 0,
    };

    const newAttempt: LoginAttempt = {
      count: current.count + 1,
      lastAttempt: Date.now(),
    };

    this.loginAttempts.set(username, newAttempt);

    // Log failed attempt
    dbManager.logAudit("FAILED_LOGIN", "user", username, "system", "unknown", {
      attempt_count: newAttempt.count,
    });

    if (newAttempt.count >= this.MAX_ATTEMPTS) {
      logger.warn("User locked out after failed attempts", {
        username,
        attempts: newAttempt.count,
        lockout_duration_minutes: this.LOCKOUT_DURATION_MS / 60000,
      });
    }
  }

  /**
   * Get remaining attempts before lockout
   */
  private getRemainingAttempts(username: string): number {
    const attempts = this.loginAttempts.get(username);
    if (!attempts) return this.MAX_ATTEMPTS;
    return Math.max(0, this.MAX_ATTEMPTS - attempts.count);
  }

  /**
   * Clear login attempts on successful login
   */
  private clearAttempts(username: string): void {
    this.loginAttempts.delete(username);
  }

  /**
   * Get lockout status for username (for API endpoint)
   */
  public getLockoutStatus(username: string): {
    isLocked: boolean;
    remainingSeconds: number;
    attempts: number;
  } {
    const lockout = this.checkLockout(username);
    const attempts = this.loginAttempts.get(username);

    return {
      isLocked: lockout.isLocked,
      remainingSeconds: lockout.remainingSeconds,
      attempts: attempts?.count || 0,
    };
  }

  /**
   * Validate session and get user
   */
  public validateSession(sessionId: string): User | null {
    try {
      const stmt = dbManager.getDb().prepare(`
        SELECT 
          u.id, u.username, u.role, u.full_name, u.location_id,
          s.expires_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND u.is_active = 1
      `);

      const result = stmt.get(sessionId) as any;

      if (!result) {
        return null;
      }

      // Check if expired
      const expiresAt = new Date(result.expires_at);
      if (expiresAt < new Date()) {
        logger.warn("Session expired", { session_id: sessionId });
        this.logout(sessionId);
        return null;
      }

      // Update last activity
      const updateActivity = dbManager.getDb().prepare(`
        UPDATE sessions SET last_activity_at = datetime('now', 'utc') WHERE id = ?
      `);
      updateActivity.run(sessionId);

      return {
        id: result.id,
        username: result.username,
        role: result.role,
        full_name: result.full_name,
        location_id: result.location_id,
      };
    } catch (error) {
      logger.error("Session validation error", error as Error);
      return null;
    }
  }

  /**
   * Logout user (destroy session)
   */
  public logout(sessionId: string): boolean {
    try {
      const stmt = dbManager
        .getDb()
        .prepare("DELETE FROM sessions WHERE id = ?");
      const result = stmt.run(sessionId);

      if (result.changes > 0) {
        logger.info("User logged out", { session_id: sessionId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Logout error", error as Error);
      return false;
    }
  }

  /**
   * Create new user (admin only)
   */
  public createUser(
    username: string,
    pin: string,
    role: "cashier" | "manager" | "admin",
    fullName: string,
    locationId: string = "main",
  ): User | null {
    try {
      const userId = crypto.randomUUID();
      const pinHash = this.hashPin(pin);

      const stmt = dbManager.getDb().prepare(`
        INSERT INTO users (id, username, pin_hash, role, full_name, location_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(userId, username, pinHash, role, fullName, locationId);

      logger.success("User created", { username, role });

      return {
        id: userId,
        username,
        role,
        full_name: fullName,
        location_id: locationId,
      };
    } catch (error) {
      logger.error("User creation failed", error as Error);
      return null;
    }
  }

  /**
   * Change user PIN
   */
  public changePin(userId: string, oldPin: string, newPin: string): boolean {
    try {
      const oldPinHash = this.hashPin(oldPin);
      const newPinHash = this.hashPin(newPin);

      // Verify old PIN
      const verifyStmt = dbManager
        .getDb()
        .prepare("SELECT pin_hash FROM users WHERE id = ?");
      const user = verifyStmt.get(userId) as any;

      if (!user || user.pin_hash !== oldPinHash) {
        logger.warn("PIN change failed: Invalid old PIN", { user_id: userId });
        return false;
      }

      // Update PIN
      const updateStmt = dbManager.getDb().prepare(`
        UPDATE users 
        SET pin_hash = ?, updated_at = datetime('now', 'utc')
        WHERE id = ?
      `);

      updateStmt.run(newPinHash, userId);

      logger.success("PIN changed", { user_id: userId });
      return true;
    } catch (error) {
      logger.error("PIN change error", error as Error);
      return false;
    }
  }

  /**
   * List all users (admin only)
   */
  public listUsers(): User[] {
    try {
      const stmt = dbManager.getDb().prepare(`
       SELECT 
        id, 
        username, 
        role, 
        full_name, 
        location_id,
        created_at,
        last_login_at
      FROM users
      WHERE is_active = 1
      ORDER BY created_at DESC
    `);
      const users = stmt.all() as User[];
      return users;
    } catch (error) {
      logger.error("List users error", error as Error);
      return [];
    }
  }

  /**
   * Deactivate user (soft delete)
   */
  public deactivateUser(userId: string): boolean {
    try {
      const stmt = dbManager.getDb().prepare(`
        UPDATE users SET is_active = 0, updated_at = datetime('now', 'utc')
        WHERE id = ?
      `);

      const result = stmt.run(userId);

      if (result.changes > 0) {
        // Delete all sessions for this user
        const deleteSessions = dbManager
          .getDb()
          .prepare("DELETE FROM sessions WHERE user_id = ?");
        deleteSessions.run(userId);

        logger.info("User deactivated", { user_id: userId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Deactivate user error", error as Error);
      return false;
    }
  }

  /**
   * Clean expired sessions (run periodically)
   */
  public cleanExpiredSessions(): number {
    try {
      const stmt = dbManager.getDb().prepare(`
        DELETE FROM sessions WHERE expires_at < datetime('now', 'utc')
      `);

      const result = stmt.run();

      if (result.changes > 0) {
        logger.info("Expired sessions cleaned", { count: result.changes });
      }

      return result.changes;
    } catch (error) {
      logger.error("Clean sessions error", error as Error);
      return 0;
    }
  }

  /**
   * Check if user has required role
   */
  public hasRole(
    user: User,
    requiredRole: "cashier" | "manager" | "admin",
  ): boolean {
    const roleHierarchy = {
      cashier: 1,
      manager: 2,
      admin: 3,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Hash PIN using SHA-256
   */
  private hashPin(pin: string): string {
    return crypto.createHash("sha256").update(pin).digest("hex");
  }
}

// Export singleton instance
export const authService = new AuthService();
