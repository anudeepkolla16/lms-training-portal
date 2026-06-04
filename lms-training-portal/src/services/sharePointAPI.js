import axios from 'axios';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const SITE_HOST = 'sarasanalytics0.sharepoint.com';
const SITE_PATH = '/sites/training-library';

let cachedSiteId = null;

const getSiteId = async (token) => {
  if (cachedSiteId) return cachedSiteId;
  const res = await axios.get(
    `${GRAPH}/sites/${SITE_HOST}:${SITE_PATH}:`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  cachedSiteId = res.data.id;
  console.log('SharePoint Online site found:', cachedSiteId);
  return cachedSiteId;
};

const h = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Prefer': 'HonorNonIndexedQueriesWarningMayFailRandomly'
  }
});

const mapItem = (i) => ({ Id: i.id, id: i.id, ...i.fields });

// Mock data fallback
const MOCK_ENROLLMENTS = [
  { Id: 1, Title: 'Data Engineering Fundamentals', EmployeeID: 'anudeep.kolla@sarasanalytics.com', Status: 'Active', Department: 'Engineering', Duration: '8 hours' },
  { Id: 2, Title: 'SQL Advanced Techniques', EmployeeID: 'anudeep.kolla@sarasanalytics.com', Status: 'Completed', Department: 'Engineering', Duration: '4 hours' },
  { Id: 3, Title: 'Power BI Dashboard Design', EmployeeID: 'anudeep.kolla@sarasanalytics.com', Status: 'Not Started', Department: 'Analytics', Duration: '6 hours' },
];
const MOCK_COURSES = [
  { Id: 1, Title: 'Data Engineering Fundamentals', Department: 'Engineering', Duration: '8 hours' },
  { Id: 2, Title: 'SQL Advanced Techniques', Department: 'Engineering', Duration: '4 hours' },
  { Id: 3, Title: 'Power BI Dashboard Design', Department: 'Analytics', Duration: '6 hours' },
  { Id: 4, Title: 'Python for Data Science', Department: 'Data Science', Duration: '10 hours' },
  { Id: 5, Title: 'Azure Cloud Fundamentals', Department: 'Engineering', Duration: '5 hours' },
];
const MOCK_ALL = [
  ...MOCK_ENROLLMENTS,
  { Id: 4, Title: 'Data Engineering Fundamentals', EmployeeID: 'subha.kumar@sarasanalytics.com', Status: 'Completed', Department: 'HR' },
  { Id: 5, Title: 'Power BI Dashboard Design', EmployeeID: 'subha.kumar@sarasanalytics.com', Status: 'Active', Department: 'HR' },
  { Id: 6, Title: 'SQL Advanced Techniques', EmployeeID: 'srinivas.janipalli@sarasanalytics.com', Status: 'Active', Department: 'Engineering' },
];
const MOCK_ROLES = {
  'anudeep.kolla@sarasanalytics.com': 'Admin',
  'subha.kumar@sarasanalytics.com': 'HR',
  'srinivas.janipalli@sarasanalytics.com': 'Manager',
};

// Job-role (JD) taxonomy fallback — admins manage the real list in SharePoint "OrgRoles"
const MOCK_ORG_ROLES = [
  { Id: 1, Title: 'Data Engineer', Department: 'Engineering' },
  { Id: 2, Title: 'Analytics Engineer', Department: 'Analytics' },
  { Id: 3, Title: 'BI Analyst', Department: 'Analytics' },
  { Id: 4, Title: 'Data Scientist', Department: 'Data Science' },
  { Id: 5, Title: 'HR Generalist', Department: 'HR' },
  { Id: 6, Title: 'Engineering Manager', Department: 'Engineering' },
];

// Employee profile fallback. NOTE: `role` = access-role (controls dashboard),
// `jobRole` = job description (controls which training is relevant). They are different.
const MOCK_PROFILES = {
  'anudeep.kolla@sarasanalytics.com': { role: 'Admin', jobRole: 'Data Engineer', department: 'Engineering', managerEmail: 'srinivas.janipalli@sarasanalytics.com' },
  'subha.kumar@sarasanalytics.com': { role: 'HR', jobRole: 'HR Generalist', department: 'HR', managerEmail: '' },
  'srinivas.janipalli@sarasanalytics.com': { role: 'Manager', jobRole: 'Engineering Manager', department: 'Engineering', managerEmail: '' },
};

