import { GIFEncoder, quantize, applyPalette } from 'gifenc';

const CLIP_W = 480;
const CLIP_H = 640;
const CLIP_UPLOAD_W = 480;
const CLIP_UPLOAD_H = 640;
const FPS = 10;
const FRAME_DELAY = Math.round(1000 / FPS);
const MAX_CLIP_FRAMES = 15;

export function startClipRecorder(videoEl) {
  const offscreen = document.createElement('canvas');
  offscreen.width = CLIP_W;
  offscreen.height = CLIP_H;
  const ctx = offscreen.getContext('2d');
  const frames = [];

  function captureFrame() {
    ctx.save();
    ctx.translate(CLIP_W, 0);
    ctx.scale(-1, 1);
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    const srcRatio = vw / vh;
    const dstRatio = CLIP_W / CLIP_H;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (srcRatio > dstRatio) { sw = vh * dstRatio; sx = (vw - sw) / 2; }
    else { sh = vw / dstRatio; sy = (vh - sh) / 2; }
    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, CLIP_W, CLIP_H);
    ctx.restore();
    frames.push(ctx.getImageData(0, 0, CLIP_W, CLIP_H).data.slice());
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
