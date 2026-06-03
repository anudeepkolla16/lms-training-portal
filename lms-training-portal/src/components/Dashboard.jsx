import React, { useState, useEffect } from 'react';
import { getMyEnrollments, updateEnrollmentStatus } from '../services/sharePointAPI';

const Dashboard = ({ accessToken, user }) => {
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showPDF, setShowPDF] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  const userEmail = user.username || user.mail || user.idTokenClaims?.preferred_username || '';
  const userName = user.givenName || user.name || user.username?.split('@')[0] || 'there';

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMyEnrollments(accessToken, userEmail);
        setEnrollments(data);
      } catch (err) {
        setError('Failed to load courses. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [accessToken, userEmail]);

  const reload = async () => {
    try {
      const data = await getMyEnrollments(accessToken, userEmail);
      setEnrollments(data);
    } catch (err) { console.error(err); }
  };

  const handleMarkComplete = async (enrollmentId) => {
    setUpdating(true);
    try {
      await updateEnrollmentStatus(accessToken, enrollmentId, 'Completed');
      await reload();
      setSelectedCourse(prev => prev ? { ...prev, Status: 'Completed' } : null);
    } catch (err) {
      setError('Failed to update. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const completedCount = enrollments.filter(e => e.Status === 'Completed').length;
  const activeCount = enrollments.filter(e => e.Status === 'Active' || e.Status === 'In Progress').length;
  const completionRate = enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0;

  const statusColor = (s) => s === 'Completed' ? '#10b981' : s === 'Active' ? '#3b82f6' : '#f59e0b';
  const statusBg = (s) => s === 'Completed' ? '#d1fae5' : s === 'Active' ? '#dbeafe' : '#fef3c7';
  const statusText = (s) => s === 'Completed' ? '#065f46' : s === 'Active' ? '#1e40af' : '#92400e';

  // Build SharePoint embed URL from sharing link
  const getEmbedUrl = (url) => {
    if (!url) return null;
    // For SharePoint sharing links, add action=embedview
    if (url.includes('sharepoint.com')) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}action=embedview`;
    }
    return url;
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px', background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '26px', fontWeight: '700' }}>
          Welcome back, {userName}! 👋
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Your training progress and assigned courses</p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Courses Assigned', value: enrollments.length, color: '#3b82f6', icon: '📚' },
          { label: 'Completed', value: completedCount, color: '#10b981', icon: '✅' },
          { label: 'In Progress', value: activeCount, color: '#f59e0b', icon: '⏳' },
          { label: 'Completion Rate', value: `${completionRate}%`, color: '#8b5cf6', icon: '📊' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${s.color}`
          }}>
            <p style={{ margin: '0 0 6px', color: '#6b7280', fontSize: '13px' }}>{s.icon} {s.label}</p>
            <h3 style={{ margin: 0, color: s.color, fontSize: '28px', fontWeight: '700' }}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Course List */}
      <h2 style={{ color: '#1e293b', marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>My Courses</h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', background: 'white', borderRadius: '12px' }}>
          Loading your courses...
        </div>
      ) : enrollments.length === 0 ? (
        <div style={{ background: 'white', padding: '48px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <p style={{ fontSize: '16px', margin: '0 0 6px' }}>No courses assigned yet.</p>
          <p style={{ fontSize: '13px', margin: 0 }}>Contact your manager to get enrolled in training courses.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {enrollments.map(e => (
            <div key={e.Id} style={{
              background: 'white', borderRadius: '12px', padding: '20px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
              borderLeft: `4px solid ${statusColor(e.Status)}`
            }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '16px', fontWeight: '600' }}>{e.Title}</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    background: statusBg(e.Status), color: statusText(e.Status),
                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                  }}>{e.Status || 'Not Started'}</span>
                  {e.Department && <span style={{ color: '#64748b', fontSize: '13px' }}>🏢 {e.Department}</span>}
                  {e.Duration && <span style={{ color: '#64748b', fontSize: '13px' }}>⏱ {e.Duration}</span>}
                  {e.DueDate && <span style={{ color: new Date(e.DueDate) < new Date() && e.Status !== 'Completed' ? '#ef4444' : '#64748b', fontSize: '13px' }}>
                    📅 Due: {new Date(e.DueDate).toLocaleDateString()}
                  </span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                {e.CourseMaterials && (
                  <button onClick={() => { setSelectedCourse(e); setShowPDF(true); }} style={{
                    background: '#3b82f6', color: 'white', padding: '9px 16px',
                    borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                  }}>
                    📖 Read Course
                  </button>
                )}
                <button onClick={() => { setSelectedCourse(e); setShowPDF(false); }} style={{
                  background: '#f1f5f9', color: '#334155', padding: '9px 16px',
                  borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                }}>
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDF READER MODAL - Full Screen */}
      {selectedCourse && showPDF && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 2000, display: 'flex', flexDirection: 'column'
        }}>
          {/* PDF Toolbar */}
          <div style={{
            background: '#1e293b', padding: '14px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
          }}>
            <div>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '16px' }}>📖 {selectedCourse.Title}</span>
              {selectedCourse.Duration && <span style={{ color: '#94a3b8', fontSize: '13px', marginLeft: '12px' }}>⏱ {selectedCourse.Duration}</span>}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <a href={selectedCourse.CourseMaterials} target="_blank" rel="noopener noreferrer"
                style={{ background: '#3b82f6', color: 'white', padding: '8px 14px', borderRadius: '7px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                ↗ Open in new tab
              </a>
              {selectedCourse.Status !== 'Completed' && (
                <button onClick={() => handleMarkComplete(selectedCourse.Id)} disabled={updating}
                  style={{ background: '#10b981', color: 'white', padding: '8px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', opacity: updating ? 0.7 : 1 }}>
                  {updating ? '⏳ Saving...' : '✅ Mark Complete'}
                </button>
              )}
              {selectedCourse.Status === 'Completed' && (
                <span style={{ background: '#d1fae5', color: '#065f46', padding: '8px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: '600' }}>
                  ✅ Completed
                </span>
              )}
              <button onClick={() => { setShowPDF(false); setSelectedCourse(null); }}
                style={{ background: '#ef4444', color: 'white', padding: '8px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                ✕ Close
              </button>
            </div>
          </div>

          {/* PDF Iframe */}
          <iframe
            src={getEmbedUrl(selectedCourse.CourseMaterials)}
            title={selectedCourse.Title}
            style={{ flex: 1, border: 'none', background: '#525659' }}
            allow="fullscreen"
          />
        </div>
      )}

      {/* DETAILS MODAL */}
      {selectedCourse && !showPDF && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '32px',
            maxWidth: '520px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '20px' }}>{selectedCourse.Title}</h2>
            <span style={{
              background: statusBg(selectedCourse.Status), color: statusText(selectedCourse.Status),
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'inline-block', marginBottom: '20px'
            }}>{selectedCourse.Status || 'Not Started'}</span>

            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              {[
                ['📚 Department', selectedCourse.Department],
                ['⏱ Duration', selectedCourse.Duration],
                ['📅 Due Date', selectedCourse.DueDate ? new Date(selectedCourse.DueDate).toLocaleDateString() : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <p key={label} style={{ margin: '6px 0', color: '#374151', fontSize: '14px' }}>
                  <strong>{label}:</strong> {value}
                </p>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {selectedCourse.CourseMaterials && (
                <button onClick={() => setShowPDF(true)} style={{
                  background: '#3b82f6', color: 'white', padding: '11px 18px',
                  borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', flex: 1
                }}>
                  📖 Read Course Material
                </button>
              )}
              {selectedCourse.Status !== 'Completed' && (
                <button onClick={() => handleMarkComplete(selectedCourse.Id)} disabled={updating} style={{
                  background: '#10b981', color: 'white', padding: '11px 18px',
                  borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                  flex: 1, opacity: updating ? 0.7 : 1
                }}>
                  {updating ? '⏳ Saving...' : '✅ Mark as Complete'}
                </button>
              )}
              <button onClick={() => setSelectedCourse(null)} style={{
                background: '#f1f5f9', color: '#334155', padding: '11px 18px',
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', width: '100%'
              }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
