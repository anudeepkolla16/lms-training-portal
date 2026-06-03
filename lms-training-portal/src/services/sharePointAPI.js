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
    'Content-Type': 'application/json'
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

export const getMyEnrollments = async (token, userEmail) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items?$expand=fields&$filter=fields/EmployeeID eq '${userEmail}'&$top=1000`,
      h(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.warn('getMyEnrollments fallback:', e?.response?.data?.error?.message || e.message);
    return MOCK_ENROLLMENTS.filter(x => x.EmployeeID?.toLowerCase() === userEmail.toLowerCase());
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
    await axios.patch(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items/${enrollmentId}`,
      { fields: { Status: status } },
      h(token)
    );
  } catch (e) { console.error('updateEnrollmentStatus error:', e?.response?.data || e.message); throw e; }
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
    const fields = { ...data };
    // Handle CourseMaterials - send as URL string for single-line text column
    if (fields.CourseMaterials && typeof fields.CourseMaterials === 'string') {
      fields.CourseMaterials = fields.CourseMaterials;
    }
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
