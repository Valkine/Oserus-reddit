import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useCan } from '../lib/permissions.jsx';
import { useCloudReload } from '../lib/cloudReload.jsx';
import { useCloakManagerLaunch } from '../hooks/useCloakManagerLaunch';
import { useToast } from '../lib/toast.jsx';
import { launchModelBrowser } from '../lib/launchAccount.js';
import { EmptyState } from '../components/ui.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { ProfilesSkeleton } from '../components/Skeletons.jsx';
import ModelRow from '../components/ModelRow.jsx';
import ModelSettingsModal from '../components/ModelSettingsModal.jsx';
import DeleteModelModal from '../components/DeleteModelModal.jsx';
import CreateModelDrawer from '../components/CreateModelDrawer.jsx';

export default function ProfilesPage({ navigate, routeParams }) {
  const { token, user, activeTeamId } = useAuth();
  const { toast } = useToast();
  const { isAvailable, cmBaseUrl, checkAvailabilityWithRetry, startCloakManager, cloakStatus } = useCloakManagerLaunch();
  const [startingCm, setStartingCm] = useState(false);
  const [cmMsg, setCmMsg] = useState(null);
  const [launchingId, setLaunchingId] = useState(null);

  const [profiles, setProfiles] = useState([]);
  const [availablePlatforms, setAvailablePlatforms] = useState([]);
  const [loadingSkel, setLoadingSkel] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'paused' | 'archived'

  const [users, setUsers] = useState([]);
  const [proxies, setProxies] = useState([]);

  // Modals state
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [deletingProfile, setDeletingProfile] = useState(null);

  const can = useCan();
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  const canManage = isOwner || isAdmin || can('profiles.manage');

  useEffect(() => {
    if (routeParams?.openAdd) {
      setShowAddDrawer(true);
    }
  }, [routeParams]);

  const load = useCallback(async () => {
    try {
      const p = await window.api.profiles.list({ token, teamId: activeTeamId }).catch((err) => ({ ok: false, error: err.message }));
      if (p && p.ok) setProfiles(p.profiles || []);

      const [uRes, pxRes, platRes] = await Promise.all([
        canManage ? window.api.auth.listUsers({ token }).catch(() => ({ ok: false })) : Promise.resolve({ ok: false }),
        window.api.proxies.list({ token, teamId: activeTeamId }).catch(() => ({ ok: false })),
        window.api.platforms.list().catch(() => ({ ok: false })),
      ]);
      if (uRes && uRes.ok) setUsers(uRes.users || []);
      if (pxRes && pxRes.ok) setProxies(pxRes.proxies || []);
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

  async function handleLaunchModel(profile) {
    const accCount = profile.accounts?.length || profile.account_count || 0;
    if (accCount === 0) {
      toast('err', `Cannot open browser: Model "${profile.name}" has 0 designated accounts. Please add an account first.`);
      return;
    }
    setLaunchingId(`model-${profile.id}`);
    try {
      const res = await launchModelBrowser({ token, profileId: Number(profile.id) });
      if (res && !res.ok) {
        toast('err', `Failed to launch browser: ${res.error || 'Unknown error'}`);
      }
    } catch (err) {
      toast('err', `Launch error: ${err.message || err}`);
    } finally {
      setLaunchingId(null);
    }
  }

  // Filter profiles based on search and status
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // 1. Status Filter
      if (statusFilter !== 'all') {
        const pStatus = p.status || 'active';
        if (pStatus !== statusFilter) return false;
      }

      // 2. Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.niche && p.niche.toLowerCase().includes(q)) ||
        (p.assigned_to_username && p.assigned_to_username.toLowerCase().includes(q)) ||
        (p.assigned_to_name && p.assigned_to_name.toLowerCase().includes(q)) ||
        (p.accounts && p.accounts.some((a) => a.username && a.username.toLowerCase().includes(q))) ||
        (p.members && p.members.some((m) => (m.display_name && m.display_name.toLowerCase().includes(q)) || (m.username && m.username.toLowerCase().includes(q))))
      );
    });
  }, [profiles, searchQuery, statusFilter]);

  // Counts by status
  const counts = useMemo(() => {
    const res = { all: profiles.length, active: 0, paused: 0, archived: 0 };
    for (const p of profiles) {
      const st = p.status || 'active';
      if (res[st] !== undefined) res[st]++;
    }
    return res;
  }, [profiles]);

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader
        eyebrow="Organization"
        title="Model Profiles"
        subtitle="Unified models directory with isolated antidetect workspaces, linked platform accounts, and team assignments."
      >
        {canManage && (
          <button className="primary" onClick={() => setShowAddDrawer(true)}>
            + New Model
          </button>
        )}
      </PageHeader>

      {/* CloakManager Antidetect Engine Status */}
      {isAvailable !== null && (
        <div
          style={{
            padding: '8px 14px',
            background: isAvailable ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: isAvailable ? 'var(--ok, #10b981)' : 'var(--danger, #ef4444)',
            borderRadius: 'var(--radius)',
            fontSize: 12,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isAvailable ? '#10b981' : '#ef4444',
              boxShadow: isAvailable ? '0 0 6px #10b981' : 'none',
            }}
          />
          <span style={{ fontWeight: 600 }}>Antidetect Engine:</span>
          <span>{isAvailable ? 'CloakManager Online' : 'Engine Offline'}</span>
          {isAvailable && cmBaseUrl && (
            <a
              href="#"
              className="mono dim"
              style={{ fontSize: 11, textDecoration: 'underline', cursor: 'pointer' }}
              onClick={(e) => {
                e.preventDefault();
                window.api.windows.openExternalTabs({ urls: [cmBaseUrl] });
              }}
            >
              {cmBaseUrl}
            </a>
          )}
          {!isAvailable && canManage && (
            <button
              className="ghost"
              style={{ fontSize: 11, padding: '2px 8px', marginLeft: 'auto' }}
              disabled={startingCm}
              onClick={handleStartCloakManager}
            >
              {startingCm ? 'Starting…' : '↻ Start Antidetect'}
            </button>
          )}
          {cmMsg && <span className="muted" style={{ fontSize: 11 }}>{cmMsg}</span>}
        </div>
      )}

      {/* Filter Toolbar: Search + Status Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 360, minWidth: 220 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models, niches, handles, team…"
            style={{ paddingLeft: 32, width: '100%', fontSize: 12 }}
          />
          <span
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.5,
              fontSize: 13,
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                opacity: 0.5,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-1)',
            padding: 3,
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
          }}
        >
          {[
            { key: 'all', label: `All (${counts.all})` },
            { key: 'active', label: `Active (${counts.active})` },
            { key: 'paused', label: `Paused (${counts.paused})` },
            { key: 'archived', label: `Archived (${counts.archived})` },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              className="ghost"
              onClick={() => setStatusFilter(t.key)}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                background: statusFilter === t.key ? 'var(--bg-elev, #23252a)' : 'transparent',
                color: statusFilter === t.key ? 'var(--text-0)' : 'var(--text-2)',
                fontWeight: statusFilter === t.key ? 700 : 400,
                border: statusFilter === t.key ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table or Empty State */}
      {loadingSkel ? (
        <ProfilesSkeleton />
      ) : profiles.length === 0 ? (
        <EmptyState
          icon="◇"
          title="No model profiles yet"
          hint="Create your first model profile to begin managing platform accounts and team assignments."
          action={
            canManage && (
              <button className="primary" onClick={() => setShowAddDrawer(true)}>
                + New Model
              </button>
            )
          }
        />
      ) : filteredProfiles.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 32,
            textAlign: 'center',
            color: 'var(--text-2)',
            fontSize: 13,
          }}
        >
          No models matched the current search or status filter.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr
                style={{
                  background: 'var(--bg-1)',
                  borderBottom: '1px solid var(--border)',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '10px 14px', width: 220 }}>Model</th>
                <th style={{ padding: '10px 12px' }}>Niche</th>
                <th style={{ padding: '10px 12px' }}>Accounts</th>
                <th style={{ padding: '10px 12px' }}>Assigned Team</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((p) => {
                const isRunning = p.cloak_profile_name && cloakStatus && cloakStatus[p.cloak_profile_name] === 'running';
                const isLaunching = launchingId === `model-${p.id}`;
                return (
                  <ModelRow
                    key={p.id}
                    profile={p}
                    canManage={canManage}
                    isLaunching={isLaunching}
                    isRunning={isRunning}
                    onLaunch={handleLaunchModel}
                    onManage={(profile) => navigate && navigate('model', { modelId: profile.id })}
                    onEdit={(profile) => setEditingProfile(profile)}
                    onDelete={(profile) => setDeletingProfile(profile)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Model Drawer (M-4) */}
      {showAddDrawer && (
        <CreateModelDrawer
          platforms={availablePlatforms}
          users={users}
          proxies={proxies}
          activeTeamId={activeTeamId}
          token={token}
          onClose={() => setShowAddDrawer(false)}
          onCreated={() => load()}
        />
      )}

      {/* Model Settings Modal (M-2) */}
      {editingProfile && (
        <ModelSettingsModal
          profile={editingProfile}
          users={users}
          proxies={proxies}
          currentUser={user}
          activeTeamId={activeTeamId}
          token={token}
          onClose={() => setEditingProfile(null)}
          onSaved={() => load()}
        />
      )}

      {/* Delete / Archive Confirmation Modal (M-2) */}
      {deletingProfile && (
        <DeleteModelModal
          profile={deletingProfile}
          token={token}
          activeTeamId={activeTeamId}
          onClose={() => setDeletingProfile(null)}
          onDeleted={() => load()}
          onArchived={() => load()}
        />
      )}
    </div>
  );
}
