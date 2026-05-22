import { state } from './state.js';
import { els } from './ui.js';

function clamp(v) { return Math.round(Math.max(0, Math.min(255, v))); }

function applyPixelFilter(ctx, canvas, filterId) {
  if (!filterId || filterId === 'none') return;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];

    if (filterId === 'bw') {
      const v = clamp(0.299 * r + 0.587 * g + 0.114 * b);
      d[i] = d[i + 1] = d[i + 2] = v;

    } else if (filterId === 'warm') {
      // sepia(40%) then saturate(140%)
      const sr = clamp(0.7572 * r + 0.3076 * g + 0.0756 * b);
      const sg = clamp(0.1396 * r + 0.8744 * g + 0.0672 * b);
      const sb = clamp(0.1088 * r + 0.2136 * g + 0.6524 * b);
      const gray = 0.299 * sr + 0.587 * sg + 0.114 * sb;
      d[i]     = clamp(gray + 1.4 * (sr - gray));
      d[i + 1] = clamp(gray + 1.4 * (sg - gray));
      d[i + 2] = clamp(gray + 1.4 * (sb - gray));

    } else if (filterId === 'cool') {
      // desaturate slightly, shift toward blue-green
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      d[i]     = clamp(gray + 0.9 * (r - gray) - 8);
      d[i + 1] = clamp(gray + 0.9 * (g - gray) + 5);
      d[i + 2] = clamp(gray + 0.9 * (b - gray) + 20);

    } else if (filterId === 'vintage') {
      // sepia(60%) + contrast(90%) + brightness(90%)
      const sr = clamp(0.6358 * r + 0.4614 * g + 0.1134 * b);
      const sg = clamp(0.2094 * r + 0.8116 * g + 0.1008 * b);
      const sb = clamp(0.1632 * r + 0.3204 * g + 0.4786 * b);
      d[i]     = clamp(0.9 * (0.9 * (sr - 128) + 128));
      d[i + 1] = clamp(0.9 * (0.9 * (sg - 128) + 128));
      d[i + 2] = clamp(0.9 * (0.9 * (sb - 128) + 128));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function triggerFlash() {
  const el = els.flashOverlay;
  el.classList.remove('flashing');
  void el.offsetWidth;
  el.classList.add('flashing');
  return wait(450);
}

export async function startCamera() {
  stopCamera();

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: state.facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    els.video.srcObject = state.stream;
    await els.video.play();
  } catch (error) {
    els.cameraStatus.textContent = '無法啟用相機。請確認使用 HTTPS、允許相機權限，並重新整理頁面。';
    console.error(error);
  }
}

export function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
}

export async function runCountdown() {
  const seconds = Number(state.config.countdownSeconds || 3);
  els.countdown.classList.remove('hidden');

  for (let count = seconds; count > 0; count -= 1) {
    els.countdown.textContent = String(count);
    await wait(850);
  }

  els.countdown.textContent = 'SMILE';
  await wait(280);
  els.countdown.classList.add('hidden');
}

export function captureFrame() {
  const shotRatio = state.activeLayout?.shotRatio || '4/3';
  const [rw, rh] = shotRatio.split('/').map(Number);
  const captureW = rw >= rh ? 1200 : Math.round(1200 * rw / rh);
  const captureH = Math.round(captureW * rh / rw);

  const canvas = els.workCanvas;
  canvas.width = captureW;
  canvas.height = captureH;
  const ctx = canvas.getContext('2d');

  const src = els.video;
  const sw = src.videoWidth;
  const sh = src.videoHeight;
  const targetRatio = captureW / captureH;
  const srcRatio = sw / sh;
  let sx = 0, sy = 0, cropW = sw, cropH = sh;

  if (srcRatio > targetRatio) {
    cropW = sh * targetRatio;
    sx = (sw - cropW) / 2;
  } else {
    cropH = sw / targetRatio;
    sy = (sh - cropH) / 2;
  }

  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  applyPixelFilter(ctx, canvas, state.activeFilter);

  return canvas.toDataURL('image/png');
}

export async function switchCamera() {
  if (state.busy) return;
  state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
  await startCamera();
}
