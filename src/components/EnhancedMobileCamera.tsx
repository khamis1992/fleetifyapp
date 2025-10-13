/**
 * Enhanced Mobile Camera Component
 * Phase 2 Priority: Advanced mobile camera integration with auto-focus
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Camera, 
  RotateCcw, 
  FlashlightIcon as Flashlight, 
  Focus, 
  Grid3X3,
  Smartphone,
  Maximize2,
  CheckCircle,
  AlertTriangle,
  Settings,
  Zap
} from 'lucide-react';

interface EnhancedMobileCameraProps {
  onImageCapture: (file: File) => void;
  isProcessing: boolean;
  enablePreprocessing: boolean;
  preprocessingOptions: {
    enhanceContrast: boolean;
    reduceNoise: boolean;
    sharpenText: boolean;
    normalizeSize: boolean;
  };
}

const EnhancedMobileCamera: React.FC<EnhancedMobileCameraProps> = ({
  onImageCapture,
  isProcessing,
  enablePreprocessing,
  preprocessingOptions
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);
  const [captureQuality, setCaptureQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [deviceInfo, setDeviceInfo] = useState<{
    isMobile: boolean;
    hasCamera: boolean;
    orientation: 'portrait' | 'landscape';
  }>({
    isMobile: false,
    hasCamera: false,
    orientation: 'portrait'
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Detect device capabilities
  useEffect(() => {
    const checkDeviceCapabilities = async () => {
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      let hasCamera = false;
      
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        hasCamera = devices.some(device => device.kind === 'videoinput');
      } catch (error) {
        console.warn('Could not enumerate devices:', error);
      }

      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

      setDeviceInfo({ isMobile, hasCamera, orientation });
    };

    checkDeviceCapabilities();

    // Listen for orientation changes
    const handleOrientationChange = () => {
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      setDeviceInfo(prev => ({ ...prev, orientation }));
    };

    window.addEventListener('resize', handleOrientationChange);
    return () => window.removeEventListener('resize', handleOrientationChange);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setIsStreaming(true);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: captureQuality === 'high' ? 1920 : captureQuality === 'medium' ? 1280 : 640 },
          height: { ideal: captureQuality === 'high' ? 1080 : captureQuality === 'medium' ? 720 : 480 },
          focusMode: autoFocusEnabled ? 'continuous' : 'manual'
        } as MediaTrackConstraints,
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check for flash capability
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      setHasFlash(!!capabilities.torch);

      setIsStreaming(true);
    } catch (error) {
      console.error('Error starting camera:', error);
      setIsStreaming(false);
    }
  }, [facingMode, autoFocusEnabled, captureQuality]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current || !hasFlash) return;

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      await videoTrack.applyConstraints({
        advanced: [{ torch: !flashEnabled }]
      } as MediaTrackConstraints);
      setFlashEnabled(!flashEnabled);
    } catch (error) {
      console.error('Error toggling flash:', error);
    }
  }, [flashEnabled, hasFlash]);

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    if (isStreaming) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  }, [isStreaming, startCamera, stopCamera]);

  // Capture photo with enhanced mobile optimization
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply mobile-specific optimizations
    if (deviceInfo.isMobile) {
      // Auto-rotate for portrait mode
      if (deviceInfo.orientation === 'portrait' && facingMode === 'environment') {
        // Rotate for better document scanning
        const rotatedCanvas = document.createElement('canvas');
        const rotatedCtx = rotatedCanvas.getContext('2d');
        
        if (rotatedCtx) {
          rotatedCanvas.width = canvas.height;
          rotatedCanvas.height = canvas.width;
          
          rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
          rotatedCtx.rotate(Math.PI / 2);
          rotatedCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
          
          // Copy back to main canvas
          canvas.width = rotatedCanvas.width;
          canvas.height = rotatedCanvas.height;
          ctx.drawImage(rotatedCanvas, 0, 0);
        }
      }

      // Apply sharpening for mobile cameras
      if (enablePreprocessing && preprocessingOptions.sharpenText) {
        applyMobileSharpening(ctx, canvas.width, canvas.height);
      }
    }

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `invoice_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onImageCapture(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  }, [isStreaming, deviceInfo, facingMode, enablePreprocessing, preprocessingOptions, onImageCapture, stopCamera]);

  // Apply mobile-specific sharpening
  const applyMobileSharpening = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Simple sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    const newData = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const idx = (y * width + x) * 4 + c;
          newData[idx] = Math.max(0, Math.min(255, sum));
        }
      }
    }

    imageData.data.set(newData);
    ctx.putImageData(imageData, 0, 0);
  };

  // Auto-focus trigger for mobile
  const triggerAutoFocus = useCallback(async () => {
    if (!streamRef.current || !autoFocusEnabled) return;

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      // Trigger focus by temporarily changing focus mode
      await videoTrack.applyConstraints({
        focusMode: 'single-shot'
      } as MediaTrackConstraints);
      
      setTimeout(() => {
        videoTrack.applyConstraints({
          focusMode: 'continuous'
        } as MediaTrackConstraints);
      }, 1000);
    } catch (error) {
      console.error('Error triggering auto-focus:', error);
    }
  }, [autoFocusEnabled]);

  return (
    <div className="space-y-4">
      {/* Device Info Banner */}
      {deviceInfo.isMobile && (
        <Alert>
          <Smartphone className="h-4 w-4" />
          <AlertDescription>
            تم اكتشاف جهاز محمول - تم تفعيل التحسينات الخاصة بالهاتف المحمول
            {deviceInfo.orientation === 'portrait' ? ' (الوضع العمودي)' : ' (الوضع الأفقي)'}
          </AlertDescription>
        </Alert>
      )}

      {/* Camera Controls */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          onClick={isStreaming ? stopCamera : startCamera}
          disabled={isProcessing || !deviceInfo.hasCamera}
          className={isStreaming ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
        >
          <Camera className="h-4 w-4 mr-2" />
          {isStreaming ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}
        </Button>

        {isStreaming && (
          <>
            <Button onClick={switchCamera} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-1" />
              تبديل
            </Button>

            {hasFlash && (
              <Button 
                onClick={toggleFlash} 
                variant={flashEnabled ? "default" : "outline"}
                size="sm"
              >
                <Flashlight className="h-4 w-4 mr-1" />
                فلاش
              </Button>
            )}

            <Button onClick={triggerAutoFocus} variant="outline" size="sm">
              <Focus className="h-4 w-4 mr-1" />
              تركيز
            </Button>

            <Button 
              onClick={() => setShowGrid(!showGrid)} 
              variant={showGrid ? "default" : "outline"}
              size="sm"
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              شبكة
            </Button>
          </>
        )}
      </div>

      {/* Quality Settings */}
      <div className="flex justify-center gap-2 text-sm">
        <Badge 
          variant={captureQuality === 'high' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setCaptureQuality('high')}
        >
          عالي الجودة
        </Badge>
        <Badge 
          variant={captureQuality === 'medium' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setCaptureQuality('medium')}
        >
          جودة متوسطة
        </Badge>
        <Badge 
          variant={captureQuality === 'low' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setCaptureQuality('low')}
        >
          جودة منخفضة
        </Badge>
      </div>

      {/* Camera Preview */}
      <div className="relative">
        {isStreaming ? (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-96 object-cover"
              style={{
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none'
              }}
            />
            
            {/* Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <defs>
                    <pattern id="grid" width="33.33" height="33.33" patternUnits="userSpaceOnUse">
                      <path d="M 33.33 0 L 0 0 0 33.33" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100" height="100" fill="url(#grid)" />
                </svg>
              </div>
            )}

            {/* Focus Ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-16 h-16 border-2 border-white rounded-full ${autoFocusEnabled ? 'animate-pulse' : ''}`} />
            </div>

            {/* Capture Button */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <Button
                onClick={capturePhoto}
                disabled={isProcessing}
                size="lg"
                className="rounded-full bg-white text-black hover:bg-gray-100 w-16 h-16"
              >
                {isProcessing ? (
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
            <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">كاميرا محسنة للهاتف المحمول</p>
            <p className="text-sm text-muted-foreground mb-4">
              مع تركيز تلقائي، تحسين الإضاءة، وتحسينات خاصة بالهاتف المحمول
            </p>
            
            {!deviceInfo.hasCamera && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  لم يتم اكتشاف كاميرا. يرجى التأكد من أذونات الكاميرا.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>

      {/* Processing Features */}
      {enablePreprocessing && (
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-800 text-sm font-medium mb-2">
            <Zap className="h-4 w-4" />
            ميزات التحسين المفعلة
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
            {preprocessingOptions.enhanceContrast && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                تحسين التباين
              </div>
            )}
            {preprocessingOptions.sharpenText && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                توضيح النص
              </div>
            )}
            {preprocessingOptions.reduceNoise && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                إزالة التشويش
              </div>
            )}
            {preprocessingOptions.normalizeSize && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                تطبيع الحجم
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Tips */}
      <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 space-y-1">
        <p className="font-medium">💡 نصائح للحصول على أفضل النتائج:</p>
        <p>• اجعل الفاتورة تملأ إطار الكاميرا</p>
        <p>• تأكد من الإضاءة الجيدة أو استخدم الفلاش</p>
        <p>• اضغط على زر التركيز إذا لم يكن النص واضحاً</p>
        <p>• استخدم الشبكة للحصول على زاوية مثالية</p>
        {deviceInfo.isMobile && (
          <p>• أمسك الهاتف في الوضع العمودي لأفضل النتائج</p>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default EnhancedMobileCamera;