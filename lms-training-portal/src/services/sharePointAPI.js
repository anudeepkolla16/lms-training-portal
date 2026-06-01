import axios from 'axios';

const SHAREPOINT_SITE = process.env.REACT_APP_SHAREPOINT_SITE;

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
    // Get item with digest
    const itemResponse = await axios.get(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('Employee Enrollments')/items(${enrollmentId})`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

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
