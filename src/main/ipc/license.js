const { getDb } = require('../db');
const { userFromToken, requireOwnerOrAdmin } = require('./auth');

const INFLOWW_EARNINGS_BRACKETS = [
  { min: 0, max: 5000, fee: 40, label: '$0 – $5,000' },
  { min: 5000.01, max: 15000, fee: 75, label: '$5,000.01 – $15,000' },
  { min: 15000.01, max: 30000, fee: 150, label: '$15,000.01 – $30,000' },
  { min: 30000.01, max: 60000, fee: 250, label: '$30,000.01 – $60,000' },
  { min: 60000.01, max: 75000, fee: 400, label: '$60,000.01 – $75,000' },
  { min: 75000.01, max: 100000, fee: 550, label: '$75,000.01 – $100,000' },
  { min: 100000.01, max: 150000, fee: 750, label: '$100,000.01 – $150,000' },
  { min: 150000.01, max: 200000, fee: 950, label: '$150,000.01 – $200,000' },
  { min: 200000.01, max: 250000, fee: 1200, label: '$200,000.01 – $250,000' },
];

function resolveEarningsScale(grossAmount) {
  const gross = Math.max(0, Number(grossAmount) || 0);

  // Up to $250k: Graduated monthly creator/agency earnings brackets
  for (let i = 0; i < INFLOWW_EARNINGS_BRACKETS.length; i++) {
    const b = INFLOWW_EARNINGS_BRACKETS[i];
    if (gross <= b.max) {
      return {
        bracketIndex: i + 1,
        tierKey: `bracket_${i + 1}`,
        tierName: `Earnings Tier: ${b.label}/mo ($${b.fee}/mo)`,
        monthlyFee: b.fee,
        cap: b.max,
        ceiling: 250000,
        isPercentageScale: false,
        percentageCut: 0,
        rateExplanation: `$${b.fee}/mo flat based on MTD gross earnings (${b.label})`,
      };
    }
  }

  // Beyond $250,000/mo: Scales dynamically on a percentage (1.0% volume fee over $250k)
  const excess = gross - 250000;
  const percentageRate = 0.01; // 1.0% on revenue over $250,000
  const excessFee = Math.round(excess * percentageRate);
  const totalFee = 1200 + excessFee;

  return {
    bracketIndex: 10,
    tierKey: 'volume_percentage',
    tierName: `Enterprise Scale ($250k+ · 1.0% Over-Cap)`,
    monthlyFee: totalFee,
    cap: 250000,
    ceiling: 250000,
    isPercentageScale: true,
    percentageCut: 1.0,
    excessGross: excess,
    excessFee: excessFee,
    rateExplanation: `$1,200/mo base + 1.0% on volume over $250k (+$${excessFee.toLocaleString()} volume commission)`,
  };
}

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

    CREATE TABLE IF NOT EXISTS creator_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      profile_name TEXT NOT NULL,
      fan_handle TEXT NOT NULL,
      type TEXT NOT NULL,
      type_label TEXT NOT NULL,
      amount REAL NOT NULL,
      net_amount REAL NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

  // Seed initial creator transactions if empty
  try {
    const existingTx = db.prepare('SELECT COUNT(*) AS count FROM creator_transactions').get();
    if (!existingTx || existingTx.count === 0) {
      const seedTxs = [
        { platform: 'onlyfans', profile_name: 'Luna',  fan_handle: '@vip_marcus',    type: 'tip',           type_label: 'Whale Tip',        amount: 75.00,  net: 60.00, desc: 'Wall post tip + photo request', minsAgo: 4 },
        { platform: 'fansly',   profile_name: 'Chloe', fan_handle: '@austin_tx99',   type: 'chatting_sale', type_label: 'PPV Chat Unlock',  amount: 120.00, net: 96.00, desc: 'Locked video message (Chatting)', minsAgo: 16 },
        { platform: 'onlyfans', profile_name: 'Luna',  fan_handle: '@mark_finance',  type: 'custom_pay',    type_label: 'Custom Video Pay', amount: 150.00, net: 120.00, desc: '3-min cosplay custom order', minsAgo: 32 },
        { platform: 'fanvue',   profile_name: 'Mia',   fan_handle: '@dennis_vip',    type: 'tip',           type_label: 'Live Stream Tip',  amount: 50.00,  net: 42.50, desc: 'Stream interaction tip', minsAgo: 50 },
        { platform: 'onlyfans', profile_name: 'Luna',  fan_handle: '@kevin_b88',     type: 'subscription',  type_label: 'Sub Renewal',      amount: 15.00,  net: 12.00, desc: '1-month VIP subscription', minsAgo: 68 },
        { platform: 'fansly',   profile_name: 'Chloe', fan_handle: '@crypto_richie', type: 'chatting_sale', type_label: 'PPV Photo Set',   amount: 45.00,  net: 36.00, desc: 'Locked gallery unlock in DMs', minsAgo: 105 },
        { platform: 'onlyfans', profile_name: 'Luna',  fan_handle: '@joshua_k',      type: 'tip',           type_label: 'Audio Note Tip',   amount: 30.00,  net: 24.00, desc: 'Goodnight audio note tip', minsAgo: 140 },
        { platform: 'fanvue',   profile_name: 'Mia',   fan_handle: '@alex_london',   type: 'custom_pay',    type_label: 'Custom Photo Pay', amount: 80.00,  net: 68.00, desc: 'Priority photo set pay', minsAgo: 185 },
        { platform: 'onlyfans', profile_name: 'Luna',  fan_handle: '@whale_hunter',  type: 'tip',           type_label: 'Super Whale Tip',  amount: 250.00, net: 200.00, desc: 'Exclusive VIP tier tip', minsAgo: 230 },
      ];
      for (const tx of seedTxs) {
        const dt = new Date(Date.now() - tx.minsAgo * 60000).toISOString();
        db.prepare(`
          INSERT INTO creator_transactions (platform, profile_name, fan_handle, type, type_label, amount, net_amount, description, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(tx.platform, tx.profile_name, tx.fan_handle, tx.type, tx.type_label, tx.amount, tx.net, tx.desc, dt);
      }
    }
  } catch {}
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

      const scaleInfo = resolveEarningsScale(totalGross);
      const expiresDate = new Date(license.expires_at);
      const now = new Date();
      const diffMs = expiresDate.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const isExpired = diffMs <= 0;
      const capPercent = Math.min(100, Math.round((totalGross / 250000) * 1000) / 10);
      const headroom = Math.max(0, 250000 - totalGross);

      let status = 'active';
      if (isExpired) status = 'expired';

      const connections = db.prepare('SELECT platform, connected, account_handle, last_synced_at FROM platform_connections').all();

      return {
        ok: true,
        license: {
          ...license,
          tier: scaleInfo.tierKey,
          tier_name: scaleInfo.tierName,
          monthly_earnings_cap: 250000.0,
          scale_ceiling: 250000.0,
          monthly_fee: scaleInfo.monthlyFee,
          is_percentage_scale: scaleInfo.isPercentageScale,
          percentage_cut: scaleInfo.percentageCut,
          rate_explanation: scaleInfo.rateExplanation,
          excess_gross: scaleInfo.excessGross || 0,
          excess_fee: scaleInfo.excessFee || 0,
          headroom,
          all_brackets: INFLOWW_EARNINGS_BRACKETS,
          days_remaining: daysRemaining,
          status,
          is_expired: isExpired,
          is_capped: false, // In percentage scale mode, volume is never hard-capped, it scales smoothly
        },
        earnings: {
          period: month,
          total_gross: totalGross,
          total_net: totalNet,
          total_subscribers: totalSubs,
          cap_percent: capPercent,
          headroom,
          is_percentage_scale: scaleInfo.isPercentageScale,
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
      const expires = new Date();
      expires.setDate(expires.getDate() + 30); // 30-day monthly license

      const db = getDb();
      ensureLicenseTables();
      db.prepare(`
        INSERT INTO app_license (id, license_key, owner_email, tier, tier_name, monthly_earnings_cap, expires_at, status)
        VALUES (1, ?, ?, 'dynamic_scale', 'Graduated Scale (up to $250k + 1% Over-Cap)', 250000.0, ?, 'active')
        ON CONFLICT(id) DO UPDATE SET
          license_key = excluded.license_key,
          owner_email = COALESCE(excluded.owner_email, app_license.owner_email),
          tier = 'dynamic_scale',
          tier_name = 'Graduated Scale (up to $250k + 1% Over-Cap)',
          monthly_earnings_cap = 250000.0,
          expires_at = excluded.expires_at,
          status = 'active'
      `).run(upper, ownerEmail || 'owner@agency.com', expires.toISOString());

      return {
        ok: true,
        tier: 'dynamic_scale',
        tierName: 'Graduated Scale (up to $250k + 1% Over-Cap)',
        cap: 250000,
        expiresAt: expires.toISOString()
      };
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

  // Get live creator transactions feed (Tips, Chatting sales, Custom Video Pay, Subscriptions)
  ipcMain.handle('license:getTransactions', async (_e, { token, limit = 25, type = null }) => {
    try {
      const user = userFromToken(token);
      if (!user) return { ok: false, error: 'Not authenticated' };

      const db = getDb();
      ensureLicenseTables();

      let sql = 'SELECT * FROM creator_transactions';
      const params = [];
      if (type && type !== 'all') {
        sql += ' WHERE type = ?';
        params.push(type);
      }
      sql += ' ORDER BY created_at DESC LIMIT ?';
      params.push(Number(limit) || 25);

      const rows = db.prepare(sql).all(...params);
      return { ok: true, transactions: rows };
    } catch (err) {
      return { ok: false, error: err.message, transactions: [] };
    }
  });

  // Add a live creator transaction
  ipcMain.handle('license:addTransaction', async (_e, { token, platform, profileName, fanHandle, type, typeLabel, amount, netAmount, description }) => {
    try {
      requireOwnerOrAdmin(token);
      const db = getDb();
      ensureLicenseTables();

      const gross = Math.max(0, Number(amount) || 0);
      const net = Math.max(0, Number(netAmount) || (gross * 0.8));
      const info = db.prepare(`
        INSERT INTO creator_transactions (platform, profile_name, fan_handle, type, type_label, amount, net_amount, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(platform || 'onlyfans', profileName || 'Model', fanHandle || '@fan', type || 'tip', typeLabel || 'Tip', gross, net, description || '');

      // Increment MTD gross earnings for this platform
      const month = currentMonthPeriod();
      db.prepare(`
        UPDATE platform_earnings
        SET gross_amount = gross_amount + ?, net_amount = net_amount + ?, updated_at = datetime('now')
        WHERE platform = ? AND month_period = ?
      `).run(gross, net, platform || 'onlyfans', month);

      return { ok: true, id: info.lastInsertRowid };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

module.exports = register;
