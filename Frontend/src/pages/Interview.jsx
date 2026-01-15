import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FeedbackModal from '../components/FeedbackModal';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import { generateQuestion, evaluateAnswer } from '../services/GeminiService';
import { VoiceWaveLoader, AIThinkingLoader } from '../components/Loader'; 

function Interview() {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [timer, setTimer] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported
  } = useVoiceRecognition();

  const TOTAL_QUESTIONS = 10;
  // TODO: In the future, pass this topic dynamically from the Home page
  const TOPIC = "React JS"; 

  // --- Effects ---

  // Initial Load: Get First Question
  useEffect(() => {
    fetchNextQuestion();
  }, []);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setTimer((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Logic ---

  const fetchNextQuestion = async () => {
    setIsProcessing(true);
    try {
      // Add a temporary "AI Thinking" bubble while fetching
      setMessages(prev => [...prev, { type: 'ai-loader' }]);
      
      const q = await generateQuestion(TOPIC);
      
      // Remove loader and add real question
      setMessages(prev => prev.filter(msg => msg.type !== 'ai-loader'));
      setCurrentQuestion(q);
      setMessages(prev => [...prev, { type: 'ai', text: q }]);
      setQuestionCount(prev => prev + 1);
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.filter(msg => msg.type !== 'ai-loader'));
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
    // If no text provided, use the voice transcript
    if (!answerText) answerText = transcript;
    if (!answerText || !answerText.trim()) return;

    if (isListening) stopListening();

    // 1. Show User Answer Immediately
    setMessages(prev => [...prev, { type: 'user', text: answerText }]);
    setTextInput('');
    setIsProcessing(true);

    // 2. Add AI Loader Bubble
    setMessages(prev => [...prev, { type: 'ai-loader' }]);

    try {
      // 3. Get Grade from Gemini
      const result = await evaluateAnswer(currentQuestion, answerText);
      
      // 4. Remove Loader
      setMessages(prev => prev.filter(msg => msg.type !== 'ai-loader'));
      
      setCurrentFeedback(result);
      setShowFeedback(true);
    } catch (error) {
      console.error("Grading failed", error);
      setMessages(prev => prev.filter(msg => msg.type !== 'ai-loader'));
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
      // Ideally, navigate to /analytics here
      alert("Interview Complete! Redirecting to Analytics...");
    }
  };

  const progressPercent = (questionCount / TOTAL_QUESTIONS) * 100;

  return (
    <div className="interview-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* --- Header --- */}
      <header className="interview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="status-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00FF88', fontWeight: 'bold' }}>
          <span style={{ fontSize: '1.2rem', animation: 'pulse 2s infinite' }}>●</span> 
          Live Session
        </div>
        <div className="timer" style={{ fontSize: '1.2rem', fontFamily: 'monospace' }}>{formatTime(timer)}</div>
        <Link to="/dashboard" className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #333', color: 'white', textDecoration: 'none', fontSize: '0.9rem' }}>
          End Session
        </Link>
      </header>

      {/* --- Progress Bar --- */}
      <div className="progress-bar-container" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem', color: '#888' }}>
          <span>Question {questionCount} of {TOTAL_QUESTIONS}</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div style={{ width: '100%', height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPercent}%`, height: '100%', background: '#007BFF', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
        </div>
      </div>

      {/* --- Chat Window --- */}
      <div className="chat-window" style={{ 
        flex: 1, 
        overflowY: 'auto', 
        marginBottom: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px',
        paddingRight: '10px'
      }}>
        {messages.map((msg, index) => {
          if (msg.type === 'ai-loader') {
            return (
               <div key={index} className="message ai" style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                  <div style={{ marginBottom: '5px', fontSize: '0.8rem', color: '#007BFF', fontWeight: 'bold' }}>🤖 AI Interviewer</div>
                  <div style={{ background: 'rgba(0, 123, 255, 0.1)', padding: '15px', borderRadius: '0 12px 12px 12px', border: '1px solid rgba(0, 123, 255, 0.3)' }}>
                    <AIThinkingLoader />
                  </div>
               </div>
            );
          }

          return (
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
          );
        })}

        {/* Live Voice Preview Bubble */}
        {isListening && (
           <div className="message user preview" style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
             <div style={{ background: 'transparent', border: '1px dashed #00FF88', padding: '10px', borderRadius: '12px', color: '#00FF88', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <VoiceWaveLoader /> 
                {transcript || "Listening..."}
             </div>
           </div>
        )}
      </div>

      {/* --- Controls Footer --- */}
      <div className="controls" style={{ 
        display: 'flex', 
        gap: '15px', 
        alignItems: 'center',
        background: 'rgba(20, 20, 20, 0.8)',
        backdropFilter: 'blur(10px)',
        padding: '20px',
        borderRadius: '20px',
        border: '1px solid #333'
      }}>
        
        {/* Microphone Button */}
        <button 
          onClick={toggleRecording}
          disabled={isProcessing}
          style={{
            width: '60px', height: '60px', borderRadius: '50%', border: 'none',
            background: isListening ? '#ff4444' : (isProcessing ? '#333' : '#007BFF'),
            color: 'white', fontSize: '24px', cursor: isProcessing ? 'not-allowed' : 'pointer',
            boxShadow: isListening ? '0 0 20px rgba(255, 68, 68, 0.5)' : '0 0 0 transparent',
            transition: 'all 0.3s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {isListening ? (
             // Simple Stop Icon
             <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '4px' }} />
          ) : (
             // Mic Icon
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          )}
        </button>

        {/* Text Input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isProcessing || isListening}
            placeholder={isListening ? "Listening..." : "Type your answer if mic fails..."}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer(textInput)}
            style={{ 
              width: '100%', 
              padding: '15px 20px', 
              borderRadius: '30px', 
              border: '1px solid #444', 
              background: '#2A2A2A', 
              color: 'white',
              outline: 'none',
              fontSize: '1rem'
            }}
          />
        </div>
        
        {/* Send Button */}
        <button 
          onClick={() => handleSubmitAnswer(textInput)}
          disabled={isProcessing || (!textInput && !transcript)}
          style={{ 
            padding: '15px', 
            borderRadius: '50%', 
            background: (!textInput && !transcript) ? '#333' : '#00FF88', 
            color: 'black', 
            border: 'none', 
            cursor: (!textInput && !transcript) ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>

      {/* Feedback Modal */}
      {showFeedback && currentFeedback && (
        <FeedbackModal 
          feedback={currentFeedback} 
          onNext={handleNextQuestion} 
        />
      )}
    </div>
  );
}

export default Interview;