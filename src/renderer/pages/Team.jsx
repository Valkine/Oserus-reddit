import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { useCan } from '../lib/permissions.jsx';
import { useToast } from '../lib/toast.jsx';
import { useConfirm } from '../lib/confirm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import TabBar from '../components/TabBar.jsx';
import { EmptyState } from '../components/ui.jsx';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'New York (EST/EDT - UTC-5/-4)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT - UTC-6/-5)' },
  { value: 'America/Denver', label: 'Denver (MST/MDT - UTC-7/-6)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT - UTC-8/-7)' },
  { value: 'Europe/London', label: 'London (GMT/BST - UTC+0/+1)' },
  { value: 'Europe/Paris', label: 'Paris / Berlin (CET/CEST - UTC+1/+2)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST - UTC+4)' },
  { value: 'Asia/Manila', label: 'Manila (PHT - UTC+8)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT - UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST - UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT - UTC+10/+11)' },
];

/**
 * Converts a scheduled shift from owner timezone to worker target timezone.
 */
function convertShiftTime(dayOfWeek, startTimeStr, endTimeStr, sourceTz, targetTz) {
  try {
    const now = new Date();
    // Find next date matching dayOfWeek
    const currentDay = now.getDay();
    let diff = dayOfWeek - currentDay;
    if (diff < 0) diff += 7;
    const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);

    const [sh, sm] = startTimeStr.split(':').map(Number);
    const [eh, em] = endTimeStr.split(':').map(Number);

    // Create formatters for source & target
    const sourceFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: sourceTz,
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
    const targetFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: targetTz,
      weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
    });

    // Approximate conversion display
    const dStart = new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), sh, sm));
    const dEnd = new Date(Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), eh, em));

    return {
      agencyTime: `${startTimeStr} – ${endTimeStr}`,
      workerLocal: `${targetFmt.format(dStart)} – ${targetFmt.format(dEnd)}`,
    };
  } catch {
    return {
      agencyTime: `${startTimeStr} – ${endTimeStr}`,
      workerLocal: `${startTimeStr} – ${endTimeStr}`,
    };
  }
}

