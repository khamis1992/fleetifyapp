/**
 * Image Preview Dialog Component
 * Displays images in a modal dialog for preview without downloading
 */

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImagePreviewDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Image URL or storage path to preview */
  imageUrl?: string | null;
  /** Alt text for the image */
  alt?: string;
  /** Whether to show download button */
  showDownload?: boolean;
  /** File name for download (if different from alt) */
  fileName?: string;
}

export function ImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  alt = 'Preview',
  showDownload = true,
  fileName,
}: ImagePreviewDialogProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  // Generate public URL when imageUrl changes
  useState(() => {
    const fetchPublicUrl = async () => {
      if (!imageUrl) {
        setPublicUrl(null);
        return;
      }

      // If it's already a full URL (starts with http), use it directly
      if (imageUrl.startsWith('http')) {
        setPublicUrl(imageUrl);
        return;
      }

      // Otherwise, treat it as a storage path and get public URL
      try {
        const { data } = supabase.storage.from('documents').getPublicUrl(imageUrl);
        setPublicUrl(data.publicUrl);
      } catch (error) {
        console.error('Error getting public URL:', error);
        toast.error('فشل في تحميل الصورة');
      }
    };

    fetchPublicUrl();
  }, [imageUrl]);

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      // If it's a storage path, download from storage
      if (!imageUrl.startsWith('http')) {
        const { data, error } = await supabase.storage
          .from('documents')
          .download(imageUrl);

        if (error) throw error;

        const url = URL.createObjectURL(data);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = fileName || alt || 'image';
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // If it's already a URL, open in new tab or download
        window.open(imageUrl, '_blank');
      }
      toast.success('تم تحميل الصورة');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('فشل تحميل الصورة');
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 gap-0 bg-black/95">
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <h3 className="text-white text-lg font-medium truncate mr-12">{alt}</h3>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:text-white hover:bg-white/20"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <span className="text-white text-sm min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:text-white hover:bg-white/20"
              onClick={handleZoomIn}
              disabled={scale >= 3}
            >
              <ZoomIn className="w-5 h-5" />
            </Button>

            {/* Rotate button */}
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:text-white hover:bg-white/20"
              onClick={handleRotate}
            >
              <RotateCw className="w-5 h-5" />
            </Button>

            {/* Reset button */}
            {(scale !== 1 || rotation !== 0) && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:text-white hover:bg-white/20"
                onClick={handleReset}
              >
                إعادة تعيين
              </Button>
            )}

            {/* Download button */}
            {showDownload && (
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:text-white hover:bg-white/20"
                onClick={handleDownload}
              >
                <Download className="w-5 h-5" />
              </Button>
            )}

            {/* Close button */}
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:text-white hover:bg-white/20"
              onClick={handleClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Image container */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {publicUrl ? (
            <img
              src={publicUrl}
              alt={alt}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
              }}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                toast.error('فشل تحميل الصورة');
              }}
            />
          ) : (
            <div className="text-white/60 text-center p-8">
              <p>لا توجد صورة للعرض</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white/60 text-xs text-center">
            استخدم عجلة الماوس للتكبير والتصغير • اسحب لتحريك الصورة
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImagePreviewDialog;
