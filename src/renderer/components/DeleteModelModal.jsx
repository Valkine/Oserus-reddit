import React, { useState } from 'react';
import { useToast } from '../lib/toast.jsx';

export default function DeleteModelModal({
  profile,
  token,
  activeTeamId,
  onClose,
  onDeleted,
  onArchived,
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!profile) return null;

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await window.api.profiles.delete({
        token,
        profileId: profile.id,
        teamId: activeTeamId,
      });
      if (!res.ok) {
        setError(res.error || 'Failed to delete profile');
        return;
      }
      toast('ok', `Model "${profile.name}" deleted.`);
      onDeleted && onDeleted(profile.id);
      onClose && onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    setBusy(true);
    setError(null);
    try {
      const res = await window.api.profiles.update({
        token,
        profileId: profile.id,
        teamId: activeTeamId,
        updates: { status: 'archived' },
      });
      if (!res.ok) {
        setError(res.error || 'Failed to archive profile');
        return;
      }
      toast('ok', `Model "${profile.name}" archived.`);
      onArchived && onArchived(profile.id);
      onClose && onClose();
    } catch (err) {
      setError(err.message || 'Failed to archive');
    } finally {
      setBusy(false);
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
          maxWidth: 480,
          background: 'var(--bg-elev, #18191c)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-0)' }}>
            Delete Model Profile
          </h3>
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
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5, marginBottom: 16 }}>
          Are you sure you want to permanently delete <strong>{profile.name}</strong>?
          All associated platform account records and credentials will be removed.
        </p>

        <div
          style={{
            padding: 12,
            borderRadius: 'var(--radius)',
            background: 'var(--bg-1)',
            border: '1px solid var(--border)',
            fontSize: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text-0)', marginBottom: 4 }}>
            💡 Tip: Consider Archiving instead
          </div>
          <div className="dim">
            Archiving removes this model from active rotations while safely keeping all history and credentials intact for your agency records.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          {profile.status !== 'archived' && (
            <button
              type="button"
              className="ghost"
              onClick={handleArchive}
              disabled={busy}
              style={{ color: 'var(--gold, #d4a64a)' }}
            >
              Archive Instead
            </button>
          )}
          <button
            type="button"
            className="primary"
            onClick={handleDelete}
            disabled={busy}
            style={{
              background: 'var(--danger, #ef4444)',
              borderColor: 'var(--danger, #ef4444)',
              color: '#fff',
            }}
          >
            {busy ? 'Deleting…' : 'Permanently Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
