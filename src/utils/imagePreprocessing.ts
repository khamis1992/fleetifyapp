/**
 * Advanced Image Preprocessing Utilities
 * Phase 2 Priority: Enhance OCR accuracy through image optimization
 */

export interface PreprocessingOptions {
  enhanceContrast?: boolean;
  reduceNoise?: boolean;
  sharpenText?: boolean;
  normalizeSize?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Enhance image contrast for better OCR recognition
 */
function enhanceContrast(imageData: ImageData, factor: number = 1.5): ImageData {
  const data = imageData.data;
  const contrast = factor * 255;
  const intercept = 128 * (1 - factor);

  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast to RGB channels
    data[i] = Math.max(0, Math.min(255, data[i] * factor + intercept));     // Red
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor + intercept)); // Green
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor + intercept)); // Blue
    // Alpha channel remains unchanged
  }

  return imageData;
}

/**
 * Apply noise reduction using a simple blur filter
 */
function reduceNoise(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // Simple 3x3 blur kernel
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const kernelSum = kernel.reduce((sum, val) => sum + val, 0);

  const newData = new Uint8ClampedArray(data.length);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB channels only
        let sum = 0;
        let kernelIndex = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[pixelIndex] * kernel[kernelIndex];
            kernelIndex++;
          }
        }

        const outputIndex = (y * width + x) * 4 + c;
        newData[outputIndex] = Math.round(sum / kernelSum);
      }
      // Copy alpha channel
      const alphaIndex = (y * width + x) * 4 + 3;
      newData[alphaIndex] = data[alphaIndex];
    }
  }

  // Copy edges
  for (let i = 0; i < data.length; i += 4) {
    const x = Math.floor(i / 4) % width;
    const y = Math.floor(i / (4 * width));
    
    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
      newData[i] = data[i];
      newData[i + 1] = data[i + 1];
      newData[i + 2] = data[i + 2];
      newData[i + 3] = data[i + 3];
    }
  }

  const newImageData = new ImageData(newData, width, height);
  ctx.putImageData(newImageData, 0, 0);
  return canvas;
}

/**
 * Apply text sharpening for better character recognition
 */
function sharpenText(imageData: ImageData): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Sharpening kernel
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  const newData = new Uint8ClampedArray(data.length);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB channels
        let sum = 0;
        let kernelIndex = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[pixelIndex] * kernel[kernelIndex];
            kernelIndex++;
          }
        }

        const outputIndex = (y * width + x) * 4 + c;
        newData[outputIndex] = Math.max(0, Math.min(255, sum));
      }
      // Copy alpha channel
      const alphaIndex = (y * width + x) * 4 + 3;
      newData[alphaIndex] = data[alphaIndex];
    }
  }

  return new ImageData(newData, width, height);
}

/**
 * Normalize image size for consistent OCR processing
 */
function normalizeSize(canvas: HTMLCanvasElement, maxWidth: number, maxHeight: number): HTMLCanvasElement {
  const { width, height } = canvas;
  
  // Calculate new dimensions maintaining aspect ratio
  let newWidth = width;
  let newHeight = height;

  if (width > maxWidth || height > maxHeight) {
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);

    newWidth = Math.round(width * ratio);
    newHeight = Math.round(height * ratio);
  }

  if (newWidth !== width || newHeight !== height) {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = newWidth;
    newCanvas.height = newHeight;

    const newCtx = newCanvas.getContext('2d')!;
    newCtx.imageSmoothingEnabled = true;
    newCtx.imageSmoothingQuality = 'high';
    newCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

    return newCanvas;
  }

  return canvas;
}

/**
 * Main preprocessing function
 */
export async function preprocessImage(
  file: File, 
  options: PreprocessingOptions = {}
): Promise<{ 
  processedFile: File; 
  originalSize: number; 
  processedSize: number; 
  improvements: string[] 
}> {
  const {
    enhanceContrast: shouldEnhanceContrast = true,
    reduceNoise: shouldReduceNoise = true,
    sharpenText: shouldSharpenText = true,
    normalizeSize: shouldNormalizeSize = true,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.92
  } = options;

  const improvements: string[] = [];
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        let processedCanvas = canvas;

        // Apply size normalization first
        if (shouldNormalizeSize) {
          processedCanvas = normalizeSize(processedCanvas, maxWidth, maxHeight);
          improvements.push(`Resized to ${processedCanvas.width}x${processedCanvas.height}`);
        }

        const ctx2 = processedCanvas.getContext('2d')!;
        let imageData = ctx2.getImageData(0, 0, processedCanvas.width, processedCanvas.height);

        // Apply contrast enhancement
        if (shouldEnhanceContrast) {
          imageData = enhanceContrast(imageData, 1.3);
          improvements.push('Enhanced contrast for better text visibility');
        }

        // Apply text sharpening
        if (shouldSharpenText) {
          imageData = sharpenText(imageData);
          improvements.push('Applied text sharpening filter');
        }

        // Apply the processed image data back to canvas
        ctx2.putImageData(imageData, 0, 0);

        // Apply noise reduction (works on canvas directly)
        if (shouldReduceNoise) {
          processedCanvas = reduceNoise(processedCanvas);
          improvements.push('Reduced image noise');
        }

        // Convert back to file
        processedCanvas.toBlob(
          (blob) => {
            if (blob) {
              const processedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: file.lastModified
              });

              resolve({
                processedFile,
                originalSize,
                processedSize: processedFile.size,
                improvements
              });
            } else {
              reject(new Error('Failed to create processed image blob'));
            }
          },
          file.type,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Quick preprocessing for real-time use
 */
export async function quickPreprocess(file: File): Promise<File> {
  try {
    const result = await preprocessImage(file, {
      enhanceContrast: true,
      reduceNoise: false, // Skip for speed
      sharpenText: true,
      normalizeSize: true,
      maxWidth: 1600,
      maxHeight: 1200,
      quality: 0.9
    });
    
    return result.processedFile;
  } catch (error) {
    console.warn('Image preprocessing failed, using original:', error);
    return file;
  }
}

/**
 * Get image analysis for debugging
 */
export function analyzeImage(file: File): Promise<{
  dimensions: { width: number; height: number };
  size: number;
  type: string;
  aspectRatio: number;
  recommended: string[];
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const dimensions = { width: img.width, height: img.height };
      const aspectRatio = img.width / img.height;
      const recommended: string[] = [];

      // Analysis recommendations
      if (img.width > 2000 || img.height > 2000) {
        recommended.push('Consider resizing for faster processing');
      }
      if (file.size > 5 * 1024 * 1024) {
        recommended.push('Image size is large, compression recommended');
      }
      if (aspectRatio > 3 || aspectRatio < 0.33) {
        recommended.push('Unusual aspect ratio detected, check image orientation');
      }

      resolve({
        dimensions,
        size: file.size,
        type: file.type,
        aspectRatio,
        recommended
      });
    };

    img.onerror = () => reject(new Error('Failed to analyze image'));
    img.src = URL.createObjectURL(file);
  });
}