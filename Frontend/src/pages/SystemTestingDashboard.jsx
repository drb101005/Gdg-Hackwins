 import React, { useEffect, useRef, useState } from "react";
import { AudioLines, Camera, FileText, LoaderCircle } from "lucide-react";
import TestSectionCard from "../components/testing/TestSectionCard";
import { runTestingQuestionGeneration, runTestingTranscription } from "../services/api";
import { convertBlobToWav, selectRecordingMimeType } from "../utils/audio";

function createStatus(status = "idle", message = "Ready for testing.") {
  return { status, message };
}

function normalizeQuestionItem(item) {
  if (typeof item === "string") {
    return {
      question: item,
      follow_ups: [],
    };
  }

  if (!item || typeof item !== "object") {
    return {
      question: "",
      follow_ups: [],
    };
  }

  return {
    question: typeof item.question === "string" ? item.question : "",
    follow_ups: Array.isArray(item.follow_ups)
      ? item.follow_ups.filter((followUp) => typeof followUp === "string" && followUp.trim())
      : [],
  };
}

function SystemTestingDashboard() {
  const [audioStatus, setAudioStatus] = useState(createStatus("idle", "Record a sample and submit it to Whisper."));
  const [cameraStatus, setCameraStatus] = useState(createStatus("idle", "Start the webcam to verify camera access."));
  const [questionStatus, setQuestionStatus] = useState(
    createStatus("idle", "Paste resume context and generate interview questions."),
  );

  const [isRecording, setIsRecording] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [wordTimestamps, setWordTimestamps] = useState([]);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraInfo, setCameraInfo] = useState("Not detected");

  const [role, setRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Fresher");
  const [interviewType, setInterviewType] = useState("technical");
  const [company, setCompany] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [focusAreas, setFocusAreas] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState({
    intro_questions: [],
    resume_based_questions: [],
    core_questions: [],
  });

  const audioStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(0);

  const cameraStreamRef = useRef(null);
  const cameraVideoRef = useRef(null);

  useEffect(() => {
    return () => {
      stopAudioStream();
      stopCameraTracks();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  const stopAudioStream = () => {
    if (!audioStreamRef.current) {
      return;
    }

    audioStreamRef.current.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
  };

  const stopCameraTracks = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAudioStatus(createStatus("error", "This browser does not support in-page audio recording."));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = selectRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      audioStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      setAudioStatus(createStatus("loading", "Recording in progress..."));
      setIsRecording(true);
      setTranscript("");
      setWordTimestamps([]);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const nextBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const nextDuration = Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));

        if (audioPreviewUrl) {
          URL.revokeObjectURL(audioPreviewUrl);
        }

        setRecordedBlob(nextBlob);
        setRecordedDuration(nextDuration);
        setAudioPreviewUrl(URL.createObjectURL(nextBlob));
        setAudioStatus(createStatus("success", "Recording captured. Submit it to run transcription."));
        setIsRecording(false);
        stopAudioStream();
      };

      recorder.start();
    } catch (error) {
      const message =
        error?.name === "NotAllowedError"
          ? "Microphone permission was denied."
          : error?.name === "NotFoundError"
            ? "No microphone device was found."
            : error?.message || "Unable to access the microphone.";
      setAudioStatus(createStatus("error", message));
      setIsRecording(false);
      stopAudioStream();
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    recorder.stop();
  };

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    startRecording();
  };

  const handleAudioSubmit = async () => {
    if (!recordedBlob) {
      setAudioStatus(createStatus("error", "Record audio before submitting the transcription test."));
      return;
    }

    setAudioStatus(createStatus("loading", "Processing audio with Whisper..."));

    try {
      const { blob: wavBlob } = await convertBlobToWav(recordedBlob);
      const formData = new FormData();
      formData.append("audio", new File([wavBlob], "system-testing.wav", { type: "audio/wav" }));
      formData.append("duration", String(recordedDuration || 30));

      const response = await runTestingTranscription(formData);
      setTranscript(response?.transcript || "");
      setWordTimestamps(Array.isArray(response?.word_timestamps) ? response.word_timestamps : []);
      setAudioStatus(createStatus("success", "Transcription completed successfully."));
    } catch (error) {
      setAudioStatus(createStatus("error", error.message || "Transcription test failed."));
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus(createStatus("error", "This browser does not support camera access."));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cameraStreamRef.current = stream;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }

      setCameraActive(true);
      setCameraInfo("Stream active");
      setCameraStatus(createStatus("success", "Camera stream started successfully."));
    } catch (error) {
      const message =
        error?.name === "NotAllowedError"
          ? "Camera permission was denied."
          : error?.name === "NotFoundError"
            ? "No camera device was found."
            : error?.message || "Unable to start the camera.";
      setCameraActive(false);
      setCameraInfo("Not detected");
      setCameraStatus(createStatus("error", message));
    }
  };

  const stopCamera = () => {
    stopCameraTracks();
    setCameraActive(false);
    setCameraInfo("Not detected");
    setCameraStatus(createStatus("success", "Camera stream stopped."));
  };

  const handleQuestionGeneration = async () => {
    if (!resumeText.trim() && !jobDescription.trim()) {
      setQuestionStatus(createStatus("error", "Enter resume text or a job description before generating questions."));
      return;
    }

    setQuestionStatus(createStatus("loading", "Generating questions with Groq..."));

    try {
      const response = await runTestingQuestionGeneration({
        role,
        experienceLevel,
        interviewType,
        company,
        resumeData: resumeText,
        jobDescription,
        focusAreas,
      });
      setGeneratedQuestions({
        intro_questions: Array.isArray(response?.intro_questions) ? response.intro_questions : [],
        resume_based_questions: Array.isArray(response?.resume_based_questions)
          ? response.resume_based_questions
          : [],
        core_questions: Array.isArray(response?.core_questions) ? response.core_questions : [],
      });
      setQuestionStatus(createStatus("success", "Question generation completed successfully."));
    } catch (error) {
      setQuestionStatus(createStatus("error", error.message || "Question generation failed."));
    }
  };

  return (
    <div className="dashboard-modern testing-dashboard-modern">
      <header className="dashboard-header-modern testing-header-modern">
        <div>
          <p className="testing-eyebrow">Internal QA Surface</p>
          <h1>System Testing Dashboard</h1>
          <p>
            Use this page to validate recording, camera, and question-generation pipelines without opening the console.
          </p>
        </div>
      </header>

      <div className="stats-grid-modern">
        <div className="stat-card-modern">
          <h4>Seeded Test User</h4>
          <div className="stat-label-modern">Email: test@gmail.com</div>
          <div className="stat-label-modern">Password: test123456</div>
        </div>
        <div className="stat-card-modern">
          <h4>Whisper Test</h4>
          <div className="stat-label-modern">Backend proxy to the AI service for transcript verification</div>
        </div>
        <div className="stat-card-modern">
          <h4>Question Test</h4>
          <div className="stat-label-modern">Resume and job description to grouped Groq questions</div>
        </div>
      </div>

      <div className="sessions-modern testing-sections-modern">
        <TestSectionCard
          title="1. Audio Recording + Transcription Test"
          description="Record a short answer, replay it locally, then submit it through the backend to verify Whisper transcription."
          status={audioStatus}
        >
          <div className="testing-action-row">
            <button className={`btn-primary-modern ${isRecording ? "testing-danger-button" : ""}`} onClick={handleRecordingToggle}>
              <AudioLines size={18} />
              <span>{isRecording ? "Stop Recording" : "Start Recording"}</span>
            </button>
            <button className="btn-secondary-modern" onClick={handleAudioSubmit} disabled={audioStatus.status === "loading"}>
              {audioStatus.status === "loading" ? <LoaderCircle size={18} className="testing-spin" /> : null}
              <span>Submit to Whisper</span>
            </button>
          </div>

          {audioPreviewUrl ? (
            <div className="testing-output-block">
              <p className="interview-label-modern">Recorded Audio Preview</p>
              <audio controls preload="metadata" src={audioPreviewUrl} className="audio-player-modern" />
            </div>
          ) : null}

          <div className="testing-output-grid">
            <div className="insight-card-modern">
              <p className="interview-label-modern">Transcript</p>
              <p>{transcript || "Transcript will appear here after submission."}</p>
            </div>

            <div className="insight-card-modern">
              <p className="interview-label-modern">Word Timestamps (Raw JSON)</p>
              <pre className="testing-json-preview">{wordTimestamps.length ? JSON.stringify(wordTimestamps, null, 2) : "[]"}</pre>
            </div>
          </div>
        </TestSectionCard>

        <TestSectionCard
          title="2. Camera Test"
          description="Start and stop the webcam independently to verify device access and live preview rendering."
          status={cameraStatus}
        >
          <div className="testing-action-row">
            <button className="btn-primary-modern" onClick={startCamera} disabled={cameraActive}>
              <Camera size={18} />
              <span>Start Camera</span>
            </button>
            <button className="btn-secondary-modern" onClick={stopCamera} disabled={!cameraActive}>
              Stop Camera
            </button>
          </div>

          <div className="testing-camera-layout">
            <div className="testing-camera-preview">
              <video ref={cameraVideoRef} autoPlay muted playsInline />
            </div>

            <div className="insight-card-modern">
              <p className="interview-label-modern">Camera Diagnostics</p>
              <p>Camera Status: {cameraActive ? "Live" : "Stopped"}</p>
              <p>Face Detection: Optional and not configured in this internal test build.</p>
              <p>Signal: {cameraInfo}</p>
            </div>
          </div>
        </TestSectionCard>

        <TestSectionCard
          title="3. Resume -> Question Generation Test"
          description="Paste resume context and an optional job description to verify Groq-powered question generation grouped by section."
          status={questionStatus}
        >
          <div className="settings-grid-modern">
            <label className="label-modern">
              Role
              <input
                className="input-modern"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="Frontend Developer, SDE Intern..."
              />
            </label>

            <label className="label-modern">
              Experience Level
              <select
                className="input-modern"
                value={experienceLevel}
                onChange={(event) => setExperienceLevel(event.target.value)}
              >
                <option value="Fresher">Fresher</option>
                <option value="1-3 years">1-3 years</option>
                <option value="3+ years">3+ years</option>
              </select>
            </label>
          </div>

          <div className="settings-grid-modern">
            <label className="label-modern">
              Interview Type
              <select
                className="input-modern"
                value={interviewType}
                onChange={(event) => setInterviewType(event.target.value)}
              >
                <option value="technical">Technical</option>
                <option value="hr">HR</option>
                <option value="behavioral">Behavioral</option>
              </select>
            </label>

            <label className="label-modern">
              Company
              <input
                className="input-modern"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="Optional target company"
              />
            </label>
          </div>

          <label className="label-modern">
            Resume Data
            <textarea
              className="textarea-modern"
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              placeholder="Paste projects, skills, tech stack, ownership, and implementation details..."
            />
          </label>

          <label className="label-modern">
            Job Description
            <textarea
              className="textarea-modern"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Optional role description, skills, responsibilities, or target company context..."
            />
          </label>

          <label className="label-modern">
            Focus Areas
            <input
              className="input-modern"
              value={focusAreas}
              onChange={(event) => setFocusAreas(event.target.value)}
              placeholder="DSA, projects, system design..."
            />
          </label>

          <div className="testing-action-row">
            <button className="btn-primary-modern" onClick={handleQuestionGeneration} disabled={questionStatus.status === "loading"}>
              <FileText size={18} />
              <span>Generate Questions</span>
            </button>
          </div>

          <div className="testing-output-grid">
            <div className="insight-card-modern">
              <p className="interview-label-modern">Intro Questions</p>
              <ul className="testing-list">
                {generatedQuestions.intro_questions.length
                  ? generatedQuestions.intro_questions.map((item, index) => {
                      const question = normalizeQuestionItem(item);
                      return (
                        <li key={`${question.question || "intro"}-${index}`}>
                          <span>{question.question}</span>
                          {question.follow_ups.length ? (
                            <ul className="testing-list" style={{ marginTop: "0.5rem" }}>
                              {question.follow_ups.map((followUp, followUpIndex) => (
                                <li key={`${followUp}-${followUpIndex}`}>{followUp}</li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })
                  : <li>No intro questions generated yet.</li>}
              </ul>
            </div>

            <div className="insight-card-modern">
              <p className="interview-label-modern">Resume-Based Questions</p>
              <ul className="testing-list">
                {generatedQuestions.resume_based_questions.length
                  ? generatedQuestions.resume_based_questions.map((item, index) => {
                      const question = normalizeQuestionItem(item);
                      return (
                        <li key={`${question.question || "resume"}-${index}`}>
                          <span>{question.question}</span>
                          {question.follow_ups.length ? (
                            <ul className="testing-list" style={{ marginTop: "0.5rem" }}>
                              {question.follow_ups.map((followUp, followUpIndex) => (
                                <li key={`${followUp}-${followUpIndex}`}>{followUp}</li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })
                  : <li>No resume-based questions generated yet.</li>}
              </ul>
            </div>

            <div className="insight-card-modern">
              <p className="interview-label-modern">Core Questions</p>
              <ul className="testing-list">
                {generatedQuestions.core_questions.length
                  ? generatedQuestions.core_questions.map((item, index) => {
                      const question = normalizeQuestionItem(item);
                      return (
                        <li key={`${question.question || "core"}-${index}`}>
                          <span>{question.question}</span>
                          {question.follow_ups.length ? (
                            <ul className="testing-list" style={{ marginTop: "0.5rem" }}>
                              {question.follow_ups.map((followUp, followUpIndex) => (
                                <li key={`${followUp}-${followUpIndex}`}>{followUp}</li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })
                  : <li>No core questions generated yet.</li>}
              </ul>
            </div>
          </div>
        </TestSectionCard>
      </div>
    </div>
  );
}

export default SystemTestingDashboard;
