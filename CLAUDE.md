# CLAUDE.md

本文件提供 Claude Code 在此專案中的開發指引。

## 常用指令

```bash
npm install          # 安裝所有套件
npm run dev          # 啟動 Vite 開發伺服器（port 5173）+ 後端（port 3000）
npm run build        # Vite 建置 → dist/
npm start            # 正式環境：node server.cjs（在 port 3000 提供 dist/）
```

健康檢查：`GET http://localhost:3000/health` → `{ "ok": true }`

開發時前端跑在 **5173**（Vite HMR）。`/api/*`、`/photos/*`、`/view/*` 的請求會代理到後端 port 3000。

**ffmpeg（影片模式必要）：**
```bash
brew install ffmpeg      # macOS
apt install ffmpeg       # Ubuntu/Debian
winget install ffmpeg    # Windows
```
未安裝時影片仍可錄製，但不會轉成 H.264 MP4，LINE / IG 可能不相容。

---

## 架構

**後端** — [server.cjs](server.cjs)：純 `node:http`，無框架。正式環境提供 `dist/`。路由：
- `GET /view/:token` → HTML landing page（預覽 + 儲存按鈕，QR code 指向此處）
- `GET /photos/:token` → `uploads/` 原始檔（影片支援 Range requests）
- `POST /api/photos` → 接受 image/* 或 video/*；影片自動 ffmpeg 轉 H.264 MP4 faststart
- `GET /backgrounds/:filename` → `public/backgrounds/`
- `GET /frames/*`、其他靜態檔 → `public/`

**前端** — React 18 + Vite。原始碼在 [src/](src/)，建置輸出至 `dist/`：

| 檔案／目錄 | 職責 |
|-----------|------|
| [src/main.jsx](src/main.jsx) | React 根節點，包裝 `<AppProvider><App />` |
| [src/App.jsx](src/App.jsx) | 畫面路由、載入 config/backgrounds、compose+upload 協調 |
| [src/context/AppContext.jsx](src/context/AppContext.jsx) | 全域狀態（React Context + useState）；`streamRef` 用 useRef |
| [src/data/constants.js](src/data/constants.js) | `layouts`、`filters`、`DEFAULT_CONFIG` |
| [src/screens/](src/screens/) | LayoutScreen、CameraScreen、LoadingScreen、ResultScreen |
| [src/components/](src/components/) | TopBar |
| [src/frames/](src/frames/) | 各版型的框格設定（zones、overlay URL） |
| [src/camera.js](src/camera.js) | `startCamera`、`stopCamera`、`runCountdown`、`captureFrame`、`triggerFlash` |
| [src/compose.js](src/compose.js) | Canvas 合成：照片 drawCoverImage 到 ZONES + overlay PNG 疊圖 |
| [src/gif.js](src/gif.js) | `startClipRecorder`（逐格錄影）、server-side GIF 合成用 clip 上傳 |
| [src/video.js](src/video.js) | `startVideoClipRecorder`（MediaRecorder 錄 2s clip）、`composeMultiZoneVideo`（client-side 合成） |
| [src/upload.js](src/upload.js) | `uploadPhoto`、`uploadVideo`、GIF 相關上傳、QR code 產生 |
| [src/app.css](src/app.css) | Tailwind v4 + 自訂 CSS（漸層、偽元素、safe-area） |

**設定檔** — [config/wedding.json](config/wedding.json)：熱重載，改完不須重啟。執行時覆寫 CSS 變數 `--pink`、`--blush`、`--ink`。

---

## 主要流程

**靜態照片 → 合成 → 上傳：**
1. `CameraScreen` 掛載時透過 `startCamera(streamRef, videoEl, facingMode)` 啟動鏡頭
2. `handleCapture()` 循環 `requiredShots` 次：`runCountdown` → `captureFrame`（含水平翻轉）→ `triggerFlash`
3. 拍完呼叫 `onAllShotsTaken(shots)`，交給 `App.jsx`
4. `App.jsx` 呼叫 `composePhoto(workCanvas, layout, shots)`
5. `uploadPhoto(blob, layoutId)` POST 到 `/api/photos`，伺服器存入 `uploads/`
6. QR code 指向 `/photos/:token`

**影片 → 合成 → 上傳（新）：**
1. `handleVideoCapture()` 循環 `requiredShots` 次：`runCountdown` → `startVideoClipRecorder(stream, 2000ms)` → `triggerFlash` → 等候 clip blob
2. 所有格錄完後呼叫 `onVideoComposing()`（App 停鏡頭、顯示 loading）
3. `composeMultiZoneVideo(clips, zones, layoutW, layoutH, overlayUrl)` 在 client 端用 canvas + MediaRecorder 合成
   - 每格 clip 水平翻轉（與 captureFrame 一致）
   - 解析度 cap：`min(1080/layoutW, 1920/layoutH, 1)`
4. `uploadVideo(blob, layoutId)` POST 到 `/api/photos`
5. Server 用 ffmpeg 轉 H.264 MP4 + `-movflags +faststart`（LINE 縮圖、IG 相容必要）
6. QR code 指向 `/view/:token`（HTML landing page，含 Web Share API 存到相簿按鈕）

**動態 GIF → 合成 → 上傳（舊）：**
1. `handleGifCapture()` 循環 `requiredShots` 次：`runCountdown` → `startClipRecorder` 錄影 → `triggerFlash` → 停止錄影
2. 逐格上傳 clip 到 `/api/gif/clip`，之後呼叫 `/api/gif/compose`（server-side 合成）
3. QR code 指向 `/photos/:token`

**畫面流程：**
```
版型選擇 → 拍照（靜態 / 影片 / GIF）→ 載入中 → 結果
```

---

## 賓客下載影片流程（/view/:token）

QR code → `/view/:token` HTML 頁面：
- **iOS Safari**：點「儲存影片到相簿」→ Web Share API → 原生分享選單 → 「儲存影片」→ 相簿
- **LINE 內建瀏覽器**：自動顯示「在 Safari 中開啟」按鈕
- **Android Chrome**：Web Share API 或 fallback download
- **桌機**：blob download fallback

---

## 版型（Layouts）

定義於 [src/data/constants.js](src/data/constants.js)：

| id | 名稱 | 張數 | 輸出尺寸 | shotRatio |
|----|------|------|----------|-----------|
| `frame04` | 派對四格 | 4 | 2090×3135 | 910/1074 |
| `frame03` | 雲朵直條 | 4 | 858×2532 | 724/543 |
| `frame02` | 星空直條 | 3 | 784×1176 | 545/365 |
| `frame01` | 愛心拍貼 | 6 | 779×1172 | 315/332 |

所有版型皆 `skipFrameSelect: true`，無框格選擇畫面。

**新增框格版型步驟：**
1. 將 PNG 放入 `public/frames/`（透明鏤空）
2. 建立 `src/frames/frameXX.js`，含 `OVERLAY_URL`、`ZONES`
3. 在 `constants.js` 的 `layouts` 加入新項目
4. 在 `compose.js` 新增 frameXX 的 compose 分支 + import
5. 在 `CameraScreen.jsx` 的 `FRAME_GUIDE` 加入新版型
6. 在 `app.css` 新增 `.preview-frameXX` 預覽 CSS

## 框格設定格式（src/frames/frameXX.js）

```js
export const OVERLAY_URL = '/frames/frameXX.png'; // 透明鏤空的疊圖 PNG
export const ZONES = [
  { x, y, w, h }, // 每個照片格的邊界框（像素，以 canvas 解析度為準）
];
```

照片先 `drawCoverImage` 繪入 ZONES，再將 overlay PNG 疊上覆蓋邊框。ZONES 需要比透明區域略大（bleed）以覆蓋鋸齒邊緣。

**ZONES 校準方法：** 在瀏覽器 console 用 canvas `getImageData` 掃描 PNG 透明像素邊界，再加 bleed。

---

## 鏡頭預覽

- `CameraScreen` 的 `updatePreviewRatio()` 根據 `activeLayout.shotRatio` 設定 `.camera-preview` 的精確像素尺寸
- `<video>` 設定 `position:absolute; object-fit:cover`，防止 Safari 拉伸
- 掛載時與視窗 resize 時透過雙層 `requestAnimationFrame` 觸發
- `FRAME_GUIDE` registry（CameraScreen.jsx）：frame01/02/03/04 → ZONES + PNG URL，相機預覽用 CSS `background-image` 顯示對應格的引導框
- **水平翻轉**：`captureFrame` 和 `composeMultiZoneVideo` 的 `drawFrame` 均做 `ctx.scale(-1,1)`，確保輸出與 overlay 方向一致

---

## Tailwind CSS

使用 **Tailwind v4**（`@tailwindcss/vite` 外掛）。無 `tailwind.config.js`，設定全在 [src/app.css](src/app.css)：

- `@theme { }` — 設計 token（顏色、字型）
- `:root { }` — CSS 自訂屬性（`--pink`、`--blush`、`--ink`），可由 JS 覆寫
- `@apply` — 自訂 class 內使用

---

## RWD 斷點

| 範圍 | 版面 |
|------|------|
| > 860px | 桌機：版型選擇 3 欄，鏡頭／結果左右並排 |
| 600–860px | 平板直向：版型選擇 2 欄，側欄較窄 |
| ≤ 599px | 手機：鏡頭／結果垂直堆疊（flex column） |
| max-height ≤ 480px | 橫放手機：縮小最小高度 |

---

## 婚禮設定

編輯 `config/wedding.json`（熱重載，不須重啟）：
- `coupleName`：`"jim & camilla"`
- `weddingDate`：`"2026.11.07"`
- `tagline`：`"Wedding Photo Booth"`
- `publicBaseUrl`：設為 HTTPS 網域，QR code 用
- `theme.primary/secondary/ink`：CSS 顏色覆寫

---

## Agent 與 Skill 工作流程

### 可用 Skill（輸入斜線指令）

| 功能 | 指令 | 使用時機 |
|------|------|----------|
| 執行測試 | `/photo-test` | 任何 src/ 或 server.cjs 異動後 |
| 任務估算 | `/task-size` | 開始新功能前 |
| 資安稽核 | `/security-check` | 部署前、後端異動後 |
| UI/UX 檢查 | `/ui-check` | CSS 異動、新版型、手機修正後 |
| 程式碼審查 | `/code-reviewer` | 定期品質檢查 |
| 撰寫測試 | `/test-engineer` | 新功能需要測試覆蓋時 |

### 可用 Subagent

| Agent | 用途 |
|-------|------|
| `cavecrew-investigator` | 找出函式／class 定義位置 |
| `cavecrew-builder` | 精準修改 1–2 個檔案 |
| `cavecrew-reviewer` | commit 前審查 diff |
| `security-auditor` | 深度資安分析 |

### 決策流程

```
新功能？
  → 先 /task-size → 取得規模與可行性評估
  → 進入 Plan 模式 → 設計方案

開發中？
  → cavecrew-builder 處理小改動
  → cavecrew-investigator 找現有程式碼複用

完成後？
  → /photo-test → 必須通過才能 commit
  → cavecrew-reviewer → 審查 diff

部署前？
  → /security-check → 修復所有 CRITICAL/HIGH
  → /ui-check → 確認手機畫面正常
```

### Hook：自動測試提醒
編輯任何 `src/` 檔案或 `server.cjs` 時，會自動提示「請在 commit 前執行 /photo-test」。

---

## 測試（Playwright）

測試腳本放在 `scripts/`。每次重大異動後執行：

```bash
python scripts/with_server.py --server "npm run dev" --port 5173 -- python scripts/test_webapp.py
```

**首次安裝（一次性）：**
```bash
pip install playwright
python -m playwright install chromium
```

`scripts/with_server.py` — 啟動開發伺服器，等待 port 5173，執行指令，結束後關閉伺服器。
`scripts/test_webapp.py` — 12 個 Playwright 測試：版型畫面、框格選擇、frame01 直跳鏡頭、愛心引導框、拍攝計數、濾鏡列、返回導覽。

**規則：回報任務完成前必須先跑測試。測試失敗則修復後才能 commit。**

新版型的測試：在 `test_webapp.py` 加入 `check()` 區塊，驗證版型卡片出現、導覽正確、拍攝計數正確。

---

## 上線前檢查清單

- 執行 `npm run build` 再 `npm start`
- 在 `config/wedding.json` 設定 `publicBaseUrl` 或 `PUBLIC_BASE_URL` 環境變數
- 確認 `ffmpeg` 已安裝（`ffmpeg -version`）
- 活動前清空 `uploads/`
- 部署於 HTTPS（iPad／手機鏡頭存取必要）
