# OSERUS MANAGEMENT — MASTER ARCHITECTURE & DESIGN SPECIFICATION (DESIGN.md)
*The definitive product, architectural, operational, and aesthetic blueprint for Oserus Management.*  
*Target Audience: AI Engineering Agents, System Architects, Full-Stack Developers, and Human Operators.*  
*Current System Version: v0.86.18+ · Last Updated: September 2026*

---

## 1. Executive Summary & Product Vision

### 1.1 What is Oserus Management?
**Oserus Management** is an all-in-one desktop workstation engineered specifically for OnlyFans, Fansly, and Fanvue creator management agencies. 

Running a 7-to-8 figure creator agency requires coordinating two distinct worlds:
1. **Traffic Generation (Top of Funnel)**: Running dozens of accounts across Reddit, X (Twitter), Instagram, and TikTok to funnel prospective fans. This requires industrial-strength browser antidetect isolation, unique fingerprints, and dedicated residential proxies so social platforms do not link and ban the accounts.
2. **Monetization & CRM (Bottom of Funnel)**: Messaging paying fans 24/7 on OnlyFans, Fansly, and Fanvue to sell pay-per-view (PPV) content, collect tips, and maintain relationships. This requires high-speed multi-model chatting, fan spend tracking, and structured shifts for global chatters.

Prior to Oserus, agency owners were forced to stitch together 4–6 separate software tools:
- **AdsPower / Multilogin**: For browser isolation and proxy management ($100–$500/mo).
- **Infloww / Supercreator**: For chatter CRM and OnlyFans messaging ($200–$1,000/mo).
- **Google Sheets / Notion**: For tracking chatter shift schedules across US and Philippine timezones.
- **Custom Python / Puppeteer scripts**: For Reddit and Twitter warm-ups, upvotes, and posting.
- **Billing Spreadsheets**: For calculating monthly earnings and software seat costs.

**Oserus unifies this entire workflow into a single, cohesive desktop app** built on:
- **Electron 32 + Node.js 22** (Desktop shell, OS security, native process isolation).
- **React 18 + Vite** (High-speed single page workstation).
- **Better-SQLite3 in WAL mode** (Instant local queries, zero network lag).
- **Supabase Postgres + Realtime** (Multi-machine team synchronization and remote presence).
- **CloakBrowser / Playwright CDP** (Anti-detect browser automation and fingerprint spoofing).

---

## 2. The User Complaints & The Anti-Robot Aesthetic Philosophy

### 2.1 The Specific User Complaints That Drove This Architecture
Every architectural and UI decision in this specification originates from direct operator feedback. Any AI modifying this codebase must understand the pain behind each rule:

1. **"The Model page is sloppy, cluttered, and overwhelming."**
   - *The Old Mistake*: Previous builds dumped administrative controls directly onto every model card: a Primary Manager dropdown, an "Add Member" dropdown + role selector + submit button, a list of team members with individual role dropdowns, a main email text input, and a proxy dropdown. Each card was 600px tall and turning the page into an unusable wall of inputs.
   - *The Fix*: **Strict Card Diet**. All configuration was moved into a clean, dedicated `⚙ Edit Model` modal. The model card face was trimmed down to ~200px: avatar, model name, niche pill, platform account badges, proxy tag, team avatar pills, and a 1-click hero launch button.
2. **"Why are there 5 giant dashed empty boxes stacked on top of each other?"**
   - *The Old Mistake*: On `ModelDetail.jsx`, if a model didn't have RedGIFs, X, Instagram, TikTok, or OnlyFans connected, the UI rendered five giant empty dashed dropboxes requiring 800px of scrolling.
   - *The Fix*: Replaced by a unified **Accounts Table** with **Platform Filter Pills** (`[ All Accounts (4) ]` `[ Reddit (2) ]` `[ X (1) ]` `[ OnlyFans (1) ]` `[ + Add Account ]`) and a single clean empty state.
