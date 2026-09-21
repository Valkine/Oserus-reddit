/**
 * Initial Navigation Script (Native Playwright)
 *
 * Navigates to the platform's home page after successful login.
 * Handles platform-specific URL routing and waits for page load.
 *
 * @category launch.navigation
 * @platform all
 * @timeout 15000
 * @requires ['cdpConnection']
 */

const metadata = {
  id: 'launch/navigation/initial',
  name: 'Initial Navigation',
  platform: 'all',
  category: 'launch.navigation',
  timeout: 15000,
  requires: ['cdpConnection'],
  nativeMode: true,  // NEW: Use native Playwright API
  version: '2.0.0',
  description: 'Navigate to platform home page after login (native Playwright)'
};

/**
 * Execute initial navigation to platform home
 *
 * @param {Object} nativeConnection - Native Playwright objects { page, context, browser }
 * @param {Object} context - Execution context with { platform, accountId, profileName }
 * @returns {Promise<Object>} Navigation result
 */
async function execute(nativeConnection, context) {
  const { page, context: browserContext } = nativeConnection;
  const { platform, profileName, modelAccounts } = context;

  console.log('[Initial Navigation] Starting for platform:', platform, 'modelAccounts:', modelAccounts?.length ?? 0);
  console.log('[Initial Navigation] Using native Playwright API');

  try {
    // Platform home pages
    const homePages = {
      reddit: 'https://www.reddit.com/',
      x: 'https://x.com/home',
      instagram: 'https://www.instagram.com/',
      tiktok: 'https://www.tiktok.com/foryou',
      redgifs: 'https://www.redgifs.com/'
    };

    const targetPlatforms = [];
    if (modelAccounts && modelAccounts.length > 0) {
      for (const acc of modelAccounts) {
        const p = acc.platform || 'reddit';
        if (!targetPlatforms.includes(p)) targetPlatforms.push(p);
      }
    } else if (platform) {
      targetPlatforms.push(platform);
    } else {
      targetPlatforms.push('reddit');
    }

    const pages = browserContext && typeof browserContext.pages === 'function' ? browserContext.pages() : [page];

    for (let i = 0; i < targetPlatforms.length; i++) {
      const p = targetPlatforms[i];
      const homeUrl = homePages[p] || homePages.reddit;
      const domainKeyword = p === 'reddit' ? 'reddit.com' : p === 'x' ? 'x.com' : p;

      const existingPage = pages.find(pg => {
        try { return pg.url().includes(domainKeyword); } catch { return false; }
      });

      if (existingPage) {
        console.log(`[Initial Navigation] Found existing platform tab for ${p}, bringing to front:`, existingPage.url());
        await existingPage.bringToFront().catch(() => {});
        continue;
      }

      let targetPage = pages.find(pg => {
        try {
          const u = pg.url();
          return !u || u === 'about:blank' || u.startsWith('chrome://');
        } catch { return false; }
      });

      if (!targetPage) {
        if (browserContext && typeof browserContext.newPage === 'function') {
          targetPage = await browserContext.newPage();
          pages.push(targetPage);
        } else {
          targetPage = page;
        }
      }

      console.log(`[Initial Navigation] Navigating to ${p}:`, homeUrl);
      await targetPage.goto(homeUrl, { waitUntil: 'domcontentloaded' }).catch(err => {
        console.warn(`[Initial Navigation] Warning on goto ${homeUrl}:`, err.message);
      });
      await targetPage.bringToFront().catch(() => {});
    }

    console.log('[Initial Navigation] ✅ Navigation complete for platforms:', targetPlatforms);
    return {
      success: true,
      platforms: targetPlatforms
    };

  } catch (error) {
    console.error('[Initial Navigation] ❌ Navigation failed:', error.message);
    throw error;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  metadata,
  execute
};
