import { useState, useEffect, useRef } from 'react';

const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    // 1. Check browser support safely
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("⚠️ Browser does not support Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;      // Keep listening even if user pauses
    recognition.interimResults = true;  // Show words as they are spoken
    recognition.lang = 'en-US';         // Default to English

    // 2. Handle Results
    recognition.onresult = (event) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    // 3. Handle Errors (Crucial for debugging)
    recognition.onerror = (event) => {
      console.error("🎤 Speech Recognition Error:", event.error);
      setIsListening(false); // Turn off button if error occurs
    };

    // 4. Handle End (Restart if we didn't mean to stop)
    recognition.onend = () => {
      // If we are supposed to be listening but it stopped, restart it.
      // (Commented out to prevent infinite loops for now, safer for demo)
      // if (isListening) recognition.start(); 
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log("🎤 Listening started...");
      } catch (error) {
        console.error("⚠️ Failed to start recognition:", error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      console.log("🛑 Listening stopped.");
    }
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript
  };
};

export default useVoiceRecognition;