3. **"Remove the ability to only open one account. The model profile is the browser."**
   - *The Old Mistake*: Having `[ ▶ Open Browser ]` buttons on individual Reddit, X, and Instagram account rows broke the antidetect paradigm. In AdsPower, you do not launch single tabs; you launch the *isolated browser profile* containing that model's ecosystem.
   - *The Fix*: Removed individual account launch buttons. The Model Profile is the single browser execution unit with one prominent master launch button (`[ ▶ Open Browser ]` / `[ ● RUNNING ]`).
4. **"Give teams its own page. Team does not belong in the Dashboard."**
   - *The Old Mistake*: The executive dashboard was cluttered with user roster tables, presence heartbeat rows, and role assignments.
   - *The Fix*: Cleaned up the Dashboard to focus exclusively on **Executive Health & Gross Revenue**. Created a dedicated **Team Hub (`Team.jsx`)** featuring 4 tabs: *Roster & Assignments*, *Shift Schedule*, *Custom Roles*, and *License & Monetization*.
5. **"Dual-Timezone Scheduling: Workers shouldn't have to calculate timezone offsets."**
   - *The Old Mistake*: Agency owners in New York (EST) scheduled shifts like "9 AM - 5 PM". Global chatters in Manila (PHT, UTC+8) had to manually convert times, leading to missed shifts and unstaffed accounts.
   - *The Fix*: Built an automatic dual-timezone engine. The Owner inputs shifts in Agency Time (e.g. EST); workers automatically see shifts converted to their local detected timezone (e.g. PHT) with the agency time displayed alongside for reference.
6. **"Earnings-scaled monthly keys instead of per-seat billing."**
   - *The Old Mistake*: Charging per user seat discourages agencies from hiring more chatters and VAs.
   - *The Fix*: Implemented a monthly license key model scaled by **Month-To-Date (MTD) Gross Earnings** across connected OnlyFans, Fansly, and Fanvue accounts.

---

### 2.2 Aesthetic Guidelines for AI Agents: Avoiding the "Robotic" Trap
> [!CAUTION]
> **DO NOT MAKE THIS APPLICATION LOOK LIKE GENERIC AI-GENERATED BOOTSTRAP SOFTWARE.**  
> Generic AI UI is recognizable from a mile away: sterile white backgrounds, massive useless padding, unstyled browser select dropdowns, low data density, and generic blue buttons. Agency operators live in this software for 10+ hours a day—it must feel like a precision trading terminal or Bloomberg workstation.

#### The Obsidian Agency Craft Rules:
1. **Dark Obsidian Canvas**:
   - Use the design tokens in `src/renderer/styles/global.css`:
     - Base Canvas: `--bg-0: #07090a`
     - Card / Table Surface: `--bg-1: #0c100f`
     - Input / Hover Surface: `--bg-2: #121815`
     - Border Lines: `--border: #1c241f` (crisp, subtle 1px borders)
     - Primary Accent: `--gold: #d4a64a` (warm, executive gold for highlights and selected states)
     - Secondary Accent: `--blue-bright: #6aa6c4` (calm slate blue for everyday actions)
     - Active / Online Accent: `--green-bright: #4f8a64`
2. **High Data Density with Intentional Breathing Room**:
   - Operators manage 20–100 accounts. Tables should have compact row heights (`36px` to `44px`), clear column headers, and monospace font for dates, times, and financial numbers (`font-variant-numeric: tabular-nums`).
3. **Pill Badges over Giant Text**:
   - Use compact pill badges for status: `[ ● Active ]`, `[ 🔑 Growth Tier ]`, `[ 🌐 US Proxy ]`.
4. **Live Visual Telemetry**:
   - When a browser instance is running, display a pulsing green dot (`animation: pulse 2s infinite`). When a proxy is failing, show a crisp warning badge.
5. **No Form Sprawl on Cards**:
   - Never embed multi-field forms on index cards. Cards are for *monitoring and triggering action*. Configuration belongs in modals, slide-overs, or dedicated detail tabs.

---

## 3. The Two-Pillar Architecture

