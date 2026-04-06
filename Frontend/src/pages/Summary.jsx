import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import SummaryMetricsChart from "../components/SummaryMetricsChart";
import WavAudioPlayer from "../components/WavAudioPlayer";
import VideoPlayer from "../components/VideoPlayer";
import { getInterview } from "../services/api";

const ACTIVE_INTERVIEW_STORAGE_KEY = "ace_active_interview_id";

function Summary() {
  const { interviewId } = useParams();
  const location = useLocation();
  const [interview, setInterview] = useState(location.state?.interview || null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ACTIVE_INTERVIEW_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (interview) {
      return;
    }

    getInterview(interviewId)
      .then((response) => setInterview(response.interview))
      .catch((err) => setError(err.message || "Unable to load summary."));
  }, [interview, interviewId]);

  const answersByQuestionId = useMemo(
    () => new Map((interview?.answers || []).map((answer) => [answer.question_id, answer])),
    [interview?.answers],
  );
  const metricPoints = useMemo(
    () =>
      (interview?.questions || []).map((question, index) => {
        const answer = answersByQuestionId.get(question.id);
        return {
          label: `Q${index + 1}`,
          score: Number(answer?.score || 0),
          wpm: Number(answer?.wpm || 0),
          pause_count: Number(answer?.pause_count || 0),
          filler_count: Number(answer?.filler_count || 0),
          silence_percent: Number(answer?.silence_percent || 0),
        };
      }),
    [answersByQuestionId, interview?.questions],
  );

  if (!interview) {
    return (
      <div className="dashboard-modern">
        <div className="card-modern">
          <h1>Interview Results</h1>
          <p className="hint-modern">{error || "Loading results..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-modern">
      <div className="dashboard-header-modern">
        <div>
          <h1>Interview Results</h1>
          <p>Review every answer, the local WAV recording, and the generated feedback in one place.</p>
        </div>
        <div className="results-score-badge-modern">
          <span>Overall Score</span>
          <strong>{interview.total_score ? interview.total_score.toFixed(1) : "Pending"}/10</strong>
        </div>
      </div>

      <div className="stats-grid-modern">
        <div className="stat-card-modern">
          <h4>Status</h4>
          <div className="stat-value-modern">{interview.status}</div>
        </div>
        <div className="stat-card-modern">
          <h4>Questions</h4>
          <div className="stat-value-modern">{interview.questions.length}</div>
        </div>
        <div className="stat-card-modern">
          <h4>Completed</h4>
          <div className="stat-value-modern">{interview.completed ? "Yes" : "No"}</div>
        </div>
      </div>

      <SummaryMetricsChart points={metricPoints} />

      <div className="sessions-modern">
        {interview.questions.map((question, index) => {
          const answer = answersByQuestionId.get(question.id);
          const hasPendingResult = !answer?.transcript && !answer?.feedback;

          return (
            <article key={question.id} className="card-modern result-card-modern">
              <div className="result-card-header-modern">
                <div>
                  <p className="hint-modern">Question {index + 1}</p>
                  <h3>{question.question_text}</h3>
                </div>
                <div className="result-question-score-modern">{answer?.score ?? "Pending"}</div>
              </div>

              <div className="result-metrics-modern">
                <span className="metric-pill-modern">WPM: {answer?.wpm ?? "-"}</span>
                <span className="metric-pill-modern">Pauses: {answer?.pause_count ?? "-"}</span>
                <span className="metric-pill-modern">Fillers: {answer?.filler_count ?? "-"}</span>
                <span className="metric-pill-modern">Silence: {answer?.silence_percent ?? "-"}%</span>
                <span className="metric-pill-modern">Duration: {answer?.duration ?? "-"}s</span>
              </div>

              {answer?.audio_path ? (
                <WavAudioPlayer path={answer.audio_path} label="Recording" />
              ) : null}

              {answer?.video_path ? (
                <VideoPlayer path={answer.video_path} label="Video Recording" />
              ) : null}

              <div className="results-section-grid-modern">
                <section className="result-section-modern">
                  <p className="interview-label-modern">Transcript</p>
                  <p>{answer?.transcript || (hasPendingResult ? "Processing failed or has not finished yet." : "No answer detected.")}</p>
                </section>

                <section className="result-section-modern">
                  <p className="interview-label-modern">Feedback</p>
                  <p>{answer?.feedback || "Processing failed, please retry this interview if you need a fresh analysis."}</p>
                </section>

                <section className="result-section-modern">
                  <p className="interview-label-modern">Improved Answer</p>
                  <p>{answer?.improved_answer || "An improved answer will appear here once processing completes."}</p>
                </section>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default Summary;
