const { getDb, credentialVaultSet } = require('../db');
const { userFromToken, requireManagerOrAdmin, requireOwnerOrAdmin } = require('./auth');
const { hasPermission } = require('../permissions');
const { profileScopeClause } = require('../lib/assignments');


// Add proxy_id to model_profiles so a single proxy can be inherited by every
// account under a model. Account-level proxy_id still wins when set.
// Also create profile_assignments so multiple team members can be tied to one
// model with distinct roles (manager / chatter / coordinator / marketing).
function ensureProfileMigrations() {
  try {
    const cols = getDb().prepare("PRAGMA table_info(model_profiles)").all();
    if (!cols.some((c) => c.name === 'proxy_id')) {
      getDb().exec('ALTER TABLE model_profiles ADD COLUMN proxy_id INTEGER REFERENCES proxies(id) ON DELETE SET NULL');
    }
    if (!cols.some((c) => c.name === 'main_email')) {
      getDb().exec('ALTER TABLE model_profiles ADD COLUMN main_email TEXT');
    }
    if (!cols.some((c) => c.name === 'status')) {
      getDb().exec("ALTER TABLE model_profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
    }
  } catch {}
  try {
    getDb().exec(`
      CREATE TABLE IF NOT EXISTS profile_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL REFERENCES model_profiles(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'chatter' CHECK(role IN ('manager','chatter','coordinator','marketing')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(profile_id, user_id)
      );
    `);
  } catch {}
}

function listAssignments(profileId) {
  return getDb().prepare(
    `SELECT pa.id, pa.profile_id, pa.user_id, pa.role, pa.created_at,
            u.username, u.display_name
       FROM profile_assignments pa
       JOIN users u ON u.id = pa.user_id
      WHERE pa.profile_id = ?
      ORDER BY CASE pa.role WHEN 'manager' THEN 0 WHEN 'coordinator' THEN 1 WHEN 'chatter' THEN 2 ELSE 3 END,
               u.display_name`
  ).all(profileId);
}

function register(ipcMain) {
  ensureProfileMigrations();
  ipcMain.handle('profiles:list', (_e, { token, teamId }) => {
    try {
      const user = userFromToken(token);
      if (!user) return { ok: false, error: 'Not authenticated' };

      // Strict employee scoping: non-owners only see profiles they're assigned to.
      const scope = profileScopeClause(user, 'p');
      const whereSql = teamId ? `p.team_id = ? AND ${scope.sql}` : scope.sql;
      const whereParams = teamId ? [teamId, ...scope.params] : scope.params;
      const rows = getDb()
        .prepare(
          `SELECT p.*, u.display_name AS assigned_to_name, u.username AS assigned_to_username,
                  (SELECT COUNT(*) FROM reddit_accounts WHERE profile_id = p.id) AS account_count,
                  (SELECT COUNT(*) FROM reddit_accounts WHERE profile_id = p.id AND status IN ('ready', 'active')) AS ready_count
           FROM model_profiles p
           LEFT JOIN users u ON u.id = p.assigned_user_id
           WHERE ${whereSql}
           ORDER BY p.created_at DESC`
        )
        .all(...whereParams);

      for (const r of rows) {
        r.members = listAssignments(r.id);
        try {
          r.accounts = getDb().prepare(
            `SELECT a.id, a.username, a.platform, a.status,
                    COALESCE(p.label, a.platform) AS platform_name,
                    COALESCE(p.color, '#6366f1') AS brand_color
             FROM reddit_accounts a
             LEFT JOIN platforms p ON p.key = a.platform
             WHERE a.profile_id = ?
             ORDER BY a.platform, a.username`
          ).all(r.id);
        } catch {
          r.accounts = [];
        }
      }
      return { ok: true, profiles: rows };
    } catch (err) {
      console.error('Error in profiles:list:', err);
      return { ok: false, error: err.message, profiles: [] };
    }
  });

  ipcMain.handle('profiles:addMember', (_e, { token, profileId, userId, role }) => {
    try {
      requireOwnerOrAdmin(token);
      if (!role) throw new Error('Role required');
      const known = getDb().prepare("SELECT 1 FROM roles WHERE key = ? AND key != 'admin'").get(role);
      if (!known) throw new Error('Unknown role — create it in Roles first');
      getDb().prepare(
        `INSERT INTO profile_assignments (profile_id, user_id, role) VALUES (?,?,?)
         ON CONFLICT(profile_id, user_id) DO UPDATE SET role=excluded.role`
      ).run(profileId, userId, role);
      return { ok: true, members: listAssignments(profileId) };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle('profiles:removeMember', (_e, { token, profileId, userId }) => {
    try {
      requireOwnerOrAdmin(token);
      getDb().prepare('DELETE FROM profile_assignments WHERE profile_id=? AND user_id=?').run(profileId, userId);
      return { ok: true, members: listAssignments(profileId) };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle('profiles:setMemberRole', (_e, { token, profileId, userId, role }) => {
    try {
      requireOwnerOrAdmin(token);
      if (!role) throw new Error('Role required');
      const known = getDb().prepare("SELECT 1 FROM roles WHERE key = ? AND key != 'admin'").get(role);
      if (!known) throw new Error('Unknown role — create it in Roles first');
      getDb().prepare('UPDATE profile_assignments SET role=? WHERE profile_id=? AND user_id=?').run(role, profileId, userId);
      return { ok: true, members: listAssignments(profileId) };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle('profiles:create', async (_e, args) => {
    try {
      const { token, name, assignedUserId, niche, brandVoice, notes, avatarColor, teamId, browserMode } = args;
      requireOwnerOrAdmin(token);
      const mode = browserMode === 'electron' ? 'electron' : 'cloakmanager';
      const info = getDb()
        .prepare(
          'INSERT INTO model_profiles (name, assigned_user_id, niche, brand_voice, notes, avatar_color, team_id, browser_mode) VALUES (?,?,?,?,?,?,?,?)'
        )
        .run(name, assignedUserId || null, niche || null, brandVoice || null, notes || null, avatarColor || null, teamId || null, mode);

      let cmProfile;
      if (mode === 'cloakmanager') {
        // Actually provisions the shared CloakManager browser profile via
        // the CM API — a model with zero linked accounts still gets a real,
        // launchable instance, not just a name written to the database.
        const { ensureModelCmProfile } = require('./cloakmanager');
        cmProfile = await ensureModelCmProfile(info.lastInsertRowid, {});
      }

      return { ok: true, id: info.lastInsertRowid, cmProfile };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('profiles:createWithAccounts', async (_e, args) => {
    try {
      const { token, name, assignedUserId, niche, brandVoice, notes, avatarColor, proxyId, teamId, browserMode, accounts } = args;
      const user = userFromToken(token);
      if (!user) throw new Error('Not authenticated');
      requireOwnerOrAdmin(token);

      if (!name || !name.trim()) throw new Error('Model name is required');

      const mode = browserMode === 'electron' ? 'electron' : 'cloakmanager';
      const db = getDb();

      const txn = db.transaction(() => {
        // 1. Create model profile
        const mInfo = db.prepare(
          `INSERT INTO model_profiles (name, assigned_user_id, niche, brand_voice, notes, avatar_color, proxy_id, team_id, browser_mode)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          name.trim(),
          assignedUserId ? Number(assignedUserId) : null,
          niche ? niche.trim() : null,
          brandVoice ? brandVoice.trim() : null,
          notes ? notes.trim() : null,
          avatarColor || null,
          proxyId ? Number(proxyId) : null,
          teamId || null,
          mode
        );

        const profileId = mInfo.lastInsertRowid;
        const createdAccounts = [];

        // 2. Insert designated accounts
        if (Array.isArray(accounts) && accounts.length > 0) {
          const insertAcct = db.prepare(`
            INSERT INTO reddit_accounts
            (profile_id, platform, username, partition_key, status, proxy_id, team_id)
            VALUES (?, ?, ?, ?, 'ready', ?, ?)
          `);

          for (const a of accounts) {
            const cleanUser = (a.username || '').trim().replace(/^[@u/]+/, '');
            if (!cleanUser) continue;
            const platform = (a.platform || 'reddit').toLowerCase();
            const partKey = `${platform}_${cleanUser.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

            const aInfo = insertAcct.run(
              profileId,
              platform,
              cleanUser,
              partKey,
              proxyId ? Number(proxyId) : null,
              teamId || null
            );
            const acctId = aInfo.lastInsertRowid;

            if (a.password) {
              credentialVaultSet('account_password', acctId, a.password);
            }
            createdAccounts.push({ id: acctId, platform, username: cleanUser });
          }
        }

        return { profileId, createdAccounts };
      });

      const { profileId, createdAccounts } = txn();

      let cmProfile = null;
      if (mode === 'cloakmanager') {
        try {
          const { ensureModelCmProfile } = require('./cloakmanager');
          cmProfile = await ensureModelCmProfile(profileId, {});
        } catch (cmErr) {
          console.warn('[profiles] Failed to provision CM profile in createWithAccounts:', cmErr.message);
        }
      }

      return {
        ok: true,
        id: profileId,
        accountCount: createdAccounts.length,
        createdAccounts,
        cmProfile
      };
    } catch (err) {
      console.error('[profiles] createWithAccounts failed:', err);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('profiles:update', async (_e, { token, profileId, updates, teamId }) => {
    try {
      const user = userFromToken(token);
      if (!user) throw new Error('Not authenticated');

      const isOwnerOrAdmin = user.role === 'owner' || user.role === 'admin';
      const current = getDb().prepare('SELECT * FROM model_profiles WHERE id = ?').get(profileId);
      if (!current) throw new Error('Profile not found');

      // Authorization: owner, admin, or the assigned manager of this profile
      const isAssignedManager = current.assigned_user_id === user.id;
      if (!isOwnerOrAdmin && !isAssignedManager) {
        throw new Error('Not authorized to update this model');
      }

      const allowed = ['name', 'assigned_user_id', 'niche', 'brand_voice', 'notes', 'avatar_color', 'proxy_id', 'main_email', 'status'];
      const sets = [], params = [];

      // Validate model lifecycle status transitions if status is changing
      if (updates.status !== undefined) {
        const nextStatus = updates.status;
        if (!['active', 'paused', 'archived'].includes(nextStatus)) {
          throw new Error('Invalid status: must be active, paused, or archived');
        }
        const curStatus = current.status || 'active';
        if (curStatus === 'archived' && (nextStatus === 'active' || nextStatus === 'paused')) {
          if (!isOwnerOrAdmin) {
            throw new Error('Archived is terminal unless user role is owner or admin.');
          }
        }
      }

      for (const k of allowed) {
        if (updates[k] !== undefined) {
          sets.push(`${k} = ?`);
          params.push(updates[k]);
        }
      }

      // Handle browser_mode change
      let switchingToCm = false;
      if (updates.browser_mode !== undefined) {
        const mode = updates.browser_mode === 'cloakmanager' ? 'cloakmanager' : 'electron';
        sets.push('browser_mode = ?');
        params.push(mode);

        if (mode === 'cloakmanager') {
          switchingToCm = true;
        } else {
          // Switching to electron — clear CM profile name and clean up CM profile rows
          sets.push('cloak_profile_name = ?');
          params.push(null);
          try {
            getDb().prepare('DELETE FROM cloakmanager_profiles WHERE profile_id = ?').run(profileId);
          } catch (e) { console.warn('[profiles] CM profile cleanup skipped:', e?.message); }
        }
      }

      if (sets.length) {
        params.push(profileId);
        if (teamId) {
          params.push(teamId);
          getDb().prepare(`UPDATE model_profiles SET ${sets.join(', ')} WHERE id = ? AND team_id = ?`).run(...params);
        } else {
          getDb().prepare(`UPDATE model_profiles SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        }
      }

      let reprovisionForProxy = false;
      if (!switchingToCm && updates.proxy_id !== undefined) {
        const curMode = getDb().prepare('SELECT browser_mode FROM model_profiles WHERE id = ?').get(profileId);
        reprovisionForProxy = curMode?.browser_mode === 'cloakmanager';
      }

      let cmProfile;
      if (switchingToCm || reprovisionForProxy) {
        const { ensureModelCmProfile } = require('./cloakmanager');
        cmProfile = await ensureModelCmProfile(profileId, {});
      }

      return { ok: true, cmProfile };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('profiles:assign', (_e, { token, profileId, assignedUserId, teamId }) => {
    try {
      requireOwnerOrAdmin(token);
      if (teamId) {
        const result = getDb()
          .prepare('UPDATE model_profiles SET assigned_user_id = ? WHERE id = ? AND team_id = ?')
          .run(assignedUserId || null, profileId, teamId);
        if (!result.changes) throw new Error('Profile not found');
      } else {
        getDb()
          .prepare('UPDATE model_profiles SET assigned_user_id = ? WHERE id = ?')
          .run(assignedUserId || null, profileId);
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // WF-14: Assign User to Model in profile_assignments
  ipcMain.handle('profiles:assignUser', (_e, { token, profileId, userId, role, teamId }) => {
    try {
      const user = userFromToken(token);
      if (!user) throw new Error('Not authenticated');
      if (teamId && user.team_id !== teamId && user.role !== 'owner' && user.role !== 'admin') {
        throw new Error('Not authorized for this team');
      }
      const isOwnerOrAdmin = user.role === 'owner' || user.role === 'admin';
      const current = getDb().prepare('SELECT * FROM model_profiles WHERE id = ?').get(profileId);
      if (!current) throw new Error('Profile not found');
      if (!isOwnerOrAdmin && current.assigned_user_id !== user.id) {
        throw new Error('Not authorized to assign users to this model');
      }
      const targetUser = getDb().prepare('SELECT id, team_id FROM users WHERE id = ?').get(userId);
      if (!targetUser) throw new Error('User not found');
      if (teamId && targetUser.team_id && targetUser.team_id !== teamId && !isOwnerOrAdmin) {
        throw new Error('Target user is not in the same team');
      }
      const validRoles = ['manager', 'chatter', 'coordinator', 'marketing'];
      const targetRole = validRoles.includes(role) ? role : 'chatter';

      getDb().prepare(`
        INSERT INTO profile_assignments (profile_id, user_id, role)
        VALUES (?, ?, ?)
        ON CONFLICT(profile_id, user_id) DO UPDATE SET role = excluded.role
      `).run(profileId, userId, targetRole);

      return { ok: true, members: listAssignments(profileId) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // WF-15: Unassign User from Model in profile_assignments
  ipcMain.handle('profiles:unassignUser', (_e, { token, profileId, userId, teamId }) => {
    try {
      const user = userFromToken(token);
      if (!user) throw new Error('Not authenticated');
      if (teamId && user.team_id !== teamId && user.role !== 'owner' && user.role !== 'admin') {
        throw new Error('Not authorized for this team');
      }
      const isOwnerOrAdmin = user.role === 'owner' || user.role === 'admin';
      const current = getDb().prepare('SELECT * FROM model_profiles WHERE id = ?').get(profileId);
      if (!current) throw new Error('Profile not found');
      if (!isOwnerOrAdmin && current.assigned_user_id !== user.id) {
        throw new Error('Not authorized to unassign users from this model');
      }

      getDb().prepare('DELETE FROM profile_assignments WHERE profile_id = ? AND user_id = ?').run(profileId, userId);
      return { ok: true, members: listAssignments(profileId) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('profiles:delete', (_e, { token, profileId }) => {
    try {
      requireOwnerOrAdmin(token);
      const result = getDb().prepare('DELETE FROM model_profiles WHERE id = ?').run(profileId).changes;
      if (!result) throw new Error('Profile not found');
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

module.exports = register;
