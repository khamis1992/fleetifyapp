/**
 * PWA Install Prompt Component
 * Shows install prompt for PWA on supported devices
 * Handles iOS Safari and Android Chrome install flows
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, X, Share, Plus, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptProps {
  /** Storage key for dismissal */
  storageKey?: string;
  /** Days before showing again after dismissal */
  dismissalDays?: number;
  /** Custom app name */
  appName?: string;
  /** Custom app icon */
  appIcon?: string;
}

// Check if running as PWA
export function isRunningAsPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

// Check if iOS
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Check if Android
export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

// iOS Install Instructions
const IOSInstallInstructions: React.FC<{
  onDismiss: () => void;
}> = ({ onDismiss }) => (
  <Dialog open onOpenChange={onDismiss}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-rose-500" />
          تثبيت التطبيق
        </DialogTitle>
        <DialogDescription>
          لتجربة أفضل، يمكنك تثبيت التطبيق على جهازك
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Share className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-neutral-900">الخطوة 1</p>
            <p className="text-sm text-neutral-600">
              اضغط على أيقونة المشاركة <Share className="inline h-4 w-4" /> في شريط Safari
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-lg">
          <div className="p-2 bg-green-100 rounded-lg">
            <Plus className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-neutral-900">الخطوة 2</p>
            <p className="text-sm text-neutral-600">
              اختر "إضافة إلى الشاشة الرئيسية"
            </p>
          </div>
        </div>
      </div>

      <Button onClick={onDismiss} variant="outline" className="w-full">
        فهمت
      </Button>
    </DialogContent>
  </Dialog>
);

// Main Component
export const InstallPrompt: React.FC<InstallPromptProps> = ({
  storageKey = 'pwa_install_prompt',
  dismissalDays = 7,
  appName = 'Fleetify',
  appIcon = '/logo.png',
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already running as PWA
    if (isRunningAsPWA()) return;

    // Check if previously dismissed
    const dismissedAt = localStorage.getItem(`${storageKey}_dismissed`);
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissal = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < dismissalDays) return;
    }

    // Listen for install prompt (Chrome/Edge)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show iOS prompt after delay
    if (isIOS()) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [storageKey, dismissalDays]);

  const handleInstall = async () => {
    if (isIOS()) {
      setShowIOSInstructions(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(`${storageKey}_dismissed`, new Date().toISOString());
    setShowPrompt(false);
    setShowIOSInstructions(false);
  };

  if (!showPrompt) return null;

  if (showIOSInstructions) {
    return <IOSInstallInstructions onDismiss={handleDismiss} />;
  }

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 md:hidden shadow-xl border-rose-200 animate-in slide-in-from-bottom duration-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* App Icon */}
          <div className="shrink-0 w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
            {appIcon ? (
              <img src={appIcon} alt={appName} className="w-8 h-8 rounded" />
            ) : (
              <Smartphone className="h-6 w-6 text-coral-600" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-900">تثبيت {appName}</h3>
            <p className="text-sm text-neutral-500 mt-0.5">
              احصل على تجربة أفضل مع التطبيق
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 hover:bg-neutral-100 rounded"
          >
            <X className="h-5 w-5 text-neutral-400" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="flex-1"
          >
            لاحقاً
          </Button>
          <Button
            size="sm"
            onClick={handleInstall}
            className="flex-1 bg-rose-500 hover:bg-coral-600 gap-2"
          >
            <Download className="h-4 w-4" />
            تثبيت
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstallPrompt;

