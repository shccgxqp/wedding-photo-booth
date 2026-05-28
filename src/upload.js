import qrcode from 'qrcode-generator';

export async function uploadPhoto(blob, layoutId) {
  const layout = encodeURIComponent(layoutId);
  const response = await fetch(`/api/photos?layout=${layout}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  });
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  const data = await response.json();
  // Use token-based URL so guests can only access photos they know the link to
  data.downloadUrl = `${window.location.origin}/photos/${data.token}`;
  return data;
}

export async function uploadClipGif(gifBlob, sessionId, idx) {
  const params = new URLSearchParams({ session: sessionId, idx });
  const response = await fetch(`/api/gif/clip?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/gif' },
    body: gifBlob,
  });
  if (!response.ok) throw new Error(`Clip upload failed: ${response.status}`);
}

export async function requestGifCompose(sessionId, layoutId, layoutW, layoutH, zones) {
  const response = await fetch('/api/gif/compose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, layoutId, layoutW, layoutH, zones }),
  });
  if (!response.ok) throw new Error(`Compose failed: ${response.status}`);
  const data = await response.json();
  data.downloadUrl = `${window.location.origin}/photos/${data.token}`;
  return data;
}

export async function uploadJpegFrame(jpegBlob, sessionId, clipIdx, frameIdx) {
  const params = new URLSearchParams({ session: sessionId, clip: clipIdx, frame: frameIdx });
  const response = await fetch(`/api/gif/frame?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: jpegBlob,
  });
  if (!response.ok) throw new Error(`Frame upload failed: ${response.status}`);
}

export async function requestGifComposeJpeg(sessionId, layoutId, layoutW, layoutH, zones) {
  const response = await fetch('/api/gif/compose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, layoutId, layoutW, layoutH, zones, mode: 'jpeg' }),
  });
  if (!response.ok) throw new Error(`Compose failed: ${response.status}`);
  const data = await response.json();
  const origin = window.location.origin;
  for (const key of Object.keys(data)) {
    data[key].downloadUrl = `${origin}/photos/${data[key].token}`;
  }
  return data;
}

export async function uploadVideo(blob, layoutId = 'video') {
  const layout = encodeURIComponent(layoutId);
  const response = await fetch(`/api/photos?layout=${layout}`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'video/mp4' },
    body: blob,
  });
  if (!response.ok) throw new Error(`Video upload failed: ${response.status}`);
  const data = await response.json();
  // QR code points to landing page (/view/) for save-to-Photos UX
  data.downloadUrl = `${window.location.origin}/view/${data.token}`;
  data.rawUrl = `${window.location.origin}/photos/${data.token}`;
  return data;
}

export async function uploadGif(blob, layoutId = 'gif') {
  const layout = encodeURIComponent(layoutId);
  const response = await fetch(`/api/photos?layout=${layout}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/gif' },
    body: blob,
  });
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  const data = await response.json();
  data.downloadUrl = `${window.location.origin}/photos/${data.token}`;
  return data;
}

export async function renderQrCode(url, canvasEl) {
  clearQr(canvasEl);
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const img = new Image();
  img.src = qr.createDataURL(8, 2);
  await img.decode();
  const ctx = canvasEl.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
}

export function clearQr(canvasEl) {
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
}