The workstation is divided into two distinct operational pillars:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   OSERUS MANAGEMENT                                    │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│       PILLAR 1: TRAFFIC & ANTIDETECT      │       PILLAR 2: INBOX & MONETIZATION       │
│      (The AdsPower Browser Engine)        │      (The Infloww Account Manager CRM)     │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • Social Platforms: Reddit, X, IG, TikTok │ • Creator Platforms: OnlyFans, Fansly,     │
│ • Model Profile = Browser Sandbox Unit    │   Fanvue                                   │
│ • CloakManager CDP Fingerprint Spoofing   │ • Real-Time Chatter Messaging CRM          │
│ • Canvas / WebGL / Audio Noise Injection  │ • Smart Folders (VIPs, High Tippers)       │
│ • Dedicated Model-Level Residential Proxy │ • PPV Vault & Canned Script Sequences      │
│ • Hardware & Partition Isolation          │ • MTD Gross & Net Revenue Metering         │
│ • Automatic Credential Autofill on Launch │ • Multi-Model Quick Switcher               │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 4. Pillar 1: Traffic & Antidetect Browser (The AdsPower Paradigm)

### 4.1 The Core Browser Principle
In Oserus, the **Model Profile** (`model_profiles`) is the browser sandbox. 
- You do **not** launch an individual Reddit account or an individual Twitter account in a standalone window.
- When an operator clicks `[ ▶ Open Browser ]` on **Model Luna**, Oserus launches Luna's isolated browser instance (powered by CloakManager or Electron partition).
- Luna's browser profile loads:
  1. Her dedicated proxy (e.g. `user:pass@us-res.proxy.com:8000`).
  2. Her unique hardware fingerprint (screen resolution, OS, canvas hash, WebGL vendor, WebRTC leak blocks).
  3. Her saved cookies, local storage, and active sessions.
  4. Automatically opens her pinned tabs (Reddit, X, Instagram, TikTok).
  5. Decrypts her saved credentials from the local OS vault and auto-fills login forms.

### 4.2 Models Overview Interface (`src/renderer/pages/Profiles.jsx`)
The Models page provides two viewing modes toggled via a top toolbar control:
1. **⊞ Grid View**:
   - Clean, compact model cards (~200px tall).
   - Card displays: Colored avatar circle, Model Name, Niche tag, Accounts count pill, Assigned Proxy badge, Assigned Team avatar chips, Running state indicator, and the primary `[ ▶ Open Browser ]` button.
   - Action controls: `Manage →` (navigates to `ModelDetail.jsx`) and `⚙` (opens the `Edit Model Modal`).
2. **☰ AdsPower Table View**:
   - High-density spreadsheet table for power users managing 20+ models.
   - Columns:
     - **Model**: Avatar + Name + Niche.
     - **Accounts**: Platform icon badges showing connected accounts (Reddit, X, IG, etc.).
     - **Proxy**: IP:Port and country flag badge.
     - **Assigned Team**: Stacked avatar chips of assigned chatters/managers.
     - **Status**: `Ready` or `● Running`.
     - **Quick Actions**: `[ ▶ Open Browser ]`, `Manage`, `⚙ Edit`.

### 4.3 Clean Model Detail Interface (`src/renderer/pages/ModelDetail.jsx`)
- **Hero Control Header**: Displays Model name, niche, proxy badge, and the Master Browser Launch Button with real-time launch status feedback.
- **Unified Accounts Table**:
  - Replaces all previous stacked empty dashed boxes.
  - Filter pills: `[ All Accounts (5) ]` `[ Reddit (2) ]` `[ X (1) ]` `[ Instagram (1) ]` `[ OnlyFans (1) ]` `[ + Add Account ]`.
  - Table columns: Platform, Username / Handle, Account Status (`Active`, `Needs Relogin`), Proxy Override, Last Active, and Actions (`Edit`, `Remove`).
  - Single clean empty state if no accounts exist: *"No accounts linked yet. Click '+ Add Account' to link Reddit, X, Instagram, or OnlyFans."*

---

