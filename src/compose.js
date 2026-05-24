import { OVERLAY_URL, ZONES } from './frames/frame01.js';
import { OVERLAY_URL as F02_OVERLAY, ZONES as F02_ZONES } from './frames/frame02.js';
import { OVERLAY_URL as F03_OVERLAY, ZONES as F03_ZONES } from './frames/frame03.js';
import { OVERLAY_URL as F04_OVERLAY, ZONES as F04_ZONES } from './frames/frame04.js';

function drawCoverImage(ctx, source, x, y, width, height) {
  const srcW = source.videoWidth || source.naturalWidth || source.width;
  const srcH = source.videoHeight || source.naturalHeight || source.height;
  const srcRatio = srcW / srcH;
  const targetRatio = width / height;
  let sx = 0, sy = 0, sw = srcW, sh = srcH;

  if (srcRatio > targetRatio) {
    sw = srcH * targetRatio;
    sx = (srcW - sw) / 2;
  } else {
    sh = srcW / targetRatio;
    sy = (srcH - sh) / 2;
  }

  ctx.drawImage(source, sx, sy, sw, sh, x, y, width, height);
}

async function loadImage(dataUrl) {
  const img = new Image();
  img.decoding = 'async';
  img.src = dataUrl;
  await img.decode();
  return img;
}

async function composeFrame04(ctx, canvas, images) {
  F04_ZONES.forEach((zone, i) => {
    if (!images[i]) return;
    drawCoverImage(ctx, images[i], zone.x, zone.y, zone.w, zone.h);
  });
  const overlay = await loadImage(F04_OVERLAY);
  ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
}

async function composeFrame03(ctx, canvas, images) {
  F03_ZONES.forEach((zone, i) => {
    if (!images[i]) return;
    drawCoverImage(ctx, images[i], zone.x, zone.y, zone.w, zone.h);
  });
  const overlay = await loadImage(F03_OVERLAY);
  ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
}

async function composeFrame02(ctx, canvas, images) {
  F02_ZONES.forEach((zone, i) => {
    if (!images[i]) return;
    drawCoverImage(ctx, images[i], zone.x, zone.y, zone.w, zone.h);
  });
  const overlay = await loadImage(F02_OVERLAY);
  ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
}

async function composeFrame01(ctx, canvas, images) {
  ZONES.forEach((zone, i) => {
    if (!images[i]) return;
    drawCoverImage(ctx, images[i], zone.x, zone.y, zone.w, zone.h);
  });
  const overlay = await loadImage(OVERLAY_URL);
  ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
}

export async function composePhoto(workCanvas, layout, shots) {
  workCanvas.width = layout.width;
  workCanvas.height = layout.height;
  const ctx = workCanvas.getContext('2d');
  const images = await Promise.all(shots.map(loadImage));

  if (layout.id === 'frame04') await composeFrame04(ctx, workCanvas, images);
  else if (layout.id === 'frame03') await composeFrame03(ctx, workCanvas, images);
  else if (layout.id === 'frame02') await composeFrame02(ctx, workCanvas, images);
  else if (layout.id === 'frame01') await composeFrame01(ctx, workCanvas, images);

  return new Promise((resolve) => workCanvas.toBlob(resolve, 'image/jpeg', 0.92));
}
