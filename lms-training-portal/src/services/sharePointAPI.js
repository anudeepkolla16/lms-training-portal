import axios from 'axios';

const SHAREPOINT_SITE = process.env.REACT_APP_SHAREPOINT_SITE || 'https://sarasanalytics.sharepoint.com/sites/training-library';

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

// Update enrollment status (mark complete)
export const updateEnrollmentStatus = async (accessToken, enrollmentId, status) => {
  try {
    const response = await axios.post(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('Employee Enrollments')/items(${enrollmentId})`,
      { Status: status },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-HTTP-Method': 'MERGE',
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

// Get user role from UserRoles list
export const getUserRole = async (accessToken, userEmail) => {
  try {
    const encodedEmail = encodeURIComponent(userEmail);
    const response = await axios.get(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('UserRoles')/items?$filter=Title eq '${encodedEmail}'&$top=1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    const items = response.data.value || [];
    return items.length > 0 ? (items[0].Role || 'Employee') : 'Employee';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'Employee';
  }
};

// Get all enrollments (admin/HR use)
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

// Enroll an employee (POST to Employee Enrollments list)
export const enrollEmployee = async (accessToken, enrollmentData) => {
  try {
    // Get request digest
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
    const requestDigest = digestResponse.data.FormDigestValue;

    const response = await axios.post(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('Employee Enrollments')/items`,
      {
        __metadata: { type: "SP.Data.Employee_x0020_EnrollmentsListItem" },
        ...enrollmentData
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json;odata=verbose',
          'X-RequestDigest': requestDigest
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error enrolling employee:', error);
    throw error;
  }
};

// Create a new course (POST to Courses list)
export const createCourse = async (accessToken, courseData) => {
  try {
    // Get request digest
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
    const requestDigest = digestResponse.data.FormDigestValue;

    const response = await axios.post(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('Courses')/items`,
      {
        __metadata: { type: "SP.Data.CoursesListItem" },
        ...courseData
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json;odata=verbose',
          'X-RequestDigest': requestDigest
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};
