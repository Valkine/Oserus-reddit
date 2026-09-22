import React from 'react';

function getInitials(name) {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const STATUS_CONFIG = {
  active: {
    label: 'ACTIVE',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    color: '#34d399',
    dot: '#10b981',
  },
  paused: {
    label: 'PAUSED',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    color: '#fbbf24',
    dot: '#f59e0b',
  },
  archived: {
    label: 'ARCHIVED',
    bg: 'rgba(113, 113, 122, 0.12)',
    border: 'rgba(113, 113, 122, 0.35)',
    color: '#a1a1aa',
    dot: '#71717a',
  },
};

export default function ModelRow({
  profile,
  canManage,
  onLaunch,
  isLaunching,
  isRunning,
  onManage,
  onEdit,
  onDelete,
}) {
  const {
    id,
    name,
    niche,
    avatar_color = '#d4a64a',
    status = 'active',
    accounts = [],
    account_count,
    members = [],
    assigned_to_username,
  } = profile;

  const initials = getInitials(name);
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const totalAccountCount = accounts?.length || account_count || 0;
  const hasAccounts = totalAccountCount > 0;

  // Build assigned member usernames list
  const assignedNames = [];
  if (assigned_to_username) {
    assignedNames.push(assigned_to_username);
  }
  if (Array.isArray(members)) {
    for (const m of members) {
      const u = m.username || m.display_name;
      if (u && !assignedNames.includes(u)) {
        assignedNames.push(u);
      }
    }
  }

  const visibleAssigned = assignedNames.slice(0, 3);
  const excessAssigned = assignedNames.length - visibleAssigned.length;

  // Accounts pill list (collapse > 3 with "+N more")
  const visibleAccounts = (accounts || []).slice(0, 3);
  const excessAccounts = (accounts || []).length - visibleAccounts.length;

  return (
    <tr
      data-profile-id={id}
      style={{
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-1)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* 1. Avatar + Name */}
      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: avatar_color || '#d4a64a',
              color: '#111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 12,
              flexShrink: 0,
              letterSpacing: 0.5,
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            {initials}
          </div>
          <div>
            <div
              onClick={() => onManage && onManage(profile)}
              style={{
                fontWeight: 600,
                color: 'var(--text-0)',
                cursor: 'pointer',
                fontSize: 13,
              }}
              title="Open model dashboard"
            >
              {name}
            </div>
            {profile.main_email && (
              <div className="dim" style={{ fontSize: 10 }}>
                {profile.main_email}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* 2. Niche */}
      <td style={{ padding: '12px 12px' }}>
        {niche ? (
          <span
            className="pill"
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
            }}
          >
            {niche}
          </span>
        ) : (
          <span className="dim">—</span>
        )}
      </td>

      {/* 3. Accounts Pills */}
      <td style={{ padding: '12px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {visibleAccounts.length === 0 ? (
            <span className="dim" style={{ fontSize: 11 }}>0 accounts</span>
          ) : (
            visibleAccounts.map((acct) => (
              <span
                key={acct.id}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  background: acct.brand_color ? `${acct.brand_color}22` : 'rgba(99,102,241,0.15)',
                  border: `1px solid ${acct.brand_color || 'rgba(99,102,241,0.4)'}`,
                  color: acct.brand_color || 'var(--text-0)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title={`${acct.platform}: ${acct.username}`}
              >
                <span>{acct.platform_name || acct.platform}</span>
                <span style={{ opacity: 0.75, fontWeight: 400 }}>@{acct.username}</span>
              </span>
            ))
          )}
          {excessAccounts > 0 && (
            <span
              className="dim"
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
              }}
              title={`${excessAccounts} more account(s)`}
            >
              +{excessAccounts} more
            </span>
          )}
        </div>
      </td>

      {/* 4. Assigned Team */}
      <td style={{ padding: '12px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {assignedNames.length === 0 ? (
            <span className="dim" style={{ fontSize: 11 }}>Unassigned</span>
          ) : (
            <>
              <span style={{ fontSize: 12, color: 'var(--text-1)' }}>
                {visibleAssigned.join(', ')}
              </span>
              {excessAssigned > 0 && (
                <span
                  className="dim"
                  style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                  }}
                  title={assignedNames.slice(3).join(', ')}
                >
                  +{excessAssigned}
                </span>
              )}
            </>
          )}
        </div>
      </td>

      {/* 5. Status Badge (active | paused | archived) */}
      <td style={{ padding: '12px 12px' }}>
        <span
          style={{
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            background: statusInfo.bg,
            border: `1px solid ${statusInfo.border}`,
            color: statusInfo.color,
            fontWeight: 700,
            letterSpacing: 0.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: statusInfo.dot,
            }}
          />
          {statusInfo.label}
        </span>
      </td>

      {/* 6. Row Actions: Launch Browser, Manage, Edit, Delete */}
      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button
            className={isRunning ? 'ghost' : hasAccounts ? 'primary' : 'ghost'}
            disabled={isLaunching || !hasAccounts}
            onClick={() => onLaunch && onLaunch(profile)}
            style={{
              fontSize: 11,
              padding: '4px 10px',
              fontWeight: 600,
              opacity: hasAccounts ? 1 : 0.45,
              cursor: hasAccounts ? 'pointer' : 'not-allowed',
              background: isRunning ? 'rgba(16, 185, 129, 0.15)' : undefined,
              borderColor: isRunning ? 'rgba(16, 185, 129, 0.4)' : undefined,
              color: isRunning ? '#34d399' : undefined,
            }}
            title={
              !hasAccounts
                ? 'Add at least 1 designated account to launch browser'
                : isRunning
                ? 'Browser running — click to focus window'
                : 'Launch isolated browser workspace'
            }
          >
            {isLaunching ? '⏳ Launching…' : isRunning ? '● Running' : '▶ Open Browser'}
          </button>
          <button
            className="ghost"
            onClick={() => onManage && onManage(profile)}
            style={{ fontSize: 11, padding: '4px 8px' }}
            title="Manage model accounts and workspace"
          >
            Manage →
          </button>
          {canManage && (
            <button
              className="ghost"
              onClick={() => onEdit && onEdit(profile)}
              style={{ fontSize: 11, padding: '4px 8px' }}
              title="Edit settings and team assignments"
            >
              ✏ Edit
            </button>
          )}
          {canManage && (
            <button
              className="ghost"
              onClick={() => onDelete && onDelete(profile)}
              style={{
                fontSize: 11,
                padding: '4px 8px',
                color: 'var(--danger-fg, #ef4444)',
              }}
              title="Delete model profile"
            >
              🗑 Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
