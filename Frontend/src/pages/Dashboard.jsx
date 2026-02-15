import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const mockSessions = [
  { id: 1, topic: "JavaScript Fundamentals", date: "Jan 12, 2026", score: 8.5, questions: 5 },
  { id: 2, topic: "React Hooks & State Management", date: "Jan 11, 2026", score: 7.2, questions: 4 },
  { id: 3, topic: "System Design Interview", date: "Jan 10, 2026", score: 6.8, questions: 5 },
  { id: 4, topic: "Data Structures & Algorithms", date: "Jan 9, 2026", score: 9.1, questions: 6 },
  { id: 5, topic: "Behavioral Interview Practice", date: "Jan 8, 2026", score: 8.0, questions: 4 }
];

function Dashboard() {

  const avgScoreRaw =
    mockSessions.reduce((acc, s) => acc + s.score, 0) /
    mockSessions.length;

  const totalSessions = mockSessions.length;
  const totalQuestions = mockSessions.reduce(
    (acc, s) => acc + s.questions,
    0
  );

  /* ---------- ANIMATED COUNTERS ---------- */

  const [avgScore, setAvgScore] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setAvgScore((avgScoreRaw * i) / 30);
      setSessionCount(Math.min(totalSessions, i));
      setQuestionCount(Math.min(totalQuestions, i * 3));

      if (i >= 30) clearInterval(interval);
    }, 30);

    return () => clearInterval(interval);
  }, []);

  const getScoreLabel = (score) => {
    if (score >= 8.5) return "Excellent";
    if (score >= 7) return "Good";
    return "Needs Improvement";
  };

  return (
    <div className="dashboard-modern">

      {/* HEADER */}
      <div className="dashboard-header-modern">
        <div>
          <h1>Your Progress</h1>
          <p>Track improvement over time and identify weak spots.</p>
        </div>

        <Link to="/home" className="btn-primary-modern">
          New Session
        </Link>
      </div>

      {/* STATS */}
      <div className="stats-grid-modern">

        <div className="stat-card-modern">
          <h4>Average Score</h4>
          <div className="stat-value-modern">
            {avgScore.toFixed(1)}
          </div>
          <span className="stat-label-modern">
            {getScoreLabel(avgScoreRaw)}
          </span>
        </div>

        <div className="stat-card-modern">
          <h4>Total Sessions</h4>
          <div className="stat-value-modern">
            {sessionCount}
          </div>
        </div>

        <div className="stat-card-modern">
          <h4>Questions Answered</h4>
          <div className="stat-value-modern">
            {questionCount}
          </div>
        </div>

      </div>

      {/* INSIGHT CARD */}
      <div className="insight-card-modern">
        <h3>Performance Insight</h3>
        <p>
          You perform strongest in structured technical questions.
          Consider practicing behavioral answers with shorter,
          clearer responses.
        </p>
      </div>

      {/* RECENT SESSIONS */}
      <div className="sessions-modern">
        <h3>Recent Sessions</h3>

        {mockSessions.map((session) => (
          <div key={session.id} className="session-row-modern">
            <div>
              <strong>{session.topic}</strong>
              <div className="session-meta-modern">
                {session.date} • {session.questions} questions
              </div>
            </div>

            <div className="session-score-modern">
              {session.score}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}

export default Dashboard;
