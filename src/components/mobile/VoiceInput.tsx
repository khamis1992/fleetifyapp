/**
 * Voice Input Component
 * Button with language selector for voice-to-text input
 */

import React, { useState, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import type { VoiceLanguage, VoiceInputResult } from '@/types/mobile';
import { formatLanguageName, getSupportedLanguages } from '@/utils/voiceInputHelpers';
import { VoiceRecorder } from './VoiceRecorder';
import { VoicePrivacyDialog } from './VoicePrivacyDialog';
import { toast } from 'sonner';

interface VoiceInputProps {
  /** Current value of the input field */
  value?: string;
  /** Callback when transcript is ready */
  onTranscript: (transcript: string) => void;
  /** Language for speech recognition */
  language?: VoiceLanguage;
  /** Allow language switching */
  allowLanguageSwitch?: boolean;
  /** Show as icon button (compact mode) */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom className */
  className?: string;
}

export function VoiceInput({
  value = '',
  onTranscript,
  language: initialLanguage = 'ar-SA',
  allowLanguageSwitch = true,
  compact = false,
  disabled = false,
  className,
}: VoiceInputProps) {
  const [language, setLanguage] = useState<VoiceLanguage>(initialLanguage);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);

  // Handle voice input result
  const handleResult = useCallback(
    (result: VoiceInputResult) => {
      if (result.isFinal && result.transcript) {
        // Append to existing value if any
        const newValue = value ? `${value} ${result.transcript}` : result.transcript;
        onTranscript(newValue);

        // Show success feedback
        toast.success(
          language === 'ar-SA'
            ? 'تم التعرف على الصوت بنجاح'
            : 'Voice recognized successfully'
        );
      }
    },
    [value, onTranscript, language]
  );

  // Handle errors
  const handleError = useCallback(
    (error: string) => {
      toast.error(error);
    },
    []
  );

  // Handle start
  const handleStart = useCallback(() => {
    setShowRecorder(true);
  }, []);

  // Handle end
  const handleEnd = useCallback(() => {
    setShowRecorder(false);
  }, []);

  // Voice input hook
  const {
    isSupported,
    isRecording,
    transcript,
    error,
    duration,
    startRecording,
    stopRecording,
    clearError,
  } = useVoiceInput({
    language,
    continuous: false,
    interimResults: true,
    onResult: handleResult,
    onError: handleError,
    onStart: handleStart,
    onEnd: handleEnd,
  });

  // Handle mic button click
  const handleMicClick = useCallback(async () => {
    if (!isSupported) {
      toast.error(
        language === 'ar-SA'
          ? 'متصفحك لا يدعم التعرف على الصوت'
          : 'Your browser does not support speech recognition'
      );
      return;
    }

    // Check privacy consent
    const consent = localStorage.getItem('voice_privacy_consent');
    if (!consent) {
      setShowPrivacyDialog(true);
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      const started = await startRecording();
      if (!started && error) {
        clearError();
      }
    }
  }, [isSupported, isRecording, startRecording, stopRecording, language, error, clearError]);

  // Handle privacy consent
  const handlePrivacyConsent = useCallback(
    async (granted: boolean) => {
      setShowPrivacyDialog(false);
      if (granted) {
        await startRecording();
      }
    },
    [startRecording]
  );

  // Render compact mode (icon only)
  if (compact) {
    return (
      <>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleMicClick}
          disabled={disabled || !isSupported}
          className={cn(
            'relative',
            isRecording && 'text-destructive',
            className
          )}
          title={
            language === 'ar-SA'
              ? isRecording
                ? 'إيقاف التسجيل'
                : 'بدء التسجيل الصوتي'
              : isRecording
              ? 'Stop recording'
              : 'Start voice recording'
          }
        >
          {isRecording ? (
            <>
              <MicOff className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
              </span>
            </>
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {showRecorder && (
          <VoiceRecorder
            isRecording={isRecording}
            transcript={transcript}
            duration={duration}
            onStop={stopRecording}
            language={language}
          />
        )}

        <VoicePrivacyDialog
          open={showPrivacyDialog}
          onOpenChange={setShowPrivacyDialog}
          onConsent={handlePrivacyConsent}
        />
      </>
    );
  }

  // Full mode with language selector
  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        {allowLanguageSwitch && (
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as VoiceLanguage)}
            disabled={disabled || isRecording}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getSupportedLanguages().map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {formatLanguageName(lang)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          type="button"
          size="default"
          variant={isRecording ? 'destructive' : 'outline'}
          onClick={handleMicClick}
          disabled={disabled || !isSupported}
          className={cn('flex-1', isRecording && 'animate-pulse')}
        >
          {isRecording ? (
            <>
              <MicOff className="h-5 w-5 mr-2" />
              {language === 'ar-SA' ? 'إيقاف' : 'Stop'}
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mr-2" />
              {language === 'ar-SA' ? 'تسجيل صوتي' : 'Voice Input'}
            </>
          )}
        </Button>
      </div>

      {showRecorder && (
        <VoiceRecorder
          isRecording={isRecording}
          transcript={transcript}
          duration={duration}
          onStop={stopRecording}
          language={language}
        />
      )}

      <VoicePrivacyDialog
        open={showPrivacyDialog}
        onOpenChange={setShowPrivacyDialog}
        onConsent={handlePrivacyConsent}
      />
    </>
  );
}
