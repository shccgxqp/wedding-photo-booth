// frame02: 784×1176, left decorative column, 3 horizontal photo zones stacked vertically
export const OVERLAY_URL = '/frames/frame02.png';

const X = 217;
const W = 545;
const H = 365;
const GAP = 15;
const Y0 = 23;

export const ZONES = [
  { x: X, y: Y0,               w: W, h: H },
  { x: X, y: Y0 + H + GAP,     w: W, h: H },
  { x: X, y: Y0 + (H + GAP)*2, w: W, h: H },
];