// Split a semicolon-delimited field into a clean lowercased array
const splitCsv = (s) => String(s || '').split(';').map(x => x.trim().toLowerCase()).filter(Boolean);
// A course targets a value if the field is empty (applies to all) or contains the value
export const matchesCsv = (field, value) => {
  const list = splitCsv(field);
  if (list.length === 0) return true;
  return value ? list.includes(String(value).trim().toLowerCase()) : false;
};
// SharePoint Yes/No can come back as true/'true'/1 — normalize to a boolean
export const isTruthy = (v) => v === true || v === 'true' || v === 1 || v === '1' || v === 'Yes' || v === 'yes';

export const getMyEnrollments = async (token, userEmail) => {
  try {
    const siteId = await getSiteId(token);
    // Only escape single quotes for OData - do NOT encodeURIComponent the email value
    const safeEmail = (userEmail || '').replace(/'/g, "''");
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items?$expand=fields&$filter=fields/EmployeeID eq '${safeEmail}'&$top=1000`,
      h(token)
    );
    return (res.data?.value || res.d?.results || []).map(mapItem);
  } catch (e) {
    console.warn('getMyEnrollments error:', e?.response?.data?.error?.message || e.message);
    return []; // Return empty - no mock data for employee view
  }
};

export const getCourses = async (token) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Courses/items?$expand=fields&$top=1000`,
      h(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.warn('getCourses fallback:', e?.response?.data?.error?.message || e.message);
    return MOCK_COURSES;
  }
};

export const getAllEnrollments = async (token) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items?$expand=fields&$top=5000`,
      h(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.warn('getAllEnrollments fallback:', e?.response?.data?.error?.message || e.message);
    return MOCK_ALL;
  }
};

export const updateEnrollmentStatus = async (token, enrollmentId, status) => {
  try {
    const siteId = await getSiteId(token);
    const base = `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items/${enrollmentId}`;
    await axios.patch(base, { fields: { Status: status } }, h(token));
    // Best-effort completion timestamp — ignored if the CompletedDate column doesn't exist yet
    try {
      await axios.patch(base, { fields: { CompletedDate: status === 'Completed' ? new Date().toISOString() : null } }, h(token));
    } catch (e) { /* column optional */ }
  } catch (e) { console.error('updateEnrollmentStatus error:', e?.response?.data || e.message); throw e; }
};

export const deleteEnrollment = async (token, enrollmentId) => {
  try {
    const siteId = await getSiteId(token);
    await axios.delete(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items/${enrollmentId}`,
      h(token)
    );
  } catch (e) { console.error('deleteEnrollment error:', e?.response?.data || e.message); throw e; }
};

export const enrollEmployee = async (token, data) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.post(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items`,
      { fields: data },
      h(token)
    );
    return res.data;
  } catch (e) { console.error('enrollEmployee error:', e?.response?.data || e.message); throw e; }
};

export const createCourse = async (token, data) => {
  try {
    const siteId = await getSiteId(token);
    // Only send fields that exist in SharePoint Courses list
    const fields = { Title: data.Title };
    if (data.Duration) fields.Duration = data.Duration;
    if (data.Department) fields.Department = data.Department;
    if (data.CourseMaterials) fields.CourseMaterials = String(data.CourseMaterials);
    if (data.Description) fields.Description = data.Description;
    if (data.JobRoles !== undefined) fields.JobRoles = String(data.JobRoles || '');
    if (data.Departments !== undefined) fields.Departments = String(data.Departments || '');
    if (data.Mandatory !== undefined) fields.Mandatory = !!data.Mandatory;

    const res = await axios.post(
      `${GRAPH}/sites/${siteId}/lists/Courses/items`,
      { fields },
      h(token)
    );
    return res.data;
  } catch (e) {
    console.error('createCourse error:', JSON.stringify(e?.response?.data));
    throw e;
  }
};

export const getUserRole = async (token, userEmail) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/UserRoles/items?$expand=fields&$top=100`,
      h(token)
    );
    const items = res.data.value || [];
    const match = items.find(i => (i.fields?.Title || '').toLowerCase() === userEmail.toLowerCase());
    return match ? (match.fields?.Role || 'Employee') : 'Employee';
  } catch (e) {
    console.warn('getUserRole fallback:', e?.response?.data?.error?.message || e.message);
    return MOCK_ROLES[userEmail.toLowerCase()] || 'Employee';
  }
};

