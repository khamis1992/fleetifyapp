export interface DocumentPoint {
  x: number;
  y: number;
}

export interface ScanQuality {
  score: number;
  brightness: number;
  sharpness: number;
  warnings: string[];
}

export interface ScannedDocumentPage {
  dataUrl: string;
  width: number;
  height: number;
  documentDetected: boolean;
  detectionConfidence: number;
  quality: ScanQuality;
}

const A4_WIDTH = 1240;
const A4_HEIGHT = 1754;
const MAX_ANALYSIS_EDGE = 1800;

let openCvPromise: Promise<typeof import('@techstark/opencv-js')> | null = null;

async function loadOpenCv() {
  if (!openCvPromise) {
    openCvPromise = import('@techstark/opencv-js');
  }

  const module = await openCvPromise;
  const imported = module as typeof module & {
    default?: typeof module | Promise<typeof module>;
  };
  const candidate = await Promise.resolve(imported.default || module);
  if (candidate.Mat) return candidate;

  await new Promise<void>((resolve) => {
    candidate.onRuntimeInitialized = () => resolve();
  });
  return candidate;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('تعذر قراءة الصورة الملتقطة'));
    };
    image.src = url;
  });
}

function createAnalysisCanvas(image: HTMLImageElement) {
  const scale = Math.min(1, MAX_ANALYSIS_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('تعذر تهيئة معالجة الصورة');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function orderDocumentCorners(points: DocumentPoint[]): DocumentPoint[] {
  if (points.length !== 4) throw new Error('يجب تحديد أربع زوايا للورقة');

  const sortedByY = [...points].sort((a, b) => a.y - b.y);
  const top = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sortedByY.slice(2).sort((a, b) => a.x - b.x);
  return [top[0], top[1], bottom[1], bottom[0]];
}

function distance(a: DocumentPoint, b: DocumentPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function fullFrameCorners(width: number, height: number): DocumentPoint[] {
  return [
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: width - 1, y: height - 1 },
    { x: 0, y: height - 1 },
  ];
}

function assessQuality(canvas: HTMLCanvasElement, detected: boolean): ScanQuality {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return { score: 0, brightness: 0, sharpness: 0, warnings: ['تعذر قياس جودة الصفحة'] };
  }

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const step = Math.max(2, Math.floor(Math.min(canvas.width, canvas.height) / 350));
  let brightnessSum = 0;
  let sampleCount = 0;
  let laplacianSum = 0;
  let laplacianSquaredSum = 0;

  const luminance = (index: number) =>
    data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;

  for (let y = step; y < canvas.height - step; y += step) {
    for (let x = step; x < canvas.width - step; x += step) {
      const center = (y * canvas.width + x) * 4;
      const left = (y * canvas.width + x - step) * 4;
      const right = (y * canvas.width + x + step) * 4;
      const top = ((y - step) * canvas.width + x) * 4;
      const bottom = ((y + step) * canvas.width + x) * 4;
      const value = luminance(center);
      const laplacian =
        4 * value - luminance(left) - luminance(right) - luminance(top) - luminance(bottom);

      brightnessSum += value;
      laplacianSum += laplacian;
      laplacianSquaredSum += laplacian * laplacian;
      sampleCount += 1;
    }
  }

  const brightness = sampleCount ? brightnessSum / sampleCount : 0;
  const meanLaplacian = sampleCount ? laplacianSum / sampleCount : 0;
  const sharpness = sampleCount
    ? Math.max(0, laplacianSquaredSum / sampleCount - meanLaplacian * meanLaplacian)
    : 0;
  const warnings: string[] = [];

  if (!detected) warnings.push('لم يتم اكتشاف حدود الورقة كاملة؛ أعد التصوير فوق خلفية مختلفة');
  if (brightness < 65) warnings.push('الإضاءة ضعيفة؛ استخدم إضاءة أقوى أو الفلاش');
  if (brightness > 225) warnings.push('الصورة شديدة السطوع؛ تجنب انعكاس الإضاءة على الورقة');
  if (sharpness < 130) warnings.push('النص غير واضح بما يكفي؛ ثبّت الهاتف وأعد التصوير');

  const detectionScore = detected ? 35 : 5;
  const brightnessScore = Math.max(0, 30 - Math.abs(145 - brightness) * 0.28);
  const sharpnessScore = Math.min(35, sharpness / 12);

  return {
    score: Math.round(Math.min(100, detectionScore + brightnessScore + sharpnessScore)),
    brightness: Math.round(brightness),
    sharpness: Math.round(sharpness),
    warnings,
  };
}

export async function scanDocumentPage(file: File): Promise<ScannedDocumentPage> {
  const [cv, image] = await Promise.all([loadOpenCv(), loadImage(file)]);
  const sourceCanvas = createAnalysisCanvas(image);
  const source = cv.imread(sourceCanvas);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const closed = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
  let detectedCorners: DocumentPoint[] | null = null;
  let bestArea = 0;

  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 55, 155);
    cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
    cv.findContours(closed, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const minimumArea = sourceCanvas.width * sourceCanvas.height * 0.18;
    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const area = cv.contourArea(contour);
      if (area < minimumArea || area <= bestArea) {
        contour.delete();
        continue;
      }

      const perimeter = cv.arcLength(contour, true);
      const approximation = new cv.Mat();
      cv.approxPolyDP(contour, approximation, 0.02 * perimeter, true);

      if (approximation.rows === 4 && cv.isContourConvex(approximation)) {
        const points: DocumentPoint[] = [];
        for (let pointIndex = 0; pointIndex < 4; pointIndex += 1) {
          points.push({
            x: approximation.data32S[pointIndex * 2],
            y: approximation.data32S[pointIndex * 2 + 1],
          });
        }
        detectedCorners = orderDocumentCorners(points);
        bestArea = area;
      }

      approximation.delete();
      contour.delete();
    }

    const corners = detectedCorners || fullFrameCorners(sourceCanvas.width, sourceCanvas.height);
    const [topLeft, topRight, bottomRight, bottomLeft] = corners;
    const measuredWidth = Math.max(distance(topLeft, topRight), distance(bottomLeft, bottomRight));
    const measuredHeight = Math.max(distance(topLeft, bottomLeft), distance(topRight, bottomRight));
    const landscape = measuredWidth > measuredHeight;
    const targetWidth = landscape ? A4_HEIGHT : A4_WIDTH;
    const targetHeight = landscape ? A4_WIDTH : A4_HEIGHT;

    const sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
      topLeft.x,
      topLeft.y,
      topRight.x,
      topRight.y,
      bottomRight.x,
      bottomRight.y,
      bottomLeft.x,
      bottomLeft.y,
    ]);
    const targetPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      targetWidth - 1,
      0,
      targetWidth - 1,
      targetHeight - 1,
      0,
      targetHeight - 1,
    ]);
    const transform = cv.getPerspectiveTransform(sourcePoints, targetPoints);
    const warped = new cv.Mat();
    const enhanced = new cv.Mat();
    const softened = new cv.Mat();

    try {
      cv.warpPerspective(
        source,
        warped,
        transform,
        new cv.Size(targetWidth, targetHeight),
        cv.INTER_LINEAR,
        cv.BORDER_REPLICATE
      );
      cv.convertScaleAbs(warped, enhanced, 1.08, 4);
      cv.GaussianBlur(enhanced, softened, new cv.Size(0, 0), 1.1);
      cv.addWeighted(enhanced, 1.28, softened, -0.28, 0, enhanced);

      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = targetWidth;
      outputCanvas.height = targetHeight;
      cv.imshow(outputCanvas, enhanced);

      let finalCanvas = outputCanvas;
      if (landscape) {
        const portraitCanvas = document.createElement('canvas');
        portraitCanvas.width = A4_WIDTH;
        portraitCanvas.height = A4_HEIGHT;
        const portraitContext = portraitCanvas.getContext('2d');
        if (!portraitContext) throw new Error('تعذر تدوير الصفحة');
        portraitContext.translate(A4_WIDTH / 2, A4_HEIGHT / 2);
        portraitContext.rotate(Math.PI / 2);
        portraitContext.drawImage(outputCanvas, -A4_HEIGHT / 2, -A4_WIDTH / 2);
        finalCanvas = portraitCanvas;
      }

      const detectionConfidence = detectedCorners
        ? Math.round(Math.min(100, (bestArea / (sourceCanvas.width * sourceCanvas.height)) * 125))
        : 0;
      const quality = assessQuality(finalCanvas, Boolean(detectedCorners));

      return {
        dataUrl: finalCanvas.toDataURL('image/jpeg', 0.9),
        width: finalCanvas.width,
        height: finalCanvas.height,
        documentDetected: Boolean(detectedCorners),
        detectionConfidence,
        quality,
      };
    } finally {
      sourcePoints.delete();
      targetPoints.delete();
      transform.delete();
      warped.delete();
      enhanced.delete();
      softened.delete();
    }
  } finally {
    source.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    closed.delete();
    contours.delete();
    hierarchy.delete();
    kernel.delete();
  }
}

export async function rotateScannedPage(dataUrl: string): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('تعذر تدوير الصفحة'));
    element.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalHeight;
  canvas.height = image.naturalWidth;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر تدوير الصفحة');
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(Math.PI / 2);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  return canvas.toDataURL('image/jpeg', 0.9);
}
