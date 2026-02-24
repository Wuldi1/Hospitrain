# Project README — Emergency Drill Manager (Hebrew / RTL)

> Web application for managing hospital emergency drills (פיקוד העורף).
> Frontend: **React** (web, mobile-responsive, Hebrew RTL)
> Backend: **Node.js + Express** (Web API)
> Database: **Azure Cosmos DB** (NoSQL)
> Hosting: **Azure Web App** (frontend + backend)
> Auth: **Email + code verification (one-time code)**

---

## Table of contents

1. Overview
2. Key features (baseline)
3. Quick start (local)
4. Architecture & folders
5. Data model (Cosmos) — baseline collections & sample documents
6. API Endpoints (baseline)
7. Frontend pages & UI notes (RTL / Hebrew)
8. Auth flow (email + code verification)
9. Azure deployment notes (WebApp + Cosmos)
10. Env vars & secrets
11. Development guidelines (GitHub Copilot, linting, testing)
12. Next steps & roadmap

---

## 1. Overview

This repository contains an MVP for a drill management system. The app is fully Hebrew (RTL) — UI, labels, placeholders, templates, and data are all expected to be Hebrew text.

Baseline functionality includes:

- Email + code login
- Home dashboard showing hospitals, recent drills, upcoming drills
- Drill creation wizard (pick hospital, date, profile/template, schedule)
- Drill management interface: tabs for Overview / Profile / Schedule / Participants / Reports
- Mobile-responsive UI with RTL support

---

## 2. Key features (baseline)

- Authentication: email -> send 6-digit code -> verify -> issue session (JWT)
- Master data: Hospitals, Drill Profiles (מתאר), Schedule Templates (סדרות)
- Drill lifecycle: create → manage → execute (timeline) → review → export PDF
- Roles: Admin, Inspector (מבקר), Trainee (מתאמן), Viewer
- Score model & statuses: `בוצע`, `לא בוצע`, `לא רלוונטי`, `קו אדום` (mapping defined in backend)
- Full Hebrew RTL UI

---

## 3. Quick start (local)

Prereqs:

- Node.js 22+ / npm or pnpm
- Azure CLI (optional for deploy)
- Local Cosmos emulator (optional) or real Cosmos account

Steps:

```bash
# clone
git clone <repo-url> emergency-drill-manager
cd emergency-drill-manager

# install root (monorepo-like layout optional)
cd backend
npm install

cd ../frontend
npm install

# create .env files per services (see Env section below)

# run backend
cd backend
npm run dev
# runs on http://localhost:4000 by default

# run frontend
cd frontend
npm start
# runs on http://localhost:3000 by default
```

---

## 4. Architecture & folders (suggested)

```
/ (repo root)
├─ backend/
│  ├─ src/
│  │  ├─ controllers/
│  │  ├─ routes/
│  │  ├─ services/
│  │  ├─ models/          # types / interfaces (jsdoc / typescript)
│  │  ├─ data/            # seed scripts
│  │  └─ index.js
│  ├─ package.json
│  └─ .env.example
├─ frontend/
│  ├─ public/
│  ├─ src/
│  │  ├─ pages/
│  │  │  ├─ Login/
│  │  │  ├─ Home/
│  │  │  ├─ DrillWizard/
│  │  │  ├─ DrillOverview/
│  │  │  └─ InspectorView/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ services/       # api client
│  │  ├─ i18n/
│  │  └─ index.js
│  ├─ package.json
│  └─ .env.example
├─ docs/
└─ README.md
```

Consider using TypeScript for both frontend and backend for stricter models.

---

## 5. Data model (Cosmos) — baseline

Use Cosmos DB (Core/SQL API). Suggested containers (collections):

1. **hospitals** (PK: /id)

```json
{
  "id": "hospital-rambam",
  "name": "רמב\"ם",
  "code": "RAM",
  "contact": { "phone": "...", "email": "..." },
  "region": "חיפה",
  "meta": {}
}
```

