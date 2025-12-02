import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Real-time Voice Recognition Hook with Auto-Silence Detection
 * Optimized for <500ms latency
 * Uses Web Speech API (FREE!)
 * Auto-detects when user stops speaking and triggers callback
 */
const useVoiceRecognition = ({ onSilenceDetected, silenceTimeout = 2500 } = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const silenceTimerRef = useRef(null);
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setIsSupported(true);

    // Initialize recognition
    const recognition = new SpeechRecognition();

    // Optimize for low latency
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-US';

    // Event handlers
    recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += transcript + ' ';
          hasSpokenRef.current = true;
        } else {
          interim += transcript;
        }
      }

      // Update interim results immediately (low latency!)
      if (interim) {
        setInterimTranscript(interim);
      }

      // Update final results
      if (final) {
        finalTranscriptRef.current += final;
        setTranscript(finalTranscriptRef.current);
        setInterimTranscript('');

        // Reset and start silence detection timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        if (onSilenceDetected && hasSpokenRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            console.log('🔇 Silence detected - auto-submitting answer');
            const fullTranscript = finalTranscriptRef.current.trim();
            if (fullTranscript) {
              onSilenceDetected(fullTranscript);
            }
          }, silenceTimeout);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'audio-capture') {
        setError('Microphone not accessible. Please check permissions.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else {
        setError(`Error: ${event.error}`);
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🎤 Voice recognition ended');
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onSilenceDetected, silenceTimeout]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition not supported');
      return;
    }

    if (recognitionRef.current && !isListening) {
      finalTranscriptRef.current = '';
      hasSpokenRef.current = false;
      setTranscript('');
      setInterimTranscript('');
      setError(null);

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        setError('Failed to start voice recognition');
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    hasSpokenRef.current = false;
    setTranscript('');
    setInterimTranscript('');
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
};

export default useVoiceRecognition;
