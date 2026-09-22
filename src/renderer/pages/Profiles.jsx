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

export default function ProfilesPage({ navigate, routeParams }) {
  const { token, user, activeTeamId } = useAuth();
  const { isAvailable, cmBaseUrl, checkAvailabilityWithRetry, startCloakManager, cloakStatus } = useCloakManagerLaunch();
  const [startingCm, setStartingCm] = useState(false);
  const [cmMsg, setCmMsg] = useState(null);
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [profiles, setProfiles] = useState([]);
  const [availablePlatforms, setAvailablePlatforms] = useState([]);
  const [loadingSkel, setLoadingSkel] = useState(true);
  const [launchingId, setLaunchingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    if (routeParams?.openAdd) {
      setShowAdd(true);
    }
  }, [routeParams]);

  function blank() {
    return {
      name: '',
      assigned_user_id: '',
      niche: '',
      brand_voice: '',
      notes: '',
      avatar_color: COLORS[0],
      proxy_id: '',
      browser_mode: 'cloakmanager',
      wizardTab: 'guided',
      accounts: [
        { platform: 'onlyfans', username: '', password: '' }
      ],
      bulkText: '',
    };
  }

  function parseBulkAccounts(text) {
    if (!text || !text.trim()) return [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const out = [];
    for (const line of lines) {
      let parts = [];
      if (line.includes(':')) parts = line.split(':');
      else if (line.includes(',')) parts = line.split(',');
      else if (line.includes('|')) parts = line.split('|');
      else parts = line.split(/\s+/);

      parts = parts.map(p => p.trim());
      if (parts.length >= 2) {
        const platform = parts[0].toLowerCase();
        const username = parts[1].replace(/^[@u/]+/, '');
        const password = parts.slice(2).join(':').trim() || '';
        if (username) {
          out.push({ platform, username, password });
        }
      } else if (parts.length === 1 && parts[0]) {
        out.push({ platform: 'onlyfans', username: parts[0].replace(/^[@u/]+/, ''), password: '' });
      }
    }
    return out;
  }

  function addAccountRow(plat = 'onlyfans') {
    setForm(prev => ({
      ...prev,
      accounts: [...(prev.accounts || []), { platform: plat, username: '', password: '' }]
    }));
  }

  function removeAccountRow(idx) {
    setForm(prev => ({
      ...prev,
      accounts: (prev.accounts || []).filter((_, i) => i !== idx)
    }));
  }

  function updateAccountRow(idx, field, val) {
    setForm(prev => ({
      ...prev,
      accounts: (prev.accounts || []).map((acc, i) => i === idx ? { ...acc, [field]: val } : acc)
    }));
  }

  async function handleLaunchModel(profileId) {
    const targetProfile = profiles.find(p => p.id === profileId);
    if (!targetProfile || !targetProfile.accounts || targetProfile.accounts.length === 0) {
      toast('err', 'Cannot open browser: No designated accounts are linked to this model. Click Manage to link an account first.');
      return;
    }
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

  const load = React.useCallback(async () => {
    try {
      const p = await window.api.profiles.list({ token, teamId: activeTeamId }).catch((err) => ({ ok: false, error: err.message }));
      if (p && p.ok) setProfiles(p.profiles || []);

      const [uRes, pxRes, rRes, platRes] = await Promise.all([
        canManage ? window.api.auth.listUsers({ token }).catch(() => ({ ok: false })) : Promise.resolve({ ok: false }),
        window.api.proxies.list({ token, teamId: activeTeamId }).catch(() => ({ ok: false })),
        window.api.roles.list({ token }).catch(() => ({ ok: false })),
        window.api.platforms.list().catch(() => ({ ok: false })),
      ]);
      if (uRes && uRes.ok) setUsers(uRes.users || []);
      if (pxRes && pxRes.ok) setProxies(pxRes.proxies || []);
      if (rRes && rRes.ok) setRoles(rRes.roles || []);
      if (platRes && platRes.ok) setAvailablePlatforms(platRes.platforms || []);
    } catch (e) {
      console.error('Error loading profiles page:', e);
    } finally {
      setLoadingSkel(false);
    }
  }, [token, activeTeamId, canManage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (token) {
      checkAvailabilityWithRetry(token, { attempts: 2, delayMs: 2000 }).catch(() => {});
    }
  }, [token, checkAvailabilityWithRetry]);

  useCloudReload(['model_profiles', 'proxies', 'roles', 'role_permissions'], load);

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
    if (!form.name.trim()) { setError('Model name is required'); return; }

    let accountsToCreate = [];
    if (form.wizardTab === 'bulk') {
      accountsToCreate = parseBulkAccounts(form.bulkText);
    } else {
      accountsToCreate = (form.accounts || []).filter(a => a.username && a.username.trim());
    }

    const res = await window.api.profiles.createWithAccounts({
      token,
      name: form.name.trim(),
      assignedUserId: form.assigned_user_id ? Number(form.assigned_user_id) : null,
      niche: form.niche ? form.niche.trim() : null,
      brandVoice: form.brand_voice ? form.brand_voice.trim() : null,
      notes: form.notes ? form.notes.trim() : null,
      avatarColor: form.avatar_color,
      proxyId: form.proxy_id ? Number(form.proxy_id) : null,
      browserMode: form.browser_mode,
      teamId: activeTeamId,
      accounts: accountsToCreate,
    });

    if (!res.ok) { setError(res.error); return; }
    const newId = res.id;
    setForm(blank());
    setShowAdd(false);
    await load();

    const acctMsg = res.accountCount > 0
      ? ` with ${res.accountCount} launch-ready account(s)`
      : '';
    if (form.browser_mode === 'cloakmanager') {
      toast(
        res.cmProfile?.ok ? 'ok' : 'err',
        res.cmProfile?.ok
          ? `Model created${acctMsg}! Browser profile ready.`
          : `Model created${acctMsg}, but CloakManager profile failed: ${res.cmProfile?.error || 'unknown error'}`
      );
    } else {
      toast('ok', `Model created${acctMsg}!`);
    }
    setTimeout(() => {
      const el = document.querySelector(`*[data-profile-id="${newId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }

  async function del(id, name) {
    const ok = await confirm(`Delete model profile "${name || 'this model'}"? All its linked platform accounts and assignments will be permanently removed.`, { confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    const res = await window.api.profiles.delete({ token, profileId: id, teamId: activeTeamId });
    if (!res.ok) {
      toast('err', `Failed to delete profile: ${res.error || 'Unknown error'}`);
      return;
    }
    toast('ok', `Model "${name || ''}" deleted.`);
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
      <PageHeader eyebrow="Organization" title="Model Profiles" subtitle="Isolated antidetect browser profiles. Each model operates as a unified browser instance.">
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

      {/* Unified Fast Model & Accounts Onboarding Wizard */}
      {showAdd && canManage && (
        <form onSubmit={addProfile} className="card" style={{ marginBottom: 20, border: '1px solid var(--gold)', background: 'var(--bg-elev)', boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--gold-bright)' }}>Fast Model & Accounts Onboarding</h3>
              </div>
              <div className="dim" style={{ fontSize: 12, marginTop: 3 }}>
                Configure a model and all its initial platform accounts in one step — ready to launch immediately.
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-2)', padding: 3, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                className="ghost"
                onClick={() => setForm({ ...form, wizardTab: 'guided' })}
                style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                  background: form.wizardTab === 'guided' ? 'var(--gold)' : 'transparent',
                  color: form.wizardTab === 'guided' ? '#111' : 'var(--text-2)',
                  fontWeight: form.wizardTab === 'guided' ? 700 : 400,
                }}
              >
                🪄 Guided Setup
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setForm({ ...form, wizardTab: 'bulk' })}
                style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                  background: form.wizardTab === 'bulk' ? 'var(--gold)' : 'transparent',
                  color: form.wizardTab === 'bulk' ? '#111' : 'var(--text-2)',
                  fontWeight: form.wizardTab === 'bulk' ? 700 : 400,
                }}
              >
                📋 Bulk Paste
              </button>
            </div>
          </div>

          {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

          {/* Model Core Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Model Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Luna"
                autoFocus
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Primary Manager</label>
              <select value={form.assigned_user_id} onChange={(e) => setForm({ ...form, assigned_user_id: e.target.value })}>
                <option value="">— Unassigned —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.display_name} ({u.username})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Niche / Category</label>
              <input
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
                placeholder="e.g. Cosplay, Latina, Fitness"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Model Dedicated Proxy</label>
              <select value={form.proxy_id} onChange={(e) => setForm({ ...form, proxy_id: e.target.value })}>
                <option value="">— Direct (No Proxy) —</option>
                {proxies.map((px) => (
                  <option key={px.id} value={px.id}>{px.label} · {px.kind} {px.host}:{px.port}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Browser Engine</label>
              <select value={form.browser_mode} onChange={(e) => setForm({ ...form, browser_mode: e.target.value })}>
                <option value="cloakmanager">CloakManager Antidetect (Recommended)</option>
                <option value="electron">Electron Standard</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Avatar Color</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, avatar_color: c })}
                    style={{
                      width: 24, height: 24, padding: 0, borderRadius: '50%',
                      background: c, borderWidth: 2, borderStyle: 'solid',
                      borderColor: form.avatar_color === c ? 'var(--text-0)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* TAB 1: Guided Accounts Section */}
          {form.wizardTab === 'guided' && (
            <div style={{
              background: 'var(--bg-1)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-1)' }}>Designated Platform Accounts</span>
                  <span className="dim" style={{ fontSize: 11, marginLeft: 8 }}>
                    ({(form.accounts || []).filter(a => a.username?.trim()).length} configured)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="dim" style={{ fontSize: 11 }}>Quick Add:</span>
                  {[
                    { key: 'onlyfans', label: 'OnlyFans', icon: '🔞' },
                    { key: 'fansly', label: 'Fansly', icon: '💙' },
                    { key: 'fanvue', label: 'Fanvue', icon: '✨' },
                    { key: 'reddit', label: 'Reddit', icon: '🔴' },
                    { key: 'x', label: 'X', icon: '𝕏' },
                    { key: 'instagram', label: 'IG', icon: '📸' },
                    { key: 'tiktok', label: 'TikTok', icon: '🎵' },
                  ].map(qp => (
                    <button
                      key={qp.key}
                      type="button"
                      className="ghost"
                      onClick={() => addAccountRow(qp.key)}
                      style={{ fontSize: 11, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }}
                      title={`Add ${qp.label} account`}
                    >
                      <span>{qp.icon}</span>
                      <span>+{qp.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(form.accounts || []).map((acct, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid', gridTemplateColumns: '160px 1fr 1fr 32px', gap: 8,
                      alignItems: 'center', background: 'var(--bg-elev)', padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                    }}
                  >
                    <select
                      value={acct.platform}
                      onChange={(e) => updateAccountRow(idx, 'platform', e.target.value)}
                      style={{ fontSize: 12, padding: '4px 6px' }}
                    >
                      {availablePlatforms.length > 0 ? (
                        availablePlatforms.map(p => (
                          <option key={p.key} value={p.key}>{p.icon ? `${p.icon} ` : ''}{p.label}</option>
                        ))
                      ) : (
                        <>
                          <option value="onlyfans">🔞 OnlyFans</option>
                          <option value="fansly">💙 Fansly</option>
                          <option value="fanvue">✨ Fanvue</option>
                          <option value="reddit">🔴 Reddit</option>
                          <option value="x">𝕏 X (Twitter)</option>
                          <option value="instagram">📸 Instagram</option>
                          <option value="tiktok">🎵 TikTok</option>
                        </>
                      )}
                    </select>

                    <input
                      value={acct.username}
                      onChange={(e) => updateAccountRow(idx, 'username', e.target.value)}
                      placeholder="Username (e.g. @model_luna)"
                      style={{ fontSize: 12, padding: '4px 8px' }}
                    />

                    <input
                      type="password"
                      value={acct.password}
                      onChange={(e) => updateAccountRow(idx, 'password', e.target.value)}
                      placeholder="Password (optional, encrypted)"
                      style={{ fontSize: 12, padding: '4px 8px' }}
                    />

                    <button
                      type="button"
                      className="ghost"
                      onClick={() => removeAccountRow(idx)}
                      style={{ color: 'var(--danger-fg)', padding: 0, height: 26, width: 26, display: 'grid', placeItems: 'center' }}
                      title="Remove account"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="ghost"
                  onClick={() => addAccountRow('onlyfans')}
                  style={{ fontSize: 11, alignSelf: 'flex-start', marginTop: 4, padding: '4px 10px' }}
                >
                  + Add Another Account Row
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Bulk Paste Section */}
          {form.wizardTab === 'bulk' && (
            <div style={{
              background: 'var(--bg-1)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-1)' }}>Paste Accounts (One per line)</span>
                <span className="dim mono" style={{ fontSize: 11 }}>Format: platform:username[:password]</span>
              </div>
              <textarea
                rows={5}
                value={form.bulkText}
                onChange={(e) => setForm({ ...form, bulkText: e.target.value })}
                placeholder={`onlyfans:luna_vip:SecretPass123\nfansly:luna_official\nx:luna_real:MyPassword\ninstagram:luna_model\nreddit:u/luna_cosplay`}
                style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }}
              />

              {/* Live Preview */}
              {(() => {
                const parsed = parseBulkAccounts(form.bulkText);
                return (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', marginBottom: 6 }}>
                      Parsed Preview: {parsed.length} account{parsed.length === 1 ? '' : 's'} detected
                    </div>
                    {parsed.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {parsed.map((p, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-pill)',
                              background: 'var(--bg-2)', border: '1px solid var(--border)',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{p.platform}:</span>
                            <span>@{p.username}</span>
                            {p.password && <span style={{ opacity: 0.6 }}>• encrypted</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Brand Voice / Notes */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600 }}>Brand Voice & Guidelines (Optional)</label>
            <textarea
              rows={2}
              value={form.brand_voice}
              onChange={(e) => setForm({ ...form, brand_voice: e.target.value })}
              placeholder="Chatter guidelines, tone of voice, dos and don'ts…"
              style={{ fontSize: 12 }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="submit" className="primary" style={{ padding: '8px 18px', fontWeight: 600 }}>
              🚀 Create Launch-Ready Model
            </button>
            <button type="button" className="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
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
      ) : (
        /* High-Density Models Directory Table View */
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
                const hasAccounts = (p.account_count || 0) > 0;

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
                          disabled={isLaunching || !hasAccounts}
                          onClick={() => handleLaunchModel(p.id)}
                          style={{
                            fontSize: 11, padding: '4px 10px',
                            opacity: hasAccounts ? 1 : 0.5,
                            cursor: hasAccounts ? 'pointer' : 'not-allowed'
                          }}
                          title={
                            !hasAccounts
                              ? 'No designated accounts linked — click Manage to add accounts'
                              : isRunning
                              ? 'Focus running browser instance'
                              : 'Launch isolated model browser'
                          }
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
                            ✏ Edit
                          </button>
                        )}
                        {canManage && (
                          <button
                            className="ghost"
                            onClick={() => del(p.id, p.name)}
                            style={{ fontSize: 11, padding: '4px 8px', color: 'var(--danger-fg)' }}
                            title="Delete model profile"
                          >
                            🗑 Delete
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
                  <button type="button" className="danger" onClick={() => del(editingProfile.id, editingProfile.name)}>
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
