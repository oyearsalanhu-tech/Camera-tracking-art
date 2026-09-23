export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: [string, string, string]; // [primary, secondary, darkBg]
}

export interface FrameStyle {
  id: string;
  name: string;
  category?: string;
  render: (
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    time: number,
    palette: [string, string, string],
    canvas: HTMLCanvasElement,
    rawQuad?: Point[]
  ) => void;
}

export interface CapturedMedia {
  id: string;
  type: 'photo' | 'video';
  url: string;
  blob: Blob;
  timestamp: number;
  formattedDate: string;
  duration?: number; // in seconds for videos
  aspectRatio?: string;
  thumbnailUrl?: string;
}

export type GestureStatus =
  | 'idle'
  | 'requesting'
  | 'no_hands'
  | 'one_hand'
  | 'forming'
  | 'locked'
  | 'error';
