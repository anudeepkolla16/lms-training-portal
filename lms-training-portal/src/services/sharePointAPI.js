import axios from 'axios';

const PROXY_URL = 'https://saraslms.anudeep-kolla.workers.dev';

const callProxy = async (token, endpoint, method = 'GET', data = null) => {
  const res = await axios.post(PROXY_URL, { token, endpoint, method, data });
  return res.data;
};

const MOCK_ENROLLMENTS = [
  { Id: 1, Title: 'Data Engineering Fundamentals', EmployeeID: 'anudeep.kolla@sarasanalytics.com', Status: 'Active', Department: 'Engineering', Duration: '8 hours', Description: 'Core data engineering concepts and best practices.' },
  { Id: 2, Title: 'SQL Advanced Techniques', EmployeeID: 'anudeep.kolla@sarasanalytics.com', Status: 'Completed', Department: 'Engineering', Duration: '4 hours', Description: 'Advanced SQL queries, optimization and analytics.' },
  { Id: 3, Title: 'Power BI Dashboard Design', EmployeeID: 'anudeep.kolla@sarasanalytics.com', Status: 'Not Started', Department: 'Analytics', Duration: '6 hours', Description: 'Building professional dashboards in Power BI.' },
];

const MOCK_COURSES = [
  { Id: 1, Title: 'Data Engineering Fundamentals', Department: 'Engineering', Duration: '8 hours', Description: 'Core concepts of data engineering, ETL pipelines, and data warehousing.' },
  { Id: 2, Title: 'SQL Advanced Techniques', Department: 'Engineering', Duration: '4 hours', Description: 'Advanced SQL for data analysis and optimization.' },
  { Id: 3, Title: 'Power BI Dashboard Design', Department: 'Analytics', Duration: '6 hours', Description: 'Professional dashboard creation and visualization.' },
  { Id: 4, Title: 'Python for Data Science', Department: 'Data Science', Duration: '10 hours', Description: 'Python fundamentals for data analysis and ML.' },
  { Id: 5, Title: 'Azure Cloud Fundamentals', Department: 'Engineering', Duration: '5 hours', Description: 'Microsoft Azure services for data professionals.' },
];

const MOCK_ALL_ENROLLMENTS = [
  ...MOCK_ENROLLMENTS,
  { Id: 4, Title: 'Data Engineering Fundamentals', EmployeeID: 'subha.kumar@sarasanalytics.com', Status: 'Completed', Department: 'HR', Duration: '8 hours' },
  { Id: 5, Title: 'Power BI Dashboard Design', EmployeeID: 'subha.kumar@sarasanalytics.com', Status: 'Active', Department: 'HR', Duration: '6 hours' },
  { Id: 6, Title: 'Data Engineering Fundamentals', EmployeeID: 'srinivas.janipalli@sarasanalytics.com', Status: 'Active', Department: 'Engineering', Duration: '8 hours' },
  { Id: 7, Title: 'Azure Cloud Fundamentals', EmployeeID: 'srinivas.janipalli@sarasanalytics.com', Status: 'Not Started', Department: 'Engineering', Duration: '5 hours' },
  { Id: 8, Title: 'SQL Advanced Techniques', EmployeeID: 'ravi.kumar@sarasanalytics.com', Status: 'Completed', Department: 'Analytics', Duration: '4 hours' },
  { Id: 9, Title: 'Python for Data Science', EmployeeID: 'ravi.kumar@sarasanalytics.com', Status: 'Active', Department: 'Analytics', Duration: '10 hours' },
];

const MOCK_ROLES = {
  'anudeep.kolla@sarasanalytics.com': 'Admin',
  'subha.kumar@sarasanalytics.com': 'HR',
  'srinivas.janipalli@sarasanalytics.com': 'Manager',
};

export const getMyEnrollments = async (token, userEmail) => {
  try {
    const email = encodeURIComponent(userEmail);
    const res = await callProxy(token, `/_api/web/lists/getbytitle('Employee Enrollments')/items?$filter=EmployeeID eq '${email}'&$top=1000`);
    return res.d?.results || res.value || [];
  } catch (e) {
    console.warn('SharePoint unavailable, using demo data');
    return MOCK_ENROLLMENTS.filter(e => e.EmployeeID?.toLowerCase() === userEmail.toLowerCase());
  }
};

export const getCourses = async (token) => {
  try {
    const res = await callProxy(token, `/_api/web/lists/getbytitle('Courses')/items?$top=1000`);
    return res.d?.results || res.value || [];
  } catch (e) { console.warn('getCourses fallback'); return MOCK_COURSES; }
};

export const getAllEnrollments = async (token) => {
  try {
    const res = await callProxy(token, `/_api/web/lists/getbytitle('Employee Enrollments')/items?$top=5000`);
    return res.d?.results || res.value || [];
  } catch (e) { console.warn('getAllEnrollments fallback'); return MOCK_ALL_ENROLLMENTS; }
};

export const updateEnrollmentStatus = async (token, enrollmentId, status) => {
  try {
    await callProxy(token, `/_api/web/lists/getbytitle('Employee Enrollments')/items(${enrollmentId})`, 'PATCH', {
      '__metadata': { type: 'SP.Data.Employee_x0020_EnrollmentsListItem' },
      Status: status
    });
  } catch (e) { console.error('updateEnrollmentStatus error:', e?.response?.data || e.message); throw e; }
};

export const enrollEmployee = async (token, enrollmentData) => {
  try {
    return await callProxy(token, `/_api/web/lists/getbytitle('Employee Enrollments')/items`, 'POST', {
      '__metadata': { type: 'SP.Data.Employee_x0020_EnrollmentsListItem' },
      ...enrollmentData
    });
  } catch (e) { console.error('enrollEmployee error:', e?.response?.data || e.message); throw e; }
};

export const createCourse = async (token, courseData) => {
  try {
    return await callProxy(token, `/_api/web/lists/getbytitle('Courses')/items`, 'POST', {
      '__metadata': { type: 'SP.Data.CoursesListItem' },
      ...courseData
    });
  } catch (e) { console.error('createCourse error:', e?.response?.data || e.message); throw e; }
};

export const getUserRole = async (token, userEmail) => {
  try {
    const res = await callProxy(token, `/_api/web/lists/getbytitle('UserRoles')/items?$top=100`);
    const items = res.d?.results || res.value || [];
    const match = items.find(i => (i.Title || '').toLowerCase() === userEmail.toLowerCase());
    return match ? (match.Role || 'Employee') : 'Employee';
  } catch (e) {
    console.warn('getUserRole fallback for:', userEmail);
    return MOCK_ROLES[userEmail.toLowerCase()] || 'Employee';
  }
};

export const getCourseDetails = async (token, courseId) => {
  try {
    return await callProxy(token, `/_api/web/lists/getbytitle('Courses')/items(${courseId})`);
  } catch (e) { console.error('getCourseDetails error:', e?.response?.data || e.message); return null; }
};