2. **templates** (drill profiles / מתאר) (PK: /id)

```json
{
  "id": "template-earthquake",
  "type": "מתאר",
  "title": "רעידת אדמה",
  "description": "...",
  "components": [
    {
      "id": "comp-1",
      "name": "בטיחות",
      "categories": [
        {
          "id": "cat-1",
          "name": "ציוד",
          "requirements": [
            { "id": "req-1", "text": "בדיקת גנרטור", "weight": 1 }
          ]
        }
      ]
    }
  ],
  "scheduleTemplate": "sched-1",
  "createdAt": "..."
}
```

3. **scheduleTemplates** (PK: /id)

```json
{
  "id": "sched-1",
  "title": "default-earthquake",
  "events": [
    {
      "id": "ev-1",
      "timeOffset": "00:00",
      "title": "תחילת תרגיל",
      "message": "..."
    },
    {
      "id": "ev-2",
      "timeOffset": "00:03",
      "title": "דיווח מחלקה",
      "message": "..."
    }
  ]
}
```

4. **drills** (PK: /id) — an instance created from templates

```json
{
  "id": "drill-2025-12-01-rambam",
  "hospitalId": "hospital-rambam",
  "title": "תרגיל רמב\"ם דצמ'25",
  "templates": ["template-earthquake"],
  "schedule": [{ "time": "2025-12-01T10:00:00+02:00", "text": "..." }],
  "status": "upcoming",
  "createdBy": "user-1",
  "participants": ["user-2", "user-3"],
  "createdAt": "..."
}
```

5. **requirementStatuses** (PK: /id) — store actions; high write rate OK for Cosmos

```json
{
  "id": "status-uuid",
  "drillId": "drill-xxx",
  "requirementId": "req-1",
  "inspectorId": "user-5",
  "status": "בוצע",
  "note": "...",
  "timestamp": "..."
}
```

6. **users** (PK: /id)

```json
{
  "id": "user-1",
  "email": "a@b",
  "name": "דני",
  "roles": ["admin"],
  "phone": "...",
  "prefs": { "locale": "he-IL" }
}
```

7. **auditLogs / events** for history and AI analysis:

- Keep append-only events for timeline changes, status updates.

Partitioning:

- Use `drillId` or `hospitalId` as partition key where high-cardinality is needed. For templates, `id` is OK.

---

## 6. API Endpoints (baseline)

Authentication:

- `POST /api/auth/request-code` — body: `{ email }` → generate 6-digit code + send email
- `POST /api/auth/verify-code` — body: `{ email, code }` → returns JWT

Users:

- `GET /api/users/me`
- `POST /api/users` (admin)

Hospitals:

- `GET /api/hospitals`
- `POST /api/hospitals` (admin)
- `GET /api/hospitals/:id`

Templates & schedules:

- `GET /api/templates`
- `POST /api/templates`
- `GET /api/schedule-templates`

Drills:

- `POST /api/drills` — create drill
- `GET /api/drills/:id`
- `PUT /api/drills/:id`
- `POST /api/drills/:id/schedule/:eventId/trigger` — admin can trigger/advance
- `GET /api/drills/:id/report` — export PDF

Statuses:

- `POST /api/drills/:id/requirements/:rid/status` — body: `{ status, note }`
- `GET /api/drills/:id/scores`

AI:

- `POST /api/ai/suggest-events` — body: `{ hospitalId, templateId, prompt }` → returns suggested events (must consider data residency)

---

## 7. Frontend pages & UI notes (RTL / Hebrew)

**Important**: The entire UI must be Hebrew and RTL. Design choices:

- Use a component library that supports RTL (MUI has RTL utilities) or Tailwind with `direction: rtl`.
- Set `<html dir="rtl" lang="he">` in `public/index.html`.
- CSS global: `body { direction: rtl; unicode-bidi: embed; }` — but prefer component-level control.
- Use `react-i18next` or simple localization JSONs (just Hebrew now).
- Right-align tables, icons to the left (mirror icons where needed).
- Inputs: placeholders and validation messages in Hebrew.
- Date/time display: Use `he-IL` locale and ISO date storage on backend.

