// frame03: 858×2532, 1-column × 4-row, cloud scalloped borders
// ZONES from pixel scan + 20px bleed on each side for scallop coverage
export const OVERLAY_URL = '/frames/frame03.png';

const X = 63;
const W = 724;
const H = 543;
const GAP = 19;
const Y0 = 70;

export const ZONES = [
  { x: X, y: Y0,               w: W, h: H },
  { x: X, y: Y0 + H + GAP,     w: W, h: H },
  { x: X, y: Y0 + (H + GAP)*2, w: W, h: H },
  { x: X, y: Y0 + (H + GAP)*3, w: W, h: H },
];
