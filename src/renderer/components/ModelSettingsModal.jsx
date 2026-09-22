import React, { useState } from 'react';
import { useToast } from '../lib/toast.jsx';

const COLORS = ['#c8553d', '#d4a64a', '#22c55e', '#5a7a9a', '#9a5a8e', '#8e6a4a'];
const ROLES = [
  { key: 'manager', label: 'Manager' },
  { key: 'chatter', label: 'Chatter' },
  { key: 'coordinator', label: 'Coordinator' },
  { key: 'marketing', label: 'Marketing' },
];

export default function ModelSettingsModal({
  profile,
  users = [],
  proxies = [],
  currentUser,
  activeTeamId,
  token,
  onClose,
  onSaved,
}) {
  const { toast } = useToast();
  const isOwnerOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  const [form, setForm] = useState({
    name: profile?.name || '',
    niche: profile?.niche || '',
    brand_voice: profile?.brand_voice || '',
    notes: profile?.notes || '',
    avatar_color: profile?.avatar_color || '#d4a64a',
    proxy_id: profile?.proxy_id || '',
    main_email: profile?.main_email || '',
    assigned_user_id: profile?.assigned_user_id || '',
    status: profile?.status || 'active',
  });

  const [members, setMembers] = useState(profile?.members || []);
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState('chatter');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Status transition validation
  const curStatus = profile?.status || 'active';
  const isArchived = curStatus === 'archived';

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Model name is required');
      return;
    }

    if (isArchived && (form.status === 'active' || form.status === 'paused') && !isOwnerOrAdmin) {
      setError('Archived is terminal. Only owners or administrators can reactivate an archived model.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await window.api.profiles.update({
        token,
        profileId: profile.id,
        teamId: activeTeamId,
        updates: {
          name: form.name.trim(),
          niche: form.niche.trim() || null,
          brand_voice: form.brand_voice.trim() || null,
          notes: form.notes.trim() || null,
          avatar_color: form.avatar_color,
          proxy_id: form.proxy_id ? Number(form.proxy_id) : null,
          main_email: form.main_email.trim() || null,
          assigned_user_id: form.assigned_user_id ? Number(form.assigned_user_id) : null,
          status: form.status,
        },
      });

      if (!res.ok) {
        setError(res.error || 'Failed to save model settings');
        return;
      }

      toast('ok', `Settings saved for ${form.name.trim()}`);
      onSaved && onSaved();
      onClose && onClose();
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignUser() {
    if (!newUserId) return;
    try {
      const res = await window.api.profiles.assignUser({
        token,
        profileId: profile.id,
        userId: Number(newUserId),
        role: newRole,
        teamId: activeTeamId,
      });
      if (!res.ok) {
        toast('err', res.error || 'Failed to assign team member');
        return;
      }
      setMembers(res.members || []);
      setNewUserId('');
      toast('ok', 'Team member assigned');
    } catch (err) {
      toast('err', err.message);
    }
  }

  async function handleUnassignUser(userId) {
    try {
      const res = await window.api.profiles.unassignUser({
        token,
        profileId: profile.id,
        userId,
        teamId: activeTeamId,
      });
      if (!res.ok) {
        toast('err', res.error || 'Failed to remove member');
        return;
      }
      setMembers(res.members || []);
      toast('ok', 'Team member unassigned');
    } catch (err) {
      toast('err', err.message);
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
          maxWidth: 620,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-elev, #18191c)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: form.avatar_color,
              }}
            />
            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-0)' }}>
              Edit Model: {profile?.name}
            </h3>
          </div>
          <button className="ghost" onClick={onClose} style={{ fontSize: 16, padding: '2px 8px' }}>
            ✕
          </button>
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

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Model Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Niche</label>
              <input
                type="text"
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
                placeholder="e.g. Cosplay, Fitness, Alt"
                style={{ fontSize: 12 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Status Lifecycle Controller */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Status (Lifecycle)</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={{ fontSize: 12 }}
              >
                <option value="active">Active (in rotation)</option>
                <option value="paused">Paused (temporarily removed)</option>
                <option value="archived">Archived (retired)</option>
              </select>
              {isArchived && !isOwnerOrAdmin && (
                <span className="dim" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>
                  * Only Owner/Admin can unarchive
                </span>
              )}
            </div>

            {/* Proxy Selector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Model Proxy</label>
              <select
                value={form.proxy_id}
                onChange={(e) => setForm({ ...form, proxy_id: e.target.value })}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Assigned Manager */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Primary Manager</label>
              <select
                value={form.assigned_user_id}
                onChange={(e) => setForm({ ...form, assigned_user_id: e.target.value })}
                style={{ fontSize: 12 }}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Avatar Color */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Avatar Accent</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => setForm({ ...form, avatar_color: c })}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: c,
                      cursor: 'pointer',
                      border: form.avatar_color === c ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: form.avatar_color === c ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Brand Voice */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600 }}>Brand Voice & Guidelines</label>
            <textarea
              rows={3}
              value={form.brand_voice}
              onChange={(e) => setForm({ ...form, brand_voice: e.target.value })}
              placeholder="Persona tone, banned words, key phrases, backstory..."
              style={{ fontSize: 12 }}
            />
          </div>

          {/* Assigned Team Members (WF-14 / WF-15) */}
          <div
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 12,
              marginBottom: 18,
            }}
          >
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', display: 'block', marginBottom: 8 }}>
              Assigned Team Members ({members.length})
            </label>

            {members.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {members.map((m) => (
                  <span
                    key={m.id || m.user_id}
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
                    <span style={{ fontWeight: 600 }}>{m.display_name || m.username}</span>
                    <span className="dim" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                      ({m.role})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnassignUser(m.user_id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 11,
                        color: 'var(--danger-fg, #ef4444)',
                        marginLeft: 2,
                      }}
                      title="Remove assignment"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="dim" style={{ fontSize: 11, marginBottom: 10 }}>
                No extra team members assigned yet.
              </div>
            )}

            {/* Add member row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                style={{ fontSize: 11, flex: 1 }}
              >
                <option value="">Select team member to assign…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.username} ({u.role})
                  </option>
                ))}
              </select>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ fontSize: 11, width: 110 }}
              >
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="ghost"
                onClick={handleAssignUser}
                disabled={!newUserId}
                style={{ fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap' }}
              >
                + Assign
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
