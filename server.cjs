const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const uploadsDir = path.join(rootDir, "uploads");
const publicDir = path.join(rootDir, "dist");
const configPath = path.join(rootDir, "config", "wedding.json");

fs.mkdirSync(uploadsDir, { recursive: true });

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

  sendJson(res, 201, {
    id: path.parse(filename).name,
    filename,
    downloadUrl: `${getOrigin(req)}/photos/${encodeURIComponent(filename)}`
  });
}

function handlePhotoList(_req, res) {
  const photos = fs
    .readdirSync(uploadsDir)
    .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
    .sort()
    .reverse();
  sendJson(res, 200, { photos });
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
    handlePhotoList(req, res);
    return;
  }

  if (req.method === "POST" && pathname === "/api/photos") {
    handlePhotoUpload(req, res);
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/photos/")) {
    const filename = path.basename(decodeURIComponent(pathname.replace("/photos/", "")));
    serveFile(res, path.join(uploadsDir, filename), {
      disposition: `inline; filename="${filename}"`
    });
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
