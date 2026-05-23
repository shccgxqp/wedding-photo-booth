const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

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

  const allowedTypes = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const ext = allowedTypes[contentType];
  if (!ext) {
    sendJson(res, 400, { error: "Only image/jpeg, image/png, image/webp are accepted." });
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
