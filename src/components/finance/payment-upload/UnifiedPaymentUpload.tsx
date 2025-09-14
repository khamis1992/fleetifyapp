/**
 * نظام رفع المدفوعات الموحد والمبسط
 * يستخدم نمط المعالجة السريعة مع الإصلاح التلقائي
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';
import { FastProcessingMode } from './FastProcessingMode';
import { usePaymentsCSVUpload } from '@/hooks/usePaymentsCSVUpload';

interface UnifiedPaymentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export function UnifiedPaymentUpload({ 
  open, 
  onOpenChange, 
  onUploadComplete 
}: UnifiedPaymentUploadProps) {
  const {
    downloadTemplate,
    paymentFieldTypes,
    paymentRequiredFields
  } = usePaymentsCSVUpload();

  // معالجة نجاح الرفع
  const handleUploadSuccess = async (data: any[]) => {
    onUploadComplete();
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            استيراد المدفوعات
          </DialogTitle>
        </DialogHeader>
        
        <FastProcessingMode 
          onUploadComplete={handleUploadSuccess}
          downloadTemplate={downloadTemplate}
          fieldTypes={paymentFieldTypes}
          requiredFields={paymentRequiredFields}
        />
      </DialogContent>
    </Dialog>
  );
}