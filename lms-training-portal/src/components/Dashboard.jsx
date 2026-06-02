import React, { useState, useEffect } from 'react';
import { getMyEnrollments, updateEnrollmentStatus } from '../services/sharePointAPI';
import CourseCard from './CourseCard';

const Dashboard = ({ accessToken, user }) => {
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadEnrollments();
  }, []);

  const loadEnrollments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyEnrollments(accessToken, user.mail);
      setEnrollments(data);
    } catch (err) {
      setError('Failed to load enrollments. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (enrollmentId) => {
    setUpdating(true);
    try {
      await updateEnrollmentStatus(accessToken, enrollmentId, 'Completed');
      await loadEnrollments();
      setSelectedCourse(null);
    } catch (err) {
      setError('Failed to update course status. Please try again.');
      console.error('Error:', err);
    } finally {
      setUpdating(false);
    }
  };

  const completedCount = enrollments.filter(e => e.Status === 'Completed').length;
  const activeCount = enrollments.filter(e => e.Status === 'Active').length;
  const completionRate = enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '32px' }}>
          Welcome, {user.givenName}! 👋
        </h1>
        <p style={{ margin: '0', color: '#6b7280' }}>
          Your training progress and assigned courses
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <StatCard label="Courses Assigned" value={enrollments.length} color="#3b82f6" icon="📚" />
        <StatCard label="Completed" value={completedCount} color="#10b981" icon="✓" />
        <StatCard label="In Progress" value={activeCount} color="#f59e0b" icon="⏳" />
        <StatCard label="Completion Rate" value={`${completionRate}%`} color="#8b5cf6" icon="📊" />
      </div>

      {/* Courses List */}
      <div>
        <h2 style={{ color: '#1f2937', marginBottom: '20px' }}>My Courses</h2>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#6b7280'
          }}>
            <p>Loading your courses...</p>
          </div>
        ) : enrollments.length > 0 ? (
          <div>
            {enrollments.map(enrollment => (
              <CourseCard
                key={enrollment.Id}
                course={enrollment}
                onViewDetails={setSelectedCourse}
              />
            ))}
          </div>
        ) : (
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <p style={{ fontSize: '16px' }}>No courses assigned yet.</p>
            <p style={{ fontSize: '14px' }}>Check back later or contact your manager!</p>
          </div>
        )}
      </div>

      {/* Course Details Modal */}
      {selectedCourse && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
              {selectedCourse.Title}
            </h2>

            {/* Status Badge */}
            <div style={{
              display: 'inline-block',
              background: getStatusColor(selectedCourse.Status),
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '20px'
            }}>
              {selectedCourse.Status}
            </div>

            <p style={{ color: '#6b7280', lineHeight: '1.6', marginBottom: '20px' }}>
              {selectedCourse.Description || 'No description available'}
            </p>

            {/* Course Details */}
            <div style={{ background: '#f3f4f6', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              {selectedCourse.Duration && (
                <p style={{ margin: '8px 0', color: '#374151' }}>
                  <strong>Duration:</strong> {selectedCourse.Duration}
                </p>
              )}
              {selectedCourse.Department && (
                <p style={{ margin: '8px 0', color: '#374151' }}>
                  <strong>Department:</strong> {selectedCourse.Department}
                </p>
              )}
              {selectedCourse.Status && (
                <p style={{ margin: '8px 0', color: '#374151' }}>
                  <strong>Status:</strong> {selectedCourse.Status}
                </p>
              )}
              {selectedCourse.DueDate && (
                <p style={{ margin: '8px 0', color: '#374151' }}>
                  <strong>Due Date:</strong> {new Date(selectedCourse.DueDate).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {selectedCourse.CourseMaterials && (
                <a href={selectedCourse.CourseMaterials} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    background: '#3b82f6',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'background 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                  onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
                >
                  📄 Access Materials
                </a>
              )}

              {selectedCourse.Status !== 'Completed' && (
                <button
                  onClick={() => handleMarkComplete(selectedCourse.Id)}
                  disabled={updating}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    opacity: updating ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => !updating && (e.target.style.background = '#059669')}
                  onMouseLeave={(e) => !updating && (e.target.style.background = '#10b981')}
                >
                  {updating ? '⏳ Updating...' : '✓ Mark Complete'}
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedCourse(null)}
              style={{
                display: 'block',
                background: '#e5e7eb',
                color: '#1f2937',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                fontWeight: '600',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#d1d5db'}
              onMouseLeave={(e) => e.target.style.background = '#e5e7eb'}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color, icon }) => (
  <div style={{
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderLeft: `4px solid ${color}`,
    transition: 'transform 0.2s'
  }}
  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
      {icon} {label}
    </p>
    <h3 style={{ margin: '0', color, fontSize: '32px', fontWeight: 'bold' }}>
      {value}
    </h3>
  </div>
);

const getStatusColor = (status) => {
  switch(status) {
    case 'Completed': return '#10b981';
    case 'Active': return '#3b82f6';
    case 'Not Started': return '#ef4444';
    default: return '#6b7280';
  }
};

export default Dashboard;
