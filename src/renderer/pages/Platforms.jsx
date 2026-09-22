import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useCan } from '../lib/permissions.jsx';
import { PLATFORMS, refreshPlatforms, platformColor, platformLabel } from '../lib/platforms.js';
import { useToast } from '../lib/toast.jsx';
import { useConfirm } from '../lib/confirm.jsx';
import PageHeader from '../components/PageHeader.jsx';

const PRESETS = [
  { key: 'onlyfans', label: 'OnlyFans', short: 'OF', color: '#00AFF0', home_url: 'https://onlyfans.com', login_url: 'https://onlyfans.com', username_prefix: '@', icon: '🔞' },
  { key: 'fansly', label: 'Fansly', short: 'FN', color: '#1EA1F2', home_url: 'https://fansly.com', login_url: 'https://fansly.com', username_prefix: '@', icon: '💙' },
  { key: 'fanvue', label: 'Fanvue', short: 'FV', color: '#26B97E', home_url: 'https://www.fanvue.com', login_url: 'https://www.fanvue.com', username_prefix: '@', icon: '✨' },
  { key: 'loyalfans', label: 'LoyalFans', short: 'LF', color: '#FF2442', home_url: 'https://www.loyalfans.com', login_url: 'https://www.loyalfans.com', username_prefix: '@', icon: '👑' },
  { key: 'manyvids', label: 'ManyVids', short: 'MV', color: '#F7941D', home_url: 'https://www.manyvids.com', login_url: 'https://www.manyvids.com', username_prefix: '@', icon: '🎬' },
  { key: 'snapchat', label: 'Snapchat', short: 'SC', color: '#FFFC00', home_url: 'https://web.snapchat.com', login_url: 'https://accounts.snapchat.com', username_prefix: '@', icon: '👻' },
  { key: 'telegram', label: 'Telegram', short: 'TG', color: '#24A1DE', home_url: 'https://web.telegram.org', login_url: 'https://web.telegram.org', username_prefix: '@', icon: '✈️' },
  { key: 'threads', label: 'Threads', short: 'TH', color: '#000000', home_url: 'https://www.threads.net', login_url: 'https://www.threads.net/login', username_prefix: '@', icon: '🧵' },
  { key: 'patreon', label: 'Patreon', short: 'PT', color: '#FF424D', home_url: 'https://www.patreon.com', login_url: 'https://www.patreon.com/login', username_prefix: '@', icon: '🎨' },
  { key: 'twitch', label: 'Twitch', short: 'TW', color: '#9146FF', home_url: 'https://www.twitch.tv', login_url: 'https://www.twitch.tv/login', username_prefix: '@', icon: '🎮' },
  { key: 'kick', label: 'Kick', short: 'KK', color: '#53FC18', home_url: 'https://kick.com', login_url: 'https://kick.com', username_prefix: '@', icon: '🟢' },
];