export default function TeamPage({ navigate }) {
  const { user, token, activeTeamId } = useAuth();
  const can = useCan();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  const isOwnerOrAdmin = isOwner || isAdmin;

  const detectedUserTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    } catch {
      return 'America/New_York';
    }
  }, []);

  const [tab, setTab] = useState('roster'); // 'roster' | 'shifts' | 'roles' | 'license'

  // Data states
  const [members, setMembers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [licenseData, setLicenseData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Shift form modal
  const [showAddShift, setShowAddShift] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    profile_id: '',
    user_id: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    owner_timezone: 'America/New_York',
    notes: '',
  });

  // Member invite modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState('chatter');

  // Custom role modal
  const [showAddRole, setShowAddRole] = useState(false);
  const [roleForm, setRoleForm] = useState({
    key: '',
    label: '',
    description: '',
    permissions: [],
  });

  // License form
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [licenseBusy, setLicenseBusy] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [mRes, pRes, rRes, sRes, lRes] = await Promise.all([
        window.api.auth.listUsers({ token }).catch(() => ({ ok: false })),
        window.api.profiles.list({ token, teamId: activeTeamId }).catch(() => ({ ok: false })),
        window.api.roles.list({ token }).catch(() => ({ ok: false })),
        window.api.shifts.list({ token, teamId: activeTeamId }).catch(() => ({ ok: false })),
        window.api.license.get({ token }).catch(() => ({ ok: false })),
      ]);

      if (mRes.ok) setMembers(mRes.users || []);
      if (pRes.ok) setProfiles(pRes.profiles || []);
      if (rRes.ok) {
        setRoles(rRes.roles || []);
        setPermissions(rRes.permissions || []);
      }
      if (sRes.ok) setShifts(sRes.shifts || []);
      if (lRes.ok) setLicenseData(lRes);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [token, activeTeamId]);

  // ───────────────────────────────────────────── Member handlers
  async function handleAddMember(e) {
    e.preventDefault();
    if (!addEmail.trim()) return;
    const res = await window.api.team.addMember({ teamId: activeTeamId, email: addEmail.trim(), role: addRole });
    if (res.ok) {
      toast('ok', res.method === 'invitation' ? 'Invitation sent to ' + addEmail : 'Member added to team.');
      setShowAddMember(false);
      setAddEmail('');
      loadAll();
    } else {
      toast('err', res.error || 'Failed to add member');
    }
  }

  async function handleRemoveMember(userId) {
    const ok = await confirm('Remove this member from the agency?', { variant: 'danger', confirmLabel: 'Remove' });
    if (!ok) return;
    const res = await window.api.auth.deleteUser({ token, userId });
    if (res.ok) {
      toast('ok', 'Member removed.');
      loadAll();
    } else {
      toast('err', res.error || 'Failed to remove member');
    }
  }

  // ───────────────────────────────────────────── Shift handlers
  async function handleSaveShift(e) {
    e.preventDefault();
    if (!shiftForm.user_id) { toast('err', 'Select a team member'); return; }
    const res = await window.api.shifts.create({
      token,
      teamId: activeTeamId,
      profileId: shiftForm.profile_id || null,
      userId: shiftForm.user_id,
      dayOfWeek: Number(shiftForm.day_of_week),
      startTime: shiftForm.start_time,
      endTime: shiftForm.end_time,
      ownerTimezone: shiftForm.owner_timezone,
      notes: shiftForm.notes,
    });
    if (res.ok) {
      toast('ok', 'Shift schedule saved.');
      setShowAddShift(false);
      loadAll();
    } else {
      toast('err', res.error || 'Failed to create shift');
    }
  }

  async function handleDeleteShift(shiftId) {
    const ok = await confirm('Delete this scheduled shift?');
    if (!ok) return;
    const res = await window.api.shifts.delete({ token, shiftId });
    if (res.ok) {
      toast('ok', 'Shift removed.');
      loadAll();
    } else {
      toast('err', res.error || 'Failed to delete shift');
    }
  }

  // ───────────────────────────────────────────── Role handlers
  async function handleCreateRole(e) {
    e.preventDefault();
    if (!roleForm.key || !roleForm.label) { toast('err', 'Role key and label are required'); return; }
    const res = await window.api.roles.create({
      token,
      key: roleForm.key.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'),
      label: roleForm.label.trim(),
      description: roleForm.description.trim(),
      permissions: roleForm.permissions,
    });
    if (res.ok) {
      toast('ok', `Custom role "${roleForm.label}" created.`);
      setShowAddRole(false);
      setRoleForm({ key: '', label: '', description: '', permissions: [] });
      loadAll();
    } else {
      toast('err', res.error || 'Failed to create role');
    }
  }

  async function handleDeleteRole(roleKey) {
    const ok = await confirm(`Delete role "${roleKey}"?`);
    if (!ok) return;
    const res = await window.api.roles.delete({ token, key: roleKey });
    if (res.ok) {
      toast('ok', 'Role deleted.');
      loadAll();
    } else {
      toast('err', res.error || 'Failed to delete role');
    }
  }

  // ───────────────────────────────────────────── License handlers
  async function handleActivateLicense(e) {
    e.preventDefault();
    if (!licenseKeyInput.trim()) return;
    setLicenseBusy(true);
    try {
      const res = await window.api.license.activate({ token, key: licenseKeyInput.trim() });
      if (res.ok) {
        toast('ok', `Monthly license activated: ${res.tierName}`);
        setLicenseKeyInput('');
        loadAll();
      } else {
        toast('err', res.error || 'Invalid license key');
      }
    } finally {
      setLicenseBusy(false);
    }
  }

  async function handleUpdatePlatformEarnings(platform, gross, net, subs) {
    const res = await window.api.license.updateEarnings({ token, platform, gross, net, subscribers: subs });
    if (res.ok) {
      toast('ok', `${platform.toUpperCase()} revenue updated.`);
      loadAll();
    } else {
      toast('err', res.error || 'Failed to update platform revenue');
    }
  }

  const tabs = [
    { key: 'roster', label: `Team Roster (${members.length})` },
    { key: 'shifts', label: `Shift Schedule (${shifts.length})` },
    { key: 'roles', label: `Custom Roles (${roles.length})` },
    { key: 'license', label: 'License & Monetization' },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader
        eyebrow="Agency Administration"
        title="Team Hub & Shift Schedules"
        subtitle={isOwner ? 'Full Owner Permissions · Shifts, Custom Roles, & Monthly Licensing' : `Role: ${user?.role || 'Staff'} · Your Shifts & Assigned Work`}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'roster' && isOwnerOrAdmin && (
            <button className="primary" onClick={() => setShowAddMember(true)}>+ Add Member</button>
          )}
          {tab === 'shifts' && isOwnerOrAdmin && (
            <button className="primary" onClick={() => setShowAddShift(true)}>+ Schedule Shift</button>
          )}
          {tab === 'roles' && isOwnerOrAdmin && (
            <button className="primary" onClick={() => setShowAddRole(true)}>+ New Custom Role</button>
          )}
        </div>
      </PageHeader>

      <TabBar items={tabs} activeKey={tab} onChange={setTab} style={{ marginBottom: 20 }} />

      {/* ────────────────────────────────────────────────────────── TAB 1: ROSTER ── */}
      {tab === 'roster' && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Member</th>
                <th style={{ padding: '12px 14px' }}>Role</th>
                <th style={{ padding: '12px 14px' }}>Active Time Today</th>
                <th style={{ padding: '12px 14px' }}>Assigned Models</th>
                <th style={{ padding: '12px 14px' }}>Presence</th>
                {isOwnerOrAdmin && <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const assignedModels = profiles.filter(
                  p => p.assigned_user_id === m.id || (p.members && p.members.some(pm => pm.user_id === m.id))
                );
                const activeHours = ((m.today_seconds || 0) / 3600).toFixed(1);

                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                          color: 'var(--gold)', border: '1px solid var(--border)'
                        }}>
                          {m.display_name?.charAt(0).toUpperCase() || m.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                        <div>
                          <strong style={{ color: 'var(--text-0)' }}>{m.display_name || m.username}</strong>
                          <div className="dim" style={{ fontSize: 11 }}>{m.email || `@${m.username}`}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-pill)',
                        background: m.role === 'owner' ? 'rgba(200,85,61,0.2)' : 'var(--bg-2)',
                        color: m.role === 'owner' ? 'var(--gold)' : 'var(--text-1)',
                        border: '1px solid var(--border)', fontWeight: 600,
                      }}>
                        {m.role ? m.role.toUpperCase() : 'MEMBER'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="mono" style={{ color: m.today_seconds > 0 ? 'var(--online-green)' : 'var(--text-2)' }}>
                        {activeHours} hrs
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {assignedModels.map(p => (
                          <span key={p.id} style={{
                            fontSize: 11, padding: '1px 7px', borderRadius: 'var(--radius-pill)',
                            background: 'var(--bg-2)', border: `1px solid ${p.avatar_color || 'var(--border)'}`,
                            color: 'var(--text-1)'
                          }}>
                            {p.name}
                          </span>
                        ))}
                        {assignedModels.length === 0 && <span className="dim" style={{ fontSize: 11 }}>None</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6,
                        color: m.last_seen_at ? 'var(--online-green)' : 'var(--text-2)'
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.last_seen_at ? 'var(--online-green)' : 'var(--text-3)' }} />
                        {m.last_seen_at ? 'Active' : 'Offline'}
                      </span>
                    </td>
                    {isOwnerOrAdmin && (
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {m.role !== 'owner' && (
                          <button
                            className="danger ghost"
                            onClick={() => handleRemoveMember(m.id)}
                            style={{ fontSize: 11, padding: '2px 8px' }}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── TAB 2: SHIFTS ── */}
      {tab === 'shifts' && (
        <div>
          <div style={{
            padding: '12px 16px', background: 'var(--bg-1)', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', marginBottom: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Dual-Timezone Synchronization Engine</div>
              <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>
                Owner schedules in agency standard time ({shiftForm.owner_timezone}).
                Workers automatically see converted hours in their local timezone ({detectedUserTimezone}).
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="muted" style={{ fontSize: 12 }}>Agency Timezone:</span>
              <select
                value={shiftForm.owner_timezone}
                onChange={(e) => setShiftForm({ ...shiftForm, owner_timezone: e.target.value })}
                style={{ fontSize: 12, padding: '4px 8px' }}
              >
                {COMMON_TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>

          {shifts.length === 0 ? (
            <EmptyState
              icon="◷"
              title="No shift schedules configured"
              hint="Schedule working hours for chatters and VAs to maintain 24/7 inbox coverage across timezones."
              action={isOwnerOrAdmin && <button className="primary" onClick={() => setShowAddShift(true)}>+ Schedule First Shift</button>}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {shifts.map((s) => {
                const times = convertShiftTime(s.day_of_week, s.start_time, s.end_time, s.owner_timezone || 'America/New_York', detectedUserTimezone);

                return (
                  <div key={s.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase' }}>
                          {DAYS[s.day_of_week]}
                        </span>
                        <h4 style={{ margin: '4px 0 0', fontSize: 15 }}>{s.worker_name || s.worker_username}</h4>
                      </div>
                      {isOwnerOrAdmin && (
                        <button
                          className="ghost"
                          onClick={() => handleDeleteShift(s.id)}
                          style={{ padding: '2px 6px', fontSize: 12, color: 'var(--danger-fg)' }}
                          title="Delete shift"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div style={{ padding: '8px 10px', background: 'var(--bg-1)', borderRadius: 4, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="muted">Agency Time:</span>
                        <strong className="mono">{times.agencyTime} ({s.owner_timezone?.split('/')[1] || 'EST'})</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="muted">Worker Local:</span>
                        <strong className="mono" style={{ color: 'var(--online-green)' }}>{times.workerLocal}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span className="muted">Assigned Model:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{s.profile_name || 'All Models'}</span>
                    </div>

                    {s.notes && (
                      <div className="muted" style={{ fontSize: 11, fontStyle: 'italic' }}>
                        "{s.notes}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── TAB 3: CUSTOM ROLES ── */}
      {tab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {roles.map((r) => (
            <div key={r.key} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15 }}>{r.label}</h4>
                  <div className="mono dim" style={{ fontSize: 11, marginTop: 2 }}>key: {r.key}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="pill" style={{ fontSize: 10 }}>
                    {r.user_count || 0} users
                  </span>
                  {!r.is_builtin && isOwnerOrAdmin && (
                    <button
                      className="danger ghost"
                      onClick={() => handleDeleteRole(r.key)}
                      style={{ padding: '2px 6px', fontSize: 11 }}
                      title="Delete role"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {r.description && (
                <div className="muted" style={{ fontSize: 12 }}>
                  {r.description}
                </div>
              )}

              <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <div className="dim" style={{ fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>
                  Permissions ({r.permissions?.length || 0})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {r.permissions && r.permissions.slice(0, 6).map(p => (
                    <span key={p} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: 'var(--bg-2)', color: 'var(--text-2)' }}>
                      {p}
                    </span>
                  ))}
                  {r.permissions && r.permissions.length > 6 && (
                    <span className="dim" style={{ fontSize: 9 }}>+{r.permissions.length - 6} more</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── TAB 4: LICENSE ── */}
      {tab === 'license' && licenseData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* Active License Card */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px' }}>Agency Monthly License</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Status:</span>
                <span style={{ fontWeight: 700, color: 'var(--online-green)' }}>
                  ● {licenseData.license.status?.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Current Tier:</span>
                <strong style={{ color: 'var(--gold)' }}>{licenseData.license.tier_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Monthly Gross Cap:</span>
                <strong>${licenseData.license.monthly_earnings_cap?.toLocaleString()} / month</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Active License Key:</span>
                <span className="mono">{licenseData.license.license_key}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Days Remaining:</span>
                <span>{licenseData.license.days_remaining} days</span>
              </div>
            </div>

            {isOwner && (
              <form onSubmit={handleActivateLicense} style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <label>Activate / Upgrade Monthly License Key</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    placeholder="OSERUS-GROWTH-2026-XXXX"
                    style={{ flex: 1, textTransform: 'uppercase' }}
                  />
                  <button type="submit" className="primary" disabled={licenseBusy || !licenseKeyInput.trim()}>
                    {licenseBusy ? 'Activating…' : 'Activate Key'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Connected Monetization Platforms */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px' }}>Platform Revenue Tracking</h3>
            <div className="dim" style={{ fontSize: 12, marginBottom: 14 }}>
              Live gross revenue sync across OnlyFans, Fansly, and Fanvue to scale agency tier limits.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* OnlyFans */}
              <div style={{ padding: 12, background: 'var(--bg-1)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>💙</span>
                    <strong style={{ color: '#00aff0' }}>OnlyFans API</strong>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--online-green)', fontWeight: 600 }}>● Connected</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span className="muted">MTD Tracked Gross:</span>
                  <strong className="mono">${(licenseData.earnings?.by_platform?.onlyfans || 0).toLocaleString()}</strong>
                </div>
              </div>

              {/* Fansly */}
              <div style={{ padding: 12, background: 'var(--bg-1)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>💙</span>
                    <strong style={{ color: '#1fa2f1' }}>Fansly API</strong>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--online-green)', fontWeight: 600 }}>● Connected</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span className="muted">MTD Tracked Gross:</span>
                  <strong className="mono">${(licenseData.earnings?.by_platform?.fansly || 0).toLocaleString()}</strong>
                </div>
              </div>

              {/* Fanvue */}
              <div style={{ padding: 12, background: 'var(--bg-1)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>💜</span>
                    <strong style={{ color: '#8b5cf6' }}>Fanvue API</strong>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--online-green)', fontWeight: 600 }}>● Connected</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span className="muted">MTD Tracked Gross:</span>
                  <strong className="mono">${(licenseData.earnings?.by_platform?.fanvue || 0).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── MODALS ── */}

      {/* Schedule Shift Modal */}
      {showAddShift && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Schedule Team Shift</h3>
              <button className="ghost" onClick={() => setShowAddShift(false)} style={{ padding: '2px 8px' }}>✕</button>
            </div>
            <form onSubmit={handleSaveShift}>
              <div style={{ marginBottom: 12 }}>
                <label>Team Member *</label>
                <select
                  value={shiftForm.user_id}
                  onChange={(e) => setShiftForm({ ...shiftForm, user_id: e.target.value })}
                  required
                >
                  <option value="">— Select Worker —</option>
                  {members.map(u => (
                    <option key={u.id} value={u.id}>{u.display_name || u.username} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Assigned Model (Optional)</label>
                <select
                  value={shiftForm.profile_id}
                  onChange={(e) => setShiftForm({ ...shiftForm, profile_id: e.target.value })}
                >
                  <option value="">— All Assigned Models —</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.niche || 'General'})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label>Day of Week *</label>
                  <select
                    value={shiftForm.day_of_week}
                    onChange={(e) => setShiftForm({ ...shiftForm, day_of_week: e.target.value })}
                  >
                    {DAYS.map((d, i) => (
                      <option key={d} value={i}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Agency Timezone</label>
                  <select
                    value={shiftForm.owner_timezone}
                    onChange={(e) => setShiftForm({ ...shiftForm, owner_timezone: e.target.value })}
                  >
                    {COMMON_TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label>Start Time (24h) *</label>
                  <input
                    type="time"
                    value={shiftForm.start_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label>End Time (24h) *</label>
                  <input
                    type="time"
                    value={shiftForm.end_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label>Notes / Instructions</label>
                <input
                  value={shiftForm.notes}
                  onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                  placeholder="e.g. VIP chatting focus, reddit posting cadence"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="ghost" onClick={() => setShowAddShift(false)}>Cancel</button>
                <button type="submit" className="primary">Save Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Add Team Member</h3>
              <button className="ghost" onClick={() => setShowAddMember(false)} style={{ padding: '2px 8px' }}>✕</button>
            </div>
            <form onSubmit={handleAddMember}>
              <div style={{ marginBottom: 12 }}>
                <label>Member Email *</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="chatter@agency.com"
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Role</label>
                <select value={addRole} onChange={(e) => setAddRole(e.target.value)}>
                  {roles.map(r => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="ghost" onClick={() => setShowAddMember(false)}>Cancel</button>
                <button type="submit" className="primary">Send Invitation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Custom Role Modal */}
      {showAddRole && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Create Custom Role</h3>
              <button className="ghost" onClick={() => setShowAddRole(false)} style={{ padding: '2px 8px' }}>✕</button>
            </div>
            <form onSubmit={handleCreateRole}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label>Role Identifier (Key) *</label>
                  <input
                    value={roleForm.key}
                    onChange={(e) => setRoleForm({ ...roleForm, key: e.target.value })}
                    placeholder="e.g. night_chatter"
                    required
                  />
                </div>
                <div>
                  <label>Display Label *</label>
                  <input
                    value={roleForm.label}
                    onChange={(e) => setRoleForm({ ...roleForm, label: e.target.value })}
                    placeholder="e.g. Night Chatter"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Description</label>
                <input
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="e.g. Manages overnight OnlyFans inbox and shifts"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ marginBottom: 8 }}>Permissions</label>
                <div style={{
                  maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: 10, background: 'var(--bg-1)',
                  display: 'flex', flexDirection: 'column', gap: 6
                }}>
                  {permissions.map((p) => {
                    const checked = roleForm.permissions.includes(p.key);
                    return (
                      <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRoleForm({ ...roleForm, permissions: [...roleForm.permissions, p.key] });
                            } else {
                              setRoleForm({ ...roleForm, permissions: roleForm.permissions.filter(k => k !== p.key) });
                            }
                          }}
                        />
                        <span>
                          <strong>{p.label}</strong> <span className="dim">({p.key})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="ghost" onClick={() => setShowAddRole(false)}>Cancel</button>
                <button type="submit" className="primary">Create Role</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
