const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { PNG } = require("pngjs");
const omggif = require("omggif");
const GIFEncoder = require("gif-encoder-2");

const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const uploadsDir = path.join(rootDir, "uploads");
const publicDir = path.join(rootDir, "dist");
const backgroundsDir = path.join(rootDir, "public", "backgrounds");
const configPath = path.join(rootDir, "config", "wedding.json");

fs.mkdirSync(uploadsDir, { recursive: true });

// Load .env without external dependencies
function loadEnv() {
  try {
    const lines = fs.readFileSync(path.join(rootDir, ".env"), "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {}
}
loadEnv();

const UPLOAD_SECRET = process.env.UPLOAD_SECRET || "";
if (!UPLOAD_SECRET) console.warn("[security] UPLOAD_SECRET not set — photo URLs are insecure");

// Derive 32-byte AES key from UPLOAD_SECRET
const CIPHER_KEY = crypto.createHash("sha256").update(UPLOAD_SECRET || "insecure-default").digest();

// Encrypt filename → URL-safe token (AES-256-GCM, random IV each call)
function encryptFilename(filename) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", CIPHER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(filename, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

// Decrypt token → filename; returns null if invalid/tampered
function decryptToken(token) {
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", CIPHER_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch {
    return null;
  }
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
};

function readConfig() {
  const fallback = {
    coupleName: "HAN & YU",
    weddingDate: "2026.05.22",
    tagline: "Wedding Photo Booth",
    countdownSeconds: 3,
    publicBaseUrl: "",
    theme: {
      primary: "#f28ca8",
      secondary: "#fff4f7",
      ink: "#49333a"
    }
  };

  try {
    return { ...fallback, ...JSON.parse(fs.readFileSync(configPath, "utf8")) };
  } catch {
    return fallback;
  }
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function safeJoin(baseDir, requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const cleanPath = decoded.replace(/^[/\\]+/, "");
  const filePath = path.normalize(path.join(baseDir, cleanPath));
  return filePath.startsWith(baseDir) ? filePath : null;
}

function serveFile(res, filePath, options = {}) {
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendText(res, 404, "Not found.");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const headers = {
    "Content-Type": contentTypes[ext] || "application/octet-stream"
  };

  if (options.disposition) {
    headers["Content-Disposition"] = options.disposition;
  }

  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
}

function getOrigin(req) {
  const configured = process.env.PUBLIC_BASE_URL || readConfig().publicBaseUrl;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function safeLayoutName(value) {
  const cleaned = String(value || "photo").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return cleaned.replace(/-+/g, "-").replace(/^-|-$/g, "") || "photo";
}

function readRequestBody(req, maxBytes = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function handlePhotoUpload(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const layout = url.searchParams.get("layout") || "photo";
  const contentType = (req.headers["content-type"] || "").split(";")[0].trim();

  const allowedTypes = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  const ext = allowedTypes[contentType];
  if (!ext) {
    sendJson(res, 400, { error: "Only image/jpeg, image/png, image/webp, image/gif are accepted." });
    return;
  }

  const buffer = await readRequestBody(req);
  if (buffer.length < 1000) {
    sendJson(res, 400, { error: "Image is too small or empty." });
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = crypto.randomBytes(4).toString("hex");
  const filename = `${date}_${safeLayoutName(layout)}_${timestamp}_${random}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);

  const token = encryptFilename(filename);

  sendJson(res, 201, {
    id: path.parse(filename).name,
    filename,
    token,
    downloadUrl: `${getOrigin(req)}/photos/${token}`
  });
}

// ── GIF compositing helpers ──────────────────────────────────────────────────

function scaleImage(src, srcW, srcH, dstW, dstH) {
  const dst = new Uint8Array(dstW * dstH * 4);
  const sx = srcW / dstW, sy = srcH / dstH;
  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const sxf = dx * sx, syf = dy * sy;
      const x0 = Math.min(Math.floor(sxf), srcW-1), x1 = Math.min(x0+1, srcW-1);
      const y0 = Math.min(Math.floor(syf), srcH-1), y1 = Math.min(y0+1, srcH-1);
      const fx = sxf-x0, fy = syf-y0;
      const w00=(1-fx)*(1-fy), w10=fx*(1-fy), w01=(1-fx)*fy, w11=fx*fy;
      const i00=(y0*srcW+x0)*4, i10=(y0*srcW+x1)*4;
      const i01=(y1*srcW+x0)*4, i11=(y1*srcW+x1)*4;
      const di=(dy*dstW+dx)*4;
      for (let c=0; c<4; c++)
        dst[di+c] = Math.round(src[i00+c]*w00+src[i10+c]*w10+src[i01+c]*w01+src[i11+c]*w11);
    }
  }
  return dst;
}

function blitCover(src, srcW, srcH, dst, dstW, dstX, dstY, zoneW, zoneH) {
  const srcRatio = srcW / srcH;
  const dstRatio = zoneW / zoneH;
  let cropX = 0, cropY = 0, cropW = srcW, cropH = srcH;
  if (srcRatio > dstRatio) { cropW = Math.round(srcH * dstRatio); cropX = Math.round((srcW - cropW) / 2); }
  else { cropH = Math.round(srcW / dstRatio); cropY = Math.round((srcH - cropH) / 2); }
  const scaleX = cropW / zoneW;
  const scaleY = cropH / zoneH;
  for (let dy = 0; dy < zoneH; dy++) {
    for (let dx = 0; dx < zoneW; dx++) {
      const sxf = cropX + dx * scaleX;
      const syf = cropY + dy * scaleY;
      const x0 = Math.min(Math.floor(sxf), srcW - 1);
      const y0 = Math.min(Math.floor(syf), srcH - 1);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const y1 = Math.min(y0 + 1, srcH - 1);
      const fx = sxf - x0;
      const fy = syf - y0;
      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;
      const di = ((dstY + dy) * dstW + (dstX + dx)) * 4;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      dst[di]   = Math.round(src[i00]   * w00 + src[i10]   * w10 + src[i01]   * w01 + src[i11]   * w11);
      dst[di+1] = Math.round(src[i00+1] * w00 + src[i10+1] * w10 + src[i01+1] * w01 + src[i11+1] * w11);
      dst[di+2] = Math.round(src[i00+2] * w00 + src[i10+2] * w10 + src[i01+2] * w01 + src[i11+2] * w11);
    }
  }
}

// Separable box blur (2-pass, radius 1) — reduces video noise before GIF quantization
function blurRGBA(src, w, h) {
  const tmp = new Uint8ClampedArray(src.length);
  // horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const l = x > 0 ? i - 4 : i;
      const r = x < w - 1 ? i + 4 : i;
      tmp[i]   = (src[l]   + src[i]   + src[r])   / 3;
      tmp[i+1] = (src[l+1] + src[i+1] + src[r+1]) / 3;
      tmp[i+2] = (src[l+2] + src[i+2] + src[r+2]) / 3;
      tmp[i+3] = 255;
    }
  }
  // vertical pass back into src
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const u = y > 0 ? i - w * 4 : i;
      const d = y < h - 1 ? i + w * 4 : i;
      src[i]   = (tmp[u]   + tmp[i]   + tmp[d])   / 3;
      src[i+1] = (tmp[u+1] + tmp[i+1] + tmp[d+1]) / 3;
      src[i+2] = (tmp[u+2] + tmp[i+2] + tmp[d+2]) / 3;
      src[i+3] = 255;
    }
  }
}

function alphaOver(dst, dstW, overlay, overlayW, overlayH) {
  for (let y = 0; y < overlayH; y++) {
    for (let x = 0; x < overlayW; x++) {
      const si = (y * overlayW + x) * 4;
      const di = (y * dstW + x) * 4;
      const a = overlay[si + 3] / 255;
      if (a === 0) continue;
      dst[di]   = Math.round(overlay[si]   * a + dst[di]   * (1 - a));
      dst[di+1] = Math.round(overlay[si+1] * a + dst[di+1] * (1 - a));
      dst[di+2] = Math.round(overlay[si+2] * a + dst[di+2] * (1 - a));
    }
  }
}

// POST /api/gif/clip?session=<id>&idx=<n>
// Body: image/gif (single compressed clip)
async function handleGifClipUpload(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const session = url.searchParams.get("session") || "";
  const idx = parseInt(url.searchParams.get("idx") || "-1");

  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(session) || idx < 0 || idx > 20) {
    sendJson(res, 400, { error: "Invalid params" }); return;
  }

  const buffer = await readRequestBody(req, 10 * 1024 * 1024);
  const clipPath = path.join(uploadsDir, `clip_${session}_${idx}.gif`);
  fs.writeFileSync(clipPath, buffer);
  sendJson(res, 200, { ok: true });
}

// POST /api/gif/compose
// Body JSON: { sessionId, layoutId, layoutW, layoutH, zones }
async function handleGifCompose(req, res) {
  try {
    const bodyBuf = await readRequestBody(req, 1024 * 1024);
    const { sessionId, layoutId, layoutW, layoutH, zones } =
      JSON.parse(bodyBuf.toString("utf8"));

    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(sessionId)) {
      sendJson(res, 400, { error: "Invalid session" }); return;
    }

    // Decode clip GIFs
    const clips = zones.map((_, i) => {
      const p = path.join(uploadsDir, `clip_${sessionId}_${i}.gif`);
      if (!fs.existsSync(p)) { console.warn(`[gif] missing clip ${i}`); return { frames: [], w: 180, h: 240 }; }
      const buf = fs.readFileSync(p);
      const gr = new omggif.GifReader(buf);
      const n = gr.numFrames();
      const info = gr.frameInfo(0);
      const fw = info.width, fh = info.height;
      const frames = Array.from({ length: n }, (_, f) => {
        const px = new Uint8Array(fw * fh * 4);
        gr.decodeAndBlitFrameRGBA(f, px);
        return px;
      });
      return { frames, w: fw, h: fh };
    });

    // Load overlay PNG
    const overlayPath = path.join(rootDir, "public", "frames", `${layoutId}.png`);
    let overlayScaled = null;
    const maxZoneW = zones.reduce((m, z) => Math.max(m, z.w), 0);
    const clipW = clips.find(c => c.frames.length > 0)?.w || 480;
    const GIF_MAX_W = Math.min(layoutW, Math.floor(clipW * layoutW / (maxZoneW || clipW)));
    const scale = Math.min(GIF_MAX_W / layoutW, 1);
    const gifW = Math.round(layoutW * scale);
    const gifH = Math.round(layoutH * scale);

    if (fs.existsSync(overlayPath)) {
      const png = PNG.sync.read(fs.readFileSync(overlayPath));
      overlayScaled = scaleImage(png.data, png.width, png.height, gifW, gifH);
    }

    // Encode GIF frames
    const maxFrames = Math.max(...clips.map((c) => c.frames.length), 1);
    const encoder = new GIFEncoder(gifW, gifH);
    encoder.setRepeat(0);
    encoder.setDelay(100);
    encoder.setQuality(1);
    encoder.start();

    for (let f = 0; f < maxFrames; f++) {
      const frame = new Uint8ClampedArray(gifW * gifH * 4).fill(255);

      for (let z = 0; z < zones.length; z++) {
        const clip = clips[z];
        if (!clip.frames.length) continue;
        const rawFrame = clip.frames[f % clip.frames.length];
        const smoothed = new Uint8ClampedArray(rawFrame);
        blurRGBA(smoothed, clip.w, clip.h);
        const zone = zones[z];
        const dstX = Math.round(zone.x * scale);
        const dstY = Math.round(zone.y * scale);
        const zoneW = Math.round(zone.w * scale);
        const zoneH = Math.round(zone.h * scale);
        blitCover(smoothed, clip.w, clip.h, frame, gifW, dstX, dstY, zoneW, zoneH);
      }

      if (overlayScaled) alphaOver(frame, gifW, overlayScaled, gifW, gifH);
      encoder.addFrame(frame);
    }

    encoder.finish();
    const gifBuffer = Buffer.from(encoder.out.getData());

    const date = new Date().toISOString().slice(0, 10);
    const random = crypto.randomBytes(4).toString("hex");
    const filename = `${date}_${safeLayoutName(layoutId)}_gif_${random}.gif`;
    fs.writeFileSync(path.join(uploadsDir, filename), gifBuffer);
    const token = encryptFilename(filename);

    // Cleanup temp clips
    zones.forEach((_, i) => {
      fs.unlink(path.join(uploadsDir, `clip_${sessionId}_${i}.gif`), () => {});
    });

    sendJson(res, 201, { token, filename, downloadUrl: `${getOrigin(req)}/photos/${token}` });
  } catch (err) {
    console.error("[gif/compose]", err);
    sendJson(res, 500, { error: String(err.message || err) });
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/config") {
    const config = readConfig();
    sendJson(res, 200, {
      coupleName: config.coupleName,
      weddingDate: config.weddingDate,
      tagline: config.tagline,
      countdownSeconds: Number(config.countdownSeconds || 3),
      theme: config.theme
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/photos") {
    sendText(res, 404, "Not found.");
    return;
  }

  if (req.method === "GET" && pathname === "/api/backgrounds") {
    fs.mkdirSync(backgroundsDir, { recursive: true });
    const files = fs
      .readdirSync(backgroundsDir)
      .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
      .sort();
    const backgrounds = files.map((f) => ({
      filename: f,
      url: `/backgrounds/${encodeURIComponent(f)}`,
    }));
    sendJson(res, 200, { backgrounds });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/backgrounds/")) {
    const filename = path.basename(decodeURIComponent(pathname.replace("/backgrounds/", "")));
    serveFile(res, path.join(backgroundsDir, filename));
    return;
  }

  if (req.method === "POST" && pathname === "/api/photos") {
    handlePhotoUpload(req, res);
    return;
  }

  if (req.method === "POST" && pathname === "/api/gif/clip") {
    return handleGifClipUpload(req, res);
  }

  if (req.method === "POST" && pathname === "/api/gif/compose") {
    return handleGifCompose(req, res);
  }

  if (req.method === "GET" && pathname.startsWith("/photos/")) {
    const rawToken = decodeURIComponent(pathname.replace("/photos/", ""));
    const filename = decryptToken(rawToken);
    if (!filename) {
      sendText(res, 404, "Not found.");
      return;
    }
    const filePath = path.join(uploadsDir, path.basename(filename));
    serveFile(res, filePath, { disposition: `inline; filename="${path.basename(filename)}"` });
    return;
  }

  if (req.method === "GET") {
    const staticPath = pathname === "/" ? "/index.html" : pathname;
    serveFile(res, safeJoin(publicDir, staticPath));
    return;
  }

  sendText(res, 405, "Method not allowed.");
}

const server = http.createServer((req, res) => {
  Promise.resolve(route(req, res)).catch((error) => {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error." });
  });
});

server.listen(port);
