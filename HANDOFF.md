# OSERUS MANAGEMENT — COMPLETE BOT-TO-BOT TECHNICAL HANDOFF & UI SHOWCASE (HANDOFF.md)

*The Definitive Technical Architecture, Feature Blueprint, and Visual UI Showcase for AI Agents and Systems Engineers.*  
*Current System Version: v0.86.21+ · Last Updated: September 2026*  
*Repository: Valkine/Oserus-reddit (mirrored from Gee2424/Oserus-reddit)*  
*Platform: Windows x64 (Electron 32 / Node 22 / Better-SQLite3 / React 18 / Playwright CDP)*

---

## Table of Contents
1. [Executive Summary & Agency Business Domain](#1-executive-summary--agency-business-domain)
2. [Core Behavioral & Architectural Invariants ("The Law of Oserus")](#2-core-behavioral--architectural-invariants)
3. [Complete Feature-by-Feature Blueprint](#3-complete-feature-by-feature-blueprint)
   - 3.1 [Executive Dashboard & Live Creator Sales Stream](#31-executive-dashboard--live-creator-sales-stream)
   - 3.2 [High-Density Models Directory](#32-high-density-models-directory)
   - 3.3 [Fast Model & Accounts Onboarding Wizard](#33-fast-model--accounts-onboarding-wizard)
   - 3.4 [Actionable Platforms Directory & 1-Click Presets](#34-actionable-platforms-directory--1-click-presets)
   - 3.5 [Infloww-Style Live Creator Inbox & Chatting CRM](#35-infloww-style-live-creator-inbox--chatting-crm)
   - 3.6 [Traffic Automation & CDP Playwright Automation](#36-traffic-automation--cdp-playwright-automation)
   - 3.7 [Scheduler Pro & Multi-Account Queue](#37-scheduler-pro--multi-account-queue)
   - 3.8 [Dual-Timezone Shift Scheduling Engine & Team Hub](#38-dual-timezone-shift-scheduling-engine--team-hub)
   - 3.9 [CloakManager Antidetect Engine & Network Security](#39-cloakmanager-antidetect-engine--network-security)
4. [Possible UI Showcase & High-Fidelity Wireframes](#4-possible-ui-showcase--high-fidelity-wireframes)
   - 4.1 [UI Showcase: Executive Dashboard](#41-ui-showcase-executive-dashboard)
   - 4.2 [UI Showcase: High-Density Models Directory](#42-ui-showcase-high-density-models-directory)
   - 4.3 [UI Showcase: Fast Model & Accounts Setup Wizard](#43-ui-showcase-fast-model--accounts-setup-wizard)
   - 4.4 [UI Showcase: Actionable Platforms & Presets](#44-ui-showcase-actionable-platforms--presets)
   - 4.5 [UI Showcase: Infloww-Style Live Inbox](#45-ui-showcase-infloww-style-live-inbox)
   - 4.6 [UI Showcase: Dual-Timezone Shift Schedule](#46-ui-showcase-dual-timezone-shift-schedule)
5. [Database Architecture & Security Pipeline](#5-database-architecture--security-pipeline)
6. [Complete IPC API Reference](#6-complete-ipc-api-reference)
7. [Operational Playbook for Future AI Agents](#7-operational-playbook-for-future-ai-agents)

---

## 1. Executive Summary & Agency Business Domain

**Oserus Management** is an enterprise-grade desktop workstation engineered specifically for 7-to-8 figure OnlyFans, Fansly, and Fanvue creator management agencies.

Managing high-earning models requires orchestrating two distinct operational pipelines:
1. **Traffic Generation (Top of Funnel):** Farming, warming, and posting across dozens of accounts on Reddit, X (Twitter), Instagram, and TikTok to route traffic to monetized pages. This requires strict anti-fingerprinting, canvas/WebGL spoofing, and dedicated residential/mobile proxies.
2. **Monetization & CRM (Bottom of Funnel):** Messaging paying fans 24/7 on OnlyFans, Fansly, and Fanvue to unlock Pay-Per-View (PPV) content, collect tips, and retain VIP subscribers. This requires an Infloww-style chatter inbox, fan spend tracking, and multi-timezone shift coordination.

Prior to Oserus, agency owners had to pay for 4–6 separate SaaS tools (Antidetect browser + Infloww + Notion + custom warm-up scripts + scheduling tools). **Oserus unifies this entire workflow into a single local-first desktop application.**

---

## 2. Core Behavioral & Architectural Invariants

Any AI bot or developer modifying this repository **MUST** respect these architectural rules:

### Invariant 1: 1 Model Profile = 1 Browser Sandbox
- Individual platform accounts (Reddit, X, Instagram, OnlyFans) are **NEVER launched in separate standalone windows**.
- Launching browser automation or antidetect browsing launches **at the Model Profile level**. All platform accounts belonging to that model run isolated within that single browser environment.

### Invariant 2: Strict Launch Guard (No 0-Account Launches)
- A model browser session **MUST NEVER launch if the model has 0 designated accounts**.
- Both the frontend (`Profiles.jsx`, `Dashboard.jsx`) and backend (`src/main/index.js`) enforce this rule.
- Cookie warmers must never visit arbitrary sites (e.g. YouTube has been strictly removed).

### Invariant 3: Strict Employee Model Isolation
- Any non-owner/non-admin user (e.g., chatters, VAs, marketing coordinators) **MUST ONLY see model profiles and platform accounts explicitly assigned to them**.
- All IPC queries enforce `profileScopeClause(user)` in SQLite. Unassigned workers see zero profiles.

### Invariant 4: Absolute Zero Competitor Trademark Mentions
- Never name competitor products (e.g. "AdsPower", "Multilogin", "Dolphin") in UI labels, documentation, or code.
- Always name views descriptively: **"High-Density Models Table"** or **"Agency Directory"**.

### Invariant 5: The "Anti-Big-Bar" Design Philosophy
- Never render thick, gaudy 8px-12px progress bars.
- Progress and revenue tracking must use sleek **3px blended obsidian micro-tracks** with soft gold-to-emerald illumination that blend into the card face.

### Invariant 6: Atomic Onboarding (`profiles:createWithAccounts`)
- Deprecate creating "empty" model profiles.
- When creating a model, both the model profile, the CloakManager antidetect profile, and the designated platform accounts are committed in a single SQLite transaction with vault-encrypted passwords.

---

## 3. Complete Feature-by-Feature Blueprint

### 3.1 Executive Dashboard & Live Creator Sales Stream (`Dashboard.jsx`)
- **Real-Time Revenue Telemetry:** Displays Month-To-Date (MTD) Gross Earnings, Net Platform Commissions, and active license tier.
- **Dynamic Earning-Scaled License Model:**
  - Standard agency tiers scale with actual gross creator revenue:
    - Tier 1: Under \$10k/mo (\$99/mo)
    - Tier 2: \$10k–\$30k/mo (\$179/mo)
    - Tier 3: \$30k–\$60k/mo (\$250/mo)
    - Tier 4: \$60k–\$100k/mo (\$350/mo)
    - Tier 5: \$100k–\$250k/mo (\$500/mo)
  - **Over \$250k/mo:** Uncapped 1.0% volume scaling (`$500 + 1.0% * (Revenue - $250,000)`).
- **Sleek 3px Blended Micro-Meter:** Seamless progress bar with amber-to-emerald gradient indicating progress toward the \$250k cap.
- **Creator Sales Stream:**
  - Filter pills: `All Sales`, `Tips` (💚), `Chatting Sales` (PPV unlocks 💙), `Pay Sales` (custom requests 💜).
  - Shows platform badge (OnlyFans 🔞, Fansly 💙, Fanvue ✨), model name, fan handle, transaction amount (`+$120.00`), and relative timestamp.

### 3.2 High-Density Models Directory (`Profiles.jsx`)
- **Single Master Table:** High-density spreadsheet-style table with zero lag.
- **Columns:** Model Name & Avatar, Niche/Category, Accounts Pill Badges, Model Dedicated Proxy, Assigned Team Members, Status Indicator, and Row Action Buttons.
- **Row Actions:**
  - `[ ▶ Open Browser ]`: Launches the isolated model antidetect environment. Disabled with tooltip if `account_count === 0`.
  - `[ Manage → ]`: Direct jump to ModelDetail for deep account and credential management.
  - `[ ✏ Edit ]`: Opens the Model Settings Modal (Proxy, Manager, Avatar Color, Brand Voice, Worker Assignments).
  - `[ 🗑 Delete ]`: Direct deletion with confirmation modal.
- **CloakManager Engine Health Pill:** Live status of the local CDP binary (`Engine Online` / `Engine Unavailable` with retry trigger).

### 3.3 Fast Model & Accounts Onboarding Wizard (`Profiles.jsx`)
- **Dual-Mode Setup Drawer:**
  - **🪄 Guided Mode:**
    - Model Name, Niche, Primary Manager, Model Dedicated Proxy, Browser Engine (`CloakManager` vs `Electron Standard`).
    - Designated Platform Accounts Grid with 1-click quick-add buttons: `+OnlyFans`, `+Fansly`, `+Fanvue`, `+Reddit`, `+X`, `+IG`, `+TikTok`.
    - Inline username and password fields (passwords automatically stored in DPAPI encrypted vault).
  - **📋 Bulk Paste Mode:**
    - Textarea accepting multi-line inputs: `platform:username[:password]` or comma-separated.
    - Real-time regex parser generating live visual chips previewing parsed accounts before saving.
- **Atomic Backend Transaction (`profiles:createWithAccounts`):**
  - Inserts row into `model_profiles`.
  - Inserts all accounts into `reddit_accounts`.
  - Stores encrypted passwords in `credential_vault`.
  - Generates CloakManager antidetect profile with hardware fingerprint.
  - Returns `launch-ready` model immediately.

### 3.4 Actionable Platforms Directory & 1-Click Presets (`Platforms.jsx`)
- **1-Click Popular Creator Presets Catalog:**
  - Pre-configured catalog: **OnlyFans** (🔞), **Fansly** (💙), **Fanvue** (✨), **LoyalFans** (👑), **ManyVids** (🎬), **Snapchat** (👻), **Telegram** (✈️), **Threads** (🧵), **Patreon** (🎨), **Twitch** (🎮), and **Kick** (🟢).
  - 1-click `+ Install` button writes slug, official login URLs, brand colors, and username prefixes.
- **Live Account Stats:** Displays `${p.account_count} active accounts` currently attached across models.
- **Instant `[ + Link to Model ]` Modal:**
  - Attach an account for this platform to any existing model profile without navigating away.

### 3.5 Infloww-Style Live Creator Inbox & Chatting CRM (`Inbox.jsx`)
- **Multi-Model Quick Switcher:** Left-rail sidebar displaying model avatars with unread badges, allowing chatters to switch between models instantly.
- **Folder Filtration:**
  - `Priority / Whales`: Fans who have spent over \$500.
  - `Unreplied`: Messages requiring prompt response within SLA.
  - `PPV Unlocked`: Fans who have purchased media in the last 24 hours.
  - `Followers / Non-Paying`: Low-priority prospective buyers.
- **Chatter Shift Lock:** Prevents two chatters from typing to the same fan simultaneously (collision avoidance via WebSocket broadcast).

### 3.6 Traffic Automation & CDP Playwright Automation
- **Playwright CDP Orchestrator (`src/main/cdp/`):** Connects to browser instances via port `7331` WebSocket.
- **Humanized Actions:**
  - Natural curve bezier mouse movements.
  - Variable typing speed with typos and auto-correction.
  - Random viewport scrolling and dwell times.
- **Autopilot Engine:** Automatically rotates accounts through warming, feed browsing, upvoting, and commenting during configured agency hours.

### 3.7 Scheduler Pro & Multi-Account Queue (`SchedulerPro.jsx`)
- **Calendar & Timeline View:** Multi-account post scheduling with drag-and-drop rescheduling.
- **AI Content Cascade:** Automated post generation using Claude 3.5 Sonnet, Grok 2, and GPT-4o with configured model personas and subreddit rules.
- **Distributed Post Locks (`post_locks`):** Prevents duplicate posting across multiple team member laptops.

### 3.8 Dual-Timezone Shift Scheduling Engine & Team Hub (`Team.jsx`)
- **Dual-Timezone Clock:**
  - Schedules created in **Agency Standard Time (AST)** (e.g. `America/New_York` EST).
  - Automatically converted and displayed in the remote worker's **Local Detected Timezone** (e.g. `Asia/Manila` PHT UTC+8).
- **Team Roster & Roles:**
  - Built-in roles: `Owner`, `Admin`, `Manager`, `Chatter`, `Coordinator`, `Marketing`.
  - Custom roles with granular assignment over 30+ permission tokens.

### 3.9 CloakManager Antidetect Engine & Network Security
- **Dual Browser Engines:**
  - **CloakManager Antidetect:** Hardened Chromium binary with canvas noise, WebGL vendor masking, audio context randomization, font fingerprint spoofing, and WebRTC public IP leak prevention.
  - **Electron Standard:** Lightweight native `WebContentsView` with partition isolation.
- **Proxy Bridges:** SOCKS5 / HTTP upstream chaining with automatic authentication injection.

---

## 4. Possible UI Showcase & High-Fidelity Wireframes

This section provides visual ASCII architectural wireframes showcasing the layout, hierarchy, and information density of Oserus Management.

### 4.1 UI Showcase: Executive Dashboard (`Dashboard.jsx`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  OSERUS MANAGEMENT · Operations Hub                                                          [🟢 Cloud Connected]│
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                  │
│  ┌─ MONTH-TO-DATE AGENCY GROSS REVENUE ────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                                                             │ │
│  │   $142,850.00 USD                   [🔑 Tier 5: $100k–$250k ($500/mo) ]       3 Active Creator Platforms    │ │
│  │   ▲ 18.4% vs last billing cycle     [ ⚡ Volume Rate: 1.0% above $250k ]       12 Running Browser Sessions   │ │
│  │                                                                                                             │ │
│  │   PROGRESS TO $250K SCALE CAP (57.1%)                                                                       │ │
│  │   ═══════════════════════════════════════════════────────────────────────────────────── $250,000.00         │ │
│  │   [ OnlyFans: $112,400 ]        [ Fansly: $22,150 ]        [ Fanvue: $8,300 ]                               │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                  │
│  ┌─ LIVE CREATOR SALES & PPV FEED ─────────────────────────┐  ┌─ ACTIVE BROWSER SESSIONS ──────────────────────┐ │
│  │ [ All Sales ] [ 💚 Tips ] [ 💙 Chatting/PPV ] [ 💜 Pay ]│  │ • Luna (Latina/Cosplay)      🟢 Running (1h 14m)│ │
│  ├─────────────────────────────────────────────────────────┤  │   └ 4 Accounts: OF, X, Reddit, IG              │ │
│  │ 🔞 OnlyFans · Luna          +$120.00 (PPV Video)   2m ago│  │ • Chloe (Fitness)            🟢 Running (3h 42m)│ │
│  │ 💙 Fansly · Sarah           +$50.00 (Custom Tip)   5m ago│  │   └ 3 Accounts: Fansly, X, TikTok              │ │
│  │ ✨ Fanvue · Mia             +$25.00 (Subscription) 8m ago│  │ • Elena (Gamer)             ⚪ Ready (Direct)  │ │
│  │ 🔞 OnlyFans · Luna          +$250.00 (VIP Bundle) 12m ago│  │   └ 2 Accounts: OF, Reddit                     │ │
│  └─────────────────────────────────────────────────────────┘  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 UI Showcase: High-Density Models Directory (`Profiles.jsx`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Models Directory                                                        [ 🔍 Search models, niches, accounts… ] │
│  High-density operational roster                                                       [ + New Model Wizard ]    │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  [ CloakManager Antidetect: 🟢 Engine Online (127.0.0.1:7331) ]                                                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  MODEL           NICHE        ACCOUNTS                PROXY              ASSIGNED TEAM   STATUS    ACTIONS       │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  🔴 Luna         Cosplay      [OF] [X] [Reddit] [IG]  Res-US-East (42ms) Marcus (Mgr)    ● Running [▶ Open]      │
│                               4 accounts configured                      Sarah (Chatter)           [Manage →]    │
│                                                                                                    [✏ Edit]      │
│                                                                                                    [🗑 Delete]   │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  🟡 Chloe        Fitness      [Fansly] [X] [TikTok]   Direct (No Proxy)  Elena (Chatter) ● Running [▶ Open]      │
│                               3 accounts configured                                                [Manage →]    │
│                                                                                                    [✏ Edit]      │
│                                                                                                    [🗑 Delete]   │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  🟢 Elena        Gamer / Alt  [OF] [Reddit]           Mobile-UK (88ms)   — Unassigned —  ⚪ Ready   [▶ Open]      │
│                               2 accounts configured                                                [Manage →]    │
│                                                                                                    [✏ Edit]      │
│                                                                                                    [🗑 Delete]   │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 UI Showcase: Fast Model & Accounts Setup Wizard (Drawer)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  ✨ Fast Model & Accounts Onboarding                                                                [ ✕ Close ]  │
│  Configure a model and all its initial platform accounts in one step — launch-ready immediately.                 │
│                                                                           [ 🪄 Guided Setup ]  [ 📋 Bulk Paste ] │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Model Name *                  Primary Manager                 Niche / Category                                  │
│  [ Luna                      ] [ Marcus (Manager)            ▼] [ Cosplay, Latina              ]                 │
│                                                                                                                  │
│  Model Dedicated Proxy         Browser Engine                  Avatar Color                                      │
│  [ Res-US-East (Static)     ▼] [ CloakManager Antidetect    ▼] (●) (#c8553d) ( ) ( ) ( ) ( )                     │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─ DESIGNATED PLATFORM ACCOUNTS (3 Configured) ───────────────────────────────────────────────────────────────┐ │
│  │ Quick Add: [+OnlyFans] [+Fansly] [+Fanvue] [+Reddit] [+X] [+Instagram] [+TikTok]                           │ │
│  ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│  │ [ 🔞 OnlyFans     ▼]  Username: [ @luna_vip            ]  Password: [ ••••••••••••       ]  [ ✕ Remove ]   │ │
│  │ [ 𝕏 X (Twitter)   ▼]  Username: [ @luna_official       ]  Password: [ ••••••••••••       ]  [ ✕ Remove ]   │ │
│  │ [ 🔴 Reddit       ▼]  Username: [ u/luna_cosplay       ]  Password: [ ••••••••••••       ]  [ ✕ Remove ]   │ │
│  │                                                                                                             │ │
│  │ [ + Add Another Account Row ]                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                  │
│  Brand Voice Guidelines (Optional):                                                                              │
│  [ Flirty, playful, responds within 3 minutes, always uses butterfly emojis 🦋...                             ] │
│                                                                                                                  │
│  [ 🚀 Create Launch-Ready Model ]                                                      [ Cancel ]                │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 UI Showcase: Actionable Platforms & Presets (`Platforms.jsx`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Platforms Directory & Creator Presets                                                  [ + Custom Platform ]    │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─ ⚡ 1-CLICK POPULAR CREATOR PRESETS ────────────────────────────────────────────────────────────────────────┐ │
│  │ [ 🔞 OnlyFans    ✓ Added ]  [ 💙 Fansly    ✓ Added ]  [ ✨ Fanvue    + Install ]  [ 👑 LoyalFans + Install ]│ │
│  │ [ 🎬 ManyVids   + Install ]  [ 👻 Snapchat  + Install ]  [ ✈️ Telegram  + Install ]  [ 🧵 Threads   + Install ]│ │
│  │ [ 🎨 Patreon    + Install ]  [ 🎮 Twitch    + Install ]  [ 🟢 Kick      + Install ]                            │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                                  │
│  ACTIVE PLATFORMS DIRECTORY                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ ● 🔞 OnlyFans     onlyfans   [BUILT-IN]  [ 12 active accounts ]   https://onlyfans.com                      │ │
│  │                                                      [ + Link to Model ]  [ Edit ]                          │ │
│  ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│  │ ● 💙 Fansly       fansly     [BUILT-IN]  [ 6 active accounts ]    https://fansly.com                        │ │
│  │                                                      [ + Link to Model ]  [ Edit ]                          │ │
│  ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ │
│  │ ● 𝕏 X (Twitter)   x          [BUILT-IN]  [ 24 active accounts ]   https://x.com                             │ │
│  │                                                      [ + Link to Model ]  [ Edit ]                          │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 UI Showcase: Infloww-Style Live Inbox (`Inbox.jsx`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  CREATOR MESSAGING INBOX                                                                     [ 🔔 Global Sound ] │
├──────────────┬────────────────────────┬──────────────────────────────────────────┬───────────────────────────────┤
│ MODEL SELECT │ FANS & FOLDERS         │ LIVE CHAT: Dave (@dave_nyc)              │ FAN TELEMETRY & SPEND VAULT   │
├──────────────┼────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ (●) Luna     │ [ Whale ] [ Unreplied ]│ [Dave - 10:14 PM]: Hey Luna! Loved your  │ 👤 Dave                       │
│     (3 new)  │                        │ new set today! Any customs available?    │ ⭐ VIP Whale ($1,840 Total)   │
│              │ ⭐ Dave ($1,840)       │                                          │ 🔞 OnlyFans Subscriber: 6 mos │
│ ( ) Chloe    │   "Any customs avail?" │ [Sarah (Chatter) - 10:15 PM]:            │ 📍 Location: New York, USA    │
│     (0 new)  │                        │ Hey handsome! Yes, filming today 🦋      │                               │
│              │ John ($420)            │                                          │ ┌─ MEDIA VAULT (SCRIPTS) ───┐ │
│ ( ) Elena    │   "Unlocked video"     │ ┌─ ATTACH PPV BUNDLE ──────────────────┐ │ │ [Set A: Beach Video - $35]│ │
│     (1 new)  │                        │ │ Summer Beach Set ($35.00) [Send]     │ │ │ [Set B: Shower Clip - $50]│ │
│              │ Mark ($85)             │ └──────────────────────────────────────┘ │ │ [Set C: Custom Photo - $15]│ │
│              │   "Subscribed"         │ [ Type message...                      ] │ └───────────────────────────┘ │
└──────────────┴────────────────────────┴──────────────────────────────────────────┴───────────────────────────────┘
```

### 4.6 UI Showcase: Dual-Timezone Shift Schedule (`Team.jsx`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Team & Shift Operations                                        [ Agency Standard Time: America/New_York (EDT) ] │
│  [ Team Roster ]  [ 📅 Shift Calendar ]  [ Custom Roles ]  [ License & Earnings ]       [ + Schedule Shift ]     │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  WORKER              ROLE     ASSIGNED MODEL  AGENCY TIME (EDT)      WORKER LOCAL TIME (PHT UTC+8)   STATUS      │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Marcus Vance        Manager  All Models      09:00 AM – 05:00 PM    09:00 PM – 05:00 AM (Next Day)  🟢 On Shift │
│  Sarah Jenkins       Chatter  Luna, Chloe     05:00 PM – 01:00 AM    05:00 AM – 01:00 PM             🟢 On Shift │
│  Elena Rostova       Chatter  Elena           01:00 AM – 09:00 AM    01:00 PM – 09:00 PM             ⚪ Upcoming │
│  Mark Sterling       Traffic  All Reddit      10:00 AM – 06:00 PM    10:00 PM – 06:00 AM             🟡 Idle 10m │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Database Architecture & Security Pipeline

### 5.1 Local SQLite Tables (`src/main/db.js`)
The application operates on `better-sqlite3` in WAL mode:

```
┌───────────────────────┐       ┌───────────────────────┐       ┌───────────────────────┐
│     model_profiles    │1     *│    reddit_accounts    │1     *│   creator_transactions│
├───────────────────────┤───────├───────────────────────┤       ├───────────────────────┤
│ id (PK)               │       │ id (PK)               │       │ id (PK)               │
│ name                  │       │ profile_id (FK)       │       │ platform (OF/FN/FV)   │
│ niche                 │       │ platform              │       │ model_id (FK)         │
│ proxy_id (FK)         │       │ username              │       │ amount_cents          │
│ team_id               │       │ partition_key         │       │ type (tip/chat/pay)   │
│ browser_mode          │       │ proxy_id (FK)         │       │ fan_handle            │
│ cloak_profile_name    │       │ status                │       │ created_at            │
└───────────────────────┘       └───────────────────────┘       └───────────────────────┘
            │1
            │*
┌───────────────────────┐       ┌───────────────────────┐       ┌───────────────────────┐
│  profile_assignments  │*     1│         users         │1     *│         shifts        │
├───────────────────────┤───────├───────────────────────┤───────├───────────────────────┤
│ profile_id (FK)       │       │ id (PK)               │       │ id (PK)               │
│ user_id (FK)          │       │ username / email      │       │ user_id (FK)          │
│ role (mgr/chatter)    │       │ role (owner/admin/...)│       │ profile_id (FK)       │
└───────────────────────┘       │ today_seconds         │       │ start_time / end_time │
                                └───────────────────────┘       └───────────────────────┘
```

### 5.2 Credential Vault (`credential_vault`)
- Encrypted using Electron native `safeStorage` (backed by Windows DPAPI or macOS Keychain).
- Keys:
  - `account_password:{accountId}`
  - `email_password:{accountId}`
- Plaintext passwords **never touch disk in unencrypted format**.

---

## 6. Complete IPC API Reference

| IPC Channel | Arguments | Response | Description |
|---|---|---|---|
| `profiles:list` | `{ token, teamId }` | `{ ok, profiles }` | Lists models scoped strictly by role (`profileScopeClause`). |
| `profiles:createWithAccounts` | `{ token, name, niche, proxyId, browserMode, accounts, teamId }` | `{ ok, id, accountCount }` | Atomic transaction creating model + accounts + vault passwords. |
| `profiles:update` | `{ token, profileId, updates, teamId }` | `{ ok }` | Updates model metadata, proxy, or browser mode. |
| `profiles:delete` | `{ token, profileId, teamId }` | `{ ok }` | Cascading delete of model, accounts, and assignments. |
| `platforms:list` | None | `{ ok, platforms }` | Returns all platforms with `account_count` calculated. |
| `platforms:create` | `{ token, platform }` | `{ ok, id }` | Registers a built-in preset or custom platform. |
| `platforms:delete` | `{ token, platformId }` | `{ ok }` | Removes custom platform. |
| `accounts:create` | `{ token, profileId, platform, username, password, proxyId, teamId }` | `{ ok, id }` | Attaches single account to model with encrypted password. |
| `oserus-browser:openForModel` | `{ profileId }` | `{ ok, cdpPort }` | Launches isolated model browser session (enforces Launch Guard). |
| `license:getTransactions` | `{ token, teamId }` | `{ ok, transactions }` | Retrieves creator tips, PPV unlocks, and sales. |
| `license:addTransaction` | `{ token, transaction }` | `{ ok, id }` | Records live OnlyFans/Fansly/Fanvue sale. |
| `shifts:list` | `{ token, teamId }` | `{ ok, shifts }` | Retrieves scheduled chatter shifts with timezone offsets. |

---

## 7. Operational Playbook for Future AI Agents

When continuing work on this codebase, **always follow these procedures**:

1. **Verify Syntax Before Committing:**
   - Run `npm run build:renderer` to ensure Vite / React 18 compiles with 0 errors.
   - Run `node -c <modified_files>` on any modified files in `src/main/`.
2. **Execute Full Deployment Pipeline:**
   - Bump version in `package.json` and `DESIGN.md`.
   - Commit with descriptive message.
   - Tag with git (`git tag v0.XX.XX`).
   - Push **both `main` and the tag** to remote:
     `git push <remote_with_pat> main v0.XX.XX`
3. **Monitor CI/CD Build:**
   - Query GitHub Actions API to track the Windows NSIS installer build.
   - Once completed, download installer and run `/S` silent update.
4. **Preserve Established UI Philosophy:**
   - Do not add random buttons to the header.
   - Keep the dark obsidian theme (`#0c0f0d`, `#161a17`, Gold `#d4a64a`, Emerald `#7a9a5a`).
   - Never reintroduce competitor names.
   - Keep models table clean and high-density.
