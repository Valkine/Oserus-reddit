import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useCan } from '../lib/permissions.jsx';
import { platformColor } from '../lib/platforms.js';
import PageHeader from '../components/PageHeader.jsx';
import { DashboardSkeleton } from '../components/Skeletons.jsx';
import { StatTile, Avatar, EmptyState } from '../components/ui.jsx';
import { useCloakManagerLaunch } from '../hooks/useCloakManagerLaunch';
import { launchModelBrowser } from '../lib/launchAccount.js';
import { useToast } from '../lib/toast.jsx';

const EMPTY_TOTALS = {
  active_users_now: 0,
  users_online_today: 0,
  total_active_seconds_today: 0,
  posts_today: 0,
  comments_today: 0,
  active_models: 0,
  running_browsers: 0,
};

export default function DashboardPage({ navigate }) {
  const { token, user, activeTeamId } = useAuth();
  const can = useCan();
  const { toast } = useToast();
  const { cloakStatus } = useCloakManagerLaunch();

  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  const isOwnerOrAdmin = isOwner || isAdmin;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [licenseData, setLicenseData] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activity, setActivity] = useState([]);
  const [launchingId, setLaunchingId] = useState(null);
  const [overview, setOverview] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [lic, prof, o, act] = await Promise.all([
        window.api.license.get({ token }).catch(() => ({ ok: false })),
        window.api.profiles.list({ token, teamId: activeTeamId }).catch(() => ({ ok: false })),
        window.api.team.overview({ token, teamId: activeTeamId }).catch(() => ({ ok: false })),
        can('activity.view') ? window.api.activity.list({ token, limit: 30 }).catch(() => ({ ok: false })) : Promise.resolve({ ok: true, entries: [] }),
      ]);

      if (lic.ok) setLicenseData(lic);
      if (prof.ok) setProfiles(prof.profiles || []);
      if (o.ok) setOverview(o);
      if (act.ok) setActivity(act.entries || []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, activeTeamId, can]);

  useEffect(() => { refresh(); }, [refresh]);

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

  const runningBrowsersCount = profiles.filter(
    p => p.cloak_profile_name && cloakStatus && cloakStatus[p.cloak_profile_name] === 'running'
  ).length;

  const totalAccountsCount = profiles.reduce((sum, p) => sum + (p.account_count || 0), 0);
  const postsToday = overview?.totals?.posts_today || 0;

  const lic = licenseData?.license;
  const earn = licenseData?.earnings;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading && !licenseData && profiles.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader
        eyebrow="Executive Workstation"
        title={`${greeting}, ${user?.display_name || user?.username || 'Operator'}`}
        subtitle={isOwner ? 'Agency Owner · Full Revenue & Workstation Control' : `Role: ${user?.role || 'Staff'} · Assigned Models Scoped`}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ghost" onClick={refresh} title="Refresh dashboard data">↻ Refresh</button>
          <button className="primary" onClick={() => navigate('profiles')}>View Models →</button>
        </div>
      </PageHeader>

      {loadError && <div className="error-banner" style={{ marginBottom: 16 }}>{loadError}</div>}

      {/* ────────────────────────────────── PILLAR 2: MONTHLY EARNINGS & LICENSE HERO ── */}
      {isOwnerOrAdmin && earn && lic && (
        <div className="card" style={{
          marginBottom: 20,
          padding: 20,
          background: 'linear-gradient(135deg, rgba(200, 85, 61, 0.08) 0%, rgba(20, 20, 24, 0.95) 100%)',
          border: '1px solid rgba(200, 85, 61, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
            <div>
              <div className="dim" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Month-to-Date Gross Earnings ({earn.period})
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--gold)', letterSpacing: '-0.02em' }}>
                  ${earn.total_gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="muted" style={{ fontSize: 13 }}>
                  Net: ${earn.total_net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                  background: lic.status === 'active' ? 'rgba(122,154,90,0.18)' : 'rgba(214,90,90,0.18)',
                  color: lic.status === 'active' ? 'var(--online-green)' : 'var(--danger-fg)',
                  border: `1px solid ${lic.status === 'active' ? 'rgba(122,154,90,0.4)' : 'rgba(214,90,90,0.4)'}`,
                  fontWeight: 700,
                }}>
                  🔑 {lic.tier_name || 'Active License'}
                </span>
                <button
                  className="ghost"
                  onClick={() => navigate('team')}
                  style={{ fontSize: 11, padding: '3px 10px' }}
                  title="View shift schedule, team roster, or license configuration"
                >
                  Manage License →
                </button>
              </div>
              <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>
                {lic.days_remaining} days remaining in cycle · Key: <span className="mono">{lic.license_key}</span>
              </div>
            </div>
          </div>

          {/* Revenue Cap & Infloww-Style Scale Progress Bar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span className="muted">
                {lic.is_percentage_scale ? (
                  <span style={{ color: 'var(--online-green)', fontWeight: 600 }}>
                    ⚡ Active Enterprise Percentage Scaling (1.0% volume rate over $250,000)
                  </span>
                ) : (
                  <span>
                    {earn.cap_percent}% toward $250,000 scale ceiling · Tier fee: <strong style={{ color: 'var(--gold)' }}>${lic.monthly_fee}/mo</strong>
                  </span>
                )}
              </span>
              <span className="dim">
                {lic.is_percentage_scale
                  ? `+$${(lic.excess_fee || 0).toLocaleString()} volume commission ($${(lic.excess_gross || 0).toLocaleString()} over $250k)`
                  : `$${(lic.headroom || 0).toLocaleString()} headroom to $250k ceiling`}
              </span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${earn.cap_percent}%`,
                height: '100%',
                background: lic.is_percentage_scale
                  ? 'linear-gradient(90deg, var(--gold), var(--online-green))'
                  : earn.cap_percent > 90 ? 'var(--danger)' : 'linear-gradient(90deg, var(--gold), #e67e22)',
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>
              {lic.rate_explanation}
            </div>
          </div>

          {/* Platform Revenue Breakdown Pills */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(0, 175, 240, 0.1)', border: '1px solid rgba(0, 175, 240, 0.3)',
              padding: '6px 14px', borderRadius: 'var(--radius)'
            }}>
              <span style={{ fontSize: 14 }}>💙</span>
              <div>
                <div style={{ fontSize: 10, color: '#00aff0', fontWeight: 700, textTransform: 'uppercase' }}>OnlyFans</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>${(earn.by_platform?.onlyfans || 0).toLocaleString()}</div>
              </div>
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(31, 162, 241, 0.1)', border: '1px solid rgba(31, 162, 241, 0.3)',
              padding: '6px 14px', borderRadius: 'var(--radius)'
            }}>
              <span style={{ fontSize: 14 }}>💙</span>
              <div>
                <div style={{ fontSize: 10, color: '#1fa2f1', fontWeight: 700, textTransform: 'uppercase' }}>Fansly</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>${(earn.by_platform?.fansly || 0).toLocaleString()}</div>
              </div>
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)',
              padding: '6px 14px', borderRadius: 'var(--radius)'
            }}>
              <span style={{ fontSize: 14 }}>💜</span>
              <div>
                <div style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 700, textTransform: 'uppercase' }}>Fanvue</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>${(earn.by_platform?.fanvue || 0).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                className="ghost"
                onClick={() => navigate('inbox')}
                style={{ fontSize: 12, padding: '6px 12px' }}
                title="Open chatter inbox and CRM"
              >
                ✉ Open Inbox Pro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────── STAT TILES STRIP ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatTile
          label="Assigned Models"
          value={profiles.length}
          sub="Isolated browser profiles"
          accent="gold"
        />
        <StatTile
          label="Live Browsers"
          value={runningBrowsersCount}
          sub="CloakManager instances online"
          accent={runningBrowsersCount > 0 ? 'green' : 'default'}
        />
        <StatTile
          label="Total Accounts"
          value={totalAccountsCount}
          sub="Reddit, X, IG, OnlyFans"
        />
        <StatTile
          label="Posts Today"
          value={postsToday}
          sub="Automated & manual published"
        />
      </div>

      {/* ────────────────────────────────── MAIN TWO-COLUMN CONTENT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18 }}>
        {/* Left Column: Active Model Roster & 1-Click Launch */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0 }}>Model Browser Workstations</h3>
              <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>
                AdsPower-style isolated antidetect profiles. 1-click launch brings up persistent tabs & sessions.
              </div>
            </div>
            <button className="ghost" onClick={() => navigate('profiles')} style={{ fontSize: 12 }}>
              All Models →
            </button>
          </div>

          {profiles.length === 0 ? (
            <EmptyState
              icon="◇"
              title="No models assigned"
              hint="You have no models assigned to your workstation yet. Contact your agency owner."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {profiles.map((p) => {
                const isRunning = p.cloak_profile_name && cloakStatus && cloakStatus[p.cloak_profile_name] === 'running';
                const isLaunching = launchingId === `model-${p.id}`;

                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', background: 'var(--bg-1)', border: '1px solid var(--border)',
                      borderLeft: `4px solid ${p.avatar_color || 'var(--accent)'}`,
                      borderRadius: 'var(--radius)', gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.avatar_color || 'var(--accent)' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            onClick={() => navigate('model', { modelId: p.id })}
                            style={{ fontWeight: 600, color: 'var(--text-0)', cursor: 'pointer' }}
                            title="Open model accounts"
                          >
                            {p.name}
                          </span>
                          {p.niche && <span className="pill" style={{ fontSize: 10 }}>{p.niche}</span>}
                          {isRunning && (
                            <span style={{
                              fontSize: 9, padding: '1px 6px', borderRadius: 'var(--radius-pill)',
                              background: 'rgba(122,154,90,0.2)', color: 'var(--online-green)',
                              border: '1px solid rgba(122,154,90,0.4)', fontWeight: 700
                            }}>
                              ● RUNNING
                            </span>
                          )}
                        </div>
                        <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>
                          {p.account_count || 0} accounts · Manager: {p.assigned_to_username || 'None'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        className="primary"
                        disabled={isLaunching}
                        onClick={() => handleLaunchModel(p.id)}
                        style={{ fontSize: 11, padding: '5px 12px' }}
                        title={isRunning ? 'Focus open browser window' : 'Launch browser sandbox'}
                      >
                        {isLaunching ? '⏳ Launching…' : isRunning ? '● Open' : '▶ Launch'}
                      </button>
                      <button
                        className="ghost"
                        onClick={() => navigate('model', { modelId: p.id })}
                        style={{ fontSize: 11, padding: '5px 8px' }}
                      >
                        Accounts →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>Recent Activity</h3>
            <span className="dim" style={{ fontSize: 11 }}>Live Audit</span>
          </div>

          {activity.length === 0 ? (
            <div className="dim" style={{ fontSize: 12, padding: 20, textAlign: 'center' }}>
              No recent activity logged yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
              {activity.slice(0, 15).map((e, idx) => (
                <div key={e.id || idx} style={{ fontSize: 12, padding: '6px 8px', background: 'var(--bg-1)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <strong style={{ color: 'var(--text-1)' }}>{e.username || 'System'}</strong>
                    <span className="dim" style={{ fontSize: 10 }}>{new Date(e.created_at || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {e.action || 'Action'} {e.details ? `· ${e.details}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
