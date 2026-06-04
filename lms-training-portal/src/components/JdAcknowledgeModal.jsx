import React, { useState } from 'react';
import { roleFromJdTitle } from '../services/sharePointAPI';

// Captures an explicit acknowledgement (typed signature + confirmation) before a JD is
// marked complete. The timestamp is stamped server-side in saveJdAcknowledgement.
const JdAcknowledgeModal = ({ course, defaultName = '', onConfirm, onClose }) => {
  const [signature, setSignature] = useState(defaultName);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const role = roleFromJdTitle(course.Title);
  const ready = confirmed && signature.trim().length >= 2;

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);
    try { await onConfirm(signature.trim()); }
    catch (e) { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h2 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '20px' }}>📄 Acknowledge Job Description</h2>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '14px' }}>{role}</p>

        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '18px', cursor: 'pointer', color: '#374151', fontSize: '14px', lineHeight: 1.5 }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: '3px', width: '16px', height: '16px', flexShrink: 0 }} />
          <span>I confirm I have <strong>read and understood</strong> the responsibilities and expectations of this job description.</span>
        </label>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>
            Type your full name as signature *
          </label>
          <input value={signature} onChange={e => setSignature(e.target.value)} placeholder="e.g. Jane Doe" style={{
            width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '8px',
            border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'cursive'
          }} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={submit} disabled={!ready || saving} style={{
            flex: 1, background: ready && !saving ? '#10b981' : '#d1d5db', color: ready && !saving ? 'white' : '#9ca3af',
            padding: '12px', borderRadius: '8px', border: 'none', cursor: ready && !saving ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: '700'
          }}>
            {saving ? 'Saving…' : '✅ Acknowledge & Complete'}
          </button>
          <button onClick={onClose} disabled={saving} style={{
            background: '#f1f5f9', color: '#334155', padding: '12px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600'
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default JdAcknowledgeModal;
