import axios from 'axios';

const SHAREPOINT_SITE = 'https://sarasanalytics.sharepoint.com/sites/training-library';

// Get employee's enrollments
export const getMyEnrollments = async (accessToken, userEmail) => {
  try {
    const encodedEmail = encodeURIComponent(userEmail);
    const response = await axios.get(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('Employee Enrollments')/items?$filter=EmployeeID eq '${encodedEmail}'&$top=1000`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    return response.data.value || [];
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return [];
  }
};

// Get all courses
export const getCourses = async (accessToken) => {
  try {
    const response = await axios.get(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('Courses')/items?$top=1000`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    return response.data.value || [];
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
};

// Get all enrollments (Admin/HR)
export const getAllEnrollments = async (accessToken) => {
  try {
    const response = await axios.get(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('Employee Enrollments')/items?$top=5000`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    return response.data.value || [];
  } catch (error) {
    console.error('Error fetching all enrollments:', error);
    return [];
  }
};

// Update enrollment status
export const updateEnrollmentStatus = async (accessToken, enrollmentId, status) => {
  try {
    const digestResponse = await axios.post(
      `${SHAREPOINT_SITE}/_api/contextinfo`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    const digest = digestResponse.data.FormDigestValue;

    const response = await axios.patch(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('Employee Enrollments')/items(${enrollmentId})`,
      { Status: status },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-RequestDigest': digest,
          'If-Match': '*'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating enrollment:', error);
    throw error;
  }
};

// Enroll an employee
export const enrollEmployee = async (accessToken, enrollmentData) => {
  try {
    const digestResponse = await axios.post(
      `${SHAREPOINT_SITE}/_api/contextinfo`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    const digest = digestResponse.data.FormDigestValue;

    const response = await axios.post(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('Employee Enrollments')/items`,
      enrollmentData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-RequestDigest': digest
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error enrolling employee:', error);
    throw error;
  }
};

// Create a course
export const createCourse = async (accessToken, courseData) => {
  try {
    const digestResponse = await axios.post(
      `${SHAREPOINT_SITE}/_api/contextinfo`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    const digest = digestResponse.data.FormDigestValue;

    const response = await axios.post(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('Courses')/items`,
      courseData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-RequestDigest': digest
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

// Get user role from UserRoles list
export const getUserRole = async (accessToken, userEmail) => {
  try {
    const lowerEmail = userEmail.toLowerCase();
    const response = await axios.get(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('UserRoles')/items?$top=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    const items = response.data.value || [];

    // Find matching email case-insensitively
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
    const response = await axios.get(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('Courses')/items(${courseId})`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching course details:', error);
    return null;
  }
};
