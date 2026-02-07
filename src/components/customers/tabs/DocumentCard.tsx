import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileImage, Eye, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { CustomerDocument } from './types';

const DocumentCard = ({ doc, index }: { doc: CustomerDocument; index: number }) => {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const isImage = doc.file_path?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || 
                 doc.document_name?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);

  React.useEffect(() => {
    if (doc.file_path) {
      setIsLoading(true);
      supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600)
        .then(({ data, error }) => {
          if (data?.signedUrl) {
            setFileUrl(data.signedUrl);
          } else if (error) {
            console.error('Error getting signed URL:', error);
          }
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [doc.file_path]);

  const handlePreview = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const handleDownload = async () => {
    if (!fileUrl) return;
    
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.document_name || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="group relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 overflow-hidden hover:border-teal-300 hover:shadow-lg hover:shadow-teal-500/10 transition-all"
    >
      <div className="aspect-square bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center overflow-hidden">
        {isImage && fileUrl ? (
          <img
            src={fileUrl}
            alt={doc.document_name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.nextElementSibling) {
                (target.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div className={`flex-col items-center justify-center ${isImage && fileUrl ? 'hidden' : 'flex'}`}>
          {isLoading ? (
            <RefreshCw className="w-10 h-10 text-teal-400 animate-spin" />
          ) : (
            <FileImage className="w-10 h-10 text-teal-400" />
          )}
        </div>
      </div>
      
      <div className="p-3">
        <p className="text-xs font-medium text-slate-900 truncate mb-1">{doc.document_name}</p>
        <p className="text-[10px] text-slate-500 mb-3">
          {format(new Date(doc.uploaded_at), 'dd/MM/yyyy')}
        </p>
        
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 h-8 text-xs gap-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200 disabled:opacity-50"
            onClick={handlePreview}
            disabled={isLoading || !fileUrl}
          >
            <Eye className="w-3.5 h-3.5" />
            معاينة
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 w-8 p-0 disabled:opacity-50"
            onClick={handleDownload}
            disabled={isLoading || !fileUrl}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default DocumentCard;
