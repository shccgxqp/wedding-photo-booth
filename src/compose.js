import { state } from './state.js';
import { els } from './ui.js';

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


function drawPhoto(ctx, image, x, y, width, height) {
  const border = Math.round(Math.min(width, height) * 0.038);

  drawCoverImage(ctx, image, x, y, width, height);

  ctx.lineWidth = border;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(x, y, width, height);
}

function drawBackground(ctx, width, height) {
  const s = width / 1200;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#fff9f5');
  gradient.addColorStop(0.5, '#fff0f5');
  gradient.addColorStop(1, '#effaf7');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(182, 79, 107, 0.18)';
  ctx.lineWidth = Math.round(6 * s);
  const inset = Math.round(42 * s);
  ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);

  ctx.fillStyle = 'rgba(242, 140, 168, 0.16)';
  for (let i = 0; i < 24; i += 1) {
    const x = (i * 233) % width;
    const y = (i * 377) % height;
    ctx.beginPath();
    ctx.arc(x, y, (20 + (i % 4) * 8) * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTitle(ctx, canvas, layoutName) {
  const s = canvas.width / 1200;
  ctx.textAlign = 'center';
  ctx.fillStyle = state.config.theme?.ink || '#49333a';
  ctx.font = `700 ${Math.round(82 * s)}px Georgia, serif`;
  ctx.fillText(state.config.coupleName, canvas.width / 2, canvas.height - Math.round(190 * s));
  ctx.font = `600 ${Math.round(36 * s)}px Avenir Next, sans-serif`;
  ctx.fillStyle = '#b64f6b';
  ctx.fillText(`${state.config.weddingDate} · ${layoutName}`, canvas.width / 2, canvas.height - Math.round(125 * s));
  ctx.font = `500 ${Math.round(30 * s)}px Avenir Next, sans-serif`;
  ctx.fillStyle = 'rgba(73, 51, 58, 0.72)';
  ctx.fillText(state.config.tagline, canvas.width / 2, canvas.height - Math.round(78 * s));
}

async function loadImage(dataUrl) {
  const img = new Image();
  img.decoding = 'async';
  img.src = dataUrl;
  await img.decode();
  return img;
}

export async function composePhoto() {
  const layout = state.activeLayout;
  const canvas = els.workCanvas;
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  const images = await Promise.all(state.shots.map(loadImage));

  drawBackground(ctx, canvas.width, canvas.height);

  if (layout.id === 'strip') {
    const margin = 105, gap = 48, footer = 300;
    const photoWidth = canvas.width - margin * 2;
    const photoHeight = (canvas.height - margin * 2 - footer - gap * 3) / 4;
    images.forEach((image, index) => {
      drawPhoto(ctx, image, margin, margin + index * (photoHeight + gap), photoWidth, photoHeight);
    });
  }

  if (layout.id === 'grid') {
    const margin = 40, gap = 16;
    const photoW = Math.floor((canvas.width - margin * 2 - gap) / 2);
    const photoH = Math.round(photoW * 4 / 3);
    images.forEach((image, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      drawPhoto(ctx, image, margin + col * (photoW + gap), margin + row * (photoH + gap), photoW, photoH);
    });
    const photosBottom = margin + photoH * 2 + gap;
    ctx.fillStyle = 'rgba(127, 200, 184, 0.22)';
    ctx.fillRect(margin, photosBottom + 28, canvas.width - margin * 2, 3);
  }

  if (layout.id === 'portrait') {
    drawPhoto(ctx, images[0], 150, 150, canvas.width - 300, canvas.height - 520);
  }

  drawTitle(ctx, canvas, layout.name);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
}