// Superset of getUserRole — reads the same UserRoles list but returns the full profile.
// `role` = access-role (dashboard), `jobRole`/`department` = JD dimension (training), `managerEmail` = review routing.
export const getUserProfile = async (token, userEmail) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/UserRoles/items?$expand=fields&$top=500`,
      h(token)
    );
    const items = res.data.value || [];
    const match = items.find(i => (i.fields?.Title || '').toLowerCase() === userEmail.toLowerCase());
    const f = match?.fields || {};
    return {
      role: f.Role || 'Employee',
      jobRole: f.JobRole || '',
      department: f.Department || '',
      managerEmail: f.ManagerEmail || '',
    };
  } catch (e) {
    console.warn('getUserProfile fallback:', e?.response?.data?.error?.message || e.message);
    return MOCK_PROFILES[userEmail.toLowerCase()] || { role: 'Employee', jobRole: '', department: '', managerEmail: '' };
  }
};

// All employee profiles — for the Admin "Employee Profiles" management table
export const getAllUserProfiles = async (token) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/UserRoles/items?$expand=fields&$top=1000`,
      h(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.warn('getAllUserProfiles fallback:', e?.response?.data?.error?.message || e.message);
    return Object.entries(MOCK_PROFILES).map(([email, p], i) => ({
      Id: i + 1, Title: email, Role: p.role, JobRole: p.jobRole, Department: p.department, ManagerEmail: p.managerEmail
    }));
  }
};

// Create or update a UserRoles row (email is the Title key). Sets JobRole/Department/ManagerEmail (and Role if provided).
export const upsertUserProfile = async (token, { email, Role, JobRole, Department, ManagerEmail }) => {
  const siteId = await getSiteId(token);
  const fields = {};
  if (Role !== undefined) fields.Role = Role;
  if (JobRole !== undefined) fields.JobRole = JobRole;
  if (Department !== undefined) fields.Department = Department;
  if (ManagerEmail !== undefined) fields.ManagerEmail = ManagerEmail;
  try {
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/UserRoles/items?$expand=fields&$top=1000`,
      h(token)
    );
    const match = (res.data.value || []).find(i => (i.fields?.Title || '').toLowerCase() === (email || '').toLowerCase());
    if (match) {
      await axios.patch(`${GRAPH}/sites/${siteId}/lists/UserRoles/items/${match.id}`, { fields }, h(token));
    } else {
      await axios.post(`${GRAPH}/sites/${siteId}/lists/UserRoles/items`, { fields: { Title: email, ...fields } }, h(token));
    }
  } catch (e) { console.error('upsertUserProfile error:', e?.response?.data || e.message); throw e; }
};

// ---- Org roles (JD taxonomy) ----
export const getOrgRoles = async (token) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/OrgRoles/items?$expand=fields&$top=1000`,
      h(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.warn('getOrgRoles fallback:', e?.response?.data?.error?.message || e.message);
    return MOCK_ORG_ROLES;
  }
};

export const createOrgRole = async (token, data) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.post(
      `${GRAPH}/sites/${siteId}/lists/OrgRoles/items`,
      { fields: { Title: data.Title, Department: data.Department || '' } },
      h(token)
    );
    return res.data;
  } catch (e) { console.error('createOrgRole error:', e?.response?.data || e.message); throw e; }
};

export const deleteOrgRole = async (token, id) => {
  try {
    const siteId = await getSiteId(token);
    await axios.delete(`${GRAPH}/sites/${siteId}/lists/OrgRoles/items/${id}`, h(token));
  } catch (e) { console.error('deleteOrgRole error:', e?.response?.data || e.message); throw e; }
};

// ---- Self assessments (rating + manager review workflow) ----
export const getMyAssessments = async (token, userEmail) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Self%20Assessments/items?$expand=fields&$filter=fields/EmployeeID eq '${(userEmail||'').replace(/'/g,"''")}'&$top=500`,
      h(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.warn('getMyAssessments fallback:', e?.response?.data?.error?.message || e.message);
    return [];
  }
};

