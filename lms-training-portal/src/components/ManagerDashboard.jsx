import React from 'react';
import { getCourses, getAllEnrollments, enrollEmployee } from '../services/sharePointAPI';


const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  color: '#374151',
  background: 'white',
  boxSizing: 'border-box',
  outline: 'none'
};

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontWeight: '600',
  color: '#374151',
  fontSize: '13px'
};

const btnStyle = {
  background: '#f59e0b',
  color: 'white',
  padding: '10px 22px',
  border: 'none',
  borderRadius: '7px',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer'
};

const ACCENT = '#f59e0b';

const StatCard = ({ label, value, icon, color }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '22px 24px',
    flex: '1',
    minWidth: '140px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    borderTop: `4px solid ${color || ACCENT}`
  }}>
    <div style={{ fontSize: '26px', marginBottom: '6px' }}>{icon}</div>
    <div style={{ fontSize: '26px', fontWeight: '700', color: '#1e293b' }}>{value}</div>
    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>{label}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    Completed: { bg: '#d1fae5', color: '#065f46' },
    'In Progress': { bg: '#dbeafe', color: '#1e40af' },
    'Not Started': { bg: '#f3f4f6', color: '#374151' },
    Overdue: { bg: '#fee2e2', color: '#991b1b' }
  };
  const s = map[status] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600'
    }}>{status || 'Not Started'}</span>
  );
};

const ManagerDashboard = ({ accessToken, user }) => {
  const [courses, setCourses] = React.useState([]);
  const [enrollments, setEnrollments] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('team');
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [assignForm, setAssignForm] = React.useState({ EmployeeEmail: '', CourseTitle: '', Department: '', DueDate: '' });
  const today = new Date();

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [c, e] = await Promise.all([getCourses(accessToken), getAllEnrollments(accessToken)]);
      setCourses(c);
      setEnrollments(e);
      setLoading(false);
    };
    load();
  }, [accessToken]);

  const completedCount = enrollments.filter(e => e.Status === 'Completed').length;
  const overdueCount = enrollments.filter(e => e.DueDate && new Date(e.DueDate) < today && e.Status !== 'Completed').length;
  const uniqueEmployees = [...new Set(enrollments.map(e => e.EmployeeID).filter(Boolean))];
  const teamCompletionRate = enrollments.length > 0
    ? Math.round((completedCount / enrollments.length) * 100)
    : 0;

  // Build per-employee profile
  const employeeMap = {};
  enrollments.forEach(e => {
    const email = e.EmployeeID || 'Unknown';
    if (!employeeMap[email]) employeeMap[email] = { enrollments: [] };
    employeeMap[email].enrollments.push(e);
  });

  const handleAssign = async (ev) => {
    ev.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await enrollEmployee(accessToken, {
        Title: assignForm.CourseTitle,
        EmployeeID: assignForm.EmployeeEmail,
        Department: assignForm.Department,
        DueDate: assignForm.DueDate ? new Date(assignForm.DueDate).toISOString() : null,
        Status: 'Not Started'
      });
      setMsg('Course assigned successfully.');
      setAssignForm({ EmployeeEmail: '', CourseTitle: '', Department: '', DueDate: '' });
      const e = await getAllEnrollments(accessToken);
      setEnrollments(e);
    } catch {
      setMsg('Error assigning course. Please try again.');
    }
    setSubmitting(false);
  };

  const tabs = [
    { id: 'team', label: 'Team Progress' },
    { id: 'assign', label: 'Assign Course' }
  ];

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
      Loading manager dashboard...
    </div>
  );

  return (
    <div style={{ padding: '28px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>Manager Dashboard</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Welcome, {user?.name || user?.username}</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <StatCard label="Team Members" value={uniqueEmployees.length} icon="👥" color={ACCENT} />
        <StatCard label="Total Enrollments" value={enrollments.length} icon="📋" color="#fb923c" />
        <StatCard label="Completed" value={completedCount} icon="✅" color="#10b981" />
        <StatCard label="Overdue" value={overdueCount} icon="⚠️" color="#ef4444" />
        <StatCard label="Team Completion %" value={`${teamCompletionRate}%`} icon="📈" color="#6366f1" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '22px', background: '#f1f5f9', padding: '4px', borderRadius: '9px', width: 'fit-content' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setMsg(''); }}
            style={{
              padding: '8px 20px',
              borderRadius: '7px',
              border: 'none',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              background: activeTab === t.id ? 'white' : 'transparent',
              color: activeTab === t.id ? ACCENT : '#64748b',
              boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '18px',
          borderRadius: '8px',
          background: msg.startsWith('Error') ? '#fee2e2' : '#d1fae5',
          color: msg.startsWith('Error') ? '#991b1b' : '#065f46',
          fontSize: '14px',
          fontWeight: '500'
        }}>{msg}</div>
      )}

      {/* Team Progress Tab */}
      {activeTab === 'team' && (
        <div>
          {Object.entries(employeeMap).length === 0 ? (
            <div style={{ background: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#9ca3af', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              No team data available.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {Object.entries(employeeMap).map(([email, data]) => {
                const total = data.enrollments.length;
                const done = data.enrollments.filter(e => e.Status === 'Completed').length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={email} style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                    borderLeft: `4px solid ${ACCENT}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px', marginBottom: '2px' }}>
                          {email.split('@')[0]}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>{email}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: ACCENT }}>{pct}%</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{done}/{total} done</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ background: '#e2e8f0', borderRadius: '99px', height: '7px', overflow: 'hidden', marginBottom: '14px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 70 ? '#10b981' : pct >= 40 ? ACCENT : '#ef4444', borderRadius: '99px', transition: 'width 0.3s' }} />
                    </div>

                    {/* Course badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {data.enrollments.map(e => (
                        <div key={e.Id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#f8fafc', borderRadius: '7px' }}>
                          <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>{e.Title || e.CourseTitle || 'Unknown Course'}</span>
                          <StatusBadge status={e.Status} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Assign Course Tab */}
      {activeTab === 'assign' && (
        <div style={{ maxWidth: '480px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '28px' }}>
          <h3 style={{ margin: '0 0 20px', color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>Assign Course to Employee</h3>
          <form onSubmit={handleAssign}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Employee Email *</label>
              <input type="email" style={inputStyle} value={assignForm.EmployeeEmail} onChange={e => setAssignForm(f => ({ ...f, EmployeeEmail: e.target.value }))} required placeholder="employee@company.com" />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Course *</label>
              <select style={inputStyle} value={assignForm.CourseTitle} onChange={e => setAssignForm(f => ({ ...f, CourseTitle: e.target.value }))} required>
                <option value="">Select a course</option>
                {courses.map(c => (
                  <option key={c.Id} value={c.Title}>{c.Title}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Department</label>
              <input style={inputStyle} value={assignForm.Department} onChange={e => setAssignForm(f => ({ ...f, Department: e.target.value }))} placeholder="e.g. Engineering" />
            </div>
            <div style={{ marginBottom: '22px' }}>
              <label style={labelStyle}>Due Date</label>
              <input type="date" style={inputStyle} value={assignForm.DueDate} onChange={e => setAssignForm(f => ({ ...f, DueDate: e.target.value }))} />
            </div>
            <button type="submit" style={btnStyle} disabled={submitting}>
              {submitting ? 'Assigning...' : 'Assign Course'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
