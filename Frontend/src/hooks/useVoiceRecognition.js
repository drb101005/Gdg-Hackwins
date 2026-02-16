import { useState, useEffect, useRef, useCallback } from "react";

const useVoiceRecognition = (language = "en-US") => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech Recognition not supported in this browser.");
      console.error("⚠️ Speech Recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += text + " ";
        } else {
          interimText += text;
        }
      }

      // Append ONLY final results permanently
      if (finalText) {
        setTranscript((prev) => prev + finalText);
      }

      // Update interim preview separately
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event) => {
      console.error("🎤 Speech Recognition Error:", event.error);
      setError(event.error);
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognition.onend = () => {
      // Auto restart if still supposed to be listening
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
    if (isListeningRef.current) return;

    try {
      recognitionRef.current.start();
      setIsListening(true);
      isListeningRef.current = true;
      setError(null);
      setInterimTranscript("");
    } catch (err) {
      console.error("⚠️ Failed to start recognition:", err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setIsListening(false);
    isListeningRef.current = false;
    setInterimTranscript("");
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    fullTranscript: transcript + interimTranscript, // convenience
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};

export default useVoiceRecognition;
