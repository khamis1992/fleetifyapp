import React, { useState } from 'react';
import {
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ErrorMessage } from '@/lib/errorHandler';

interface ImprovedErrorDisplayProps {
  error: Error | string | null;
  errorMessage: ErrorMessage;
  onRetry?: () => void | Promise<void>;
  onNavigate?: (path: string) => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
  retryCount?: number;
}

/**
 * Improved Error Display Component
 * Shows user-friendly error messages with suggestions
 */
export const ImprovedErrorDisplay: React.FC<ImprovedErrorDisplayProps> = ({
  error,
  errorMessage,
  onRetry,
  onNavigate,
  onDismiss,
  isRetrying = false,
  retryCount = 0
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
  const severityColor = {
    low: 'border-blue-200 bg-blue-50',
    medium: 'border-yellow-200 bg-yellow-50',
    high: 'border-orange-200 bg-orange-50',
    critical: 'border-red-200 bg-red-50'
  };

  const severityIcon = {
    low: 'text-blue-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600'
  };

  const handleCopyError = () => {
    const errorText = typeof error === 'string' ? error : error?.message || 'Unknown error';
    navigator.clipboard.writeText(`${errorId}\n${errorText}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleContact = (method: 'email' | 'phone' | 'chat') => {
    const supportInfo = {
      email: 'mailto:support@fleetify.app?subject=خطأ في التطبيق - ' + errorId,
      phone: 'tel:+97444815555',
      chat: 'https://fleetify.app/support/chat'
    };
    window.open(supportInfo[method], '_blank');
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Main Error Alert */}
      <Alert className={cn('border-l-4', severityColor[errorMessage.severity])}>
        <div className="flex gap-4">
          <AlertCircle className={cn('h-5 w-5 mt-0.5 flex-shrink-0', severityIcon[errorMessage.severity])} />
          <div className="flex-1 min-w-0">
            <AlertTitle className="text-lg font-semibold mb-1">{errorMessage.title}</AlertTitle>
            <AlertDescription className="text-sm mb-3">{errorMessage.description}</AlertDescription>

            {/* Suggestions */}
            {errorMessage.suggestions.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">اقتراحات:</p>
                <ul className="space-y-1 text-xs">
                  {errorMessage.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Error ID and Details Toggle */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>رمز الخطأ:</span>
                <code className="bg-muted px-2 py-1 rounded font-mono text-xs">{errorId}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={handleCopyError}
                >
                  {copiedId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              {error && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                  {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>

            {/* Error Details */}
            {showDetails && error && (
              <div className="mt-3 p-3 bg-muted rounded text-xs font-mono text-muted-foreground overflow-auto max-h-40">
                <pre>{typeof error === 'string' ? error : error.message}</pre>
              </div>
            )}
          </div>
        </div>
      </Alert>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-end">
        {errorMessage.retryable && onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            variant="default"
            size="sm"
            className="gap-2"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                جاري الإعادة... ({retryCount}/{errorMessage.maxRetries})
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                حاول مجدداً
              </>
            )}
          </Button>
        )}

        {errorMessage.action === 'reload' && (
          <Button
            onClick={() => window.location.reload()}
            variant="default"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة تحميل
          </Button>
        )}

        {errorMessage.action === 'navigate' && onNavigate && (
          <Button
            onClick={() => onNavigate('/dashboard')}
            variant="default"
            size="sm"
          >
            العودة للرئيسية
          </Button>
        )}

        {errorMessage.action === 'contact_support' && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleContact('email')}
              variant="outline"
              size="sm"
              className="gap-1"
              title="البريد الإلكتروني"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">بريد</span>
            </Button>
            <Button
              onClick={() => handleContact('phone')}
              variant="outline"
              size="sm"
              className="gap-1"
              title="الهاتف"
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">هاتف</span>
            </Button>
            <Button
              onClick={() => handleContact('chat')}
              variant="outline"
              size="sm"
              className="gap-1"
              title="الدردشة"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">دردشة</span>
            </Button>
          </div>
        )}

        {onDismiss && (
          <Button
            onClick={onDismiss}
            variant="outline"
            size="sm"
          >
            إغلاق
          </Button>
        )}
      </div>

      {/* Support Information */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            تحتاج إلى مساعدة؟
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <a href="mailto:support@fleetify.app" className="text-primary hover:underline">
              support@fleetify.app
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <a href="tel:+97444815555" className="text-primary hover:underline">
              +974 4481 5555
            </a>
          </div>
          <div className="text-muted-foreground">
            ⏰ السبت - الخميس: 9:00 - 17:00
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImprovedErrorDisplay;
