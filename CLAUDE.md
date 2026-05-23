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

**Backend** — [server.cjs](server.cjs): vanilla `node:http` server. In production serves `dist/` (Vite build output). Handles `uploads/` under `/photos/:filename`, backgrounds under `/backgrounds/:filename`, and static files in `public/` (including `/frames/`). No npm web framework.

**Frontend** — React 18 + Vite. Source in [src/](src/), built to `dist/`:

| File/Dir | Responsibility |
|----------|---------------|
| [src/main.jsx](src/main.jsx) | React root mount, wraps `<AppProvider><App />` |
| [src/App.jsx](src/App.jsx) | Screen router, fetch config/backgrounds on mount, compose+upload orchestration |
| [src/context/AppContext.jsx](src/context/AppContext.jsx) | Global state via React Context + useState; `streamRef` as useRef |
| [src/data/constants.js](src/data/constants.js) | `layouts`, `frames`, `filters`, `DEFAULT_CONFIG` |
| [src/screens/](src/screens/) | LayoutScreen, FrameScreen, CameraScreen, LoadingScreen, ResultScreen |
| [src/components/](src/components/) | TopBar |
| [src/frames/](src/frames/) | Per-layout frame configs (zones, overlay URL, text position) |
| [src/camera.js](src/camera.js) | `startCamera`, `stopCamera`, `runCountdown`, `captureFrame`, `triggerFlash` |
| [src/compose.js](src/compose.js) | Canvas composition — draws background, photos, title, frame overlays |
| [src/upload.js](src/upload.js) | `POST /api/photos` (blob), QR code render via `qrcode-generator` |
| [src/app.css](src/app.css) | Tailwind v4 + custom CSS (gradients, pseudo-elements, safe-area) |

**Config** — [config/wedding.json](config/wedding.json): hot-reloadable, no restart needed. Runtime overrides CSS vars `--pink`, `--blush`, `--ink`.

## Key flows

**Photo capture → compose → upload:**
1. `CameraScreen` starts camera on mount via `startCamera(streamRef, videoEl, facingMode)`
2. `handleCapture()` loops `requiredShots` times: `runCountdown` → `captureFrame` → `triggerFlash`
3. After all shots, calls `onAllShotsTaken(shots)` in `App.jsx`
4. `App.jsx` calls `composePhoto(workCanvas, layout, shots, activeFrame, config, backgroundUrl)`
5. `uploadPhoto(blob, layoutId)` POSTs to `/api/photos`, server saves to `uploads/`
6. QR code rendered client-side via `qrcode-generator`

**Screen flow:**
```
layout → frame (skipped if layout.skipFrameSelect) → camera → loading → result
```

## Layouts

Defined in [src/data/constants.js](src/data/constants.js):

| id | name | shots | output size | shotRatio | notes |
|----|------|-------|-------------|-----------|-------|
| `strip` | 4格直列 | 4 | 720×2160 | 3/4 | |
| `grid` | 2x2 | 4 | 900×1400 | 3/4 | |
| `portrait` | 大頭貼 | 1 | 1080×1440 | 780/920 | |
| `frame01` | 愛心拍貼 | 6 | 784×1176 | 315/332 | `skipFrameSelect: true`, `showHeartGuide: true` |

**Adding a new frame layout:**
1. Add PNG to `public/frames/` (transparent heart/shape cutouts)
2. Create `src/frames/frameXX.js` with `OVERLAY_URL`, `ZONES`, `TEXT_Y`
3. Add entry to `layouts` in `constants.js` with `skipFrameSelect: true`
4. Add compose branch in `compose.js` (call `composeFrameXX`)
5. Add preview CSS (`.preview-frameXX`) in `app.css`

## Frame layout config (src/frames/frameXX.js)

```js
export const OVERLAY_URL = '/frames/frameXX.png'; // PNG with transparent photo zones
export const ZONES = [
  { x, y, w, h }, // bounding box for each photo zone (pixels at canvas resolution)
  ...
];
export const TEXT_Y = 1151; // y-center of bottom text strip
```

**frame01.png** must have transparent interiors in the heart areas so photos show through when the overlay is drawn on top. Photos are placed as rectangles in ZONES, then frame01.png is composited over them.

## Background images

Drop images into `public/backgrounds/` → they appear in the background selector on the Frame screen (for layouts that show it). Served at `/backgrounds/:filename`.

Frame overlay PNGs live in `public/frames/` (not backgrounds). Served as static files.

## Camera preview

- `updatePreviewRatio()` in `CameraScreen` uses `activeLayout.shotRatio` to set exact px dimensions on `.camera-preview`
- `<video>` is `position:absolute; object-cover` to prevent Safari stretching
- Called via double `requestAnimationFrame` on mount and window resize
- `showHeartGuide: true` on a layout renders an SVG heart dashed guide overlay on the camera preview

## Tailwind CSS

Uses **Tailwind v4** via `@tailwindcss/vite` plugin. No `tailwind.config.js` — all config in [src/app.css](src/app.css):

- `@theme { }` — design tokens (colors, fonts)
- `:root { }` — CSS custom properties (`--pink`, `--blush`, `--ink`) overridable by JS
- `@apply` — inside custom class definitions

## RWD Breakpoints

| Range | Layout |
|-------|--------|
| > 860px | Desktop: 3-col layout select, side-by-side camera/result |
| 600–860px | Tablet/iPad portrait: 2-col layout select, narrower side panel |
| ≤ 599px | Phone: stacked camera/result (flex column) |
| max-height ≤ 480px | Landscape phone: reduced min-heights |

## Wedding config

Edit `config/wedding.json` (hot-reloadable):
- `coupleName`: `"jim & camilla"`
- `weddingDate`: `"2026.11.07"`
- `tagline`: `"Wedding Photo Booth"`
- `publicBaseUrl`: set to HTTPS domain for QR code URLs
- `theme.primary/secondary/ink`: CSS color overrides

## Production checklist

- Run `npm run build` before `npm start`
- Set `publicBaseUrl` in `config/wedding.json` or `PUBLIC_BASE_URL` env var
- Clear `uploads/` before the event
- Deploy behind HTTPS for iPad/mobile camera access
