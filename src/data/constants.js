export const layouts = {
  strip: {
    id: 'strip',
    name: '4格直列',
    description: '經典人生四格，適合婚禮賓客一起留下完整動作。',
    requiredShots: 4,
    previewClass: 'preview-strip',
    width: 720,
    height: 2160,
    shotRatio: '3/4',
  },
  grid: {
    id: 'grid',
    name: '2x2',
    description: '四張照片做成方形拼貼，掃碼收藏很剛好。',
    requiredShots: 4,
    previewClass: 'preview-grid',
    width: 900,
    height: 1400,
    shotRatio: '3/4',
  },
  portrait: {
    id: 'portrait',
    name: '大頭貼',
    description: '單張大畫面，留給最漂亮的表情與婚禮字樣。',
    requiredShots: 1,
    previewClass: 'preview-portrait',
    width: 1080,
    height: 1440,
    shotRatio: '780/920',
  },
  frame01: {
    id: 'frame01',
    name: '愛心拍貼',
    description: '六格愛心版型，浪漫紅底花邊框，適合情侶賓客。',
    requiredShots: 6,
    previewClass: 'preview-frame01',
    width: 784,
    height: 1176,
    shotRatio: '315/332',
    skipFrameSelect: true,
    showHeartGuide: true,
  },
};

export const frames = [
  { id: 'none',    name: '無框' },
  { id: 'classic', name: '白框加強' },
  { id: 'gold',    name: '金框' },
  { id: 'film',    name: '底片框' },
];

export const filters = [
  { id: 'none',    name: '原色',  filter: 'none' },
  { id: 'bw',      name: '黑白',  filter: 'grayscale(100%)' },
  { id: 'warm',    name: '暖調',  filter: 'sepia(40%) saturate(140%)' },
  { id: 'cool',    name: '冷調',  filter: 'hue-rotate(190deg) saturate(90%)' },
  { id: 'vintage', name: '復古',  filter: 'sepia(60%) contrast(90%) brightness(90%)' },
];

export const DEFAULT_CONFIG = {
  coupleName: 'jim & camilla',
  weddingDate: '2026.11.07',
  tagline: 'Wedding Photo Booth',
  countdownSeconds: 3,
  theme: { primary: '#f28ca8', secondary: '#fff4f7', ink: '#49333a' },
};
