import React, { useMemo } from 'react';

export default function BulkPasteParser({
  text,
  onChangeText,
  platforms = [],
  parsedAccounts = [],
  onParsedAccountsChange,
}) {
  const platformKeys = useMemo(() => {
    return new Set(platforms.map((p) => (p.key || '').toLowerCase()));
  }, [platforms]);

  // Parse lines: platform_slug:username[:password]
  const parseResult = useMemo(() => {
    if (!text || !text.trim()) {
      return { accounts: [], errors: [] };
    }

    const lines = text.split(/\r?\n/);
    const accounts = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const raw = lines[i].trim();
      if (!raw || raw.startsWith('#')) continue;

      let parts = [];
      if (raw.includes(':')) {
        parts = raw.split(':');
      } else if (raw.includes('|')) {
        parts = raw.split('|');
      } else if (raw.includes(',')) {
        parts = raw.split(',');
      } else {
        parts = raw.split(/\s+/);
      }

      parts = parts.map((p) => p.trim());
      const slug = (parts[0] || '').toLowerCase().replace(/^[@u/]+/, '');
      const user = (parts[1] || '').replace(/^[@u/]+/, '');
      const pass = parts.slice(2).join(':').trim() || '';

      if (!slug || !user) {
        errors.push({
          line: lineNum,
          raw,
          error: 'Expected format: platform_slug:username[:password]',
        });
        continue;
      }

      // Check if known platform or valid slug format
      accounts.push({
        platform: slug,
        username: user,
        password: pass,
        line: lineNum,
      });
    }

    return { accounts, errors };
  }, [text, platformKeys]);

  // Sync with parent when parsed result changes
  React.useEffect(() => {
    onParsedAccountsChange && onParsedAccountsChange(parseResult.accounts);
  }, [parseResult.accounts, onParsedAccountsChange]);

  function handleRemoveChip(index) {
    const updated = [...parseResult.accounts];
    updated.splice(index, 1);
    onParsedAccountsChange && onParsedAccountsChange(updated);
  }

  return (
    <div
      style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-1)' }}>
          Paste Accounts (One per line)
        </span>
        <span className="dim mono" style={{ fontSize: 11 }}>
          Syntax: platform_slug:username[:password]
        </span>
      </div>

      <textarea
        rows={6}
        value={text}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={`onlyfans:luna_vip:SecretPass123\nfansly:luna_official\nx:luna_real:MyPassword\nreddit:u/luna_cosplay\ninstagram:luna_model`}
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 12,
          marginBottom: 10,
          lineHeight: 1.4,
        }}
      />

      {/* Parse Errors Diagnostic - Never silently dropped */}
      {parseResult.errors.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger, #ef4444)',
            color: 'var(--danger-fg, #ef4444)',
            fontSize: 11,
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            ⚠️ {parseResult.errors.length} Line Parse Error(s):
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {parseResult.errors.map((err, idx) => (
              <li key={idx}>
                Line {err.line}: &quot;<span style={{ fontFamily: 'monospace' }}>{err.raw}</span>&quot; — {err.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Live Preview Chips */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--gold, #d4a64a)',
            marginBottom: 8,
          }}
        >
          Parsed Accounts ({parseResult.accounts.length})
        </div>

        {parseResult.accounts.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {parseResult.accounts.map((acct, i) => (
              <span
                key={i}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    color: 'var(--gold, #d4a64a)',
                  }}
                >
                  {acct.platform}:
                </span>
                <span>@{acct.username}</span>
                {acct.password && (
                  <span style={{ opacity: 0.5, fontSize: 10 }}>• encrypted</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveChip(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 11,
                    color: 'var(--text-3)',
                  }}
                  title="Remove account"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="dim" style={{ fontSize: 11 }}>
            No accounts parsed yet. Paste lines above using the format shown.
          </div>
        )}
      </div>
    </div>
  );
}
