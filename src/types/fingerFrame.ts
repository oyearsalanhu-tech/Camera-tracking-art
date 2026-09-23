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

export type PlayMode = 'wand' | 'frame' | 'stars' | 'hearts' | 'bubbles';

export interface FlowerParticle {
  id: string;
  x: number;
  y: number;
  size: number;
  targetSize: number;
  rotation: number;
  rotationSpeed: number;
  petals: number;
  color: string;
  centerColor: string;
  age: number; // in frames
  maxAge: number;
  alpha: number;
  stemEndY?: number;
  type: 'flower' | 'star' | 'heart' | 'sparkle' | 'bubble';
  vx?: number;
  vy?: number;
}

export interface WandTrailPoint {
  x: number;
  y: number;
  timestamp: number;
  color: string;
  size: number;
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
  | 'wand_active'
  | 'forming'
  | 'locked'
  | 'error';