## 5. Pillar 2: Inbox & Monetization CRM (The Infloww Paradigm)

### 5.1 Overview & Purpose
While Pillar 1 drives top-of-funnel traffic from social media, Pillar 2 converts that traffic into revenue on creator platforms (OnlyFans, Fansly, Fanvue). Chatters need a dedicated, ultra-fast messaging workspace without the overhead of heavy browser windows.

### 5.2 Key CRM Capabilities (`src/renderer/pages/Inbox.jsx`)
1. **Multi-Model Quick Switcher**:
   - A vertical sidebar strip or top dropdown allowing chatters to seamlessly switch between their assigned models.
   - Unread message counters displayed per model badge.
2. **Smart Conversation Folders**:
   - `All Chats`: Unfiltered conversation stream.
   - `⭐ VIP Spenders ($500+)`: High-value subscribers requiring immediate response.
   - `🔥 High Tippers`: Fans who tipped within the last 72 hours.
   - `💬 Unreplied / Waiting`: Incoming messages awaiting chatter response.
   - `🆕 New Subscribers`: Welcome sequence targets.
   - `⚠️ Expiring Soon`: Re-billing / renewal discount targets.
3. **Fan Drawer & Telemetry**:
   - Clicking a conversation opens the right-hand Fan Profile drawer:
     - Total Spend (All-time gross).
     - Subscription status & rebill status.
     - Custom notes shared between day and night shift chatters (e.g., *"Prefers voice notes, likes cosplay, works in finance"*).
     - Tags: `[ Whale ]`, `[ Custom Buyer ]`, `[ High Discretion ]`.
4. **Canned Script Sets & Media Vault**:
   - One-click insertion of agency-approved script templates (`src/renderer/pages/Scripts.jsx`).
   - PPV price presets and media preview drawer.

---

## 6. Earnings-Scaled Monthly Licensing & Tier Architecture

### 6.1 Concept & Billing Mechanics
Agencies pay a monthly subscription key. Instead of charging per user seat, the license tier scales with the agency's **Month-to-Date (MTD) Gross Earnings** across OnlyFans, Fansly, and Fanvue:

| Tier Key | Display Name | Monthly Gross Cap | Target Agency Scale |
|---|---|---|---|
| `starter` | **Starter Agency** | \$10,000 / month | 1–2 Models, boutique solo agency |
| `growth` | **Growth Agency** | \$50,000 / month | 3–8 Models, growing team |
| `scale` | **Scale Agency** | \$100,000 / month | 8–20 Models, full chatter roster |
| `enterprise` | **Enterprise Agency** | Unlimited Gross | Large agency conglomerate |

### 6.2 License Validation & Expiration Logic
- Licenses have an explicit expiration date (`expires_at`, e.g. `2026-10-21T00:00:00Z`).
- The system checks both **Expiration Date** and **MTD Gross Revenue**:
  - If current date > `expires_at`: Status becomes `'expired'`. System locks background automation and prompts for key renewal.
  - If MTD Gross Revenue > `monthly_earnings_cap`: Status becomes `'capped'`. System displays an upgrade prompt (`Upgrade to Scale Tier`).
- IPC channel `license:get-status` returns:
  ```json
  {
    "status": "active",
    "tier": "growth",
    "tierName": "Growth Agency ($50,000/mo cap)",
    "monthlyCap": 50000.0,
    "grossEarnings": 34250.0,
    "netEarnings": 27400.0,
    "daysRemaining": 24,
    "capUsagePercent": 68.5,
    "expiresAt": "2026-10-21T00:00:00Z",
    "platformBreakdown": {
      "onlyfans": 26400.0,
      "fansly": 5850.0,
      "fanvue": 2000.0
    }
  }
  ```

### 6.3 Executive Dashboard Meter (`src/renderer/pages/Dashboard.jsx`)
The agency owner sees a prominent executive revenue strip at the top of the Dashboard:
- **MTD Gross Revenue**: Large formatted number (e.g. `$34,250.00`).
- **Tier Badge**: `[ 🔑 Growth Agency: Active ]`.
- **Interactive Cap Bar**: Visual bar showing percentage used (`68.5% of $50,000 cap · 24 days left in cycle`).
- **Platform Pills**: Individual pills for OnlyFans (`$26,400`), Fansly (`$5,850`), and Fanvue (`$2,000`).

