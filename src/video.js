export const VIDEO_DURATION_MS = 2000;

const CANDIDATE_MIMES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm',
];

export function getBestVideoMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const mime of CANDIDATE_MIMES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

export function isIgCompatible(mime) {
  return mime.startsWith('video/mp4');
}

// Record a clip from the camera stream for `duration` ms.
// Call this AFTER runCountdown resolves so user is already posing.
export function startVideoClipRecorder(stream, duration = VIDEO_DURATION_MS) {
  const mime = getBestVideoMime();
  const chunks = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 2_500_000,
  });
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.start(100);

  const blobPromise = new Promise(resolve => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  const stopAfter = setTimeout(() => recorder.stop(), duration);

  return {
    stop() {
      clearTimeout(stopAfter);
      if (recorder.state !== 'inactive') recorder.stop();
      return blobPromise;
    },
    blobPromise,
  };
}

// Draw one frame to the composite canvas (cover-crop each clip into its zone).
// Horizontally flips each clip to match captureFrame() behaviour (scaleX -1).
function drawFrame(ctx, videoEls, zones, overlay, cW, cH, scale) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, cW, cH);

  for (let i = 0; i < Math.min(videoEls.length, zones.length); i++) {
    const zone = zones[i];
    const v = videoEls[i];
    const zx = Math.round(zone.x * scale);
    const zy = Math.round(zone.y * scale);
    const zw = Math.round(zone.w * scale);
    const zh = Math.round(zone.h * scale);
    const vw = v.videoWidth || zw;
    const vh = v.videoHeight || zh;
    const vAspect = vw / vh;
    const zAspect = zw / zh;
    let sx, sy, sw, sh;
    if (vAspect > zAspect) {
      sh = vh; sw = sh * zAspect;
      sx = (vw - sw) / 2; sy = 0;
    } else {
      sw = vw; sh = sw / zAspect;
      sx = 0; sy = (vh - sh) / 2;
    }
    // Flip horizontally inside the zone (matches captureFrame ctx.scale(-1,1))
    ctx.save();
    ctx.translate(zx + zw, zy);
    ctx.scale(-1, 1);
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, zw, zh);
    ctx.restore();
  }

  ctx.drawImage(overlay, 0, 0, cW, cH);
}

// Compose multiple zone clips (Blobs) into a single video (Blob).
// clips: Blob[] — one per zone, recorded with startVideoClipRecorder
// zones: {x, y, w, h}[] — layout zones in layout-pixel space
// layoutW, layoutH: full layout pixel dimensions
// overlayUrl: path to overlay PNG (e.g. '/frames/frame03.png')
export async function composeMultiZoneVideo(clips, zones, layoutW, layoutH, overlayUrl, duration = VIDEO_DURATION_MS) {
  // Create video elements from clip blobs
  const videoEls = clips.map(blob => {
    const v = document.createElement('video');
    v.src = URL.createObjectURL(blob);
    v.muted = true;
    v.playsInline = true;
    v.loop = true;
    return v;
  });

  // Wait for all videos to have enough data to play
  await Promise.all(videoEls.map(v => new Promise((res, rej) => {
    v.onloadeddata = res;
    v.onerror = () => rej(new Error(`Video load failed for clip`));
    v.load();
  })));

  // Load overlay PNG
  const overlay = new Image();
  await new Promise((res, rej) => {
    overlay.onload = res;
    overlay.onerror = rej;
    overlay.src = overlayUrl;
  });

  // Cap both width (1080) and height (1920) to keep file size reasonable
  const scale = Math.min(1080 / layoutW, 1920 / layoutH, 1);
  const cW = Math.round(layoutW * scale);
  const cH = Math.round(layoutH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = cW;
  canvas.height = cH;
  const ctx = canvas.getContext('2d');

  const mime = getBestVideoMime();
  const canvasStream = canvas.captureStream(30);
  const recorder = new MediaRecorder(canvasStream, {
    mimeType: mime,
    videoBitsPerSecond: 4_000_000,
  });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };

  const blobPromise = new Promise(resolve => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  // Prime canvas before recording starts
  await Promise.all(videoEls.map(v => v.play()));
  drawFrame(ctx, videoEls, zones, overlay, cW, cH, scale);

  recorder.start(100);

  let animId;
  let running = true;

  function loop() {
    if (!running) return;
    drawFrame(ctx, videoEls, zones, overlay, cW, cH, scale);
    animId = requestAnimationFrame(loop);
  }
  animId = requestAnimationFrame(loop);

  // Stop after duration + small buffer for encoder flush
  await new Promise(res => setTimeout(res, duration + 150));
  running = false;
  cancelAnimationFrame(animId);
  // Draw one last complete frame before stopping
  drawFrame(ctx, videoEls, zones, overlay, cW, cH, scale);
  recorder.stop();

  const blob = await blobPromise;

  videoEls.forEach(v => {
    v.pause();
    URL.revokeObjectURL(v.src);
  });

  return blob;
}
