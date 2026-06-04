import React, { useEffect, useMemo, useState } from 'react';
import { getCourses, getOrgRoles, enrollEmployee, matchesCsv, isTruthy, isJobDescription } from '../services/sharePointAPI';

// Org-wide course catalog. Every employee sees ALL courses, can filter by job-role /
// department, sees which are recommended for their role, and can self-enroll.
const CourseCatalog = ({ accessToken, userEmail, userProfile, enrolledTitles, onEnrolled, onBack }) => {
  const [courses, setCourses] = useState([]);
  const [orgRoles, setOrgRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [enrolling, setEnrolling] = useState('');
  const [justEnrolled, setJustEnrolled] = useState(new Set());
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [c, r] = await Promise.all([getCourses(accessToken), getOrgRoles(accessToken)]);
      setCourses(c.filter(x => !isJobDescription(x.Title))); // JDs are auto-assigned by role, not self-enrolled
      setOrgRoles(r);
      setLoading(false);
    };
    load();
  }, [accessToken]);

  const departments = useMemo(() => [...new Set(orgRoles.map(r => r.Department).filter(Boolean))], [orgRoles]);

  const isEnrolled = (title) => (enrolledTitles?.has?.((title || '').toLowerCase())) || justEnrolled.has((title || '').toLowerCase());

  const filtered = courses.filter(c =>
    (roleFilter ? matchesCsv(c.JobRoles, roleFilter) : true) &&
    (deptFilter ? (matchesCsv(c.Departments, deptFilter) || (c.Department || '').toLowerCase() === deptFilter.toLowerCase()) : true)
  );

  const handleEnroll = async (course) => {
    setEnrolling(course.Title);
    setMsg('');
    try {
      await enrollEmployee(accessToken, {
        Title: course.Title,
        EmployeeID: userEmail,
        Department: userProfile?.department || course.Department || '',
        Status: 'Not Started',
      });
      setJustEnrolled(prev => new Set([...prev, (course.Title || '').toLowerCase()]));
      setMsg(`Enrolled in "${course.Title}".`);
      onEnrolled && onEnrolled();
    } catch {
      setMsg('Could not enroll. Please try again.');
    }
    setEnrolling('');
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '24px', fontWeight: '700' }}>📚 Browse All Courses</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Explore every course in the organisation and enrol yourself</p>
        </div>
        {onBack && (
          <button onClick={onBack} style={{
            background: '#f1f5f9', color: '#334155', padding: '9px 16px', borderRadius: '8px',
            border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
          }}>← Back to My Training</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={filterStyle}>
          <option value="">All job-roles</option>
          {orgRoles.map(r => <option key={r.Id} value={r.Title}>{r.Title}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={filterStyle}>
          <option value="">All departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {(roleFilter || deptFilter) && (
          <button onClick={() => { setRoleFilter(''); setDeptFilter(''); }} style={{
            background: 'white', color: '#64748b', padding: '9px 14px', borderRadius: '8px',
            border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
          }}>Clear filters</button>
        )}
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('Could not') ? '#fee2e2' : '#d1fae5',
          color: msg.startsWith('Could not') ? '#991b1b' : '#065f46', padding: '12px 16px',
          borderRadius: '8px', marginBottom: '18px', fontSize: '14px' }}>{msg}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', background: 'white', borderRadius: '12px' }}>Loading catalog...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'white', padding: '48px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8' }}>
          No courses match these filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filtered.map(c => {
            const recommended = matchesCsv(c.JobRoles, userProfile?.jobRole) || matchesCsv(c.Departments, userProfile?.department);
            const mandatory = isTruthy(c.Mandatory);
            const enrolled = isEnrolled(c.Title);
            return (
              <div key={c.Id} style={{
                background: 'white', borderRadius: '12px', padding: '20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `4px solid ${recommended ? '#8b5cf6' : '#3b82f6'}`,
                display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {recommended && <Tag bg="#f5f3ff" color="#6d28d9">⭐ Recommended</Tag>}
                  {mandatory && <Tag bg="#fef3c7" color="#92400e">🔒 Mandatory</Tag>}
                </div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '16px', fontWeight: '600' }}>{c.Title}</h3>
                {c.Description && <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{c.Description}</p>}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', color: '#64748b', fontSize: '13px' }}>
                  {c.Department && <span>🏢 {c.Department}</span>}
                  {c.Duration && <span>⏱ {c.Duration}</span>}
                </div>
                <button onClick={() => handleEnroll(c)} disabled={enrolled || enrolling === c.Title} style={{
                  marginTop: 'auto', background: enrolled ? '#d1fae5' : '#10b981',
                  color: enrolled ? '#065f46' : 'white', padding: '10px', borderRadius: '8px',
                  border: 'none', cursor: enrolled ? 'default' : 'pointer', fontSize: '14px', fontWeight: '600'
                }}>
                  {enrolled ? '✅ Enrolled' : enrolling === c.Title ? 'Enrolling...' : '➕ Enroll'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const filterStyle = {
  padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
  fontSize: '14px', color: '#374151', background: 'white', minWidth: '180px'
};

const Tag = ({ bg, color, children }) => (
  <span style={{ background: bg, color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>{children}</span>
);

export default CourseCatalog;
