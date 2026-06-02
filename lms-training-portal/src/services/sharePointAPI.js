import axios from 'axios';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const SITE_HOST = 'sarasanalytics.sharepoint.com';
const SITE_PATH = '/sites/training-library';

let cachedSiteId = null;

const getSiteId = async (token) => {
  if (cachedSiteId) return cachedSiteId;
  const res = await axios.get(`${GRAPH}/sites/${SITE_HOST}:${SITE_PATH}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  cachedSiteId = res.data.id;
  return cachedSiteId;
};

const mapItem = (item) => ({ Id: item.id, id: item.id, ...item.fields });

const headers = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/json',
  'Content-Type': 'application/json'
});

// Get employee's enrollments
export const getMyEnrollments = async (token, userEmail) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items?$expand=fields&$filter=fields/EmployeeID eq '${userEmail}'&$top=1000`,
      { headers: headers(token) }
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.error('Error fetching enrollments:', e);
    return [];
  }
};

// Get all courses
export const getCourses = async (token) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Courses/items?$expand=fields&$top=1000`,
      { headers: headers(token) }
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.error('Error fetching courses:', e);
    return [];
  }
};

// Get all enrollments (Admin/HR)
export const getAllEnrollments = async (token) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items?$expand=fields&$top=5000`,
      { headers: headers(token) }
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) {
    console.error('Error fetching all enrollments:', e);
    return [];
  }
};

// Update enrollment status
export const updateEnrollmentStatus = async (token, enrollmentId, status) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.patch(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items/${enrollmentId}`,
      { fields: { Status: status } },
      { headers: headers(token) }
    );
    return res.data;
  } catch (e) {
    console.error('Error updating enrollment:', e);
    throw e;
  }
};

// Enroll an employee
export const enrollEmployee = async (token, enrollmentData) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.post(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items`,
      { fields: enrollmentData },
      { headers: headers(token) }
    );
    return res.data;
  } catch (e) {
    console.error('Error enrolling employee:', e);
    throw e;
  }
};

// Create a course
export const createCourse = async (token, courseData) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.post(
      `${GRAPH}/sites/${siteId}/lists/Courses/items`,
      { fields: courseData },
      { headers: headers(token) }
    );
    return res.data;
  } catch (e) {
    console.error('Error creating course:', e);
    throw e;
  }
};

// Get user role from UserRoles list
export const getUserRole = async (token, userEmail) => {
  try {
    const siteId = await getSiteId(token);
    const email = userEmail.toLowerCase();
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/UserRoles/items?$expand=fields&$top=100`,
      { headers: headers(token) }
    );
    const items = res.data.value || [];
    const match = items.find(i => (i.fields?.Title || '').toLowerCase() === email);
    return match ? (match.fields?.Role || 'Employee') : 'Employee';
  } catch (e) {
    console.error('Error fetching user role:', e);
    return 'Employee';
  }
};

// Get course details
export const getCourseDetails = async (token, courseId) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Courses/items/${courseId}?$expand=fields`,
      { headers: headers(token) }
    );
    return mapItem(res.data);
  } catch (e) {
    console.error('Error fetching course details:', e);
    return null;
  }
};
