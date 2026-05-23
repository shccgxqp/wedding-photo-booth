// frame01: 784×1176 red heart frame, 2-column × 3-row grid
// frame01.png must have transparent heart interiors so photos show through

export const OVERLAY_URL = '/frames/frame01.png';

const MARGIN = 50;
const COL_GAP = 54;
const ROW_GAP = 0;
const W = 315;
const H = 332;

export const ZONES = [
  { x: MARGIN,               y: MARGIN,               w: W, h: H },
  { x: MARGIN + W + COL_GAP, y: MARGIN,               w: W, h: H },
  { x: MARGIN,               y: MARGIN + H + ROW_GAP, w: W, h: H },
  { x: MARGIN + W + COL_GAP, y: MARGIN + H + ROW_GAP, w: W, h: H },
  { x: MARGIN,               y: MARGIN + (H + ROW_GAP) * 2, w: W, h: H },
  { x: MARGIN + W + COL_GAP, y: MARGIN + (H + ROW_GAP) * 2, w: W, h: H },
];

// (last row bottom + canvas height) / 2
export const TEXT_Y = Math.round((MARGIN + (H + ROW_GAP) * 2 + H + 1176) / 2);
