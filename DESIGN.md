# OSERUS MANAGEMENT — DESIGN & ARCHITECTURE SYSTEM (DESIGN.md)
*Comprehensive design specification, product architecture, and operational guidelines.*
*Last updated: 2026-09-21*

---

## 1. Executive Vision: Two-Pillar Agency Operating System

Oserus Management is an agency-grade workstation built specifically for OnlyFans, Fansly, and Fanvue management agencies. The application is architecturally split into two complementary engines:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OSERUS MANAGEMENT                               │
├───────────────────────────────────┬────────────────────────────────────┤
│   PILLAR 1: TRAFFIC & ANTIDETECT  │  PILLAR 2: INBOX & MONETIZATION    │
│   (AdsPower-Style Browser Engine) │  (Infloww-Style Account Manager)   │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Reddit, X, Instagram, TikTok    │ • OnlyFans, Fansly, Fanvue         │
│ • CloakBrowser antidetect sandbox │ • Unified Chatter CRM & Inbox      │
│ • Isolated fingerprint & proxy    │ • Folder sorting (VIPs, Unread)    │
│ • Top-of-funnel traffic & promos  │ • Real-time Earnings & Revenue     │
│ • 1-Click Model Profile Launch    │ • Multi-model quick switcher       │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Earnings-Scaled Monthly Subscription & Licensing Model

### Concept: Revenue-Scaled Agency License
Rather than arbitrary seat-based pricing that penalizes growing agencies, the licensing model scales based on the agency's **Monthly Gross Earnings** tracked across connected platforms (OnlyFans, Fansly, Fanvue).

### Tier Structure:
- **Starter Tier**: Up to **\$10,000 / month** gross revenue.
- **Growth Tier**: Up to **\$50,000 / month** gross revenue.
- **Scale Tier**: Up to **\$100,000 / month** gross revenue.
- **Enterprise Agency Tier**: Unlimited monthly gross revenue.

### License Key Data Schema:
```json
{
  "key": "OSERUS-GROWTH-2026-9F8A",
  "owner_email": "agency@example.com",
  "tier": "growth",
  "tier_name": "Growth Agency ($50k/mo cap)",
  "monthly_earnings_cap": 50000,
  "current_month_earnings": 34250.00,
  "expires_at": "2026-10-21T00:00:00Z",
  "status": "active"
}
```

### Dashboard Earnings Counter & License Meter:
On the executive Dashboard, the Owner sees:
```
┌────────────────────────────────────────────────────────────────────────┐
│ 💰 MTD Gross Earnings: $34,250.00          [ 🔑 Growth Tier: Active ] │
│ [██████████████████████░░░░░░░░░░] 68.5% of $50,000 cap · 24 days left │
│ OnlyFans: $26,400  ·  Fansly: $5,650  ·  Fanvue: $2,200                │
└────────────────────────────────────────────────────────────────────────┘
```
- **Expiring / Capped Behavior**: When the monthly period expires or earnings exceed the tier cap, a clean renewal modal prompts the Owner to renew or upgrade. Operational data is never lost.

---

## 3. Pillar 2: Account Manager Pro / Infloww-Style Inbox

### Purpose
While social platforms (Reddit, X, IG, TikTok) run inside CloakBrowser for anti-ban fingerprint safety, subscription chatting (OnlyFans, Fansly, Fanvue) is performed inside a high-speed, native **Infloww-style Chatter CRM**.

### Feature Set:
1. **Platform Integrations (Settings -> Platform Connections)**:
   - Connect **OnlyFans**, **Fansly**, and **Fanvue** via secure API keys, session tokens, or agency credentials.
   - Live sync of earnings, subscriber counts, and active direct messages.
2. **Multi-Model Quick Switcher**:
   - Chatters and managers can swap between models with a single click in the inbox header (e.g. `[Luna ▼]` ⇄ `[Chloe]`).
   - Employees only see models they are assigned to.
3. **Smart Conversation Folders**:
   - `⭐ VIP Spenders ($500+)`
   - `🔥 High Tippers (Last 7 Days)`
   - `🆕 New Subscribers`
   - `💬 Unreplied / Waiting`
   - `📁 All Conversations`
4. **Fan Profile Sidebar**:
   - Total spent (\$ value), subscriber duration, tip history, custom notes (e.g. preferences, kinks, conversation history).
5. **Canned Scripts & PPV Vault**:
   - Quick-insert messaging templates, pricing presets, and media vault integration.

---

## 4. Strict Role & Model Isolation Policy

### 1. The Owner (License Buyer): Root Administrator
- Sole owner of the license key and billing.
- Full visibility across **all models**, **all team members**, and **total agency revenue**.
- Full permissions to create/delete models, configure proxies, create custom roles, and schedule shifts.
- Can connect platform APIs (OnlyFans, Fansly, Fanvue).

### 2. Workers / Employees (Chatters, Posters, VAs): Strict Model Isolation
> [!IMPORTANT]
> **Employees see ONLY the models they are assigned to.**
> - If employee `Sarah` is assigned to `Model Luna`, Sarah's interface only displays `Model Luna`.
> - Sarah's **Models** list only contains `Model Luna`.
> - Sarah's **Inbox / Chatter CRM** model switcher only contains `Model Luna`.
> - Sarah's **Dashboard** only reflects metrics for `Model Luna`.
> - All other agency models, proxies, financial totals, and team members are completely invisible to Sarah.

