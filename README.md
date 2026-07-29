# 🏊 Piscine Pilot

Offline-first kiosk system for swimming pool / club revenue management, built for high-speed counter transactions and shift-based accounting.

⚠️ **Project Status:** Feature-complete for v1.0 (Authentication, Point of Sale, & User Management). Originally developed as a custom client prototype, this repository is public as a technical portfolio piece demonstrating production-grade offline-first architecture, hardware printing integration, and defense-in-depth security patterns.

---

## 📋 Overview

Piscine Pilot is a touch-friendly kiosk application designed to replace paper-based transaction tracking at leisure clubs and similar small venues. It runs offline-first on local hardware (tablet/mini-PC), featuring staff accountability, tamper-resistant transaction records, and thermal receipt printing.

Built as a demonstration of production-grade patterns—authentication, dual-layer rate limiting, audit trails, and offline data integrity—using a lightweight stack suitable for businesses with unreliable internet connectivity.

---

## ✨ Features

### Core Transaction System

- 🏊 **Touch-friendly kiosk interface** (entries, memberships, lessons, rentals)
- 💵 **Multiple payment methods** (cash, card, transfer)
- 🧾 **Thermal receipt printing (80mm)** with QR code verification
- 🔒 **Tamper-evident transactions** (SHA-256 checksums)
- 📊 **Real-time dashboard** (today's revenue, transaction breakdown)
- 📁 **Admin panel** with search, filters, and CSV export

### Authentication & Security

- 🔐 **Staff login via 4-digit PIN** (touch-friendly PIN pad)
- 👥 **Role-based access control** (cashier / manager / admin)
- ⏱️ **Session management** (8-hour shift-based sessions)
- 🛡️ **Two-layer rate limiting:**
  - **IP-based** (100 requests / 15 min) — stops bots/scripts
  - **Username-based** (3 attempts / 5 min lockout) — stops targeted brute force
- 📝 **Full audit trail** (every login, transaction, and admin action logged)
- 🧑‍💼 **User management UI** (create/view staff, see per-user transaction history)

### Data Integrity

- 💾 **SQLite with WAL mode** (offline-first, no internet dependency)
- ✅ **Zod schema validation** with input sanitization (XSS/injection protection)
- 🔗 **Every transaction tracks its creator** (`user_id`) for accountability
- 🕐 **UTC timestamp storage** with local timezone display conversion

### Extras

- 📱 **QR-based ticket scanner** for entry verification (fraud detection)
- 🎨 **Custom club branding** (logo, color palette, French-language UI)

---

## 🛠️ Tech Stack

| Layer             | Technology                                                      |
| :---------------- | :-------------------------------------------------------------- |
| **Frontend**      | Next.js 16 (Pages Router), TypeScript (strict mode)             |
| **Backend**       | Express 5, Node.js                                              |
| **Database**      | SQLite (WAL mode, offline-first)                                |
| **Validation**    | Zod                                                             |
| **Auth**          | Custom session-based auth (SHA-256 PIN hashing)                 |
| **Rate Limiting** | `express-rate-limit` (IP) + custom in-memory tracker (username) |
| **Printing**      | Browser print API (thermal 80mm optimized) + QR codes           |
| **QR Scanning**   | `@yudiel/react-qr-scanner`                                      |

> **Why this stack:** Designed for small businesses with intermittent internet. SQLite + WAL mode means the system keeps working through connectivity drops—critical for environments with variable network infrastructure.

---

## 📁 Project Structure

```text
piscine-pilot/
├── server/
│   ├── index.ts              # Express app entry, static file serving
│   ├── db.ts                 # DatabaseManager (SQLite singleton)
│   ├── migrations/
│   │   └── 001-auth.ts       # Users & sessions schema
│   ├── routes/
│   │   ├── auth.ts           # Login, logout, user management
│   │   └── transactions.ts   # Transaction CRUD
│   └── utils/
│       ├── auth-service.ts   # Auth logic, rate limiting, sessions
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
│   ├── types.ts              # Shared TypeScript interfaces
│   └── schemas.ts            # Zod validation schemas
└── data/
    └── local.db              # SQLite database (gitignored)
```

---

## 🚀 Getting Started

### **Prerequisites**

- Node.js 18+
- npm

### **Installation**

```bash
git clone <repo-url>
cd piscine-pilot
npm install
```

### **Environment Setup**

```bash
# .env
KIOSK_ID=kiosk_001
NODE_ENV=development
```

### **Database Setup**

```bash
npx ts-node server/migrations/001-auth.ts
```

This creates the `users` and `sessions` tables and seeds a default admin account.

**Default credentials:**

```
Username: admin
PIN: 1234
```

⚠️ Change this immediately in any non-demo environment.

### **Run Development Servers**

```bash
npm run dev
```

This starts:

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

---

## 🔒 Security Notes

- PINs are hashed with SHA-256 before storage (never stored in plain text)
- Sessions expire after 8 hours (one work shift)
- Transactions are checksum-verified to detect tampering
- Rate limiting operates at two levels simultaneously (see Features above) to prevent both scripted attacks and targeted account brute-forcing
- All user-supplied strings pass through sanitization (strips HTML/SQL-dangerous characters) before storage, in addition to Zod type validation

This is a defense-in-depth approach appropriate for handling cash transactions in a small business context — not intended as a substitute for professional security auditing in a larger-scale or higher-value deployment.

---

## 📊 Project History

This project went through several iterations:

1. **Backend foundation** — SQLite schema, Express API, Zod validation, checksums
2. **Demo UI** — Three-page kiosk/dashboard/admin system with club branding
3. **Authentication system** — Full login, sessions, role-based access
4. **Rate limiting hardening** — Added after identifying a username-enumeration gap in the initial per-username lockout design
5. **User management** — Admin UI for staff accounts, with per-user transaction audit trails
6. **Receipt & scanning** — QR-verified receipts, dedicated ticket scanner page

---

## 🧭 Current Status & Next Steps

The core local-first POS, authentication, and receipt printing pipelines are fully operational for v1.0. Future enhancements for scaled or enterprise deployments include:

- Cloud synchronization / multi-tenancy rollup reporting

- Remote (internet-facing) administrative deployment

- Automated off-site database backup schedules

- Member-facing self-service features (QR check-in kiosk & balance tracking)

---

## 📄 License

Private project — shared for technical evaluation and portfolio demonstration purposes.

---

## 👤 Author

Built by ATAED