export const getAllSelfAssessments = async (token) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Self%20Assessments/items?$expand=fields&$top=5000`,
      h(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.warn('getAllSelfAssessments fallback:', e?.response?.data?.error?.message || e.message);
    return [];
  }
};

// Pending reviews routed to a given manager. Falls back to client-side filtering
// of a broad fetch if the combined OData filter is rejected (non-indexed columns).
export const getAssessmentsForManager = async (token, managerEmail) => {
  const me = (managerEmail || '').toLowerCase();
  try {
    const all = await getAllSelfAssessments(token);
    return all.filter(a => (a.ManagerEmail || '').toLowerCase() === me && a.AssessmentState === 'PendingManagerReview');
  } catch (e) {
    console.warn('getAssessmentsForManager fallback:', e?.response?.data?.error?.message || e.message);
    return [];
  }
};

// Send an email via Microsoft Graph as the signed-in user. Best-effort: never throws,
// so a notification failure can't block the action that triggered it. Requires the
// Mail.Send delegated scope (added to the token request in App.jsx) + Azure AD consent.
export const sendMail = async (token, { to, subject, html }) => {
  if (!to) return false;
  try {
    await axios.post(
      `${GRAPH}/me/sendMail`,
      {
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: true,
      },
      h(token)
    );
    return true;
  } catch (e) {
    console.warn('sendMail failed (non-blocking):', e?.response?.data?.error?.message || e.message);
    return false;
  }
};

const PORTAL_URL = () => (typeof window !== 'undefined' ? window.location.origin : '');

// Email an employee that a course was assigned to them (best-effort).
export const notifyCourseAssigned = async (token, to, courseTitle, dueDate) => {
  if (!to) return false;
  const due = dueDate ? new Date(dueDate).toLocaleDateString() : null;
  const portal = PORTAL_URL();
  return sendMail(token, {
    to,
    subject: `New training assigned: ${courseTitle}`,
    html: `<p>Hi,</p>
      <p>You have been assigned the training <strong>${courseTitle}</strong>${due ? ` (due <strong>${due}</strong>)` : ''}.</p>
      <p>Please complete it in the Training Portal.</p>
      ${portal ? `<p><a href="${portal}">Open Training Portal</a></p>` : ''}
      <p>— Training Portal</p>`,
  });
};

// Email an employee the outcome of their manager's review of a self-assessment.
export const notifyAssessmentReviewed = async (token, to, courseTitle, rating, needsRedo) => {
  if (!to) return false;
  const portal = PORTAL_URL();
  return sendMail(token, {
    to,
    subject: needsRedo ? `Action needed: redo training "${courseTitle}"` : `Training rating approved: ${courseTitle}`,
    html: needsRedo
      ? `<p>Hi,</p>
         <p>Your manager reviewed your self-assessment for <strong>${courseTitle}</strong> and set the rating to <strong>${rating}/5</strong>.</p>
         <p>Because it is below 4, please <strong>redo the training and pass the quiz</strong> in the Training Portal to complete it.</p>
         ${portal ? `<p><a href="${portal}">Open Training Portal</a></p>` : ''}
         <p>— Training Portal</p>`
      : `<p>Hi,</p>
         <p>Your manager approved your self-assessment for <strong>${courseTitle}</strong> with a rating of <strong>${rating}/5</strong>. No further action needed.</p>
         <p>— Training Portal</p>`,
  });
};

// Send one reminder email per employee listing their incomplete courses (overdue flagged).
// Returns { sent, employees }. Best-effort per email.
export const sendCompletionReminders = async (token, enrollments) => {
  const today = new Date();
  const pending = (enrollments || []).filter(e => e.Status !== 'Completed' && e.EmployeeID);
  const byEmp = {};
  pending.forEach(e => { (byEmp[e.EmployeeID] = byEmp[e.EmployeeID] || []).push(e); });
  const portal = PORTAL_URL();
  let sent = 0;
  for (const [email, items] of Object.entries(byEmp)) {
    const list = items.map(e => {
      const overdue = e.DueDate && new Date(e.DueDate) < today;
      const due = e.DueDate ? new Date(e.DueDate).toLocaleDateString() : 'no due date';
      return `<li><strong>${e.Title || e.CourseTitle || 'Course'}</strong> — ${e.Status || 'Not Started'} (due ${due}${overdue ? ' — <span style="color:#b91c1c;font-weight:bold">OVERDUE</span>' : ''})</li>`;
    }).join('');
    const ok = await sendMail(token, {
      to: email,
      subject: `Reminder: ${items.length} training${items.length > 1 ? 's' : ''} pending completion`,
      html: `<p>Hi,</p>
        <p>This is a friendly reminder to complete your assigned training:</p>
        <ul>${list}</ul>
        ${portal ? `<p><a href="${portal}">Open Training Portal</a></p>` : ''}
        <p>— Training Portal</p>`,
    });
    if (ok) sent++;
  }
  return { sent, employees: Object.keys(byEmp).length };
};

export const saveSelfAssessment = async (token, data) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.post(
      `${GRAPH}/sites/${siteId}/lists/Self%20Assessments/items`,
      { fields: { ...data, AssessmentDate: new Date().toISOString() } },
      h(token)
    );
    return res.data;
  } catch (e) { console.error('saveSelfAssessment error:', e?.response?.data || e.message); throw e; }
};

export const updateAssessment = async (token, assessmentId, fields) => {
  try {
    const siteId = await getSiteId(token);
    await axios.patch(
      `${GRAPH}/sites/${siteId}/lists/Self%20Assessments/items/${assessmentId}`,
      { fields },
      h(token)
    );
  } catch (e) { console.error('updateAssessment error:', e?.response?.data || e.message); throw e; }
};

// Idempotently enroll an employee in mandatory courses that match their job-role/department.
// Returns the number of new enrollments created. Safe to call on every dashboard load.
export const autoAssignMandatory = async (token, email, profile, courses, existingEnrollments) => {
  if (!profile || (!profile.jobRole && !profile.department)) return 0; // no data to match on — skip
  const enrolledTitles = new Set((existingEnrollments || []).map(e => (e.Title || '').toLowerCase()));
  const toEnroll = (courses || []).filter(c =>
    isTruthy(c.Mandatory) &&
    matchesCsv(c.JobRoles, profile.jobRole) &&
    matchesCsv(c.Departments, profile.department) &&
    !enrolledTitles.has((c.Title || '').toLowerCase())
  );
  let created = 0;
  for (const c of toEnroll) {
    try {
      await enrollEmployee(token, {
        Title: c.Title,
        EmployeeID: email,
        Department: profile.department || c.Department || '',
        Status: 'Not Started',
      });
      notifyCourseAssigned(token, email, c.Title, null); // best-effort, non-blocking
      created++;
    } catch (e) { /* logged in enrollEmployee */ }
  }
  return created;
};

export const getQuizQuestions = async (token, courseTitle) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Quiz%20Questions/items?$expand=fields&$filter=fields/CourseTitle eq '${(courseTitle||'').replace(/'/g,"''")}'&$top=50`,
      h(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.warn('getQuizQuestions error:', e?.response?.data?.error?.message || e.message);
    return [];
  }
};

