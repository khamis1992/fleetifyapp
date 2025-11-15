import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Pen, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react'

interface ContractSignatureProps {
  title: string
  signerName: string
  signerRole: string
  onSignature: (signatureData: string) => void
  signature?: string
  required?: boolean
}

export const ContractSignature: React.FC<ContractSignatureProps> = ({
  title,
  signerName,
  signerRole,
  onSignature,
  signature,
  required = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(!!signature)

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Convert canvas to base64 and save signature
    const signatureData = canvas.toDataURL('image/png')
    onSignature(signatureData)
    setHasSigned(true)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onSignature('')
    setHasSigned(false)
  }

  useEffect(() => {
    if (signature && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setHasSigned(true)
      }
      img.src = signature
    }
  }, [signature])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Pen className="h-5 w-5" />
          {title}
          {hasSigned && <CheckCircle className="h-5 w-5 text-green-600" />}
          {required && !hasSigned && <AlertTriangle className="h-5 w-5 text-amber-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">الاسم:</span> {signerName}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">الصفة:</span> {signerRole}
          </p>
        </div>

        <div className="space-y-3">
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-1">
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              className="w-full h-48 border border-border rounded cursor-crosshair bg-background"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
          
          <div className="flex gap-2 justify-between">
            <p className="text-xs text-muted-foreground self-center">
              قم بالرسم في المربع أعلاه للتوقيع
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSignature}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              مسح التوقيع
            </Button>
          </div>
        </div>

        {hasSigned && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              تم التوقيع بنجاح
            </AlertDescription>
          </Alert>
        )}

        {required && !hasSigned && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              التوقيع مطلوب لإتمام العقد
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}