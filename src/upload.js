import qrcode from 'qrcode-generator';
import { state } from './state.js';
import { els } from './ui.js';

export async function uploadPhoto(blob) {
  const layout = encodeURIComponent(state.activeLayout.id);
  const response = await fetch(`/api/photos?layout=${layout}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  });

  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
  return response.json();
}

export async function renderQrCode(url) {
  clearQr();

  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();

  const img = new Image();
  img.src = qr.createDataURL(8, 2);
  await img.decode();

  const ctx = els.qrCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, els.qrCanvas.width, els.qrCanvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, els.qrCanvas.width, els.qrCanvas.height);
}

export function clearQr() {
  const ctx = els.qrCanvas.getContext('2d');
  ctx.clearRect(0, 0, els.qrCanvas.width, els.qrCanvas.height);
}
