import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FileSignature, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { useSignatureSettings } from '@/hooks/useSignatureSettings';

interface ElectronicSignatureStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const ElectronicSignatureStatus: React.FC<ElectronicSignatureStatusProps> = ({
  className,
  showDetails = true
}) => {
  const { data: settings, isLoading } = useSignatureSettings();

  if (isLoading) {
    return null;
  }

  const isEnabled = settings?.electronic_signature_enabled ?? true;

  return (
    <Alert className={className} variant={isEnabled ? 'default' : 'destructive'}>
      <div className="flex items-center gap-2">
        {isEnabled ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <FileSignature className="h-4 w-4" />
      </div>
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium mb-1">
              التوقيع الإلكتروني {isEnabled ? 'مفعل' : 'معطل'}
            </p>
            {showDetails && (
              <div className="text-sm space-y-1">
                {isEnabled ? (
                  <>
                    <p>✓ يمكن إنشاء العقود مع التوقيع الإلكتروني</p>
                    {settings?.require_customer_signature && (
                      <p>• يتطلب توقيع العميل</p>
                    )}
                    {settings?.require_company_signature && (
                      <p>• يتطلب توقيع الشركة</p>
                    )}
                  </>
                ) : (
                  <p>يمكن إنشاء العقود بدون مطالبة بالتوقيع الإلكتروني</p>
                )}
              </div>
            )}
          </div>
          <Badge variant={isEnabled ? 'default' : 'secondary'}>
            {isEnabled ? 'مفعل' : 'معطل'}
          </Badge>
        </div>
      </AlertDescription>
    </Alert>
  );
};