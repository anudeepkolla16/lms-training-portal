import axios from 'axios';

const callProxy = async (accessToken, endpoint, method = 'GET', data = null) => {
  const response = await axios.post(`/api/proxy`, {
    token: accessToken,
    endpoint,
    method,
    data
  });
  return response.data;
};

export const getMyEnrollments = async (accessToken, userEmail) => {
  try {
    const encodedEmail = encodeURIComponent(userEmail);
    const res = await callProxy(accessToken, `/_api/web/lists/getbytitle('Employee Enrollments')/items?$filter=EmployeeID eq '${encodedEmail}'&$top=1000`);
    return res.value || [];
  } catch (e) { console.error('Error fetching enrollments:', e); return []; }
};

export const getCourses = async (accessToken) => {
  try {
    const res = await callProxy(accessToken, `/_api/web/lists/getbytitle('Courses')/items?$top=1000`);
    return res.value || [];
  } catch (e) { console.error('Error fetching courses:', e); return []; }
};

export const getAllEnrollments = async (accessToken) => {
  try {
    const res = await callProxy(accessToken, `/_api/web/lists/getbytitle('Employee Enrollments')/items?$top=5000`);
    return res.value || [];
  } catch (e) { console.error('Error fetching all enrollments:', e); return []; }
};

export const updateEnrollmentStatus = async (accessToken, enrollmentId, status) => {
  try {
    await callProxy(accessToken, `/_api/web/lists/getbytitle('Employee Enrollments')/items(${enrollmentId})`, 'PATCH', { Status: status });
  } catch (e) { console.error('Error updating enrollment:', e); throw e; }
};

export const enrollEmployee = async (accessToken, enrollmentData) => {
  try {
    return await callProxy(accessToken, `/_api/web/lists/getbytitle('Employee Enrollments')/items`, 'POST', enrollmentData);
  } catch (e) { console.error('Error enrolling employee:', e); throw e; }
};

export const createCourse = async (accessToken, courseData) => {
  try {
    return await callProxy(accessToken, `/_api/web/lists/getbytitle('Courses')/items`, 'POST', courseData);
  } catch (e) { console.error('Error creating course:', e); throw e; }
};

export const getUserRole = async (accessToken, userEmail) => {
  try {
    const lowerEmail = userEmail.toLowerCase();
    const res = await callProxy(accessToken, `/_api/web/lists/getbytitle('UserRoles')/items?$top=100`);
    const items = res.value || [];
    const match = items.find(i => (i.Title || '').toLowerCase() === lowerEmail);
    return match ? (match.Role || 'Employee') : 'Employee';
  } catch (e) { console.error('Error fetching user role:', e); return 'Employee'; }
};

export const getCourseDetails = async (accessToken, courseId) => {
  try {
    return await callProxy(accessToken, `/_api/web/lists/getbytitle('Courses')/items(${courseId})`);
  } catch (e) { console.error('Error fetching course details:', e); return null; }
};
