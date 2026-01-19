/**
 * Image Preprocessing Service for OCR
 * 
 * Optimizes images for better OCR accuracy:
 * - Grayscale conversion
 * - Contrast enhancement
 * - Noise reduction
 * - Sharpening
 * - Optimal resize
 * 
 * All processing is done using Canvas API (no external dependencies)
 */

export interface PreprocessingOptions {
  // Convert to grayscale (improves OCR for colored documents)
  grayscale?: boolean;
  // Increase contrast (0-2, default 1.2)
  contrast?: number;
  // Increase brightness (0-2, default 1.0)
  brightness?: number;
  // Apply sharpening filter
  sharpen?: boolean;
  // Target DPI (higher = better quality, slower)
  targetDPI?: number;
  // Maximum width for processing (for performance)
  maxWidth?: number;
  // Remove noise
  denoise?: boolean;
}

const DEFAULT_OPTIONS: PreprocessingOptions = {
  grayscale: true,
  contrast: 1.3,
  brightness: 1.1,
  sharpen: true,
  targetDPI: 300,
  maxWidth: 2000,
  denoise: false, // Expensive operation
};

/**
 * Preprocess image for OCR
 */
export async function preprocessImage(
  imageDataUrl: string,
  options: PreprocessingOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate target size
        let width = img.width;
        let height = img.height;

        if (opts.maxWidth && width > opts.maxWidth) {
          const ratio = opts.maxWidth / width;
          width = opts.maxWidth;
          height = Math.round(height * ratio);
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Draw original image
        ctx.drawImage(img, 0, 0, width, height);

        // Get image data
        let imageData = ctx.getImageData(0, 0, width, height);

        // Apply transformations
        if (opts.grayscale) {
          imageData = applyGrayscale(imageData);
        }

        if (opts.contrast !== 1 || opts.brightness !== 1) {
          imageData = applyContrastBrightness(imageData, opts.contrast!, opts.brightness!);
        }

        if (opts.denoise) {
          imageData = applyDenoise(imageData, width, height);
        }

        if (opts.sharpen) {
          imageData = applySharpen(imageData, width, height);
        }

        // Put processed data back
        ctx.putImageData(imageData, 0, 0);

        // Export as data URL
        const result = canvas.toDataURL('image/png', 0.95);
        resolve(result);

      } catch (error) {
        console.error('[ImagePreprocessor] Error:', error);
        resolve(imageDataUrl); // Return original on error
      }
    };

    img.onerror = () => {
      console.error('[ImagePreprocessor] Failed to load image');
      resolve(imageDataUrl); // Return original on error
    };

    img.src = imageDataUrl;
  });
}

/**
 * Convert to grayscale
 */
function applyGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Use luminance formula for accurate grayscale
    const gray = Math.round(
      data[i] * 0.299 +     // R
      data[i + 1] * 0.587 + // G
      data[i + 2] * 0.114   // B
    );

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    // Alpha stays the same
  }

  return imageData;
}

/**
 * Apply contrast and brightness adjustments
 */
function applyContrastBrightness(
  imageData: ImageData,
  contrast: number,
  brightness: number
): ImageData {
  const data = imageData.data;
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      // Apply brightness first
      let value = data[i + c] * brightness;

      // Then contrast
      value = factor * (value - 128) + 128;

      // Clamp to valid range
      data[i + c] = Math.max(0, Math.min(255, Math.round(value)));
    }
  }

  return imageData;
}

/**
 * Apply sharpening using convolution
 */
function applySharpen(imageData: ImageData, width: number, height: number): ImageData {
  // Sharpening kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  return applyConvolution(imageData, width, height, kernel);
}

/**
 * Apply noise reduction using median filter
 */
function applyDenoise(imageData: ImageData, width: number, height: number): ImageData {
  const data = imageData.data;
  const result = new Uint8ClampedArray(data);
  const radius = 1;

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      for (let c = 0; c < 3; c++) {
        const neighbors: number[] = [];

        // Collect neighboring pixels
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4 + c;
            neighbors.push(data[idx]);
          }
        }

        // Sort and take median
        neighbors.sort((a, b) => a - b);
        const median = neighbors[Math.floor(neighbors.length / 2)];

        const idx = (y * width + x) * 4 + c;
        result[idx] = median;
      }
    }
  }

  return new ImageData(result, width, height);
}

/**
 * Apply convolution kernel to image
 */
function applyConvolution(
  imageData: ImageData,
  width: number,
  height: number,
  kernel: number[]
): ImageData {
  const data = imageData.data;
  const result = new Uint8ClampedArray(data);
  const kSize = Math.sqrt(kernel.length);
  const kHalf = Math.floor(kSize / 2);

  for (let y = kHalf; y < height - kHalf; y++) {
    for (let x = kHalf; x < width - kHalf; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let kIdx = 0;

        for (let ky = -kHalf; ky <= kHalf; ky++) {
          for (let kx = -kHalf; kx <= kHalf; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[kIdx];
            kIdx++;
          }
        }

        const idx = (y * width + x) * 4 + c;
        result[idx] = Math.max(0, Math.min(255, Math.round(sum)));
      }
    }
  }

  return new ImageData(result, width, height);
}

/**
 * Quick preprocessing for contracts (optimized settings)
 */
export async function preprocessForContract(imageDataUrl: string): Promise<string> {
  return preprocessImage(imageDataUrl, {
    grayscale: true,
    contrast: 1.5,      // Higher contrast for better text visibility
    brightness: 1.2,    // Brighter for washed-out scans
    sharpen: true,
    maxWidth: 2400,     // Higher resolution for better OCR
    denoise: false,
  });
}

/**
 * Binarize image (convert to pure black and white)
 * Best for text documents with clear text
 */
export async function binarizeImage(imageDataUrl: string, threshold: number = 128): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(imageDataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      // Convert to binary (black or white only)
      for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        const binary = gray > threshold ? 255 : 0;
        data[i] = binary;
        data[i + 1] = binary;
        data[i + 2] = binary;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png', 0.95));
    };

    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}

/**
 * Advanced preprocessing for Arabic text
 * Optimized for RTL text recognition
 */
export async function preprocessForArabic(imageDataUrl: string): Promise<string> {
  return preprocessImage(imageDataUrl, {
    grayscale: true,
    contrast: 1.6,      // Higher contrast for Arabic diacritics
    brightness: 1.25,
    sharpen: true,
    maxWidth: 2800,     // Higher resolution for Arabic characters
    denoise: true,      // Remove noise that can confuse Arabic recognition
  });
}

/**
 * Heavy preprocessing for low quality scans
 */
export async function preprocessForLowQuality(imageDataUrl: string): Promise<string> {
  return preprocessImage(imageDataUrl, {
    grayscale: true,
    contrast: 1.6,
    brightness: 1.2,
    sharpen: true,
    maxWidth: 2000,
    denoise: true,
  });
}

/**
 * Get image quality score (0-1)
 * Higher score = better quality for OCR
 */
export async function assessImageQuality(imageDataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(0.5);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      // Calculate variance (measure of contrast)
      let sum = 0;
      let sumSquared = 0;
      const pixelCount = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        sum += gray;
        sumSquared += gray * gray;
      }

      const mean = sum / pixelCount;
      const variance = (sumSquared / pixelCount) - (mean * mean);

      // Normalize variance to 0-1 score
      // High variance (>2000) indicates good contrast
      const score = Math.min(1, variance / 3000);

      resolve(score);
    };

    img.onerror = () => resolve(0.5);
    img.src = imageDataUrl;
  });
}
