import { FrameStyle, ColorPalette, Bounds, Point, FrameCondition } from '../types/fingerFrame';

export const PALETTES: ColorPalette[] = [
  {
    id: 'monolith',
    name: 'Wireframe White',
    colors: ['#ffffff', '#00f0ff', '#0a0914'], // Reel Screenshot 1 style
  },
  {
    id: 'viral-amber',
    name: 'Warm Studio Gold',
    colors: ['#ffd285', '#ffffff', '#1b120a'], // YouTube Short Screenshot style
  },
  {
    id: 'reel-purple',
    name: 'Neon Violet Reel',
    colors: ['#c040ff', '#e879f9', '#080618'], // Reel Screenshot 2 style
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    colors: ['#00f0ff', '#ff2bd6', '#0a0620'],
  },
  {
    id: 'matrix',
    name: 'Matrix Acid',
    colors: ['#00ff66', '#a3e635', '#021206'],
  },
  {
    id: 'solar',
    name: 'Solar Gold',
    colors: ['#ffe14d', '#ff5a1f', '#1b0d02'],
  },
  {
    id: 'sunset',
    name: 'Sunset Blaze',
    colors: ['#ff9a3c', '#ff3d6e', '#2a0a1e'],
  },
  {
    id: 'crimson',
    name: 'Crimson Noir',
    colors: ['#ff3344', '#ffffff', '#150608'],
  },
  {
    id: 'deep-astral',
    name: 'Deep Astral',
    colors: ['#38bdf8', '#818cf8', '#070a1a'],
  },
];

// Helper: Linear interpolate point
function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

// Reusable offscreen canvas for edge detection & pixel shaders
let offCanvas: HTMLCanvasElement | null = null;
let offCtx: CanvasRenderingContext2D | null = null;

