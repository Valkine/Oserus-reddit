const { getDb } = require('../db');
const { userFromToken, requireOwnerOrAdmin } = require('./auth');

const TIERS = {
  starter: {
    keyPrefix: 'STARTER',
    name: 'Starter Agency ($10,000/mo cap)',
    cap: 10000,
  },
  growth: {
    keyPrefix: 'GROWTH',
    name: 'Growth Agency ($50,000/mo cap)',
    cap: 50000,
  },
  scale: {
    keyPrefix: 'SCALE',
    name: 'Scale Agency ($100,000/mo cap)',
    cap: 100000,
  },
  enterprise: {
    keyPrefix: 'ENTERPRISE',
    name: 'Enterprise Agency (Unlimited)',
    cap: 999999999,
  },
};

function currentMonthPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function ensureLicenseTables() {
  const db = getDb();
  db.exec(`
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

    CREATE TABLE IF NOT EXISTS platform_connections (
      platform TEXT PRIMARY KEY,
      connected INTEGER NOT NULL DEFAULT 0,
      account_handle TEXT,
      api_key_encrypted TEXT,
      session_token_encrypted TEXT,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS platform_earnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      month_period TEXT NOT NULL,
      gross_amount REAL NOT NULL DEFAULT 0.0,
      net_amount REAL NOT NULL DEFAULT 0.0,
      subscriber_count INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(platform, month_period)
    );
  `);

  // Seed default active monthly key if no license row exists
  const existing = db.prepare('SELECT id FROM app_license WHERE id = 1').get();
  if (!existing) {
    const expires = new Date();
    expires.setDate(expires.getDate() + 27); // 27 days left in current billing cycle
    db.prepare(`
      INSERT INTO app_license (id, license_key, owner_email, tier, tier_name, monthly_earnings_cap, expires_at, status)
      VALUES (1, 'OSERUS-GROWTH-2026-9F8A', 'owner@agency.com', 'growth', 'Growth Agency ($50,000/mo cap)', 50000.0, ?, 'active')
    `).run(expires.toISOString());
  }

  // Seed initial platform connections if empty
  const platforms = ['onlyfans', 'fansly', 'fanvue'];
  for (const p of platforms) {
    db.prepare(`
      INSERT OR IGNORE INTO platform_connections (platform, connected, account_handle)
      VALUES (?, 1, ?)
    `).run(p, p === 'onlyfans' ? '@agency_models' : p === 'fansly' ? '@fansly_creators' : '@fanvue_vip');
  }

  // Seed current month earnings if empty
  const month = currentMonthPeriod();
  const sampleEarnings = [
    { platform: 'onlyfans', gross: 24500.00, net: 19600.00, subs: 1420 },
    { platform: 'fansly',   gross: 6200.00,  net: 4960.00,  subs: 340 },
    { platform: 'fanvue',   gross: 2100.00,  net: 1785.00,  subs: 115 },
  ];
  for (const s of sampleEarnings) {
    db.prepare(`
      INSERT OR IGNORE INTO platform_earnings (platform, month_period, gross_amount, net_amount, subscriber_count)
      VALUES (?, ?, ?, ?, ?)
    `).run(s.platform, month, s.gross, s.net, s.subs);
  }
}

