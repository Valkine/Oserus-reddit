# OSERUS MANAGEMENT — MASTER ARCHITECTURE & DESIGN SPECIFICATION (DESIGN.md)
*The definitive product, architectural, and aesthetic blueprint for Oserus Management.*
*Target Audience: AI Engineering Agents, System Architects, and Human Operators.*
*Last Revision: 2026-09-21*

---

## 1. Product Identity & Purpose

### 1.1 What is Oserus Management?
**Oserus Management** is an all-in-one desktop workstation purpose-built for OnlyFans, Fansly, and Fanvue management agencies. 

Prior to Oserus, agency owners were forced to juggle 4–6 disconnected software products:
1. **AdsPower / Multilogin**: For browser profile and proxy isolation across social media accounts.
2. **Infloww / Supercreator**: For chatter CRM, multi-model OnlyFans messaging, and fan tracking.
3. **Google Sheets / Excel**: For calculating chatter shift schedules across US and Philippine timezones.
4. **Custom Python / Puppeteer bots**: For Reddit and Twitter warm-ups and automated posting.
5. **Stripe / Billing spreadsheets**: For tracking monthly agency software costs based on agency revenue.

Oserus unifies all of these into a single, high-craft desktop application built with **Electron + React (Vite) + SQLite (better-sqlite3) + Supabase Sync**.

---

## 2. User Complaints & Aesthetic Philosophy (Human vs "Robotic" Design)

### 2.1 The Specific User Complaints That Prompted This Architecture
When reviewing older iterations of the software, the agency owner had explicit, visceral feedback:
1. **"The Model page is sloppy and cluttered as hell."**
   - *Problem*: In older builds, every single model card had an embedded manager select dropdown, an "Add team member" select + role dropdown + button, a list of team members with individual dropdowns, a main email input, and a proxy dropdown. Each card was 600px tall and overwhelmed the operator.
   - *Solution*: **Strict Card Diet**. All editing and team assignments were stripped from the card face and moved into a clean `⚙ Edit Model` modal. The card face only shows vital metadata, team avatar chips, proxy badges, and a 1-click launch button.
2. **"Why are there 5 giant dashed empty boxes stacked on top of each other?"**
   - *Problem*: On `ModelDetail.jsx`, if a model didn't have X, RedGIFs, Instagram, TikTok, or OnlyFans connected, the UI rendered 5 massive empty dashed dropboxes that required 800px of scrolling.
   - *Solution*: Replaced by a unified accounts table with **Platform Filter Pills** (`[ All Accounts (3) ]` `[ Reddit (2) ]` `[ X (1) ]` `[ + Add Account ]`) and a single clean empty state.
3. **"Remove the ability to only open one account. The model profile is the browser."**
   - *Problem*: Having `[ ▶ Open Browser ]` buttons on individual Reddit, X, and Instagram accounts broke the core antidetect paradigm. In AdsPower, you launch the *browser profile*, not an individual tab.
   - *Solution*: Removed all individual account launch buttons. The **Model Profile** has a single hero master launch control (`[ ▶ Open Browser ]` / `[ ● RUNNING ]`).
4. **"Give teams its own page. Team does not belong in the Dashboard."**
   - *Problem*: The Dashboard previously had a full team roster table, live presence heartbeat rows, and user administration jammed underneath the stats.
   - *Solution*: Cleaned up the Dashboard to focus exclusively on **Executive Health & Gross Revenue**. Created a dedicated **Team Hub (`Team.jsx`)** with 4 tabs: Roster, Shifts, Custom Roles, and Licensing.
5. **"Dual-Timezone Scheduling: Workers shouldn't have to calculate timezone offsets."**
   - *Problem*: The agency owner is in US Eastern Time (`America/New_York`), but chatters and VAs are globally distributed (primarily the Philippines `Asia/Manila` UTC+8, Latin America, or Europe). Scheduling was a nightmare of missed shifts.
   - *Solution*: Built an automatic dual-timezone conversion engine. The Owner inputs in agency time (EST); workers automatically see their shift converted into their local detected time (PHT) with agency reference.

