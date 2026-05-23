import { OVERLAY_URL, ZONES, TEXT_Y } from './frames/frame01.js';

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

function drawFrame(ctx, canvasWidth, canvasHeight, frameId) {
  if (frameId === 'none' || frameId === 'classic') return;

  const s = canvasWidth / 1200;

  if (frameId === 'gold') {
    const inset = Math.round(18 * s);
    const cornerLen = Math.round(60 * s);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = Math.round(12 * s);
    ctx.strokeRect(inset, inset, canvasWidth - inset * 2, canvasHeight - inset * 2);

    ctx.lineWidth = Math.round(6 * s);
    const corners = [
      [inset, inset],
      [canvasWidth - inset, inset],
      [canvasWidth - inset, canvasHeight - inset],
      [inset, canvasHeight - inset],
    ];
    corners.forEach(([cx, cy], i) => {
      const dx = i === 0 || i === 3 ? cornerLen : -cornerLen;
      const dy = i === 0 || i === 1 ? cornerLen : -cornerLen;
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy);
      ctx.stroke();
    });
  }

  if (frameId === 'film') {
    const borderW = Math.round(60 * s);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, borderW, canvasHeight);
    ctx.fillRect(canvasWidth - borderW, 0, borderW, canvasHeight);

    const holeR = Math.round(10 * s);
    const holeSpacing = Math.round(60 * s);
    ctx.fillStyle = '#333333';
    for (let y = holeSpacing; y < canvasHeight; y += holeSpacing) {
      ctx.beginPath();
      ctx.arc(borderW / 2, y, holeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(canvasWidth - borderW / 2, y, holeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

async function drawBackground(ctx, width, height, backgroundUrl) {
  if (backgroundUrl) {
    const img = await loadImage(backgroundUrl);
    drawCoverImage(ctx, img, 0, 0, width, height);
    return;
  }

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

function drawTitle(ctx, canvas, layoutName, config) {
  const s = canvas.width / 1200;
  ctx.textAlign = 'center';
  ctx.fillStyle = config.theme?.ink || '#49333a';
  ctx.font = `700 ${Math.round(82 * s)}px Georgia, serif`;
  ctx.fillText(config.coupleName, canvas.width / 2, canvas.height - Math.round(190 * s));
  ctx.font = `600 ${Math.round(36 * s)}px Avenir Next, sans-serif`;
  ctx.fillStyle = '#b64f6b';
  ctx.fillText(`${config.weddingDate} · ${layoutName}`, canvas.width / 2, canvas.height - Math.round(125 * s));
  ctx.font = `500 ${Math.round(30 * s)}px Avenir Next, sans-serif`;
  ctx.fillStyle = 'rgba(73, 51, 58, 0.72)';
  ctx.fillText(config.tagline, canvas.width / 2, canvas.height - Math.round(78 * s));
}

async function loadImage(dataUrl) {
  const img = new Image();
  img.decoding = 'async';
  img.src = dataUrl;
  await img.decode();
  return img;
}

async function composeFrame01(ctx, canvas, images, config) {
  ZONES.forEach((zone, i) => {
    if (!images[i]) return;
    drawCoverImage(ctx, images[i], zone.x, zone.y, zone.w, zone.h);
  });

  const overlay = await loadImage(OVERLAY_URL);
  ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);

  const s = canvas.width / 784;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `400 italic ${Math.round(22 * s)}px Georgia, serif`;
  ctx.fillText(config.coupleName + '  ·  ' + config.weddingDate, canvas.width / 2, Math.round(TEXT_Y * s));
  ctx.textBaseline = 'alphabetic';
}

export async function composePhoto(workCanvas, layout, shots, activeFrame, config, backgroundUrl) {
  workCanvas.width = layout.width;
  workCanvas.height = layout.height;
  const ctx = workCanvas.getContext('2d');
  const images = await Promise.all(shots.map(loadImage));

  if (layout.id === 'frame01') {
    await composeFrame01(ctx, workCanvas, images, config);
    return new Promise((resolve) => workCanvas.toBlob(resolve, 'image/jpeg', 0.92));
  }

  await drawBackground(ctx, workCanvas.width, workCanvas.height, backgroundUrl);

  if (layout.id === 'strip') {
    const margin = 105, gap = 48, footer = 300;
    const photoWidth = workCanvas.width - margin * 2;
    const photoHeight = (workCanvas.height - margin * 2 - footer - gap * 3) / 4;
    images.forEach((image, index) => {
      drawPhoto(ctx, image, margin, margin + index * (photoHeight + gap), photoWidth, photoHeight);
    });
  }

  if (layout.id === 'grid') {
    const margin = 40, gap = 16;
    const photoW = Math.floor((workCanvas.width - margin * 2 - gap) / 2);
    const photoH = Math.round(photoW * 4 / 3);
    images.forEach((image, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      drawPhoto(ctx, image, margin + col * (photoW + gap), margin + row * (photoH + gap), photoW, photoH);
    });
    const photosBottom = margin + photoH * 2 + gap;
    ctx.fillStyle = 'rgba(127, 200, 184, 0.22)';
    ctx.fillRect(margin, photosBottom + 28, workCanvas.width - margin * 2, 3);
  }

  if (layout.id === 'portrait') {
    drawPhoto(ctx, images[0], 150, 150, workCanvas.width - 300, workCanvas.height - 520);
  }

  drawTitle(ctx, workCanvas, layout.name, config);
  drawFrame(ctx, workCanvas.width, workCanvas.height, activeFrame);
  return new Promise((resolve) => workCanvas.toBlob(resolve, 'image/jpeg', 0.88));
}
