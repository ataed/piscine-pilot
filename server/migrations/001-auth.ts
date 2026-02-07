/**
 * Database Migration: Add Authentication & Security
 * Run this to add user tables and enhanced audit logging
 */

import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(__dirname, '../../data/local.db');

export function runMigration() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  console.log('🔄 Running security migration...');

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('cashier', 'manager', 'admin')),
      full_name TEXT NOT NULL,
      location_id TEXT DEFAULT 'main',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
      is_active INTEGER DEFAULT 1,
      last_login_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);

  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_info TEXT,
      ip_address TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
      last_activity_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);

  // Enhance audit_log table (add user tracking)
  db.exec(`
    -- Add user_id column to existing audit_log if not exists
    ALTER TABLE audit_log ADD COLUMN user_id TEXT;
    
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
  `);

  // Update transactions table to track creator
  db.exec(`
    -- Add user_id to transactions if not exists
    ALTER TABLE transactions ADD COLUMN user_id TEXT;
    
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
  `);

  // Create default admin user (PIN: 1234)
  const adminId = crypto.randomUUID();
  const defaultPinHash = hashPin('1234');

  const insertAdmin = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, pin_hash, role, full_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertAdmin.run(
    adminId,
    'admin',
    defaultPinHash,
    'admin',
    'Administrateur'
  );

  console.log('✅ Migration completed!');
  console.log('');
  console.log('📌 Default admin account created:');
  console.log('   Username: admin');
  console.log('   PIN: 1234');
  console.log('   ⚠️  CHANGE THIS PIN IMMEDIATELY!');
  console.log('');

  db.close();
}

// Hash PIN using SHA-256
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// Run migration if called directly
if (require.main === module) {
  try {
    runMigration();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}
