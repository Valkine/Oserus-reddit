/**
 * Reddit Auto-Login Script (Native Playwright)
 *
 * Automatically logs into Reddit using stored credentials.
 * Handles both the old and new Reddit login interfaces.
 * Uses native Playwright for better locators, auto-waiting, and reliability.
 *
 * @category launch.authentication
 * @platform reddit
 * @timeout 30000
 * @requires ['cdpConnection', 'credentials']
 */

const metadata = {
  id: 'launch/authentication/reddit-login',
  name: 'Reddit Auto-Login',
  platform: 'reddit',
  category: 'launch.authentication',
  timeout: 60000,  // Increased from 30s to 60s for slow page loads
  requires: ['cdpConnection', 'credentials'],
  nativeMode: true,  // NEW: Use native Playwright API
  version: '2.0.1',
  description: 'Reddit login with native Playwright API (better locators, auto-waiting, humanization)',
  // This step needs one specific account's credentials — on a model-level
  // CloakManager profile shared by accounts on several platforms, it only
  // runs when the launch was targeted at a Reddit account, never on a
  // generic model-level launch or for a sibling account on another platform.
  accountScoped: true,
};

/**
 * Execute Reddit auto-login
 *
 * @param {Object} nativeConnection - Native Playwright objects { page, context, browser }
 * @param {Object} context - Execution context with { accountId, credentials, platform }
 * @returns {Promise<Object>} Login result
 */