function register(ipcMain) {
  ensureLicenseTables();

  // Get current license status and monthly earnings
  ipcMain.handle('license:get', async (_e, { token }) => {
    try {
      const user = userFromToken(token);
      if (!user) return { ok: false, error: 'Not authenticated' };

      const db = getDb();
      ensureLicenseTables();

      const license = db.prepare('SELECT * FROM app_license WHERE id = 1').get() || {
        license_key: 'UNLICENSED',
        tier: 'starter',
        tier_name: 'Starter Agency ($10,000/mo cap)',
        monthly_earnings_cap: 10000.0,
        expires_at: new Date().toISOString(),
        status: 'expired',
      };

      const month = currentMonthPeriod();
      const earningsRows = db.prepare(
        'SELECT platform, gross_amount, net_amount, subscriber_count, updated_at FROM platform_earnings WHERE month_period = ?'
      ).all(month);

      const platformsMap = { onlyfans: 0, fansly: 0, fanvue: 0 };
      let totalGross = 0;
      let totalNet = 0;
      let totalSubs = 0;

      for (const r of earningsRows) {
        platformsMap[r.platform] = r.gross_amount;
        totalGross += r.gross_amount;
        totalNet += r.net_amount;
        totalSubs += (r.subscriber_count || 0);
      }

      const expiresDate = new Date(license.expires_at);
      const now = new Date();
      const diffMs = expiresDate.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const isExpired = diffMs <= 0;
      const capPercent = Math.min(100, Math.round((totalGross / (license.monthly_earnings_cap || 1)) * 1000) / 10);
      const isCapped = totalGross >= license.monthly_earnings_cap;

      let status = 'active';
      if (isExpired) status = 'expired';
      else if (isCapped) status = 'capped';

      const connections = db.prepare('SELECT platform, connected, account_handle, last_synced_at FROM platform_connections').all();

      return {
        ok: true,
        license: {
          ...license,
          days_remaining: daysRemaining,
          status,
          is_expired: isExpired,
          is_capped: isCapped,
        },
        earnings: {
          period: month,
          total_gross: totalGross,
          total_net: totalNet,
          total_subscribers: totalSubs,
          cap_percent: capPercent,
          by_platform: {
            onlyfans: platformsMap.onlyfans || 0,
            fansly: platformsMap.fansly || 0,
            fanvue: platformsMap.fanvue || 0,
          },
        },
        connections,
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Activate / renew monthly license key
  ipcMain.handle('license:activate', async (_e, { token, key, ownerEmail }) => {
    try {
      requireOwnerOrAdmin(token);
      if (!key || typeof key !== 'string') throw new Error('License key is required');

      const upper = key.trim().toUpperCase();
      let tier = 'starter';
      if (upper.includes('ENT')) tier = 'enterprise';
      else if (upper.includes('SCALE')) tier = 'scale';
      else if (upper.includes('GROWTH')) tier = 'growth';

      const tierCfg = TIERS[tier];
      const expires = new Date();
      expires.setDate(expires.getDate() + 30); // 30-day monthly license

      const db = getDb();
      ensureLicenseTables();
      db.prepare(`
        INSERT INTO app_license (id, license_key, owner_email, tier, tier_name, monthly_earnings_cap, expires_at, status)
        VALUES (1, ?, ?, ?, ?, ?, ?, 'active')
        ON CONFLICT(id) DO UPDATE SET
          license_key = excluded.license_key,
          owner_email = COALESCE(excluded.owner_email, app_license.owner_email),
          tier = excluded.tier,
          tier_name = excluded.tier_name,
          monthly_earnings_cap = excluded.monthly_earnings_cap,
          expires_at = excluded.expires_at,
          status = 'active'
      `).run(upper, ownerEmail || 'owner@agency.com', tier, tierCfg.name, tierCfg.cap, expires.toISOString());

      return { ok: true, tier, tierName: tierCfg.name, cap: tierCfg.cap, expiresAt: expires.toISOString() };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Update connected platform settings
  ipcMain.handle('license:updateConnection', async (_e, { token, platform, connected, accountHandle }) => {
    try {
      requireOwnerOrAdmin(token);
      const db = getDb();
      ensureLicenseTables();
      db.prepare(`
        INSERT INTO platform_connections (platform, connected, account_handle, last_synced_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(platform) DO UPDATE SET
          connected = excluded.connected,
          account_handle = excluded.account_handle,
          last_synced_at = datetime('now')
      `).run(platform, connected ? 1 : 0, accountHandle || null);

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Update platform earnings
  ipcMain.handle('license:updateEarnings', async (_e, { token, platform, gross, net, subscribers }) => {
    try {
      requireOwnerOrAdmin(token);
      const db = getDb();
      ensureLicenseTables();
      const month = currentMonthPeriod();

      db.prepare(`
        INSERT INTO platform_earnings (platform, month_period, gross_amount, net_amount, subscriber_count, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(platform, month_period) DO UPDATE SET
          gross_amount = excluded.gross_amount,
          net_amount = excluded.net_amount,
          subscriber_count = excluded.subscriber_count,
          updated_at = datetime('now')
      `).run(platform, month, Number(gross) || 0, Number(net) || 0, Number(subscribers) || 0);

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

module.exports = register;
