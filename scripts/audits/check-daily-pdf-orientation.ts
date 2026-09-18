import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument, degrees } from 'pdf-lib';
import { createOrientationDetector } from '../../automation/document-orientation-agent/detect.ts';

const canvas = createCanvas(1400, 1800);
const context = canvas.getContext('2d');
context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
context.fillStyle = 'black'; context.font = '26px Arial';
for (let line = 0; line < 32; line++) {
  context.fillText(`The rental agreement describes the vehicle and the customer. Line ${line + 1}.`, 60, 100 + line * 48);
}
const document = await PDFDocument.create();
const picture = await document.embedPng(canvas.toBuffer('image/png'));
for (const angle of [0, 90, 180, 270]) {
  const page = document.addPage([700, 900]);
  page.drawImage(picture, { x: 0, y: 0, width: 700, height: 900 }); page.setRotation(degrees(angle));
}
const detector = await createOrientationDetector('.tmp');
try {
  const result = await detector.inspect(await document.save());
  console.log(JSON.stringify(result, null, 2));
  const expected = [0, 270, 180, 90];
  result.evidence.forEach((item, index) => {
    if (!item.needsReview) assert.equal(item.rotation, expected[index]);
    if (item.rotation) assert.equal(item.verification?.rotation, 0);
  });
  assert.ok(result.rotations.some(Boolean), 'At least one known inverted page should be verified automatically');
} finally { await detector.close(); }
