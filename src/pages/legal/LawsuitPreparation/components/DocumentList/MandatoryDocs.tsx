/**
 * Mandatory Documents Component
 * مكون المستندات الإلزامية
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderDown } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DocumentItem } from './DocumentItem';
import { useLawsuitPreparationContext, type DocumentsState } from '../../store';

export function MandatoryDocs() {
  const { state, actions } = useLawsuitPreparationContext();
  const { documents, ui } = state;
  
  // Filter mandatory documents
  const mandatoryDocs = [
    documents.memo,
    documents.claims,
    documents.docsList,
    documents.contract,
    documents.commercialRegister,
    documents.ibanCertificate,
    documents.representativeId,
  ].filter(doc => doc.type === 'mandatory');
  
  const hasContentForZip = mandatoryDocs.some(d => d.status === 'ready');
  
  const handleGenerateDocument = (docId: keyof DocumentsState) => {
    actions.generateDocument(docId);
  };
  
  const handleUploadDocument = (docId: keyof DocumentsState, file: File) => {
    actions.uploadDocument(docId, file);
  };
  
  const handleDownloadMemoPdf = () => {
    actions.downloadMemoPdf();
  };
  
  const handleDownloadMemoDocx = () => {
    actions.downloadMemoDocx();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-6"
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              المستندات الإلزامية
              <Badge variant="secondary" className="mr-2">
                {ui.progress.ready}/{ui.progress.total}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={actions.downloadAllAsZip}
              disabled={!hasContentForZip || ui.isDownloadingZip}
            >
              {ui.isDownloadingZip ? (
                <>
                  <LoadingSpinner className="h-4 w-4 ml-2" />
                  جاري التحميل...
                </>
              ) : (
                <>
                  <FolderDown className="h-4 w-4 ml-2" />
                  تحميل الكل ZIP
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {mandatoryDocs.map((doc, index) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              index={index}
              onGenerate={doc.category === 'generated' ? () => handleGenerateDocument(doc.id as keyof DocumentsState) : undefined}
              onUpload={doc.category === 'contract' ? (file) => handleUploadDocument(doc.id as keyof DocumentsState, file) : undefined}
              onDownloadPdf={doc.id === 'memo' ? handleDownloadMemoPdf : undefined}
              onDownloadDocx={doc.id === 'memo' ? handleDownloadMemoDocx : undefined}
            />
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default MandatoryDocs;
