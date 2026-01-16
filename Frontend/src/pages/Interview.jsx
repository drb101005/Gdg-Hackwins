import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import FeedbackModal from '../components/FeedbackModal';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import { generateQuestion, evaluateAnswer } from '../services/GeminiService';
import '../styles/Animations.css';

function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  const chatEndRef = useRef(null);
  const hasStarted = useRef(false);

  // --- CONFIGURATION ---
  const TOTAL_QUESTIONS = 10;
  const SESSION_DURATION = 900; // 15 Minutes in seconds
  const TOPIC = location.state?.topic || "React JS"; 
  const [voiceType] = useState(localStorage.getItem('ace_voice') || 'female');
  const [langCode] = useState(localStorage.getItem('ace_lang') || 'en');

  // --- STATE ---
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [askedQuestions, setAskedQuestions] = useState([]); 
  const [questionCount, setQuestionCount] = useState(0);
  const [textInput, setTextInput] = useState('');
  
  // New: Countdown Timer State
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

  // --- 1. COUNTDOWN TIMER LOGIC ---
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          alert("Time is up! Submitting interview...");
          navigate('/dashboard'); // Auto-end
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
    // Add warning color if time is low (< 2 mins)
    return {
      text: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      isLow: seconds < 120
    };
  };

  // --- 2. AI VOICE LOGIC ---
