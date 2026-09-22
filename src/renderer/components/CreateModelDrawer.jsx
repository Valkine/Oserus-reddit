import React, { useState } from 'react';
import AccountRowInput from './AccountRowInput.jsx';
import BulkPasteParser from './BulkPasteParser.jsx';
import { useToast } from '../lib/toast.jsx';

const COLORS = ['#c8553d', '#d4a64a', '#22c55e', '#5a7a9a', '#9a5a8e', '#8e6a4a'];

export default function CreateModelDrawer({
  platforms = [],
  users = [],
  proxies = [],
  activeTeamId,
  token,
  onClose,
  onCreated,
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState('guided'); // 'guided' | 'bulk'
  const [allowNoAccounts, setAllowNoAccounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Guided state
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [avatarColor, setAvatarColor] = useState(COLORS[1]); // #d4a64a
  const [brandVoice, setBrandVoice] = useState('');
  const [notes, setNotes] = useState('');
  const [proxyId, setProxyId] = useState('');
  const [browserMode] = useState('cloakmanager');

  const [guidedAccounts, setGuidedAccounts] = useState([
    { platform: 'onlyfans', username: '', password: '' },
  ]);

  // Bulk state
  const [bulkText, setBulkText] = useState('');
  const [bulkParsedAccounts, setBulkParsedAccounts] = useState([]);

  // Account row handlers for Guided mode
  function handleAddGuidedRow() {
    setGuidedAccounts((prev) => [
      ...prev,
      { platform: 'onlyfans', username: '', password: '' },
    ]);
  }

  function handleRemoveGuidedRow(index) {
    setGuidedAccounts((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUpdateGuidedRow(index, field, val) {
    setGuidedAccounts((prev) =>
      prev.map((acct, i) => (i === index ? { ...acct, [field]: val } : acct))
    );
  }

  // Filter manager users (manager | admin | owner)
  const managerUsers = users.filter((u) =>
    ['owner', 'admin', 'manager'].includes(u.role)
  );

  // Compute validation
  const effectiveAccounts =
    tab === 'bulk'
      ? bulkParsedAccounts
      : guidedAccounts.filter((a) => a.username && a.username.trim());

  const hasName = !!name.trim();
  const isAccountsValid = allowNoAccounts || effectiveAccounts.length > 0;
  const isSubmitDisabled = !hasName || !isAccountsValid || submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Model name is required');
      return;
    }
    if (!allowNoAccounts && effectiveAccounts.length === 0) {
      setError('Please add at least one account, or check "Create model without initial accounts"');
      return;
    }

    setSubmitting(true);
    setError(null);

    // Normalize accounts payload
    const normalizedAccounts = effectiveAccounts.map((a) => ({
      platform: (a.platform || 'onlyfans').toLowerCase(),
      username: a.username.trim().replace(/^[@u/]+/, ''),
      password: a.password || '',
    }));

    try {
      const res = await window.api.profiles.createWithAccounts({
        token,
        name: name.trim(),
        assignedUserId: assignedUserId ? Number(assignedUserId) : null,
        niche: niche ? niche.trim() : null,
        brandVoice: brandVoice ? brandVoice.trim() : null,
        notes: notes ? notes.trim() : null,
        avatarColor,
        proxyId: proxyId ? Number(proxyId) : null,
        teamId: activeTeamId,
        browserMode,
        accounts: normalizedAccounts,
      });

      if (!res.ok) {
        setError(res.error || 'Failed to create model profile');
        setSubmitting(false);
        return; // Keep drawer open, do not clear fields
      }

      toast('ok', `Model "${name.trim()}" created with ${normalizedAccounts.length} account(s)!`);
      onCreated && onCreated(res);
      onClose && onClose();
    } catch (err) {
      setError(err.message || 'An error occurred while creating the model');
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-elev, #18191c)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text-0)' }}>
              ✨ New Model Profile
            </h3>
            <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>
              Configure a model and link its initial platform accounts in a single step.
            </div>
          </div>

          {/* Tab Switcher: Guided vs Bulk Paste */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-1)',
              padding: 3,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              className="ghost"
              onClick={() => setTab('guided')}
              style={{
                fontSize: 11,
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                background: tab === 'guided' ? 'var(--gold, #d4a64a)' : 'transparent',
                color: tab === 'guided' ? '#111' : 'var(--text-2)',
                fontWeight: tab === 'guided' ? 700 : 400,
              }}
            >
              🪄 Guided
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setTab('bulk')}
              style={{
                fontSize: 11,
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                background: tab === 'bulk' ? 'var(--gold, #d4a64a)' : 'transparent',
                color: tab === 'bulk' ? '#111' : 'var(--text-2)',
                fontWeight: tab === 'bulk' ? 700 : 400,
              }}
            >
              📋 Bulk Paste
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--danger, #ef4444)',
              color: 'var(--danger-fg, #ef4444)',
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Identity Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Model Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Luna"
                required
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Niche (Optional)</label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. Cosplay, Fitness, Alt"
                style={{ fontSize: 12 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Assigned Manager</label>
              <select
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                style={{ fontSize: 12 }}
              >
                <option value="">Unassigned</option>
                {managerUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Model Proxy</label>
              <select
                value={proxyId}
                onChange={(e) => setProxyId(e.target.value)}
                style={{ fontSize: 12 }}
              >
                <option value="">Direct (No proxy)</option>
                {proxies.map((px) => (
                  <option key={px.id} value={px.id}>
                    {px.label || `${px.host}:${px.port}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Avatar Color Picker */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600 }}>Avatar Color (Default #d4a64a)</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: c,
                    cursor: 'pointer',
                    border: avatarColor === c ? '2px solid #fff' : '2px solid transparent',
                    boxShadow: avatarColor === c ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* TAB 1: Guided Accounts Input */}
          {tab === 'guided' && (
            <div
              style={{
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '12px 14px',
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
                  Platform Accounts ({guidedAccounts.length})
                </span>
                <button
                  type="button"
                  className="ghost"
                  onClick={handleAddGuidedRow}
                  style={{ fontSize: 11, padding: '3px 8px' }}
                >
                  + Add Account Row
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {guidedAccounts.map((acct, idx) => (
                  <AccountRowInput
                    key={idx}
                    account={acct}
                    index={idx}
                    platforms={platforms}
                    onChange={handleUpdateGuidedRow}
                    onRemove={handleRemoveGuidedRow}
                    showRemove={guidedAccounts.length > 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Bulk Paste Parser */}
          {tab === 'bulk' && (
            <BulkPasteParser
              text={bulkText}
              onChangeText={setBulkText}
              platforms={platforms}
              parsedAccounts={bulkParsedAccounts}
              onParsedAccountsChange={setBulkParsedAccounts}
            />
          )}

          {/* Brand Voice (Optional) */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600 }}>Brand Voice & Instructions (Optional)</label>
            <textarea
              rows={2}
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              placeholder="Persona guidelines, dos and don'ts..."
              style={{ fontSize: 12 }}
            />
          </div>

          {/* Option: Create without accounts */}
          <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="allowNoAccounts"
              checked={allowNoAccounts}
              onChange={(e) => setAllowNoAccounts(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="allowNoAccounts" style={{ fontSize: 12, color: 'var(--text-1)', cursor: 'pointer', margin: 0 }}>
              Create model without initial accounts (accounts can be added later in Model Settings)
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary"
              disabled={isSubmitDisabled}
              style={{ fontWeight: 600 }}
            >
              {submitting ? 'Creating Model…' : 'Create & Ready Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
