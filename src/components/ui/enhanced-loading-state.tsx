import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface EnhancedLoadingStateProps {
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  timeoutDuration?: number;
  emptyStateMessage?: string;
  hasData?: boolean;
  dataLength?: number;
}

export const EnhancedLoadingState = ({
  isLoading,
  error,
  onRetry,
  timeoutDuration = 15000, // 15 seconds
  emptyStateMessage = "لا توجد بيانات للعرض",
  hasData = false,
  dataLength = 0
}: EnhancedLoadingStateProps) => {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setConnectionStatus(true);
    const handleOffline = () => setConnectionStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isLoading && !hasTimedOut) {
      const timer = setTimeout(() => {
        setHasTimedOut(true);
      }, timeoutDuration);

      return () => clearTimeout(timer);
    }
  }, [isLoading, hasTimedOut, timeoutDuration]);

  // Reset timeout when loading restarts
  useEffect(() => {
    if (isLoading) {
      setHasTimedOut(false);
    }
  }, [isLoading]);

  // Show connection error
  if (!connectionStatus) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <WifiOff className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-destructive">
            لا يوجد اتصال بالإنترنت
          </h3>
          <p className="text-muted-foreground text-center mb-4">
            يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى
          </p>
          <Button onClick={onRetry} disabled={!onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            المحاولة مرة أخرى
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show regular error state
  if (error && !isLoading) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-destructive">
            حدث خطأ أثناء تحميل البيانات
          </h3>
          <p className="text-muted-foreground text-center mb-4">
            {error.message || "خطأ غير معروف"}
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              المحاولة مرة أخرى
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show timeout warning during loading
  if (isLoading && hasTimedOut) {
    return (
      <Card className="border-warning/50 bg-warning-light/10">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex items-center justify-center mb-4">
            <LoadingSpinner size="lg" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-warning">
            التحميل يستغرق وقتاً أطول من المعتاد
          </h3>
          <p className="text-muted-foreground text-center mb-4">
            يرجى الانتظار قليلاً أو المحاولة مرة أخرى
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              <LoadingSpinner size="sm" className="mr-2" />
              جاري التحميل...
            </Button>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                إعادة المحاولة
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show regular loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground mt-4">جاري تحميل البيانات...</p>
        </CardContent>
      </Card>
    );
  }

  // Show empty state
  if (!hasData || dataLength === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-muted-foreground mb-4">
            <Wifi className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-semibold mb-2">لا توجد بيانات</h3>
          <p className="text-muted-foreground text-center">
            {emptyStateMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
};