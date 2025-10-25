/**
 * SignatureInput Component
 *
 * Purpose: Capture customer signature for vehicle inspections
 * Features:
 * - Canvas-based signature drawing
 * - Clear/reset functionality
 * - Convert to base64 for storage
 * - Fallback text input option
 *
 * @module components/ui/SignatureInput
 */

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eraser, Check, Pen } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SignatureInput Props
 */
interface SignatureInputProps {
  /** Callback when signature changes */
  onSignatureChange: (signature: string | null) => void;
  /** Label for the signature field */
  label?: string;
  /** Whether signature is required */
  required?: boolean;
  /** Initial signature value (base64) */
  defaultValue?: string | null;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
}

/**
 * SignatureInput Component
 *
 * Provides two methods for capturing signatures:
 * 1. Canvas drawing (primary)
 * 2. Text input (fallback)
 *
 * @example
 * <SignatureInput
 *   onSignatureChange={(sig) => setSignature(sig)}
 *   label="توقيع العميل"
 *   required
 * />
 */
export function SignatureInput({
  onSignatureChange,
  label = 'التوقيع',
  required = false,
  defaultValue = null,
  width = 400,
  height = 200,
}: SignatureInputProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [textSignature, setTextSignature] = useState('');
  const [signatureMode, setSignatureMode] = useState<'draw' | 'text'>('draw');

  /**
   * Initialize canvas
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load default value if provided
    if (defaultValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = defaultValue;
    }
  }, [width, height, defaultValue]);

  /**
   * Start drawing
   */
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  /**
   * Draw on canvas
   */
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  /**
   * Stop drawing and capture signature
   */
  const stopDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    setHasSignature(true);

    // Convert canvas to base64
    const canvas = canvasRef.current;
    if (canvas) {
      const base64Signature = canvas.toDataURL('image/png');
      onSignatureChange(base64Signature);
    }
  };

  /**
   * Clear canvas
   */
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(null);
  };

  /**
   * Handle text signature
   */
  const handleTextSignature = (text: string) => {
    setTextSignature(text);

    if (!text.trim()) {
      onSignatureChange(null);
      return;
    }

    // Create a simple text-based signature image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw text signature
      ctx.fillStyle = '#000000';
      ctx.font = '32px cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      const base64Signature = canvas.toDataURL('image/png');
      onSignatureChange(base64Signature);
    }
  };

  /**
   * Confirm text signature
   */
  const confirmTextSignature = () => {
    if (textSignature.trim()) {
      handleTextSignature(textSignature);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="signature">
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </Label>

      <Tabs value={signatureMode} onValueChange={(v) => setSignatureMode(v as 'draw' | 'text')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw" className="flex items-center gap-2">
            <Pen className="h-4 w-4" />
            رسم التوقيع
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            كتابة التوقيع
          </TabsTrigger>
        </TabsList>

        {/* Canvas Drawing Mode */}
        <TabsContent value="draw" className="space-y-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <canvas
                  ref={canvasRef}
                  className={cn(
                    'border-2 border-dashed rounded-md cursor-crosshair',
                    hasSignature ? 'border-green-500' : 'border-gray-300'
                  )}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{ touchAction: 'none' }}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                    className="flex items-center gap-2"
                  >
                    <Eraser className="h-4 w-4" />
                    مسح
                  </Button>

                  {hasSignature && (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="flex items-center gap-2"
                      disabled
                    >
                      <Check className="h-4 w-4" />
                      تم التوقيع
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  ارسم توقيعك في المربع أعلاه باستخدام الماوس
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Text Input Mode */}
        <TabsContent value="text" className="space-y-2">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="اكتب اسمك كتوقيع"
                    value={textSignature}
                    onChange={(e) => setTextSignature(e.target.value)}
                    className="text-2xl font-cursive text-center"
                    style={{ fontFamily: 'cursive' }}
                  />
                </div>

                {textSignature.trim() && (
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-8 bg-white">
                    <p
                      className="text-4xl text-center"
                      style={{ fontFamily: 'cursive' }}
                    >
                      {textSignature}
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={confirmTextSignature}
                  disabled={!textSignature.trim()}
                  className="w-full"
                >
                  <Check className="mr-2 h-4 w-4" />
                  تأكيد التوقيع
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  اكتب اسمك وسيتم تحويله إلى توقيع
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