---

## 7. Role-Based Access Control & Strict Model Isolation

### 7.1 The Root Owner (`role: 'owner'`)
The operator who purchased the monthly license key is automatically the root **Owner**.
- **Owner-Exclusive Powers**:
  1. Only the Owner (or designated Admin) can create, edit, or delete Model Profiles (`requireOwnerOrAdmin`).
  2. Only the Owner can assign proxies and assign team members to models.
  3. Only the Owner can create custom roles and modify permissions (`roles:create`, `roles:update`).
  4. Only the Owner can view overall agency financial metrics, gross revenue, and license keys.
  5. Only the Owner can create shift schedules.

### 7.2 Strict Employee Model Isolation
> [!IMPORTANT]
> **Employees (chatters, VAs, posters) must NEVER see models they are not explicitly assigned to.**
> - If employee `Sarah` is assigned to `Model Luna`, Sarah's workstation strictly displays `Model Luna`.
> - Sarah cannot see `Model Chloe`, `Model Mia`, or any other models in `Profiles.jsx`, `Inbox.jsx`, `Scheduler.jsx`, or the Dashboard.
> - This is strictly enforced at the SQLite query level via `src/main/lib/assignments.js`:
>   ```sql
>   WHERE p.assigned_user_id = ? OR EXISTS (
>     SELECT 1 FROM profile_assignments pa WHERE pa.profile_id = p.id AND pa.user_id = ?
>   )
>   ```
> - Non-owner employees cannot access financial dashboards, revenue numbers, or administrative settings.

---

## 8. Dual-Timezone Shift Scheduling Engine

### 8.1 The Agency Problem
Agency owners typically operate in US Eastern Time (`America/New_York`), Central European Time, or UK Time. Chatters are globally distributed—predominantly in the Philippines (`Asia/Manila`, UTC+8) or Latin America. Converting times manually causes confusion, missed shift handoffs, and neglected fans.

### 8.2 The Dual-Timezone Solution (`src/main/ipc/shifts.js` & `src/renderer/pages/Team.jsx`)
- **Database Schema**:
  ```sql
  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT,
    profile_id INTEGER REFERENCES model_profiles(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL, -- 'HH:MM' 24-hr format (e.g. '09:00')
    end_time TEXT NOT NULL,   -- 'HH:MM' 24-hr format (e.g. '17:00')
    owner_timezone TEXT NOT NULL DEFAULT 'America/New_York',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  ```
- **Conversion Flow**:
  1. The Owner inputs shifts in Agency Time: e.g. `Mon 09:00 - 17:00 EST` for `Model Luna`.
  2. The system queries the worker's detected timezone: e.g. `Asia/Manila`.
  3. The UI renders both times simultaneously:
     - **Agency Reference**: `09:00 - 17:00 EST`
     - **Worker Local Time**: `21:00 - 05:00 (+1 day) PHT`
  4. In the Team Hub `Shift Schedule` tab, the Owner can filter shifts by Model, Worker, or Day of the Week.

---

## 9. SQLite Database Schema Reference

All tables are defined and migrated in `src/main/db.js` using `better-sqlite3`:

