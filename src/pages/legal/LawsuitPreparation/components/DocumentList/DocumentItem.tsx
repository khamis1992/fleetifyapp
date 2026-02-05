/**
 * Document Item Component
 * مكون عنصر المستند الواحد
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Eye, 
  Download, 
  Sparkles, 
  RefreshCw, 
  Upload,
  File,
  FileType,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DocumentState, DocumentsState } from '../../store';

interface DocumentItemProps {
  document: DocumentState;
  onGenerate?: () => void;
  onUpload?: (file: File) => void;
  onDownloadPdf?: () => void;
  onDownloadDocx?: () => void;
  index: number;
}

export function DocumentItem({
  document,
  onGenerate,
  onUpload,
  onDownloadPdf,
  onDownloadDocx,
  index,
}: DocumentItemProps) {
  const getStatusIcon = () => {
    switch (document.status) {
      case 'ready':
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case 'missing':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'generating':
        return <LoadingSpinner className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  const getContainerClass = () => {
    switch (document.status) {
      case 'ready':
        return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800';
      case 'missing':
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800';
      default:
        return 'bg-muted/30 border-muted';
    }
  };
  
  const handleDownload = () => {
    // التحقق من صحة الرابط
    if (!document.url || document.url.trim() === '') {
      console.error('Document URL is missing or invalid');
      return;
    }
    
    try {
      if (document.url.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = document.url;
        a.download = `${document.name}.html`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);
      } else {
        // فتح الرابط في نافذة جديدة
        const opened = window.open(document.url, '_blank');
        if (!opened) {
          console.error('Failed to open document URL');
        }
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${getContainerClass()}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {getStatusIcon()}
        <div className="min-w-0">
          <p className="font-medium truncate">{document.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {document.description}
            {document.status === 'error' && document.error && (
              <span className="text-red-500 mr-1">- {document.error.message}</span>
            )}
            {document.uploadError && (
              <span className="text-red-500 mr-1">- {document.uploadError}</span>
            )}
          </p>
        </div>
      </div>
      
      <div className="flex gap-2 flex-shrink-0 mr-2">
        {/* Preview Button */}
        {document.status === 'ready' && document.url && document.url.trim() !== '' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              try {
                const opened = window.open(document.url, '_blank');
                if (!opened) {
                  console.error('Failed to preview document');
                }
              } catch (error) {
                console.error('Error previewing document:', error);
              }
            }}
            title="معاينة"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        
        {/* PDF & Word Download for memo */}
        {document.id === 'memo' && document.status === 'ready' && (
          <>
            {onDownloadPdf && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadPdf}
                title="تحميل PDF"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <File className="h-4 w-4 ml-1" />
                PDF
              </Button>
            )}
            {onDownloadDocx && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadDocx}
                title="تحميل Word"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <FileType className="h-4 w-4 ml-1" />
                Word
              </Button>
            )}
          </>
        )}
        
        {/* Regular Download */}
        {document.status === 'ready' && document.url && document.id !== 'memo' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
        
        {/* Generate Button */}
        {onGenerate && document.category === 'generated' && (
          <Button
            size="sm"
            variant={document.status === 'ready' ? 'ghost' : 'default'}
            onClick={onGenerate}
            disabled={document.status === 'generating'}
          >
            {document.status === 'generating' ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : document.status === 'ready' ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 ml-1" />
                توليد
              </>
            )}
          </Button>
        )}
        
        {/* Upload Button */}
        {onUpload && (
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
              }}
              disabled={document.isUploading}
            />
            <Button 
              size="sm" 
              variant={document.status === 'ready' ? 'ghost' : 'default'}
              disabled={document.isUploading}
              title={document.uploadError || (document.status === 'ready' ? 'تغيير الملف' : 'رفع الملف')}
            >
              {document.isUploading ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                <>
                  <Upload className="h-4 w-4 ml-1" />
                  {document.status === 'ready' ? 'تغيير' : 'رفع'}
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Missing Document Badge */}
        {document.status === 'missing' && document.category === 'company' && (
          <Badge variant="destructive" className="text-xs">
            غير مرفوع
          </Badge>
        )}
      </div>
    </motion.div>
  );
}

export default DocumentItem;
