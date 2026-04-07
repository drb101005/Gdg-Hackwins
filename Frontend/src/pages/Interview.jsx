import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { completeInterview, getInterview, submitInterviewAnswer } from "../services/api";
import { convertBlobToWav, selectRecordingMimeType, selectVideoRecordingMimeType } from "../utils/audio";

const QUESTION_TIME_LIMIT = 30;
const ACTIVE_INTERVIEW_STORAGE_KEY = "ace_active_interview_id";

function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  const interviewId = useMemo(() => {
    if (typeof window === "undefined") {
      return location.state?.interviewId || null;
    }

    return location.state?.interviewId || window.sessionStorage.getItem(ACTIVE_INTERVIEW_STORAGE_KEY);
  }, [location.state?.interviewId]);

  const [interview, setInterview] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_TIME_LIMIT);
  const [roundActive, setRoundActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");
  const [micStatus, setMicStatus] = useState("Preparing your local recording setup...");
  const [sessionPhase, setSessionPhase] = useState("initializing");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("Starting camera preview...");

  const containerRef = useRef(null);
  const previewVideoRef = useRef(null);
  const timerRef = useRef(null);
  const roundStartedAtRef = useRef(0);
  const streamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoMediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const videoChunksRef = useRef([]);
  const stopRecordingPromiseRef = useRef(null);
  const stopVideoRecordingPromiseRef = useRef(null);
  const videoRecordingStreamRef = useRef(null);
  const roundStartedForQuestionRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const fullscreenRequestedRef = useRef(false);
  const resumeCompletionRef = useRef(false);

  const questions = interview?.questions || [];
  const answeredCount = Math.min(Number(interview?.current_question_index || 0), questions.length);
  const currentQuestion = questions[answeredCount];
  const progressPercent = questions.length ? (answeredCount / questions.length) * 100 : 0;

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearStoredInterview = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ACTIVE_INTERVIEW_STORAGE_KEY);
    }
  };

  const persistInterviewId = (id) => {
    if (typeof window !== "undefined" && id) {
      window.sessionStorage.setItem(ACTIVE_INTERVIEW_STORAGE_KEY, id);
    }
  };

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    stopRecordingPromiseRef.current = null;
    if (videoRecordingStreamRef.current) {
      videoRecordingStreamRef.current.getTracks().forEach((track) => track.stop());
      videoRecordingStreamRef.current = null;
    }
    stopVideoRecordingPromiseRef.current = null;
  };

  const stopCameraTracks = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
  };

  const cleanupSession = async () => {
    clearTimer();
    stopTracks();
    stopCameraTracks();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (document.fullscreenElement && document.fullscreenElement === containerRef.current) {
      try {
        await document.exitFullscreen();
      } catch (_error) {
        // Ignore fullscreen exit failures during cleanup.
      }
    }
  };

  const speakQuestion = (text) =>
    new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });

  const ensureStream = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("Recording is not supported in this browser.");
    }

    if (!streamRef.current) {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    return streamRef.current;
  };

  const ensureCameraPreview = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage("Camera preview is not supported in this browser.");
      return;
    }

    if (cameraStreamRef.current) {
      return;
    }

    try {
      cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 180 },
          facingMode: "user",
        },
        audio: false,
      });

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = cameraStreamRef.current;
      }

      setCameraReady(true);
      setCameraMessage("Live camera preview");
    } catch (_error) {
      setCameraReady(false);
      setCameraMessage("Camera preview unavailable. Audio interview will continue normally.");
    }
  };

  const requestFullscreen = async () => {
    if (fullscreenRequestedRef.current || !containerRef.current?.requestFullscreen) {
      return;
    }

    try {
      fullscreenRequestedRef.current = true;
      await containerRef.current.requestFullscreen();
    } catch (_error) {
      // Browsers may reject fullscreen without a strong user gesture; fall back silently.
    }
  };

  const startRecording = async () => {
    const stream = await ensureStream();
    chunksRef.current = [];
    videoChunksRef.current = [];
    stopRecordingPromiseRef.current = null;
    stopVideoRecordingPromiseRef.current = null;
    setMicStatus("Recording...");
    setSessionPhase("recording");
    roundStartedAtRef.current = Date.now();

    const mimeType = selectRecordingMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.start();

    if (cameraStreamRef.current) {
      const combinedStream = new MediaStream([
        ...cameraStreamRef.current.getVideoTracks().map((track) => track.clone()),
        ...stream.getAudioTracks().map((track) => track.clone()),
      ]);

      const videoMimeType = selectVideoRecordingMimeType();
      const videoRecorder = videoMimeType
        ? new MediaRecorder(combinedStream, { mimeType: videoMimeType })
        : new MediaRecorder(combinedStream);

      videoRecordingStreamRef.current = combinedStream;
      videoMediaRecorderRef.current = videoRecorder;

      videoRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      videoRecorder.onstop = () => {
        if (videoRecordingStreamRef.current) {
          videoRecordingStreamRef.current.getTracks().forEach((track) => track.stop());
          videoRecordingStreamRef.current = null;
        }
      };

      videoRecorder.start();
    }
  };

  const stopRecording = () =>
    {
      if (stopRecordingPromiseRef.current) {
        return stopRecordingPromiseRef.current;
      }

      stopRecordingPromiseRef.current = new Promise((resolve) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === "inactive") {
          resolve(new Blob([], { type: "audio/webm" }));
          return;
        }

        recorder.onstop = () => {
          stopRecordingPromiseRef.current = null;
          resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        };
        recorder.stop();
      });

      return stopRecordingPromiseRef.current;
    };

  const stopVideoRecording = () => {
    if (stopVideoRecordingPromiseRef.current) {
      return stopVideoRecordingPromiseRef.current;
    }

    stopVideoRecordingPromiseRef.current = new Promise((resolve) => {
      const recorder = videoMediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const stream = videoRecordingStreamRef.current;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          videoRecordingStreamRef.current = null;
        }
        stopVideoRecordingPromiseRef.current = null;
        resolve(new Blob(videoChunksRef.current, { type: recorder.mimeType || "video/webm" }));
      };
      recorder.stop();
    });

    return stopVideoRecordingPromiseRef.current;
  };

  const startRound = async (questionText) => {
    setError("");
    setSecondsLeft(QUESTION_TIME_LIMIT);
    setRoundActive(true);
    setSessionPhase("preparing");
    setMicStatus("Reading the question...");

    try {
      await Promise.all([ensureCameraPreview(), requestFullscreen()]);
      await speakQuestion(questionText);
      setMicStatus("Starting microphone...");
      await startRecording();
      clearTimer();
      timerRef.current = window.setInterval(() => {
        setSecondsLeft((previous) => {
          if (previous <= 1) {
            window.setTimeout(() => handleFinishQuestion("timeout"), 0);
            return 0;
          }

          return previous - 1;
        });
      }, 1000);
    } catch (err) {
      const permissionMessage =
        err?.name === "NotAllowedError"
          ? "Microphone access required. Please allow microphone permission and retry."
          : err.message || "Microphone access is required for the interview.";
      setError(permissionMessage);
      setMicStatus("Microphone unavailable.");
      setSessionPhase("error");
      setRoundActive(false);
    }
  };

  const handleFinishQuestion = async (_reason = "manual") => {
    if (!currentQuestion || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    clearTimer();
    setRoundActive(false);
    setSessionPhase("uploading");
    setMicStatus("Preparing WAV upload...");
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    try {
      const [recordedBlob, recordedVideoBlob] = await Promise.all([
        stopRecording(),
        stopVideoRecording(),
      ]);
      const elapsedMilliseconds = roundStartedAtRef.current
        ? Date.now() - roundStartedAtRef.current
        : QUESTION_TIME_LIMIT * 1000;
      const elapsedSeconds = Math.max(1, Math.min(QUESTION_TIME_LIMIT, Math.round(elapsedMilliseconds / 1000)));
      const { blob: audioBlob, silenceDetected } = await convertBlobToWav(recordedBlob);

      setMicStatus(silenceDetected ? "No strong voice detected. Uploading for analysis..." : "Uploading answer...");

      const formData = new FormData();
      formData.append("questionId", currentQuestion.id);
      formData.append("duration", String(elapsedSeconds));
      formData.append("silenceDetected", String(silenceDetected));
      formData.append("audio", new File([audioBlob], `${currentQuestion.id}.wav`, { type: "audio/wav" }));
      if (recordedVideoBlob && recordedVideoBlob.size > 0) {
        formData.append(
          "video",
          new File([recordedVideoBlob], `${currentQuestion.id}${getVideoExtension(recordedVideoBlob.type)}`, {
            type: recordedVideoBlob.type || "video/webm",
          }),
        );
      }

      const response = await submitInterviewAnswer(interview.id, formData);
      setInterview(response.interview);

      if ((response.interview.current_question_index || 0) >= response.interview.questions.length) {
        setFinishing(true);
        setSessionPhase("processing");
        setMicStatus("Processing interview results...");
        const completedResponse = await completeInterview(interview.id);
        clearStoredInterview();
        navigate(`/summary/${interview.id}`, {
          replace: true,
          state: { interview: completedResponse.interview },
        });
        return;
      }

      setSessionPhase("transition");
      setMicStatus("Next question ready.");
    } catch (err) {
      const fallbackMessage =
        err?.message?.includes("convert") || err?.message?.includes("decode")
          ? "Audio conversion failed. Please retry this question."
          : err?.message || "Unable to upload your answer. Please retry this question.";
      setError(fallbackMessage);
      setMicStatus("Upload failed. You can retry this question.");
      setSessionPhase("error");
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const exitInterview = async () => {
    clearStoredInterview();
    await cleanupSession();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getVideoExtension = (mimeType) => {
    if (mimeType.includes("mp4")) {
      return ".mp4";
    }

    return ".webm";
  };

  useEffect(() => {
    if (!interviewId) {
      navigate("/home");
      return;
    }

    persistInterviewId(interviewId);
    getInterview(interviewId)
      .then((response) => {
        setInterview(response.interview);
      })
      .catch((err) => {
        setError(err.message || "Unable to load interview.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [interviewId, navigate]);

  useEffect(() => {
    return () => {
      cleanupSession();
    };
  }, []);

  useEffect(() => {
    if (!interview || !interview.completed) {
      return;
    }

    clearStoredInterview();
    navigate(`/summary/${interview.id}`, {
      replace: true,
      state: { interview },
    });
  }, [interview, navigate]);

  useEffect(() => {
    if (!interview || interview.completed || finishing || questions.length === 0) {
      return;
    }

    if (answeredCount < questions.length || resumeCompletionRef.current) {
      return;
    }

    resumeCompletionRef.current = true;
    setFinishing(true);
    setSessionPhase("processing");
    setMicStatus("Finishing interview processing...");

    completeInterview(interview.id)
      .then((response) => {
        clearStoredInterview();
        navigate(`/summary/${interview.id}`, {
          replace: true,
          state: { interview: response.interview },
        });
      })
      .catch((err) => {
        setError(err.message || "Processing failed, please retry.");
        setSessionPhase("error");
        setFinishing(false);
        resumeCompletionRef.current = false;
      });
  }, [answeredCount, finishing, interview, navigate, questions.length]);

  useEffect(() => {
    if (!currentQuestion || roundStartedForQuestionRef.current === currentQuestion.id || finishing) {
      return;
    }

    roundStartedForQuestionRef.current = currentQuestion.id;
    startRound(currentQuestion.question_text);
  }, [currentQuestion, finishing]);

  if (loading) {
    return <div className="auth-loading">Loading interview...</div>;
  }

  if (!interview || !currentQuestion) {
    return (
      <div className="interview-modern">
        <div className="card-modern">
          <h2>{interview && !interview.completed ? "Processing interview" : "Interview unavailable"}</h2>
          <p className="hint-modern">
            {interview && !interview.completed
              ? "Your answers have been captured. Final scoring is still running locally."
              : error || "This interview could not be loaded."}
          </p>
          {interview && !interview.completed ? null : (
            <Link to="/home" className="btn-primary-modern">
              Back Home
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="interview-modern interview-shell-modern" ref={containerRef}>
      <header className="interview-header-modern">
        <div>
          <h3>Live Session</h3>
          <p className="topic-label">
            {interview.type} / {interview.difficulty}
          </p>
        </div>

        <div className={`timer-modern ${secondsLeft <= 5 && roundActive ? "timer-modern-warning" : ""}`}>
          {formatTime(secondsLeft)}
        </div>

        <Link to="/dashboard" className="btn-secondary-modern" onClick={exitInterview}>
          End
        </Link>
      </header>

      <div className="progress-wrapper-modern">
        <div className="progress-bar-modern" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="interview-stage-modern">
        <div className="session-chip-row-modern">
          <span className={`status-chip-modern status-chip-${sessionPhase}`}>{micStatus}</span>
          <span className="status-chip-modern status-chip-neutral">
            Question {answeredCount + 1} of {questions.length}
          </span>
        </div>

        <div key={currentQuestion.id} className="card-modern question-card-modern">
          <div className="question-card-header-modern">
            <div>
              <p className="hint-modern">Current Question</p>
              <h2>{currentQuestion.question_text}</h2>
            </div>
          </div>

          <div className="interview-support-grid-modern">
            <div className="insight-card-modern">
              <p className="interview-label-modern">Recording Status</p>
              <p>{micStatus}</p>
              <p className="hint-modern">
                Recording starts automatically, uploads a WAV for scoring, and also saves the full video answer.
              </p>
            </div>

            <div className="insight-card-modern">
              <p className="interview-label-modern">Camera Preview</p>
              <p>{cameraMessage}</p>
              <p className="hint-modern">
                The camera feed stays pinned during the interview and is saved with your microphone audio when available.
              </p>
            </div>
          </div>

          {error ? <div className="error-text">{error}</div> : null}

          <div className="controls-modern">
            <button
              className={`mic-modern ${roundActive ? "active" : ""}`}
              onClick={() => handleFinishQuestion("manual")}
              disabled={!roundActive || finishing}
            >
              {finishing ? "Processing..." : "Done"}
            </button>
            {!roundActive && !finishing ? (
              <button className="btn-secondary-modern" onClick={() => startRound(currentQuestion.question_text)}>
                Retry Recording
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`camera-preview-modern ${cameraReady ? "visible" : "camera-preview-muted"}`}>
        <video ref={previewVideoRef} autoPlay muted playsInline />
        <span>{cameraReady ? "Camera live" : "Camera off"}</span>
      </div>
    </div>
  );
}

export default Interview;
