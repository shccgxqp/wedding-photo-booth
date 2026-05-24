export const layouts = {
  frame04: {
    id: 'frame04',
    name: '派對四格',
    description: '四格派對邊框，迪斯可球光，適合歡慶合照。',
    requiredShots: 4,
    previewClass: 'preview-frame04',
    width: 2090,
    height: 3135,
    shotRatio: '910/1074',
    skipFrameSelect: true,
  },
  frame03: {
    id: 'frame03',
    name: '雲朵直條',
    description: '四格雲朵邊框，清新藍底，適合溫馨合照。',
    requiredShots: 4,
    previewClass: 'preview-frame03',
    width: 858,
    height: 2532,
    shotRatio: '724/543',
    skipFrameSelect: true,
  },
  frame02: {
    id: 'frame02',
    name: '星空直條',
    description: '三格橫向直排，復古丘比特邊框。',
    requiredShots: 3,
    previewClass: 'preview-frame02',
    width: 784,
    height: 1176,
    shotRatio: '545/365',
    skipFrameSelect: true,
  },
  frame01: {
    id: 'frame01',
    name: '愛心拍貼',
    description: '六格愛心版型，浪漫紅底花邊框，適合情侶賓客。',
    requiredShots: 6,
    previewClass: 'preview-frame01',
    width: 779,
    height: 1172,
    shotRatio: '315/332',
    skipFrameSelect: true,
  },
};

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
