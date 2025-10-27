/**
 * Voice Recorder Component
 * Visual feedback during voice recording
 */

import React from 'react';
import { Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { VoiceLanguage } from '@/types/mobile';
import { formatDuration } from '@/utils/voiceInputHelpers';

interface VoiceRecorderProps {
  /** Recording state */
  isRecording: boolean;
  /** Current transcript */
  transcript: string;
  /** Recording duration in seconds */
  duration: number;
  /** Language */
  language: VoiceLanguage;
  /** Callback to stop recording */
  onStop: () => void;
  /** Custom className */
  className?: string;
}

export function VoiceRecorder({
  isRecording,
  transcript,
  duration,
  language,
  onStop,
  className,
}: VoiceRecorderProps) {
  // Don't show if not recording
  if (!isRecording && !transcript) {
    return null;
  }

  return (
    <Card
      className={cn(
        'fixed bottom-20 left-4 right-4 z-50 p-4 shadow-lg border-2',
        isRecording ? 'border-destructive' : 'border-border',
        className
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Mic
                className={cn(
                  'h-5 w-5',
                  isRecording ? 'text-destructive' : 'text-muted-foreground'
                )}
              />
              {isRecording && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                </span>
              )}
            </div>
            <span className="text-sm font-medium">
              {language === 'ar-SA' ? 'جاري التسجيل...' : 'Recording...'}
            </span>
          </div>

          <div className="text-sm font-mono text-muted-foreground">
            {formatDuration(duration)}
          </div>
        </div>

        {/* Waveform Animation */}
        {isRecording && (
          <div className="flex items-center justify-center gap-1 h-12">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-destructive rounded-full animate-wave"
                style={{
                  height: '100%',
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        )}

        {/* Transcript Preview */}
        {transcript && (
          <div className="p-3 bg-muted rounded-md min-h-[60px] max-h-[120px] overflow-y-auto">
            <p className="text-sm" dir={language === 'ar-SA' ? 'rtl' : 'ltr'}>
              {transcript || (
                <span className="text-muted-foreground italic">
                  {language === 'ar-SA'
                    ? 'ابدأ الحديث...'
                    : 'Start speaking...'}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Controls */}
        {isRecording && (
          <div className="flex justify-center">
            <Button
              type="button"
              size="lg"
              variant="destructive"
              onClick={onStop}
              className="w-full"
            >
              <Square className="h-5 w-5 mr-2 fill-current" />
              {language === 'ar-SA' ? 'إيقاف التسجيل' : 'Stop Recording'}
            </Button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% {
            transform: scaleY(0.3);
          }
          50% {
            transform: scaleY(1);
          }
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
}
