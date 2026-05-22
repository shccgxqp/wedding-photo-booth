import { state, layouts } from './state.js';

export const els = {
  tagline: document.querySelector('#tagline'),
  coupleName: document.querySelector('#coupleName'),
  weddingDate: document.querySelector('#weddingDate'),
  layoutScreen: document.querySelector('#layoutScreen'),
  cameraScreen: document.querySelector('#cameraScreen'),
  loadingScreen: document.querySelector('#loadingScreen'),
  loadingMessage: document.querySelector('#loadingMessage'),
  resultScreen: document.querySelector('#resultScreen'),
  layoutGrid: document.querySelector('#layoutGrid'),
  cameraPreviewWrap: document.querySelector('#cameraPreviewWrap'),
  cameraPreview: document.querySelector('#cameraPreview'),
  video: document.querySelector('#cameraVideo'),
  countdown: document.querySelector('#countdown'),
  flashOverlay: document.querySelector('#flashOverlay'),
  shotBadge: document.querySelector('#shotBadge'),
  activeLayoutLabel: document.querySelector('#activeLayoutLabel'),
  cameraTitle: document.querySelector('#cameraTitle'),
  cameraStatus: document.querySelector('#cameraStatus'),
  thumbStrip: document.querySelector('#thumbStrip'),
  switchCameraBtn: document.querySelector('#switchCameraBtn'),
  captureBtn: document.querySelector('#captureBtn'),
  resultImage: document.querySelector('#resultImage'),
  uploadStatus: document.querySelector('#uploadStatus'),
  qrCanvas: document.querySelector('#qrCanvas'),
  downloadLink: document.querySelector('#downloadLink'),
  againBtn: document.querySelector('#againBtn'),
  resultBackBtn: document.querySelector('#resultBackBtn'),
  workCanvas: document.querySelector('#workCanvas'),
};

export function showScreen(screen) {
  [els.layoutScreen, els.cameraScreen, els.loadingScreen, els.resultScreen].forEach((s) =>
    s.classList.add('hidden')
  );
  screen.classList.remove('hidden');
}

export function setBusy(isBusy) {
  state.busy = isBusy;
  els.captureBtn.disabled = isBusy;
  els.switchCameraBtn.disabled = isBusy;
}

export function applyConfig(config) {
  state.config = { ...state.config, ...config };
  els.tagline.textContent = state.config.tagline;
  els.coupleName.textContent = state.config.coupleName;
  els.weddingDate.textContent = state.config.weddingDate;

  if (state.config.theme) {
    document.documentElement.style.setProperty('--pink', state.config.theme.primary || '#f28ca8');
    document.documentElement.style.setProperty('--blush', state.config.theme.secondary || '#fff4f7');
    document.documentElement.style.setProperty('--ink', state.config.theme.ink || '#49333a');
  }
}

export function renderLayoutCards(onSelect) {
  els.layoutGrid.innerHTML = '';

  Object.values(layouts).forEach((layout) => {
    const card = document.createElement('button');
    card.className = 'layout-card';
    card.type = 'button';
    card.innerHTML = `
      <div class="layout-preview ${layout.previewClass}">
        ${Array.from({ length: layout.requiredShots }, () => '<span class="preview-slot"></span>').join('')}
      </div>
      <div class="layout-copy">
        <h3>${layout.name}</h3>
        <p>${layout.description}</p>
      </div>
    `;
    card.addEventListener('click', () => onSelect(layout.id));
    els.layoutGrid.appendChild(card);
  });
}

export function updateShotUi() {
  const total = state.activeLayout.requiredShots;
  const next = Math.min(state.shots.length + 1, total);
  els.shotBadge.textContent = `${next} / ${total}`;
  els.captureBtn.textContent = '開始拍攝';
}
