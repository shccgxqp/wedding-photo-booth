import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { applyFilterToPixels } from './camera.js';

const CLIP_W = 480;
const CLIP_H = 640;
const CLIP_UPLOAD_W = 480;
const CLIP_UPLOAD_H = 640;
const HQ_CLIP_W = 720;
const HQ_CLIP_H = 960;
const FPS = 10;
const FRAME_DELAY = Math.round(1000 / FPS);
const MAX_CLIP_FRAMES = 15;
export const RECORD_MS = MAX_CLIP_FRAMES * FRAME_DELAY; // 1500ms

export function startClipRecorder(videoEl, filterId = 'none') {
  const offscreen = document.createElement('canvas');
  offscreen.width = CLIP_W;
  offscreen.height = CLIP_H;
  const ctx = offscreen.getContext('2d');
  const frames = [];

  function captureFrame() {
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    const srcRatio = vw / vh;
    const dstRatio = CLIP_W / CLIP_H;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (srcRatio > dstRatio) { sw = vh * dstRatio; sx = (vw - sw) / 2; }
    else { sh = vw / dstRatio; sy = (vh - sh) / 2; }

    ctx.setTransform(-1, 0, 0, 1, CLIP_W, 0);
    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, CLIP_W, CLIP_H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const imageData = ctx.getImageData(0, 0, CLIP_W, CLIP_H);
    applyFilterToPixels(imageData.data, filterId);
    frames.push(imageData.data.slice());
  }

  const intervalId = setInterval(captureFrame, FRAME_DELAY);
  captureFrame();

  return {
    stop() {
      clearInterval(intervalId);
      return frames.slice(-MAX_CLIP_FRAMES);
    },
  };
}

export function startClipRecorderHQ(videoEl, filterId = 'none') {
  const offscreen = document.createElement('canvas');
  offscreen.width = HQ_CLIP_W;
  offscreen.height = HQ_CLIP_H;
  const ctx = offscreen.getContext('2d');
  const frames = [];

  function captureFrame() {
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    const srcRatio = vw / vh;
    const dstRatio = HQ_CLIP_W / HQ_CLIP_H;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (srcRatio > dstRatio) { sw = vh * dstRatio; sx = (vw - sw) / 2; }
    else { sh = vw / dstRatio; sy = (vh - sh) / 2; }

    ctx.setTransform(-1, 0, 0, 1, HQ_CLIP_W, 0);
    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, HQ_CLIP_W, HQ_CLIP_H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const imageData = ctx.getImageData(0, 0, HQ_CLIP_W, HQ_CLIP_H);
    applyFilterToPixels(imageData.data, filterId);
    frames.push(imageData.data.slice());
  }

  const intervalId = setInterval(captureFrame, FRAME_DELAY);
  captureFrame();

  return {
    stop() {
      clearInterval(intervalId);
      return frames.slice(-MAX_CLIP_FRAMES);
    },
  };
}

export async function encodeFramesAsJpegs(frames, quality = 0.82) {
  const canvas = document.createElement('canvas');
  canvas.width = HQ_CLIP_W;
  canvas.height = HQ_CLIP_H;
  const ctx = canvas.getContext('2d');
  const blobs = [];
  for (const frameData of frames) {
    const imgData = new ImageData(new Uint8ClampedArray(frameData), HQ_CLIP_W, HQ_CLIP_H);
    ctx.putImageData(imgData, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    blobs.push(blob);
  }
  return blobs;
}

export function encodeClipGif(frames) {
  const encoder = GIFEncoder();
  frames.forEach((frameData) => {
    const data = new Uint8ClampedArray(frameData);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    encoder.writeFrame(index, CLIP_UPLOAD_W, CLIP_UPLOAD_H, { palette, delay: FRAME_DELAY });
  });
  encoder.finish();
  return new Blob([encoder.bytes()], { type: 'image/gif' });
}
