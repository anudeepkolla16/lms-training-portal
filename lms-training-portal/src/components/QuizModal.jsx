import React, { useState, useEffect, useRef } from 'react';
import { getQuizQuestions, saveQuizResult } from '../services/sharePointAPI';

const QuizModal = ({ course, userEmail, accessToken, onClose, onComplete }) => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return; // run once — onComplete identity changes shouldn't re-trigger/double-complete
    loadedRef.current = true;
    const load = async () => {
      setLoading(true);
      try {
        const qs = await getQuizQuestions(accessToken, course.Title);
        // Shuffle (on a copy) and take up to 10 random questions
        const shuffled = [...qs].sort(() => Math.random() - 0.5).slice(0, 10);
        if (shuffled.length === 0) {
          // No questions — mark complete directly
          onComplete(true);
          return;
        }
        setQuestions(shuffled);
      } catch (e) {
        console.error('Error loading quiz:', e);
        setError('Could not load quiz. Course will be marked complete.');
        setTimeout(() => onComplete(true), 2000);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accessToken, course.Title, onComplete]);

  const handleAnswer = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      setError('Please answer all questions before submitting.');
      return;
    }
    setError('');
    setSaving(true);

    let correct = 0;
    questions.forEach(q => {
      if (answers[q.Id] === q.CorrectAnswer) correct++;
    });

    const total = questions.length;
    const percentage = Math.round((correct / total) * 100);
    const passed = percentage >= 70;

    const quizResult = {
      score: correct,
      total,
      percentage,
      passed,
      answers
    };

    try {
      await saveQuizResult(accessToken, {
        Title: course.Title,
        EmployeeID: userEmail,
        Score: correct,
        TotalQuestions: total,
        Percentage: percentage,
        PassFail: passed ? 'Pass' : 'Fail',
      });
    } catch (e) {
      console.error('Error saving result:', e);
    }

    setResult(quizResult);
    setSubmitted(true);
    setSaving(false);

    if (passed) {
      setTimeout(() => onComplete(true), 3000);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setResult(null);
    setCurrent(0);
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
  };

  if (loading) return (
    <Overlay>
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <h3 style={{ color: '#1e293b' }}>Loading Quiz...</h3>
          <p style={{ color: '#64748b' }}>Preparing questions for {course.Title}</p>
        </div>
      </Card>
    </Overlay>
  );

  if (error && questions.length === 0) return (
    <Overlay>
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>ℹ️</div>
          <p style={{ color: '#64748b' }}>{error}</p>
        </div>
      </Card>
    </Overlay>
  );

  // Results Screen
  if (submitted && result) return (
    <Overlay>
      <Card style={{ maxWidth: '500px' }}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>
            {result.passed ? '🎉' : '😔'}
          </div>
          <h2 style={{ color: result.passed ? '#10b981' : '#ef4444', margin: '0 0 8px', fontSize: '24px' }}>
            {result.passed ? 'Congratulations! You Passed!' : 'Better luck next time!'}
          </h2>
          <p style={{ color: '#64748b', margin: '0 0 24px' }}>{course.Title}</p>

          {/* Score Circle */}
          <div style={{
            width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 24px',
            background: result.passed ? '#d1fae5' : '#fee2e2',
            border: `6px solid ${result.passed ? '#10b981' : '#ef4444'}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: result.passed ? '#10b981' : '#ef4444' }}>
              {result.percentage}%
            </span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Score</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <ScoreStat label="Correct" value={result.score} color="#10b981" />
            <ScoreStat label="Wrong" value={result.total - result.score} color="#ef4444" />
            <ScoreStat label="Total" value={result.total} color="#3b82f6" />
          </div>

          <div style={{
            background: result.passed ? '#d1fae5' : '#fef3c7', padding: '12px 16px',
            borderRadius: '8px', marginBottom: '24px', fontSize: '14px',
            color: result.passed ? '#065f46' : '#92400e'
          }}>
            {result.passed
              ? '✅ Course marked as Complete! Great work!'
              : '⚠️ You need 70% to pass. Review the material and try again.'}
          </div>

          {/* Answer Review */}
          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <h4 style={{ color: '#1e293b', marginBottom: '12px' }}>Answer Review:</h4>
            {questions.map((q, i) => {
              const correct = answers[q.Id] === q.CorrectAnswer;
              return (
                <div key={q.Id} style={{
                  padding: '10px 12px', borderRadius: '8px', marginBottom: '8px',
                  background: correct ? '#d1fae5' : '#fee2e2',
                  borderLeft: `4px solid ${correct ? '#10b981' : '#ef4444'}`
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                    {i + 1}. {q.Title}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#374151' }}>
                    Your answer: <strong>{answers[q.Id]}</strong>
                    {!correct && <span style={{ color: '#10b981', marginLeft: '12px' }}>✓ Correct: {q.CorrectAnswer}</span>}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {!result.passed && (
              <button onClick={handleRetry} style={{
                flex: 1, background: '#3b82f6', color: 'white', padding: '12px',
                borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600'
              }}>
                🔄 Retry Quiz
              </button>
            )}
            <button onClick={() => result.passed ? onComplete(true) : onClose()} style={{
              flex: 1, background: result.passed ? '#10b981' : '#6b7280', color: 'white', padding: '12px',
              borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600'
            }}>
              {result.passed ? '🎓 Finish' : 'Close'}
            </button>
          </div>
        </div>
      </Card>
    </Overlay>
  );

  const q = questions[current];
  const options = [
    { key: 'A', text: q?.OptionA },
    { key: 'B', text: q?.OptionB },
    { key: 'C', text: q?.OptionC },
    { key: 'D', text: q?.OptionD },
  ].filter(o => o.text);

  return (
    <Overlay>
      <Card style={{ maxWidth: '620px' }}>
        {/* Quiz Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>📝 {course.Title} — Quiz</h3>
            <span style={{ color: '#64748b', fontSize: '13px' }}>{current + 1} / {questions.length}</span>
          </div>
          {/* Progress Bar */}
          <div style={{ background: '#e2e8f0', borderRadius: '99px', height: '6px' }}>
            <div style={{
              width: `${((current + 1) / questions.length) * 100}%`,
              height: '100%', background: '#3b82f6', borderRadius: '99px',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>

        {/* Question */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: '#0f172a', fontSize: '18px', lineHeight: '1.5', margin: '0 0 20px' }}>
            {current + 1}. {q?.Title}
          </h2>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {options.map(opt => {
              const selected = answers[q.Id] === opt.key;
              return (
                <button key={opt.key} onClick={() => handleAnswer(q.Id, opt.key)} style={{
                  padding: '14px 18px', borderRadius: '10px', cursor: 'pointer',
                  border: `2px solid ${selected ? '#3b82f6' : '#e2e8f0'}`,
                  background: selected ? '#eff6ff' : 'white',
                  color: selected ? '#1d4ed8' : '#374151',
                  textAlign: 'left', fontSize: '15px', fontWeight: selected ? '600' : '400',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: selected ? '#3b82f6' : '#f1f5f9',
                    color: selected ? 'white' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '700'
                  }}>{opt.key}</span>
                  {opt.text}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
          <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} style={{
            padding: '11px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
            background: 'white', color: '#374151', cursor: current === 0 ? 'not-allowed' : 'pointer',
            opacity: current === 0 ? 0.4 : 1, fontWeight: '600', fontSize: '14px'
          }}>← Previous</button>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} style={{
                width: '10px', height: '10px', borderRadius: '50%', border: 'none',
                background: i === current ? '#3b82f6' : answers[questions[i]?.Id] ? '#10b981' : '#e2e8f0',
                cursor: 'pointer', padding: 0
              }} />
            ))}
          </div>

          {current < questions.length - 1 ? (
            <button onClick={() => setCurrent(c => c + 1)} style={{
              padding: '11px 20px', borderRadius: '8px', border: 'none',
              background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '14px'
            }}>Next →</button>
          ) : (
            <button onClick={handleSubmit} disabled={saving} style={{
              padding: '11px 24px', borderRadius: '8px', border: 'none',
              background: '#10b981', color: 'white', cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: '700', fontSize: '14px', opacity: saving ? 0.7 : 1
            }}>{saving ? 'Submitting...' : '✅ Submit Quiz'}</button>
          )}
        </div>
      </Card>
    </Overlay>
  );
};

const Overlay = ({ children }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 3000, padding: '20px'
  }}>{children}</div>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: 'white', borderRadius: '16px', padding: '32px',
    width: '100%', maxWidth: '620px', maxHeight: '90vh',
    overflowY: 'auto', boxShadow: '0 25px 80px rgba(0,0,0,0.4)', ...style
  }}>{children}</div>
);

const ScoreStat = ({ label, value, color }) => (
  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
    <div style={{ fontSize: '22px', fontWeight: '800', color }}>{value}</div>
    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{label}</div>
  </div>
);

export default QuizModal;