Pages:

1. `/login` — email input (HE), code entry screen (6 digits)
2. `/home` — dashboard: hospitals list, last drills, upcoming drills, quick actions
3. `/templates` — manage drill profiles (מתאר)
4. `/drills/new` — wizard (hospital → date → profiles → schedule template → finalize)
5. `/drills/:id` — drill management with tabs:
   - Overview (summary, participants)
   - Profile (template, components)
   - Schedule (timeline, events)
   - Participants / Injured management
   - Review & Reports

6. `/inspector/:id` — inspector view filtered to their items

Accessibility:

- RTL + accessible color contrast
- Large buttons for mobile use
- Offline caching optional (PWA later)

---

## 8. Auth flow (email + code verification) — technical details

**Goal**: simple email-based login (no password). Steps:

1. User enters email on `/login`.
2. Frontend: `POST /api/auth/request-code { email }`.
3. Backend:
   - Generate secure random 6-digit numeric code (or 6 alnum).
   - Save hashed code & expiration (e.g., 10 minutes) in `authCodes` container keyed by `{ email }`.
   - Send the code by email. (Use SendGrid / Azure Communication Services / SMTP). **Logically ensure no PII leaks in logs.**

4. User receives code, enters it on UI.
5. Frontend: `POST /api/auth/verify-code { email, code }`.
6. Backend:
   - Verify code & expiry; if valid generate JWT (short expiry, refresh token if desired).
   - Create user record if not exists (role default: trainee or viewer as configured).

7. Frontend stores JWT (in memory or secure cookie). Use httpOnly cookie for production if possible.

Security:

- Rate-limit `request-code` by IP & email.
- Throttle verification attempts.
- Store only hashed verification codes.
- Use TLS everywhere.
- Consider Azure AD integration later for SSO.

---

## 9. Azure deployment notes

Minimal Azure resources:

- App Service (Linux) x2 or single with reverse-proxy:
  - frontend (React static build served by CDN / Static Web Apps) OR host React via storage + CDN
  - backend (Node.js Express) as Web App

- Cosmos DB (Core SQL)
- Key Vault (store API keys, SendGrid key)
- Application Insights (monitoring)
- Storage Account (for PDF blobs, attachments)
- (Optional) Azure Static Web Apps for the React app + Functions as backend

CI/CD:

- Use GitHub Actions for build & deploy.
- Steps:
  - Build frontend artifact
  - Build backend, run tests
  - Deploy frontend to Azure Static Web Apps or to Web App (deploy build)
  - Deploy backend to Azure Web App

Sample GitHub Actions skeleton (in `/.github/workflows/deploy.yml`) to build & deploy both.

---

## 10. Environment variables

Backend `.env` (example):

```
PORT=4000
JWT_SECRET=very-secret
JWT_EXPIRES_IN=1h
COSMOS_URI=https://...
COSMOS_KEY=...
COSMOS_DB=drills-db
SENDGRID_API_KEY=...
FROM_EMAIL=no-reply@tastematcher.art
FRONTEND_URL=http://localhost:3000
```

Frontend `.env`:

```
REACT_APP_API_URL=http://localhost:4000/api
REACT_APP_LOCALE=he-IL
```

**Never commit `.env` to git. Use Azure Key Vault for production.**

---

## 11. Development guidelines (GitHub Copilot, testing, lint)

- Use GitHub Copilot to scaffold components and tests — but always review output carefully.
- Use ESLint + Prettier (setup).
- Unit tests:
  - Backend: jest + supertest for endpoints
  - Frontend: react-testing-library

- API contract tests for critical flows (create drill, add status)
- Integration: local e2e with Playwright (simulate RTL UI)

Suggested npm scripts:

