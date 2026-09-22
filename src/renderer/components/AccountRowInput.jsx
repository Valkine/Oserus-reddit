import React from 'react';

export default function AccountRowInput({
  account,
  index,
  platforms = [],
  onChange,
  onRemove,
  showRemove = true,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '150px 1fr 1fr 32px',
        gap: 8,
        alignItems: 'center',
        background: 'var(--bg-2)',
        padding: '6px 10px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Platform Dropdown */}
      <select
        value={account.platform || 'onlyfans'}
        onChange={(e) => onChange(index, 'platform', e.target.value)}
        style={{ fontSize: 12, padding: '4px 8px' }}
      >
        {platforms.map((p) => (
          <option key={p.id || p.key} value={p.key}>
            {p.label || p.key}
          </option>
        ))}
      </select>

      {/* Username */}
      <input
        type="text"
        value={account.username || ''}
        onChange={(e) => onChange(index, 'username', e.target.value)}
        placeholder="Username / Handle"
        style={{ fontSize: 12, padding: '4px 8px' }}
      />

      {/* Password (masked) */}
      <input
        type="password"
        value={account.password || ''}
        onChange={(e) => onChange(index, 'password', e.target.value)}
        placeholder="Password (encrypted)"
        style={{ fontSize: 12, padding: '4px 8px' }}
      />

      {/* Remove Button */}
      {showRemove ? (
        <button
          type="button"
          className="ghost"
          onClick={() => onRemove(index)}
          style={{
            color: 'var(--danger-fg, #ef4444)',
            padding: 0,
            height: 26,
            width: 26,
            display: 'grid',
            placeItems: 'center',
            fontSize: 14,
          }}
          title="Remove account row"
        >
          ✕
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}
