# 🏊 PISCINE PILOT - PROJECT CONTEXT

**Date Created:** February 7, 2026  
**Status:** Task 1 Complete ✅  
**Developer:** Dash @ ATAED Agency (Tétouan, Morocco)  
**Stack:** TypeScript + Express + Next.js + SQLite + Supabase (future)

---

## 📋 PROJECT OVERVIEW

### **Problem**
Swimming clubs in Morocco face revenue theft due to:
- Unreliable internet connectivity
- Manual ticketing systems
- Staff taking unreported cash payments

### **Solution**
Local-first kiosk system that:
- Works offline (SQLite with WAL mode)
- Prevents theft (No ticket = No entry)
- Syncs to cloud when internet available
- Prints receipts via USB thermal printer
- Maintains audit trail for all transactions

---

## 🏗️ ARCHITECTURE

### **The Node Kiosk Pattern**

```
┌─────────────────────────────────────┐
│   Express Server (Port 3000)        │
│   ├── API Routes (/api/*)           │
│   ├── SQLite Operations             │
│   ├── USB Printer Control (Task 2)  │
│   └── Supabase Sync (Task 3)        │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Next.js Frontend (Port 3001)      │
│   ├── Transaction Form              │
│   ├── Dashboard (future)            │
│   └── Receipt Preview (future)      │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   SQLite (better-sqlite3)            │
│   ├── WAL Mode (crash-resistant)    │
│   ├── Checksums (tamper-proof)      │
│   └── Audit Logging                 │
└─────────────────────────────────────┘
```

---

## 📁 PROJECT STRUCTURE

```
piscine-pilot-ts/
├── server/                    # Express backend
│   ├── index.ts              # Main server
│   ├── db.ts                 # SQLite database manager
│   ├── routes/
│   │   └── transactions.ts   # API routes
│   └── utils/
│       └── logger.ts         # Structured logging
├── shared/                    # Shared types & validation
│   ├── types.ts              # TypeScript interfaces
│   ├── schemas.ts            # Zod validation schemas
│   └── type-guards.ts        # Type guard functions
├── src/                       # Next.js frontend
│   ├── pages/
│   │   ├── _app.tsx         # App wrapper
│   │   └── index.tsx        # Transaction form
│   └── styles/
│       └── globals.css      # Basic styling
├── data/                      # SQLite database (gitignored)
│   ├── local.db             # Main database
│   └── backups/             # Backup folder
├── tsconfig.json             # TypeScript config
├── package.json              # Dependencies
└── .env.local               # Environment variables
```

---

## 🔧 TECHNOLOGY STACK

### **Core Dependencies**
```json
{
  "dependencies": {
    "better-sqlite3": "^12.6.2",
    "express": "^5.2.1",
    "next": "^16.1.6",
    "react": "^19.2.4",
    "zod": "^4.3.6",
    "uuid": "^13.0.0",
    "chalk": "^4.1.2",
    "date-fns": "^4.1.0",
    "cors": "^2.8.6",
    "helmet": "^8.1.0",
    "morgan": "^1.10.1",
    "express-rate-limit": "^8.2.1",
    "crypto-js": "^4.2.0",
    "dotenv": "^17.2.4"
  }
}
```

### **Key TypeScript Configs**
```json
{
  "compilerOptions": {
    "target": "es2017",
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "noImplicitReturns": true,
    "baseUrl": ".",
    "paths": {
      "@server/*": ["server/*"],
      "@shared/*": ["shared/*"],
      "@/*": ["src/*"]
    }
  }
}
```

---

## 🗄️ DATABASE SCHEMA

### **Tables**

**transactions**
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,              -- UUID v4
  amount INTEGER NOT NULL CHECK(amount > 0),  -- Cents (5000 = 50.00 MAD)
  type TEXT NOT NULL CHECK(type IN ('entry', 'membership', 'lesson', 'rental', 'other')),
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash', 'card', 'transfer')),
  customer_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  synced_status TEXT NOT NULL DEFAULT 'pending' CHECK(synced_status IN ('pending', 'synced', 'failed')),
  synced_at TEXT,
  created_by TEXT NOT NULL DEFAULT 'kiosk',
  version INTEGER NOT NULL DEFAULT 1,
  hash TEXT                         -- SHA-256 checksum
);
```

**sync_log**
```sql
CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL,
  attempt_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  status TEXT NOT NULL CHECK(status IN ('success', 'failed')),
  error_message TEXT,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);
```

**audit_log**
```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  user TEXT NOT NULL,
  ip_address TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
```

**settings**
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
```

---

## 🔐 SECURITY FEATURES

### **Input Validation**
- ✅ Zod schemas with strict type checking
- ✅ SQL injection protection (prepared statements only)
- ✅ XSS prevention (input sanitization)
- ✅ Rate limiting (100 requests/minute)