function getOffscreen(w: number, h: number) {
  if (typeof window === 'undefined') return { canvas: null, ctx: null };
  if (!offCanvas) {
    offCanvas = document.createElement('canvas');
    offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (offCanvas.width !== w || offCanvas.height !== h) {
    offCanvas.width = w;
    offCanvas.height = h;
  }
  return { canvas: offCanvas, ctx: offCtx };
}

// Helper to draw live video inside the quad
function drawLiveVideoInQuad(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement | null | undefined,
  canvas: HTMLCanvasElement,
  isMirrored: boolean,
  filter?: string
) {
  if (!video || video.readyState < 2) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  if (filter) {
    ctx.filter = filter;
  }
  if (isMirrored) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();
}

export const STYLES: FrameStyle[] = [
  // 1. REEL SCREENSHOT 1: Perspective 3D Wireframe Grid + B&W High-Contrast Face
  {
    id: 'reel-wireframe',
    name: '3D Wireframe Grid',
    category: 'Reel Classic',
    description: 'Perspective wireframe mesh over B&W video (as seen in Reel)',
    render: (
      ctx: CanvasRenderingContext2D,
      b: Bounds,
      t: number,
      p: [string, string, string],
      canvas: HTMLCanvasElement,
      rawQuad?: Point[],
      video?: HTMLVideoElement | null,
      isMirrored: boolean = true
    ) => {
      // 1. Draw live camera video in high-contrast monochrome (exact look from Screenshot 1)
      drawLiveVideoInQuad(
        ctx,
        video,
        canvas,
        isMirrored,
        'grayscale(100%) contrast(140%) brightness(105%)'
      );

      // Subtle translucent dark backing to give the grid high definition
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // 2. Draw the 3D Quad Perspective Wireframe Grid
      const quad = rawQuad && rawQuad.length === 4 ? rawQuad : [
        { x: b.x, y: b.y },
        { x: b.x + b.w, y: b.y },
        { x: b.x + b.w, y: b.y + b.h },
        { x: b.x, y: b.y + b.h },
      ];

      const [tl, tr, br, bl] = quad;
      const cols = 12;
      const rows = 7;

      ctx.save();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.shadowColor = p[0];
      ctx.shadowBlur = 4;

      // Draw vertical grid lines connecting top edge to bottom edge
      for (let i = 0; i <= cols; i++) {
        const u = i / cols;
        const ptTop = lerpPoint(tl, tr, u);
        const ptBottom = lerpPoint(bl, br, u);

        ctx.beginPath();
        ctx.moveTo(ptTop.x, ptTop.y);
        ctx.lineTo(ptBottom.x, ptBottom.y);
        ctx.stroke();
      }

      // Draw horizontal grid lines connecting left edge to right edge
      for (let j = 0; j <= rows; j++) {
        const v = j / rows;
        const ptLeft = lerpPoint(tl, bl, v);
        const ptRight = lerpPoint(tr, br, v);

        ctx.beginPath();
        ctx.moveTo(ptLeft.x, ptLeft.y);
        ctx.lineTo(ptRight.x, ptRight.y);
        ctx.stroke();
      }

      // Animated glowing sweep line scanning through the grid
      const scanPhase = (t * 0.45) % 1.0;
      const scanLeft = lerpPoint(tl, bl, scanPhase);
      const scanRight = lerpPoint(tr, br, scanPhase);

      ctx.strokeStyle = p[1];
      ctx.lineWidth = 2.5;
      ctx.shadowColor = p[1];
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(scanLeft.x, scanLeft.y);
      ctx.lineTo(scanRight.x, scanRight.y);
      ctx.stroke();

      // Corner coordinate tags
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '10px monospace';
      ctx.fillText(`POV: ${Math.round(b.w)}x${Math.round(b.h)}`, b.x + 8, b.y + 16);
      ctx.fillText(`FRAME: ACTIVE`, b.x + 8, b.y + b.h - 8);

      ctx.restore();
    },
  },

  // 2. YOUTUBE SHORT: Viral Warm Studio Glow (Screenshot 3)
  {
    id: 'viral-warm-glow',
    name: 'Viral Warm Studio',
    category: 'Viral Trend',
    description: 'Translucent warm golden veil & cinematic lighting (YouTube Short)',
    render: (
      ctx: CanvasRenderingContext2D,
      b: Bounds,
      t: number,
      p: [string, string, string],
      canvas: HTMLCanvasElement,
      rawQuad?: Point[],
      video?: HTMLVideoElement | null,
      isMirrored: boolean = true
    ) => {
      // Live video with warm cinematic enhancement
      drawLiveVideoInQuad(
        ctx,
        video,
        canvas,
        isMirrored,
        'brightness(108%) contrast(108%) saturate(125%) sepia(20%)'
      );

      // Translucent warm golden tint over the face/hourglass area
      const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
      grad.addColorStop(0, 'rgba(255, 224, 160, 0.22)');
      grad.addColorStop(0.5, 'rgba(255, 240, 200, 0.12)');
      grad.addColorStop(1, 'rgba(255, 210, 140, 0.26)');

      ctx.fillStyle = grad;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Subtle luminous sheen
      const sheenX = b.x + ((t * 80) % (b.w * 1.6)) - b.w * 0.3;
      const sheenGrad = ctx.createLinearGradient(sheenX, b.y, sheenX + 80, b.y + b.h);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.14)');
      sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    },
  },

  // 3. REEL SCREENSHOT 2: Real-time Cyber Neon Edge Contour
  {
    id: 'reel-neon-edge',
    name: 'Cyber Neon Contour',
    category: 'Reel Classic',
    description: 'Neon purple edge outline on dark backdrop (as seen in Reel)',
    render: (
      ctx: CanvasRenderingContext2D,
      b: Bounds,
      t: number,
      p: [string, string, string],
      canvas: HTMLCanvasElement,
      rawQuad?: Point[],
      video?: HTMLVideoElement | null,
      isMirrored: boolean = true
    ) => {
      // 1. Dark navy backdrop inside the frame
      ctx.fillStyle = p[2];
      ctx.fillRect(b.x, b.y, b.w, b.h);

      if (!video || video.readyState < 2 || b.w < 20 || b.h < 20) return;

      // 2. Real-time fast edge detection via downsampled offscreen buffer
      const sampleW = 220;
      const sampleH = 140;
      const { canvas: oCanvas, ctx: oCtx } = getOffscreen(sampleW, sampleH);
      if (!oCanvas || !oCtx) return;

      // Draw mirrored video into offscreen
      oCtx.save();
      if (isMirrored) {
        oCtx.translate(sampleW, 0);
        oCtx.scale(-1, 1);
      }
      const vx = (b.x / canvas.width) * video.videoWidth;
      const vy = (b.y / canvas.height) * video.videoHeight;
      const vw = (b.w / canvas.width) * video.videoWidth;
      const vh = (b.h / canvas.height) * video.videoHeight;

      try {
        oCtx.drawImage(
          video,
          Math.max(0, vx),
          Math.max(0, vy),
          Math.max(1, vw),
          Math.max(1, vh),
          0,
          0,
          sampleW,
          sampleH
        );
      } catch {
        // Safe fallback
      }
      oCtx.restore();

      // Sobel edge filter pass
      try {
        const imgData = oCtx.getImageData(0, 0, sampleW, sampleH);
        const data = imgData.data;
        const lum = new Uint8Array(sampleW * sampleH);

        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          lum[j] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
        }

        const hex = p[0].replace('#', '');
        const er = parseInt(hex.substring(0, 2), 16) || 192;
        const eg = parseInt(hex.substring(2, 4), 16) || 64;
        const eb = parseInt(hex.substring(4, 6), 16) || 255;

        for (let y = 1; y < sampleH - 1; y++) {
          for (let x = 1; x < sampleW - 1; x++) {
            const idx = y * sampleW + x;
            const gx = lum[idx + 1] - lum[idx - 1];
            const gy = lum[idx + sampleW] - lum[idx - sampleW];
            const mag = Math.abs(gx) + Math.abs(gy);

            const pIdx = idx * 4;
            if (mag > 22) {
              const intensity = Math.min(255, (mag - 18) * 3.5);
              data[pIdx] = Math.min(255, (er * intensity) / 200);
              data[pIdx + 1] = Math.min(255, (eg * intensity) / 200);
              data[pIdx + 2] = Math.min(255, (eb * intensity) / 200);
              data[pIdx + 3] = 255;
            } else {
              data[pIdx] = 8;
              data[pIdx + 1] = 6;
              data[pIdx + 2] = 24;
              data[pIdx + 3] = 255;
            }
          }
        }

        oCtx.putImageData(imgData, 0, 0);

        ctx.save();
        ctx.shadowColor = p[0];
        ctx.shadowBlur = 16;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(oCanvas, b.x, b.y, b.w, b.h);
        ctx.restore();
      } catch {
        // Fallback
      }
    },
  },

  // 4. COLOR POP SPOTLIGHT: Grayscale background, hyper-vivid color inside fingers
  {
    id: 'color-pop',
    name: 'Color Pop Spotlight',
    category: 'Vivid',
    description: 'Full saturation color inside the frame against monochrome background',
    render: (
      ctx: CanvasRenderingContext2D,
      b: Bounds,
      t: number,
      p: [string, string, string],
      canvas: HTMLCanvasElement,
      rawQuad?: Point[],
      video?: HTMLVideoElement | null,
      isMirrored: boolean = true
    ) => {
      drawLiveVideoInQuad(
        ctx,
        video,
        canvas,
        isMirrored,
        'saturate(180%) contrast(115%) brightness(105%)'
      );

      const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.15)');
      grad.addColorStop(0.5, 'rgba(255, 43, 214, 0.1)');
      grad.addColorStop(1, 'rgba(255, 225, 77, 0.15)');

      ctx.fillStyle = grad;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      ctx.strokeStyle = p[0];
      ctx.lineWidth = 1.5;
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  // 5. THERMAL HEATMAP: FLIR Infrared Night Vision
  {
    id: 'thermal-hud',
    name: 'Thermal Heatmap',
    category: 'Infrared',
    description: 'Thermal false-color mapping with military HUD telemetry',
    render: (
      ctx: CanvasRenderingContext2D,
      b: Bounds,
      t: number,
      p: [string, string, string],
      canvas: HTMLCanvasElement,
      rawQuad?: Point[],
      video?: HTMLVideoElement | null,
      isMirrored: boolean = true
    ) => {
      drawLiveVideoInQuad(
        ctx,
        video,
        canvas,
        isMirrored,
        'invert(85%) hue-rotate(180deg) saturate(220%) contrast(140%)'
      );

      const s = Math.max(16, b.w / 12);
      ctx.strokeStyle = p[0];
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      for (let y = b.y; y <= b.y + b.h; y += s) {
        ctx.moveTo(b.x, y);
        ctx.lineTo(b.x + b.w, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.fillStyle = p[0];
      ctx.font = '10px monospace';
      ctx.fillText(`FLIR TEMP: 36.8°C`, b.x + 10, b.y + 18);
      ctx.fillText(`HEAT SIGNATURE: DETECTED`, b.x + 10, b.y + 32);
    },
  },

  // 6. CYBER VIEW-FINDER: Director Crosshairs & Camera HUD
  {
    id: 'cyber-hud',
    name: 'Director HUD',
    category: 'Sci-Fi',
    description: 'Cinematic targeting brackets, aspect ratio, and grid lines',
    render: (
      ctx: CanvasRenderingContext2D,
      b: Bounds,
      t: number,
      p: [string, string, string],
      canvas: HTMLCanvasElement,
      rawQuad?: Point[],
      video?: HTMLVideoElement | null,
      isMirrored: boolean = true
    ) => {
      drawLiveVideoInQuad(ctx, video, canvas, isMirrored, 'contrast(120%) brightness(110%)');

      ctx.strokeStyle = p[0];
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.33, b.y);
      ctx.lineTo(b.x + b.w * 0.33, b.y + b.h);
      ctx.moveTo(b.x + b.w * 0.66, b.y);
      ctx.lineTo(b.x + b.w * 0.66, b.y + b.h);
      ctx.moveTo(b.x, b.y + b.h * 0.33);
      ctx.lineTo(b.x + b.w, b.y + b.h * 0.33);
      ctx.moveTo(b.x, b.y + b.h * 0.66);
      ctx.lineTo(b.x + b.w, b.y + b.h * 0.66);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const boxS = 24;
      ctx.strokeStyle = p[1];
      ctx.lineWidth = 1.8;
      ctx.strokeRect(cx - boxS, cy - boxS, boxS * 2, boxS * 2);

      ctx.fillStyle = p[0];
      ctx.font = '10px monospace';
      ctx.fillText(`REC 4K • 60FPS`, b.x + 8, b.y + 16);
      ctx.fillText(`ISO 400 • F/1.8`, b.x + 8, b.y + b.h - 8);
      ctx.fillText(`[AF-TRACK]`, b.x + b.w - 74, b.y + 16);
    },
  },

  // 7. MATRIX CODE STREAM
  {
    id: 'matrix-rain',
    name: 'Matrix Code',
    category: 'Retro',
    description: 'Digital cyber code cascades over live video',
    render: (
      ctx: CanvasRenderingContext2D,
      b: Bounds,
      t: number,
      p: [string, string, string],
      canvas: HTMLCanvasElement,
      rawQuad?: Point[],
      video?: HTMLVideoElement | null,
      isMirrored: boolean = true
    ) => {
      drawLiveVideoInQuad(
        ctx,
        video,
        canvas,
        isMirrored,
        'contrast(130%) grayscale(70%) sepia(50%) hue-rotate(70deg)'
      );

      ctx.fillStyle = 'rgba(2, 18, 6, 0.4)';
      ctx.fillRect(b.x, b.y, b.w, b.h);

      const colWidth = 16;
      const cols = Math.floor(b.w / colWidth);
      ctx.font = '11px monospace';

      for (let c = 0; c < cols; c++) {
        const x = b.x + c * colWidth;
        const speed = ((c * 13) % 7) + 5;
        const dropY = b.y + ((t * speed * 22 + c * 29) % (b.h + 90)) - 40;

        for (let row = 0; row < 5; row++) {
          const charY = dropY - row * 14;
          if (charY >= b.y && charY <= b.y + b.h) {
            const charCode = 65 + ((c * 7 + row * 11 + Math.floor(t * 3)) % 26);
            ctx.fillStyle = row === 0 ? '#ffffff' : (row < 2 ? p[0] : p[1]);
            ctx.globalAlpha = Math.max(0.2, 1 - row * 0.2);
            ctx.fillText(String.fromCharCode(charCode), x, charY);
          }
        }
      }
      ctx.globalAlpha = 1;
    },
  },

  // 8. RETRO CRT TV
  {
    id: 'retro-crt',
    name: 'Retro CRT TV',
    category: 'Retro',
    description: 'Vintage TV phosphor scanlines and RGB subpixel dispersion',
    render: (
      ctx: CanvasRenderingContext2D,
      b: Bounds,
      t: number,
      p: [string, string, string],
      canvas: HTMLCanvasElement,
      rawQuad?: Point[],
      video?: HTMLVideoElement | null,
      isMirrored: boolean = true
    ) => {
      drawLiveVideoInQuad(
        ctx,
        video,
        canvas,
        isMirrored,
        'contrast(125%) saturate(140%) brightness(110%)'
      );

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (let y = b.y; y < b.y + b.h; y += 4) {
        ctx.fillRect(b.x, y, b.w, 2);
      }

      const rollY = b.y + ((t * 90) % (b.h + 60)) - 30;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(b.x, Math.max(b.y, rollY), b.w, 18);

      const rad = Math.max(b.w, b.h) * 0.75;
      const vGrad = ctx.createRadialGradient(
        b.x + b.w / 2,
        b.y + b.h / 2,
        rad * 0.4,
        b.x + b.w / 2,
        b.y + b.h / 2,
        rad
      );
      vGrad.addColorStop(0, 'transparent');
      vGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(b.x, b.y, b.w, b.h);
    },
  },
];
