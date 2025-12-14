import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Download, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PDFViewerProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ file, isOpen, onClose }) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              معاينة PDF: {file.name}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* أدوات التحكم */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">
              {zoom}%
            </span>
            <Button size="sm" variant="outline" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              تحميل
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              إغلاق
            </Button>
          </div>
        </div>

        {/* منطقة عرض PDF */}
        <div className="flex-1 overflow-auto bg-gray-100 rounded-lg p-4">
          <div 
            className="mx-auto bg-white shadow-lg"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center',
              transition: 'transform 0.2s ease-in-out'
            }}
          >
            {/* هنا يمكن إضافة مكتبة عرض PDF مثل react-pdf */}
            <div className="w-full h-[600px] flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-600">معاينة PDF</p>
                <p className="text-sm text-gray-500 mt-2">
                  لعرض محتوى PDF الفعلي، يتطلب تثبيت مكتبة react-pdf
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  الملف: {file.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* معلومات الملف */}
        <div className="border-t pt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">اسم الملف:</span>
              <p className="truncate">{file.name}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">الحجم:</span>
              <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">النوع:</span>
              <p>{file.type}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">آخر تعديل:</span>
              <p>{new Date(file.lastModified).toLocaleDateString('en-US')}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