const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop previous audio

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Map simplified codes to BCP 47 tags (Browser standard)
    const langMap = {
      'en': 'en-US',
      'fr': 'fr-FR',
      'de': 'de-DE'
    };
    const targetLang = langMap[langCode] || 'en-US';

    // 🔍 STEP 1: Filter voices by the selected LANGUAGE
    let availableVoices = voices.filter(v => v.lang.startsWith(langCode));
    
    // Fallback: If no specific language voices found (rare), use all voices
    if (availableVoices.length === 0) availableVoices = voices;

    // 🔍 STEP 2: Filter by GENDER (Male/Female)
    // Browsers often put "Google US English Female" or "Microsoft David" (Male)
    let selectedVoice = availableVoices.find(v => 
      v.name.toLowerCase().includes(voiceType === 'male' ? 'male' : 'female') ||
      // Common Windows/Google names for Male
      (voiceType === 'male' && (v.name.includes('David') || v.name.includes('Mark') || v.name.includes('Google') && !v.name.includes('Female'))) ||
      // Common names for Female
      (voiceType === 'female' && (v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Female')))
    );

    // 🚨 Fallback: If we couldn't match gender, just take the first voice in that language
    if (!selectedVoice) selectedVoice = availableVoices[0];

    // Apply settings
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.lang = targetLang;
    utterance.rate = 1.0; 
    utterance.pitch = voiceType === 'male' ? 0.9 : 1.1; // Slight pitch tweak for effect

    console.log(`🗣️ Speaking in ${targetLang} using voice: ${selectedVoice?.name}`);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.type === 'ai') {
      speakText(lastMsg.text);
    }
  }, [messages]);

  // --- 3. SCROLL & START LOGIC ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing, isListening, transcript]);

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
      setAskedQuestions(prev => [...prev, q]);
      setMessages(prev => [...prev, { type: 'ai', text: q }]);
      setQuestionCount(prev => prev + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const handleSubmitAnswer = async (answerText) => {
    window.speechSynthesis.cancel(); // Stop AI if it's still talking
    setCurrentFeedback(null); 
    
    if (!answerText) answerText = transcript;
    if (!answerText || !answerText.trim()) return;

    if (isListening) stopListening();

    setMessages(prev => [...prev, { type: 'user', text: answerText }]);
    setTextInput('');
    setIsProcessing(true);

    try {
      const result = await evaluateAnswer(currentQuestion, answerText);
      setCurrentFeedback(result);
      setShowFeedback(true);
    } catch (error) {
      console.error("Grading failed", error);
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
      alert("Interview Complete! Great job.");
      navigate('/dashboard');
    }
  };

  const progressPercent = (questionCount / TOTAL_QUESTIONS) * 100;
  const questionsLeft = TOTAL_QUESTIONS - questionCount;
  const timeObj = formatTime(timeLeft);

  return (
    <div className="interview-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header className="interview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="status-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00FF88', fontWeight: 'bold' }}>
            <span className="pulse-dot"></span> Live Session
          </div>
          <span style={{ fontSize: '0.8rem', color: '#888' }}>Topic: {TOPIC}</span>
        </div>

        {/* TIMER DISPLAY */}
        <div className="timer" style={{ 
          fontSize: '1.4rem', 
          fontFamily: 'monospace', 
          fontWeight: 'bold',
          color: timeObj.isLow ? '#ff4444' : 'white',
          border: `1px solid ${timeObj.isLow ? '#ff4444' : '#333'}`,
          padding: '5px 15px',
          borderRadius: '8px',
          background: timeObj.isLow ? 'rgba(255, 68, 68, 0.1)' : 'transparent'
        }}>
          {timeObj.text}
        </div>

        <Link to="/dashboard" className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #333', color: 'white', textDecoration: 'none' }}>
          End Session
        </Link>
      </header>

      {/* Progress & Questions Left */}
      <div className="progress-bar-container" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#ccc' }}>
            <span style={{ color: '#007BFF', fontWeight: 'bold' }}>Question {questionCount} / {TOTAL_QUESTIONS}</span>
            <span style={{ color: questionsLeft === 0 ? '#ff4444' : '#888' }}>
               {questionsLeft === 0 ? "Last Question!" : `${questionsLeft} questions left`}
            </span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #007BFF, #00FF88)', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
        </div>
      </div>

      {/* Chat Window */}
      <div className="chat-window" style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`} style={{
            alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{ marginBottom: '5px', fontSize: '0.8rem', color: msg.type === 'user' ? '#888' : '#007BFF', fontWeight: 'bold' }}>
              {msg.type === 'ai' ? '🤖 AI Interviewer' : '👤 You'}
            </div>
            <div style={{
              background: msg.type === 'user' ? '#2A2A2A' : 'rgba(0, 123, 255, 0.1)',
              padding: '15px',
              borderRadius: msg.type === 'user' ? '12px 0 12px 12px' : '0 12px 12px 12px',
              border: msg.type === 'ai' ? '1px solid rgba(0, 123, 255, 0.3)' : '1px solid #444',
              color: 'white',
              lineHeight: '1.5'
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Live Speech Preview Bubble */}
        {isListening && (
           <div className="message user preview" style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
             <div style={{ 
               background: 'rgba(0, 255, 136, 0.1)', 
               border: '1px dashed #00FF88', 
               padding: '15px', 
               borderRadius: '12px 0 12px 12px', 
               color: '#00FF88', 
               display: 'flex', 
               alignItems: 'center', 
               gap: '10px' 
             }}>
                <div className="typing-indicator"><span></span><span></span><span></span></div>
                {transcript || "Listening..."}
             </div>
           </div>
        )}

        {/* AI Thinking Animation */}
        {isProcessing && (
           <div className="message ai" style={{ alignSelf: 'flex-start' }}>
              <div style={{ marginBottom: '5px', fontSize: '0.8rem', color: '#007BFF', fontWeight: 'bold' }}>🤖 AI Interviewer</div>
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
           </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Controls */}
      <div className="controls" style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'rgba(20,20,20,0.8)', padding: '20px', borderRadius: '20px', border: '1px solid #333' }}>
        <button onClick={toggleRecording} disabled={isProcessing} className={`mic-button ${isListening ? 'listening' : ''}`}>
          {isListening ? <div className="stop-square"></div> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>}
        </button>

        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={isProcessing || isListening}
          placeholder={isListening ? "Listening..." : "Type your answer..."}
          style={{ flex: 1, padding: '15px', borderRadius: '30px', border: '1px solid #444', background: '#2A2A2A', color: 'white', outline: 'none' }}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer(textInput)}
        />
        
        <button onClick={() => handleSubmitAnswer(textInput)} disabled={isProcessing} style={{ padding: '15px', borderRadius: '50%', background: '#00FF88', color: 'black', border: 'none', cursor: 'pointer' }}>
          ➤
        </button>
      </div>

      {showFeedback && currentFeedback && (
        <FeedbackModal feedback={currentFeedback} onNext={handleNextQuestion} />
      )}
    </div>
  );
}

export default Interview;