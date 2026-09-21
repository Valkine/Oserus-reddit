const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const Database = require('better-sqlite3');
const elog = require('electron-log');

/**
 * Returns the base data directory for CloakManager backend profiles.
 */
function getProfilesBaseDir() {
  const userData = app ? app.getPath('userData') : path.join(process.env.APPDATA || '', 'oserus-management');
  return path.join(userData, 'cloak-manager', 'backend-data', 'profiles');
}

/**
 * Ensures that a CloakManager Chromium profile:
 * 1. Has Google search configured instead of ungoogled-chromium's 'No Search' (http://{searchTerms} -> http://e bug)
 * 2. Has session restore enabled (restore_on_startup: 1) so past history and tabs are preserved
 *
 * @param {string} profileName
 */
function prepareProfile(profileName) {
  if (!profileName) return;

  try {
    const baseDir = getProfilesBaseDir();
    const profileDefaultDir = path.join(baseDir, profileName, 'Default');
    if (!fs.existsSync(profileDefaultDir)) {
      fs.mkdirSync(profileDefaultDir, { recursive: true });
    }

    // 1. Configure Preferences (Session Restore + Default Search Provider)
    const prefsPath = path.join(profileDefaultDir, 'Preferences');
    let prefs = {};
    if (fs.existsSync(prefsPath)) {
      try {
        prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
      } catch (e) {
        elog.warn(`[ProfilePrep] Failed to parse Preferences for ${profileName}, reinitializing:`, e.message);
        prefs = {};
      }
    }

    let modified = false;

    // Set restore_on_startup = 1 (restore previous session tabs)
    if (!prefs.session || prefs.session.restore_on_startup !== 1) {
      prefs.session = { ...(prefs.session || {}), restore_on_startup: 1 };
      modified = true;
    }

    // Set default search engine to Google
    const googleSearchData = {
      short_name: 'Google',
      keyword: 'google.com',
      url: 'https://www.google.com/search?q={searchTerms}',
      suggestions_url: 'https://www.google.com/complete/search?client=chrome&q={searchTerms}',
      favicon_url: 'https://www.google.com/favicon.ico',
      safe_for_autoreplace: true,
      is_active: 1,
      date_created: '13300000000000000',
      last_modified: '13300000000000000',
      prepopulate_id: 1,
      sync_guid: 'google_search_default',
    };

    if (!prefs.default_search_provider_data ||
        prefs.default_search_provider_data.template_url_data?.url !== googleSearchData.url) {
      prefs.default_search_provider_data = {
        template_url_data: googleSearchData,
      };
      modified = true;
    }

    if (modified || !fs.existsSync(prefsPath)) {
      fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), 'utf8');
      elog.info(`[ProfilePrep] Updated Preferences for ${profileName} (restore_on_startup=1, default_search=Google)`);
    }

    // 2. Configure Web Data SQLite database (replaces ungoogled-chromium prepopulate_id: 1 'No Search')
    const webDataPath = path.join(profileDefaultDir, 'Web Data');
    if (fs.existsSync(webDataPath)) {
      try {
        const db = new Database(webDataPath, { timeout: 3000 });
        const hasKeywords = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='keywords'").get();
        if (hasKeywords) {
          const row = db.prepare('SELECT id, short_name, url FROM keywords WHERE prepopulate_id = 1').get();
          if (row && (row.short_name !== 'Google' || !row.url.includes('google.com/search'))) {
            db.prepare(`
              UPDATE keywords
              SET short_name = 'Google',
                  keyword = 'google.com',
                  favicon_url = 'https://www.google.com/favicon.ico',
                  url = 'https://www.google.com/search?q={searchTerms}',
                  suggest_url = 'https://www.google.com/complete/search?client=chrome&q={searchTerms}'
              WHERE prepopulate_id = 1
            `).run();
            elog.info(`[ProfilePrep] Updated Web Data keywords for ${profileName} -> Google Search`);
          }
        }
        db.close();
      } catch (dbErr) {
        elog.warn(`[ProfilePrep] Could not patch Web Data for ${profileName} (database may be locked):`, dbErr.message);
      }
    }
  } catch (err) {
    elog.error(`[ProfilePrep] Failed preparing profile ${profileName}:`, err);
  }
}

/**
 * Checks if a profile already has Google search configured natively in Chromium.
 * @param {string} profileName
 * @returns {boolean}
 */
function isSearchConfigured(profileName) {
  if (!profileName) return false;
  try {
    const baseDir = getProfilesBaseDir();
    const prefsPath = path.join(baseDir, profileName, 'Default', 'Preferences');
    if (!fs.existsSync(prefsPath)) return false;
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    return !!(prefs.default_search_provider && prefs.default_search_provider.guid && !prefs.default_search_provider.reset_occurred);
  } catch (e) {
    return false;
  }
}

/**
 * Configure Google search engine via Chromium's internal WebUI (SearchEnginesBrowserProxyImpl).
 * Chromium itself signs the url_hash in SQLite Web Data and sets default_search_provider in Preferences.
 *
 * @param {import('playwright').BrowserContext} context
 * @param {string} profileName
 */
async function ensureGoogleSearchInBrowser(context, profileName) {
  if (!context) return;
  if (profileName && isSearchConfigured(profileName)) {
    return;
  }

  elog.info(`[ProfilePrep] Configuring Google search engine for ${profileName} via WebUI...`);
  let settingsPage = null;
  try {
    settingsPage = await context.newPage();
    await settingsPage.goto('chrome://settings/searchEngines', { timeout: 10000 });
    await settingsPage.waitForTimeout(1000);

    const result = await settingsPage.evaluate(async () => {
      try {
        const mod = await import('chrome://settings/settings.js');
        const proxy = mod.SearchEnginesBrowserProxyImpl.getInstance();

        let list = await proxy.getSearchEnginesList();
        const all = [...(list.defaults || []), ...(list.actives || []), ...(list.others || [])];
        let google = all.find(e => e.name === 'Google' || e.keyword === 'google.com');

        if (!google) {
          proxy.searchEngineEditStarted(-1);
          proxy.searchEngineEditCompleted(
            'Google',
            'google.com',
            'https://www.google.com/search?q=%s',
            'https://www.google.com/complete/search?client=chrome&q=%s'
          );
          await new Promise(r => setTimeout(r, 800));
          list = await proxy.getSearchEnginesList();
          const allAfter = [...(list.defaults || []), ...(list.actives || []), ...(list.others || [])];
          google = allAfter.find(e => e.name === 'Google' || e.keyword === 'google.com');
        }

        if (google && !google.default) {
          proxy.setDefaultSearchEngine(google.modelIndex, 1, false);
          await new Promise(r => setTimeout(r, 800));
        }

        return { ok: true, name: google?.name || 'Google', default: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });

    elog.info(`[ProfilePrep] Search engine config result for ${profileName}:`, result);
  } catch (err) {
    elog.warn(`[ProfilePrep] Non-fatal error configuring search engine for ${profileName}:`, err.message);
  } finally {
    if (settingsPage) {
      await settingsPage.close().catch(() => {});
    }
  }
}

/**
 * Scan all existing profiles and prepare them.
 */
function prepareAllProfiles() {
  try {
    const baseDir = getProfilesBaseDir();
    if (!fs.existsSync(baseDir)) return;
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        prepareProfile(entry.name);
      }
    }
  } catch (err) {
    elog.warn('[ProfilePrep] prepareAllProfiles error:', err.message);
  }
}

module.exports = {
  prepareProfile,
  prepareAllProfiles,
  getProfilesBaseDir,
  isSearchConfigured,
  ensureGoogleSearchInBrowser,
};
