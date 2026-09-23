import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Point,
  Bounds,
  ColorPalette,
  FrameStyle,
  GestureStatus,
  PlayMode,
  FlowerParticle,
  WandTrailPoint,
} from '../types/fingerFrame';
import {
  playShutterSound,
  playFrameLockSound,
  playRecordStart,
  playRecordStop,
  playCountdownTick,
  playBloomSound,
  playSparkleSound,
} from '../utils/audioSynth';
import confetti from 'canvas-confetti';
import { Camera, AlertCircle, Sparkles, RefreshCw, Wand2, Flower2, Zap } from 'lucide-react';

interface MediaPipeHandsResults {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>;
}

interface CameraStageProps {
  playMode: PlayMode;
  currentStyle: FrameStyle;
  currentPalette: ColorPalette;
  facing: 'user' | 'environment';
  autoCycle: boolean;
  onCycleNext: () => void;
  showSkeleton: boolean;
  micEnabled: boolean;
  photoTimer: number;
  onStatusChange: (status: GestureStatus, text: string, isClosed: boolean) => void;
  onMediaCaptured: (blob: Blob, type: 'photo' | 'video', duration?: number) => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  recordingTime: number;
  setRecordingTime: React.Dispatch<React.SetStateAction<number>>;
  triggerSnapRef: React.MutableRefObject<(() => void) | null>;
  triggerRecordRef: React.MutableRefObject<(() => void) | null>;
  onClearFlowersRef?: React.MutableRefObject<(() => void) | null>;
}

