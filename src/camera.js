import { state } from './state.js';
import { els } from './ui.js';

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

  return canvas.toDataURL('image/png');
}

export async function switchCamera() {
  if (state.busy) return;
  state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
  await startCamera();
}
