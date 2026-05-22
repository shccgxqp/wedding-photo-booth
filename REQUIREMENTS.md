# Wedding Photo Booth 需求確認文件

## 1. 專案目標

建立一個婚禮當天使用的 iPad 拍貼機網頁。賓客可以在現場選擇拍貼版型、使用 iPad 相機拍照、產生完成照，系統會把照片存到伺服器資料夾，並顯示下載連結與 QR Code，讓賓客用自己的手機掃碼下載照片。

## 2. 使用情境

- 使用者：婚禮現場賓客。
- 裝置：主要使用 iPad 開啟拍照頁面。
- 網路：正式使用時會部署到 HTTPS 網域，確保瀏覽器可啟用相機權限。
- 儲存：照片公開存放在伺服器資料夾，不做登入、權限控管、雲端同步或自動刪除。
- 目的：婚禮當天短期使用，保存珍貴回憶，方便賓客現場掃碼帶走照片。

## 3. 核心功能

### 3.1 拍照流程

- 首頁直接進入拍貼機操作，不做行銷 landing page。
- 使用者先選擇版型。
- 系統開啟 iPad 相機預覽。
- 使用倒數拍攝。
- 支援重新拍上一張。
- 支援前後鏡頭切換。
- 拍完指定張數後，自動合成最終照片。

### 3.2 版型

- `4格直列`
  - 經典人生四格形式。
  - 拍攝 4 張照片。
  - 輸出直式長條成品。
- `2x2`
  - 四宮格拼貼。
  - 拍攝 4 張照片。
  - 輸出方形拼貼成品。
- `大頭貼`
  - 單張大照片。
  - 拍攝 1 張照片。
  - 留較多空間顯示婚禮文字與日期。

### 3.3 照片合成

- 前端使用 Canvas 合成最終 PNG。
- 合成內容包含：
  - 拍攝照片。
  - 對應版型背景框。
  - 新人名字。
  - 婚禮日期。
  - 專案標語。
- 每個版型有獨立輸出尺寸與照片排列方式。

### 3.4 伺服器儲存

- 完成照片上傳到後端。
- 後端將 PNG 存入 `uploads/`。
- 檔名使用日期、版型、時間戳與隨機碼，避免檔名撞到。
- 測試照片不應留在正式使用資料夾中。

### 3.5 下載與 QR Code

- 後端儲存成功後回傳：
  - `id`
  - `filename`
  - `downloadUrl`
- 前端顯示：
  - 最終照片預覽。
  - 可點擊下載連結。
  - 對應 `downloadUrl` 的 QR Code。
  - `再拍一組` 按鈕。
  - `回版型選擇` 按鈕。
- 賓客用手機掃 QR Code 後，可開啟並下載照片。

## 4. 視覺需求

- 風格：韓式拍貼粉白風。
- 色系：柔和粉白、乾淨奶白、少量點綴色。
- 介面：適合 iPad 觸控操作，大按鈕、清楚狀態提示。
- 第一屏：直接顯示版型選擇，不能變成品牌介紹頁。
- 拍照頁：相機預覽要是主要焦點。
- 完成頁：照片、QR Code、下載按鈕要清楚可見。

## 5. 設定需求

設定檔位置：

```text
config/wedding.json
```

目前可設定：

- `coupleName`：新人名字。
- `weddingDate`：婚禮日期。
- `tagline`：照片與頁面上的標語。
- `countdownSeconds`：拍照倒數秒數。
- `publicBaseUrl`：正式部署網址，用於產生 QR Code 下載連結。
- `theme.primary`：主色。
- `theme.secondary`：輔助底色。
- `theme.ink`：文字色。

正式部署時，若有固定 HTTPS 網域，需設定：

```json
{
  "publicBaseUrl": "https://your-domain.example"
}
```

或使用環境變數：

```bash
PUBLIC_BASE_URL=https://your-domain.example npm start
```

## 6. 後端 API

### `GET /health`

用途：檢查伺服器是否正常。

回傳範例：

```json
{
  "ok": true
}
```

### `GET /api/config`

用途：前端取得婚禮設定。

回傳內容包含新人名字、日期、標語、倒數秒數與主題色。

### `POST /api/photos`

用途：前端上傳合成完成的 PNG。

Request body：

```json
{
  "layout": "strip",
  "imageData": "data:image/png;base64,..."
}
```

成功回傳：

```json
{
  "id": "photo-id",
  "filename": "photo-file.png",
  "downloadUrl": "https://your-domain.example/photos/photo-file.png"
}
```

### `GET /photos/:filename`

用途：提供賓客手機開啟與下載照片。

## 7. 驗收清單

### 本機測試

- [ ] `npm install` 可正常安裝套件。
- [ ] `npm start` 可啟動伺服器。
- [ ] `http://localhost:3000/health` 回傳 `{ "ok": true }`。
- [ ] 首頁可看到三種版型。
- [ ] 桌機瀏覽器可開啟相機權限。
- [ ] 三種版型都能完成拍攝流程。
- [ ] 完成照片會存到 `uploads/`。
- [ ] 完成頁會顯示下載連結。
- [ ] 完成頁會顯示 QR Code。
- [ ] QR Code 掃描後可開啟同一張照片。

### iPad 測試

- [ ] 使用 HTTPS 網域開啟頁面。
- [ ] Safari 可成功請求相機權限。
- [ ] 相機預覽正常顯示。
- [ ] 拍照、重拍、切換鏡頭可正常操作。
- [ ] 橫向與直向畫面不重疊。
- [ ] 完成頁 QR Code 足夠清楚，手機可掃描。
- [ ] 手機掃碼後可下載照片。

### 現場前檢查

- [ ] `config/wedding.json` 已改成正確新人名字。
- [ ] `config/wedding.json` 已改成正確婚禮日期。
- [ ] `publicBaseUrl` 已設定為正式 HTTPS 網域。
- [ ] `uploads/` 已清空測試照片，只保留 `.gitkeep` 或空資料夾。
- [ ] 伺服器硬碟空間足夠。
- [ ] iPad 已允許相機權限。
- [ ] 現場 Wi-Fi 或網路連線穩定。

## 8. 已知限制

- 照片公開下載，知道連結的人都可以開啟。
- 不提供登入、密碼、相簿管理、後台刪除或雲端備份。
- 相機權限依瀏覽器規則，正式環境必須使用 HTTPS。
- 若未設定 `publicBaseUrl`，系統會依請求來源自動產生下載網址；正式部署建議明確設定。
- 目前是活動專用系統，重點是婚禮當天可靠拍攝與下載，不是長期相簿平台。

## 9. 啟動方式

```bash
npm install
npm start
```

本機測試：

```text
http://localhost:3000
```

正式使用：

```text
https://your-domain.example
```
