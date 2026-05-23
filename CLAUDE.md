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

開發時前端跑在 **5173**（Vite HMR）。`/api/*` 和 `/photos/*` 的請求會代理到後端 port 3000。

---

## 架構

**後端** — [server.cjs](server.cjs)：純 `node:http`，無框架。正式環境提供 `dist/`。路由：
- `/photos/:filename` → `uploads/` 目錄
- `/backgrounds/:filename` → `public/backgrounds/`
- `/frames/*`、其他靜態檔 → `public/`

**前端** — React 18 + Vite。原始碼在 [src/](src/)，建置輸出至 `dist/`：

| 檔案／目錄 | 職責 |
|-----------|------|
| [src/main.jsx](src/main.jsx) | React 根節點，包裝 `<AppProvider><App />` |
| [src/App.jsx](src/App.jsx) | 畫面路由、載入 config/backgrounds、compose+upload 協調 |
| [src/context/AppContext.jsx](src/context/AppContext.jsx) | 全域狀態（React Context + useState）；`streamRef` 用 useRef |
| [src/data/constants.js](src/data/constants.js) | `layouts`、`frames`、`filters`、`DEFAULT_CONFIG` |
| [src/screens/](src/screens/) | LayoutScreen、FrameScreen、CameraScreen、LoadingScreen、ResultScreen |
| [src/components/](src/components/) | TopBar |
| [src/frames/](src/frames/) | 各版型的框格設定（zones、overlay URL、文字位置） |
| [src/camera.js](src/camera.js) | `startCamera`、`stopCamera`、`runCountdown`、`captureFrame`、`triggerFlash` |
| [src/compose.js](src/compose.js) | Canvas 合成：背景、照片、標題、框格疊圖 |
| [src/upload.js](src/upload.js) | `POST /api/photos`（blob）、QR code 產生（qrcode-generator） |
| [src/app.css](src/app.css) | Tailwind v4 + 自訂 CSS（漸層、偽元素、safe-area） |

**設定檔** — [config/wedding.json](config/wedding.json)：熱重載，改完不須重啟。執行時覆寫 CSS 變數 `--pink`、`--blush`、`--ink`。

---

## 主要流程

**拍照 → 合成 → 上傳：**
1. `CameraScreen` 掛載時透過 `startCamera(streamRef, videoEl, facingMode)` 啟動鏡頭
2. `handleCapture()` 循環 `requiredShots` 次：`runCountdown` → `captureFrame` → `triggerFlash`
3. 拍完呼叫 `onAllShotsTaken(shots)`，交給 `App.jsx`
4. `App.jsx` 呼叫 `composePhoto(workCanvas, layout, shots, activeFrame, config, backgroundUrl)`
5. `uploadPhoto(blob, layoutId)` POST 到 `/api/photos`，伺服器存入 `uploads/`
6. 用戶端用 `qrcode-generator` 產生 QR code

**畫面流程：**
```
版型選擇 → 框格選擇（若 skipFrameSelect 則跳過）→ 拍照 → 載入中 → 結果
```

---

## 版型（Layouts）

定義於 [src/data/constants.js](src/data/constants.js)：

| id | 名稱 | 張數 | 輸出尺寸 | shotRatio | 備註 |
|----|------|------|----------|-----------|------|
| `strip` | 4格直列 | 4 | 720×2160 | 3/4 | |
| `grid` | 2x2 | 4 | 900×1400 | 3/4 | |
| `portrait` | 大頭貼 | 1 | 1080×1440 | 780/920 | |
| `frame01` | 愛心拍貼 | 6 | 784×1176 | 315/332 | `skipFrameSelect: true`、`showHeartGuide: true` |

**新增框格版型步驟：**
1. 將 PNG 放入 `public/frames/`（透明心形／形狀鏤空）
2. 建立 `src/frames/frameXX.js`，含 `OVERLAY_URL`、`ZONES`、`TEXT_Y`
3. 在 `constants.js` 的 `layouts` 加入新項目，設 `skipFrameSelect: true`
4. 在 `compose.js` 新增 frameXX 的 compose 分支
5. 在 `app.css` 新增 `.preview-frameXX` 預覽 CSS

## 框格設定格式（src/frames/frameXX.js）

```js
export const OVERLAY_URL = '/frames/frameXX.png'; // 透明鏤空的疊圖 PNG
export const ZONES = [
  { x, y, w, h }, // 每個照片格的邊界框（像素，以 canvas 解析度為準）
  ...
];
export const TEXT_Y = 1151; // 底部文字條的垂直中心 y 值
```

**frame01.png** 必須在愛心區域內部保持透明，讓底層照片透出來。照片先畫在 ZONES 矩形上，再將 frame01.png 疊上去。

---

## 背景圖片

放入 `public/backgrounds/` → 自動出現在框格選擇畫面的背景選擇器。提供網址：`/backgrounds/:filename`。

框格疊圖 PNG 放在 `public/frames/`（不是 backgrounds）。

---

## 鏡頭預覽

- `CameraScreen` 的 `updatePreviewRatio()` 根據 `activeLayout.shotRatio` 設定 `.camera-preview` 的精確像素尺寸
- `<video>` 設定 `position:absolute; object-fit:cover`，防止 Safari 拉伸
- 掛載時與視窗 resize 時透過雙層 `requestAnimationFrame` 觸發
- 版型設 `showHeartGuide: true` 時，鏡頭預覽上顯示 SVG 愛心虛線引導框

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

`scripts/with_server.py` — 啟動開發伺服器，等待 port 5175，執行指令，結束後關閉伺服器。
`scripts/test_webapp.py` — 12 個 Playwright 測試：版型畫面、框格選擇、frame01 直跳鏡頭、愛心引導框、拍攝計數、濾鏡列、返回導覽。

**規則：回報任務完成前必須先跑測試。測試失敗則修復後才能 commit。**

新版型的測試：在 `test_webapp.py` 加入 `check()` 區塊，驗證版型卡片出現、導覽正確、拍攝計數正確。

---

## 上線前檢查清單

- 執行 `npm run build` 再 `npm start`
- 在 `config/wedding.json` 設定 `publicBaseUrl` 或 `PUBLIC_BASE_URL` 環境變數
- 活動前清空 `uploads/`
- 部署於 HTTPS（iPad／手機鏡頭存取必要）
