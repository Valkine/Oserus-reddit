import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useCan, usePermissions } from '../lib/permissions.jsx';
import logoUrl from '../assets/logo.png';
import ActivityDrawer from './ActivityDrawer.jsx';

export const NAV = [
  // Operations zone (daily creator & model work)
  { key: 'dashboard',     label: 'Dashboard',     icon: '⬢', group: 'Operations',     perm: 'page.dashboard' },
  { key: 'profiles',      label: 'Models',        icon: '◇', group: 'Operations',     perm: 'page.profiles' },
  { key: 'inbox',         label: 'Inbox & Chat',  icon: '✉', group: 'Operations',     perm: 'page.reddit-api' },
  { key: 'analytics',     label: 'Analytics',     icon: '◧', group: 'Operations',     perm: 'page.analytics' },

  // Traffic & Automation zone (growth, scheduling, scripts)
  { key: 'scheduler',     label: 'Scheduler',     icon: '◷', group: 'Traffic & Auto', perm: 'page.scheduler' },
  { key: 'automation',    label: 'Automation',    icon: '⟳', group: 'Traffic & Auto', perm: 'page.autopilot' },
  { key: 'scripts',       label: 'Scripts',       icon: '◫', group: 'Traffic & Auto', perm: 'page.scripts' },
  { key: 'intel',         label: 'Intelligence',  icon: '◎', group: 'Traffic & Auto', perm: 'page.intel' },

  // Agency System zone (team, platform presets, configurations)
  { key: 'team',          label: 'Team & Access', icon: '⚑', group: 'Agency System',  perm: 'page.team' },
  { key: 'platforms',     label: 'Platforms',     icon: '🌐', group: 'Agency System',  perm: 'page.settings' },
  { key: 'settings',      label: 'Configuration', icon: '⚙', group: 'Agency System',  perm: 'page.settings' },
];

