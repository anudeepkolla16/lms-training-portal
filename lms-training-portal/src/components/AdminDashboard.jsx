import React from 'react';
import { getCourses, getAllEnrollments, enrollEmployee, createCourse, updateCourse, createQuizQuestion, getQuizResults, getOrgRoles, createOrgRole, deleteOrgRole, getAllUserProfiles, upsertUserProfile, notifyCourseAssigned, sendCompletionReminders, deleteEnrollment, upsertJobDescription, seedJobDescriptions, jdTitleFor } from '../services/sharePointAPI';
import { downloadCSV } from '../utils/csv';
import BulkUpload from './BulkUpload';

// Reusable department filter dropdown
const DeptFilter = ({ value, onChange, departments, accent = '#0ea5e9' }) => (
  <select value={value} onChange={e => onChange(e.target.value)} style={{
    padding: '7px 12px', border: '1px solid #d1d5db', borderRadius: '7px',
    fontSize: '13px', color: '#374151', background: 'white', minWidth: '170px'
  }}>
    <option value="">All departments</option>
    {departments.map(d => <option key={d} value={d}>{d}</option>)}
  </select>
);

const exportBtn = (accent) => ({
  background: 'white', color: accent, border: `1px solid ${accent}`, padding: '7px 14px',
  borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
});

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

  const [courseForm, setCourseForm] = React.useState({ Title: '', Description: '', Duration: '', Department: '', CourseMaterials: '', JobRoles: '', Departments: '', Mandatory: false });
  const [enrollForm, setEnrollForm] = React.useState({ EmployeeID: '', CourseTitle: '', Department: '', DueDate: '' });
  const [submitting, setSubmitting] = React.useState(false);

  // Edit course state
  const [editingCourse, setEditingCourse] = React.useState(null);
  const [editForm, setEditForm] = React.useState({ Title: '', Description: '', Duration: '', Department: '', CourseMaterials: '', JobRoles: '', Departments: '', Mandatory: false });
  const [editSubmitting, setEditSubmitting] = React.useState(false);

  // Org roles (JD taxonomy) + employee profiles
  const [orgRoles, setOrgRoles] = React.useState([]);
  const [orgRoleForm, setOrgRoleForm] = React.useState({ Title: '', Department: '' });
  const [jdDrafts, setJdDrafts] = React.useState({}); // { [roleTitle]: documentUrl } — in-progress JD URL edits
  const [profiles, setProfiles] = React.useState([]);
  const [profileEdits, setProfileEdits] = React.useState({});
  const [newEmployee, setNewEmployee] = React.useState({ email: '', Role: 'Employee', JobRole: '', Department: '', ManagerEmail: '' });
  const [addingEmployee, setAddingEmployee] = React.useState(false);
  const [orgLoaded, setOrgLoaded] = React.useState(false);

  // Department filters
  const [enrollDept, setEnrollDept] = React.useState('');
  const [profileDept, setProfileDept] = React.useState('');
  const [courseDept, setCourseDept] = React.useState('');
  const [reminding, setReminding] = React.useState(false);

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

  // Department option lists + filtered views
  const enrollDepartments = [...new Set(enrollments.map(e => e.Department).filter(Boolean))].sort();
  const profileDepartments = [...new Set(profiles.map(p => p.Department).filter(Boolean))].sort();
  const courseDepartments = [...new Set(courses.map(c => c.Department).filter(Boolean))].sort();
  const filteredEnrollments = enrollDept ? enrollments.filter(e => e.Department === enrollDept) : enrollments;
  const filteredProfiles = profileDept ? profiles.filter(p => p.Department === profileDept) : profiles;
  const filteredCourses = courseDept ? courses.filter(c => c.Department === courseDept) : courses;

  // CSV exports (respect the active department filter)
  const exportEnrollments = () => downloadCSV(
    `enrollments-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Employee', 'Course', 'Department', 'Status', 'Completed Date', 'Due Date'],
    filteredEnrollments.map(e => [e.EmployeeID || '', e.Title || e.CourseTitle || '', e.Department || '', e.Status || 'Not Started', (e.Status === 'Completed' && e.CompletedDate) ? new Date(e.CompletedDate).toLocaleDateString() : '', e.DueDate ? new Date(e.DueDate).toLocaleDateString() : ''])
  );
  const exportProfiles = () => downloadCSV(
    `employees-${new Date().toISOString().slice(0, 10)}.csv`,
    ['email', 'Role', 'JobRole', 'Department', 'ManagerEmail'],
    filteredProfiles.map(p => [p.Title || '', p.Role || '', p.JobRole || '', p.Department || '', p.ManagerEmail || ''])
  );
  const exportCourses = () => downloadCSV(
    `courses-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Title', 'Description', 'Duration', 'Department', 'CourseMaterials', 'JobRoles', 'Departments', 'Mandatory'],
    filteredCourses.map(c => [c.Title || '', c.Description || '', c.Duration || '', c.Department || '', c.CourseMaterials || '', c.JobRoles || '', c.Departments || '', (c.Mandatory === true || c.Mandatory === 'true') ? 'Yes' : 'No'])
  );
  const exportQuiz = () => downloadCSV(
    `quiz-results-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Employee', 'Course', 'Score', 'Total', 'Percentage', 'Result', 'Date'],
    quizResults.map(r => {
      const score = r.Score ?? 0; const total = r.TotalQuestions ?? r.Total ?? 0;
      const pct = total > 0 ? Math.round((score / total) * 100) : (r.Percentage ?? 0);
      const passed = r.Passed === true || r.Passed === 'true' || r.Passed === 'Yes' || pct >= 70;
      return [r.EmployeeID || r.Employee || '', r.CourseTitle || r.Title || '', score, total, `${pct}%`, passed ? 'Pass' : 'Fail', r.AttemptDate ? new Date(r.AttemptDate).toLocaleDateString() : ''];
    })
  );

  const handleDeleteEnrollment = async (enr) => {
    if (!window.confirm(`Remove enrollment "${enr.Title || enr.CourseTitle}" for ${enr.EmployeeID || 'this employee'}? This cannot be undone.`)) return;
    setMsg('');
    try {
      await deleteEnrollment(accessToken, enr.Id);
      setEnrollments(await getAllEnrollments(accessToken));
      setMsg('Enrollment removed.');
    } catch {
      setMsg('Error removing enrollment. Please try again.');
    }
  };

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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'courses', label: 'Courses' },
    { id: 'enrollments', label: 'All Enrollments' },
    { id: 'enroll', label: 'Enroll Employee' },
    { id: 'orgroles', label: 'Org Roles (JD)' },
    { id: 'profiles', label: 'Employee Profiles' },
    { id: 'quiz', label: 'Quiz' }
  ];

  const loadOrgData = async () => {
    if (orgLoaded) return;
    const [r, p] = await Promise.all([getOrgRoles(accessToken), getAllUserProfiles(accessToken)]);
    setOrgRoles(r);
    setProfiles(p);
    setOrgLoaded(true);
  };

  const handleAddOrgRole = async (ev) => {
    ev.preventDefault();
    setMsg('');
    try {
      await createOrgRole(accessToken, orgRoleForm);
      setMsg('Job-role added.');
      setOrgRoleForm({ Title: '', Department: '' });
      setOrgRoles(await getOrgRoles(accessToken));
    } catch { setMsg('Error adding job-role. Please try again.'); }
  };

  const handleDeleteOrgRole = async (id) => {
    setMsg('');
    try {
      await deleteOrgRole(accessToken, id);
      setOrgRoles(await getOrgRoles(accessToken));
    } catch { setMsg('Error deleting job-role. Please try again.'); }
  };

  // ---- Job Descriptions (one mandatory read-doc course per role) ----
  const jdForRole = (roleTitle) => courses.find(c => (c.Title || '').toLowerCase() === jdTitleFor(roleTitle).toLowerCase());

  const handleSaveJD = async (role) => {
    setMsg('');
    const url = (jdDrafts[role.Title] ?? (jdForRole(role.Title)?.CourseMaterials || '')).trim();
    try {
      await upsertJobDescription(accessToken, { role: role.Title, department: role.Department || '', url }, courses);
      setCourses(await getCourses(accessToken));
      setJdDrafts(d => { const n = { ...d }; delete n[role.Title]; return n; });
      setMsg(url ? `JD saved for ${role.Title} — it will auto-assign to employees in this role.` : `JD entry saved for ${role.Title}. Add a document URL so it can be assigned.`);
    } catch { setMsg('Error saving JD. Please try again.'); }
  };

  const handleSeedAllJDs = async () => {
    setMsg('');
    try {
      const created = await seedJobDescriptions(accessToken, orgRoles, courses);
      setCourses(await getCourses(accessToken));
      setMsg(created > 0 ? `Created ${created} JD entr${created === 1 ? 'y' : 'ies'}. Add a document URL to each so it can be assigned.` : 'Every role already has a JD entry.');
    } catch { setMsg('Error creating JDs. Please try again.'); }
  };

  const handleSaveProfile = async (email) => {
    const edit = profileEdits[email] || {};
    setMsg('');
    try {
      await upsertUserProfile(accessToken, { email, ...edit });
      setMsg(`Profile saved for ${email.split('@')[0]}.`);
      setProfiles(await getAllUserProfiles(accessToken));
    } catch { setMsg('Error saving profile. Please try again.'); }
  };

  const handleAddEmployee = async (ev) => {
    ev.preventDefault();
    const email = (newEmployee.email || '').trim();
    if (!email) return;
    if (profiles.some(p => (p.Title || '').toLowerCase() === email.toLowerCase())) {
      setMsg('That employee already has a profile — edit it in the table below.');
      return;
    }
    setAddingEmployee(true);
    setMsg('');
    try {
      await upsertUserProfile(accessToken, {
        email,
        Role: newEmployee.Role,
        JobRole: newEmployee.JobRole,
        Department: newEmployee.Department,
        ManagerEmail: newEmployee.ManagerEmail,
      });
      setMsg(`Employee ${email.split('@')[0]} added.`);
      setNewEmployee({ email: '', Role: 'Employee', JobRole: '', Department: '', ManagerEmail: '' });
      setProfiles(await getAllUserProfiles(accessToken));
    } catch { setMsg('Error adding employee. Please try again.'); }
    setAddingEmployee(false);
  };

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
      setCourseForm({ Title: '', Description: '', Duration: '', Department: '', CourseMaterials: '', JobRoles: '', Departments: '', Mandatory: false });
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
      notifyCourseAssigned(accessToken, enrollForm.EmployeeID, enrollForm.CourseTitle, enrollForm.DueDate); // best-effort
      setMsg('Employee enrolled successfully. Notification email sent.');
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
      CourseMaterials: course.CourseMaterials || '',
      JobRoles: course.JobRoles || '',
      Departments: course.Departments || '',
      Mandatory: course.Mandatory === true || course.Mandatory === 'true'
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
            onClick={() => {
              if (t.id === 'quiz') return handleQuizTabActivate();
              setActiveTab(t.id);
              setMsg('');
              if (t.id === 'orgroles' || t.id === 'profiles') loadOrgData();
            }}
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
        <div>
        <div style={{ marginBottom: '18px' }}>
          <BulkUpload
            title="Bulk add courses (CSV)"
            accent={ACCENT}
            templateName="courses-template.csv"
            templateHeaders={['Title', 'Description', 'Duration', 'Department', 'CourseMaterials', 'JobRoles', 'Departments', 'Mandatory']}
            sampleRows={[['Data Engineering 101', 'Intro to DE', '4 Hours', 'Engineering', '', 'Data Engineer;BI Analyst', 'Engineering', 'Yes']]}
            mapRow={(r) => r.Title ? ({ ...r, Mandatory: /^(yes|true|1)$/i.test(r.Mandatory || '') }) : null}
            onSubmitRow={(payload) => createCourse(accessToken, payload)}
            onDone={async () => setCourses(await getCourses(accessToken))}
          />
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '2', minWidth: '300px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>All Courses ({filteredCourses.length})</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <DeptFilter value={courseDept} onChange={setCourseDept} departments={courseDepartments} />
                <button onClick={exportCourses} style={exportBtn(ACCENT)}>⬇ Export CSV</button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Title', 'Duration', 'Department', 'Targeting (JD)', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCourses.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No courses found.</td></tr>
                ) : (
                  filteredCourses.map(c => (
                    <tr key={c.Id}>
                      <td style={tdStyle}><strong>{c.Title}</strong></td>
                      <td style={tdStyle}>{c.Duration || '—'}</td>
                      <td style={tdStyle}>{c.Department || '—'}</td>
                      <td style={{ ...tdStyle, maxWidth: '220px' }}>
                        {(c.Mandatory === true || c.Mandatory === 'true') && <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', marginRight: '6px' }}>🔒 Mandatory</span>}
                        <span style={{ color: '#64748b' }}>{c.JobRoles || (c.Departments ? `Depts: ${c.Departments}` : 'All')}</span>
                      </td>
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
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>🎯 Target Job-Roles (JD)</label>
                  <input style={inputStyle} value={editForm.JobRoles} onChange={e => setEditForm(f => ({ ...f, JobRoles: e.target.value }))} placeholder="e.g. Data Engineer;BI Analyst" />
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>Semicolon-separated. Leave blank = all roles.</small>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>🏢 Target Departments</label>
                  <input style={inputStyle} value={editForm.Departments} onChange={e => setEditForm(f => ({ ...f, Departments: e.target.value }))} placeholder="e.g. Engineering;Analytics" />
                </div>
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input id="editMandatory" type="checkbox" checked={!!editForm.Mandatory} onChange={e => setEditForm(f => ({ ...f, Mandatory: e.target.checked }))} />
                  <label htmlFor="editMandatory" style={{ ...labelStyle, marginBottom: 0 }}>🔒 Mandatory (auto-assign to matching employees)</label>
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
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>🎯 Target Job-Roles (JD)</label>
                <input style={inputStyle} list="orgRoleSuggestions" value={courseForm.JobRoles} onChange={e => setCourseForm(f => ({ ...f, JobRoles: e.target.value }))} placeholder="e.g. Data Engineer;BI Analyst" />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>Semicolon-separated. Leave blank = all roles.</small>
                <datalist id="orgRoleSuggestions">{orgRoles.map(r => <option key={r.Id} value={r.Title} />)}</datalist>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>🏢 Target Departments</label>
                <input style={inputStyle} value={courseForm.Departments} onChange={e => setCourseForm(f => ({ ...f, Departments: e.target.value }))} placeholder="e.g. Engineering;Analytics" />
              </div>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input id="addMandatory" type="checkbox" checked={!!courseForm.Mandatory} onChange={e => setCourseForm(f => ({ ...f, Mandatory: e.target.checked }))} />
                <label htmlFor="addMandatory" style={{ ...labelStyle, marginBottom: 0 }}>🔒 Mandatory (auto-assign to matching employees)</label>
              </div>
              <button type="submit" style={btnStyle} disabled={submitting}>
                {submitting ? 'Saving...' : 'Add Course'}
              </button>
            </form>
          </div>
        </div>
        </div>
      )}

      {/* Enrollments Tab */}
      {activeTab === 'enrollments' && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>All Enrollments ({filteredEnrollments.length})</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <DeptFilter value={enrollDept} onChange={setEnrollDept} departments={enrollDepartments} />
              <button onClick={handleSendReminders} disabled={reminding} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '7px', cursor: reminding ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', opacity: reminding ? 0.7 : 1 }}>
                {reminding ? 'Sending...' : '📧 Send Reminders'}
              </button>
              <button onClick={exportEnrollments} style={exportBtn(ACCENT)}>⬇ Export CSV</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Course', 'Department', 'Status', 'Completed', 'Due Date', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEnrollments.length === 0 ? (
                  <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No enrollments found.</td></tr>
                ) : (
                  filteredEnrollments.map(e => (
                    <tr key={e.Id}>
                      <td style={tdStyle}>{e.EmployeeID || '—'}</td>
                      <td style={tdStyle}>{e.Title || e.CourseTitle || '—'}</td>
                      <td style={tdStyle}>{e.Department || '—'}</td>
                      <td style={tdStyle}><StatusBadge status={e.Status} /></td>
                      <td style={tdStyle}>{e.Status === 'Completed' && e.CompletedDate ? new Date(e.CompletedDate).toLocaleDateString() : '—'}</td>
                      <td style={tdStyle}>{e.DueDate ? new Date(e.DueDate).toLocaleDateString() : '—'}</td>
                      <td style={tdStyle}>
                        <button onClick={() => handleDeleteEnrollment(e)} title="Remove enrollment" style={{
                          background: '#fee2e2', color: '#991b1b', border: 'none', padding: '5px 12px',
                          borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                        }}>🗑 Remove</button>
                      </td>
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

      {/* Org Roles (JD) Tab */}
      {activeTab === 'orgroles' && (
        <div>
        <div style={{ marginBottom: '18px' }}>
          <BulkUpload
            title="Bulk add job-roles (CSV)"
            accent={ACCENT}
            templateName="org-roles-template.csv"
            templateHeaders={['JobRole', 'Department']}
            sampleRows={[['Data Engineer', 'Engineering'], ['BI Analyst', 'Analytics']]}
            mapRow={(r) => (r.JobRole || r.Title) ? ({ Title: r.JobRole || r.Title, Department: r.Department || '' }) : null}
            onSubmitRow={(payload) => createOrgRole(accessToken, payload)}
            onDone={async () => setOrgRoles(await getOrgRoles(accessToken))}
          />
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '2', minWidth: '300px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>Job-Roles (JD Taxonomy) — {orgRoles.length}</h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px' }}>These job-roles drive training recommendations and auto-assignment. Set a <strong>JD document</strong> per role — it becomes a mandatory read for everyone in that role.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={handleSeedAllJDs} style={{ ...exportBtn(ACCENT), background: ACCENT, color: 'white' }}>📄 Create JD for all roles</button>
                <button onClick={() => downloadCSV(`org-roles-${new Date().toISOString().slice(0,10)}.csv`, ['JobRole', 'Department', 'JD Document'], orgRoles.map(r => [r.Title || '', r.Department || '', jdForRole(r.Title)?.CourseMaterials || '']))} style={exportBtn(ACCENT)}>⬇ Export CSV</button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Job-Role', 'Department', 'JD Document (mandatory read)', ''].map(hh => <th key={hh} style={thStyle}>{hh}</th>)}</tr></thead>
              <tbody>
                {orgRoles.length === 0 ? (
                  <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No job-roles yet. Add some →</td></tr>
                ) : orgRoles.map(r => {
                  const jd = jdForRole(r.Title);
                  const draftVal = jdDrafts[r.Title] ?? (jd?.CourseMaterials || '');
                  const dirty = jdDrafts[r.Title] !== undefined && (jdDrafts[r.Title] || '') !== (jd?.CourseMaterials || '');
                  const assigned = jd && jd.CourseMaterials;
                  return (
                  <tr key={r.Id}>
                    <td style={tdStyle}><strong>{r.Title}</strong></td>
                    <td style={tdStyle}>{r.Department || '—'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          value={draftVal}
                          onChange={e => setJdDrafts(d => ({ ...d, [r.Title]: e.target.value }))}
                          placeholder="Paste JD document URL (SharePoint/PDF link)"
                          style={{ ...inputStyle, minWidth: '200px', flex: 1, margin: 0 }}
                        />
                        <button onClick={() => handleSaveJD(r)} disabled={!dirty && !!jd} style={{ background: (dirty || !jd) ? ACCENT : '#e2e8f0', color: (dirty || !jd) ? 'white' : '#94a3b8', padding: '7px 12px', border: 'none', borderRadius: '6px', cursor: (dirty || !jd) ? 'pointer' : 'default', fontSize: '13px', fontWeight: '600' }}>Save</button>
                      </div>
                      <span style={{ fontSize: '11px', color: assigned ? '#059669' : '#b45309' }}>
                        {assigned ? '✓ Assigned as mandatory read' : jd ? '⚠ JD entry exists — add a URL to assign it' : 'No JD yet'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => handleDeleteOrgRole(r.Id)} style={{ background: '#ef4444', color: 'white', padding: '5px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>🗑 Delete</button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ flex: '1', minWidth: '260px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '24px' }}>
            <h3 style={{ margin: '0 0 18px', color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>Add Job-Role</h3>
            <form onSubmit={handleAddOrgRole}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Job-Role Name *</label>
                <input style={inputStyle} value={orgRoleForm.Title} onChange={e => setOrgRoleForm(f => ({ ...f, Title: e.target.value }))} required placeholder="e.g. Data Engineer" />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Department</label>
                <input style={inputStyle} value={orgRoleForm.Department} onChange={e => setOrgRoleForm(f => ({ ...f, Department: e.target.value }))} placeholder="e.g. Engineering" />
              </div>
              <button type="submit" style={btnStyle}>Add Job-Role</button>
            </form>
          </div>
        </div>
        </div>
      )}

      {/* Employee Profiles Tab */}
      {activeTab === 'profiles' && (
        <div>
        {/* Add Employee */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: '20px 24px', marginBottom: '18px' }}>
          <h3 style={{ margin: '0 0 14px', color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>➕ Add Employee</h3>
          <form onSubmit={handleAddEmployee} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '2', minWidth: '200px' }}>
              <label style={labelStyle}>Employee Email *</label>
              <input type="email" style={inputStyle} value={newEmployee.email} onChange={e => setNewEmployee(f => ({ ...f, email: e.target.value }))} required placeholder="employee@sarasanalytics.com" />
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label style={labelStyle}>Access Role</label>
              <select style={inputStyle} value={newEmployee.Role} onChange={e => setNewEmployee(f => ({ ...f, Role: e.target.value }))}>
                {['Employee', 'Manager', 'HOD', 'HR', 'Admin'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '140px' }}>
              <label style={labelStyle}>Job-Role (JD)</label>
              <input style={inputStyle} list="orgRoleSuggestions2" value={newEmployee.JobRole} onChange={e => setNewEmployee(f => ({ ...f, JobRole: e.target.value }))} placeholder="e.g. Data Engineer" />
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label style={labelStyle}>Department</label>
              <input style={inputStyle} value={newEmployee.Department} onChange={e => setNewEmployee(f => ({ ...f, Department: e.target.value }))} placeholder="e.g. Engineering" />
            </div>
            <div style={{ flex: '1', minWidth: '160px' }}>
              <label style={labelStyle}>Manager Email</label>
              <input type="email" style={inputStyle} value={newEmployee.ManagerEmail} onChange={e => setNewEmployee(f => ({ ...f, ManagerEmail: e.target.value }))} placeholder="manager@company.com" />
            </div>
            <button type="submit" style={btnStyle} disabled={addingEmployee}>{addingEmployee ? 'Adding...' : 'Add'}</button>
          </form>
        </div>

        {/* Bulk upload employees */}
        <div style={{ marginBottom: '18px' }}>
          <BulkUpload
            title="Bulk add employees (CSV)"
            accent={ACCENT}
            templateName="employees-template.csv"
            templateHeaders={['email', 'Role', 'JobRole', 'Department', 'ManagerEmail']}
            sampleRows={[['employee@sarasanalytics.com', 'Employee', 'Data Engineer', 'Engineering', 'manager@sarasanalytics.com']]}
            mapRow={(r) => (r.email || r.Email) ? ({ email: r.email || r.Email, Role: r.Role || 'Employee', JobRole: r.JobRole || '', Department: r.Department || '', ManagerEmail: r.ManagerEmail || '' }) : null}
            onSubmitRow={(payload) => upsertUserProfile(accessToken, payload)}
            onDone={async () => setProfiles(await getAllUserProfiles(accessToken))}
          />
        </div>

        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>Employee Profiles ({filteredProfiles.length})</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px' }}>Set each employee's job-role, department and manager. Drives auto-assignment and assessment review routing.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <DeptFilter value={profileDept} onChange={setProfileDept} departments={profileDepartments} />
              <button onClick={exportProfiles} style={exportBtn(ACCENT)}>⬇ Export CSV</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Employee', 'Access Role', 'Job-Role (JD)', 'Department', 'Manager Email', ''].map(hh => <th key={hh} style={thStyle}>{hh}</th>)}</tr></thead>
              <tbody>
                {filteredProfiles.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No profiles found.</td></tr>
                ) : filteredProfiles.map(p => {
                  const email = p.Title;
                  const edit = profileEdits[email] || {};
                  const val = (k, fallback) => edit[k] !== undefined ? edit[k] : fallback;
                  const setEdit = (k, v) => setProfileEdits(pe => ({ ...pe, [email]: { ...edit, [k]: v } }));
                  return (
                    <tr key={p.Id}>
                      <td style={tdStyle}><strong>{(email || '').split('@')[0]}</strong><div style={{ color: '#9ca3af', fontSize: '11px' }}>{email}</div></td>
                      <td style={tdStyle}>
                        <select style={{ ...inputStyle, minWidth: '110px' }} value={val('Role', p.Role || 'Employee')} onChange={e => setEdit('Role', e.target.value)}>
                          {['Employee', 'Manager', 'HOD', 'HR', 'Admin'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <input style={{ ...inputStyle, minWidth: '140px' }} list="orgRoleSuggestions2" value={val('JobRole', p.JobRole || '')} onChange={e => setEdit('JobRole', e.target.value)} placeholder="Job-role" />
                      </td>
                      <td style={tdStyle}>
                        <input style={{ ...inputStyle, minWidth: '120px' }} value={val('Department', p.Department || '')} onChange={e => setEdit('Department', e.target.value)} placeholder="Department" />
                      </td>
                      <td style={tdStyle}>
                        <input style={{ ...inputStyle, minWidth: '160px' }} value={val('ManagerEmail', p.ManagerEmail || '')} onChange={e => setEdit('ManagerEmail', e.target.value)} placeholder="manager@company.com" />
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => handleSaveProfile(email)} style={{ ...btnStyle, padding: '6px 14px', fontSize: '13px' }}>Save</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <datalist id="orgRoleSuggestions2">{orgRoles.map(r => <option key={r.Id} value={r.Title} />)}</datalist>
          </div>
        </div>
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
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '15px', fontWeight: '700' }}>Quiz Results ({quizResults.length})</h3>
                <button onClick={exportQuiz} style={exportBtn(ACCENT)}>⬇ Export CSV</button>
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