```json
"scripts": {
  "start": "node src/index.js",
  "dev": "nodemon src/index.js",
  "test": "jest --coverage",
  "lint": "eslint . --ext .js,.jsx,.ts,.tsx"
}
```

---

## 12. Next steps & roadmap

- MVP (Sprint 0–2): auth, hospitals list, templates upload, drill create wizard, drill overview, basic schedule timeline, inspector mobile view, status updates, PDF export.
- Sprint 3: AI suggestions endpoint (if permitted), analytics dashboard, repeats detection.
- Sprint 4: Advanced roles & permissions, audit logs & retention rules, hardened security & Azure compliance.

---

# Detailed Step-by-step Execution Plan — Baseline Implementation (very detailed)

Below is a developer-focused execution plan broken into concrete steps you or your team (using GitHub Copilot) can follow. Each step includes sub-tasks and acceptance criteria.

---

## Preliminaries (Before coding)

1. Create repository and basic structure (backend / frontend).
2. Initialize package.json, install core deps:
   - Backend: `express`, `cors`, `dotenv`, `jsonwebtoken`, `bcrypt` (if needed), `@azure/cosmos`, `nodemon` (dev), `jest`, `supertest`.
   - Frontend: `react`, `react-router-dom`, `axios`, `react-i18next` or `i18next`, MUI or Tailwind (with RTL support), `date-fns` with `he` locale.

3. Create `.env.example` files for both services.
4. Add ESLint & Prettier configs.
5. Setup GitHub Actions skeleton for CI.

**Acceptance**: repo created with folder skeletons and lint/test configs.

---

## Step 1 — Authentication (email + code)

**Goal**: Implement secure email-code login and session.

### Backend tasks

1. Create `POST /api/auth/request-code`
   - Validate email (basic regex).
   - Rate-limit (per IP/email).
   - Generate code: `const code = Math.floor(100000 + Math.random()*900000).toString()`.
   - Hash code with bcrypt or HMAC, save to container `authCodes` { email, codeHash, expiresAt }.
   - Send email (SendGrid / SMTP): include code and expiry (e.g., 10min).
   - Return 200.

2. Create `POST /api/auth/verify-code`
   - Accept `{ email, code }`.
   - Fetch `authCodes` for email; check expiry and bcrypt compare.
   - On success: create or fetch user in `users` container, create JWT (short expiry), clear authCode, return `{ token, user }`.

3. Create middleware `authMiddleware` to validate JWT.

4. Add tests for code generation + verification.

**Acceptance**:

- request-code returns 200 and triggers send.
- verify-code returns JWT and user record.
- Token protects other endpoints.

### Frontend tasks

1. Login page `/login`:
   - Form: email input (rtl, label in Hebrew).
   - On submit: call `POST /api/auth/request-code`.
   - Show "code sent" message.

2. Code verification page:
   - Input for 6 digits (UI friendly), submit to `/api/auth/verify-code`.
   - On success: store token (in memory or cookie) and redirect to `/home`.

3. Handle errors & loading states.
4. UI must be RTL and Hebrew.

**Acceptance**:

- User can login with email -> code -> be redirected to home.

---

## Step 2 — Master Data & Seeds

**Goal**: Seed hospitals and base templates.

1. Create seed script `backend/src/data/seed.js`:
   - Insert hospital list (provided) into `hospitals` container if not exists.
   - Insert initial templates (e.g., earthquake template from your excel).

2. Create endpoint `GET /api/hospitals` and `POST /api/hospitals` (admin).

**Acceptance**:

- `/api/hospitals` returns full list. Local dev has seeded list.

---

## Step 3 — Templates upload & parsing

**Goal**: Let admin upload Excel (or structured JSON) for templates and parse them into `templates` container.

1. Create file-upload endpoint `POST /api/templates/upload` (multer).
2. Use a parser (e.g., `exceljs`) to read sheets:
   - Map sheets → inspectors
   - Rows → requirements with hierarchy component → category → requirement

