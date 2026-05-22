import './app.css';
import { state, layouts } from './state.js';

const LOADING_MESSAGES = [
  '吃飽沒？新郎關心您',
  '天氣很熱，我熱情如火',
  '新娘說：你們最好笑得好看',
  '照片正在飛往愛情的彼岸…',
  '正在撒上幸福的玫瑰花瓣',
  '回憶正在被精心裝裱中',
  '幸福製造中，請稍候…',
  '感謝出席，今天你們最美',
];

let _msgTimer = null;

function randomMessage(exclude) {
  const pool = LOADING_MESSAGES.filter((m) => m !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

function startMessageCycle() {
  let current = randomMessage('');
  els.loadingMessage.style.opacity = '1';
  els.loadingMessage.textContent = current;
  _msgTimer = setInterval(() => {
    els.loadingMessage.style.opacity = '0';
    setTimeout(() => {
      current = randomMessage(current);
      els.loadingMessage.textContent = current;
      els.loadingMessage.style.opacity = '1';
    }, 300);
  }, 2800);
}

function stopMessageCycle() {
  clearInterval(_msgTimer);
  _msgTimer = null;
}
import { els, showScreen, setBusy, applyConfig, renderLayoutCards, updateShotUi } from './ui.js';
import { startCamera, stopCamera, runCountdown, captureFrame, switchCamera, triggerFlash, wait } from './camera.js';
import { composePhoto } from './compose.js';
import { uploadPhoto, renderQrCode, clearQr } from './upload.js';

function updatePreviewRatio() {
  if (!state.activeLayout) return;
  const wrap = els.cameraPreviewWrap;
  const preview = els.cameraPreview;
  const wrapRect = wrap.getBoundingClientRect();
  if (wrapRect.width === 0 || wrapRect.height === 0) return;

  const [rw, rh] = (state.activeLayout.shotRatio || '3/4').split('/').map(Number);
  const targetRatio = rw / rh;
  const wrapRatio = wrapRect.width / wrapRect.height;

  if (wrapRatio > targetRatio) {
    const h = wrapRect.height;
    const w = h * targetRatio;
    preview.style.height = `${Math.floor(h)}px`;
    preview.style.width = `${Math.floor(w)}px`;
  } else {
    const w = wrapRect.width;
    const h = w / targetRatio;
    preview.style.width = `${Math.floor(w)}px`;
    preview.style.height = `${Math.floor(h)}px`;
  }
}

async function selectLayout(layoutId) {
  state.activeLayout = layouts[layoutId];
  state.shots = [];
  els.activeLayoutLabel.textContent = state.activeLayout.name;
  els.cameraTitle.textContent = '準備拍攝';
  els.cameraStatus.textContent = '看鏡頭，倒數後會自動拍下。';
  updateShotUi();
  showScreen(els.cameraScreen);
  requestAnimationFrame(() => requestAnimationFrame(updatePreviewRatio));
  await startCamera();
}

async function handleCapture() {
  if (state.busy || !state.stream) return;

  setBusy(true);
  const total = state.activeLayout.requiredShots;

  while (state.shots.length < total) {
    const shotNum = state.shots.length + 1;
    els.cameraStatus.textContent = `第 ${shotNum} / ${total} 張，準備好最漂亮的笑容。`;
    await runCountdown();
    state.shots.push(captureFrame());
    await triggerFlash();
    updateShotUi();

    if (state.shots.length >= total) {
      els.cameraStatus.textContent = '正在合成照片與上傳。';
      await finishPhoto();
    } else {
      els.cameraStatus.textContent = `完成第 ${state.shots.length} 張，準備下一張…`;
      await wait(1200);
    }
  }

  setBusy(false);
}

async function finishPhoto() {
  const blob = await composePhoto();
  if (!blob) throw new Error('Canvas toBlob returned null');
  const objectUrl = URL.createObjectURL(blob);

  showScreen(els.loadingScreen);
  stopCamera();
  startMessageCycle();

  try {
    const saved = await uploadPhoto(blob);
    await renderQrCode(saved.downloadUrl);
    stopMessageCycle();

    els.resultImage.src = objectUrl;
    els.uploadStatus.textContent = '照片已存到伺服器。請掃 QR Code 帶走這張照片。';
    els.downloadLink.href = saved.downloadUrl;
    els.downloadLink.textContent = '開啟下載連結';
    showScreen(els.resultScreen);
  } catch (error) {
    stopMessageCycle();
    els.resultImage.src = objectUrl;
    els.uploadStatus.textContent = '上傳失敗，但照片仍保留在此畫面。請檢查伺服器後重新拍攝。';
    els.downloadLink.href = objectUrl;
    els.downloadLink.download = 'wedding-photo.jpg';
    els.downloadLink.textContent = '下載目前這張照片';
    clearQr();
    showScreen(els.resultScreen);
    console.error(error);
  }
}

function backToLayouts() {
  stopCamera();
  state.shots = [];
  updateShotUi();
  showScreen(els.layoutScreen);
}

function shootAgain() {
  state.shots = [];
  updateShotUi();
  showScreen(els.cameraScreen);
  requestAnimationFrame(() => requestAnimationFrame(updatePreviewRatio));
  startCamera();
}

async function boot() {
  renderLayoutCards(selectLayout);


  try {
    const response = await fetch('/api/config');
    if (response.ok) applyConfig(await response.json());
  } catch (error) {
    console.warn('Using default config.', error);
  }

  window.addEventListener('resize', updatePreviewRatio);
  els.captureBtn.addEventListener('click', handleCapture);
  els.cameraBackBtn.addEventListener('click', backToLayouts);
  els.againBtn.addEventListener('click', shootAgain);
  els.resultBackBtn.addEventListener('click', backToLayouts);
}

boot();
