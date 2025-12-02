import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Text-to-Speech Hook with Natural AI Voice
 * Optimized for low latency and natural speech
 */
const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  const utteranceRef = useRef(null);

  useEffect(() => {
    // Check browser support
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // Load available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Select best voice (prefer Google/Microsoft high-quality voices)
      const preferredVoice =
        availableVoices.find(v => v.name.includes('Google US English') && v.name.includes('Female')) ||
        availableVoices.find(v => v.name.includes('Microsoft Zira')) ||
        availableVoices.find(v => v.name.includes('Google') && v.lang === 'en-US') ||
        availableVoices.find(v => v.lang === 'en-US' && v.name.includes('Female')) ||
        availableVoices.find(v => v.lang === 'en-US') ||
        availableVoices[0];

      setSelectedVoice(preferredVoice);
      console.log('🔊 Selected voice:', preferredVoice?.name);
    };

    loadVoices();

    // Voices are loaded asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text, options = {}) => {
    if (!isSupported || !text) return Promise.reject('Not supported or no text');

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Optimize for natural, clear speech
      utterance.voice = options.voice || selectedVoice;
      utterance.rate = options.rate || 0.95; // Slightly slower for clarity
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      utterance.lang = options.lang || 'en-US';

      utterance.onstart = () => {
        console.log('🔊 AI speaking:', text.substring(0, 50) + '...');
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log('🔊 AI finished speaking');
        setIsSpeaking(false);
        resolve();
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        setIsSpeaking(false);
        reject(error);
      };

      utteranceRef.current = utterance;

      // Speak with minimal delay
      window.speechSynthesis.speak(utterance);
    });
  }, [isSupported, selectedVoice]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice
  };
};

export default useTextToSpeech;
