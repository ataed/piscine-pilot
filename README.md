# 🏊 Piscine Pilot

Offline-first kiosk system for swimming pool / club revenue management, built for fast counter transactions and shift-based accounting.

> **Project status:** feature-complete for v1.0 (authentication, point of sale, user management). I built this as a self-directed project after seeing a family-run club losing money with paper-based tracking — nobody commissioned it, and it was never deployed. It's public as a portfolio piece.

---

## 📋 Overview

Piscine Pilot is a touch-friendly kiosk application designed to replace paper transaction logs at leisure clubs and similar small venues. It runs offline-first on local hardware (tablet or mini-PC), with staff accountability, tamper-evident transaction records, and thermal receipt printing.

The stack is deliberately lightweight, chosen for venues with unreliable internet.

## ✨ Features

### Core Transaction System

- 🏊 Touch-friendly kiosk interface (entries, memberships, lessons, rentals)
- 💵 Multiple payment methods (cash, card, transfer)
- 🧾 Thermal receipt printing (80mm) with QR code verification
- 🔒 Tamper-evident transactions (SHA-256 checksums)
- 📊 Real-time dashboard (today's revenue, transaction breakdown)
- 📁 Admin panel with search, filters, and CSV export

### Authentication & Access

- 🔐 Staff login via 4-digit PIN (touch-friendly PIN pad)
- 👥 Role-based access control (cashier / manager / admin), enforced by a numeric role hierarchy rather than scattered string checks
- ⏱️ Session management (8-hour shift-length sessions, validated server-side on every request)
- 📝 Full audit trail (every login, failed login, transaction, and admin action logged)
- 🧑‍💼 User management UI (create/view staff, per-user transaction history, soft-delete with immediate session revocation)

### Data Integrity

- 💾 SQLite with WAL mode (offline-first, no internet dependency)
- ✅ Zod schema validation at the route boundary, before anything reaches the database
- 🔗 All queries use prepared statements with bound parameters
- 🔗 Every transaction tracks its creator (`user_id`) for accountability
- 🕐 UTC timestamp storage with local timezone display conversion

### Extras

- 📱 QR-based ticket scanner for entry verification
- 🎨 Custom club branding (logo, colour palette, French-language UI)

---

## 🛡️ Rate Limiting

Login is protected at two levels, which do different jobs.

**Per IP** (`express-rate-limit`, in `server/index.ts`)

- General API limiter: 100 requests per 60s window (configurable via env)
- Login-specific limiter: 50 attempts per 15 minutes, with successful requests skipped so normal staff use never counts against it

**Per username** (custom in-memory tracker, in `auth-service.ts`)

- 3 failed attempts, then a 5-minute lockout on that username

I started with the IP layer only. The problem is that an IP limit is about request volume, not about which account is being attacked — a slow, patient attempt against one staff account, or attempts spread across a few addresses, stays comfortably under the threshold. On a kiosk with a 4-digit PIN and a handful of staff accounts, that's the attack that actually matters. So the per-username lockout was added on top, and both run together now.

Failed logins return the same 401 and the same message whether the username exists or not, and the lockout counter increments for unknown usernames too — so the endpoint doesn't reveal which accounts are real.

`helmet` and a CORS origin allowlist are also applied at the app level.

---

## ⚠️ Known Limitations

Worth being explicit about, since this was a learning project and never went to production:

- **PIN hashing is SHA-256 without a salt.** For a 4-digit keyspace this is inadequate against an offline attack on the database file — 10,000 candidates against a fast hash is trivial, and identical PINs produce identical hashes. bcrypt or argon2 is the correct choice and is the first thing I'd change before deploying this anywhere.
- **The username lockout tracker is in-memory**, so lockouts clear on process restart, and the Map grows unbounded if someone submits arbitrary usernames. A periodic sweep of expired entries would fix both.
- **No cloud sync or off-site backup.** By design for v1.0, but it means a lost device is lost data.

---

## 🛠️ Tech Stack

| Layer         | Technology                                                    |
| ------------- | ------------------------------------------------------------- |
| Frontend      | Next.js 16 (Pages Router), TypeScript (strict mode)           |
| Backend       | Express 5, Node.js                                            |
| Database      | SQLite via better-sqlite3 (WAL mode, offline-first)           |
| Validation    | Zod                                                           |
| Auth          | Custom session-based auth                                     |
| Rate limiting | express-rate-limit (IP) + custom in-memory tracker (username) |
| Printing      | Browser print API (80mm thermal) + QR codes                   |
| QR scanning   | @yudiel/react-qr-scanner                                      |

**Why this stack:** built for small venues with intermittent internet. SQLite in WAL mode means reads and writes don't block each other and the system keeps working through connectivity drops.

---

## 📁 Project Structure

```
piscine-pilot/
├── server/
│   ├── index.ts              # Express app, helmet/CORS, rate limiters
│   ├── db.ts                 # DatabaseManager (SQLite singleton)
│   ├── migrations/
│   │   └── 001-auth.ts       # Users & sessions schema
│   ├── routes/
│   │   ├── auth.ts           # Login, logout, user management
│   │   └── transactions.ts   # Transaction CRUD
│   └── utils/
│       ├── auth-service.ts   # Auth logic, lockouts, sessions
│       └── logger.ts
├── src/
│   ├── pages/
│   │   ├── index.tsx         # Kiosk (transaction entry)
│   │   ├── dashboard.tsx     # Manager view
│   │   ├── admin.tsx         # Admin panel
│   │   ├── admin/users.tsx   # User management
│   │   ├── login.tsx         # PIN pad login
│   │   └── scan.tsx          # QR ticket scanner
│   ├── components/
│   │   ├── ReceiptPreview.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── UserHeader.tsx
│   │   ├── CreateUserModal.tsx
│   │   └── UserDetailsModal.tsx
│   └── lib/
│       └── auth-context.tsx  # React auth state (session, roles)
├── shared/
│   ├── types.ts
│   ├── type-guards.ts
│   └── schemas.ts            # Zod validation schemas
└── data/
    └── local.db              # SQLite database (gitignored)
```

---

## 🚀 Getting Started

**Prerequisites:** Node.js 18+, npm

```bash
git clone <repo-url>
cd piscine-pilot
npm install
```

**Environment** (`.env.local`):

```
KIOSK_ID=kiosk_001
NODE_ENV=development
```

**Database setup:**

```bash
npx ts-node server/migrations/001-auth.ts
```

Creates the `users` and `sessions` tables and seeds a default admin (`admin` / `1234`). Change it in any real environment.

**Run:**

```bash
npm run dev
```

- Express API on `http://localhost:3000`
- Next.js frontend on `http://localhost:3001`

---

## 🔐 Roles & Permissions

| Route          | Cashier | Manager | Admin |
| -------------- | ------- | ------- | ----- |
| `/` (Kiosk)    | ✅      | ✅      | ✅    |
| `/dashboard`   | ❌      | ✅      | ✅    |
| `/admin`       | ❌      | ❌      | ✅    |
| `/admin/users` | ❌      | ❌      | ✅    |

Role checks run server-side against the session on every protected endpoint, not only in the UI.

---

## 📊 How It Was Built

1. **Backend foundation** — SQLite schema, Express API, Zod validation, transaction checksums
2. **Demo UI** — kiosk, dashboard and admin pages with club branding
3. **Authentication** — PIN login, sessions, role-based access
4. **Rate limiting** — added the per-username lockout on top of the existing IP limiter
5. **User management** — admin UI for staff accounts with per-user transaction history
6. **Receipts & scanning** — QR-verified receipts and a dedicated scanner page

## 🧭 Next Steps

Not built, but the obvious direction if this were taken further: bcrypt for PIN hashing, cloud sync and multi-site reporting, automated off-site backups, and member self-service check-in.

---

## 📄 License

Private project — shared for technical evaluation and portfolio purposes.

## 👤 Author

Built by ATAED
