/**
 * Optional Documents Component
 * مكون المستندات الاختيارية
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DocumentItem } from './DocumentItem';
import { useLawsuitPreparationContext, type DocumentsState } from '../../store';

export function OptionalDocs() {
  const { state, actions } = useLawsuitPreparationContext();
  const { documents, trafficViolations, ui } = state;
  
  // Filter optional documents
  const optionalDocs = [
    documents.violations,
    documents.criminalComplaint,
    documents.violationsTransfer,
  ].filter(doc => {
    // Only show violations-related docs if there are violations
    if (['violations', 'violationsTransfer'].includes(doc.id)) {
      return trafficViolations.length > 0;
    }
    return doc.type === 'optional';
  });
  
  // Don't render if no optional docs to show
  if (optionalDocs.length === 0) return null;
  
  const handleGenerateDocument = (docId: keyof DocumentsState) => {
    actions.generateDocument(docId);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-6"
    >
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            مستندات داعمة (اختياري)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {optionalDocs.map((doc, index) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              index={index}
              onGenerate={doc.category === 'generated' ? () => handleGenerateDocument(doc.id as keyof DocumentsState) : undefined}
            />
          ))}
          
          {/* Include in Portfolio Options */}
          <Separator className="my-4" />
          
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">تضمين في حافظة المستندات:</p>
            
            <label className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              documents.criminalComplaint.status === 'ready' 
                ? 'hover:bg-muted/50 cursor-pointer' 
                : 'opacity-50 cursor-not-allowed'
            }`}>
              <input
                type="checkbox"
                checked={ui.includeCriminalComplaint}
                onChange={(e) => actions.setIncludeCriminalComplaint(e.target.checked)}
                disabled={documents.criminalComplaint.status !== 'ready'}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
              />
              <div>
                <span className="text-sm font-medium">بلاغ سرقة المركبة</span>
                <p className="text-xs text-muted-foreground">
                  {documents.criminalComplaint.status === 'ready' 
                    ? '✅ جاهز للتضمين' 
                    : '⏳ يجب توليده أولاً'}
                </p>
              </div>
            </label>
            
            {trafficViolations.length > 0 && (
              <label className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                documents.violationsTransfer.status === 'ready' 
                  ? 'hover:bg-muted/50 cursor-pointer' 
                  : 'opacity-50 cursor-not-allowed'
              }`}>
                <input
                  type="checkbox"
                  checked={ui.includeViolationsTransfer}
                  onChange={(e) => actions.setIncludeViolationsTransfer(e.target.checked)}
                  disabled={documents.violationsTransfer.status !== 'ready'}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                />
                <div>
                  <span className="text-sm font-medium">طلب تحويل المخالفات</span>
                  <p className="text-xs text-muted-foreground">
                    {documents.violationsTransfer.status === 'ready' 
                      ? '✅ جاهز للتضمين' 
                      : '⏳ يجب توليده أولاً'}
                  </p>
                </div>
              </label>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default OptionalDocs;