export const saveQuizResult = async (token, data) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.post(
      `${GRAPH}/sites/${siteId}/lists/Quiz%20Results/items`,
      { fields: { ...data, AttemptDate: new Date().toISOString() } },
      h(token)
    );
    return res.data;
  } catch (e) {
    console.error('saveQuizResult error:', e?.response?.data || e.message);
    throw e;
  }
};

export const getQuizResults = async (token) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Quiz%20Results/items?$expand=fields&$top=5000`,
      h(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.warn('getQuizResults error:', e?.response?.data?.error?.message || e.message);
    return [];
  }
};

export const getMyQuizResults = async (token, userEmail) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Quiz%20Results/items?$expand=fields&$filter=fields/EmployeeID eq '${(userEmail||'').replace(/'/g,"''")}'&$top=100`,
      h(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.warn('getMyQuizResults error:', e?.response?.data?.error?.message || e.message);
    return [];
  }
};

export const getCourseDetails = async (token, courseId) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Courses/items/${courseId}?$expand=fields`,
      h(token)
    );
    return mapItem(res.data);
  } catch (e) { return null; }
};

export const updateCourse = async (token, courseId, data) => {
  try {
    const siteId = await getSiteId(token);
    const fields = {};
    if (data.Title) fields.Title = data.Title;
    if (data.Duration !== undefined) fields.Duration = data.Duration;
    if (data.Department !== undefined) fields.Department = data.Department;
    if (data.CourseMaterials !== undefined) fields.CourseMaterials = String(data.CourseMaterials || '');
    if (data.Description !== undefined) fields.Description = data.Description;
    if (data.JobRoles !== undefined) fields.JobRoles = String(data.JobRoles || '');
    if (data.Departments !== undefined) fields.Departments = String(data.Departments || '');
    if (data.Mandatory !== undefined) fields.Mandatory = !!data.Mandatory;
    await axios.patch(
      `${GRAPH}/sites/${siteId}/lists/Courses/items/${courseId}`,
      { fields },
      h(token)
    );
  } catch (e) {
    console.error('updateCourse error:', JSON.stringify(e?.response?.data));
    throw e;
  }
};

export const createQuizQuestion = async (token, data) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.post(
      `${GRAPH}/sites/${siteId}/lists/Quiz%20Questions/items`,
      { fields: data },
      h(token)
    );
    return res.data;
  } catch (e) { console.error('createQuizQuestion error:', e?.response?.data || e.message); throw e; }
};
