import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import FeedbackModal from "../components/FeedbackModal";
import useVoiceRecognition from "../hooks/useVoiceRecognition";
import { generateQuestion, evaluateAnswer } from "../services/GeminiService";

function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  const chatEndRef = useRef(null);
  const hasStarted = useRef(false);

  const TOTAL_QUESTIONS = 10;
  const SESSION_DURATION = 900;
  const TOPIC = location.state?.topic || "General Interview";

  const [voiceType] = useState(localStorage.getItem("ace_voice") || "female");
  const [langCode] = useState(localStorage.getItem("ace_lang") || "en");

  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceRecognition();

  /* ---------------- TIMER ---------------- */

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  /* ---------------- SCROLL ---------------- */

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing, transcript]);

  /* ---------------- START ---------------- */

  useEffect(() => {
    if (!hasStarted.current) {
      fetchNextQuestion();
      hasStarted.current = true;
    }
  }, []);

  const fetchNextQuestion = async () => {
    setIsProcessing(true);
    try {
      const q = await generateQuestion(TOPIC, askedQuestions);
      setCurrentQuestion(q);
      setAskedQuestions((prev) => [...prev, q]);
      setMessages((prev) => [...prev, { type: "ai", text: q }]);
      setQuestionCount((prev) => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isListening) stopListening();
    else {
      resetTranscript();
      startListening();
    }
  };

  const handleSubmitAnswer = async (answerText) => {
    if (!answerText) answerText = transcript;
    if (!answerText || !answerText.trim()) return;

    if (isListening) stopListening();

    setMessages((prev) => [...prev, { type: "user", text: answerText }]);
    setTextInput("");
    setIsProcessing(true);

    try {
      const result = await evaluateAnswer(currentQuestion, answerText);
      setCurrentFeedback(result);
      setShowFeedback(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextQuestion = () => {
    setShowFeedback(false);
    resetTranscript();

    if (questionCount < TOTAL_QUESTIONS) {
      fetchNextQuestion();
    } else {
      navigate("/dashboard");
    }
  };

  const progressPercent = (questionCount / TOTAL_QUESTIONS) * 100;

  return (
    <div className="interview-modern">

      {/* HEADER */}
      <header className="interview-header-modern">
        <div>
          <h3>Live Session</h3>
          <p className="topic-label">Topic: {TOPIC}</p>
        </div>

        <div className="timer-modern">
          {formatTime(timeLeft)}
        </div>

        <Link to="/dashboard" className="btn-secondary-modern">
          End
        </Link>
      </header>

      {/* PROGRESS */}
      <div className="progress-wrapper-modern">
        <div
          className="progress-bar-modern"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* CHAT */}
      <div className="chat-modern">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-bubble-modern ${msg.type}`}
          >
            {msg.text}
          </div>
        ))}

        {isListening && (
          <div className="chat-bubble-modern user listening">
            {transcript || "Listening..."}
          </div>
        )}

        {isProcessing && (
          <div className="chat-bubble-modern ai thinking">
            Interviewer is thinking...
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* CONTROLS */}
      <div className="controls-modern">
        <button
          className={`mic-modern ${isListening ? "active" : ""}`}
          onClick={toggleRecording}
        >
          {isListening ? "Stop" : "Speak"}
        </button>

        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Type your answer..."
          disabled={isProcessing || isListening}
          className="chat-input-modern"
          onKeyDown={(e) =>
            e.key === "Enter" && handleSubmitAnswer(textInput)
          }
        />

        <button
          onClick={() => handleSubmitAnswer(textInput)}
          className="btn-primary-modern"
        >
          Send
        </button>
      </div>

      {showFeedback && currentFeedback && (
        <FeedbackModal feedback={currentFeedback} onNext={handleNextQuestion} />
      )}
    </div>
  );
}

export default Interview;
