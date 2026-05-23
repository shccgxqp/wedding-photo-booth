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
      const sr = clamp(0.7572 * r + 0.3076 * g + 0.0756 * b);
      const sg = clamp(0.1396 * r + 0.8744 * g + 0.0672 * b);
      const sb = clamp(0.1088 * r + 0.2136 * g + 0.6524 * b);
      const gray = 0.299 * sr + 0.587 * sg + 0.114 * sb;
      d[i]     = clamp(gray + 1.4 * (sr - gray));
      d[i + 1] = clamp(gray + 1.4 * (sg - gray));
      d[i + 2] = clamp(gray + 1.4 * (sb - gray));

    } else if (filterId === 'cool') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      d[i]     = clamp(gray + 0.9 * (r - gray) - 8);
      d[i + 1] = clamp(gray + 0.9 * (g - gray) + 5);
      d[i + 2] = clamp(gray + 0.9 * (b - gray) + 20);

    } else if (filterId === 'vintage') {
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

export function triggerFlash(flashEl) {
  if (!flashEl) return wait(450);
  flashEl.classList.remove('flashing');
  void flashEl.offsetWidth;
  flashEl.classList.add('flashing');
  return wait(450);
}

export async function startCamera(streamRef, videoEl, facingMode, onError) {
  stopCamera(streamRef);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    streamRef.current = stream;
    videoEl.srcObject = stream;
    await videoEl.play();
  } catch (err) {
    onError?.(err);
    console.error(err);
  }
}

export function stopCamera(streamRef) {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }
}

export async function runCountdown(seconds, onTick) {
  for (let count = seconds; count > 0; count -= 1) {
    onTick(count);
    await wait(850);
  }
  onTick('smile');
  await wait(700);
  onTick(null);
}

export function captureFrame(videoEl, workCanvas, activeLayout, activeFilter) {
  const shotRatio = activeLayout?.shotRatio || '4/3';
  const [rw, rh] = shotRatio.split('/').map(Number);
  const captureW = rw >= rh ? 1200 : Math.round(1200 * rw / rh);
  const captureH = Math.round(captureW * rh / rw);

  workCanvas.width = captureW;
  workCanvas.height = captureH;
  const ctx = workCanvas.getContext('2d');

  const sw = videoEl.videoWidth;
  const sh = videoEl.videoHeight;
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
  ctx.translate(workCanvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, sx, sy, cropW, cropH, 0, 0, workCanvas.width, workCanvas.height);
  ctx.restore();

  applyPixelFilter(ctx, workCanvas, activeFilter);

  return workCanvas.toDataURL('image/png');
}

export async function switchCamera(streamRef, facingMode, videoEl, onFacingChange, onError) {
  const newMode = facingMode === 'user' ? 'environment' : 'user';
  onFacingChange(newMode);
  await startCamera(streamRef, videoEl, newMode, onError);
}
