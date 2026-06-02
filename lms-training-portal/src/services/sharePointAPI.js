import axios from 'axios';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const SITE_HOST = 'sarasanalytics.sharepoint.com';
const SITE_PATH = '/sites/training-library';

let cachedSiteId = null;

const getSiteId = async (token) => {
  if (cachedSiteId) return cachedSiteId;
  const h = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };

  // Try 3 URL formats - Graph requires trailing colon for path-based addressing
  const formats = [
    `${GRAPH}/sites/${SITE_HOST}:${SITE_PATH}:`,          // correct: trailing colon
    `${GRAPH}/sites/${SITE_HOST}:${SITE_PATH}`,            // without trailing colon
    `${GRAPH}/sites?search=training-library`,              // search fallback
  ];

  for (let i = 0; i < formats.length; i++) {
    try {
      const res = await axios.get(formats[i], h);
      if (i === 2) {
        // Search result - find matching site
        const site = (res.data.value || []).find(s => s.webUrl?.includes('training-library'));
        if (site) { cachedSiteId = site.id; console.log('Site found via search:', cachedSiteId); return cachedSiteId; }
      } else {
        cachedSiteId = res.data.id;
        console.log(`Site found via format${i+1}:`, cachedSiteId);
        return cachedSiteId;
      }
    } catch (e) {
      console.warn(`Format ${i+1} failed (${e?.response?.status}):`, e?.response?.data?.error?.code, e?.response?.data?.error?.message);
    }
  }
  throw new Error('Cannot find SharePoint site via any method');
};

const g = (token) => ({ headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' } });

const mapItem = (i) => ({ Id: i.id, id: i.id, ...i.fields });

export const getMyEnrollments = async (token, userEmail) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items?$expand=fields&$filter=fields/EmployeeID eq '${userEmail}'&$top=1000`,
      g(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) { console.error('Error fetching enrollments:', e?.response?.data || e.message); return []; }
};

export const getCourses = async (token) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Courses/items?$expand=fields&$top=1000`,
      g(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) { console.error('Error fetching courses:', e?.response?.data || e.message); return []; }
};

export const getAllEnrollments = async (token) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items?$expand=fields&$top=5000`,
      g(token)
    );
    return (res.data.value || []).map(mapItem);
  } catch (e) { console.error('Error fetching all enrollments:', e?.response?.data || e.message); return []; }
};

export const updateEnrollmentStatus = async (token, enrollmentId, status) => {
  try {
    const siteId = await getSiteId(token);
    await axios.patch(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items/${enrollmentId}`,
      { fields: { Status: status } },
      g(token)
    );
  } catch (e) { console.error('Error updating enrollment:', e?.response?.data || e.message); throw e; }
};

export const enrollEmployee = async (token, data) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.post(
      `${GRAPH}/sites/${siteId}/lists/Employee%20Enrollments/items`,
      { fields: data },
      g(token)
    );
    return res.data;
  } catch (e) { console.error('Error enrolling employee:', e?.response?.data || e.message); throw e; }
};

export const createCourse = async (token, data) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.post(
      `${GRAPH}/sites/${siteId}/lists/Courses/items`,
      { fields: data },
      g(token)
    );
    return res.data;
  } catch (e) { console.error('Error creating course:', e?.response?.data || e.message); throw e; }
};

export const getUserRole = async (token, userEmail) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/UserRoles/items?$expand=fields&$top=100`,
      g(token)
    );
    const items = res.data.value || [];
    const match = items.find(i => (i.fields?.Title || '').toLowerCase() === userEmail.toLowerCase());
    return match ? (match.fields?.Role || 'Employee') : 'Employee';
  } catch (e) { console.error('Error fetching user role:', e?.response?.data || e.message); return 'Employee'; }
};

export const getCourseDetails = async (token, courseId) => {
  try {
    const siteId = await getSiteId(token);
    const res = await axios.get(
      `${GRAPH}/sites/${siteId}/lists/Courses/items/${courseId}?$expand=fields`,
      g(token)
    );
    return mapItem(res.data);
  } catch (e) { console.error('Error fetching course details:', e?.response?.data || e.message); return null; }
};