### 2.2 Aesthetic Guidelines for AI Agents: Avoiding the "Robotic" Trap
> [!CAUTION]
> **Do not make this application look like generic AI-generated bootstrap software.**
> Generic AI software looks either completely empty/sterile (white backgrounds with massive empty padding) or completely chaotic (50 unstyled forms on one page).
> 
> **Follow the Obsidian Agency Craft Principles**:
> - **Dark Obsidian Theme**: Deep charcoal backgrounds (`#0d0c0a`, `#141416`, `#1c1b1f`), crisp 1px borders (`rgba(255,255,255,0.08)`), and warm gold accents (`var(--gold)` / `#c8553d`).
> - **High Density with Breathing Room**: Agency operators manage 20–100 accounts. Use compact tables, badge chips, and avatar pills, but maintain clean margins.
> - **Visual Feedback**: Real-time status indicators (pulsing green dot for running browser instances, gold for active tasks, danger red for expired/banned).

---

## 3. The Two-Pillar Architecture

The software is strictly split into two operational engines:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                             OSERUS MANAGEMENT                              │
├─────────────────────────────────────┬──────────────────────────────────────┤
│    PILLAR 1: TRAFFIC & ANTIDETECT   │    PILLAR 2: INBOX & MONETIZATION    │
│    (AdsPower-Style Browser Engine)  │    (Infloww-Style Account Manager)   │
├─────────────────────────────────────┼──────────────────────────────────────┤
│ • Reddit, X, Instagram, TikTok      │ • OnlyFans, Fansly, Fanvue           │
│ • CloakBrowser antidetect sandbox   │ • High-speed Chatter CRM & Inbox     │
│ • Hardware & fingerprint isolation  │ • Smart Folders (VIPs, High Tippers) │
│ • Model-level proxy inheritance     │ • MTD Gross & Net Revenue Tracking   │
│ • 1-Click Master Profile Launch     │ • Multi-model quick switcher         │
│ • Top-of-funnel traffic generation  │ • Fan profile & PPV vault drawer     │
└─────────────────────────────────────┴──────────────────────────────────────┘
```

### 3.1 Pillar 1: Traffic & Antidetect Engine
- **Target Platforms**: Reddit, X (Twitter), Instagram, TikTok, RedGIFs.
- **Engine**: CloakBrowser / CloakManager CDP orchestrator (`src/main/cdp/`).
- **Core Principle**: Each Model Profile is an isolated browser partition with its own user data directory, hardware profile, and proxy.
- **Fingerprint Protection**: Spoofs canvas, WebGL noise, audio context, storage quota (150GB), GPU vendor/renderer, and enforces WebRTC UDP leak disablement.
- **Credential Autofill**: On model launch, accounts under that model automatically have their login credentials securely decrypted from the OS keychain (`credential_vault`) and filled into the login pages.

### 3.2 Pillar 2: Inbox & Monetization Engine
- **Target Platforms**: OnlyFans, Fansly, Fanvue.
- **Engine**: Native Chatter CRM (`src/renderer/pages/Inbox.jsx`) + Platform Integration APIs (`src/main/ipc/license.js`).
- **Core Principle**: Social accounts generate traffic; subscription platforms monetize that traffic. Chatters need a high-speed workspace to message paying fans without opening 10 heavy browser windows.
- **Infloww-Style Features**:
  1. *Model Quick Switcher*: Chatters easily swap between their assigned models.
  2. *Smart Folders*: `All Chats`, `⭐ VIP Spenders ($500+)`, `🔥 High Tippers`, `💬 Unreplied / Waiting`, `🆕 New Subscribers`.
  3. *Fan Profiles*: Detailed subscriber stats, total spend, tip history, and custom chatter notes.
  4. *Canned Script Sets*: Standardized message sequences, pricing presets, and media vault steps.

---

## 4. Earnings-Scaled Monthly Subscription & Licensing

### 4.1 Concept: Revenue-Scaled Agency Pricing
Rather than penalizing growing agencies with per-seat licenses (which discourages hiring chatters), Oserus uses an **Earnings-Scaled Monthly License**. The license fee scales with the agency's gross monthly earnings tracked across connected platforms (OnlyFans, Fansly, Fanvue).

### 4.2 Tier Structure
| Tier Key | Tier Display Name | Monthly Earnings Cap | Target Agency Size |
|---|---|---|---|
| `starter` | **Starter Agency** | \$10,000 / month | 1–2 Models, boutique solo agency |
| `growth` | **Growth Agency** | \$50,000 / month | 3–8 Models, growing team |
| `scale` | **Scale Agency** | \$100,000 / month | 8–20 Models, full chatter roster |
| `enterprise`| **Enterprise Agency** | Unlimited revenue | Large agency conglomerate |

### 4.3 License Database Schema (`app_license`)
```sql
CREATE TABLE IF NOT EXISTS app_license (
  id INTEGER PRIMARY KEY DEFAULT 1,
  license_key TEXT NOT NULL,
  owner_email TEXT,
  tier TEXT NOT NULL DEFAULT 'growth',
  tier_name TEXT NOT NULL DEFAULT 'Growth Agency ($50,000/mo cap)',
  monthly_earnings_cap REAL NOT NULL DEFAULT 50000.0,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'expired' | 'capped'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 4.4 Executive Dashboard Meter
The agency owner has immediate visibility on the executive Dashboard (`Dashboard.jsx`):
- **MTD Gross Earnings**: Live total formatted as `$34,250.00`.
- **License Status**: `[ 🔑 Growth Agency: Active ]`.
- **Cap Progress Bar**: Visual bar showing percentage of tier cap used (e.g. `68.5% of $50,000 cap · 24 days left in cycle`).
- **Platform Breakdown**: OnlyFans, Fansly, and Fanvue earnings pills.

---

## 5. Strict Role & Model Isolation Policy

### 5.1 The Root Owner (License Buyer)
- **Role Key**: `owner`.
- The person who purchased and entered the monthly license key is automatically the root `owner`.
- **Exclusive Powers**:
  1. Only the Owner (or Admin) can create, edit, or delete Model Profiles (`requireOwnerOrAdmin`).
  2. Only the Owner can assign proxies and assign team members to models.
  3. Only the Owner can create custom roles and modify permissions (`roles:create`, `roles:update`).
  4. Only the Owner can view overall agency financial metrics and activate new license keys.

### 5.2 Employees / Staff (Chatters, Posters, VAs): Strict Isolation
> [!IMPORTANT]
> **Employees must NEVER see models they are not explicitly assigned to.**
> - If employee `Sarah` is assigned to `Model Luna`, Sarah's workstation strictly displays `Model Luna`.
> - Sarah cannot see `Model Chloe`, `Model Mia`, or any other agency models in `Profiles.jsx`, `Inbox.jsx`, `Scheduler.jsx`, or the Dashboard.
> - This is enforced at the database query level via `src/main/lib/assignments.js`:
>   ```sql
>   WHERE p.assigned_user_id = ? OR EXISTS (
>     SELECT 1 FROM profile_assignments pa WHERE pa.profile_id = p.id AND pa.user_id = ?
>   )
>   ```
> - Non-owner employees do not see total agency earnings, billing, or unassigned accounts.

---

## 6. Dual-Timezone Shift Scheduling Engine

### 6.1 Real-World Agency Challenge
Agencies run 24/7 chatter rotations. The owner typically resides in the US or Europe, while chatters are in the Philippines (`UTC+8`) or Latin America. Converting "10:00 PM EST to Manila time" resulted in frequent schedule mix-ups and missed coverage.

### 6.2 The Dual-Timezone Solution
- **Database Table (`shifts`)**:
  ```sql
  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT,
    profile_id INTEGER REFERENCES model_profiles(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL, -- 'HH:MM' (24-hour e.g. '09:00')
    end_time TEXT NOT NULL,   -- 'HH:MM' (24-hour e.g. '17:00')
    owner_timezone TEXT NOT NULL DEFAULT 'America/New_York',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  ```
- **Conversion Flow**:
  1. Owner schedules in agency timezone (`America/New_York`): e.g. `Mon 09:00 – 17:00`.
  2. System detects worker's client timezone: e.g. `Asia/Manila`.
  3. UI displays both times side-by-side:
     - **Agency Time**: `09:00 – 17:00 EST`
     - **Worker Local Time**: `21:00 – 05:00 (+1 day) PHT`
  4. Both owner and worker have complete clarity with zero manual math.

---

## 7. Model System & UI Cleanliness (The AdsPower Model)

### 7.1 Models Overview Page (`src/renderer/pages/Profiles.jsx`)
- **View Modes**:
  - `⊞ Grid View`: Clean, compact cards (~200px tall). Shows colored avatar circle, Model Name, Niche pill, CloakManager/Electron pill, Running indicator, Accounts count, Proxy badge, Assigned team avatars, and master `[ ▶ Open Browser ]` button.
  - `☰ AdsPower Table View`: High-density spreadsheet table with columns: Model, Niche, Accounts, Model Proxy, Assigned Team, Status, and Actions (`[ ▶ Open Browser ]`, `Manage →`, `⚙ Edit`).
- **Dedicated Settings Modal**:
  - Clicking `⚙` opens a comprehensive modal to edit name, niche, proxy, main email, brand voice, and team assignments.

### 7.2 Model Detail Page (`src/renderer/pages/ModelDetail.jsx`)
- **Unified Accounts Table**:
  - Single master accounts table filtered by platform pills (`All Accounts`, `Reddit`, `X`, `Instagram`, `TikTok`, `OnlyFans`, `Fansly`, `Fanvue`).
  - No empty dashed boxes.
  - One hero launch button at the top (`[ ▶ Launch Model Browser ]`).

---

## 8. Complete Codebase Map & File Guide

Any AI working on this repository must know the exact location of each module:

```
src/
├── main/
│   ├── index.js                  # Main process lifecycle, IPC bootstrapping, anti-leak network switches
│   ├── db.js                     # SQLite schema, migrations, platforms seed, credential encryption
│   ├── permissions.js            # RBAC permission check helpers (hasPermission, requirePermission)
│   ├── lib/
│   │   └── assignments.js        # Strict model scoping helper (profileScopeClause, canAccessProfile)
│   └── ipc/
│       ├── auth.js               # Login, session persistence, heartbeat, presence, requireOwnerOrAdmin
│       ├── profiles.js           # Model CRUD, team member assignments (owner-gated, scoped)
│       ├── accounts.js           # Account management (strictly scoped to assigned models for workers)
│       ├── roles.js              # Custom roles and permissions CRUD (owner-gated)
│       ├── shifts.js             # Dual-timezone shift scheduling CRUD
│       ├── license.js            # Earnings-scaled monthly licensing & creator platform earnings
│       ├── platforms.js          # Platform definitions (Reddit, X, IG, TikTok, OnlyFans, Fansly, Fanvue)
│       ├── cloakmanager.js       # Antidetect browser client and profile synchronization
│       └── team.js               # Supabase cloud team sync and invitations
├── preload/
│   └── index.js                  # Exposes window.api (profiles, accounts, license, shifts, team, auth)
├── shared/
│   └── permissions.js            # Unified list of 30+ permissions and built-in roles
└── renderer/
    └── pages/
        ├── Dashboard.jsx         # Executive metrics, gross revenue counter, active model workstations
        ├── Profiles.jsx          # AdsPower-style models overview (Grid & Table views, Settings modal)
        ├── ModelDetail.jsx       # Tabbed accounts table, hero launch button, credential management
        ├── Team.jsx              # Dedicated 4-tab Team Hub (Roster, Shifts, Custom Roles, License)
        ├── Settings.jsx          # Creator Platforms (OnlyFans/Fansly/Fanvue), AI keys, and proxies
        └── Inbox.jsx             # Infloww-style chatter CRM with multi-model quick switcher
```

---

## 9. Rules of Engagement for Future AI Agents

When modifying this repository in future iterations, you **MUST adhere to the following rules**:

1. **Do NOT re-introduce individual account launch buttons on model cards.**
   The Model Profile is the browser sandbox. Accounts run together inside the model's browser instance.
2. **Do NOT put administrative forms inside model card faces.**
   Keep card faces compact and clean. Use dedicated modals for editing settings or adding members.
3. **Never bypass employee model isolation.**
   Any IPC handler listing models, accounts, or shifts must use `profileScopeClause(user)` or verify that `user.role === 'owner' || user.role === 'admin'`. Non-owners must never see other models.
4. **Preserve the dark obsidian aesthetic.**
   Do not switch to bright white themes or unstyled default HTML elements. Match the tokens in `global.css`.
5. **Always verify compilation before reporting done.**
   - Run `npm run build:renderer` to ensure React/Vite builds without syntax errors.
   - Run `node -c` on all modified `src/main/` files to ensure zero syntax breaks.
