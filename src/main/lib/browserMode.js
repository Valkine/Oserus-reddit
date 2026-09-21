const { getDb } = require('../db');
const { getDefaultProfileName } = require('./profileName');

/**
 * Resolve the effective browser mode for an account.
 *
 * Reads browser_mode from model_profiles (the single source of truth).
 * If the model is set to 'cloakmanager', checks for a per-account
 * cloak_profile_override before falling back to the model's default
 * cloak_profile_name.
 *
 * @param {number} accountId
 * @returns {{ mode: 'electron'|'cloakmanager', profileName: string|null }}
 */
function resolveBrowserMode(accountId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT mp.id AS model_id, mp.name AS model_name,
           mp.browser_mode, mp.cloak_profile_name AS model_cm_name,
           bs.cloak_profile_override
    FROM reddit_accounts ra
    JOIN model_profiles mp ON mp.id = ra.profile_id
    LEFT JOIN account_browser_settings bs ON bs.account_id = ra.id
    WHERE ra.id = ?
  `).get(accountId);

  if (!row || !row.browser_mode || row.browser_mode === 'electron') {
    return { mode: 'electron', profileName: null };
  }

  // cloakmanager mode — account override wins, else model default
  let profileName = row.cloak_profile_override || row.model_cm_name;
  if (!profileName && row.model_id) {
    profileName = getDefaultProfileName({ id: row.model_id, name: row.model_name });
    try {
      db.prepare('UPDATE model_profiles SET cloak_profile_name = ? WHERE id = ?').run(profileName, row.model_id);
    } catch { /* non-fatal */ }
  }

  return { mode: 'cloakmanager', profileName: profileName || null };
}

module.exports = { resolveBrowserMode };

