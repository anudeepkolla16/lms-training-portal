import axios from 'axios';

// Use backend proxy to avoid CORS issues
const callProxy = async (accessToken, endpoint, method = 'GET', data = null) => {
  const baseUrl = window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : '';

  const response = await axios.post(`${baseUrl}/api/proxy`, {
    token: accessToken,
    endpoint,
    method,
    data
  });
  return response.data;
};

// Get employee's enrollments
export const getMyEnrollments = async (accessToken, userEmail) => {
  try {
    const encodedEmail = encodeURIComponent(userEmail);
    const data = await callProxy(
      accessToken,
      `/_api/web/lists/getbytitle('Employee Enrollments')/items?$filter=EmployeeID eq '${encodedEmail}'&$top=1000`
    );
    return data.value || [];
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return [];
  }
};

// Get all courses
export const getCourses = async (accessToken) => {
  try {
    const data = await callProxy(
      accessToken,
      `/_api/web/lists/getbytitle('Courses')/items?$top=1000`
    );
    return data.value || [];
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
};

// Get all enrollments (Admin/HR)
export const getAllEnrollments = async (accessToken) => {
  try {
    const data = await callProxy(
      accessToken,
      `/_api/web/lists/getbytitle('Employee Enrollments')/items?$top=5000`
    );
    return data.value || [];
  } catch (error) {
    console.error('Error fetching all enrollments:', error);
    return [];
  }
};

// Update enrollment status
export const updateEnrollmentStatus = async (accessToken, enrollmentId, status) => {
  try {
    const digestData = await callProxy(accessToken, `/_api/contextinfo`, 'POST');
    const digest = digestData.FormDigestValue;

    const data = await callProxy(
      accessToken,
      `/_api/web/lists/getbytitle('Employee Enrollments')/items(${enrollmentId})`,
      'PATCH',
      { Status: status }
    );
    return data;
  } catch (error) {
    console.error('Error updating enrollment:', error);
    throw error;
  }
};

// Enroll an employee
export const enrollEmployee = async (accessToken, enrollmentData) => {
  try {
    const digestData = await callProxy(accessToken, `/_api/contextinfo`, 'POST');
    const digest = digestData.FormDigestValue;

    const data = await callProxy(
      accessToken,
      `/_api/web/lists/getbytitle('Employee Enrollments')/items`,
      'POST',
      { ...enrollmentData, __metadata: { type: "SP.Data.Employee_x0020_EnrollmentsListItem" } }
    );
    return data;
  } catch (error) {
    console.error('Error enrolling employee:', error);
    throw error;
  }
};

// Create a course
export const createCourse = async (accessToken, courseData) => {
  try {
    const digestData = await callProxy(accessToken, `/_api/contextinfo`, 'POST');
    const digest = digestData.FormDigestValue;

    const data = await callProxy(
      accessToken,
      `/_api/web/lists/getbytitle('Courses')/items`,
      'POST',
      { ...courseData, __metadata: { type: "SP.Data.CoursesListItem" } }
    );
    return data;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

// Get user role from UserRoles list
export const getUserRole = async (accessToken, userEmail) => {
  try {
    const lowerEmail = userEmail.toLowerCase();
    const data = await callProxy(
      accessToken,
      `/_api/web/lists/getbytitle('UserRoles')/items?$top=100`
    );
    const items = data.value || [];
    const match = items.find(item =>
      (item.Title || '').toLowerCase() === lowerEmail
    );
    return match ? (match.Role || 'Employee') : 'Employee';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'Employee';
  }
};

// Get course details
export const getCourseDetails = async (accessToken, courseId) => {
  try {
    const data = await callProxy(
      accessToken,
      `/_api/web/lists/getbytitle('Courses')/items(${courseId})`
    );
    return data;
  } catch (error) {
    console.error('Error fetching course details:', error);
    return null;
  }
};
