# APEX Electronics — Web Setup & Local Development Guide

## 1. Environment & Prerequisites

The APEX Electronics web platform consists of an enterprise Next.js 14 App Router application connected concurrently to PostgreSQL (relational HRMS, users, permissions) and MongoDB (catalog, inventory, B2B orders, shop visits, double-entry ledger).

### System Requirements
- **Node.js**: v18.18.0 or v20+ LTS
- **PostgreSQL**: v15 or v16 running on port `5435`
- **MongoDB**: v6.0 or v7.0 running on port `27017`
- **Operating System**: Linux, macOS, or Windows WSL2

---

## 2. Environment Configuration (`.env`)

Create or verify the `.env` file in the project root:

```env
# Server & Network Ports
PORT=3000
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# PostgreSQL (Prisma Relational Store)
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/smart_attendance?schema=public"

# MongoDB (Mongoose Document Store)
MONGODB_URI="mongodb://localhost:27017/apex_electronics"

# Cryptographic Secrets & JWT Expiry
JWT_SECRET="smart-attendance-super-secure-jwt-secret-key-32-chars-min-2026"
JWT_REFRESH_SECRET="smart-attendance-super-secure-refresh-jwt-secret-key-2026"
SESSION_SECRET="apex-b2b-enterprise-session-crypto-key-2026-secure"

# Cloud Storage & Uploads
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE_MB=15

# Geolocation & Geofencing Tolerances
DEFAULT_LATITUDE=12.9716
DEFAULT_LONGITUDE=77.5946
GEOFENCE_RADIUS_METERS=100
MAX_ACCURACY_THRESHOLD_METERS=25
```

---

## 3. Database Initialization & Seeding

### 3.1 PostgreSQL Migration & Prisma Generation
Ensure PostgreSQL is active on port 5435, then run:
```bash
npx prisma generate
npx prisma db push
```

### 3.2 Seeding Real Enterprise Data (Postgres + MongoDB)
Populate the database with genuine electronics distributors, verified retail shops, flagship products, IMEI tracking units, and field sales reps:
```bash
npx tsx prisma/seed.ts
```

---

## 4. Launching the Web Application

### Development Mode (with Turbopack / Fast Refresh)
```bash
npm run dev
# App will listen at http://localhost:3000
```

### Production Build & Launch (Recommended for high performance)
```bash
npm run build
npm start
```

---

## 5. Verified Access Accounts & Portals

The platform ships with pre-configured, production-ready enterprise credentials:

| Role | Email | Password | Primary Portal Route |
| :--- | :--- | :--- | :--- |
| **Enterprise Administrator** | `admin@acme.com` | `admin123` | `/distribution` |
| **Field Sales Representative** | `sales@acme.com` | `admin123` | `/field-sales/mobile` |
| **Warehouse Operations Manager**| `warehouse@acme.com` | `admin123` | `/distribution/warehouses` |
| **Finance & Ledger Officer** | `finance@acme.com` | `admin123` | `/distribution/ledger` |
| **HR & Attendance Director** | `hr@acme.com` | `admin123` | `/employees` |

---

## 6. Accessing Mobile & Desktop Modes

1. **Enterprise Desktop Console**: Open `http://localhost:3000/distribution` on any browser with screen width >= 1280px.
2. **Field Sales Mobile View**: Open `http://localhost:3000/field-sales/mobile` or use browser developer tools (F12 > Device Toolbar > Select Pixel 7 / iPhone 14).
3. **Hardware Catalog**: Open `http://localhost:3000/catalog` to inspect the B2B technology catalog.
4. **PWA Standalone Installation**: In Chrome/Edge, click the **Install App** icon in the address bar or the **Install** button on the header to run in standalone desktop/mobile window.