### **Data Integrity**
- ✅ Server-side UUID generation (never trust client)
- ✅ SHA-256 checksums (detect tampering)
- ✅ WAL mode (crash-resistant writes)
- ✅ Audit logging (every action tracked)

### **Network Security**
- ✅ Helmet.js (security headers)
- ✅ CORS (localhost only in dev)
- ✅ HTTPS required in production

---

## 📡 API ENDPOINTS

### **Health Check**
```
GET /api/health
Response: { success: true, data: { status: "healthy", database: true, ... } }
```

### **Create Transaction**
```
POST /api/local/transaction
Body: {
  amount: 5000,           // Cents (50.00 MAD)
  type: "entry",
  payment_method: "cash",
  customer_name: "Ahmed",
  notes: "Morning swim"
}
Response: { success: true, data: { transaction: {...}, printed: false, ... } }
```

### **Get Transaction**
```
GET /api/local/transaction/:id
Response: { success: true, data: {...} }
```

### **Get All Transactions**
```
GET /api/local/transactions?limit=50&offset=0
Response: { success: true, data: { transactions: [...], count: 10 } }
```

### **Get Pending Transactions**
```
GET /api/local/transactions/pending?limit=100
Response: { success: true, data: { transactions: [...], count: 5 } }
```

### **Get Statistics**
```
GET /api/local/transactions/stats
Response: { success: true, data: { total_transactions: 100, total_revenue_mad: 5000, ... } }
```

### **Verify Checksum**
```
POST /api/local/transactions/:id/verify
Response: { success: true, data: { valid: true, transaction_id: "..." } }
```

---

## 🎨 KEY CODE PATTERNS

### **Branded Types (shared/types.ts)**
```typescript
export type UUID = string & { __brand: 'UUID' };
export type PositiveAmount = number & { __brand: 'PositiveAmount' };
export type ISODateString = string & { __brand: 'ISODate' };
export type SHA256Hash = string & { __brand: 'SHA256' };
```

### **Discriminated Union for API Responses**
```typescript
export type ApiResponse<T> =
  | { success: true; data: T; timestamp: ISODateString }
  | { success: false; error: ErrorResponse; timestamp: ISODateString };
```

### **Zod Validation with Sanitization**
```typescript
export const CreateTransactionSchema = z.object({
  amount: z.number().int().positive().finite(),
  type: z.enum(['entry', 'membership', 'lesson', 'rental', 'other']),
  payment_method: z.enum(['cash', 'card', 'transfer']).default('cash'),
  customer_name: z.string().trim().min(2).max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});
```

### **Type Guards (shared/type-guards.ts)**
```typescript
export function toUUID(value: string): UUID {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new Error(`Invalid UUID format: ${value}`);
  }
  return value as UUID;
}
```

---

## 🐛 COMMON ISSUES & SOLUTIONS

### **Issue 1: Module Format Error**
```
Error: Specified module format (CommonJs) is not matching...
```
**Solution:** Remove `"type": "commonjs"` from package.json

### **Issue 2: Path Alias Not Working**
```
Error: Cannot find module '@shared/types'
```
**Solution:** Use relative imports instead: `'../shared/types'`

### **Issue 3: Zod API Deprecated**
```
Error: Property 'errors' does not exist on type 'ZodError'
```
**Solution:** Use `.issues` instead of `.errors` (Zod v4 API)

### **Issue 4: Branded Type Assignment Error**
```
Error: Type 'string' is not assignable to type 'ISODateString'
```
**Solution:** Use type guards: `toISODateString(new Date())`

### **Issue 5: Express 5 Route Error**
```
Error: Missing parameter name at index 1: *
```
**Solution:** Use `app.use((req, res) => ...)` instead of `app.all('*', ...)`

### **Issue 6: Next.js Lock File Conflict**
```
Error: Unable to acquire lock at .next/dev/lock
```
**Solution:** Kill lingering processes with `pkill -9 node` and remove lock

### **Issue 7: Server Hanging (CLOSE_WAIT)**
```
Requests timeout, lsof shows CLOSE_WAIT connections
```
**Solution:** Kill process and restart, add `.setTimeout(30000)` to server

---

## 🚀 DEVELOPMENT WORKFLOW

### **Start Development**
```bash
npm run dev
# Runs: concurrently "npm:dev:server" "npm:dev:next"
# Express on :3000, Next.js on :3001
```

### **Type Check**
```bash
npm run typecheck
```

### **Build for Production**
```bash
npm run build
npm start
```

### **Database Operations**
```bash
# Reset database
npm run db:reset

# Query database
sqlite3 data/local.db "SELECT * FROM transactions;"

# Check database size
du -h data/local.db
```

---

## ✅ TASK 1 STATUS: COMPLETE

