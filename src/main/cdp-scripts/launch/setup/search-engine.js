/**
 * Search Engine Setup Script (Native Playwright)
 *
 * Configures Google as the default Omnibox search engine via Chromium's internal WebUI.
 * Fixes the Ungoogled Chromium bug where typing search terms into the Omnibox / address bar
 * attempts to navigate to http://{searchTerms} instead of performing a search.
 *
 * @category launch.setup
 * @platform all
 * @timeout 15000
 * @requires ['cdpConnection']
 */

const metadata = {
  id: 'launch/setup/search-engine',
  name: 'Search Engine Setup',
  platform: 'all',
  category: 'launch.setup',
  timeout: 15000,
  requires: ['cdpConnection'],
  nativeMode: true,
  version: '1.0.0',
  description: 'Ensure Google search is the default search engine in the Omnibox'
};

/**
 * Execute search engine setup
 *
 * @param {Object} nativeConnection - Native Playwright objects { page, context, browser }
 * @param {Object} context - Execution context with { accountId, platform, profileName }
 * @returns {Promise<Object>} Setup result
 */
async function execute(nativeConnection, context) {
  const browserContext = nativeConnection.context || (nativeConnection.page && nativeConnection.page.context());
  if (!browserContext) {
    console.log('[Search Engine Setup] No browser context available, skipping');
    return { skipped: true, reason: 'No browser context' };
  }

  console.log('[Search Engine Setup] Checking / configuring default search engine...');

  const settingsPage = await browserContext.newPage();
  try {
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

    console.log('[Search Engine Setup] Result:', result);
    return { success: true, result };
  } catch (error) {
    console.warn('[Search Engine Setup] Warning during setup:', error.message);
    return { success: false, error: error.message };
  } finally {
    await settingsPage.close().catch(() => {});
  }
}

module.exports = {
  metadata,
  execute
};
