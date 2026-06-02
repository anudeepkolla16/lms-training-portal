import axios from 'axios';

const callProxy = async (token, endpoint, method = 'GET', data = null) => {
  const res = await axios.post('/api/proxy', { token, endpoint, method, data });
  return res.data;
};

export const getMyEnrollments = async (token, userEmail) => {
  try {
    const email = encodeURIComponent(userEmail);
    const res = await callProxy(token, `/_api/web/lists/getbytitle('Employee Enrollments')/items?$filter=EmployeeID eq '${email}'&$top=1000`);
    return res.d?.results || res.value || [];
  } catch (e) { console.error('getMyEnrollments error:', e?.response?.data || e.message); return []; }
};

export const getCourses = async (token) => {
  try {
    const res = await callProxy(token, `/_api/web/lists/getbytitle('Courses')/items?$top=1000`);
    return res.d?.results || res.value || [];
  } catch (e) { console.error('getCourses error:', e?.response?.data || e.message); return []; }
};

export const getAllEnrollments = async (token) => {
  try {
    const res = await callProxy(token, `/_api/web/lists/getbytitle('Employee Enrollments')/items?$top=5000`);
    return res.d?.results || res.value || [];
  } catch (e) { console.error('getAllEnrollments error:', e?.response?.data || e.message); return []; }
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
  } catch (e) { console.error('getUserRole error:', e?.response?.data || e.message); return 'Employee'; }
};

export const getCourseDetails = async (token, courseId) => {
  try {
    return await callProxy(token, `/_api/web/lists/getbytitle('Courses')/items(${courseId})`);
  } catch (e) { console.error('getCourseDetails error:', e?.response?.data || e.message); return null; }
};
