import { FrameStyle, ColorPalette, Bounds, Point } from '../types/fingerFrame';

export const PALETTES: ColorPalette[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    colors: ['#00f0ff', '#ff2bd6', '#0a0620'],
  },
  {
    id: 'sunset',
    name: 'Sunset Blaze',
    colors: ['#ff9a3c', '#ff3d6e', '#2a0a1e'],
  },
  {
    id: 'toxic',
    name: 'Toxic Acid',
    colors: ['#b6ff3c', '#00e39a', '#04160f'],
  },
  {
    id: 'solar',
    name: 'Solar Flare',
    colors: ['#ffe14d', '#ff5a1f', '#1b0d02'],
  },
  {
    id: 'astral',
    name: 'Deep Astral',
    colors: ['#8f7bff', '#4de1ff', '#0b0a2a'],
  },
  {
    id: 'crimson',
    name: 'Crimson Noir',
    colors: ['#ffffff', '#ff4d4d', '#150d0d'],
  },
  {
    id: 'emerald',
    name: 'Synth Emerald',
    colors: ['#2dfdb7', '#a855f7', '#081410'],
  },
  {
    id: 'hyper',
    name: 'Hyper Gold',
    colors: ['#facc15', '#ec4899', '#180728'],
  },
];

export const STYLES: FrameStyle[] = [
  {
    id: 'neon-grid',
    name: 'Neon Grid',
    render: (ctx: CanvasRenderingContext2D, b: Bounds, t: number, p: [string, string, string]) => {
      ctx.fillStyle = p[2];
      ctx.fillRect(b.x, b.y, b.w, b.h);
      
      const s = Math.max(16, b.w / 12);
      const o = (t * 24) % s;
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = p[0];
      ctx.shadowColor = p[0];
      ctx.shadowBlur = 10;
      ctx.beginPath();
      
      for (let x = b.x - o; x < b.x + b.w + s; x += s) {
        if (x >= b.x && x <= b.x + b.w) {
          ctx.moveTo(x, b.y);
          ctx.lineTo(x, b.y + b.h);
        }
      }
      for (let y = b.y - o; y < b.y + b.h + s; y += s) {
        if (y >= b.y && y <= b.y + b.h) {
          ctx.moveTo(b.x, y);
          ctx.lineTo(b.x + b.w, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Center glowing reticle
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const rad = Math.min(b.w, b.h) * 0.15;
      ctx.strokeStyle = p[1];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    },
  },
  {
    id: 'stripes',
    name: 'Synthwave Stripes',
    render: (ctx: CanvasRenderingContext2D, b: Bounds, t: number, p: [string, string, string]) => {
      ctx.fillStyle = p[2];
      ctx.fillRect(b.x, b.y, b.w, b.h);
      
      const w = Math.max(16, b.w / 11);
      const o = (t * 45) % (w * 2);
      
      for (let x = b.x - b.h - o; x < b.x + b.w + b.h; x += w * 2) {
        ctx.fillStyle = p[0];
        ctx.beginPath();
        ctx.moveTo(x, b.y + b.h);
        ctx.lineTo(x + w, b.y + b.h);
        ctx.lineTo(x + w + b.h, b.y);
        ctx.lineTo(x + b.h, b.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = p[1];
        ctx.beginPath();
        ctx.moveTo(x + w, b.y + b.h);
        ctx.lineTo(x + w * 2, b.y + b.h);
        ctx.lineTo(x + w * 2 + b.h, b.y);
        ctx.lineTo(x + w + b.h, b.y);
        ctx.closePath();
        ctx.fill();
      }
    },
  },
  {
    id: 'halftone',
    name: 'Halftone Wave',
    render: (ctx: CanvasRenderingContext2D, b: Bounds, t: number, p: [string, string, string]) => {
      ctx.fillStyle = p[2];
      ctx.fillRect(b.x, b.y, b.w, b.h);
      
      const s = Math.max(14, b.w / 22);
      for (let y = b.y, j = 0; y < b.y + b.h + s; y += s, j++) {
        for (let x = b.x, i = 0; x < b.x + b.w + s; x += s, i++) {
          const r = ((Math.sin(i * 0.45 + t * 2.5) + Math.sin(j * 0.55 - t * 2) + 2) / 4) * s * 0.58;
          ctx.fillStyle = (i + j) % 2 === 0 ? p[0] : p[1];
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  },
  {
    id: 'plasma',
    name: 'Electric Plasma',
    render: (ctx: CanvasRenderingContext2D, b: Bounds, t: number, p: [string, string, string]) => {
      ctx.fillStyle = p[2];
      ctx.fillRect(b.x, b.y, b.w, b.h);
      
      const s = Math.max(14, Math.floor(b.w / 18));
      for (let y = b.y; y < b.y + b.h; y += s) {
        for (let x = b.x; x < b.x + b.w; x += s) {
          const v = (Math.sin(x * 0.02 + t * 1.4) + Math.sin(y * 0.028 - t * 1.6) + Math.sin((x + y) * 0.015 + t * 0.9) + 3) / 6;
          ctx.globalAlpha = Math.min(1, Math.max(0, v));
          ctx.fillStyle = p[0];
          ctx.fillRect(x, y, s + 1, s + 1);
          
          ctx.globalAlpha = Math.min(1, Math.max(0, 1 - v));
          ctx.fillStyle = p[1];
          ctx.fillRect(x, y, s + 1, s + 1);
        }
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'thermal-hud',
    name: 'Cyber HUD / Mono',
    render: (ctx: CanvasRenderingContext2D, b: Bounds, t: number, p: [string, string, string]) => {
      // Background tint
      ctx.fillStyle = p[2];
      ctx.globalAlpha = 0.55;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.globalAlpha = 1;

      // Scanline grid
      const s = Math.max(14, b.w / 14);
      ctx.strokeStyle = p[0];
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      for (let x = b.x; x <= b.x + b.w; x += s) {
        ctx.moveTo(x, b.y);
        ctx.lineTo(x, b.y + b.h);
      }
      for (let y = b.y; y <= b.y + b.h; y += s) {
        ctx.moveTo(b.x, y);
        ctx.lineTo(b.x + b.w, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Moving radar sweep line
      const sweepY = b.y + ((t * 80) % b.h);
      const grad = ctx.createLinearGradient(0, sweepY - 20, 0, sweepY);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, p[0]);
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(b.x, Math.max(b.y, sweepY - 20), b.w, 20);
      ctx.globalAlpha = 1;

      // Target lock reticle in center
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const rad = Math.min(b.w, b.h) * 0.22;
      ctx.strokeStyle = p[1];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, t * 1.5, t * 1.5 + Math.PI * 0.8);
      ctx.arc(cx, cy, rad, t * 1.5 + Math.PI, t * 1.5 + Math.PI * 1.8);
      ctx.stroke();

      // HUD text readings
      ctx.fillStyle = p[0];
      ctx.font = '11px monospace';
      ctx.fillText(`TARGET: LOCKED`, b.x + 12, b.y + 22);
      ctx.fillText(`MAG: ${(1 + (b.w / 400)).toFixed(2)}x`, b.x + 12, b.y + 38);
      ctx.fillText(`FPS: 60 [TRACK]`, b.x + 12, b.y + b.h - 14);
    },
  },
  {
    id: 'checker',
    name: 'Retro Warp',
    render: (ctx: CanvasRenderingContext2D, b: Bounds, t: number, p: [string, string, string]) => {
      const s = Math.max(16, b.w / 9);
      const o = (t * 35) % (s * 2);
      
      for (let y = b.y - s * 2, j = 0; y < b.y + b.h + s; y += s, j++) {
        for (let x = b.x - o, i = 0; x < b.x + b.w + s * 2; x += s, i++) {
          ctx.fillStyle = (i + j) % 2 === 0 ? p[0] : p[1];
          ctx.fillRect(x, y, s + 1, s + 1);
        }
      }
      ctx.fillStyle = p[2];
      ctx.globalAlpha = 0.28;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.globalAlpha = 1;
    },
  },
  {
    id: 'stardust',
    name: 'Stardust Nebula',
    render: (ctx: CanvasRenderingContext2D, b: Bounds, t: number, p: [string, string, string]) => {
      ctx.fillStyle = p[2];
      ctx.fillRect(b.x, b.y, b.w, b.h);

      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const count = 48;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + t * 0.8;
        const distRatio = ((i * 17 + t * 25) % 100) / 100;
        const r = distRatio * (Math.min(b.w, b.h) * 0.48);
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        const size = (1 - distRatio) * 5 + 1.5;

        ctx.fillStyle = i % 2 === 0 ? p[0] : p[1];
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    },
  },
  {
    id: 'matrix-rain',
    name: 'Matrix Code',
    render: (ctx: CanvasRenderingContext2D, b: Bounds, t: number, p: [string, string, string]) => {
      ctx.fillStyle = p[2];
      ctx.fillRect(b.x, b.y, b.w, b.h);

      const colWidth = 18;
      const cols = Math.floor(b.w / colWidth);
      ctx.font = '13px monospace';
      
      for (let c = 0; c < cols; c++) {
        const x = b.x + c * colWidth;
        const speed = ((c * 17) % 7) + 5;
        const dropY = b.y + ((t * speed * 25 + c * 33) % (b.h + 120)) - 60;
        
        for (let row = 0; row < 6; row++) {
          const charY = dropY - row * 16;
          if (charY >= b.y && charY <= b.y + b.h) {
            const charCode = 65 + ((c * 13 + row * 7 + Math.floor(t * 3)) % 26);
            ctx.fillStyle = row === 0 ? '#ffffff' : (row < 3 ? p[0] : p[1]);
            ctx.globalAlpha = Math.max(0.2, 1 - row * 0.16);
            ctx.fillText(String.fromCharCode(charCode), x, charY);
          }
        }
      }
      ctx.globalAlpha = 1;
    },
  },
];