async function execute(nativeConnection, context) {
  const { page: initialPage, context: browserContext } = nativeConnection;
  const { credentials, accountId, platform } = context;

  console.log('[Reddit Login] Starting auto-login for account:', accountId);
  console.log('[Reddit Login] Using native Playwright API');

  // Pick or create target page without overwriting past history tabs
  let page = initialPage;
  if (browserContext && typeof browserContext.pages === 'function') {
    const pages = browserContext.pages();
    const redditPage = pages.find(p => {
      try { return p.url().includes('reddit.com'); } catch { return false; }
    });
    if (redditPage) {
      page = redditPage;
    } else {
      const blankPage = pages.find(p => {
        try {
          const u = p.url();
          return !u || u === 'about:blank' || u.startsWith('chrome://');
        } catch { return false; }
      });
      if (blankPage) {
        page = blankPage;
      } else if (pages.length > 0) {
        console.log('[Reddit Login] Preserving past history tabs, opening login in new tab');
        page = await browserContext.newPage();
      }
    }
  }

  await sleep(100);

  try {
    if (!credentials || !credentials.username) {
      console.log('[Reddit Login] No username available for login, skipping');
      return { success: true, skipped: true, reason: 'no_credentials' };
    }

    if (!credentials.password) {
      console.log('[Reddit Login] No password available for user:', credentials.username);
      if (!page.url().includes('reddit.com')) {
        await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
      return { success: true, skipped: true, reason: 'no_password', username: credentials.username };
    }

    console.log('[Reddit Login] Proceeding with login for user:', credentials.username);

    // Only navigate to login if not already on Reddit
    if (!page.url().includes('reddit.com')) {
      await page.goto('https://www.reddit.com/login/', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      }).catch(err => {
        console.warn('[Reddit Login] Warning on goto login:', err.message);
      });
    }

    // Check if already logged in using resilient locator
    const logoutButton = page.getByTestId('logout-button');
    const logoutCount = await logoutButton.count().catch(() => 0);

    if (logoutCount > 0) {
      console.log('[Reddit Login] Already logged in');
      return {
        success: true,
        alreadyLoggedIn: true,
        skipped: true,
        username: credentials.username
      };
    }

    console.log('[Reddit Login] Not logged in, proceeding with login flow...');

    // Pierce open shadow roots (e.g. <faceplate-text-input>) using Oserus autofill engine
    try {
      const { buildAutofillScript } = require('../../../autofill');
      const scriptStr = buildAutofillScript(JSON.stringify(credentials.username), JSON.stringify(credentials.password));
      await page.evaluate(scriptStr).catch(() => {});
    } catch (e) {
      console.warn('[Reddit Login] Autofill helper notice:', e.message);
    }

    // Wait for login form fields
    const usernameField = page.locator('input[name="username"], input#login-username').first();
    const passwordField = page.locator('input[name="password"], input#login-password').first();

    const uFound = await usernameField.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (uFound) {
      await usernameField.fill(credentials.username);
      await sleep(100);
    }

    const pFound = await passwordField.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
    if (pFound) {
      await passwordField.fill(credentials.password);
      await sleep(100);
    }

    console.log('[Reddit Login] Credentials entered, finding submit button...');

    // Find and click login button
    const loginButton = page.locator('button.login').or(
      page.locator('button[type="submit"]')
    ).or(
      page.locator('button:has-text("Log In")')
    ).first();

    const btnVisible = await loginButton.waitFor({ state: 'visible', timeout: 4000 }).then(() => true).catch(() => false);
    if (btnVisible) {
      await loginButton.click().catch(() => {});
    }

    console.log('[Reddit Login] Login form submitted, waiting for navigation...');

    // Wait for navigation or response
    await page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {});

    // Check if we're on 2FA page
    const otpPage = page.locator('input[name="appOtp"], input[name="backupOtp"]');
    const otpCount = await otpPage.count().catch(() => 0);

    if (otpCount > 0) {
      console.log('[Reddit Login] ⚠️ 2FA required — needs a human');
      // Throw (don't return) so the executor classifies this as a
      // non-retryable TwoFactorRequired and flags the account.
      throw new Error('two_factor_required: Reddit is asking for a 2FA code for ' + credentials.username);
    }

    // Wait for potential redirect
    await sleep(1500);

    // Check if we're still on login page
    const stillOnLogin = page.url().includes('/login');
    if (stillOnLogin) {
      // Check for error messages
      const errorBanner = page.locator('[role="alert"], .error, [class*="error"]').first();
      const errorVisible = await errorBanner.isVisible().catch(() => false);

      if (errorVisible) {
        const errorText = await errorBanner.textContent().catch(() => '');
        const errorMessage = errorText || 'Unknown error';

        const isIncorrectPassword = errorMessage.toLowerCase().includes('incorrect') ||
                                   errorMessage.toLowerCase().includes('wrong') ||
                                   errorMessage.toLowerCase().includes('password') ||
                                   errorMessage.toLowerCase().includes('username');

        if (isIncorrectPassword) {
          throw new Error('INCORRECT_CREDENTIALS: Login failed - ' + errorMessage);
        }

        console.warn(`[Reddit Login] Form note: ${errorMessage}`);
      }

      console.log('[Reddit Login] ✅ Credentials entered into login form');
      return {
        success: true,
        credentialsFilled: true,
        username: credentials.username,
      };
    }

    // Verify login success by checking for logged-in indicators
    // Try multiple selectors for different Reddit UI states
    const verifyButton = page.getByTestId('logout-button');
    const verifyCount = await verifyButton.count();

    if (verifyCount === 0) {
      // Also check alternative logout indicators
      const altLogoutButton = page.locator('button[aria-label="Log out"], button:has-text("Log out"), [id*="logout"]');
      const altCount = await altLogoutButton.count();

      if (altCount === 0) {
        // Check if we're on home page (logged in)
        const onHomePage = page.url().match(/reddit\.com\/?(\?.*)?$/) ||
                          page.url().includes('/hot') ||
                          page.url().includes('/popular');

        if (onHomePage) {
          console.log('[Reddit Login] ✅ Login successful (redirected to home)');
          return {
            success: true,
            username: credentials.username,
            alreadyLoggedIn: false,
            verified: true
          };
        }

        throw new Error('Login verification failed - no logout indicators found');
      }
    }

    console.log('[Reddit Login] ✅ Login successful for user:', credentials.username);
    return {
      success: true,
      username: credentials.username,
      alreadyLoggedIn: false,
      verified: true
    };

  } catch (error) {
    console.error('[Reddit Login] ❌ Auto-login failed:', error.message);
    throw error;
  }
}

/**
 * Sleep utility for delays
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  metadata,
  execute
};
