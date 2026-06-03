import React from 'react';
import { getCourses, getAllEnrollments, enrollEmployee, createCourse, updateCourse, createQuizQuestion, getQuizResults } from '../services/sharePointAPI';

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  background: '#f1f5f9',
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
  background: '#0ea5e9',
  color: 'white',
  padding: '10px 22px',
  border: 'none',
  borderRadius: '7px',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer'
};

const ACCENT = '#0ea5e9';

const StatCard = ({ label, value, icon, color }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '22px 24px',
    flex: '1',
    minWidth: '160px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    borderTop: `4px solid ${color || ACCENT}`
  }}>
    <div style={{ fontSize: '28px', marginBottom: '6px' }}>{icon}</div>
    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>{value}</div>
    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '3px' }}>{label}</div>
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

const AdminDashboard = ({ accessToken, user }) => {
  const [courses, setCourses] = React.useState([]);
  const [enrollments, setEnrollments] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState('');

  const [courseForm, setCourseForm] = React.useState({ Title: '', Description: '', Duration: '', Department: '', CourseMaterials: '' });
  const [enrollForm, setEnrollForm] = React.useState({ EmployeeID: '', CourseTitle: '', Department: '', DueDate: '' });
  const [submitting, setSubmitting] = React.useState(false);

  // Edit course state
  const [editingCourse, setEditingCourse] = React.useState(null);
  const [editForm, setEditForm] = React.useState({ Title: '', Description: '', Duration: '', Department: '', CourseMaterials: '' });
  const [editSubmitting, setEditSubmitting] = React.useState(false);

  // Quiz state
  const [quizForm, setQuizForm] = React.useState({ CourseTitle: '', Question: '', OptionA: '', OptionB: '', OptionC: '', OptionD: '', CorrectAnswer: 'A' });
  const [quizResults, setQuizResults] = React.useState([]);
  const [quizResultsLoaded, setQuizResultsLoaded] = React.useState(false);
  const [quizSubmitting, setQuizSubmitting] = React.useState(false);

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
  const completionRate = enrollments.length > 0
    ? Math.round((completedCount / enrollments.length) * 100)
    : 0;

  // Department breakdown
  const deptMap = {};
  enrollments.forEach(e => {
    const dept = e.Department || 'Unknown';
    if (!deptMap[dept]) deptMap[dept] = { total: 0, completed: 0 };
    deptMap[dept].total++;
    if (e.Status === 'Completed') deptMap[dept].completed++;
  });

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'courses', label: 'Courses' },
    { id: 'enrollments', label: 'All Enrollments' },
    { id: 'enroll', label: 'Enroll Employee' },
    { id: 'quiz', label: 'Quiz' }
  ];

  const handleQuizTabActivate = async () => {
    setActiveTab('quiz');
    setMsg('');
    if (!quizResultsLoaded) {
      const results = await getQuizResults(accessToken);
      setQuizResults(results);
      setQuizResultsLoaded(true);
    }
  };

  const handleAddQuizQuestion = async (ev) => {
    ev.preventDefault();
    setQuizSubmitting(true);
    setMsg('');
    try {
      await createQuizQuestion(accessToken, {
        Title: quizForm.Question,
        CourseTitle: quizForm.CourseTitle,
        Question: quizForm.Question,
        OptionA: quizForm.OptionA,
        OptionB: quizForm.OptionB,
        OptionC: quizForm.OptionC,
        OptionD: quizForm.OptionD,
        CorrectAnswer: quizForm.CorrectAnswer
      });
      setMsg('Quiz question added successfully.');
      setQuizForm({ CourseTitle: '', Question: '', OptionA: '', OptionB: '', OptionC: '', OptionD: '', CorrectAnswer: 'A' });
    } catch {
      setMsg('Error adding quiz question. Please try again.');
    }
    setQuizSubmitting(false);
  };

  const handleAddCourse = async (ev) => {
    ev.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await createCourse(accessToken, courseForm);
      setMsg('Course created successfully.');
      setCourseForm({ Title: '', Description: '', Duration: '', Department: '', CourseMaterials: '' });
      const c = await getCourses(accessToken);
      setCourses(c);
    } catch {
      setMsg('Error creating course. Please try again.');
    }
    setSubmitting(false);
  };

  const handleEnroll = async (ev) => {
    ev.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await enrollEmployee(accessToken, {
        Title: enrollForm.CourseTitle,
        EmployeeID: enrollForm.EmployeeID,
        Department: enrollForm.Department,
        DueDate: enrollForm.DueDate ? new Date(enrollForm.DueDate).toISOString() : null,
        Status: 'Not Started'
      });
      setMsg('Employee enrolled successfully.');
      setEnrollForm({ EmployeeID: '', CourseTitle: '', Department: '', DueDate: '' });
      const e = await getAllEnrollments(accessToken);
      setEnrollments(e);
    } catch {
      setMsg('Error enrolling employee. Please try again.');
    }
    setSubmitting(false);
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setEditForm({
      Title: course.Title || '',
      Description: course.Description || '',
      Duration: course.Duration || '',
      Department: course.Department || '',
      CourseMaterials: course.CourseMaterials || ''
    });
    setMsg('');
  };

  const handleSaveEdit = async (ev) => {
    ev.preventDefault();
    setEditSubmitting(true);
    setMsg('');
    try {
      await updateCourse(accessToken, editingCourse.Id, editForm);
      setMsg('Course updated successfully.');
      setEditingCourse(null);
      const c = await getCourses(accessToken);
      setCourses(c);
    } catch {
      setMsg('Error updating course. Please try again.');
    }
    setEditSubmitting(false);
  };

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
      Loading admin dashboard...
    </div>
  );

  return (
    <div style={{ padding: '28px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>Admin Dashboard</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Welcome, {user?.name || user?.username}
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <StatCard label="Total Courses" value={courses.length} icon="📚" color={ACCENT} />
        <StatCard label="Total Enrollments" value={enrollments.length} icon="📋" color="#06b6d4" />
        <StatCard label="Completed" value={completedCount} icon="✅" color="#10b981" />
        <StatCard label="Completion Rate" value={`${completionRate}%`} icon="📈" color="#f59e0b" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '22px', background: '#f1f5f9', padding: '4px', borderRadius: '9px', width: 'fit-content' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => t.id === 'quiz' ? handleQuizTabActivate() : (() => { setActiveTab(t.id); setMsg(''); })()}
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>Department Breakdown</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Department', 'Total', 'Completed', 'Completion Rate', 'Progress'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(deptMap).length === 0 ? (
                <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No enrollment data available.</td></tr>
              ) : (
                Object.entries(deptMap).map(([dept, data]) => {
                  const rate = Math.round((data.completed / data.total) * 100);
                  return (
                    <tr key={dept}>
                      <td style={tdStyle}><strong>{dept}</strong></td>
                      <td style={tdStyle}>{data.total}</td>
                      <td style={tdStyle}>{data.completed}</td>
                      <td style={tdStyle}>{rate}%</td>
                      <td style={{ ...tdStyle, minWidth: '140px' }}>
                        <div style={{ background: '#e2e8f0', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                          <div style={{ width: `${rate}%`, height: '100%', background: ACCENT, borderRadius: '99px' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '2', minWidth: '300px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>All Courses</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Title', 'Description', 'Duration', 'Department', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No courses found.</td></tr>
                ) : (
                  courses.map(c => (
                    <tr key={c.Id}>
                      <td style={tdStyle}><strong>{c.Title}</strong></td>
                      <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.Description || '—'}</td>
                      <td style={tdStyle}>{c.Duration || '—'}</td>
                      <td style={tdStyle}>{c.Department || '—'}</td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => handleEditCourse(c)}
                          title="Edit course"
                          style={{
                            background: '#0ea5e9', color: 'white', padding: '5px 12px',
                            border: 'none', borderRadius: '6px', cursor: 'pointer',
                            fontSize: '13px', fontWeight: '600'
                          }}
                        >
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {editingCourse && (
            <div style={{ flex: '1', minWidth: '260px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '24px', border: '2px solid #0ea5e9' }}>
              <h3 style={{ margin: '0 0 18px', color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>✏️ Edit Course</h3>
              <form onSubmit={handleSaveEdit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Title *</label>
                  <input style={inputStyle} value={editForm.Title} onChange={e => setEditForm(f => ({ ...f, Title: e.target.value }))} required placeholder="Course title" />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Description</label>
                  <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }} value={editForm.Description} onChange={e => setEditForm(f => ({ ...f, Description: e.target.value }))} placeholder="Short description" />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Duration</label>
                  <input style={inputStyle} value={editForm.Duration} onChange={e => setEditForm(f => ({ ...f, Duration: e.target.value }))} placeholder="e.g. 2 hours" />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Department</label>
                  <input style={inputStyle} value={editForm.Department} onChange={e => setEditForm(f => ({ ...f, Department: e.target.value }))} placeholder="e.g. Engineering" />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>📄 PDF / Course Materials URL</label>
                  <input style={inputStyle} value={editForm.CourseMaterials} onChange={e => setEditForm(f => ({ ...f, CourseMaterials: e.target.value }))} placeholder="Paste SharePoint PDF link here" />
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>Upload PDF to SharePoint, copy sharing link and paste here</small>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" style={btnStyle} disabled={editSubmitting}>
                    {editSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => { setEditingCourse(null); setMsg(''); }}
                    style={{ ...btnStyle, background: '#6b7280' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ flex: '1', minWidth: '260px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '24px' }}>
            <h3 style={{ margin: '0 0 18px', color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>Add Course</h3>
            <form onSubmit={handleAddCourse}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={courseForm.Title} onChange={e => setCourseForm(f => ({ ...f, Title: e.target.value }))} required placeholder="Course title" />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }} value={courseForm.Description} onChange={e => setCourseForm(f => ({ ...f, Description: e.target.value }))} placeholder="Short description" />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Duration</label>
                <input style={inputStyle} value={courseForm.Duration} onChange={e => setCourseForm(f => ({ ...f, Duration: e.target.value }))} placeholder="e.g. 2 hours" />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Department</label>
                <input style={inputStyle} value={courseForm.Department} onChange={e => setCourseForm(f => ({ ...f, Department: e.target.value }))} placeholder="e.g. Engineering" />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>📄 PDF / Course Materials URL</label>
                <input style={inputStyle} value={courseForm.CourseMaterials} onChange={e => setCourseForm(f => ({ ...f, CourseMaterials: e.target.value }))} placeholder="Paste SharePoint PDF link here" />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>Upload PDF to SharePoint, copy sharing link and paste here</small>
              </div>
              <button type="submit" style={btnStyle} disabled={submitting}>
                {submitting ? 'Saving...' : 'Add Course'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Enrollments Tab */}
      {activeTab === 'enrollments' && (
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

      {/* Enroll Employee Tab */}
      {activeTab === 'enroll' && (
        <div style={{ maxWidth: '480px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '28px' }}>
          <h3 style={{ margin: '0 0 20px', color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>Enroll Employee</h3>
          <form onSubmit={handleEnroll}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Employee ID (Email) *</label>
              <input type="email" style={inputStyle} value={enrollForm.EmployeeID} onChange={e => setEnrollForm(f => ({ ...f, EmployeeID: e.target.value }))} required placeholder="employee@company.com" />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Course *</label>
              <select style={inputStyle} value={enrollForm.CourseTitle} onChange={e => setEnrollForm(f => ({ ...f, CourseTitle: e.target.value }))} required>
                <option value="">Select a course</option>
                {courses.map(c => (
                  <option key={c.Id} value={c.Title}>{c.Title}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Department</label>
              <input style={inputStyle} value={enrollForm.Department} onChange={e => setEnrollForm(f => ({ ...f, Department: e.target.value }))} placeholder="e.g. Engineering" />
            </div>
            <div style={{ marginBottom: '22px' }}>
              <label style={labelStyle}>Due Date</label>
              <input type="date" style={inputStyle} value={enrollForm.DueDate} onChange={e => setEnrollForm(f => ({ ...f, DueDate: e.target.value }))} />
            </div>
            <button type="submit" style={btnStyle} disabled={submitting}>
              {submitting ? 'Enrolling...' : 'Enroll Employee'}
            </button>
          </form>
        </div>
      )}

      {/* Quiz Tab */}
      {activeTab === 'quiz' && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Section A: Add Quiz Question */}
          <div style={{ flex: '1', minWidth: '280px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '24px' }}>
            <h3 style={{ margin: '0 0 18px', color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>Add Quiz Question</h3>
            <form onSubmit={handleAddQuizQuestion}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Course *</label>
                <select style={inputStyle} value={quizForm.CourseTitle} onChange={e => setQuizForm(f => ({ ...f, CourseTitle: e.target.value }))} required>
                  <option value="">Select a course</option>
                  {courses.map(c => (
                    <option key={c.Id} value={c.Title}>{c.Title}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Question *</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} value={quizForm.Question} onChange={e => setQuizForm(f => ({ ...f, Question: e.target.value }))} required placeholder="Enter the question text" />
              </div>
              {['A', 'B', 'C', 'D'].map(opt => (
                <div key={opt} style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Option {opt} *</label>
                  <input style={inputStyle} value={quizForm[`Option${opt}`]} onChange={e => setQuizForm(f => ({ ...f, [`Option${opt}`]: e.target.value }))} required placeholder={`Option ${opt}`} />
                </div>
              ))}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Correct Answer *</label>
                <select style={inputStyle} value={quizForm.CorrectAnswer} onChange={e => setQuizForm(f => ({ ...f, CorrectAnswer: e.target.value }))}>
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <button type="submit" style={btnStyle} disabled={quizSubmitting}>
                {quizSubmitting ? 'Saving...' : 'Add Question'}
              </button>
            </form>
          </div>

          {/* Section B: Quiz Results Table */}
          <div style={{ flex: '2', minWidth: '320px' }}>
            {/* Summary */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '18px' }}>
              {(() => {
                const total = quizResults.length;
                const passed = quizResults.filter(r => {
                  const pct = r.TotalQuestions > 0 ? Math.round((r.Score / r.TotalQuestions) * 100) : (r.Percentage || 0);
                  return (r.Passed === true || r.Passed === 'true' || r.Passed === 'Yes') || pct >= 70;
                }).length;
                const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
                return (
                  <>
                    <div style={{ background: 'white', borderRadius: '10px', padding: '16px 20px', flex: '1', minWidth: '120px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `4px solid ${ACCENT}` }}>
                      <div style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>{total}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Total Attempts</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '10px', padding: '16px 20px', flex: '1', minWidth: '120px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: '4px solid #10b981' }}>
                      <div style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>{passRate}%</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Pass Rate</div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '15px', fontWeight: '700' }}>Quiz Results</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Employee', 'Course', 'Score', 'Total', 'Percentage', 'Result', 'Date'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quizResults.length === 0 ? (
                      <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No quiz results found.</td></tr>
                    ) : (
                      quizResults.map((r, idx) => {
                        const score = r.Score ?? 0;
                        const total = r.TotalQuestions ?? r.Total ?? 0;
                        const pct = total > 0 ? Math.round((score / total) * 100) : (r.Percentage ?? 0);
                        const passed = r.Passed === true || r.Passed === 'true' || r.Passed === 'Yes' || pct >= 70;
                        return (
                          <tr key={r.Id || idx}>
                            <td style={tdStyle}>{r.EmployeeID || r.Employee || '—'}</td>
                            <td style={tdStyle}>{r.CourseTitle || r.Title || '—'}</td>
                            <td style={tdStyle}>{score}</td>
                            <td style={tdStyle}>{total || '—'}</td>
                            <td style={tdStyle}>{pct}%</td>
                            <td style={tdStyle}>
                              <span style={{ background: passed ? '#d1fae5' : '#fee2e2', color: passed ? '#065f46' : '#991b1b', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                                {passed ? 'Pass' : 'Fail'}
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
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
