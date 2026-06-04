import React, { useState } from 'react';
import { saveSelfAssessment, updateAssessment, sendMail } from '../services/sharePointAPI';

// Self-assessment after completing a course.
//  - rating >= 4  -> routed to the employee's manager for review (PendingManagerReview)
//  - rating <  4  -> employee must redo the course + pass a quiz (Remediation)
const SelfAssessmentModal = ({ course, userEmail, managerEmail, accessToken, existingAssessment, onClose, onSubmitted }) => {
  const [rating, setRating] = useState(existingAssessment?.SelfRating || 0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!rating) { setError('Please select a rating from 1 to 5.'); return; }
    setError('');
    setSaving(true);
    const hasManager = !!(managerEmail && managerEmail.trim());
    // >=4 with a manager → review; >=4 with no manager → auto-approved (nobody to route to); <4 → redo
    const nextState = rating >= 4 ? (hasManager ? 'PendingManagerReview' : 'Approved') : 'Remediation';
    const fields = {
      Title: course.Title,
      EmployeeID: userEmail,
      SelfRating: rating,
      AssessmentState: nextState,
      ManagerEmail: managerEmail || '',
      EmployeeComment: comment || '',
    };
    if (nextState === 'Approved') { fields.ManagerRating = rating; fields.ReviewDate = new Date().toISOString(); }
    try {
      if (existingAssessment?.Id) {
        await updateAssessment(accessToken, existingAssessment.Id, fields);
      } else {
        await saveSelfAssessment(accessToken, fields);
      }
      // Notify the manager by email when a high rating needs their review (best-effort).
      if (nextState === 'PendingManagerReview' && managerEmail) {
        const who = (userEmail || '').split('@')[0];
        const portal = typeof window !== 'undefined' ? window.location.origin : '';
        sendMail(accessToken, {
          to: managerEmail,
          subject: `Skip request: ${who} — ${course.Title}`,
          html: `<p>Hi,</p>
            <p><strong>${userEmail}</strong> says they already know <strong>${course.Title}</strong> and self-rated <strong>${rating}/5</strong>${comment ? ` with the note: <em>“${comment}”</em>` : ''}.</p>
            <p>Open the Training Portal → <strong>Assessment Reviews</strong> to <strong>approve</strong> (marks the course complete, they skip it) or set a lower rating to <strong>require the training</strong>.</p>
            ${portal ? `<p><a href="${portal}">Open Training Portal</a></p>` : ''}
            <p>— Training Portal</p>`,
        });
      }
      onSubmitted && onSubmitted(nextState);
    } catch (e) {
      setError('Could not save your assessment. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Overlay>
      <Card>
        <h2 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '20px' }}>⭐ Self-Assessment</h2>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '14px' }}>{course.Title}</p>

        <p style={{ margin: '0 0 12px', color: '#374151', fontSize: '14px', fontWeight: '600' }}>
          How well do you already know this topic? (1 = not at all, 5 = expert)
        </p>

        {/* Rating selector */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5].map(n => {
            const selected = rating === n;
            return (
              <button key={n} onClick={() => setRating(n)} style={{
                flex: 1, padding: '14px 0', borderRadius: '10px', cursor: 'pointer',
                border: `2px solid ${selected ? '#8b5cf6' : '#e2e8f0'}`,
                background: selected ? '#f5f3ff' : 'white',
                color: selected ? '#6d28d9' : '#374151',
                fontSize: '18px', fontWeight: '700', transition: 'all 0.15s'
              }}>{n}</button>
            );
          })}
        </div>

        {/* What happens next */}
        <div style={{
          background: rating >= 4 ? '#eff6ff' : rating > 0 ? '#fef3c7' : '#f8fafc',
          color: rating >= 4 ? '#1e40af' : rating > 0 ? '#92400e' : '#64748b',
          padding: '12px 16px', borderRadius: '8px', marginBottom: '18px', fontSize: '13px'
        }}>
          {rating >= 4
            ? '👍 You\'re saying you already know this. It goes to your manager to confirm — if approved, you can skip the course. (No manager set? It\'s auto-approved.)'
            : rating > 0
              ? '📚 A rating below 4 means you\'ll take the training and pass a quiz to complete it.'
              : 'Select a rating to see the next step.'}
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#374151', fontSize: '13px' }}>
            Comment (optional)
          </label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Anything to add for your manager?"
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '6px',
              fontSize: '14px', color: '#374151', boxSizing: 'border-box', resize: 'vertical', minHeight: '60px' }} />
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={submit} disabled={saving} style={{
            flex: 1, background: '#8b5cf6', color: 'white', padding: '12px', borderRadius: '8px',
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '700', opacity: saving ? 0.7 : 1
          }}>{saving ? 'Submitting...' : 'Submit Assessment'}</button>
          <button onClick={onClose} disabled={saving} style={{
            flex: 1, background: '#f1f5f9', color: '#334155', padding: '12px', borderRadius: '8px',
            border: 'none', cursor: 'pointer', fontWeight: '600'
          }}>Cancel</button>
        </div>
      </Card>
    </Overlay>
  );
};

const Overlay = ({ children }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 3000, padding: '20px'
  }}>{children}</div>
);

const Card = ({ children }) => (
  <div style={{
    background: 'white', borderRadius: '16px', padding: '32px',
    width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 25px 80px rgba(0,0,0,0.4)'
  }}>{children}</div>
);

export default SelfAssessmentModal;