3. Normalize column names (handle `Unnamed` headers).
4. Store parsed object in `templates` container.

**Acceptance**:

- Admin can upload the Excel and see parsed preview of template in backend or admin UI.

---

## Step 4 — Drill creation wizard (frontend & backend)

**Goal**: Implement `Create Drill` wizard and store `drills` instance.

### Frontend (Wizard steps)

1. Step 1 — Choose hospital (dropdown).
2. Step 2 — Choose date & time, name the drill.
3. Step 3 — Choose drill profile (template) — list of templates with preview button.
4. Step 4 — Choose schedule template (or accept default from profile).
5. Step 5 — Review & Create (shows merged events & involved inspectors).
6. On submit: call `POST /api/drills`.

### Backend

- `POST /api/drills` receives `{ hospitalId, templateIds[], scheduleTemplateId, date, title }`.
- Backend:
  - Merge templates if multiple (concatenate inspectors/requirements; mark duplicates).
  - Create `drill` document with instantiated schedule (absolute times based on chosen date).
  - Return `201` with drill id and drill data.

**Acceptance**:

- Drill created and accessible at `/drills/:id`.

---

## Step 5 — Drill management UI (tabs)

**Goal**: Build drill management pages with tabs.

Tabs & responsibilities:

1. **Overview**: Summary cards (hospital, date, templates, status), quick actions (start drill, pause, export PDF)
2. **Profile**: Show template hierarchy (components → categories → requirements). Edit capability for admin.
3. **Schedule** (Timeline): Show events in chronological order; admin can:
   - Move event time (safely): `PUT /api/drills/:id/schedule/:eventId`
   - Shift whole timeline by X minutes: `PUT /api/drills/:id/schedule/shift`
   - Trigger event manually: `POST /api/drills/:id/schedule/:eventId/trigger`

4. **Inspectors / Participants**: List of assigned users (assign/unassign)
5. **Execution / Live View**: Read-only view for inspectors; each inspector sees only events where they are `receiver`.
6. **Review / Reports**: After action review, scores & export.

**Backend tasks**:

- CRUD endpoints for these resources.
- Implement rules for "shift schedule" and safe update (audit log).

**Acceptance**:

- Each tab renders data and calls backend; timeline manipulations persist and are auditable.

---

## Step 6 — Inspector mobile view & statuses

**Goal**: Provide lightweight inspector UI for marking requirement statuses.

1. Inspector UI shows list of pending items (events assigned to them).
2. For each requirement, options: `בוצע`, `לא בוצע`, `לא רלוונטי`, `קו אדום`.
3. On update: `POST /api/drills/:id/requirements/:rid/status` with comment & timestamp.
4. Backend writes to `requirementStatuses` and recalculates category/drill scores (async job or sync call).

**Acceptance**:

- Inspectors can mark statuses from mobile; changes reflect on Drill Overview scores.

---

## Step 7 — Scoring engine

**Goal**: Implement score calculation logic (simple/well-documented).

- Map statuses to numbers: `בוצע=1`, `לא בוצע=0`, `לא רלוונטי` ignored, `קו אדום` triggers a flag.
- Weighted average across requirements → category score → component score → drill score.
- If any `קו אדום` in critical category then drill status = `Fail` (configurable).

**Acceptance**:

- `/api/drills/:id/scores` returns computed results and explains calculation.

---

## Step 8 — PDF export & report

**Goal**: Export drill execution summary to PDF.

1. Implement server-side report generation (e.g., Puppeteer rendering an HTML template to PDF or use a PDF library).
2. `GET /api/drills/:id/report` returns PDF stream or URL (store in blob storage).
3. Ensure Hebrew fonts & RTL layout supported in PDF output.

**Acceptance**:

- PDF generated with RTL header, sections: overview, timeline, statuses, notes, scores.

---

## Step 9 — AI Suggestion hook (placeholder)

**Goal**: Add an endpoint for `suggest-events` that is safe & pluggable.

