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
  const { platform, profileName } = context;

  console.log('[Initial Navigation] Starting for platform:', platform);
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

    const homeUrl = homePages[platform] || homePages.reddit;
    const domainKeyword = platform === 'reddit' ? 'reddit.com' : platform === 'x' ? 'x.com' : platform;

    // Pick or create target page without overwriting past history tabs
    let targetPage = page;
    if (browserContext && typeof browserContext.pages === 'function') {
      const pages = browserContext.pages();
      const existingPage = pages.find(p => {
        try { return p.url().includes(domainKeyword); } catch { return false; }
      });

      if (existingPage) {
        console.log('[Initial Navigation] Found existing platform tab, bringing to front:', existingPage.url());
        await existingPage.bringToFront().catch(() => {});
        return { success: true, url: existingPage.url(), platform };
      }

      const blankPage = pages.find(p => {
        try {
          const u = p.url();
          return !u || u === 'about:blank' || u.startsWith('chrome://');
        } catch { return false; }
      });

      if (blankPage) {
        targetPage = blankPage;
      } else if (pages.length > 0) {
        console.log('[Initial Navigation] Preserving past history tabs, opening platform in new tab');
        targetPage = await browserContext.newPage();
      }
    }

    console.log('[Initial Navigation] Navigating to:', homeUrl);
    await targetPage.goto(homeUrl, { waitUntil: 'domcontentloaded' });
    await targetPage.bringToFront().catch(() => {});

    console.log('[Initial Navigation] ✅ Navigation complete for:', platform);
    return {
      success: true,
      url: homeUrl,
      platform
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