export default function PlatformsPage({ navigate, routeParams }) {
  const { token, activeTeamId } = useAuth();
  const can = useCan();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const canManage = can('profiles.manage');
  const [platforms, setPlatforms] = useState([]);
  const [models, setModels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [error, setError] = useState(null);

  // Link to model modal
  const [linkingPlatform, setLinkingPlatform] = useState(null);
  const [linkModelId, setLinkModelId] = useState('');
  const [linkUsername, setLinkUsername] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkError, setLinkError] = useState(null);
  const [linkingSaving, setLinkingSaving] = useState(false);

  function blankForm() {
    return { key: '', label: '', short: '', color: '#888888', home_url: '', login_url: '', username_prefix: '@', icon: '' };
  }

  async function load() {
    const res = await window.api.platforms.list();
    if (res.ok) setPlatforms(res.platforms || []);
    if (token) {
      const mRes = await window.api.profiles.list({ token, teamId: activeTeamId }).catch(() => ({ ok: false }));
      if (mRes && mRes.ok) setModels(mRes.profiles || []);
    }
  }

  useEffect(() => { load(); }, [token, activeTeamId]);

  useEffect(() => {
    if (routeParams?.openAdd) {
      startAdd();
    }
  }, [routeParams]);

  function startAdd() {
    setEditing(null);
    setForm(blankForm());
    setError(null);
    setShowForm(true);
  }

  function startEdit(p) {
    setEditing(p);
    setForm({
      key: p.key,
      label: p.label,
      short: p.short || '',
      color: p.color || '#888888',
      home_url: p.home_url || '',
      login_url: p.login_url || '',
      username_prefix: p.username_prefix || '@',
      icon: p.icon || '',
    });
    setError(null);
    setShowForm(true);
  }

  async function installPreset(preset) {
    const res = await window.api.platforms.create({
      token,
      platform: {
        key: preset.key,
        label: preset.label,
        short: preset.short,
        color: preset.color,
        home_url: preset.home_url,
        login_url: preset.login_url,
        username_prefix: preset.username_prefix || '@',
        icon: preset.icon,
      },
    });
    if (!res.ok) {
      toast('err', res.error || 'Failed to install platform');
      return;
    }
    toast('ok', `Installed ${preset.label} preset`);
    await load();
    await refreshPlatforms();
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!form.label.trim()) { setError('Label required'); return; }

    if (editing) {
      const res = await window.api.platforms.update({
        token, platformId: editing.id,
        updates: {
          label: form.label,
          short: form.short || form.label.charAt(0).toUpperCase(),
          color: form.color,
          home_url: form.home_url || null,
          login_url: form.login_url || null,
          username_prefix: form.username_prefix || '@',
          icon: form.icon || null,
        },
      });
      if (!res.ok) { setError(res.error); return; }
      toast('ok', 'Platform updated');
    } else {
      if (!form.key.trim()) { setError('Key required'); return; }
      const res = await window.api.platforms.create({
        token,
        platform: {
          key: form.key,
          label: form.label,
          short: form.short || form.label.charAt(0).toUpperCase(),
          color: form.color,
          home_url: form.home_url || null,
          login_url: form.login_url || null,
          username_prefix: form.username_prefix || '@',
          icon: form.icon || null,
        },
      });
      if (!res.ok) { setError(res.error); return; }
      toast('ok', 'Platform created');
    }

    setShowForm(false);
    await load();
    await refreshPlatforms();
  }

  async function remove(p) {
    const ok = await confirm(`Delete platform "${p.label}"? This cannot be undone.`, { confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    const res = await window.api.platforms.delete({ token, platformId: p.id });
    if (!res.ok) { toast('err', res.error); return; }
    toast('ok', 'Platform deleted');
    await load();
    await refreshPlatforms();
  }

  async function submitLinkToModel(e) {
    e.preventDefault();
    setLinkError(null);
    if (!linkModelId) { setLinkError('Please select a model'); return; }
    if (!linkUsername.trim()) { setLinkError('Username is required'); return; }

    setLinkingSaving(true);
    try {
      const cleanUser = linkUsername.trim().replace(/^[@u/]+/, '');
      const res = await window.api.accounts.create({
        token,
        profileId: Number(linkModelId),
        platform: linkingPlatform.key,
        username: cleanUser,
        password: linkPassword.trim() || undefined,
        teamId: activeTeamId,
      });

      if (!res.ok) {
        setLinkError(res.error || 'Failed to link account');
        return;
      }

      const targetModel = models.find(m => m.id === Number(linkModelId));
      toast('ok', `Linked @${cleanUser} (${linkingPlatform.label}) to ${targetModel?.name || 'model'}!`);
      setLinkingPlatform(null);
      setLinkModelId('');
      setLinkUsername('');
      setLinkPassword('');
      await load();
    } finally {
      setLinkingSaving(false);
    }
  }

  if (!canManage) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
        <h2>Admin only</h2>
        <div className="muted">Only admins can manage platforms.</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Platforms"
        subtitle="Manage the websites and social platforms your models use. Built-in platforms have specialized automation; custom platforms get browser sessions with fingerprint isolation."
      />

      {/* 1-Click Creator Presets Catalog */}
      <div className="card" style={{ marginBottom: 24, background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gold-bright)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚡</span>
              <span>1-Click Popular Creator Presets</span>
            </div>
            <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>
              Install instant browser profile presets configured with icons, colors, and login endpoints.
            </div>
          </div>
          <button className="primary" onClick={startAdd} style={{ fontSize: 12 }}>+ Custom Platform</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
          {PRESETS.map(pr => {
            const isInstalled = platforms.some(p => p.key === pr.key);
            return (
              <div
                key={pr.key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 'var(--radius)',
                  background: 'var(--bg-1)', border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 14 }}>{pr.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pr.label}
                  </span>
                </div>
                {isInstalled ? (
                  <span style={{ fontSize: 10, color: 'var(--online-green)', fontWeight: 600 }}>✓ Added</span>
                ) : (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => installPreset(pr)}
                    style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-2)' }}
                    title={`Install ${pr.label} preset`}
                  >
                    + Install
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Platform Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form onSubmit={submit} onClick={e => e.stopPropagation()} style={{
            width: 520, maxHeight: '90vh', overflowY: 'auto',
            background: 'var(--bg-elev)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 22,
          }} className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, flex: 1 }}>{editing ? `Edit ${editing.label}` : 'Add Platform'}</h3>
              <button type="button" onClick={() => setShowForm(false)} style={{
                width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--bg-2)',
                color: 'var(--text-2)', cursor: 'pointer', display: 'grid',
                placeItems: 'center', fontSize: 13, padding: 0,
              }}>×</button>
            </div>
            {error && <div className="error-banner">{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label>Key (slug) {editing && <span className="dim">(cannot change)</span>}</label>
                <input
                  value={form.key}
                  disabled={!!editing}
                  onChange={e => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                  placeholder="e.g. onlyfans"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
              <div>
                <label>Label</label>
                <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. OnlyFans" />
              </div>
              <div>
                <label>Short label</label>
                <input value={form.short} onChange={e => setForm({ ...form, short: e.target.value })} placeholder="e.g. OF" />
              </div>
              <div>
                <label>Color</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: 40, height: 34, padding: 0, border: 'none', cursor: 'pointer' }} />
                  <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ flex: 1, fontFamily: 'monospace' }} />
                </div>
              </div>
              <div>
                <label>Username prefix</label>
                <input value={form.username_prefix} onChange={e => setForm({ ...form, username_prefix: e.target.value })} placeholder="@" />
              </div>
              <div>
                <label>Icon (emoji)</label>
                <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="◈" />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label>Home URL</label>
              <input value={form.home_url} onChange={e => setForm({ ...form, home_url: e.target.value })} placeholder="https://www.example.com/" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label>Login URL</label>
              <input value={form.login_url} onChange={e => setForm({ ...form, login_url: e.target.value })} placeholder="https://www.example.com/login" />
            </div>

            <div className="muted" style={{ fontSize: 11, marginBottom: 14 }}>
              Custom platforms support browser sessions with fingerprint and proxy isolation.
              Automated posting and engagement are only available for built-in platforms.
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="primary">{editing ? 'Save changes' : 'Create platform'}</button>
              <button type="button" className="ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Link Account to Model Modal */}
      {linkingPlatform && (
        <div className="modal-overlay" onClick={() => setLinkingPlatform(null)}>
          <form onSubmit={submitLinkToModel} onClick={e => e.stopPropagation()} style={{
            width: 460, background: 'var(--bg-elev)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 22,
          }} className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{linkingPlatform.icon || '🌐'}</span>
                  <span>Link Account: {linkingPlatform.label}</span>
                </h3>
                <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>
                  Create and assign a designated {linkingPlatform.label} account to any model.
                </div>
              </div>
              <button type="button" onClick={() => setLinkingPlatform(null)} style={{
                width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--bg-2)',
                color: 'var(--text-2)', cursor: 'pointer', display: 'grid',
                placeItems: 'center', fontSize: 13, padding: 0,
              }}>×</button>
            </div>

            {linkError && <div className="error-banner" style={{ marginBottom: 12 }}>{linkError}</div>}

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Select Model *</label>
              <select
                value={linkModelId}
                onChange={e => setLinkModelId(e.target.value)}
                required
                style={{ width: '100%' }}
              >
                <option value="">— Select Model —</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name} {m.niche ? `(${m.niche})` : ''}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Username *</label>
              <input
                value={linkUsername}
                onChange={e => setLinkUsername(e.target.value)}
                placeholder={`e.g. ${linkingPlatform.username_prefix || '@'}handle`}
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Password (optional, encrypted in vault)</label>
              <input
                type="password"
                value={linkPassword}
                onChange={e => setLinkPassword(e.target.value)}
                placeholder="Account password"
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="ghost" onClick={() => setLinkingPlatform(null)}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={linkingSaving}>
                {linkingSaving ? 'Saving…' : 'Attach Account to Model'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Platforms Directory */}
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 14 }}>Active Platforms</h2>
        <span className="mono dim" style={{ fontSize: 12 }}>{platforms.length} configured</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {platforms.map(p => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-elev)',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: p.color || '#888',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {p.icon && <span>{p.icon}</span>}
                <span>{p.label}</span>
                <span className="mono dim" style={{ fontSize: 11 }}>{p.key}</span>
                {p.is_builtin ? (
                  <span style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 'var(--radius-pill)',
                    background: 'rgba(122,154,90,0.2)', color: 'var(--success-fg)', fontWeight: 700,
                  }}>BUILT-IN</span>
                ) : (
                  <span style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 'var(--radius-pill)',
                    background: 'rgba(155,89,182,0.2)', color: '#9b59b6', fontWeight: 700,
                  }}>CUSTOM</span>
                )}
                <span style={{
                  fontSize: 10, padding: '1px 8px', borderRadius: 'var(--radius-pill)',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  color: (p.account_count > 0 ? 'var(--gold-bright)' : 'var(--text-3)'),
                }}>
                  {p.account_count || 0} active account{p.account_count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="muted mono" style={{ fontSize: 11, marginTop: 2 }}>
                {p.home_url || 'No URL set'}
                {p.username_prefix && ` · prefix: ${p.username_prefix}`}
              </div>
            </div>

            <button
              className="ghost"
              onClick={() => {
                setLinkingPlatform(p);
                setLinkModelId('');
                setLinkUsername('');
                setLinkPassword('');
                setLinkError(null);
              }}
              style={{ fontSize: 11, padding: '4px 10px', color: 'var(--gold-bright)' }}
              title="Link an account of this platform to any model"
            >
              + Link to Model
            </button>
            <button className="ghost" onClick={() => startEdit(p)} style={{ fontSize: 11, padding: '4px 10px' }}>
              Edit
            </button>
            {!p.is_builtin && (
              <button className="danger" onClick={() => remove(p)} style={{ fontSize: 11, padding: '4px 10px' }}>
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      {platforms.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-1)', fontSize: 13, color: 'var(--text-3)' }}>
          No platforms configured yet.
        </div>
      )}
    </div>
  );
}
