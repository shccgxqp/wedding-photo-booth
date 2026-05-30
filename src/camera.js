function clamp(v) { return Math.round(Math.max(0, Math.min(255, v))); }

// Pure pixel-level filter — no ctx.filter API, works on all browsers/iOS versions
export function applyFilterToPixels(data, filterId) {
  if (!filterId || filterId === 'none') return;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];

    if (filterId === 'bw') {
      const v = clamp(0.299 * r + 0.587 * g + 0.114 * b);
      data[i] = data[i + 1] = data[i + 2] = v;
      continue;
    }

    if (filterId === 'natural') {
      // brightness(1.06) contrast(0.9) saturate(0.95)
      r = clamp(r * 1.06); g = clamp(g * 1.06); b = clamp(b * 1.06);
      r = clamp((r - 128) * 0.9 + 128); g = clamp((g - 128) * 0.9 + 128); b = clamp((b - 128) * 0.9 + 128);
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gray + 0.95 * (r - gray));
      g = clamp(gray + 0.95 * (g - gray));
      b = clamp(gray + 0.95 * (b - gray));
    } else if (filterId === 'fresh') {
      // brightness(1.12) contrast(0.86) saturate(0.8)
      r = clamp(r * 1.12); g = clamp(g * 1.12); b = clamp(b * 1.12);
      r = clamp((r - 128) * 0.86 + 128); g = clamp((g - 128) * 0.86 + 128); b = clamp((b - 128) * 0.86 + 128);
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gray + 0.8 * (r - gray));
      g = clamp(gray + 0.8 * (g - gray));
      b = clamp(gray + 0.8 * (b - gray));
    } else if (filterId === 'vintage') {
      // brightness(0.9) contrast(1.24) saturate(1.19) sepia(1) grayscale(0.17)
      r = clamp(r * 0.9); g = clamp(g * 0.9); b = clamp(b * 0.9);
      r = clamp((r - 128) * 1.24 + 128); g = clamp((g - 128) * 1.24 + 128); b = clamp((b - 128) * 1.24 + 128);
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gray + 1.19 * (r - gray));
      g = clamp(gray + 1.19 * (g - gray));
      b = clamp(gray + 1.19 * (b - gray));
      // sepia(1) — full sepia matrix
      const sr = clamp(0.393 * r + 0.769 * g + 0.189 * b);
      const sg = clamp(0.349 * r + 0.686 * g + 0.168 * b);
      const sb = clamp(0.272 * r + 0.534 * g + 0.131 * b);
      r = sr; g = sg; b = sb;
      // grayscale(0.17) — 17% blend toward luminance
      const gray2 = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gray2 * 0.17 + r * 0.83);
      g = clamp(gray2 * 0.17 + g * 0.83);
      b = clamp(gray2 * 0.17 + b * 0.83);
    }

    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
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

export function captureFrame(videoEl, workCanvas, activeLayout, filterId) {
  const shotRatio = activeLayout?.shotRatio || '4/3';
  const [rw, rh] = shotRatio.split('/').map(Number);
  const captureW = rw >= rh ? 1200 : Math.round(1200 * rw / rh);
  const captureH = Math.round(captureW * rh / rw);

  workCanvas.width = captureW;
  workCanvas.height = captureH;

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

  const ctx = workCanvas.getContext('2d');
  ctx.save();
  ctx.translate(captureW, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, sx, sy, cropW, cropH, 0, 0, captureW, captureH);
  ctx.restore();

  if (filterId && filterId !== 'none') {
    const imageData = ctx.getImageData(0, 0, captureW, captureH);
    applyFilterToPixels(imageData.data, filterId);
    ctx.putImageData(imageData, 0, 0);
  }

  return workCanvas.toDataURL('image/png');
}

export async function switchCamera(streamRef, facingMode, videoEl, onFacingChange, onError) {
  const newMode = facingMode === 'user' ? 'environment' : 'user';
  onFacingChange(newMode);
  await startCamera(streamRef, videoEl, newMode, onError);
}