export default function Shell({ route, navigate, children, goBack, canGoBack }) {
  const { user, logout, activeTeamId, setActiveTeam } = useAuth();
  const can = useCan();
  const { previewing, effectiveRole, exitPreview } = usePermissions();
  const [version, setVersion] = useState('');
  const [cloudConnected, setCloudConnected] = useState(false);
  const [teams, setTeams] = useState([]);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  // Command Palette / Quick-Jump state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [paletteModels, setPaletteModels] = useState([]);
  const [palettePlatforms, setPalettePlatforms] = useState([]);

  useEffect(() => {
    if (!paletteOpen) return;
    setPaletteQuery('');
    setPaletteIndex(0);

    window.api.profiles.list({ teamId: activeTeamId })
      .then(res => res && res.ok && setPaletteModels(res.profiles || []))
      .catch(() => {});

    window.api.platforms.list()
      .then(res => res && res.ok && setPalettePlatforms(res.platforms || []))
      .catch(() => {});
  }, [paletteOpen, activeTeamId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape' && paletteOpen) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paletteOpen]);

  const paletteItems = React.useMemo(() => {
    const q = paletteQuery.toLowerCase().trim();
    const items = [];

    // 1. Actions
    const actions = [
      { id: 'act-new-model', type: 'action', title: '+ Fast New Model & Accounts', subtitle: 'Open all-in-one onboarding wizard', icon: '✨', onSelect: () => navigate('profiles', { openAdd: true }) },
      { id: 'act-new-plat', type: 'action', title: '+ Add Custom Platform', subtitle: 'Create new platform or presets', icon: '⚡', onSelect: () => navigate('platforms', { openAdd: true }) },
      { id: 'act-team', type: 'action', title: 'Manage Team & Access', subtitle: 'Invite workers and assign roles', icon: '⚑', onSelect: () => navigate('team') },
      { id: 'act-proxies', type: 'action', title: 'Manage Proxies', subtitle: 'Configure residential/mobile proxies', icon: '🔌', onSelect: () => navigate('settings') },
    ];
    for (const a of actions) {
      if (!q || a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)) {
        items.push(a);
      }
    }

    // 2. Pages
    const pages = [
      { id: 'page-dash', type: 'page', title: 'Dashboard', subtitle: 'Management Hub, revenue, quick launchers', icon: '⬢', onSelect: () => navigate('dashboard') },
      { id: 'page-models', type: 'page', title: 'Models Directory', subtitle: 'High-density roster, browser launchers', icon: '◇', onSelect: () => navigate('profiles') },
      { id: 'page-inbox', type: 'page', title: 'Inbox & Chatting', subtitle: 'OnlyFans & platform message center', icon: '✉', onSelect: () => navigate('inbox') },
      { id: 'page-analytics', type: 'page', title: 'Analytics & Revenue', subtitle: 'Platform earnings, commissions, metrics', icon: '◧', onSelect: () => navigate('analytics') },
      { id: 'page-sched', type: 'page', title: 'Scheduler Pro', subtitle: 'Calendar, multi-account queue', icon: '◷', onSelect: () => navigate('scheduler') },
      { id: 'page-auto', type: 'page', title: 'Automation & Autopilot', subtitle: 'Rules, scheduled tasks, flows', icon: '⟳', onSelect: () => navigate('automation') },
      { id: 'page-scripts', type: 'page', title: 'Scripts & Macros', subtitle: 'CDP browser automation scripts', icon: '◫', onSelect: () => navigate('scripts') },
      { id: 'page-intel', type: 'page', title: 'Intelligence & Research', subtitle: 'Trends, subreddit scoring', icon: '◎', onSelect: () => navigate('intel') },
      { id: 'page-team', type: 'page', title: 'Team & Roles', subtitle: 'Member permissions, chatter assignments', icon: '⚑', onSelect: () => navigate('team') },
      { id: 'page-plats', type: 'page', title: 'Platforms & Presets', subtitle: '1-click presets, platform link manager', icon: '🌐', onSelect: () => navigate('platforms') },
      { id: 'page-sett', type: 'page', title: 'System Configuration', subtitle: 'Proxies, cloud sync, security', icon: '⚙', onSelect: () => navigate('settings') },
    ];
    for (const p of pages) {
      if (!q || p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)) {
        items.push(p);
      }
    }

    // 3. Models
    for (const m of paletteModels) {
      const match = !q || m.name?.toLowerCase().includes(q) || (m.niche && m.niche.toLowerCase().includes(q));
      if (match) {
        items.push({
          id: `model-${m.id}`,
          type: 'model',
          title: m.name,
          subtitle: `${m.niche || 'General'} · ${m.account_count || 0} account(s)`,
          icon: '👤',
          color: m.avatar_color,
          onSelect: () => navigate('model', { modelId: m.id }),
        });
      }
    }

    // 4. Platforms
    for (const pl of palettePlatforms) {
      const match = !q || pl.label?.toLowerCase().includes(q) || pl.key?.toLowerCase().includes(q);
      if (match) {
        items.push({
          id: `plat-${pl.id}`,
          type: 'platform',
          title: pl.label,
          subtitle: `${pl.key} · ${pl.account_count || 0} account(s)`,
          icon: pl.icon || '🌐',
          color: pl.color,
          onSelect: () => navigate('platforms'),
        });
      }
    }

    return items;
  }, [paletteQuery, paletteModels, palettePlatforms, navigate]);

  const handlePaletteKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPaletteIndex(i => (i + 1) % Math.max(1, paletteItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPaletteIndex(i => (i - 1 + paletteItems.length) % Math.max(1, paletteItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = paletteItems[paletteIndex];
      if (sel) {
        setPaletteOpen(false);
        sel.onSelect();
      }
    }
  };

  useEffect(() => {
    if (window.api?.app?.version) {
      window.api.app.version().then(v => setVersion(v.version));
    }
  }, []);

  useEffect(() => {
    if (!window.api?.cloud) return;
    window.api.cloud.getStatus().then((s) => s && setCloudConnected(!!s.connected));
    const off = window.api.cloud.onStatus((s) => setCloudConnected(!!s?.connected));
    return () => { try { off && off(); } catch {} };
  }, []);

  useEffect(() => {
    if (!user) return;
    window.api.team.listTeams({}).then(res => {
      if (res.ok && res.teams) setTeams(res.teams);
    }).catch(() => {});
    window.api.team.listMyInvitations({}).then(res => {
      if (res.ok && res.invitations) setPendingInvites(res.invitations.length);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    window.api.team.acceptPendingInvitations({}).catch(() => {});
  }, [user]);

  const grouped = {};
  for (const item of NAV) {
    if (item.perm && !can(item.perm)) continue;
    (grouped[item.group] = grouped[item.group] || []).push(item);
  }

  const currentTeam = teams.find(t => t.id === activeTeamId) || teams[0] || null;

  return (
    <div style={styles.root}>
      <aside style={styles.sidebar} className="app-sidebar">
        <div style={styles.brand}>
          <img src={logoUrl} alt="Oserus Management" style={styles.logo} />
        </div>

        {/* Team switcher */}
        {teams.length > 0 && (
          <div style={{ padding: '0 14px 14px' }}>
            {creating ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Escape') { setCreating(false); setNewTeamName(''); return; }
                    if (e.key !== 'Enter') return;
                    const name = newTeamName.trim();
                    if (!name) return;
                    const res = await window.api.team.createTeam({ name });
                    setCreating(false);
                    setNewTeamName('');
                    if (res.ok) {
                      const teamsRes = await window.api.team.listTeams({});
                      if (teamsRes.ok && teamsRes.teams) {
                        setTeams(teamsRes.teams);
                        setActiveTeam(res.team.id);
                      }
                    }
                  }}
                  placeholder="Team name"
                  autoFocus
                  style={{
                    flex: 1, fontSize: 12, padding: '4px 6px',
                    background: 'var(--bg-2)', border: '1px solid var(--gold)',
                    borderRadius: 'var(--radius)', color: 'var(--text-1)',
                    outline: 'none',
                  }}
                />
                <button
                  className="ghost"
                  onClick={() => { setCreating(false); setNewTeamName(''); }}
                  style={{
                    width: 26, height: 26, padding: 0, display: 'grid', placeItems: 'center',
                    fontSize: 13, borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)', background: 'var(--bg-2)',
                    color: 'var(--text-2)', cursor: 'pointer', lineHeight: 1,
                  }}
                  title="Cancel"
                >✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 4 }}>
                <select
                  value={activeTeamId || ''}
                  onChange={(e) => setActiveTeam(e.target.value)}
                  style={{
                    flex: 1, fontSize: 12, padding: '5px 6px',
                    background: 'var(--bg-2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', color: 'var(--text-1)',
                  }}
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  className="ghost"
                  onClick={() => setCreating(true)}
                  style={{
                    width: 26, height: 26, padding: 0, display: 'grid', placeItems: 'center',
                    fontSize: 14, fontWeight: 600, borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)', background: 'var(--bg-2)',
                    color: 'var(--text-2)', cursor: 'pointer', lineHeight: 1,
                  }}
                  title="Create a new team"
                >+</button>
              </div>
            )}
          </div>
        )}

        {pendingInvites > 0 && (
          <div style={{
            margin: '0 14px 12px', padding: '6px 10px',
            background: 'rgba(212,166,74,0.12)', border: '1px solid var(--gold)',
            borderRadius: 'var(--radius)', fontSize: 11, color: 'var(--gold-bright)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ flex: 1 }}>{pendingInvites} pending invitation{pendingInvites > 1 ? 's' : ''}</span>
            <button className="ghost" onClick={() => navigate('team')} style={{ fontSize: 11, textDecoration: 'underline', padding: '2px 6px' }}>
              View
            </button>
          </div>
        )}

        <nav style={styles.nav}>
          {Object.entries(grouped).map(([group, items], gi) => (
            <div key={group} style={{ marginBottom: 6 }}>
              <div style={styles.navGroup}>
                <span>{group}</span>
                {gi > 0 && <div style={styles.navGroupLine} />}
              </div>
              {items.map((it) => {
                const active = route === it.key;
                return (
                  <button
                    key={it.key}
                    onClick={() => navigate(it.key)}
                    style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }}
                  >
                    <span style={{ ...styles.navIcon, ...(active ? styles.navIconActive : {}) }}>
                      {it.icon}
                    </span>
                    <span style={active ? { color: 'var(--gold-bright)' } : {}}>{it.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={styles.userBlock}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={styles.avatar}>
              {(user.display_name || user.username)[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.userName}>{user.display_name || user.username}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                <span className={`pill ${(effectiveRole || user.role) === 'admin' ? 'admin' : ''}`}>
                  {(effectiveRole || user.role).replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="ghost" onClick={logout} style={{ flex: 1, fontSize: 11, padding: '6px 10px' }}>
              Sign out
            </button>
            <div style={styles.cloudRow} className="mono" title={cloudConnected ? 'Cloud synced' : 'Offline'}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: cloudConnected ? 'var(--online-green)' : 'var(--text-3)',
                boxShadow: cloudConnected ? '0 0 6px rgba(122,154,90,0.8)' : 'none',
              }} />
              <span>{cloudConnected ? 'Cloud' : 'Offline'}</span>
            </div>
          </div>
          {version && (
            <div style={styles.versionTag} className="mono">v{version}</div>
          )}
        </div>
      </aside>

      <main style={styles.main}>
        {previewing && (
          <div style={styles.previewBanner}>
            <span>Previewing as <strong>{effectiveRole}</strong> — you see what they see.</span>
            <button className="ghost" onClick={exitPreview} style={{ marginLeft: 'auto', fontSize: 11 }}>Exit preview</button>
          </div>
        )}
        <div style={styles.contextBar}>
          <button
            className="ghost"
            onClick={goBack}
            disabled={!canGoBack}
            style={{ ...styles.backBtn, opacity: canGoBack ? 1 : 0.35, cursor: canGoBack ? 'pointer' : 'default' }}
            title="Back"
          >← Back</button>
          <span style={styles.crumb}>
            {(NAV.find((n) => n.key === route)?.label) || route}
          </span>
          {currentTeam && (
            <span style={styles.teamCrumb} className="mono" title="Active team">
              {currentTeam.name}
            </span>
          )}

          {/* Quick-Jump Spotlight button */}
          <button
            type="button"
            className="ghost"
            onClick={() => setPaletteOpen(true)}
            style={{
              marginLeft: 14, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text-2)', cursor: 'pointer',
            }}
            title="Quick-Jump Spotlight (Ctrl+K)"
          >
            <span>🔍</span>
            <span>Jump to...</span>
            <kbd style={{ fontSize: 9, padding: '1px 4px', background: 'var(--bg-0)', borderRadius: 3, border: '1px solid var(--border)', color: 'var(--gold)' }}>Ctrl K</kbd>
          </button>

          <div style={{ marginLeft: 'auto' }}>
            <ActivityDrawer navigate={navigate} />
          </div>
        </div>
        <section style={styles.content}>{children}</section>
      </main>

      {/* Global Quick-Jump Spotlight / Command Palette (Ctrl+K) */}
      {paletteOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '10vh', zIndex: 10000, backdropFilter: 'blur(3px)',
          }}
          onClick={() => setPaletteOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 580, maxHeight: '75vh', display: 'flex', flexDirection: 'column',
              background: 'var(--bg-elev)', border: '1px solid var(--gold)',
              borderRadius: 'var(--radius-lg)', boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
              overflow: 'hidden',
            }}
          >
            {/* Input Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
              <span style={{ fontSize: 16, opacity: 0.6 }}>🔍</span>
              <input
                value={paletteQuery}
                onChange={(e) => { setPaletteQuery(e.target.value); setPaletteIndex(0); }}
                onKeyDown={handlePaletteKeyDown}
                placeholder="Jump to model, platform, action, or page… (type or use ↑↓)"
                autoFocus
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  outline: 'none', fontSize: 14, color: 'var(--text-0)',
                }}
              />
              <kbd style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4 }}>ESC</kbd>
            </div>

            {/* Results List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px', maxHeight: 420 }}>
              {paletteItems.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  No matching models, platforms, or pages found.
                </div>
              ) : (
                paletteItems.map((item, idx) => {
                  const isSelected = idx === paletteIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setPaletteOpen(false);
                        item.onSelect();
                      }}
                      onMouseEnter={() => setPaletteIndex(idx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '9px 12px', borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(212,166,74,0.15)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--gold)' : '3px solid transparent',
                        transition: 'background 0.1s ease',
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                        background: item.color || 'var(--bg-2)', border: '1px solid var(--border)',
                        display: 'grid', placeItems: 'center', fontSize: 13, flexShrink: 0,
                      }}>
                        {item.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--gold-bright)' : 'var(--text-1)' }}>
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.subtitle}
                          </div>
                        )}
                      </div>

                      <span style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 'var(--radius-pill)',
                        textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
                        background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-3)',
                      }}>
                        {item.type}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer hints */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 16px', background: 'var(--bg-1)', borderTop: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-3)',
            }}>
              <span>Navigation: <kbd style={{ padding: '1px 4px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3 }}>↑</kbd> <kbd style={{ padding: '1px 4px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3 }}>↓</kbd> to select</span>
              <span>Select: <kbd style={{ padding: '1px 4px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3 }}>↵ Enter</kbd></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { display: 'flex', height: '100%', background: 'var(--bg-0)' },
  sidebar: {
    width: 230, flexShrink: 0, display: 'flex', flexDirection: 'column',
    paddingTop: 34, overflow: 'hidden',
  },
  brand: {
    padding: '2px 18px 16px', borderBottom: '1px solid var(--border)',
    marginBottom: 12, display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1,
  },
  logo: { width: 180, height: 'auto', filter: 'drop-shadow(0 2px 8px rgba(61, 107, 79, 0.2))' },
  nav: { flex: 1, overflowY: 'auto', padding: '0 10px', position: 'relative', zIndex: 1 },
  navGroup: {
    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: 'var(--text-3)',
    padding: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: 10,
    position: 'relative',
  },
  navGroupLine: {
    flex: 1, height: 1,
    background: 'linear-gradient(90deg, var(--border-strong) 0%, transparent 100%)',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    textAlign: 'left', background: 'transparent',
    border: '1px solid transparent', borderColor: 'transparent',
    color: 'var(--text-1)', padding: '7px 10px',
    borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 400,
    marginBottom: 1, cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s',
  },
  navItemActive: {
    background: 'linear-gradient(90deg, rgba(212,166,74,0.14) 0%, rgba(58,111,140,0.08) 100%)',
    color: 'var(--gold-bright)', fontWeight: 600,
    borderColor: 'rgba(212,166,74,0.2)',
    boxShadow: 'inset 3px 0 0 var(--gold)',
  },
  navIcon: {
    width: 22, height: 22, display: 'grid', placeItems: 'center',
    fontSize: 14, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', flexShrink: 0,
  },
  navIconActive: { color: 'var(--gold)' },
  userBlock: {
    margin: '12px 10px 14px', padding: 12,
    background: 'var(--bg-1)', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)', position: 'relative', zIndex: 1,
  },
  avatar: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--green), var(--gold))',
    color: 'var(--bg-0)', display: 'grid', placeItems: 'center',
    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
    flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  versionTag: {
    marginTop: 8, fontSize: 9, letterSpacing: '0.15em',
    color: 'var(--text-3)', textAlign: 'center',
  },
  cloudRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, color: 'var(--text-2)', gap: 6,
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  contextBar: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 24px', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-1)', flexShrink: 0,
  },
  backBtn: { fontSize: 11, padding: '4px 10px' },
  crumb: { fontSize: 12, color: 'var(--text-1)', fontWeight: 600 },
  teamCrumb: {
    marginLeft: 'auto', fontSize: 10, color: 'var(--text-3)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)',
    padding: '2px 10px',
  },
  previewBanner: {
    background: 'linear-gradient(90deg, rgba(212,166,74,0.18), rgba(79,138,100,0.12))',
    borderBottom: '1px solid var(--gold)', color: 'var(--gold-bright)',
    padding: '8px 24px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 10,
  },
  content: { flex: 1, overflow: 'auto', padding: 24 },
};
