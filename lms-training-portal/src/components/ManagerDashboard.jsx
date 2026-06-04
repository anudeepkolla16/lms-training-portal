import React from 'react';
import { getCourses, getAllEnrollments, enrollEmployee, getQuizResults, getAssessmentsForManager, updateAssessment, notifyCourseAssigned, sendCompletionReminders, getAllUserProfiles, getAllSelfAssessments } from '../services/sharePointAPI';
import { downloadCSV } from '../utils/csv';


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

const ManagerDashboard = ({ accessToken, user, userProfile, scope = 'reports' }) => {
  const isHOD = scope === 'department';
  const [courses, setCourses] = React.useState([]);
  const [enrollments, setEnrollments] = React.useState([]);
  const [profiles, setProfiles] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('team');
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [assignForm, setAssignForm] = React.useState({ EmployeeEmail: '', CourseTitle: '', Department: '', DueDate: '' });
  const [quizResults, setQuizResults] = React.useState([]);
  const [quizLoaded, setQuizLoaded] = React.useState(false);
  const [reviews, setReviews] = React.useState([]);
  const [reviewEdits, setReviewEdits] = React.useState({});
  const [dept, setDept] = React.useState('');
  const [reminding, setReminding] = React.useState(false);
  const today = new Date();

  const myEmail = (user?.username || '').toLowerCase();
  const myDept = (userProfile?.department || '').toLowerCase();

  // Employees this dashboard covers: HOD = whole department, Manager = direct reports.
  const scopedEmails = React.useMemo(() => {
    const s = new Set();
    profiles.forEach(p => {
      const email = (p.Title || '').toLowerCase();
      if (!email) return;
      if (isHOD) { if (myDept && (p.Department || '').toLowerCase() === myDept) s.add(email); }
      else if (myEmail && (p.ManagerEmail || '').toLowerCase() === myEmail) s.add(email);
    });
    return s;
  }, [profiles, isHOD, myEmail, myDept]);

  const inScope = (e) => scopedEmails.has((e.EmployeeID || '').toLowerCase()) || (isHOD && myDept && (e.Department || '').toLowerCase() === myDept);

  const loadReviews = React.useCallback(async () => {
    if (isHOD) {
      const all = await getAllSelfAssessments(accessToken);
      const deptEmails = new Set(profiles.filter(p => myDept && (p.Department || '').toLowerCase() === myDept).map(p => (p.Title || '').toLowerCase()));
      setReviews(all.filter(a => a.AssessmentState === 'PendingManagerReview' && deptEmails.has((a.EmployeeID || '').toLowerCase())));
    } else {
      const r = await getAssessmentsForManager(accessToken, user?.username || '');
      setReviews(r);
    }
  }, [accessToken, user, isHOD, profiles, myDept]);

  React.useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleReview = async (review, action) => {
    const edit = reviewEdits[review.Id] || {};
    const finalRating = action === 'adjust' ? Number(edit.rating || review.SelfRating) : review.SelfRating;
    setMsg('');
    try {
      await updateAssessment(accessToken, review.Id, {
        AssessmentState: 'Approved',
        ManagerRating: finalRating,
        ManagerComment: edit.comment || '',
        ReviewDate: new Date().toISOString(),
      });
      setMsg(`Review saved for ${(review.EmployeeID || '').split('@')[0]} — ${review.Title}.`);
      await loadReviews();
    } catch {
      setMsg('Error saving review. Please try again.');
    }
  };

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [c, e, p] = await Promise.all([getCourses(accessToken), getAllEnrollments(accessToken), getAllUserProfiles(accessToken)]);
      setCourses(c);
      setEnrollments(e);
      setProfiles(p);
      setLoading(false);
    };
    load();
  }, [accessToken]);

  // Load quiz results lazily when team tab is first visited (or we can load alongside team tab)
  React.useEffect(() => {
    if (!quizLoaded && !loading) {
      getQuizResults(accessToken).then(results => {
        setQuizResults(results);
        setQuizLoaded(true);
      });
    }
  }, [loading, quizLoaded, accessToken]);

  // Scope enrollments to this dashboard's employees, then apply the department dropdown
  const scopedEnrollments = enrollments.filter(inScope);
  const completedCount = scopedEnrollments.filter(e => e.Status === 'Completed').length;
  const overdueCount = scopedEnrollments.filter(e => e.DueDate && new Date(e.DueDate) < today && e.Status !== 'Completed').length;
  const uniqueEmployees = [...new Set(scopedEnrollments.map(e => e.EmployeeID).filter(Boolean))];
  const teamCompletionRate = scopedEnrollments.length > 0
    ? Math.round((completedCount / scopedEnrollments.length) * 100)
    : 0;

  // Department filter (applies to Team Progress grid + export)
  const departmentOptions = [...new Set(scopedEnrollments.map(e => e.Department).filter(Boolean))].sort();
  const filteredEnrollments = dept ? scopedEnrollments.filter(e => e.Department === dept) : scopedEnrollments;

  // Employees this user may assign to: their reports (Manager) or department (HOD)
  const assignableEmployees = [...new Set([
    ...[...scopedEmails],
    ...scopedEnrollments.map(e => (e.EmployeeID || '').toLowerCase()).filter(Boolean),
  ])].sort();

  // Build per-employee profile
  const employeeMap = {};
  filteredEnrollments.forEach(e => {
    const email = e.EmployeeID || 'Unknown';
    if (!employeeMap[email]) employeeMap[email] = { enrollments: [] };
    employeeMap[email].enrollments.push(e);
  });

  const exportTeam = () => downloadCSV(
    `${isHOD ? 'department' : 'team'}-progress-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Employee', 'Course', 'Department', 'Status', 'Due Date'],
    filteredEnrollments.map(e => [e.EmployeeID || '', e.Title || e.CourseTitle || '', e.Department || '', e.Status || 'Not Started', e.DueDate ? new Date(e.DueDate).toLocaleDateString() : ''])
  );

  const handleSendReminders = async () => {
    const pending = filteredEnrollments.filter(e => e.Status !== 'Completed' && e.EmployeeID);
    const employees = new Set(pending.map(e => e.EmployeeID)).size;
    if (employees === 0) { setMsg('No employees with pending courses to remind.'); return; }
    if (!window.confirm(`Send completion-reminder emails to ${employees} employee(s) with pending courses?`)) return;
    setReminding(true);
    setMsg('');
    const { sent } = await sendCompletionReminders(accessToken, filteredEnrollments);
    setReminding(false);
    setMsg(`Reminder emails sent to ${sent} of ${employees} employee(s).`);
  };

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
      notifyCourseAssigned(accessToken, assignForm.EmployeeEmail, assignForm.CourseTitle, assignForm.DueDate); // best-effort
      setMsg('Course assigned successfully. Notification email sent.');
      setAssignForm({ EmployeeEmail: '', CourseTitle: '', Department: '', DueDate: '' });
      const e = await getAllEnrollments(accessToken);
      setEnrollments(e);
    } catch {
      setMsg('Error assigning course. Please try again.');
    }
    setSubmitting(false);
  };

  const tabs = [
    { id: 'team', label: isHOD ? 'Department Progress' : 'Team Progress' },
    { id: 'assign', label: 'Assign Course' },
    { id: 'reviews', label: `Assessment Reviews${reviews.length ? ` (${reviews.length})` : ''}` }
  ];

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
      Loading manager dashboard...
    </div>
  );

  return (
    <div style={{ padding: '28px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>{isHOD ? 'HOD Dashboard' : 'Manager Dashboard'}</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Welcome, {user?.name || user?.username}
          {isHOD
            ? (userProfile?.department ? ` · ${userProfile.department} department` : '')
            : ' · your direct reports'}
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <StatCard label={isHOD ? 'Dept Members' : 'Team Members'} value={uniqueEmployees.length} icon="👥" color={ACCENT} />
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
            <select value={dept} onChange={e => setDept(e.target.value)} style={{
              padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '7px',
              fontSize: '13px', color: '#374151', background: 'white', minWidth: '170px'
            }}>
              <option value="">All departments</option>
              {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={handleSendReminders} disabled={reminding} style={{
              background: '#f59e0b', color: 'white', border: 'none', padding: '8px 14px',
              borderRadius: '7px', cursor: reminding ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', opacity: reminding ? 0.7 : 1
            }}>{reminding ? 'Sending...' : '📧 Send Reminders'}</button>
            <button onClick={exportTeam} style={{
              background: 'white', color: ACCENT, border: `1px solid ${ACCENT}`, padding: '8px 14px',
              borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
            }}>⬇ Export CSV</button>
          </div>
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

          {/* Team Quiz Results Section */}
          {quizLoaded && (
            <div style={{ marginTop: '28px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '15px', fontWeight: '700' }}>Team Quiz Results</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Employee', 'Course', 'Score %', 'Result'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', background: '#fffbeb', color: '#374151', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quizResults.filter(r => {
                      const email = r.EmployeeID || r.Employee || '';
                      return uniqueEmployees.includes(email);
                    }).length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No quiz results for team members yet.</td></tr>
                    ) : (
                      quizResults
                        .filter(r => {
                          const email = r.EmployeeID || r.Employee || '';
                          return uniqueEmployees.includes(email);
                        })
                        .map((r, idx) => {
                          const score = r.Score ?? 0;
                          const tot = r.TotalQuestions ?? r.Total ?? 0;
                          const pct = tot > 0 ? Math.round((score / tot) * 100) : (r.Percentage ?? 0);
                          const isPassed = r.Passed === true || r.Passed === 'true' || r.Passed === 'Yes' || pct >= 70;
                          return (
                            <tr key={r.Id || idx}>
                              <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#374151', fontSize: '13px' }}>{(r.EmployeeID || r.Employee || '').split('@')[0] || '—'}</td>
                              <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#374151', fontSize: '13px' }}>{r.CourseTitle || r.Title || '—'}</td>
                              <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#374151', fontSize: '13px', fontWeight: '600' }}>{pct}%</td>
                              <td style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                <span style={{ background: isPassed ? '#d1fae5' : '#fee2e2', color: isPassed ? '#065f46' : '#991b1b', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                                  {isPassed ? 'Pass' : 'Fail'}
                                </span>
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
        </div>
      )}

      {/* Assign Course Tab */}
      {activeTab === 'assign' && (
        <div style={{ maxWidth: '480px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '28px' }}>
          <h3 style={{ margin: '0 0 20px', color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>Assign Course to Employee</h3>
          <form onSubmit={handleAssign}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Employee * <span style={{ fontWeight: '400', color: '#94a3b8' }}>({isHOD ? 'your department' : 'your reports'})</span></label>
              <select style={inputStyle} value={assignForm.EmployeeEmail} onChange={e => setAssignForm(f => ({ ...f, EmployeeEmail: e.target.value }))} required>
                <option value="">{assignableEmployees.length ? 'Select an employee' : (isHOD ? 'No one in your department yet' : 'You have no direct reports yet')}</option>
                {assignableEmployees.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
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

      {/* Assessment Reviews Tab */}
      {activeTab === 'reviews' && (
        <div>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px' }}>
            Employees who self-rated 4 or 5 after completing a course. Approve their rating, or adjust it if needed.
          </p>
          {reviews.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#9ca3af', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              No pending assessment reviews.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {reviews.map(r => {
                const edit = reviewEdits[r.Id] || {};
                return (
                  <div key={r.Id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${ACCENT}` }}>
                    <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{(r.EmployeeID || '').split('@')[0]}</div>
                    <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '10px' }}>{r.EmployeeID}</div>
                    <div style={{ fontSize: '13px', color: '#374151', marginBottom: '10px' }}>📘 <strong>{r.Title}</strong></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Self-rating:</span>
                      <span style={{ fontSize: '16px', color: '#f59e0b', fontWeight: '700' }}>{'★'.repeat(r.SelfRating || 0)}{'☆'.repeat(5 - (r.SelfRating || 0))}</span>
                    </div>
                    {r.EmployeeComment && <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', marginBottom: '12px' }}>“{r.EmployeeComment}”</div>}

                    <label style={labelStyle}>Adjust rating (optional)</label>
                    <select style={{ ...inputStyle, marginBottom: '10px' }} value={edit.rating ?? r.SelfRating} onChange={e => setReviewEdits(p => ({ ...p, [r.Id]: { ...edit, rating: e.target.value } }))}>
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <input style={{ ...inputStyle, marginBottom: '12px' }} placeholder="Comment (optional)" value={edit.comment || ''} onChange={e => setReviewEdits(p => ({ ...p, [r.Id]: { ...edit, comment: e.target.value } }))} />

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleReview(r, 'approve')} style={{ ...btnStyle, background: '#10b981', flex: 1, padding: '9px' }}>✅ Approve</button>
                      <button onClick={() => handleReview(r, 'adjust')} style={{ ...btnStyle, flex: 1, padding: '9px' }}>✎ Save Adjusted</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
