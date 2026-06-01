import React from 'react';

const CourseCard = ({ course, onViewDetails }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return '#10b981';
      case 'Active': return '#3b82f6';
      case 'Not Started': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getProgressPercentage = (status) => {
    switch(status) {
      case 'Completed': return 100;
      case 'Active': return 50;
      default: return 0;
    }
  };

  const dueDate = new Date(course.DueDate);
  const today = new Date();
  const isOverdue = dueDate < today && course.Status !== 'Completed';

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      border: isOverdue ? '2px solid #ef4444' : 'none'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    }}
    onClick={() => onViewDetails(course)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
            {course.Title}
          </h3>
          <p style={{ margin: '0 0 12px 0', color: '#6b7280', fontSize: '14px' }}>
            Department: {course.Department || 'Not specified'}
          </p>
        </div>
        <span style={{
          background: getStatusColor(course.Status),
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          marginLeft: '12px'
        }}>
          {course.Status}
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{ marginTop: '12px' }}>
        <div style={{
          background: '#e5e7eb',
          height: '8px',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: getStatusColor(course.Status),
            height: '100%',
            width: `${getProgressPercentage(course.Status)}%`,
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      {/* Due Date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '14px' }}>
        <p style={{ margin: '0', color: '#6b7280' }}>
          Due: {dueDate.toLocaleDateString()}
        </p>
        {isOverdue && (
          <p style={{ margin: '0', color: '#ef4444', fontWeight: 'bold' }}>
            OVERDUE ⚠️
          </p>
        )}
      </div>
    </div>
  );
};

export default CourseCard;
