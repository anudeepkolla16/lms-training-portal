import React from 'react';
import { getAllEnrollments, getQuizResults, sendCompletionReminders } from '../services/sharePointAPI';
import { downloadCSV } from '../utils/csv';

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
  const [quizResults, setQuizResults] = React.useState([]);
  const [quizLoaded, setQuizLoaded] = React.useState(false);
  const [dept, setDept] = React.useState('');
  const [reminding, setReminding] = React.useState(false);
  const [reminderMsg, setReminderMsg] = React.useState('');
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

  const handleQuizTabActivate = async () => {
    setActiveTab('quiz');
    if (!quizLoaded) {
      const results = await getQuizResults(accessToken);
      setQuizResults(results);
      setQuizLoaded(true);
    }
  };

  const uniqueEmployees = new Set(enrollments.map(e => e.EmployeeID).filter(Boolean)).size;
  const completedCount = enrollments.filter(e => e.Status === 'Completed').length;
  const overdueList = enrollments.filter(e => e.DueDate && new Date(e.DueDate) < today && e.Status !== 'Completed');
  const departments = new Set(enrollments.map(e => e.Department).filter(Boolean)).size;

  // Department filter (applies to All Enrollments + Overdue tabs and the export)
  const departmentOptions = [...new Set(enrollments.map(e => e.Department).filter(Boolean))].sort();
  const filteredEnrollments = dept ? enrollments.filter(e => e.Department === dept) : enrollments;
  const filteredOverdue = filteredEnrollments.filter(e => e.DueDate && new Date(e.DueDate) < today && e.Status !== 'Completed');

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

  const exportCSV = () => downloadCSV(
    `enrollments-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Employee', 'Course', 'Department', 'Status', 'Due Date'],
    filteredEnrollments.map(e => [e.EmployeeID || '', e.Title || e.CourseTitle || '', e.Department || '', e.Status || 'Not Started', e.DueDate ? new Date(e.DueDate).toLocaleDateString() : ''])
  );

  const exportQuizCSV = () => downloadCSV(
    `quiz-results-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Employee', 'Course', 'Score', 'Percentage', 'Result', 'Date'],
    quizResults.map(r => {
      const score = r.Score ?? 0;
      const total = r.TotalQuestions ?? r.Total ?? 0;
      const pct = total > 0 ? Math.round((score / total) * 100) : (r.Percentage ?? 0);
      const passed = r.Passed === true || r.Passed === 'true' || r.Passed === 'Yes' || pct >= 70;
      return [r.EmployeeID || r.Employee || '', r.CourseTitle || r.Title || '', `${score}${total ? '/' + total : ''}`, `${pct}%`, passed ? 'Pass' : 'Fail', r.AttemptDate ? new Date(r.AttemptDate).toLocaleDateString() : ''];
    })
  );

  const tabs = [
    { id: 'compliance', label: 'Compliance Report' },
    { id: 'overdue', label: `Overdue (${overdueList.length})` },
    { id: 'all', label: 'All Enrollments' },
    { id: 'quiz', label: 'Quiz Results' }
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select value={dept} onChange={e => setDept(e.target.value)} style={{
            padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '7px',
            fontSize: '13px', color: '#374151', background: 'white', minWidth: '180px'
          }}>
            <option value="">All departments</option>
            {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={async () => {
            const pending = filteredEnrollments.filter(e => e.Status !== 'Completed' && e.EmployeeID);
            const employees = new Set(pending.map(e => e.EmployeeID)).size;
            if (employees === 0) { setReminderMsg('No employees with pending courses to remind.'); return; }
            if (!window.confirm(`Send completion-reminder emails to ${employees} employee(s) with pending courses?`)) return;
            setReminding(true); setReminderMsg('');
            const { sent } = await sendCompletionReminders(accessToken, filteredEnrollments);
            setReminding(false); setReminderMsg(`Reminder emails sent to ${sent} of ${employees} employee(s).`);
          }} disabled={reminding} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '7px', cursor: reminding ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px', opacity: reminding ? 0.7 : 1 }}>
            {reminding ? 'Sending...' : '📧 Send Reminders'}
          </button>
          <button onClick={exportCSV} style={{ ...btnStyle, display: 'flex', alignItems: 'center', gap: '7px' }}>
            ⬇ Export CSV
          </button>
        </div>
      </div>
      {reminderMsg && (
        <div style={{ background: '#fffbeb', color: '#92400e', padding: '10px 16px', borderRadius: '8px', marginBottom: '18px', fontSize: '14px', fontWeight: '500' }}>{reminderMsg}</div>
      )}

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
            onClick={() => t.id === 'quiz' ? handleQuizTabActivate() : setActiveTab(t.id)}
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
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>Overdue Enrollments ({filteredOverdue.length})</h3>
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
                {filteredOverdue.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No overdue enrollments.</td></tr>
                ) : (
                  filteredOverdue.map(e => {
                    const daysOverdue = Math.floor((today - new Date(e.DueDate)) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={e.Id} style={{ background: '#fff9f9' }}>
                        <td style={tdStyle}>{e.EmployeeID || '—'}</td>
                        <td style={tdStyle}>{e.Title || e.CourseTitle || '—'}</td>
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
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>All Enrollments ({filteredEnrollments.length})</h3>
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
                {filteredEnrollments.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No enrollments found.</td></tr>
                ) : (
                  filteredEnrollments.map(e => (
                    <tr key={e.Id}>
                      <td style={tdStyle}>{e.EmployeeID || '—'}</td>
                      <td style={tdStyle}>{e.Title || e.CourseTitle || '—'}</td>
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

      {/* Quiz Results Tab */}
      {activeTab === 'quiz' && (() => {
        const total = quizResults.length;
        const passed = quizResults.filter(r => {
          const score = r.Score ?? 0;
          const tot = r.TotalQuestions ?? r.Total ?? 0;
          const pct = tot > 0 ? Math.round((score / tot) * 100) : (r.Percentage ?? 0);
          return r.Passed === true || r.Passed === 'true' || r.Passed === 'Yes' || pct >= 70;
        }).length;
        const failed = total - passed;
        const avgScore = total > 0
          ? Math.round(quizResults.reduce((sum, r) => {
              const score = r.Score ?? 0;
              const tot = r.TotalQuestions ?? r.Total ?? 0;
              return sum + (tot > 0 ? (score / tot) * 100 : (r.Percentage ?? 0));
            }, 0) / total)
          : 0;
        return (
          <div>
            {/* Summary Cards */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {[
                { label: 'Total Attempts', value: total, color: ACCENT, icon: '📝' },
                { label: 'Passed', value: passed, color: '#10b981', icon: '✅' },
                { label: 'Failed', value: failed, color: '#ef4444', icon: '❌' },
                { label: 'Avg Score', value: `${avgScore}%`, color: '#f59e0b', icon: '📊' }
              ].map(c => (
                <div key={c.label} style={{ background: 'white', borderRadius: '10px', padding: '18px 20px', flex: '1', minWidth: '120px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `4px solid ${c.color}` }}>
                  <div style={{ fontSize: '22px', marginBottom: '4px' }}>{c.icon}</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>{c.value}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{c.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '15px', fontWeight: '700' }}>Quiz Results ({total})</h3>
                <button onClick={exportQuizCSV} style={{ ...btnStyle, padding: '7px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⬇ Export CSV
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Employee', 'Course', 'Score', 'Percentage', 'Result', 'Date'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quizResults.length === 0 ? (
                      <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No quiz results found.</td></tr>
                    ) : (
                      quizResults.map((r, idx) => {
                        const score = r.Score ?? 0;
                        const tot = r.TotalQuestions ?? r.Total ?? 0;
                        const pct = tot > 0 ? Math.round((score / tot) * 100) : (r.Percentage ?? 0);
                        const isPassed = r.Passed === true || r.Passed === 'true' || r.Passed === 'Yes' || pct >= 70;
                        return (
                          <tr key={r.Id || idx}>
                            <td style={tdStyle}>{r.EmployeeID || r.Employee || '—'}</td>
                            <td style={tdStyle}>{r.CourseTitle || r.Title || '—'}</td>
                            <td style={tdStyle}>{score}{tot ? `/${tot}` : ''}</td>
                            <td style={tdStyle}>{pct}%</td>
                            <td style={tdStyle}>
                              <span style={{ background: isPassed ? '#d1fae5' : '#fee2e2', color: isPassed ? '#065f46' : '#991b1b', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                                {isPassed ? 'Pass' : 'Fail'}
                              </span>
                            </td>
                            <td style={tdStyle}>{r.AttemptDate ? new Date(r.AttemptDate).toLocaleDateString() : '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default HRDashboard;
