import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import SummaryMetricsChart from "../components/SummaryMetricsChart";
import WavAudioPlayer from "../components/WavAudioPlayer";
import VideoPlayer from "../components/VideoPlayer";
import {
  getInterview,
  reprocessInterviewAudio,
  reprocessInterviewScores,
  stopInterviewProcessing,
} from "../services/api";
import { useAuth } from "../hooks/useAuth";

const ACTIVE_INTERVIEW_STORAGE_KEY = "ace_active_interview_id";

function Summary() {
  const { interviewId } = useParams();
  const location = useLocation();
  const [interview, setInterview] = useState(location.state?.interview || null);
  const [error, setError] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [reprocessingAction, setReprocessingAction] = useState("");
  const [stoppingProcessing, setStoppingProcessing] = useState(false);
  const { user } = useAuth();

  const loadInterview = async () => {
    const response = await getInterview(interviewId);
    setInterview(response.interview);
    return response.interview;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ACTIVE_INTERVIEW_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (interview) {
      return;
    }

    loadInterview()
      .catch((err) => setError(err.message || "Unable to load summary."));
  }, [interview, interviewId]);

  useEffect(() => {
    if (!interview || interview.status !== "processing") {
      return;
    }

    const timer = window.setInterval(() => {
      loadInterview().catch(() => undefined);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [interview?.id, interview?.status]);

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

  const processing = interview?.processing || {
    total_questions: interview?.questions?.length || 0,
    audio_done: 0,
    score_done: 0,
    overall_percent: 0,
    mode: null,
    current_question_index: null,
    completed_questions: 0,
    status_message: "",
    cancel_requested: false,
  };
  const interviewStatus = interview?.status || "";
  const interviewQuestions = interview?.questions || [];
  const isProcessing = interviewStatus === "processing";
  const hasQuestions = processing.total_questions > 0;
  const isAudioPhaseProcessing =
    isProcessing && hasQuestions && processing.audio_done < processing.total_questions;
  const isScorePhaseProcessing =
    isProcessing &&
    hasQuestions &&
    processing.audio_done >= processing.total_questions &&
    processing.score_done < processing.total_questions;
  const isSubmittingReprocess = Boolean(reprocessingAction);
  const canStopProcessing = user?.role === "admin" && isProcessing && !processing.cancel_requested;

  const handleReprocessAudio = async () => {
    setReprocessingAction("audio");
    setActionStatus("");
    setError("");
    try {
      const response = await reprocessInterviewAudio(interviewId);
      setInterview(response.interview);
      setActionStatus("Audio reprocessing started.");
    } catch (err) {
      setError(err.message || "Unable to reprocess interview audio.");
    } finally {
      setReprocessingAction("");
    }
  };

  const handleReprocessScores = async () => {
    setReprocessingAction("score");
    setActionStatus("");
    setError("");
    try {
      const response = await reprocessInterviewScores(interviewId);
      setInterview(response.interview);
      setActionStatus("Transcript scoring started.");
    } catch (err) {
      setError(err.message || "Unable to reprocess interview scores.");
    } finally {
      setReprocessingAction("");
    }
  };

  const handleStopProcessing = async () => {
    setStoppingProcessing(true);
    setActionStatus("");
    setError("");
    try {
      const response = await stopInterviewProcessing(interviewId);
      setInterview(response.interview);
      setActionStatus("Stop requested. The current interview processing run is being cancelled.");
    } catch (err) {
      setError(err.message || "Unable to stop interview processing.");
    } finally {
      setStoppingProcessing(false);
    }
  };

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

      {user?.role === "admin" ? (
        <div className="testing-action-row" style={{ marginBottom: "1rem" }}>
          <button
            className="btn-primary-modern"
            onClick={handleReprocessAudio}
            disabled={isSubmittingReprocess || stoppingProcessing || isAudioPhaseProcessing}
          >
            {reprocessingAction === "audio" || isAudioPhaseProcessing ? "Reprocessing Audio..." : "Reprocess All Audio"}
          </button>
          <button
            className="btn-secondary-modern"
            onClick={handleReprocessScores}
            disabled={isSubmittingReprocess || stoppingProcessing || isAudioPhaseProcessing || isScorePhaseProcessing}
          >
            {reprocessingAction === "score" || isScorePhaseProcessing ? "Re-scoring..." : "Re-score From Transcripts"}
          </button>
          {isProcessing ? (
            <button
              className="btn-secondary-modern"
              onClick={handleStopProcessing}
              disabled={!canStopProcessing || stoppingProcessing}
            >
              {stoppingProcessing || processing.cancel_requested ? "Stopping..." : "Stop Processing"}
            </button>
          ) : null}
        </div>
      ) : null}

      {actionStatus ? <div className="hint-modern">{actionStatus}</div> : null}

      <div className="stats-grid-modern">
        <div className="stat-card-modern">
          <h4>Status</h4>
          <div className="stat-value-modern">{interview.status}</div>
        </div>
        <div className="stat-card-modern">
          <h4>Question Source</h4>
          <div className="stat-value-modern">{interview.question_source || "unknown"}</div>
        </div>
        <div className="stat-card-modern">
          <h4>Questions</h4>
          <div className="stat-value-modern">{interviewQuestions.length}</div>
        </div>
        <div className="stat-card-modern">
          <h4>Completed</h4>
          <div className="stat-value-modern">{interview.completed ? "Yes" : "No"}</div>
        </div>
      </div>

      {interviewStatus === "processing" ? (
        <div className="card-modern">
          <h3>Processing Progress</h3>
          <p className="hint-modern">
            {processing.status_message || "Processing interview answers..."}
          </p>
          {processing.current_question_index ? (
            <p className="hint-modern">
              Current question: {processing.current_question_index}/{processing.total_questions}
            </p>
          ) : null}
          <p className="hint-modern">
            Audio done: {processing.audio_done}/{processing.total_questions} | Scores done: {processing.score_done}/{processing.total_questions}
          </p>
          <div className="progress-wrapper-modern" style={{ marginTop: "0.75rem" }}>
            <div className="progress-bar-modern" style={{ width: `${processing.overall_percent || 0}%` }} />
          </div>
          <p className="hint-modern" style={{ marginTop: "0.75rem" }}>
            Overall progress: {processing.overall_percent || 0}%
          </p>
        </div>
      ) : null}

      {interview.overall_feedback ? (
        <div className="card-modern">
          <h3>Overall Interview Feedback</h3>
          <p>{interview.overall_feedback}</p>
        </div>
      ) : null}

      <SummaryMetricsChart points={metricPoints} />

      <div className="sessions-modern">
        {interviewQuestions.map((question, index) => {
          const answer = answersByQuestionId.get(question.id);
          const hasPendingResult = !answer?.transcript && !answer?.feedback;

          return (
            <article key={question.id} className="card-modern result-card-modern">
              <div className="result-card-header-modern">
                <div>
                  <p className="hint-modern">Question {index + 1}</p>
                  <h3>{question.question_text}</h3>
                  {Array.isArray(question.follow_ups) && question.follow_ups.length ? (
                    <div className="hint-modern" style={{ marginTop: "0.5rem" }}>
                      {question.follow_ups.map((followUp) => (
                        <p key={followUp}>{followUp}</p>
                      ))}
                    </div>
                  ) : null}
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
