/**
 * Voice Input Hook
 * Handles speech-to-text using Web Speech API
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VoiceInputConfig, VoiceInputState, VoiceInputResult, VoiceLanguage } from '@/types/mobile';
import {
  getSpeechRecognition,
  isSpeechRecognitionSupported,
  checkMicrophonePermission,
  requestMicrophoneAccess,
  hasValidConsent,
  cleanTranscript,
  getSpeechErrorMessage,
} from '@/utils/voiceInputHelpers';

interface UseVoiceInputOptions {
  language?: VoiceLanguage;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (result: VoiceInputResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const {
    language = 'ar-SA',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
    onStart,
    onEnd,
  } = options;

  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    isSupported: false,
    transcript: '',
    error: null,
    duration: 0,
  });

  const recognitionRef = useRef<any>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check browser support on mount
  useEffect(() => {
    const supported = isSpeechRecognitionSupported();
    setState((prev) => ({ ...prev, isSupported: supported }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // Start duration timer
  const startDurationTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setState((prev) => ({ ...prev, duration: elapsed }));
    }, 1000);
  }, []);

  // Stop duration timer
  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    // Handle results
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update state with transcript
      const currentTranscript = finalTranscript || interimTranscript;
      const cleanedTranscript = cleanTranscript(currentTranscript);

      setState((prev) => ({
        ...prev,
        transcript: cleanedTranscript,
        error: null,
      }));

      // Call result callback
      if (finalTranscript && onResult) {
        const result: VoiceInputResult = {
          transcript: cleanTranscript(finalTranscript),
          confidence: event.results[event.results.length - 1][0].confidence || 0,
          isFinal: true,
          timestamp: Date.now(),
        };
        onResult(result);
      }
    };

    // Handle errors
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event);
      const errorMessage = getSpeechErrorMessage(event);

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isRecording: false,
      }));

      stopDurationTimer();

      if (onError) {
        onError(errorMessage);
      }
    };

    // Handle start
    recognition.onstart = () => {
      setState((prev) => ({
        ...prev,
        isRecording: true,
        error: null,
        transcript: '',
        duration: 0,
      }));

      startDurationTimer();

      if (onStart) {
        onStart();
      }
    };

    // Handle end
    recognition.onend = () => {
      setState((prev) => ({
        ...prev,
        isRecording: false,
      }));

      stopDurationTimer();

      if (onEnd) {
        onEnd();
      }
    };

    return recognition;
  }, [language, continuous, interimResults, onResult, onError, onStart, onEnd, startDurationTimer, stopDurationTimer]);

  // Start recording
  const startRecording = useCallback(async () => {
    // Check if supported
    if (!state.isSupported) {
      const error = 'متصفحك لا يدعم التعرف على الصوت.';
      setState((prev) => ({ ...prev, error }));
      if (onError) onError(error);
      return false;
    }

    // Check consent
    if (!hasValidConsent()) {
      const error = 'يرجى الموافقة على سياسة الخصوصية أولاً.';
      setState((prev) => ({ ...prev, error }));
      if (onError) onError(error);
      return false;
    }

    // Check microphone permission
    const permissionState = await checkMicrophonePermission();
    if (permissionState === 'denied') {
      const error = 'تم رفض إذن الوصول إلى الميكروفون.';
      setState((prev) => ({ ...prev, error }));
      if (onError) onError(error);
      return false;
    }

    // Request microphone access if needed
    if (permissionState !== 'granted') {
      const granted = await requestMicrophoneAccess();
      if (!granted) {
        const error = 'لا يمكن الوصول إلى الميكروفون.';
        setState((prev) => ({ ...prev, error }));
        if (onError) onError(error);
        return false;
      }
    }

    try {
      // Stop existing recognition if any
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      // Initialize new recognition
      const recognition = initRecognition();
      if (!recognition) {
        const error = 'فشل تهيئة التعرف على الصوت.';
        setState((prev) => ({ ...prev, error }));
        if (onError) onError(error);
        return false;
      }

      recognitionRef.current = recognition;
      recognition.start();
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      const errorMessage = 'فشل بدء التسجيل.';
      setState((prev) => ({ ...prev, error: errorMessage }));
      if (onError) onError(errorMessage);
      return false;
    }
  }, [state.isSupported, initRecognition, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    }
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (state.isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: '', error: null }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    toggleRecording,
    clearTranscript,
    clearError,
  };
}