---

## 5. Dual-Timezone Shift Scheduling

### Real-World Agency Setup
- **Owner**: Typically US/EU (e.g., `America/New_York` EST).
- **Chatters / VAs**: Frequently global (e.g., `Asia/Manila` PHT UTC+8, Latin America, Eastern Europe).

### Dual-Timezone Engine:
1. **Owner Input**: Schedules shifts in Owner timezone (e.g. `Mon–Fri 09:00 - 17:00 EST`).
2. **Worker Display**: Automatically detects and translates to the worker's local time:
   - Worker sees: `Your Shift: 9:00 PM – 5:00 AM (Your Time: PHT) · [Agency: 9:00 AM – 5:00 PM EST]`
   - Owner sees: `Sarah: 9:00 AM – 5:00 PM EST (Worker Local: 9:00 PM – 5:00 AM PHT)`
3. Zero mental math, zero missed shifts.

---

## 6. Model System & UI Cleanliness (The AdsPower Model)

### Surface A: Decluttered Model Detail Page (`ModelDetail.jsx`)
- **Banish the 5 Stacked Empty Platform Cards**:
  - No more 5 giant dashed boxes for RedGIFs, X, TikTok, Reddit, Instagram.
  - Replaced with a unified **Accounts Table** with compact platform filter tabs:
    `[ All Accounts (3) ]` `[ Reddit (1) ]` `[ X (1) ]` `[ Instagram (1) ]` `[ + Add Account ]`.
- **Single Master Launch Control**:
  - The Model Profile is the browser.
  - One prominent hero launch button: `[ ▶ Launch Model Browser ]`.
  - NO confusing individual "Open Browser" buttons on each account row.

### Surface B: Clean Models Overview (`Profiles.jsx`)
- **Card Diet**: Strip out embedded manager dropdowns, add-member dropdowns, email inputs, and proxy dropdowns from inside every card.
- **High-Density AdsPower Table View**: Toggle between compact card grid and spreadsheet table view.

### Surface C: Streamlined "Add Account" Flow
- A clean, modern slide-over modal:
  - **Platform**: Clean dropdown or visual icon chips (Reddit, X, Instagram, TikTok, RedGIFs, OnlyFans, Fansly, Fanvue).
  - **Model**: Pre-selected if initiated from ModelDetail.
  - **Credentials**: Username/handle, password or auth token.
  - **Proxy**: Inherited from model or custom override.
  - Fast, single-step validation.

### Surface D: Dedicated Team Hub (`Team.jsx`) & Clean Dashboard (`Dashboard.jsx`)
- **Dashboard**: Executive health, running browsers, daily posts, gross earnings counter. Team management completely removed from Dashboard.
- **Team Hub**:
  - Tab 1: **Team Roster & Model Assignments**
  - Tab 2: **Dual-Timezone Shift Scheduling**
  - Tab 3: **Custom Role Builder (Owner-Only)**
  - Tab 4: **License & Earnings Tier Tracker**

---

## 7. Visual Palette & Aesthetics

```css
/* Surface Colors */
--bg-0: #0a0908;       /* Obsidian app backdrop */
--bg-1: #12110e;       /* Card & table background */
--bg-2: #1a1815;       /* Input backgrounds, hover states */
--bg-3: #24221c;       /* Dropdowns, tooltips, dialogs */

/* Accents */
--gold: #e5a93c;       /* Primary agency gold */
--gold-hover: #f0ba54;
--gold-dim: rgba(229, 169, 60, 0.15);

/* Platforms */
--of-blue: #00aff0;    /* OnlyFans brand cyan */
--fansly-blue: #1fa2f1;/* Fansly blue */
--fanvue-purple: #8b5cf6; /* Fanvue purple */
--reddit-orange: #ff4500;
--x-black: #ffffff;
```

---

## 8. Phased Implementation Roadmap

- [ ] **Phase 1: ModelDetail Visual Declutter (Immediate Relief)**
  - Replace 5 stacked empty platform cards with unified tabbed accounts table.
  - Remove per-account launch buttons; elevate single master launch button.
  - Clean up card layout in `Profiles.jsx`.
- [ ] **Phase 2: Employee Model Isolation & Role Gating**
  - Filter `model_profiles` and accounts so non-owners only see their assigned models.
  - Enforce Owner-only administrative mutation privileges across all backend IPCs.
- [ ] **Phase 3: Streamlined Add Account Modal**
  - Build modern, compact Add Account modal supporting all platforms.
- [ ] **Phase 4: Dedicated Team Hub & Dual-Timezone Shift Scheduling**
  - Remove team admin from Dashboard; establish dedicated Team Hub (`Team.jsx`).
  - Implement dual-timezone shift scheduling engine and custom role builder.
- [ ] **Phase 5: Earnings-Scaled Licensing & Platform Integrations**
  - Add OnlyFans, Fansly, and Fanvue connection settings.
  - Build Dashboard Gross Revenue / Earnings Tracker scaled against license tier.
- [ ] **Phase 6: Infloww-Style Account Manager Pro / Inbox**
  - Multi-model chatter inbox with conversation folders and fan profile drawer.
