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

export type PlayMode = 'frame' | 'wand' | 'stars' | 'hearts' | 'bubbles';

export type FrameCondition =
  | 'upside_down'    // Hands apart, one hand inverted/upside-down (viral hourglass/crossing)
  | 'apart_quad'     // Hands apart, upright Ls (floating box)
  | 'pinch_attached' // Fingers attached/touching (dual-hand pinch lock)
  | 'single_l'       // Single hand L
  | 'none';

export interface FingertipData {
  leftIndex?: Point;
  leftThumb?: Point;
  rightIndex?: Point;
  rightThumb?: Point;
  leftInverted?: boolean;
  rightInverted?: boolean;
  isAttached?: boolean;
  condition: FrameCondition;
}

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
  description?: string;
  render: (
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    time: number,
    palette: [string, string, string],
    canvas: HTMLCanvasElement,
    rawQuad?: Point[],
    video?: HTMLVideoElement | null,
    isMirrored?: boolean,
    condition?: FrameCondition
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
  | 'attached'
  | 'upside_down'
  | 'error';
