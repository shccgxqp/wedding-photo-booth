import { state, layouts, frames, filters } from './state.js';

export const els = {
  tagline: document.querySelector('#tagline'),
  coupleName: document.querySelector('#coupleName'),
  weddingDate: document.querySelector('#weddingDate'),
  layoutScreen: document.querySelector('#layoutScreen'),
  frameScreen:  document.querySelector('#frameScreen'),
  frameCards:   document.querySelector('#frameCards'),
  frameBackBtn: document.querySelector('#frameBackBtn'),
  filterBar:    document.querySelector('#filterBar'),
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
  cameraBackBtn: document.querySelector('#cameraBackBtn'),
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
  [
    els.layoutScreen,
    els.frameScreen,
    els.cameraScreen,
    els.loadingScreen,
    els.resultScreen,
  ].forEach((s) => s.classList.add('hidden'));
  screen.classList.remove('hidden');
  document.body.style.overflow =
    screen === els.layoutScreen || screen === els.frameScreen ? '' : 'hidden';
}

export function setBusy(isBusy) {
  state.busy = isBusy;
  els.captureBtn.disabled = isBusy;
  els.cameraBackBtn.disabled = isBusy;
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

export function renderFrameCards(activeId, onSelect) {
  els.frameCards.innerHTML = '';
  frames.forEach((frame) => {
    const card = document.createElement('button');
    card.className = 'frame-card' + (frame.id === activeId ? ' selected' : '');
    card.type = 'button';
    card.innerHTML = `
      <div class="frame-preview frame-preview--${frame.id}">
        <div class="frame-preview__photo"></div>
      </div>
    `;
    card.addEventListener('click', () => onSelect(frame.id));
    els.frameCards.appendChild(card);
  });
}

export function renderFilterBar(activeId, onSelect) {
  els.filterBar.innerHTML = '';
  filters.forEach((filter) => {
    const btn = document.createElement('button');
    btn.className = 'filter-pill' + (filter.id === activeId ? ' active' : '');
    btn.type = 'button';
    btn.textContent = filter.name;
    btn.addEventListener('click', () => onSelect(filter.id));
    els.filterBar.appendChild(btn);
  });
}

export function updateShotUi() {
  const total = state.activeLayout.requiredShots;
  const next = Math.min(state.shots.length + 1, total);
  els.shotBadge.textContent = `${next} / ${total}`;
  els.captureBtn.textContent = '開始拍攝';
}
