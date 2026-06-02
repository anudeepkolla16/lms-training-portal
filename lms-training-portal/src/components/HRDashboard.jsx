import React from 'react';
import { getAllEnrollments } from '../services/sharePointAPI';

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  background: '#f5f3ff',
  color: '#374151',
  fontWeight: '600',
  fontSize: '13px',
  borderBottom: '2px solid #e2e8f0',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '10px 14px',
  borderBottom: '1px solid #f1f5f9',
  color: '#374151',
  fontSize: '13px',
  verticalAlign: 'middle'
};

const btnStyle = {
  background: '#8b5cf6',
  color: 'white',
  padding: '10px 22px',
  border: 'none',
  borderRadius: '7px',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer'
};

const ACCENT = '#8b5cf6';

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

const ComplianceRateBar = ({ rate }) => {
  const color = rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '99px', height: '8px', overflow: 'hidden', minWidth: '80px' }}>
        <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: '99px' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: '700', color, minWidth: '36px' }}>{rate}%</span>
    </div>
  );
};

const HRDashboard = ({ accessToken, user }) => {
  const [enrollments, setEnrollments] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('compliance');
  const [loading, setLoading] = React.useState(true);
  const today = new Date();

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      const e = await getAllEnrollments(accessToken);
      setEnrollments(e);
      setLoading(false);
    };
    load();
  }, [accessToken]);

  const uniqueEmployees = new Set(enrollments.map(e => e.EmployeeID || e.Title)).size;
  const completedCount = enrollments.filter(e => e.Status === 'Completed').length;
  const overdueList = enrollments.filter(e => e.DueDate && new Date(e.DueDate) < today && e.Status !== 'Completed');
  const departments = new Set(enrollments.map(e => e.Department).filter(Boolean)).size;

  // Department compliance map
  const deptMap = {};
  enrollments.forEach(e => {
    const dept = e.Department || 'Unknown';
    if (!deptMap[dept]) deptMap[dept] = { total: 0, completed: 0, inProgress: 0, notStarted: 0, overdue: 0 };
    deptMap[dept].total++;
    const isOverdue = e.DueDate && new Date(e.DueDate) < today && e.Status !== 'Completed';
    if (e.Status === 'Completed') deptMap[dept].completed++;
    else if (isOverdue) deptMap[dept].overdue++;
    else if (e.Status === 'In Progress') deptMap[dept].inProgress++;
    else deptMap[dept].notStarted++;
  });

  const exportCSV = () => {
    const headers = ['Employee', 'Course', 'Department', 'Status', 'Due Date'];
    const rows = enrollments.map(e => [
      e.EmployeeID || e.Title || '',
      e.CourseTitle || '',
      e.Department || '',
      e.Status || 'Not Started',
      e.DueDate ? new Date(e.DueDate).toLocaleDateString() : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enrollments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'compliance', label: 'Compliance Report' },
    { id: 'overdue', label: `Overdue (${overdueList.length})` },
    { id: 'all', label: 'All Enrollments' }
  ];

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
      Loading HR dashboard...
    </div>
  );

  return (
    <div style={{ padding: '28px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>HR Analytics Dashboard</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Welcome, {user?.name || user?.username}</p>
        </div>
        <button onClick={exportCSV} style={{ ...btnStyle, display: 'flex', alignItems: 'center', gap: '7px' }}>
          ⬇ Export CSV
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <StatCard label="Total Employees" value={uniqueEmployees} icon="👥" color={ACCENT} />
        <StatCard label="Total Enrollments" value={enrollments.length} icon="📋" color="#6366f1" />
        <StatCard label="Completed" value={completedCount} icon="✅" color="#10b981" />
        <StatCard label="Overdue" value={overdueList.length} icon="⚠️" color="#ef4444" />
        <StatCard label="Departments" value={departments} icon="🏢" color="#f59e0b" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '22px', background: '#f1f5f9', padding: '4px', borderRadius: '9px', width: 'fit-content' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 18px',
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

      {/* Compliance Report Tab */}
      {activeTab === 'compliance' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>Compliance by Department</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Department', 'Total', 'Completed', 'In Progress', 'Not Started', 'Overdue', 'Compliance Rate'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(deptMap).length === 0 ? (
                  <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No data available.</td></tr>
                ) : (
                  Object.entries(deptMap).map(([dept, d]) => {
                    const rate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
                    return (
                      <tr key={dept}>
                        <td style={tdStyle}><strong>{dept}</strong></td>
                        <td style={tdStyle}>{d.total}</td>
                        <td style={tdStyle}><span style={{ color: '#065f46', fontWeight: '600' }}>{d.completed}</span></td>
                        <td style={tdStyle}><span style={{ color: '#1e40af', fontWeight: '600' }}>{d.inProgress}</span></td>
                        <td style={tdStyle}>{d.notStarted}</td>
                        <td style={tdStyle}><span style={{ color: '#991b1b', fontWeight: '600' }}>{d.overdue}</span></td>
                        <td style={{ ...tdStyle, minWidth: '160px' }}>
                          <ComplianceRateBar rate={rate} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Overdue Tab */}
      {activeTab === 'overdue' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>Overdue Enrollments ({overdueList.length})</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Course', 'Department', 'Status', 'Due Date', 'Days Overdue'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdueList.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No overdue enrollments.</td></tr>
                ) : (
                  overdueList.map(e => {
                    const daysOverdue = Math.floor((today - new Date(e.DueDate)) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={e.Id} style={{ background: '#fff9f9' }}>
                        <td style={tdStyle}>{e.EmployeeID || e.Title || '—'}</td>
                        <td style={tdStyle}>{e.CourseTitle || '—'}</td>
                        <td style={tdStyle}>{e.Department || '—'}</td>
                        <td style={tdStyle}><StatusBadge status={e.Status} /></td>
                        <td style={tdStyle}>{new Date(e.DueDate).toLocaleDateString()}</td>
                        <td style={tdStyle}>
                          <span style={{ color: '#ef4444', fontWeight: '700' }}>{daysOverdue} days</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Enrollments Tab */}
      {activeTab === 'all' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>All Enrollments ({enrollments.length})</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Course', 'Department', 'Status', 'Due Date'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrollments.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No enrollments found.</td></tr>
                ) : (
                  enrollments.map(e => (
                    <tr key={e.Id}>
                      <td style={tdStyle}>{e.EmployeeID || e.Title || '—'}</td>
                      <td style={tdStyle}>{e.CourseTitle || '—'}</td>
                      <td style={tdStyle}>{e.Department || '—'}</td>
                      <td style={tdStyle}><StatusBadge status={e.Status} /></td>
                      <td style={tdStyle}>{e.DueDate ? new Date(e.DueDate).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;
