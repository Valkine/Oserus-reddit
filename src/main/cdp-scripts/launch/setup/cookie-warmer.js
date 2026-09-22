/**
 * Cookie Warmer Script (Native Playwright)
 *
 * Visits popular sites to build a natural cookie profile and browser
 * fingerprint history. This reduces CAPTCHA triggers on first use by
 * establishing a realistic browsing pattern.
 *
 * Runs once per profile — cookies persist in the CloakManager profile store.
 *
 * @category launch.setup
 * @platform all
 * @timeout 60000
 * @requires ['cdpConnection']
 */

const metadata = {
  id: 'launch/setup/cookie-warmer',
  name: 'Cookie Warmer',
  platform: 'all',
  category: 'launch.setup',
  timeout: 60000,
  requires: ['cdpConnection'],
  nativeMode: true,
  version: '1.0.0',
  description: 'Visits popular sites to build natural cookie profile and avoid CAPTCHA'
};

/**
 * Execute cookie warmer
 *
 * @param {Object} nativeConnection - Native Playwright objects { page, context, browser }
 * @param {Object} context - Execution context with { accountId, platform }
 * @returns {Promise<Object>} Warm-up result
 */
async function execute(nativeConnection, context) {
  const { page, context: browserContext } = nativeConnection;
  const { accountId } = context;

  console.log('[Cookie Warmer] Starting background cookie warm-up for account:', accountId);

  let targetPage = page;
  let isDedicatedBackgroundPage = false;

  // Spawn a dedicated background page in the shared context so warming occurs
  // silently without stealing focus or redirecting the operator's active tab.
  if (browserContext && typeof browserContext.newPage === 'function') {
    try {
      targetPage = await browserContext.newPage();
      isDedicatedBackgroundPage = true;
      console.log('[Cookie Warmer] Running in silent offscreen background page');
    } catch (e) {
      console.warn('[Cookie Warmer] Falling back to default page:', e.message);
      targetPage = page;
    }
  }

  try {
    const sites = [
      { name: 'Google',     url: 'https://www.google.com' },
      { name: 'Amazon',     url: 'https://www.amazon.com' },
      { name: 'Wikipedia',  url: 'https://www.wikipedia.org' },
      { name: 'GitHub',     url: 'https://www.github.com' },
      { name: 'Bing',       url: 'https://www.bing.com' },
      { name: 'eBay',       url: 'https://www.ebay.com' },
      { name: 'DuckDuckGo', url: 'https://www.duckduckgo.com' },
      { name: 'Twitch',     url: 'https://www.twitch.tv' },
    ];

    const visited = [];
    const failed = [];

    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      try {
        console.log(`[Cookie Warmer] ${i + 1}/${sites.length}: Background visiting ${site.name}...`);

        await targetPage.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        await sleep(600 + Math.random() * 800);

        await targetPage.evaluate(() => {
          window.scrollBy(0, 300 + Math.random() * 400);
        });

        await sleep(800 + Math.random() * 1200);

        visited.push(site.name);
        console.log(`[Cookie Warmer] ✅ ${site.name} visited (background)`);
      } catch (e) {
        console.error(`[Cookie Warmer] ❌ ${site.name} failed:`, e.message);
        failed.push({ name: site.name, url: site.url, error: e.message });
      }
    }

    console.log(`[Cookie Warmer] ✅ Complete: ${visited.length}/${sites.length} sites visited in background`);

    return {
      success: true,
      visited: visited.length,
      total: sites.length,
      failed: failed.length > 0 ? failed : undefined,
    };
  } catch (error) {
    console.error('[Cookie Warmer] ❌ Background warm-up failed:', error.message);
    throw error;
  } finally {
    if (isDedicatedBackgroundPage && targetPage && !targetPage.isClosed()) {
      try {
        await targetPage.close();
        console.log('[Cookie Warmer] Background worker page closed cleanly');
      } catch (closeErr) {
        console.warn('[Cookie Warmer] Non-fatal close error:', closeErr.message);
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  metadata,
  execute
};