### **Implemented Features**
- ✅ SQLite database with WAL mode
- ✅ TypeScript strict mode (zero `any` types)
- ✅ Zod validation with branded types
- ✅ Express API with security middleware
- ✅ Next.js frontend with transaction form
- ✅ Audit logging and checksums
- ✅ Health check endpoint
- ✅ Graceful shutdown
- ✅ Structured logging with colors
- ✅ Error handling everywhere

### **Testing**
```bash
# Health check
curl http://localhost:3000/api/health

# Create transaction
curl -X POST http://localhost:3000/api/local/transaction \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "type": "entry", "payment_method": "cash"}'

# Get stats
curl http://localhost:3000/api/local/transactions/stats
```

---

## 📋 NEXT TASKS

### **Task 2: Printer Integration (Future)**
- [ ] Install `node-thermal-printer` driver
- [ ] Create receipt template
- [ ] Add print queue system
- [ ] Test with USB thermal printer or simulator

### **Task 3: Cloud Sync (Future)**
- [ ] Setup Supabase project
- [ ] Create Postgres schema with RLS
- [ ] Implement sync queue
- [ ] Add conflict resolution
- [ ] Add retry mechanism with exponential backoff

---

## 🔑 ENVIRONMENT VARIABLES

### **.env.local**
```env
PORT=3000
NODE_ENV=development
DATABASE_PATH=./data/local.db
ADMIN_PIN=1234
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Supabase (Task 3)
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

---

## 📝 NOTES FOR CONTINUATION

### **Developer Context**
- Solo full-stack developer (5 years MERN, now Next.js + Supabase)
- Based in Tétouan, Morocco
- Building ATAED agency
- Focus on high-value control systems for traditional Moroccan businesses

### **Project Context**
- Real client: Swimming pool in Morocco
- Revenue leakage problem from staff taking unreported cash
- Internet connectivity is unreliable
- Amounts in cents (integer) to avoid floating-point errors
- All timestamps in UTC
- Security is critical (money involved)

### **Technical Decisions Made**
- Express 5 + Next.js (not integrated, separate ports in dev)
- SQLite with WAL mode (not Postgres - offline-first requirement)
- Zod v4 (latest API with `.issues` not `.errors`)
- Branded types for compile-time safety
- Relative imports (not path aliases due to ts-node issues)
- Concurrently for dev (Express :3000, Next.js :3001)

### **Code Style Preferences**
- Detailed JSDoc comments
- Structured logging with context
- Try/catch on all async operations
- Explicit error handling (no silent failures)
- Type-safe everything (no `any`)
- Security-first approach

---

## 🎯 HOW TO CONTINUE THIS PROJECT

### **Starting a New Claude Session**

1. **Paste this entire document** as context
2. **State your goal**, example:
   - "Continue Task 2: Add thermal printer support"
   - "Continue Task 3: Add Supabase cloud sync"
   - "Fix bug: [describe issue]"
   - "Add feature: [describe feature]"

3. **Provide relevant files** if needed:
   - For printer: Share `server/routes/transactions.ts`
   - For sync: Share `server/db.ts` and schemas
   - For bugs: Share error logs and affected files

### **Quick Start Commands**
```bash
# Clone and setup
git clone [your-repo]
cd piscine-pilot-ts
npm install

# Start development
npm run dev

# Test API
curl http://localhost:3000/api/health
```

---

## 📚 USEFUL COMMANDS REFERENCE

```bash
# Development
npm run dev              # Start both servers
npm run dev:server       # Start Express only
npm run dev:next         # Start Next.js only
npm run typecheck        # Check types
npm run build            # Build for production

# Database
sqlite3 data/local.db "SELECT COUNT(*) FROM transactions;"
sqlite3 data/local.db ".schema transactions"
sqlite3 data/local.db ".backup data/backups/manual-backup.db"

# Process Management
lsof -i :3000            # Check what's on port 3000
pkill -f "ts-node-dev"   # Kill server
pkill -f "next dev"      # Kill Next.js
pkill -9 node            # Nuclear option

# Git
git status
git add .
git commit -m "feat: [description]"
git push origin [branch]
```

---

## 🏆 SUCCESS METRICS

Your project is working correctly when:
- ✅ `npm run dev` starts without errors
- ✅ http://localhost:3001 shows transaction form
- ✅ Form submission creates transaction and shows success
- ✅ `curl http://localhost:3000/api/health` returns healthy status
- ✅ Database contains transactions: `sqlite3 data/local.db "SELECT * FROM transactions;"`
- ✅ No TypeScript errors: `npm run typecheck`
- ✅ Logs show colored output with structured data

---

**END OF CONTEXT DOCUMENT**

*This document contains everything needed to continue the Piscine Pilot project in a new Claude conversation. Save it, commit it to your repo, and use it as context when resuming work.*
