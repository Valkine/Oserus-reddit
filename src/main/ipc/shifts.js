const { getDb } = require('../db');
const { userFromToken, requireOwnerOrAdmin } = require('./auth');

function ensureShiftsTable() {
  const db = getDb();
  db.exec(`
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
  `);

  // Seed sample shifts if empty
  const count = db.prepare('SELECT COUNT(*) AS c FROM shifts').get().c;
  if (count === 0) {
    const user = db.prepare('SELECT id FROM users LIMIT 1').get();
    const profile = db.prepare('SELECT id FROM model_profiles LIMIT 1').get();
    if (user && profile) {
      db.prepare(`
        INSERT INTO shifts (profile_id, user_id, day_of_week, start_time, end_time, owner_timezone, notes)
        VALUES (?, ?, 1, '09:00', '17:00', 'America/New_York', 'Weekday chat coverage')
      `).run(profile.id, user.id);
      db.prepare(`
        INSERT INTO shifts (profile_id, user_id, day_of_week, start_time, end_time, owner_timezone, notes)
        VALUES (?, ?, 2, '09:00', '17:00', 'America/New_York', 'Weekday chat coverage')
      `).run(profile.id, user.id);
    }
  }
}

function register(ipcMain) {
  ensureShiftsTable();

  // List shifts. Owner/admin sees all; workers only see their assigned shifts.
  ipcMain.handle('shifts:list', async (_e, { token, teamId }) => {
    try {
      const user = userFromToken(token);
      if (!user) return { ok: false, error: 'Not authenticated' };

      const db = getDb();
      ensureShiftsTable();

      const isOwnerOrAdmin = user.role === 'owner' || user.role === 'admin';

      let sql = `
        SELECT s.*,
               u.display_name AS worker_name,
               u.username AS worker_username,
               u.role AS worker_role,
               p.name AS profile_name,
               p.avatar_color AS profile_color
        FROM shifts s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN model_profiles p ON p.id = s.profile_id
      `;

      const params = [];
      const conditions = [];

      if (!isOwnerOrAdmin) {
        conditions.push('s.user_id = ?');
        params.push(user.id);
      }

      if (teamId) {
        conditions.push('(s.team_id = ? OR s.team_id IS NULL)');
        params.push(teamId);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY s.day_of_week, s.start_time';

      const shifts = db.prepare(sql).all(...params);
      return { ok: true, shifts, isOwner: isOwnerOrAdmin };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Create a new shift (Owner/Admin only)
  ipcMain.handle('shifts:create', async (_e, { token, teamId, profileId, userId, dayOfWeek, startTime, endTime, ownerTimezone, notes }) => {
    try {
      requireOwnerOrAdmin(token);
      if (!userId) throw new Error('Worker user ID is required');
      if (dayOfWeek === undefined || dayOfWeek === null) throw new Error('Day of week is required (0-6)');
      if (!startTime || !endTime) throw new Error('Start and end times are required');

      const db = getDb();
      ensureShiftsTable();

      const res = db.prepare(`
        INSERT INTO shifts (team_id, profile_id, user_id, day_of_week, start_time, end_time, owner_timezone, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        teamId || null,
        profileId ? Number(profileId) : null,
        Number(userId),
        Number(dayOfWeek),
        startTime,
        endTime,
        ownerTimezone || 'America/New_York',
        notes || null
      );

      return { ok: true, id: res.lastInsertRowid };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Update a shift (Owner/Admin only)
  ipcMain.handle('shifts:update', async (_e, { token, shiftId, updates }) => {
    try {
      requireOwnerOrAdmin(token);
      const allowed = ['profile_id', 'user_id', 'day_of_week', 'start_time', 'end_time', 'owner_timezone', 'notes'];
      const sets = [];
      const params = [];

      for (const k of allowed) {
        if (updates[k] !== undefined) {
          sets.push(`${k} = ?`);
          params.push(updates[k]);
        }
      }

      if (sets.length === 0) return { ok: true };

      params.push(shiftId);
      const db = getDb();
      ensureShiftsTable();
      db.prepare(`UPDATE shifts SET ${sets.join(', ')} WHERE id = ?`).run(...params);

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Delete a shift (Owner/Admin only)
  ipcMain.handle('shifts:delete', async (_e, { token, shiftId }) => {
    try {
      requireOwnerOrAdmin(token);
      const db = getDb();
      ensureShiftsTable();
      db.prepare('DELETE FROM shifts WHERE id = ?').run(shiftId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

module.exports = register;
