/**
 * Mobile Components Type Definitions
 * Shared types for mobile-first features
 */

import { LucideIcon } from 'lucide-react';

// ============================================================================
// Floating Action Button (FAB) Types
// ============================================================================

export interface FABAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  disabled?: boolean;
}

export interface FABConfig {
  /** Primary action when FAB is clicked */
  primaryAction?: FABAction;
  /** Additional actions shown on long-press */
  menuActions?: FABAction[];
  /** Hide FAB on this page */
  hidden?: boolean;
  /** Custom position override */
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export interface FABContextValue {
  config: FABConfig;
  setConfig: (config: FABConfig) => void;
  resetConfig: () => void;
}

// ============================================================================
// Voice Input Types
// ============================================================================

export type VoiceLanguage = 'ar-SA' | 'en-US';

export interface VoiceInputConfig {
  /** Language for speech recognition */
  language: VoiceLanguage;
  /** Continuous recognition (keeps listening) */
  continuous?: boolean;
  /** Return interim results */
  interimResults?: boolean;
  /** Max number of alternative results */
  maxAlternatives?: number;
}

export interface VoiceInputResult {
  /** Transcribed text */
  transcript: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Is this a final result? */
  isFinal: boolean;
  /** Timestamp */
  timestamp: number;
}

export interface VoiceInputState {
  /** Is currently recording */
  isRecording: boolean;
  /** Is speech recognition available */
  isSupported: boolean;
  /** Current transcript */
  transcript: string;
  /** Recognition error */
  error: string | null;
  /** Recording duration in seconds */
  duration: number;
}

export interface VoiceCommand {
  /** Command pattern (regex or string) */
  pattern: string | RegExp;
  /** Action to execute */
  action: (matches?: string[]) => void;
  /** Command description */
  description: string;
  /** Command examples */
  examples?: string[];
}

// ============================================================================
// Navigation Badge Types
// ============================================================================

export interface NavBadgeData {
  /** Badge count */
  count: number;
  /** Badge variant */
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  /** Tooltip text */
  tooltip?: string;
  /** Last updated timestamp */
  updatedAt?: number;
}

export interface NavBadges {
  dashboard?: NavBadgeData;
  contracts?: NavBadgeData;
  customers?: NavBadgeData;
  fleet?: NavBadgeData;
  finance?: NavBadgeData;
  legal?: NavBadgeData;
  properties?: NavBadgeData;
  [key: string]: NavBadgeData | undefined;
}

export interface NavQuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  requiresPermission?: string;
}

// ============================================================================
// Mobile Form Types
// ============================================================================

export interface MobileFormConfig {
  /** Use single-page layout (no tabs/steps) */
  singlePage?: boolean;
  /** Enable auto-save */
  autoSave?: boolean;
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number;
  /** Show progress indicator */
  showProgress?: boolean;
  /** Enable haptic feedback */
  hapticFeedback?: boolean;
}

export interface MobileInputConfig {
  /** Input type */
  type: 'text' | 'tel' | 'email' | 'numeric' | 'decimal' | 'url' | 'search' | 'date' | 'time';
  /** Auto-capitalize */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Auto-complete */
  autoComplete?: string;
  /** Input mode for mobile keyboards */
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal' | 'url' | 'search' | 'none';
  /** Pattern for validation */
  pattern?: string;
}

// ============================================================================
// Haptic Feedback Types
// ============================================================================

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

export interface HapticConfig {
  /** Enable haptic feedback globally */
  enabled: boolean;
  /** Intensity (0-1) */
  intensity?: number;
  /** Vibration patterns in ms */
  patterns?: {
    light: number[];
    medium: number[];
    heavy: number[];
    success: number[];
    error: number[];
    warning: number[];
  };
}

// ============================================================================
// Mobile UI State Types
// ============================================================================

export interface MobileSafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MobileViewportSize {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

export interface MobileDeviceInfo {
  isTouch: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  supportsVibration: boolean;
  supportsSpeech: boolean;
}

// ============================================================================
// Privacy & Consent Types
// ============================================================================

export interface VoicePrivacyConsent {
  /** User has consented */
  granted: boolean;
  /** Consent timestamp */
  timestamp: number;
  /** Consent version */
  version: string;
}

export interface PrivacySettings {
  voiceInput: VoicePrivacyConsent;
  hapticFeedback: boolean;
  analytics: boolean;
}