export const CameraStage: React.FC<CameraStageProps> = ({
  playMode,
  currentStyle,
  currentPalette,
  facing,
  autoCycle,
  onCycleNext,
  showSkeleton,
  micEnabled,
  photoTimer,
  onStatusChange,
  onMediaCaptured,
  isRecording,
  setIsRecording,
  recordingTime,
  setRecordingTime,
  triggerSnapRef,
  triggerRecordRef,
  onClearFlowersRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);
  const recordStartTimeRef = useRef<number>(0);

  const [hasStarted, setHasStarted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Garden / Wand particles & trails
  const particlesRef = useRef<FlowerParticle[]>([]);
  const trailsRef = useRef<WandTrailPoint[]>([]);
  const lastSpawnPosRef = useRef<{ [key: number]: { x: number; y: number; time: number } }>({});

  // Tracking state refs for render loop
  const quadRef = useRef<Point[] | null>(null);
  const isClosedRef = useRef<boolean>(false);
  const lastHandsRef = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const missingRef = useRef<number>(0);
  const busyRef = useRef<boolean>(false);
  const reqAnimRef = useRef<number | null>(null);
  const fpsRef = useRef<number>(60);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const cameraUtilityRef = useRef<any>(null);

  // Synchronized refs so the render loop always has latest props
  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;

  const styleRef = useRef(currentStyle);
  styleRef.current = currentStyle;

  const paletteRef = useRef(currentPalette);
  paletteRef.current = currentPalette;

  const facingRef = useRef(facing);
  facingRef.current = facing;

  const autoCycleRef = useRef(autoCycle);
  autoCycleRef.current = autoCycle;

  const onCycleNextRef = useRef(onCycleNext);
  onCycleNextRef.current = onCycleNext;

  const showSkeletonRef = useRef(showSkeleton);
  showSkeletonRef.current = showSkeleton;

  // Clear flower particles trigger
  const clearFlowers = useCallback(() => {
    particlesRef.current = [];
    trailsRef.current = [];
  }, []);

  if (onClearFlowersRef) {
    onClearFlowersRef.current = clearFlowers;
  }

  // Initialize MediaPipe Hands
  const handsInstanceRef = useRef<{
    send: (data: { image: HTMLVideoElement }) => Promise<void>;
  } | null>(null);

  useEffect(() => {
    let hands: any = null;
    const initHands = () => {
      if (typeof window !== 'undefined' && (window as any).Hands) {
        try {
          hands = new (window as any).Hands({
            locateFile: (file: string) =>
              `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
          });
          hands.setOptions({
            maxNumHands: 4, // Support multiple hands like Flower Wand Garden!
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          hands.onResults((results: MediaPipeHandsResults) => {
            lastHandsRef.current = results.multiHandLandmarks || [];
            processHandResults();
          });
          handsInstanceRef.current = hands;
        } catch (e) {
          console.error('Error creating MediaPipe Hands instance:', e);
        }
      }
    };

    if ((window as any).Hands) {
      initHands();
    } else {
      const interval = setInterval(() => {
        if ((window as any).Hands) {
          clearInterval(interval);
          initHands();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    return () => {
      if (hands && hands.close) {
        try {
          hands.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Process Hand Landmarks:
  // 1. In Wand / Stars / Hearts / Bubbles mode: track index fingertips and spawn magical blooms
  // 2. In Frame mode: compute finger-frame shape enclosure
  const processHandResults = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const hands = lastHandsRef.current;
    const mode = playModeRef.current;

    if (hands.length === 0) {
      missingRef.current++;
      if (missingRef.current > 4) {
        if (mode === 'frame') {
          setClosedState(false, 'no_hands', 'Show both hands');
        } else {
          onStatusChange('no_hands', 'Show your hand to draw flowers', false);
        }
      }
      return;
    }

    missingRef.current = 0;
    const isUserFacing = facingRef.current === 'user';
    const mx = (l: { x: number }) => (isUserFacing ? 1 - l.x : l.x) * canvas.width;
    const my = (l: { y: number }) => l.y * canvas.height;

    // --- WAND GARDEN & PARTICLES MODES ---
    if (mode !== 'frame') {
      onStatusChange('wand_active', `✨ ${hands.length} Hand${hands.length > 1 ? 's' : ''} Wand Active`, true);

      // Track index fingertip (landmark 8) for each hand
      const now = performance.now();
      hands.forEach((hand, hIdx) => {
        const indexTip = hand[8];
        const thumbTip = hand[4];
        if (!indexTip) return;

        const tipX = mx(indexTip);
        const tipY = my(indexTip);

        // Add to magic trail
        trailsRef.current.push({
          x: tipX,
          y: tipY,
          timestamp: now,
          color: paletteRef.current.colors[hIdx % 2],
          size: 14,
        });

        // Spawn flower/star/heart when moving or gently pausing
        const lastPos = lastSpawnPosRef.current[hIdx];
        const dist = lastPos ? Math.hypot(tipX - lastPos.x, tipY - lastPos.y) : 999;
        const timeDelta = lastPos ? now - lastPos.time : 999;

        // If moved enough or periodically held
        if (dist > 28 || (dist > 8 && timeDelta > 160)) {
          lastSpawnPosRef.current[hIdx] = { x: tipX, y: tipY, time: now };

          // Choose colors
          const pal = paletteRef.current.colors;
          const flowerColors = [
            '#ff5bbd', '#ff9a3c', '#00f0ff', '#ffe14d', '#b6ff3c', '#ff3b4e', '#a855f7', '#38bdf8'
          ];
          const chosenColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];

          // Spawn particle based on mode
          const pType = mode === 'stars'
            ? 'star'
            : mode === 'hearts'
            ? 'heart'
            : mode === 'bubbles'
            ? 'bubble'
            : 'flower';

          particlesRef.current.push({
            id: `p-${Date.now()}-${Math.random()}`,
            x: tipX,
            y: tipY,
            size: 4,
            targetSize: Math.random() * 26 + 32, // lovely bloom size
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.04,
            petals: Math.floor(Math.random() * 3) + 5, // 5 to 7 petals
            color: chosenColor,
            centerColor: '#fff9a6',
            age: 0,
            maxAge: 320, // lasts ~6 seconds
            alpha: 1,
            stemEndY: tipY + Math.random() * 40 + 20,
            type: pType,
            vx: (Math.random() - 0.5) * 0.8,
            vy: pType === 'bubble' ? - (Math.random() * 1.5 + 0.5) : (Math.random() - 0.5) * 0.4,
          });

          // Also sprinkle tiny sparkles
          for (let s = 0; s < 3; s++) {
            particlesRef.current.push({
              id: `sp-${Date.now()}-${Math.random()}`,
              x: tipX + (Math.random() - 0.5) * 20,
              y: tipY + (Math.random() - 0.5) * 20,
              size: 2,
              targetSize: Math.random() * 10 + 6,
              rotation: Math.random() * Math.PI,
              rotationSpeed: 0.1,
              petals: 4,
              color: '#ffffff',
              centerColor: pal[0],
              age: 0,
              maxAge: 45,
              alpha: 1,
              type: 'sparkle',
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2 - 1,
            });
          }

          // Sound effect
          if (pType === 'flower') {
            playBloomSound();
          } else {
            playSparkleSound();
          }

          // Limit max particles to keep 60fps buttery smooth
          if (particlesRef.current.length > 120) {
            particlesRef.current.splice(0, 15);
          }
        }
      });
      return;
    }

    // --- FINGER FRAME ENCLOSURE GESTURE SOLVER ---
    if (hands.length < 2) {
      setClosedState(false, 'one_hand', 'Show second hand to frame');
      return;
    }

    const P = (l: { x: number; y: number }) => ({ x: mx(l), y: my(l) });
    const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

    // Hand A & Hand B L-corners (MCP 2 thumb joint, MCP 5 index joint)
    const [A, B] = [hands[0], hands[1]].map((h) => ({
      v: mid(P(h[2]), P(h[5])), // corner of L
      t: P(h[4]), // thumb tip
      i: P(h[8]), // index tip
    }));

    const diag = dist(A.v, B.v);

    let p1: [Point, Point], p2: [Point, Point];
    if (dist(A.t, B.t) + dist(A.i, B.i) <= dist(A.t, B.i) + dist(A.i, B.t)) {
      p1 = [A.t, B.t];
      p2 = [A.i, B.i];
    } else {
      p1 = [A.t, B.i];
      p2 = [A.i, B.t];
    }

    const gap = Math.max(dist(...p1), dist(...p2));
    const c1 = mid(...p1);
    const c2 = mid(...p2);

    const target: Point[] = [A.v, c1, B.v, c2];

    const isSeparated = diag > canvas.width * 0.12;
    const isTouching = gap < diag * 0.52;
    const isFrameClosed = isSeparated && isTouching;

    if (quadRef.current && isClosedRef.current) {
      quadRef.current = quadRef.current.map((q, idx) => ({
        x: q.x + (target[idx].x - q.x) * 0.58,
        y: q.y + (target[idx].y - q.y) * 0.58,
      }));
    } else {
      quadRef.current = target;
    }

    if (isFrameClosed) {
      setClosedState(true, 'locked', '✨ Frame Active!');
    } else {
      setClosedState(false, 'forming', 'Bring fingertips together');
    }
  }, [onStatusChange]);

  const setClosedState = (
    closed: boolean,
    status: GestureStatus,
    statusText: string
  ) => {
    if (closed && !isClosedRef.current) {
      playFrameLockSound();
      if (autoCycleRef.current) {
        onCycleNextRef.current();
      }
    }
    isClosedRef.current = closed;
    onStatusChange(status, statusText, closed);
  };

  // Helper drawing routines for flowers, stars, hearts
  const drawFlower = (
    ctx: CanvasRenderingContext2D,
    p: FlowerParticle
  ) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    const r = p.size;
    const petalRadius = r * 0.55;
    const petals = p.petals;

    // Draw Petals
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    for (let i = 0; i < petals; i++) {
      const angle = (i * 2 * Math.PI) / petals;
      const px = Math.cos(angle) * (r * 0.5);
      const py = Math.sin(angle) * (r * 0.5);

      ctx.beginPath();
      ctx.arc(px, py, petalRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flower Center
    ctx.fillStyle = p.centerColor;
    ctx.shadowColor = '#ffe14d';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Inner detail ring
    ctx.fillStyle = '#ff8f3d';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawStar = (ctx: CanvasRenderingContext2D, p: FlowerParticle) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    const spikes = 5;
    const outerRadius = p.size;
    const innerRadius = p.size * 0.45;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(0, -outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = Math.cos(rot) * outerRadius;
      let y = Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = Math.cos(rot) * innerRadius;
      y = Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(0, -outerRadius);
    ctx.closePath();

    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 15;
    ctx.fill();

    // Star center spark
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawHeart = (ctx: CanvasRenderingContext2D, p: FlowerParticle) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    const s = p.size * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, -10 * s);
    ctx.bezierCurveTo(-15 * s, -30 * s, -40 * s, -10 * s, 0, 30 * s);
    ctx.bezierCurveTo(40 * s, -10 * s, 15 * s, -30 * s, 0, -10 * s);
    ctx.closePath();

    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 16;
    ctx.fill();

    ctx.restore();
  };

  const drawSparkle = (ctx: CanvasRenderingContext2D, p: FlowerParticle) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = p.centerColor;
    ctx.shadowBlur = 10;

    const r = p.size;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.quadraticCurveTo(0, 0, 0, r);
    ctx.quadraticCurveTo(0, 0, -r, 0);
    ctx.quadraticCurveTo(0, 0, 0, -r);
    ctx.fill();

    ctx.restore();
  };

  const drawBubble = (ctx: CanvasRenderingContext2D, p: FlowerParticle) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = p.alpha * 0.8;

    const r = p.size;
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.3, 'rgba(0, 240, 255, 0.5)');
    grad.addColorStop(0.7, 'rgba(255, 43, 214, 0.4)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.2)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  };

  // Main Render Loop
  const renderFrame = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState < 2) {
        reqAnimRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      // Compute FPS
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      if (delta > 0) {
        fpsRef.current = Math.round(1000 / delta);
      }
      lastFrameTimeRef.current = now;

      // Ensure canvas matches video resolution
      if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reqAnimRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw Camera video (mirrored for selfie)
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      if (facingRef.current === 'user') {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      const mode = playModeRef.current;
      const palette = paletteRef.current;
      const isUserFacing = facingRef.current === 'user';
      const mx = (l: { x: number }) => (isUserFacing ? 1 - l.x : l.x) * w;
      const my = (l: { y: number }) => l.y * h;

      // 2. Draw Hand Landmark Skeleton HUD if enabled
      if (showSkeletonRef.current && lastHandsRef.current.length > 0) {
        ctx.save();
        lastHandsRef.current.forEach((hand) => {
          const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
          ];

          ctx.strokeStyle = palette.colors[0];
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.6;
          connections.forEach(([i, j]) => {
            if (hand[i] && hand[j]) {
              ctx.beginPath();
              ctx.moveTo(mx(hand[i]), my(hand[i]));
              ctx.lineTo(mx(hand[j]), my(hand[j]));
              ctx.stroke();
            }
          });

          hand.forEach((lm, idx) => {
            const x = mx(lm);
            const y = my(lm);
            ctx.beginPath();
            ctx.arc(x, y, idx === 8 ? 8 : 4, 0, Math.PI * 2);
            ctx.fillStyle = idx === 8 ? '#ffffff' : palette.colors[1];
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = idx === 8 ? 14 : 4;
            ctx.fill();
          });
        });
        ctx.restore();
      }

      // 3. WAND GARDEN PARTICLES & TRAILS RENDERING (like flower-wand-garden!)
      if (mode !== 'frame') {
        // Draw Magic Trails behind fingertips
        const trails = trailsRef.current;
        const trailLifetime = 600; // ms
        ctx.save();
        for (let i = trails.length - 1; i >= 0; i--) {
          const pt = trails[i];
          const age = now - pt.timestamp;
          if (age > trailLifetime) {
            trails.splice(i, 1);
            continue;
          }
          const alpha = 1 - age / trailLifetime;
          const r = pt.size * (1 - age / trailLifetime);

          ctx.fillStyle = pt.color;
          ctx.shadowColor = pt.color;
          ctx.shadowBlur = 10;
          ctx.globalAlpha = alpha * 0.7;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(1, r), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Draw Wand Star/Glow Cursor at index fingertip
        if (lastHandsRef.current.length > 0) {
          ctx.save();
          lastHandsRef.current.forEach((hand) => {
            const tip = hand[8];
            if (!tip) return;
            const x = mx(tip);
            const y = my(tip);

            // Pulsing magic wand reticle
            const wandPulse = Math.sin(time / 150) * 4 + 14;
            ctx.beginPath();
            ctx.arc(x, y, wandPulse, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = palette.colors[0];
            ctx.shadowBlur = 18;
            ctx.stroke();

            // Inner bright core
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          });
          ctx.restore();
        }

        // Draw Living Planted Flowers & Particles
        const particles = particlesRef.current;
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.age++;

          // Gentle movement / float
          if (p.vx) p.x += p.vx;
          if (p.vy) p.y += p.vy;
          p.rotation += p.rotationSpeed;

          // Bloom growth animation
          if (p.size < p.targetSize) {
            p.size += (p.targetSize - p.size) * 0.18;
          }

          // Fade out near end of life
          if (p.age > p.maxAge - 40) {
            p.alpha = Math.max(0, (p.maxAge - p.age) / 40);
          }

          if (p.age >= p.maxAge) {
            particles.splice(i, 1);
            continue;
          }

          if (p.type === 'flower') {
            drawFlower(ctx, p);
          } else if (p.type === 'star') {
            drawStar(ctx, p);
          } else if (p.type === 'heart') {
            drawHeart(ctx, p);
          } else if (p.type === 'bubble') {
            drawBubble(ctx, p);
          } else {
            drawSparkle(ctx, p);
          }
        }
      }

      // 4. FINGER FRAME RENDERING (When in Frame Mode)
      if (mode === 'frame') {
        const quad = quadRef.current;
        const isClosed = isClosedRef.current;
        const style = styleRef.current;

        if (isClosed && quad && quad.length === 4) {
          const xs = quad.map((q) => q.x);
          const ys = quad.map((q) => q.y);
          const bounds: Bounds = {
            x: Math.min(...xs),
            y: Math.min(...ys),
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys),
          };

          const createQuadPath = () => {
            ctx.beginPath();
            quad.forEach((q, idx) => {
              if (idx === 0) ctx.moveTo(q.x, q.y);
              else ctx.lineTo(q.x, q.y);
            });
            ctx.closePath();
          };

          // Render pattern clipped inside quadrilateral
          ctx.save();
          createQuadPath();
          ctx.clip();
          try {
            style.render(ctx, bounds, time / 1000, palette.colors, canvas, quad);
          } catch {
            // Safe fallback
          }
          ctx.restore();

          // Glowing boundary line
          ctx.save();
          createQuadPath();
          ctx.lineWidth = 5;
          ctx.strokeStyle = palette.colors[0];
          ctx.shadowColor = palette.colors[1];
          ctx.shadowBlur = 24;
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.restore();

          // Corner reticles
          ctx.save();
          quad.forEach((q) => {
            ctx.beginPath();
            ctx.arc(q.x, q.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = palette.colors[1];
            ctx.shadowBlur = 10;
            ctx.fill();
          });
          ctx.restore();
        }
      }

      // 5. Send frame to MediaPipe if not busy
      if (handsInstanceRef.current && !busyRef.current) {
        busyRef.current = true;
        handsInstanceRef.current
          .send({ image: video })
          .catch(() => {})
          .finally(() => {
            busyRef.current = false;
          });
      }

      reqAnimRef.current = requestAnimationFrame(renderFrame);
    },
    []
  );

  // Start Camera
  const openCamera = useCallback(async () => {
    try {
      setErrorMessage(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingRef.current,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setHasStarted(true);
      quadRef.current = null;
      particlesRef.current = [];
      trailsRef.current = [];

      if (playModeRef.current === 'frame') {
        setClosedState(false, 'no_hands', 'Show both hands');
      } else {
        onStatusChange('no_hands', 'Show hand to draw flowers', false);
      }

      if (!reqAnimRef.current) {
        reqAnimRef.current = requestAnimationFrame(renderFrame);
      }
    } catch (err: any) {
      console.error('Camera open error:', err);
      setErrorMessage(
        'Unable to access camera. Please allow camera permissions in your browser bar.'
      );
      onStatusChange('error', 'Camera blocked', false);
    }
  }, [renderFrame, onStatusChange]);

  // Restart camera when facing changes
  useEffect(() => {
    if (hasStarted) {
      openCamera();
    }
  }, [facing, openCamera, hasStarted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reqAnimRef.current) {
        cancelAnimationFrame(reqAnimRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (recTimerRef.current) {
        clearInterval(recTimerRef.current);
      }
    };
  }, []);

  // Shutter Snapshot Execution
  const executeSnap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 350);

    playShutterSound();

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.8 },
      });
    } catch {
      // Ignore
    }

    canvas.toBlob((blob) => {
      if (blob) {
        onMediaCaptured(blob, 'photo');
      }
    }, 'image/png');
  }, [onMediaCaptured]);

  // Photo snap trigger with countdown
  const takePhoto = useCallback(() => {
    if (countdown !== null) return;

    if (photoTimer > 0) {
      let count = photoTimer;
      setCountdown(count);
      playCountdownTick(false);

      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
          playCountdownTick(false);
        } else {
          clearInterval(interval);
          setCountdown(null);
          playCountdownTick(true);
          executeSnap();
        }
      }, 1000);
    } else {
      executeSnap();
    }
  }, [photoTimer, countdown, executeSnap]);

  // Video Recording: Start Recording
  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;

    try {
      const canvasStream = canvas.captureStream(30);

      if (micEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          const audioTrack = micStream.getAudioTracks()[0];
          if (audioTrack) {
            canvasStream.addTrack(audioTrack);
          }
        } catch {
          console.warn('Microphone permission denied, recording silent video.');
        }
      }

      const types = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const mimeType = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';

      const recorder = new MediaRecorder(
        canvasStream,
        mimeType ? { mimeType, videoBitsPerSecond: 6000000 } : {}
      );

      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (recTimerRef.current) {
          clearInterval(recTimerRef.current);
          recTimerRef.current = null;
        }

        const duration = Math.round((Date.now() - recordStartTimeRef.current) / 1000);
        const finalBlob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || 'video/webm',
        });

        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
        }

        setIsRecording(false);
        setRecordingTime(0);
        playRecordStop();

        try {
          confetti({
            particleCount: 60,
            spread: 80,
            origin: { y: 0.75 },
          });
        } catch {
          // ignore
        }

        onMediaCaptured(finalBlob, 'video', Math.max(1, duration));
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      recordStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingTime(0);
      playRecordStart();

      recTimerRef.current = window.setInterval(() => {
        const secs = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
        setRecordingTime(secs);
      }, 500);
    } catch (err) {
      console.error('Failed to start video recording:', err);
      setIsRecording(false);
    }
  }, [isRecording, micEnabled, onMediaCaptured, setIsRecording, setRecordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  useEffect(() => {
    triggerSnapRef.current = takePhoto;
    triggerRecordRef.current = isRecording ? stopRecording : startRecording;
  }, [takePhoto, isRecording, stopRecording, startRecording, triggerSnapRef, triggerRecordRef]);

  // Spacebar and R shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        takePhoto();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [takePhoto, isRecording, stopRecording, startRecording]);

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative flex-1 w-full flex items-center justify-center min-h-0 p-2 sm:p-4 select-none">
      {/* Hidden processing video */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* Main Canvas Display */}
      <div className="relative max-h-full max-w-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl bg-black border border-purple-900/40">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="max-w-full max-h-[66vh] sm:max-h-[70vh] w-auto h-auto object-contain block rounded-2xl"
        />

        {/* Shutter Flash Animation */}
        <div
          className={`absolute inset-0 bg-white pointer-events-none transition-opacity ${
            flashActive ? 'flash-active' : 'opacity-0'
          }`}
        />

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
            <div className="text-8xl sm:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-fuchsia-400 animate-bounce drop-shadow-[0_10px_20px_rgba(0,240,255,0.6)]">
              {countdown}
            </div>
          </div>
        )}

        {/* Recording HUD */}
        {isRecording && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-mono font-bold shadow-lg backdrop-blur-sm border border-red-400/50 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>REC</span>
            <span>{formatRecTime(recordingTime)}</span>
          </div>
        )}

        {/* FPS & Mode Indicator */}
        {hasStarted && (
          <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/70 backdrop-blur-sm border border-white/10 text-[11px] font-mono text-purple-200">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>{fpsRef.current} FPS</span>
            <span>•</span>
            <span className="capitalize text-fuchsia-300 font-bold">
              {playMode === 'wand' ? '🌸 Flower Wand' : playMode}
            </span>
          </div>
        )}

        {/* Start Camera Hero Prompt */}
        {!hasStarted && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-[#0c0b14]/95 text-center backdrop-blur-xl">
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-400 p-[2px] shadow-[0_0_40px_rgba(236,72,153,0.4)] animate-pulse">
                <div className="w-full h-full bg-[#100e1a] rounded-[22px] flex items-center justify-center">
                  <Flower2 className="w-10 h-10 text-pink-400" />
                </div>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Flower Wand & Finger Camera
            </h2>

            <p className="max-w-md text-sm text-purple-200/80 leading-relaxed mb-6">
              Move your fingertip like a magic wand to bloom vibrant flowers and stars in the air, or close both hands to create glowing visual frames. Snap photos and record HD video clips!
            </p>

            <button
              onClick={openCamera}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 hover:from-pink-400 hover:to-cyan-300 text-white font-extrabold text-base transition-all shadow-[0_0_25px_rgba(236,72,153,0.5)] active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Camera className="w-5 h-5 text-white" />
              <span>Start Camera & Wands</span>
            </button>

            {errorMessage && (
              <div className="mt-4 flex items-center gap-2 text-xs text-red-300 bg-red-950/40 border border-red-800/50 px-3 py-2 rounded-lg max-w-sm">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="mt-6 flex items-center gap-4 text-xs text-purple-400/60 font-medium">
              <span>🌸 Real-time finger wand tracking</span>
              <span>•</span>
              <span>🎥 Record video & audio</span>
              <span>•</span>
              <span>🔒 100% private in-browser</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