- `POST /api/ai/suggest-events { hospitalId, templateId, prompt }`.
- For now, implement a stub that returns suggestions based on historical events in DB (fallback).
- When allowed, plug-in Azure OpenAI or on-prem model — ensure data residency and approvals.

**Acceptance**:

- Endpoint returns suggestions (even if rule-based) and can be extended later.

---

## Step 10 — Localization & RTL polish

1. Ensure `index.html` has `<html dir="rtl" lang="he">`.
2. Global CSS sets `direction: rtl`.
3. Use `i18n` keys even for Hebrew only (future-proof).
4. Test on desktop & mobile for layout mirroring (icons, timestamps).
5. Ensure PDF generator respects RTL font embedding (use Alef or Noto Sans Hebrew).

**Acceptance**:

- UI is fully Hebrew, aligned correctly on RTL devices and PDF outputs are Hebrew readable.

---

## Step 11 — Testing & QA

- Unit tests for backend services (auth, drill creation, scoring).
- Integration tests for Wizard flow (API & UI).
- E2E tests for core flows: login, create drill, inspector marks status, export PDF.
- Accessibility checks (color contrast, tab order).

**Acceptance**:

- CI runs tests on PR and prevents merge on failed coverage threshold.

---

## Step 12 — Deployment & Monitoring

1. Create Azure resources (Cosmos, Web App, Storage, KeyVault).
2. Set up GitHub Actions to deploy on merge to `main`.
3. Configure Application Insights & alerts for errors or high failure rates.
4. Set up logging & retention policy (based on BLMS rules).

**Acceptance**:

- App deployed to Azure, env vars in KeyVault, monitoring & alerts functioning.

---

## Extra operational considerations

- **Data retention & purge**: define retention policy for drill data and logs.
- **Backup**: Cosmos backup schedule.
- **Security review**: Threat model & pentest before production.
- **Compliance**: confirm cloud usage rules with the relevant stakeholders.

---

# Acceptance Criteria for Baseline MVP

1. Email/code auth works and issues JWT.
2. Hospitals seeded and visible on Dashboard.
3. Admin can upload a template (Excel); app parses and saves it.
4. Wizard can create a drill and redirect to `drills/:id`.
5. Drill management page shows Overview, Profile & Schedule tabs.
6. Admin can shift event times; changes persist & are auditable.
7. Inspector can mark requirements statuses; scores update.
8. PDF export produces a valid Hebrew/RTL report.
9. App runs on both desktop and mobile (responsive).

---

## Helpful code snippets

### Generate 6-digit code (Node)

```js
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
```

### Example Express route to request code (simplified)

```js
app.post("/api/auth/request-code", async (req, res) => {
  const { email } = req.body;
  const code = generateCode();
  const hash = await bcrypt.hash(code, 10);
  // save { email, hash, expiresAt } to Cosmos
  await sendEmail(email, `הקוד שלך: ${code} (תוקף 10 דקות)`);
  res.json({ ok: true });
});
```

### Set HTML RTL (React)

```html
<!-- public/index.html -->
<html lang="he" dir="rtl">
  ...
</html>
```

In CSS:

```css
:root {
  --dir: rtl;
}
body {
  direction: rtl;
  unicode-bidi: embed;
  text-align: right;
}
```

---

## Final notes & tips for using GitHub Copilot

- Use Copilot to scaffold components, but **review** generated code for RTL & Hebrew correctness.
- Ask Copilot for unit tests & small snippets (e.g., "generate jest tests for /api/drills").
- Use Copilot in pair-programming style: propose a function comment and let it fill body; verify.

---

If you want, I can:

- Produce a ready-to-run **starter repo** scaffold (package.json, basic Express server, React app shell + login UI) — with Copilot-friendly comments and TODOs.
- Generate JSON seed data for hospitals and one parsed template extracted from your Excel example.
- Draft GitHub Actions workflow for CI/CD to Azure.

Which would you like me to produce next?
