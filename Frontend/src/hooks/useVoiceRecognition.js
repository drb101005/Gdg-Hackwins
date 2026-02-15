import { useState, useEffect, useRef, useCallback } from "react";

const useVoiceRecognition = (language = "en-US") => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false); // Prevent stale closure bug

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech Recognition not supported in this browser.");
      console.error("⚠️ Browser does not support Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    // Handle results
    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += text + " ";
        } else {
          interimTranscript += text;
        }
      }

      setTranscript((prev) => prev + finalTranscript + interimTranscript);
    };

    // Handle errors
    recognition.onerror = (event) => {
      console.error("🎤 Speech Recognition Error:", event.error);
      setError(event.error);

      if (event.error === "not-allowed") {
        alert("Microphone permission denied. Please allow mic access.");
      }

      setIsListening(false);
      isListeningRef.current = false;
    };

    // Auto-restart if Chrome stops unexpectedly
    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (err) {
          console.log("Restart prevented:", err);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListeningRef.current) return; // Prevent double start

    try {
      recognitionRef.current.start();
      setIsListening(true);
      isListeningRef.current = true;
      setError(null);
      console.log("🎤 Listening started...");
    } catch (err) {
      console.error("⚠️ Failed to start recognition:", err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setIsListening(false);
    isListeningRef.current = false;
    console.log("🛑 Listening stopped.");
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};

export default useVoiceRecognition;
