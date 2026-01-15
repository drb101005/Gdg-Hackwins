import React from 'react';
import { useNavigate } from 'react-router-dom';

function FeedbackModal({ feedback, onNext, isLastQuestion }) {
  const navigate = useNavigate();
  const { score, positive, improve } = feedback;
  
  // Calculate stroke offset for score ring (377 is circumference of circle with r=60)
  const circumference = 377;
  const offset = circumference - (score / 10) * circumference;

  const handleFinish = () => {
    navigate('/dashboard');
  };

  return (
    <div className="modal-overlay">
      <div className="feedback-modal">
        <h3 className="title-section" style={{ marginBottom: 'var(--spacing-md)' }}>
          Answer Feedback
        </h3>

        <div className="score-ring">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-blue)" />
                <stop offset="100%" stopColor="var(--accent-green)" />
              </linearGradient>
            </defs>
            <circle 
              className="score-ring-bg"
              cx="70" 
              cy="70" 
              r="60"
            />
            <circle 
              className="score-ring-progress"
              cx="70" 
              cy="70" 
              r="60"
              style={{ '--score-offset': offset }}
            />
          </svg>
          <div className="score-value">
            <span className="score-number">{score}</span>
            <span className="score-label">out of 10</span>
          </div>
        </div>

        <div className="feedback-section positive">
          <h4>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
            What You Did Well
          </h4>
          <p>{positive}</p>
        </div>

        <div className="feedback-section improve">
          <h4>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Areas to Improve
          </h4>
          <p>{improve}</p>
        </div>

        <div className="feedback-actions">
          {isLastQuestion ? (
            <button className="btn btn-glow w-full" onClick={handleFinish}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
              Finish Interview
            </button>
          ) : (
            <button className="btn btn-glow w-full" onClick={onNext}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12,5 19,12 12,19"/>
              </svg>
              Next Question
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FeedbackModal;
