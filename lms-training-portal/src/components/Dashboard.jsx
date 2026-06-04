import React, { useState, useEffect, useRef } from 'react';
import { getMyEnrollments, getCourses, updateEnrollmentStatus, getMyAssessments, autoAssignMandatory, updateAssessment, matchesCsv, isTruthy } from '../services/sharePointAPI';
import QuizModal from './QuizModal';
import SelfAssessmentModal from './SelfAssessmentModal';
import CourseCatalog from './CourseCatalog';

const Dashboard = ({ accessToken, user, userProfile }) => {
  const [enrollments, setEnrollments] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showPDF, setShowPDF] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizCourse, setQuizCourse] = useState(null);
  const [remediationMode, setRemediationMode] = useState(false);
  const [assessCourse, setAssessCourse] = useState(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readCourses, setReadCourses] = useState(new Set());
  const autoAssignDone = useRef(false);

  const markAsRead = (courseId) => setReadCourses(prev => new Set([...prev, courseId]));

  const userEmail = user.username || user.mail || user.idTokenClaims?.preferred_username || '';
  const userName = user.givenName || user.name || user.username?.split('@')[0] || 'there';

  const mergeEnrollments = (enrollData, courseData) => enrollData.map(e => {
    const match = courseData.find(c => c.Title?.toLowerCase() === e.Title?.toLowerCase());
    return match ? { ...e, CourseMaterials: e.CourseMaterials || match.CourseMaterials, Duration: e.Duration || match.Duration, JobRoles: match.JobRoles, Departments: match.Departments, Mandatory: match.Mandatory } : e;
  });

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        let [enrollData, courseData, assessData] = await Promise.all([
          getMyEnrollments(accessToken, userEmail),
          getCourses(accessToken),
          getMyAssessments(accessToken, userEmail),
        ]);
        // Auto-assign mandatory role/JD courses once per session, then refresh enrollments
        if (!autoAssignDone.current) {
          autoAssignDone.current = true;
          const created = await autoAssignMandatory(accessToken, userEmail, userProfile, courseData, enrollData);
          if (created > 0) enrollData = await getMyEnrollments(accessToken, userEmail);
        }
        setEnrollments(mergeEnrollments(enrollData, courseData));
        setAssessments(assessData);
      } catch (err) {
        setError('Failed to load courses. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [accessToken, userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = async () => {
    try {
      const [enrollData, courseData, assessData] = await Promise.all([
        getMyEnrollments(accessToken, userEmail),
        getCourses(accessToken),
        getMyAssessments(accessToken, userEmail),
      ]);
      setEnrollments(mergeEnrollments(enrollData, courseData));
      setAssessments(assessData);
    } catch (err) { console.error(err); }
  };

  const assessmentFor = (title) => {
    const matches = assessments
      .filter(a => (a.Title || '').toLowerCase() === (title || '').toLowerCase())
      .sort((a, b) => new Date(a.AssessmentDate || a.ReviewDate || 0) - new Date(b.AssessmentDate || b.ReviewDate || 0));
    return matches.length ? matches[matches.length - 1] : null;
  };

  const handleMarkComplete = async (enrollmentId) => {
    try {
      await updateEnrollmentStatus(accessToken, enrollmentId, 'Completed');
      await reload();
      setSelectedCourse(prev => prev ? { ...prev, Status: 'Completed' } : null);
    } catch (err) {
      setError('Failed to update. Please try again.');
    }
  };

  const handleStartQuiz = (course, isRemediation = false) => {
    setQuizCourse(course);
    setRemediationMode(isRemediation);
    setShowQuiz(true);
    setShowPDF(false);
    setSelectedCourse(null);
  };

  const handleQuizComplete = async (passed) => {
    setShowQuiz(false);
    if (passed && quizCourse) {
      if (remediationMode) {
        const a = assessmentFor(quizCourse.Title);
        if (a?.Id) await updateAssessment(accessToken, a.Id, { AssessmentState: 'RemediationQuizPassed' });
        await handleMarkComplete(quizCourse.Id);
      } else {
        await handleMarkComplete(quizCourse.Id);
      }
    }
    setRemediationMode(false);
    setQuizCourse(null);
  };

  const handleAssessmentSubmitted = async (nextState) => {
    const course = assessCourse;
    setAssessCourse(null);
    // A low rating reopens the course (no longer "Completed") and sends them into redo + quiz
    if (nextState === 'Remediation' && course?.Id) {
      try { await updateEnrollmentStatus(accessToken, course.Id, 'In Progress'); } catch (e) { /* non-blocking */ }
    }
    await reload();
    if (nextState === 'Remediation' && course) {
      setSelectedCourse({ ...course, Status: 'In Progress' });
      setShowPDF(!!course.CourseMaterials);
    }
  };

  const completedCount = enrollments.filter(e => e.Status === 'Completed').length;
  const activeCount = enrollments.filter(e => e.Status === 'Active' || e.Status === 'In Progress').length;
  const completionRate = enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0;
  const enrolledTitles = new Set(enrollments.map(e => (e.Title || '').toLowerCase()));

  const statusColor = (s) => s === 'Completed' ? '#10b981' : s === 'Active' ? '#3b82f6' : '#f59e0b';
  const statusBg = (s) => s === 'Completed' ? '#d1fae5' : s === 'Active' ? '#dbeafe' : '#fef3c7';
  const statusText = (s) => s === 'Completed' ? '#065f46' : s === 'Active' ? '#1e40af' : '#92400e';

  const assessmentBadge = (a) => {
    if (!a) return null;
    const map = {
      PendingManagerReview: { bg: '#dbeafe', color: '#1e40af', text: '⏳ Pending Manager Review' },
      Approved: { bg: '#d1fae5', color: '#065f46', text: `✅ Approved ⭐${a.ManagerRating || a.SelfRating}` },
      Remediation: { bg: '#fee2e2', color: '#991b1b', text: '🔁 Remediation Required' },
      RemediationQuizPassed: { bg: '#d1fae5', color: '#065f46', text: '✅ Remediation Complete' },
    };
    const s = map[a.AssessmentState];
    if (!s) return null;
    return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>{s.text}</span>;
  };

  if (showCatalog) {
    return (
      <CourseCatalog
        accessToken={accessToken}
        userEmail={userEmail}
        userProfile={userProfile}
        enrolledTitles={enrolledTitles}
        onEnrolled={reload}
        onBack={() => setShowCatalog(false)}
      />
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px', background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '26px', fontWeight: '700' }}>
            Welcome back, {userName}! 👋
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Your training progress and assigned courses
            {userProfile?.jobRole && <span style={{ marginLeft: '8px', color: '#8b5cf6', fontWeight: '600' }}>· {userProfile.jobRole}</span>}
          </p>
        </div>
        <button onClick={() => setShowCatalog(true)} style={{
          background: '#8b5cf6', color: 'white', padding: '10px 18px', borderRadius: '8px',
          border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600'
        }}>📚 Browse All Courses</button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '14px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Courses Assigned', value: enrollments.length, color: '#3b82f6', icon: '📚' },
          { label: 'Completed', value: completedCount, color: '#10b981', icon: '✅' },
          { label: 'In Progress', value: activeCount, color: '#f59e0b', icon: '⏳' },
          { label: 'Completion Rate', value: `${completionRate}%`, color: '#8b5cf6', icon: '📊' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${s.color}`
          }}>
            <p style={{ margin: '0 0 6px', color: '#6b7280', fontSize: '13px' }}>{s.icon} {s.label}</p>
            <h3 style={{ margin: 0, color: s.color, fontSize: '28px', fontWeight: '700' }}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Course List */}
      <h2 style={{ color: '#1e293b', marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>My Courses</h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', background: 'white', borderRadius: '12px' }}>
          Loading your courses...
        </div>
      ) : enrollments.length === 0 ? (
        <div style={{ background: 'white', padding: '48px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <p style={{ fontSize: '16px', margin: '0 0 6px' }}>No courses assigned yet.</p>
          <p style={{ fontSize: '13px', margin: 0 }}>Browse all courses above to enrol yourself, or contact your manager.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {enrollments.map(e => {
            const a = assessmentFor(e.Title);
            const recommended = matchesCsv(e.JobRoles, userProfile?.jobRole) || matchesCsv(e.Departments, userProfile?.department);
            const needsRemediation = a?.AssessmentState === 'Remediation';
            const canSelfAssess = e.Status === 'Completed' && (!a || a.AssessmentState === 'RemediationQuizPassed');
            return (
            <div key={e.Id} style={{
              background: 'white', borderRadius: '12px', padding: '20px 24px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
              borderLeft: `4px solid ${statusColor(e.Status)}`
            }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '16px', fontWeight: '600' }}>{e.Title}</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    background: statusBg(e.Status), color: statusText(e.Status),
                    padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                  }}>{e.Status || 'Not Started'}</span>
                  {isTruthy(e.Mandatory) && recommended && <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>🔒 Mandatory</span>}
                  {assessmentBadge(a)}
                  {e.Department && <span style={{ color: '#64748b', fontSize: '13px' }}>🏢 {e.Department}</span>}
                  {e.Duration && <span style={{ color: '#64748b', fontSize: '13px' }}>⏱ {e.Duration}</span>}
                  {e.DueDate && <span style={{ color: new Date(e.DueDate) < new Date() && e.Status !== 'Completed' ? '#ef4444' : '#64748b', fontSize: '13px' }}>
                    📅 Due: {new Date(e.DueDate).toLocaleDateString()}
                  </span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
                {e.CourseMaterials && (
                  <button onClick={() => { markAsRead(e.Id); setSelectedCourse(e); setShowPDF(true); }} style={{
                    background: '#3b82f6', color: 'white', padding: '9px 16px',
                    borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                  }}>
                    📖 Read Course
                  </button>
                )}
                {needsRemediation && (
                  <button onClick={() => { markAsRead(e.Id); if (e.CourseMaterials) { setSelectedCourse(e); setShowPDF(true); } else { handleStartQuiz(e, true); } }} style={{
                    background: '#ef4444', color: 'white', padding: '9px 16px',
                    borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                  }}>
                    🔁 Redo & Take Quiz
                  </button>
                )}
                {canSelfAssess && (
                  <button onClick={() => setAssessCourse(e)} style={{
                    background: '#8b5cf6', color: 'white', padding: '9px 16px',
                    borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                  }}>
                    ⭐ Self-Assess
                  </button>
                )}
                <button onClick={() => { setSelectedCourse(e); setShowPDF(false); }} style={{
                  background: '#f1f5f9', color: '#334155', padding: '9px 16px',
                  borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                }}>
                  Details
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* PDF READER MODAL - Full Screen */}
      {selectedCourse && showPDF && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 2000, display: 'flex', flexDirection: 'column'
        }}>
          {/* PDF Toolbar */}
          <div style={{
            background: '#1e293b', padding: '14px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
          }}>
            <div>
              <span style={{ color: 'white', fontWeight: '700', fontSize: '16px' }}>📖 {selectedCourse.Title}</span>
              {selectedCourse.Duration && <span style={{ color: '#94a3b8', fontSize: '13px', marginLeft: '12px' }}>⏱ {selectedCourse.Duration}</span>}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <a href={selectedCourse.CourseMaterials} target="_blank" rel="noopener noreferrer"
                style={{ background: '#3b82f6', color: 'white', padding: '8px 14px', borderRadius: '7px', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
                ↗ Open in new tab
              </a>
              {!readCourses.has(selectedCourse.Id) && (
                <button onClick={() => { markAsRead(selectedCourse.Id); setShowPDF(false); }}
                  style={{ background: '#10b981', color: 'white', padding: '8px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  ✅ I've Read It
                </button>
              )}
              {(() => {
                const a = assessmentFor(selectedCourse.Title);
                const isRemediation = a?.AssessmentState === 'Remediation';
                if (selectedCourse.Status === 'Completed' && !isRemediation) {
                  return <span style={{ background: '#d1fae5', color: '#065f46', padding: '8px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: '600' }}>✅ Completed</span>;
                }
                return (
                  <button onClick={() => handleStartQuiz(selectedCourse, isRemediation)}
                    style={{ background: '#8b5cf6', color: 'white', padding: '8px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    🎯 {isRemediation ? 'Take Quiz (Remediation)' : 'Take Quiz & Complete'}
                  </button>
                );
              })()}
              <button onClick={() => { setShowPDF(false); setSelectedCourse(null); }}
                style={{ background: '#ef4444', color: 'white', padding: '8px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                ✕ Close
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div style={{ flex: 1, background: '#525659', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px' }}>
            <div style={{ fontSize: '80px' }}>📄</div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: 'white', margin: '0 0 8px', fontSize: '20px' }}>{selectedCourse.Title}</h3>
              <p style={{ color: '#94a3b8', margin: '0 0 24px', fontSize: '14px' }}>
                SharePoint PDFs must be opened in a new tab.<br/>Read the material, then come back and take the quiz.
              </p>
              <a href={selectedCourse.CourseMaterials} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', background: '#3b82f6', color: 'white', padding: '14px 28px', borderRadius: '10px', textDecoration: 'none', fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
                📖 Open PDF in New Tab
              </a>
              <br />
              <p style={{ color: '#64748b', fontSize: '13px', margin: '12px 0 0' }}>
                After reading, click <strong style={{ color: '#10b981' }}>"🎯 Take Quiz"</strong> above ↑
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {selectedCourse && !showPDF && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '32px',
            maxWidth: '520px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '20px' }}>{selectedCourse.Title}</h2>
            <span style={{
              background: statusBg(selectedCourse.Status), color: statusText(selectedCourse.Status),
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'inline-block', marginBottom: '20px'
            }}>{selectedCourse.Status || 'Not Started'}</span>

            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              {[
                ['📚 Department', selectedCourse.Department],
                ['⏱ Duration', selectedCourse.Duration],
                ['📅 Due Date', selectedCourse.DueDate ? new Date(selectedCourse.DueDate).toLocaleDateString() : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <p key={label} style={{ margin: '6px 0', color: '#374151', fontSize: '14px' }}>
                  <strong>{label}:</strong> {value}
                </p>
              ))}
            </div>

            {(() => {
              const canTakeQuiz = !selectedCourse.CourseMaterials || readCourses.has(selectedCourse.Id);
              return (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {selectedCourse.CourseMaterials && (
                    <button onClick={() => { markAsRead(selectedCourse.Id); setShowPDF(true); }} style={{
                      background: '#3b82f6', color: 'white', padding: '11px 18px',
                      borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', flex: 1
                    }}>
                      📖 Read Course Material
                    </button>
                  )}
                  {selectedCourse.Status !== 'Completed' && (
                    canTakeQuiz ? (
                      <button onClick={() => handleStartQuiz(selectedCourse)} style={{
                        background: '#8b5cf6', color: 'white', padding: '11px 18px',
                        borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700', flex: 1
                      }}>
                        🎯 Take Quiz & Complete
                      </button>
                    ) : (
                      <button disabled title="Read the course material first" style={{
                        background: '#d1d5db', color: '#9ca3af', padding: '11px 18px',
                        borderRadius: '8px', border: 'none', cursor: 'not-allowed', fontSize: '14px', fontWeight: '700', flex: 1
                      }}>
                        📖 Read material first to unlock quiz
                      </button>
                    )
                  )}
                  <button onClick={() => setSelectedCourse(null)} style={{
                    background: '#f1f5f9', color: '#334155', padding: '11px 18px',
                    borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', width: '100%'
                  }}>
                    Close
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* QUIZ MODAL */}
      {showQuiz && quizCourse && (
        <QuizModal
          course={quizCourse}
          userEmail={userEmail}
          accessToken={accessToken}
          onClose={() => { setShowQuiz(false); setQuizCourse(null); setRemediationMode(false); }}
          onComplete={handleQuizComplete}
        />
      )}

      {/* SELF-ASSESSMENT MODAL */}
      {assessCourse && (
        <SelfAssessmentModal
          course={assessCourse}
          userEmail={userEmail}
          managerEmail={userProfile?.managerEmail}
          accessToken={accessToken}
          existingAssessment={assessmentFor(assessCourse.Title)}
          onClose={() => setAssessCourse(null)}
          onSubmitted={handleAssessmentSubmitted}
        />
      )}
    </div>
  );
};

export default Dashboard;
