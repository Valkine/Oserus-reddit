import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useCan } from '../lib/permissions.jsx';
import { useCloudReload } from '../lib/cloudReload.jsx';
import { useCloakManagerLaunch } from '../hooks/useCloakManagerLaunch';
import { launchModelBrowser } from '../lib/launchAccount.js';
import { EmptyState } from '../components/ui.jsx';
import { useToast } from '../lib/toast.jsx';
import { useConfirm } from '../lib/confirm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { ProfilesSkeleton } from '../components/Skeletons.jsx';

const COLORS = ['#c8553d', 'var(--gold)', 'var(--green-bright)', '#5a7a9a', '#9a5a8e', '#8e6a4a'];

const PLATFORM_ICONS = {
  reddit: '🔴',
  redgifs: '🎬',
  x: '𝕏',
  twitter: '𝕏',
  instagram: '📸',
  tiktok: '🎵',
  onlyfans: '💙',
  fansly: '💙',
  fanvue: '💜',
};

export default function ProfilesPage({ navigate }) {
  const { token, user, activeTeamId } = useAuth();
  const { isAvailable, cmBaseUrl, checkAvailabilityWithRetry, startCloakManager, cloakStatus } = useCloakManagerLaunch();
  const [startingCm, setStartingCm] = useState(false);
  const [cmMsg, setCmMsg] = useState(null);
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [profiles, setProfiles] = useState([]);
  const [loadingSkel, setLoadingSkel] = useState(true);
  const [launchingId, setLaunchingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [proxies, setProxies] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank());
  const [error, setError] = useState(null);

  // Edit / Settings Modal state
  const [editingProfile, setEditingProfile] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');

  const can = useCan();
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  const canManage = isOwner || isAdmin || can('profiles.manage');

  function blank() {
    return { name: '', assigned_user_id: '', niche: '', brand_voice: '', notes: '', avatar_color: COLORS[0], browser_mode: 'cloakmanager' };
  }

  async function handleLaunchModel(profileId) {
    setLaunchingId(`model-${profileId}`);
    try {
      const res = await launchModelBrowser({ token, profileId: Number(profileId) });
      if (res && !res.ok) {
        toast('err', `Failed to launch browser: ${res.error || 'Unknown error'}`);
      }
    } finally {
      setLaunchingId(null);
    }
  }

  async function load() {
    const p = await window.api.profiles.list({ token, teamId: activeTeamId });
    if (p.ok) setProfiles(p.profiles || []);
    if (canManage) {
      const u = await window.api.auth.listUsers({ token }).catch(() => ({ ok: false }));
      if (u.ok) setUsers(u.users || []);
    }
    const px = await window.api.proxies.list({ token, teamId: activeTeamId }).catch(() => ({ ok: false }));
    if (px.ok) setProxies(px.proxies || []);
    const r = await window.api.roles.list({ token }).catch(() => ({ ok: false }));
    if (r.ok) setRoles(r.roles || []);
    setLoadingSkel(false);
  }

  useEffect(() => {
    load();
    checkAvailabilityWithRetry(token);
  }, [token, activeTeamId]);

  useCloudReload(['model_profiles', 'proxies', 'roles', 'role_permissions'], () => { load(); });

  async function handleStartCloakManager() {
    setStartingCm(true);
    setCmMsg('Starting CloakManager…');
    try {
      const res = await startCloakManager(token);
      setCmMsg(res?.ok ? 'CloakManager started' : `Failed: ${res?.error || 'Unknown error'}`);
    } finally {
      setStartingCm(false);
      setTimeout(() => setCmMsg(null), 4000);
    }
  }

  async function addProfile(e) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError('Name is required'); return; }
    const res = await window.api.profiles.create({
      token, name: form.name.trim(),
      assignedUserId: form.assigned_user_id ? Number(form.assigned_user_id) : null,
      niche: form.niche, brandVoice: form.brand_voice, notes: form.notes,
      avatarColor: form.avatar_color,
      browserMode: form.browser_mode,
      teamId: activeTeamId,
    });
    if (!res.ok) { setError(res.error); return; }
    const newId = res.id;
    setForm(blank()); setShowAdd(false); await load();
    if (form.browser_mode === 'cloakmanager') {
      toast(res.cmProfile?.ok ? 'ok' : 'err',
        res.cmProfile?.ok
          ? `Model created — CloakManager profile "${res.cmProfile.profileName}" ready.`
          : `Model created, but CloakManager profile failed: ${res.cmProfile?.error || 'unknown error'}`);
    } else {
      toast('ok', 'Model created.');
    }
    setTimeout(() => {
      const el = document.querySelector(`*[data-profile-id="${newId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }

  async function del(id) {
    const ok = await confirm('Delete this model profile? All its linked platform accounts will be removed too.', { confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    const res = await window.api.profiles.delete({ token, profileId: id, teamId: activeTeamId });
    if (!res.ok) {
      toast('err', `Failed to delete profile: ${res.error || 'Unknown error'}`);
      return;
    }
    toast('ok', 'Model deleted.');
    if (editingProfile?.id === id) setEditingProfile(null);
    load();
  }

  async function exportProfile(profileId) {
    const res = await window.api.bundle.export({ token, profileId });
    if (!res.ok && res.error !== 'Cancelled') toast('err', 'Export failed: ' + res.error);
    else if (res.ok) toast('ok', `Exported to ${res.path}`);
  }

  async function importProfile() {
    const res = await window.api.bundle.import({ token, assignedUserId: null });
    if (!res.ok) {
      if (res.error !== 'Cancelled') toast('err', 'Import failed: ' + res.error);
      return;
    }
    toast('ok', `Imported "${res.profileName}" with ${res.accountCount} account(s)`);
    load();
  }

  function openEditModal(profile) {
    setEditingProfile(profile);
    setEditForm({
      name: profile.name || '',
      niche: profile.niche || '',
      brand_voice: profile.brand_voice || '',
      notes: profile.notes || '',
      avatar_color: profile.avatar_color || COLORS[0],
      proxy_id: profile.proxy_id || '',
      main_email: profile.main_email || '',
      assigned_user_id: profile.assigned_user_id || '',
      browser_mode: profile.browser_mode || 'cloakmanager',
    });
    setNewMemberUserId('');
    setNewMemberRole(roles[0]?.key || 'chatter');
  }

  async function saveEditModal(e) {
    e.preventDefault();
    if (!editingProfile) return;
    const res = await window.api.profiles.update({
      token,
      profileId: editingProfile.id,
      teamId: activeTeamId,
      updates: {
        name: editForm.name.trim(),
        niche: editForm.niche.trim() || null,
        brand_voice: editForm.brand_voice.trim() || null,
        notes: editForm.notes.trim() || null,
        avatar_color: editForm.avatar_color,
        proxy_id: editForm.proxy_id ? Number(editForm.proxy_id) : null,
        main_email: editForm.main_email.trim() || null,
        assigned_user_id: editForm.assigned_user_id ? Number(editForm.assigned_user_id) : null,
        browser_mode: editForm.browser_mode,
      },
    });
    if (!res.ok) {
      toast('err', `Failed to update model: ${res.error || 'Unknown error'}`);
      return;
    }
    toast('ok', 'Model settings saved.');
    setEditingProfile(null);
    load();
  }

  async function addMemberToEditing(userId, role) {
    if (!userId || !editingProfile) return;
    const res = await window.api.profiles.addMember({ token, profileId: editingProfile.id, userId: Number(userId), role });
    if (!res.ok) {
      toast('err', res.error || 'Failed to assign member');
      return;
    }
    setEditingProfile(prev => ({ ...prev, members: res.members }));
    setNewMemberUserId('');
    load();
  }

  async function removeMemberFromEditing(userId) {
    if (!editingProfile) return;
    const res = await window.api.profiles.removeMember({ token, profileId: editingProfile.id, userId });
    if (!res.ok) {
      toast('err', res.error || 'Failed to remove member');
      return;
    }
    setEditingProfile(prev => ({ ...prev, members: res.members }));
    load();
  }

  const filteredProfiles = profiles.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.niche && p.niche.toLowerCase().includes(q)) ||
      (p.assigned_to_username && p.assigned_to_username.toLowerCase().includes(q)) ||
      (p.assigned_to_name && p.assigned_to_name.toLowerCase().includes(q)) ||
      (p.brand_voice && p.brand_voice.toLowerCase().includes(q)) ||
      (p.accounts && p.accounts.some(a => a.username && a.username.toLowerCase().includes(q))) ||
      (p.members && p.members.some(m => (m.display_name && m.display_name.toLowerCase().includes(q)) || (m.username && m.username.toLowerCase().includes(q))))
    );
  });

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader eyebrow="Organization" title="Model Profiles" subtitle="AdsPower-style isolated browser profiles. Each model operates as a unified browser instance.">
        {canManage && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ghost" onClick={importProfile} title="Import model profile bundle">Import</button>
            <button className="primary" onClick={() => setShowAdd((v) => !v)}>
              {showAdd ? '✕ Cancel' : '+ New Model'}
            </button>
          </div>
        )}
      </PageHeader>

      {/* CloakManager Availability Status */}
      {isAvailable !== null && (
        <div style={{
          padding: '8px 14px',
          background: isAvailable ? 'rgba(122,154,90,0.1)' : 'rgba(180,90,90,0.1)',
          borderWidth: 1, borderStyle: 'solid',
          borderColor: isAvailable ? 'var(--ok)' : 'var(--danger)',
          borderRadius: 'var(--radius)',
          fontSize: 12,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isAvailable ? 'var(--online-green)' : 'var(--danger-fg)',
            boxShadow: isAvailable ? '0 0 6px var(--online-green)' : 'none',
          }} />
          <span style={{ fontWeight: 600 }}>CloakManager Antidetect:</span> {isAvailable ? 'Engine Online' : 'Engine Unavailable'}
          {isAvailable && cmBaseUrl && (
            <a
              href="#"
              className="mono dim"
              style={{ fontSize: 11, textDecoration: 'underline', cursor: 'pointer' }}
              onClick={(e) => {
                e.preventDefault();
                window.api.windows.openExternalTabs({ urls: [cmBaseUrl] });
              }}
            >{cmBaseUrl}</a>
          )}
          {!isAvailable && canManage && (
            <button className="ghost" style={{ fontSize: 11, padding: '2px 8px', marginLeft: 'auto' }}
              disabled={startingCm}
              onClick={handleStartCloakManager}>
              {startingCm ? 'Starting…' : '↻ Start Antidetect'}
            </button>
          )}
          {cmMsg && <span className="muted" style={{ fontSize: 11 }}>{cmMsg}</span>}
        </div>
      )}

      {/* Add Model Drawer / Form */}
      {showAdd && canManage && (
        <form onSubmit={addProfile} className="card" style={{ marginBottom: 20, border: '1px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>Create Model Profile</h3>
            <span className="dim" style={{ fontSize: 12 }}>One profile holds all social & monetization accounts</span>
          </div>
          {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label>Model Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Luna" autoFocus />
            </div>
            <div>
              <label>Primary Manager</label>
              <select value={form.assigned_user_id} onChange={(e) => setForm({ ...form, assigned_user_id: e.target.value })}>
                <option value="">— Unassigned —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.display_name} ({u.username})</option>
                ))}
              </select>
            </div>
            <div>
              <label>Niche / Category</label>
              <input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} placeholder="e.g. Cosplay, Fitness, Gamer" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label>Browser Mode</label>
              <select value={form.browser_mode} onChange={(e) => setForm({ ...form, browser_mode: e.target.value })}>
                <option value="cloakmanager">CloakManager Antidetect (Recommended)</option>
                <option value="electron">Electron Standard</option>
              </select>
            </div>
            <div>
              <label>Avatar Color</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {COLORS.map(c => (
                  <button key={c} type="button"
                    onClick={() => setForm({ ...form, avatar_color: c })}
                    style={{
                      width: 26, height: 26, padding: 0, borderRadius: '50%',
                      background: c, borderWidth: 2, borderStyle: 'solid',
                      borderColor: form.avatar_color === c ? 'var(--text-0)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label>Brand Voice & Instructions (Optional)</label>
            <textarea rows={2} value={form.brand_voice} onChange={(e) => setForm({ ...form, brand_voice: e.target.value })} placeholder="Tone, dos and don'ts, personality guidelines for chatters…" />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="primary">Create Model</button>
            <button type="button" className="ghost" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Control Bar: Search + Density Views */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models, niches, accounts, managers…"
            style={{ paddingLeft: 32, width: '100%' }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: 13, pointerEvents: 'none' }}>🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}
            >✕</button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            {filteredProfiles.length} of {profiles.length} models
          </span>
          <div style={{ display: 'inline-flex', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <button
              type="button"
              className="ghost"
              onClick={() => setViewMode('grid')}
              style={{
                fontSize: 12, padding: '4px 10px',
                background: viewMode === 'grid' ? 'var(--bg-3)' : 'transparent',
                fontWeight: viewMode === 'grid' ? 600 : 400,
              }}
              title="Card Grid View"
            >
              ⊞ Grid
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setViewMode('table')}
              style={{
                fontSize: 12, padding: '4px 10px',
                background: viewMode === 'table' ? 'var(--bg-3)' : 'transparent',
                fontWeight: viewMode === 'table' ? 600 : 400,
              }}
              title="AdsPower Table View"
            >
              ☰ AdsPower Table
            </button>
          </div>
        </div>
      </div>

      {loadingSkel ? (
        <ProfilesSkeleton />
      ) : profiles.length === 0 ? (
        <EmptyState
          icon="◇"
          title="No model profiles yet"
          hint="Create your first model profile to begin organizing accounts and assigning team members."
          action={canManage && <button className="primary" onClick={() => setShowAdd(true)}>+ New Model</button>}
        />
      ) : viewMode === 'table' ? (
        /* AdsPower Spreadsheet Table View */
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', width: 220 }}>Model</th>
                <th style={{ padding: '10px 12px' }}>Niche</th>
                <th style={{ padding: '10px 12px' }}>Accounts</th>
                <th style={{ padding: '10px 12px' }}>Model Proxy</th>
                <th style={{ padding: '10px 12px' }}>Assigned Team</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((p) => {
                const isCm = (p.browser_mode || 'cloakmanager') === 'cloakmanager';
                const isRunning = p.cloak_profile_name && cloakStatus && cloakStatus[p.cloak_profile_name] === 'running';
                const isLaunching = launchingId === `model-${p.id}`;
                const proxy = proxies.find(px => px.id === p.proxy_id);

                return (
                  <tr
                    key={p.id}
                    data-profile-id={p.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.avatar_color || 'var(--accent)', flexShrink: 0 }} />
                        <div>
                          <div
                            onClick={() => navigate && navigate('model', { modelId: p.id })}
                            style={{ fontWeight: 600, color: 'var(--text-0)', cursor: 'pointer' }}
                            title="Open model dashboard"
                          >
                            {p.name}
                          </div>
                          {p.main_email && <div className="dim" style={{ fontSize: 10 }}>{p.main_email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {p.niche ? <span className="pill" style={{ fontSize: 11 }}>{p.niche}</span> : <span className="dim">—</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600 }}>{p.account_count || 0}</span>
                        {p.accounts && p.accounts.slice(0, 4).map(a => (
                          <span key={a.id} style={{ fontSize: 11 }} title={`${a.platform}: ${a.username}`}>
                            {PLATFORM_ICONS[a.platform] || '🌐'}
                          </span>
                        ))}
                        {p.accounts && p.accounts.length > 4 && (
                          <span className="dim" style={{ fontSize: 10 }}>+{p.accounts.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {proxy ? (
                        <span className="mono" style={{ fontSize: 11, color: 'var(--gold)' }} title={`${proxy.host}:${proxy.port}`}>
                          🌐 {proxy.label || `${proxy.host}:${proxy.port}`}
                        </span>
                      ) : (
                        <span className="dim" style={{ fontSize: 11 }}>Direct (No proxy)</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {p.assigned_to_username && (
                          <span style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 'var(--radius-pill)',
                            background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)'
                          }} title={`Manager: ${p.assigned_to_username}`}>
                            👤 {p.assigned_to_username}
                          </span>
                        )}
                        {p.members && p.members.map(m => (
                          <span key={m.id} style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 'var(--radius-pill)',
                            background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--gold)'
                          }} title={`${m.display_name} (${m.role})`}>
                            {m.display_name}
                          </span>
                        ))}
                        {!p.assigned_to_username && (!p.members || p.members.length === 0) && (
                          <span className="dim" style={{ fontSize: 11 }}>Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {isRunning ? (
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-pill)',
                          background: 'rgba(122,154,90,0.2)', color: 'var(--online-green)',
                          border: '1px solid rgba(122,154,90,0.4)', fontWeight: 700,
                        }}>
                          ● RUNNING
                        </span>
                      ) : (
                        <span className="dim" style={{ fontSize: 11 }}>Stopped</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="primary"
                          disabled={isLaunching}
                          onClick={() => handleLaunchModel(p.id)}
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          title={isRunning ? 'Focus running browser instance' : 'Launch isolated model browser'}
                        >
                          {isLaunching ? '⏳ Starting…' : isRunning ? '● Running' : '▶ Open Browser'}
                        </button>
                        <button
                          className="ghost"
                          onClick={() => navigate && navigate('model', { modelId: p.id })}
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          title="View accounts and credentials"
                        >
                          Manage →
                        </button>
                        {canManage && (
                          <button
                            className="ghost"
                            onClick={() => openEditModal(p)}
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            title="Edit model settings & assignments"
                          >
                            ⚙
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Decluttered Card Grid View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filteredProfiles.map((p) => {
            const isCm = (p.browser_mode || 'cloakmanager') === 'cloakmanager';
            const isRunning = p.cloak_profile_name && cloakStatus && cloakStatus[p.cloak_profile_name] === 'running';
            const isLaunching = launchingId === `model-${p.id}`;
            const proxy = proxies.find(px => px.id === p.proxy_id);

            return (
              <div
                key={p.id}
                className="card"
                data-profile-id={p.id}
                style={{
                  borderLeft: `4px solid ${p.avatar_color || 'var(--accent)'}`,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  position: 'relative',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3
                        onClick={() => navigate && navigate('model', { modelId: p.id })}
                        style={{ margin: 0, cursor: 'pointer', fontSize: 16 }}
                        title="Click to view details"
                      >
                        {p.name}
                      </h3>
                      {p.niche && <span className="pill" style={{ fontSize: 10 }}>{p.niche}</span>}
                    </div>
                    {p.main_email && <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>{p.main_email}</div>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 'var(--radius-pill)',
                      background: isCm ? 'rgba(155,89,182,0.12)' : 'rgba(74,144,226,0.12)',
                      color: isCm ? '#ba7ad8' : '#4a90e2',
                      border: `1px solid ${isCm ? 'rgba(155,89,182,0.3)' : 'rgba(74,144,226,0.3)'}`,
                      fontWeight: 600,
                    }}>
                      {isCm ? '👻 Cloak' : '⚡ Electron'}
                    </span>
                    {isRunning && (
                      <span style={{
                        fontSize: 9, padding: '2px 6px', borderRadius: 'var(--radius-pill)',
                        background: 'rgba(122,154,90,0.2)', color: 'var(--online-green)',
                        border: '1px solid rgba(122,154,90,0.4)', fontWeight: 700,
                      }}>
                        ● RUNNING
                      </span>
                    )}
                    {canManage && (
                      <button
                        className="ghost"
                        onClick={() => openEditModal(p)}
                        style={{ padding: '2px 6px', fontSize: 12 }}
                        title="Edit model settings & team assignments"
                      >
                        ⚙
                      </button>
                    )}
                  </div>
                </div>

                {/* Info Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="muted">Accounts:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>{p.account_count || 0}</span>
                      <span className="dim">({p.ready_count || 0} ready)</span>
                      {p.accounts && p.accounts.slice(0, 4).map(a => (
                        <span key={a.id} style={{ fontSize: 11 }} title={`${a.platform}: ${a.username}`}>
                          {PLATFORM_ICONS[a.platform] || '🌐'}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="muted">Proxy:</span>
                    {proxy ? (
                      <span className="mono" style={{ fontSize: 11, color: 'var(--gold)' }} title={`${proxy.host}:${proxy.port}`}>
                        🌐 {proxy.label || `${proxy.host}:${proxy.port}`}
                      </span>
                    ) : (
                      <span className="dim" style={{ fontSize: 11 }}>Direct (No proxy)</span>
                    )}
                  </div>

                  {/* Team Members */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="muted">Team:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {p.assigned_to_username && (
                        <span style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 'var(--radius-pill)',
                          background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)'
                        }} title={`Manager: ${p.assigned_to_username}`}>
                          👤 {p.assigned_to_username}
                        </span>
                      )}
                      {p.members && p.members.map(m => (
                        <span key={m.id} style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 'var(--radius-pill)',
                          background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--gold)'
                        }} title={`${m.display_name} (${m.role})`}>
                          {m.display_name}
                        </span>
                      ))}
                      {!p.assigned_to_username && (!p.members || p.members.length === 0) && (
                        <span className="dim" style={{ fontSize: 11 }}>—</span>
                      )}
                    </div>
                  </div>
                </div>

                {p.brand_voice && (
                  <div className="muted" style={{ fontSize: 11, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "{p.brand_voice}"
                  </div>
                )}

                {/* Master Action Footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <button
                    className="primary"
                    disabled={isLaunching}
                    onClick={() => handleLaunchModel(p.id)}
                    style={{ flex: 1, fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    title={isRunning ? 'Focus already open browser' : 'Launch browser with all accounts'}
                  >
                    {isLaunching ? '⏳ Launching…' : isRunning ? '● Open Browser (Running)' : '▶ Open Browser'}
                  </button>
                  <button
                    className="ghost"
                    onClick={() => navigate && navigate('model', { modelId: p.id })}
                    style={{ fontSize: 12, padding: '6px 10px' }}
                    title="Manage accounts and credentials"
                  >
                    Accounts →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Model & Team Assignment Modal */}
      {editingProfile && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Model Settings: {editingProfile.name}</h3>
              <button className="ghost" onClick={() => setEditingProfile(null)} style={{ padding: '2px 8px' }}>✕</button>
            </div>

            <form onSubmit={saveEditModal}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label>Model Name</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label>Niche</label>
                  <input
                    value={editForm.niche}
                    onChange={(e) => setEditForm({ ...editForm, niche: e.target.value })}
                    placeholder="e.g. Latina, Cosplay"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label>Primary Manager</label>
                  <select
                    value={editForm.assigned_user_id}
                    onChange={(e) => setEditForm({ ...editForm, assigned_user_id: e.target.value })}
                  >
                    <option value="">— Unassigned —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.display_name} ({u.username})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Model Proxy</label>
                  <select
                    value={editForm.proxy_id}
                    onChange={(e) => setEditForm({ ...editForm, proxy_id: e.target.value })}
                  >
                    <option value="">— Direct (No Proxy) —</option>
                    {proxies.map((px) => (
                      <option key={px.id} value={px.id}>{px.label} · {px.kind} {px.host}:{px.port}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label>Primary Recovery Email</label>
                  <input
                    type="email"
                    value={editForm.main_email}
                    onChange={(e) => setEditForm({ ...editForm, main_email: e.target.value })}
                    placeholder="recovery@example.com"
                  />
                </div>
                <div>
                  <label>Browser Mode</label>
                  <select
                    value={editForm.browser_mode}
                    onChange={(e) => setEditForm({ ...editForm, browser_mode: e.target.value })}
                  >
                    <option value="cloakmanager">CloakManager Antidetect</option>
                    <option value="electron">Electron Standard</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Avatar Color</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, avatar_color: c })}
                      style={{
                        width: 26, height: 26, padding: 0, borderRadius: '50%',
                        background: c, borderWidth: 2, borderStyle: 'solid',
                        borderColor: editForm.avatar_color === c ? 'var(--text-0)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Brand Voice / Chatter Guidelines</label>
                <textarea
                  rows={2}
                  value={editForm.brand_voice}
                  onChange={(e) => setEditForm({ ...editForm, brand_voice: e.target.value })}
                  placeholder="Guidelines for chatters..."
                />
              </div>

              {/* Team Assignment Management */}
              <div style={{ padding: '12px 14px', background: 'var(--bg-1)', borderRadius: 'var(--radius)', marginBottom: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Assigned Workers & Chatters</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select
                    value={newMemberUserId}
                    onChange={(e) => setNewMemberUserId(e.target.value)}
                    style={{ flex: 2 }}
                  >
                    <option value="">— Pick Team Member —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.display_name} ({u.username})</option>
                    ))}
                  </select>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {roles.length === 0 ? (
                      <option value="chatter">Chatter</option>
                    ) : (
                      roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)
                    )}
                  </select>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => addMemberToEditing(newMemberUserId, newMemberRole)}
                    disabled={!newMemberUserId}
                  >
                    + Add
                  </button>
                </div>

                {editingProfile.members && editingProfile.members.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {editingProfile.members.map((m) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, background: 'var(--bg-2)', padding: '4px 8px', borderRadius: 4 }}>
                        <span>
                          <strong style={{ color: 'var(--gold)' }}>{m.display_name}</strong>
                          <span className="dim"> ({m.username}) · {m.role}</span>
                        </span>
                        <button
                          type="button"
                          className="ghost"
                          style={{ padding: '1px 6px', fontSize: 11, color: 'var(--danger-fg)' }}
                          onClick={() => removeMemberFromEditing(m.user_id)}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dim" style={{ fontSize: 11 }}>No additional team members assigned yet.</div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="ghost" onClick={() => exportProfile(editingProfile.id)}>
                    Export Bundle
                  </button>
                  <button type="button" className="danger" onClick={() => del(editingProfile.id)}>
                    Delete Model
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="ghost" onClick={() => setEditingProfile(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
