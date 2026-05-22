# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install all deps
npm run dev          # Vite dev server (port 5173) + backend (port 3000) in parallel
npm run build        # Vite build → dist/
npm start            # production: node server.cjs (serve dist/ on port 3000)
```

Health check: `GET http://localhost:3000/health` → `{ "ok": true }`

During dev, the frontend runs on port **5173** (Vite with HMR). API calls to `/api/*` and `/photos/*` are proxied to the backend on port 3000.

## Architecture

**Backend** — [server.cjs](server.cjs): vanilla `node:http` server. In production serves `dist/` (Vite build output), falling back to `public/`. Handles `uploads/` under `/photos/:filename`. No npm web framework.

**Frontend** — source in [src/](src/), built to `dist/` by Vite:

| File | Responsibility |
|------|---------------|
| [src/main.js](src/main.js) | Entry point, boot, event binding, orchestrates cross-module flows |
| [src/state.js](src/state.js) | Shared mutable `state` object and `layouts` config |
| [src/ui.js](src/ui.js) | DOM element refs (`els`), screen switching, config apply, shot UI |
| [src/camera.js](src/camera.js) | `getUserMedia`, countdown, `captureFrame`, camera switch |
| [src/compose.js](src/compose.js) | Canvas composition — draws background, photos, title |
| [src/upload.js](src/upload.js) | `POST /api/photos`, QR code render via `qrcode-generator` |
| [src/app.css](src/app.css) | Tailwind v4 + custom CSS (gradients, pseudo-elements, safe-area) |

**Config** — [config/wedding.json](config/wedding.json): read on every request by `readConfig()` (no caching, hot-reloadable). JS overrides CSS vars `--pink`, `--blush`, `--ink` at runtime via `applyConfig()`.

## Key flows

**Photo capture → compose → upload:**
1. `handleCapture()` in `main.js` runs countdown, calls `captureFrame()` (mirrors front camera via `ctx.scale(-1,1)`)
2. After all shots collected, `composePhoto()` draws to `#workCanvas` at layout's full resolution
3. `uploadPhoto()` POSTs `{ layout, imageData }` as JSON to `/api/photos`
4. Server saves PNG to `uploads/`, returns `{ id, filename, downloadUrl }`
5. QR code rendered client-side via `qrcode-generator` (ES module import, bundled by Vite)

**Layouts:**
| id | shots | output size |
|----|-------|-------------|
| `strip` | 4 | 1200×3600 |
| `grid` | 4 | 2200×2200 |
| `portrait` | 1 | 1600×2200 |

**Camera:** requires HTTPS in production (Safari/iPad). `http://localhost:5173` works for desktop dev.

## Tailwind CSS

Uses **Tailwind v4** via `@tailwindcss/vite` plugin. No `tailwind.config.js` needed — all config is in [src/app.css](src/app.css):

- `@theme { }` — design tokens (colors, fonts)
- `:root { }` — CSS custom properties (`--pink`, `--blush`, `--ink`) that JS can override at runtime
- `@apply` — used inside custom class definitions for complex components
- Complex styles (multi-stop gradients, pseudo-elements, safe-area insets) stay as plain CSS

## RWD Breakpoints

| Range | Layout |
|-------|--------|
| > 860px | Desktop: 3-col layout select, side-by-side camera/result |
| 600–860px | Tablet/iPad portrait: 2-col layout select, narrower side panel |
| ≤ 599px | Phone: horizontal layout cards, stacked camera/result (flex column) |
| max-height ≤ 480px | Landscape phone: reduced min-heights |

## Production checklist

- Run `npm run build` before `npm start`
- Set `publicBaseUrl` in `config/wedding.json` or `PUBLIC_BASE_URL` env var to the HTTPS domain
- Clear `uploads/` before the event
- Deploy behind HTTPS for iPad camera access
