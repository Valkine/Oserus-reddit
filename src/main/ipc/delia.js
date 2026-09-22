const https = require('https');
const crypto = require('crypto');
const os = require('os');
const { getDb } = require('../db');

const DELIA_API_KEY = 'del_sec_2bd77a_15279f204d4545804839060d24aa930122de1d1e7a';

function getMachineHwid() {
  if (process.env.DELIA_HWID) return process.env.DELIA_HWID;
  const raw = `${os.hostname()}-${os.arch()}-${os.cpus()[0]?.model || 'cpu'}-${os.userInfo().username}`;
  return 'HWID-' + crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function verifyWithDelia(license, deviceId) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      apiKey: DELIA_API_KEY,
      license: license.trim(),
      deviceId: deviceId || getMachineHwid(),
    });

    const req = https.request('https://deliadevelopment.com/api/v1/license/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'OserusManagement/0.86.22 (DeliaAuth)',
      },
      timeout: 10000,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.success && parsed.status === 'active' && parsed.authSig) {
            resolve({ ok: true, ...parsed });
          } else {
            resolve({
              ok: false,
              code: parsed.code || 'INVALID_LICENSE',
              error: parsed.message || 'License verification rejected',
            });
          }
        } catch {
          resolve({ ok: false, error: 'Malformed response from Delia licensing server' });
        }
      });
    });

    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Licensing server timed out' }); });
    req.write(payload);
    req.end();
  });
}

function register(ipcMain) {
  ipcMain.handle('delia:getStatus', () => {
    const hwid = getMachineHwid();
    const envSig = process.env.DELIA_AUTH_SIG || null;
    const envLicense = process.env.DELIA_LICENSE || null;

    let cachedLicense = envLicense;
    try {
      const row = getDb().prepare("SELECT value FROM app_settings WHERE key = 'delia_license'").get();
      if (row?.value) cachedLicense = row.value;
    } catch {}

    return {
      ok: true,
      hwid,
      isLicensed: !!envSig || !!cachedLicense,
      license: cachedLicense ? `${cachedLicense.slice(0, 4)}••••••••${cachedLicense.slice(-4)}` : null,
      authSig: envSig,
    };
  });

  ipcMain.handle('delia:activate', async (_e, { license }) => {
    if (!license || !license.trim()) {
      return { ok: false, error: 'License key is required' };
    }
    const hwid = getMachineHwid();
    const result = await verifyWithDelia(license, hwid);
    if (result.ok) {
      process.env.DELIA_AUTH_SIG = result.authSig;
      process.env.DELIA_LICENSE = license.trim();
      try {
        getDb().prepare(`
          INSERT INTO app_settings (key, value, updated_at)
          VALUES ('delia_license', ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `).run(license.trim());
      } catch {}
    }
    return result;
  });
}

module.exports = register;
