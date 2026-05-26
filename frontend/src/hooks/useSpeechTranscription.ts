'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useSpeechTranscription
 *
 * Wraps the browser Web Speech API to provide continuous transcription.
 *
 * Behavior:
 * - continuous = true (doesn't stop after each pause)
 * - interimResults = true (shows in-progress text)
 * - auto-restart if recognition ends unexpectedly (Chrome cuts off after ~60s)
 *
 * Returns final-result segments via onFinalSegment callback, and exposes
 * the current interim text for live display.
 *
 * Browser support: Chrome, Edge, Safari (webkit prefix). Firefox = no.
 */

interface UseSpeechTranscriptionOptions {
  language?: string;
  speakerName?: string;
  onFinalSegment?: (segment: {
    text: string;
    speaker_name: string;
    relative_seconds: number;
    confidence: number;
  }) => void;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: { [index: number]: SpeechRecognitionResult; length: number };
}

export function useSpeechTranscription({
  language = 'en-IN',
  speakerName = 'You',
  onFinalSegment,
}: UseSpeechTranscriptionOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const shouldRestartRef = useRef(false);

  // Detect support on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

  const createRecognition = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return null;

    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = language;
    recog.maxAlternatives = 1;

    recog.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0;

        if (result.isFinal) {
          const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
          onFinalSegment?.({
            text: transcript.trim(),
            speaker_name: speakerName,
            relative_seconds: elapsedSec,
            confidence,
          });
          interim = '';
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim);
    };

    recog.onerror = (e: any) => {
      console.warn('[speech] error:', e.error);
      if (e.error === 'no-speech' || e.error === 'aborted') {
        // benign - just restart
        return;
      }
      if (e.error === 'not-allowed') {
        setError('Microphone permission denied');
        shouldRestartRef.current = false;
      } else {
        setError(e.error);
      }
    };

    recog.onend = () => {
      if (shouldRestartRef.current) {
        // Chrome stops every ~60s - auto restart
        try {
          recog.start();
        } catch {
          // already started
        }
      } else {
        setIsListening(false);
        setInterimText('');
      }
    };

    return recog;
  }, [language, speakerName, onFinalSegment]);

  const start = useCallback(() => {
    if (!isSupported) {
      setError('Web Speech API not supported in this browser. Use Chrome/Edge.');
      return;
    }
    setError(null);
    startTimeRef.current = Date.now();
    shouldRestartRef.current = true;

    const recog = createRecognition();
    if (!recog) return;
    recognitionRef.current = recog;

    try {
      recog.start();
      setIsListening(true);
    } catch (e: any) {
      setError(e.message);
    }
  }, [isSupported, createRecognition]);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimText,
    error,
    start,
    stop,
  };
}