```sql
-- 1. App License & Earnings
CREATE TABLE IF NOT EXISTS app_license (
  id INTEGER PRIMARY KEY DEFAULT 1,
  license_key TEXT NOT NULL,
  owner_email TEXT,
  tier TEXT NOT NULL DEFAULT 'growth',
  tier_name TEXT NOT NULL DEFAULT 'Growth Agency ($50,000/mo cap)',
  monthly_earnings_cap REAL NOT NULL DEFAULT 50000.0,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Creator Platform Connections (OnlyFans, Fansly, Fanvue)
CREATE TABLE IF NOT EXISTS platform_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL, -- 'onlyfans' | 'fansly' | 'fanvue'
  profile_id INTEGER REFERENCES model_profiles(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  api_key TEXT,
  session_token TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  connected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Platform Gross Earnings History
CREATE TABLE IF NOT EXISTS platform_earnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  profile_id INTEGER REFERENCES model_profiles(id) ON DELETE CASCADE,
  gross_amount REAL NOT NULL DEFAULT 0.0,
  net_amount REAL NOT NULL DEFAULT 0.0,
  currency TEXT NOT NULL DEFAULT 'USD',
  recorded_date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Shift Schedules (Dual-Timezone Engine)
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT,
  profile_id INTEGER REFERENCES model_profiles(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  owner_timezone TEXT NOT NULL DEFAULT 'America/New_York',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Model Profiles (The Browser Sandbox)
CREATE TABLE IF NOT EXISTS model_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT,
  name TEXT NOT NULL,
  niche TEXT,
  brand_voice TEXT,
  notes TEXT,
  main_email TEXT,
  proxy_id INTEGER REFERENCES proxies(id) ON DELETE SET NULL,
  assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  browser_mode TEXT NOT NULL DEFAULT 'cloakmanager', -- 'cloakmanager' | 'electron'
  cloak_profile_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Model Team Assignments (Many-to-Many)
CREATE TABLE IF NOT EXISTS profile_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES model_profiles(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'chatter',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(profile_id, user_id)
);

-- 7. Accounts (Social & Creator Accounts linked to a Model)
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT,
  platform_id TEXT NOT NULL REFERENCES platforms(id),
  profile_id INTEGER REFERENCES model_profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  proxy_id INTEGER REFERENCES proxies(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 10. IPC API Bridge Reference (`window.api`)

The renderer communicates exclusively with the Electron main process via preload-exposed IPC channels:

| Category | API Call | Arguments | Description |
|---|---|---|---|
| **Profiles** | `window.api.profiles.list()` | `none` | Lists models (strictly filtered to assigned models for non-owners) |
| | `window.api.profiles.create(data)` | `{ name, niche, proxy_id, ... }` | Creates new model (Owner/Admin only) |
| | `window.api.profiles.update(id, data)` | `id, { name, niche, ... }` | Updates model profile (Owner/Admin only) |
| | `window.api.profiles.delete(id)` | `id` | Deletes model profile (Owner/Admin only) |
| | `window.api.profiles.assignUser(pId, uId, role)` | `profileId, userId, role` | Assigns team member to model |
| | `window.api.profiles.removeUser(pId, uId)` | `profileId, userId` | Removes team member from model |
| **Browser** | `window.api.cloakmanager.launch(pId)` | `profileId` | Launches CloakManager browser for model |
| | `window.api.cloakmanager.status(pId)` | `profileId` | Checks if model browser is running |
| | `window.api.cloakmanager.stop(pId)` | `profileId` | Stops model browser |
| **Shifts** | `window.api.shifts.list(filters)` | `{ profile_id, user_id, day }` | Fetches shifts with dual-timezone converted times |
| | `window.api.shifts.create(data)` | `{ profile_id, user_id, start_time, ... }`| Creates new scheduled shift |
| | `window.api.shifts.delete(id)` | `id` | Removes scheduled shift |
| **License** | `window.api.license.getStatus()` | `none` | Returns MTD revenue, cap, tier, and days remaining |
| | `window.api.license.activate(key)` | `licenseKey` | Activates and verifies monthly license key |
| **Roles** | `window.api.roles.list()` | `none` | Lists all built-in and custom roles |
| | `window.api.roles.create(data)` | `{ name, label, permissions }` | Creates custom role (Owner only) |

---

## 11. Codebase Map & Directory Guide

```
Oserus-reddit/
├── .github/workflows/
│   └── release.yml               # Automated CI/CD: Builds NSIS installer and publishes releases
├── build/                        # App icons, CloakManager backend binaries, build scripts
├── src/
│   ├── main/
│   │   ├── index.js              # Main process entry: lifecycle, window creation, security flags
│   │   ├── db.js                 # SQLite migrations, schema definitions, safeStorage credential vault
│   │   ├── permissions.js         # RBAC helper functions (hasPermission, requireOwnerOrAdmin)
│   │   ├── lib/
│   │   │   └── assignments.js    # Strict model scoping (profileScopeClause, canAccessProfile)
│   │   ├── ipc/                  # Modular IPC handlers
│   │   │   ├── auth.js           # Authentication, session restore, user presence
│   │   │   ├── profiles.js       # Model CRUD and team assignments (owner-gated)
│   │   │   ├── accounts.js       # Accounts CRUD (scoped to assigned models)
│   │   │   ├── shifts.js         # Dual-timezone shift scheduling CRUD
│   │   │   ├── license.js        # Earnings-scaled licensing & platform connections
│   │   │   ├── roles.js          # Custom roles & permissions CRUD
│   │   │   ├── cloakmanager.js   # CloakManager CDP orchestrator & profile sync
│   │   │   └── platforms.js      # Platform registry (Reddit, X, IG, OnlyFans, Fansly, Fanvue)
│   │   └── cdp/                  # Playwright automation scripts and browser autofill
│   ├── preload/
│   │   └── index.js              # ContextBridge exposing window.api to renderer
│   ├── shared/
│   │   └── permissions.js        # Canonical list of 30+ permissions
│   └── renderer/
│       ├── styles/
│       │   └── global.css        # Master design tokens (--bg-0, --gold, --border, typography)
│       └── pages/
│           ├── Dashboard.jsx     # Executive revenue meter, active browsers, system health
│           ├── Profiles.jsx      # AdsPower-style models overview (Grid & Table views, Edit Modal)
│           ├── ModelDetail.jsx   # Unified tabbed accounts table, hero launch control
│           ├── Team.jsx          # Dedicated 4-tab Team Hub (Roster, Shifts, Custom Roles, License)
│           ├── Settings.jsx      # Creator platform connections, proxies, AI API keys
│           ├── Inbox.jsx         # Infloww-style chatter CRM with multi-model quick switcher
│           └── Scripts.jsx       # Reusable chatter script sets and PPV media vault
```

---

## 12. The 10 Commandments for Future AI Agents

Any AI agent continuing work on this codebase **must adhere to these ten rules**:

1. **NEVER re-introduce per-account launch buttons on model cards.**  
   The Model Profile is the browser sandbox. Accounts under that model run together inside the model's browser instance.
2. **NEVER put administrative forms inside model card faces.**  
   Keep card faces clean and compact. Use dedicated modals for editing settings or adding members.
3. **NEVER bypass employee model isolation.**  
   Any IPC handler listing models, accounts, or shifts must use `profileScopeClause(user)` or verify that `user.role === 'owner' || user.role === 'admin'`. Non-owners must never see other models.
4. **NEVER show agency financial earnings to non-owner staff.**  
   MTD Gross Revenue and license tiers are strictly for the Owner and Admin.
5. **NEVER force workers to calculate timezone offsets.**  
   Always display shift times in both Agency Standard Time and the worker's local detected timezone.
6. **PRESERVE the Dark Obsidian agency craft aesthetic.**  
   Do not switch to bright white themes or unstyled default HTML elements. Match the tokens in `global.css`.
7. **DO NOT introduce 5 empty dashed dropboxes when accounts are missing.**  
   Use a unified accounts table with platform filter tabs and a single empty state.
8. **DO NOT break SQLite foreign key constraints.**  
   Always maintain cascading deletes on `shifts`, `platform_connections`, and `profile_assignments`.
9. **ALWAYS test compilation before reporting completion.**  
   Run `npm run build:renderer` to verify Vite React syntax and `node -c` on any modified `src/main/` files.
10. **ALWAYS push to `main` branch, not just git tags.**  
    When publishing updates to GitHub, ensure `git push origin main` is executed alongside release tags so the repository source code matches the deployed build.
