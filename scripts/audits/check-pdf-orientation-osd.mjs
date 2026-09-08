import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';
import assert from 'node:assert/strict';
// Synthetic public text only. No customer documents are sent to OCR services.
const width=1400,height=1800;
const worker=await createWorker('osd',0,{legacyCore:true,legacyLang:true,cachePath:'.tmp',langPath:'https://tessdata.projectnaptha.com/4.0.0'});
try {
  for (const rotation of [0,90,180,270]) {
    const canvas=createCanvas(rotation%180?height:width,rotation%180?width:height);
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);ctx.translate(-width/2,-height/2);
    ctx.fillStyle='black';ctx.font='26px Arial';
    for(let i=0;i<32;i++) ctx.fillText(`The rental agreement describes the vehicle and the customer. Line ${i+1}.`,60,100+i*48);
    const {data}=await worker.detect(canvas.toBuffer('image/png'));
    console.log(JSON.stringify({input:rotation,correction:data.orientation_degrees,confidence:data.orientation_confidence}));
    assert.equal(data.orientation_degrees,(360-rotation)%360);
    assert.ok(data.orientation_confidence>=15);
  }
} finally {await worker.terminate();}
