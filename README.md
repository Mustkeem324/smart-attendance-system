# Smart Attendance & Advanced HR Management System (HRMS)

A complete, production-grade, enterprise Smart Attendance Management and HRMS Platform built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **PostgreSQL 16**, and **Prisma ORM**.

Supports desktop browsers, tablets, mobile browsers, and installable **Progressive Web Apps (PWA)** with high-precision GPS geofencing, front-camera WebRTC live selfie presence verification, multi-branch management, and shift automation.

---

## 🌟 Key Features

### 1. GPS Geofencing Engine
- **Server-Side Geodesic Validation**: Employs the Haversine great-circle formula to calculate distance between employee coordinates and registered office locations.
- **Configurable Radius Per Branch**: 50 meters (default), 100 meters, or custom boundary radius per office branch.
- **Anti-Spoofing Heuristics**: Flags synthetic zero accuracy (0.0m) and excessive telemetry drift.
- **Interactive Simulator**: Integrated coordinate test tool on `/attendance/gps-verification`.

### 2. Live Camera & Selfie Verification
- **WebRTC Front Camera Integration**: Prompts live front-facing selfie camera with face alignment guide oval.
- **Canvas Timestamp Watermarking**: Burns server timestamp and GPS verification status onto captured selfies.
- **Selfie Audit Log Gallery**: Admin review gallery on `/attendance/camera-verification` with modal inspection.

### 3. Shift & Hours Engine
- **Flexible & Scheduled Shifts**: General (09:00 - 18:00), Morning (07:00 - 16:00), Evening, and Overnight (crossing midnight).
- **Grace Period Calculation**: Configurable late arrival grace time (e.g. 15 mins).
- **Working Hours & Overtime**: Automatic half-day threshold (4.5h), full-day (8.0h), and overtime calculation.

### 4. Excel & Reporting Integration (ExcelJS)
- **Multi-Row Excel Bulk Employee Import**: Drag-and-drop `.xlsx` file upload with row-by-row validation diagnostics.
- **Export Formats**: Excel (.xlsx), CSV, and printable PDF compliance reports.
- **Pre-formatted Template**: Downloadable Excel template for workforce imports.

### 5. Multi-Tenant Role-Based Access Control (RBAC)
- `SUPER_ADMIN`: Global tenant and organizational administration.
- `COMPANY_ADMIN`: Complete control over branches, departments, shifts, employees, and policies.
- `HR_MANAGER`: Daily attendance oversight, punch corrections with audit trails, leave approvals.
- `TEAM_MANAGER`: Team presence monitoring and leave decision reviews.
- `EMPLOYEE`: Mobile-first selfie punch terminal, leave applications, holiday calendar.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React |
| **Backend** | Next.js Route Handlers, Argon2/Bcrypt, JWT with Refresh Token Rotation |
| **Database** | PostgreSQL 16, Prisma ORM 5.22, Redis |
| **Excel & Reports** | ExcelJS, CSV stream generator, PDF Print Stylesheets |
| **Biometrics & Geo** | HTML5 Geolocation API, WebRTC MediaDevices API, Haversine Engine |
| **Deployment** | Docker, Docker Compose, Multi-stage alpine containers |

---

## 🚀 Quick Start & Installation

### 1. Clone & Install Dependencies
```bash
cd smart-attendance-system
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure your `.env` contains:
```env
DATABASE_URL="postgresql://attendance:attendance_secret@127.0.0.1:5435/smart_attendance_db?schema=public"
JWT_SECRET="smart-attendance-super-secure-jwt-secret-key-32-chars-min-2026"
JWT_REFRESH_SECRET="smart-attendance-super-secure-refresh-jwt-secret-key-2026"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Synchronize Database & Seed Demo Data
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Run Automated Test Suite
```bash
npx tsx test/suite.ts
```
*(Runs 26 comprehensive unit and integration tests across geofencing, shift hours, hashing, and Excel engines).*

### 5. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Primary Interface |
|---|---|---|---|
| **Company Admin** | `admin@acme.com` | `Admin@12345` | `/admin/dashboard` |
| **Super Admin** | `superadmin@acme.com` | `Admin@12345` | `/admin/dashboard` |
| **HR Manager** | `hr@acme.com` | `Password@123` | `/admin/dashboard` |
| **Team Manager** | `manager@acme.com` | `Password@123` | `/admin/dashboard` |
| **Employee (John)** | `john.doe@acme.com` | `Password@123` | `/employee/dashboard` |
| **Employee (Sarah)** | `sarah.smith@acme.com` | `Password@123` | `/employee/dashboard` |

*(The login page at `/login` also features instant one-click demo role switcher chips).*

---

## 🐳 Docker Deployment

To launch the full production stack (Next.js App, PostgreSQL 16, and Redis):

```bash
docker compose up -d --build
```

Access the application on port `3000`. Database is automatically managed on port `5435`.
