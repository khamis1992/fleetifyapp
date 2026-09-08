export const ORIENTATION_AGENT_ID = 'contract-document-orientation-agent';
export const ORIENTATION_DETECTOR_VERSION = 'tesseract-osd-dual-scale-v1';
export const AUTO_OSD_MIN_SCORE = 20;

export interface OrientationReading { rotation: number | null; confidence: number | null }
export interface PageOrientationEvidence {
  page: number;
  first: OrientationReading;
  second: OrientationReading;
  verification: OrientationReading | null;
  rotation: number;
  needsReview: boolean;
}

export function reliableReading(reading: OrientationReading): boolean {
  return reading.rotation !== null && [0, 90, 180, 270].includes(reading.rotation)
    && reading.confidence !== null && Number.isFinite(reading.confidence)
    && reading.confidence >= AUTO_OSD_MIN_SCORE;
}

// Scores are OSD scores, not percentages. Agreement at two render sizes and
// upright re-detection after correction are required for unattended writes.
export function decidePageOrientation(page: number, first: OrientationReading,
  second: OrientationReading, verification: OrientationReading | null = null): PageOrientationEvidence {
  const agreed = reliableReading(first) && reliableReading(second) && first.rotation === second.rotation;
  const verified = first.rotation === 0 || (verification !== null
    && reliableReading(verification) && verification.rotation === 0);
  const accepted = agreed && verified;
  return { page, first, second, verification, rotation: accepted ? first.rotation! : 0, needsReview: !accepted };
}

export function validateAutomaticEvidence(rotations: number[], evidence: PageOrientationEvidence[]): void {
  if (!Array.isArray(evidence) || evidence.length !== rotations.length || rotations.length > 50) {
    throw new Error('Automatic orientation requires evidence for every page');
  }
  evidence.forEach((item, index) => {
    if (!item || item.page !== index + 1 || !item.first || !item.second) throw new Error('Invalid page evidence');
    const decision = decidePageOrientation(item.page, item.first, item.second, item.verification);
    if (rotations[index] !== decision.rotation || item.rotation !== decision.rotation
      || item.needsReview !== decision.needsReview) throw new Error('Automatic orientation evidence is not verified');
  });
}
