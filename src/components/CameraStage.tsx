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
  FrameCondition,
} from '../types/fingerFrame';
import {
  playShutterSound,
  playFrameLockSound,
  playPinchSnapSound,
  playInvertChord,
  playRecordStart,
  playRecordStop,
  playCountdownTick,
  playBloomSound,
  playSparkleSound,
} from '../utils/audioSynth';
import confetti from 'canvas-confetti';
import { Camera, AlertCircle, Sparkles, RefreshCw, Wand2, Flower2, Zap, Frame } from 'lucide-react';

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
  conditionMode?: 'auto' | 'upside_down' | 'apart_quad' | 'pinch_attached';
  onConditionChange?: (condition: FrameCondition, isAttached: boolean) => void;
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

// Compute line segment intersection
function getLineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 0.0001) return null;
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
    };
  }
  return null;
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
  conditionMode = 'auto',
  onConditionChange,
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
  const conditionRef = useRef<FrameCondition>('none');
  const prevConditionRef = useRef<FrameCondition>('none');
  const lastHandsRef = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const missingRef = useRef<number>(0);
  const busyRef = useRef<boolean>(false);
  const reqAnimRef = useRef<number | null>(null);
  const fpsRef = useRef<number>(60);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // Tracked fingertips exclusively: Left Index, Left Thumb, Right Index, Right Thumb
  const trackedFingersRef = useRef<{
    leftIndex?: Point;
    leftThumb?: Point;
    rightIndex?: Point;
    rightThumb?: Point;
    centerPt?: Point | null;
    isAttached?: boolean;
    condition: FrameCondition;
    leftInverted?: boolean;
    rightInverted?: boolean;
  }>({
    condition: 'none',
  });

  // Synchronized refs
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

  const conditionModeRef = useRef(conditionMode);
  conditionModeRef.current = conditionMode;

  const onConditionChangeRef = useRef(onConditionChange);
  onConditionChangeRef.current = onConditionChange;

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
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
          });

          hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.55,
            minTrackingConfidence: 0.55,
          });

          hands.onResults((results: MediaPipeHandsResults) => {
            if (results.multiHandLandmarks) {
              lastHandsRef.current = results.multiHandLandmarks;
            } else {
              lastHandsRef.current = [];
            }
            processHandResults();
            busyRef.current = false;
          });

          handsInstanceRef.current = hands;
        } catch (e) {
          console.error('MediaPipe Hands init error:', e);
        }
      }
    };

    if (!(window as any).Hands) {
      const interval = setInterval(() => {
        if ((window as any).Hands) {
          clearInterval(interval);
          initHands();
        }
      }, 100);
      return () => clearInterval(interval);
    } else {
      initHands();
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
  // FOCUS ONLY ON FIRST FINGER (INDEX TIP, landmark 8) AND THUMB FINGER (THUMB TIP, landmark 4)
  // DETECTS UPSIDE-DOWN ORIENTATION (VIRAL TREND SCREENSHOT) & PINCH ATTACHED CONDITION
  const processHandResults = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const hands = lastHandsRef.current;
    const mode = playModeRef.current;

    if (hands.length === 0) {
      missingRef.current++;
      if (missingRef.current > 6) {
        if (mode === 'frame') {
          setClosedState(false, 'no_hands', 'Raise both hands to frame');
        } else {
          onStatusChange('no_hands', 'Show your hand to draw', false);
        }
      }
      return;
    }

    missingRef.current = 0;
    const isUserFacing = facingRef.current === 'user';
    const mx = (l: { x: number }) => (isUserFacing ? 1 - l.x : l.x) * canvas.width;
    const my = (l: { y: number }) => l.y * canvas.height;

    // ========================================================
    // 1. REEL FINGER FRAME SOLVER: ONLY FIRST FINGER & THUMB!
    // ========================================================
    if (mode === 'frame') {
      const P = (l: { x: number; y: number }) => ({ x: mx(l), y: my(l) });
      const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
      const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

      // CASE A: Two Hands Raised
      if (hands.length >= 2) {
        // Sort hands left to right by screen X
        const h0 = hands[0];
        const h1 = hands[1];
        const h0x = mx(h0[9] || h0[0]);
        const h1x = mx(h1[9] || h1[0]);

        const leftHand = h0x < h1x ? h0 : h1;
        const rightHand = h0x < h1x ? h1 : h0;

        // ONLY FOCUS ON FIRST FINGER (Index Tip 8) AND THUMB FINGER (Thumb Tip 4)
        const lIndex = P(leftHand[8]);
        const lThumb = P(leftHand[4]);
        const rIndex = P(rightHand[8]);
        const rThumb = P(rightHand[4]);

        // Hand orientation check:
        // A hand is upside down if the index finger is pointing down (higher Y coordinate than thumb or wrist)
        const lInverted = lIndex.y > lThumb.y + 12 || (leftHand[8].y > leftHand[0].y + 0.05);
        const rInverted = rIndex.y > rThumb.y + 12 || (rightHand[8].y > rightHand[0].y + 0.05);

        // Check if fingers are attached to each other (pinch condition between hands)
        const d_LIndex_RThumb = dist(lIndex, rThumb);
        const d_LThumb_RIndex = dist(lThumb, rIndex);
        const d_LIndex_RIndex = dist(lIndex, rIndex);
        const d_LThumb_RThumb = dist(lThumb, rThumb);
        const d_LPinch = dist(lIndex, lThumb);
        const d_RPinch = dist(rIndex, rThumb);

        // Attachment condition: fingers touching or dual-hand pinch
        const isDualPinch =
          (d_LIndex_RThumb < 58 && d_LThumb_RIndex < 58) ||
          (d_LIndex_RThumb < 45 || d_LThumb_RIndex < 45) ||
          (d_LIndex_RIndex < 45 && d_LThumb_RThumb < 45);

        const isSelfPinchBoth = d_LPinch < 42 && d_RPinch < 42 && dist(lIndex, rIndex) < 240;
        const isAttached = isDualPinch || isSelfPinchBoth;

        // Determine active condition
        let detectedCondition: FrameCondition = 'apart_quad';
        if (isAttached) {
          detectedCondition = 'pinch_attached';
        } else if (lInverted !== rInverted || (lInverted && rInverted)) {
          // Exactly matching Screenshot_20260924_070735_YouTube.jpg: one hand upside down!
          detectedCondition = 'upside_down';
        } else {
          detectedCondition = 'apart_quad';
        }

        const activeCond =
          conditionModeRef.current && conditionModeRef.current !== 'auto'
            ? conditionModeRef.current
            : detectedCondition;

        // Sound triggers on state change
        if (activeCond !== prevConditionRef.current) {
          if (activeCond === 'pinch_attached') {
            playPinchSnapSound();
          } else if (activeCond === 'upside_down') {
            playInvertChord();
          } else if (activeCond === 'apart_quad') {
            playFrameLockSound();
          }
          prevConditionRef.current = activeCond;
          conditionRef.current = activeCond;
          if (onConditionChangeRef.current) {
            onConditionChangeRef.current(activeCond, isAttached);
          }
        }

        let targetQuad: Point[] = [];
        let centerPt: Point | null = null;

        // ==========================================
        // CONDITION 1: UPSIDE-DOWN (VIRAL TREND SHORT)
        // ==========================================
        if (activeCond === 'upside_down') {
          // As shown in YouTube Short screenshot:
          // Left hand upright: Index is Top-Left, Thumb is Bottom-Left
          // Right hand upside-down: Thumb is Top-Right, Index is Bottom-Right
          const topLeft = !lInverted ? lIndex : lThumb;
          const bottomLeft = !lInverted ? lThumb : lIndex;
          const topRight = rInverted ? rThumb : rIndex;
          const bottomRight = rInverted ? rIndex : rThumb;

          centerPt = getLineIntersection(topLeft, bottomRight, bottomLeft, topRight);

          targetQuad = [topLeft, topRight, bottomRight, bottomLeft];

          trackedFingersRef.current = {
            leftIndex: lIndex,
            leftThumb: lThumb,
            rightIndex: rIndex,
            rightThumb: rThumb,
            centerPt,
            isAttached: false,
            condition: 'upside_down',
            leftInverted: lInverted,
            rightInverted: rInverted,
          };

          if (quadRef.current && isClosedRef.current) {
            quadRef.current = quadRef.current.map((q, idx) => ({
              x: q.x + (targetQuad[idx].x - q.x) * 0.55,
              y: q.y + (targetQuad[idx].y - q.y) * 0.55,
            }));
          } else {
            quadRef.current = targetQuad;
          }

          setClosedState(
            true,
            'locked',
            `⏳ VIRAL TREND: Upside-Down Inverted Frame`
          );
          return;
        }

        // ==========================================
        // CONDITION 2: PINCH ATTACHED (FINGERS TOUCHING)
        // ==========================================
        if (activeCond === 'pinch_attached') {
          // Calculate pinch contact points
          const pinchTop =
            d_LIndex_RThumb < 65
              ? mid(lIndex, rThumb)
              : d_LIndex_RIndex < 65
              ? mid(lIndex, rIndex)
              : lIndex;

          const pinchBottom =
            d_LThumb_RIndex < 65
              ? mid(lThumb, rIndex)
              : d_LThumb_RThumb < 65
              ? mid(lThumb, rThumb)
              : lThumb;

          const span = Math.max(dist(pinchTop, pinchBottom), 90);
          const halfSpan = span * 0.45;

          targetQuad = [
            { x: pinchTop.x - halfSpan, y: pinchTop.y },
            { x: pinchTop.x + halfSpan, y: pinchTop.y },
            { x: pinchBottom.x + halfSpan, y: pinchBottom.y },
            { x: pinchBottom.x - halfSpan, y: pinchBottom.y },
          ];

          trackedFingersRef.current = {
            leftIndex: lIndex,
            leftThumb: lThumb,
            rightIndex: rIndex,
            rightThumb: rThumb,
            isAttached: true,
            condition: 'pinch_attached',
            leftInverted: lInverted,
            rightInverted: rInverted,
          };

          if (quadRef.current && isClosedRef.current) {
            quadRef.current = quadRef.current.map((q, idx) => ({
              x: q.x + (targetQuad[idx].x - q.x) * 0.6,
              y: q.y + (targetQuad[idx].y - q.y) * 0.6,
            }));
          } else {
            quadRef.current = targetQuad;
          }

          setClosedState(
            true,
            'locked',
            `🔒 PINCH ATTACHED: Dual Hand Pinch Locked!`
          );
          return;
        }

        // ==========================================
        // CONDITION 3: FINGERS APART QUAD (UPRIGHT)
        // ==========================================
        targetQuad = [
          lIndex, // Top-Left
          rIndex, // Top-Right
          rThumb, // Bottom-Right
          lThumb, // Bottom-Left
        ];

        trackedFingersRef.current = {
          leftIndex: lIndex,
          leftThumb: lThumb,
          rightIndex: rIndex,
          rightThumb: rThumb,
          isAttached: false,
          condition: 'apart_quad',
          leftInverted: lInverted,
          rightInverted: rInverted,
        };

        if (quadRef.current && isClosedRef.current) {
          quadRef.current = quadRef.current.map((q, idx) => ({
            x: q.x + (targetQuad[idx].x - q.x) * 0.55,
            y: q.y + (targetQuad[idx].y - q.y) * 0.55,
          }));
        } else {
          quadRef.current = targetQuad;
        }

        const spanPx = Math.round(Math.abs(rIndex.x - lIndex.x));
        setClosedState(
          true,
          'locked',
          `✨ FINGERS APART: Quad Frame (${spanPx}px)`
        );
        return;
      }

      // CASE B: Single Hand Viewfinder (Single L-pose)
      if (hands.length === 1) {
        const h = hands[0];
        const iTip = P(h[8]); // index tip (first finger)
        const tTip = P(h[4]); // thumb tip (thumb finger)
        const corner = mid(P(h[2]), P(h[5])); // corner of L
        const span = dist(iTip, tTip);

        // Check if single hand is pinching (index touches thumb)
        const isSinglePinch = span < 40;

        if (isSinglePinch) {
          const pinchPt = mid(iTip, tTip);
          const r = 55;
          const singleTarget: Point[] = [
            { x: pinchPt.x - r, y: pinchPt.y - r },
            { x: pinchPt.x + r, y: pinchPt.y - r },
            { x: pinchPt.x + r, y: pinchPt.y + r },
            { x: pinchPt.x - r, y: pinchPt.y + r },
          ];

          trackedFingersRef.current = {
            leftIndex: iTip,
            leftThumb: tTip,
            isAttached: true,
            condition: 'pinch_attached',
          };
          conditionRef.current = 'pinch_attached';

          if (quadRef.current && isClosedRef.current) {
            quadRef.current = quadRef.current.map((q, idx) => ({
              x: q.x + (singleTarget[idx].x - q.x) * 0.55,
              y: q.y + (singleTarget[idx].y - q.y) * 0.55,
            }));
          } else {
            quadRef.current = singleTarget;
          }

          setClosedState(true, 'locked', '👌 1-Hand Pinch Aperture Locked');
          return;
        }

        if (span > 50) {
          const opposite: Point = {
            x: iTip.x + (tTip.x - corner.x),
            y: iTip.y + (tTip.y - corner.y),
          };

          const singleTarget: Point[] = [
            iTip.y < corner.y ? iTip : corner,
            opposite,
            tTip,
            corner,
          ];

          trackedFingersRef.current = {
            leftIndex: iTip,
            leftThumb: tTip,
            isAttached: false,
            condition: 'single_l',
          };
          conditionRef.current = 'single_l';

          if (quadRef.current && isClosedRef.current) {
            quadRef.current = quadRef.current.map((q, idx) => ({
              x: q.x + (singleTarget[idx].x - q.x) * 0.5,
              y: q.y + (singleTarget[idx].y - q.y) * 0.5,
            }));
          } else {
            quadRef.current = singleTarget;
          }

          setClosedState(true, 'one_hand', '👆 1-Hand Viewfinder (Raise 2nd hand to expand)');
          return;
        }

        setClosedState(false, 'one_hand', 'Open index & thumb in L-shape');
        return;
      }
    }

    // ========================================================
    // 2. WAND & PARTICLE DRAWING MODES
    // ========================================================
    onStatusChange('wand_active', `✨ ${hands.length} Hand${hands.length > 1 ? 's' : ''} Wand Active`, true);

    const now = performance.now();
    hands.forEach((hand, hIdx) => {
      const tip = hand[8]; // Index fingertip
      if (!tip) return;

      const px = mx(tip);
      const py = my(tip);

      // Add to light trail
      trailsRef.current.push({
        x: px,
        y: py,
        timestamp: now,
        color: paletteRef.current.colors[hIdx % paletteRef.current.colors.length],
        size: 9,
      });

      // Spawn garden particles
      const lastSpawn = lastSpawnPosRef.current[hIdx];
      const distTraveled = lastSpawn ? Math.hypot(px - lastSpawn.x, py - lastSpawn.y) : 999;
      const timeElapsed = lastSpawn ? now - lastSpawn.time : 999;

      if (distTraveled > 24 || timeElapsed > 220) {
        lastSpawnPosRef.current[hIdx] = { x: px, y: py, time: now };
        spawnParticle(px, py, mode);
      }
    });

    if (trailsRef.current.length > 180) {
      trailsRef.current = trailsRef.current.slice(-180);
    }
  }, [onStatusChange]);

  // Helper to spawn a flower/sparkle particle
  const spawnParticle = (x: number, y: number, mode: PlayMode) => {
    const palette = paletteRef.current;
    const colors = [
      palette.colors[0],
      palette.colors[1],
      '#ff2bd6',
      '#00f0ff',
      '#ffe14d',
      '#ff79b0',
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    let pType: FlowerParticle['type'] = 'flower';
    if (mode === 'stars') pType = 'star';
    else if (mode === 'hearts') pType = 'heart';
    else if (mode === 'bubbles') pType = 'bubble';
    else pType = Math.random() > 0.3 ? 'flower' : 'sparkle';

    const p: FlowerParticle = {
      id: Math.random().toString(36).substr(2, 9),
      x: x + (Math.random() - 0.5) * 12,
      y: y + (Math.random() - 0.5) * 12,
      size: 4,
      targetSize: Math.random() * 22 + 18,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.04,
      petals: Math.floor(Math.random() * 3) + 5,
      color,
      centerColor: '#fffbdf',
      age: 0,
      maxAge: Math.floor(Math.random() * 80) + 160,
      alpha: 1,
      stemEndY: y + Math.random() * 35 + 20,
      type: pType,
      vx: (Math.random() - 0.5) * 0.8,
      vy: pType === 'bubble' ? -Math.random() * 1.5 - 0.5 : (Math.random() - 0.5) * 0.4,
    };

    particlesRef.current.push(p);
    if (particlesRef.current.length > 90) {
      particlesRef.current.shift();
    }

    if (pType === 'flower') playBloomSound();
    else playSparkleSound();
  };

  // Helper to set closed state with audio feedback
  const setClosedState = (closed: boolean, status: GestureStatus, text: string) => {
    if (closed && !isClosedRef.current) {
      playFrameLockSound();
      if (autoCycleRef.current && onCycleNextRef.current) {
        onCycleNextRef.current();
      }
    }
    isClosedRef.current = closed;
    onStatusChange(status, text, closed);
  };

  // Drawing routines for particles
  const drawFlower = (ctx: CanvasRenderingContext2D, p: FlowerParticle) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    if (p.stemEndY) {
      ctx.save();
      ctx.rotate(-p.rotation);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(6, (p.stemEndY - p.y) * 0.5, 0, p.stemEndY - p.y);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    const r = p.size;
    for (let i = 0; i < p.petals; i++) {
      const angle = (i * Math.PI * 2) / p.petals;
      ctx.save();
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(r * 0.6, -r * 0.4, r, 0);
      ctx.quadraticCurveTo(r * 0.6, r * 0.4, 0, 0);

      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = p.centerColor;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
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
    const innerRadius = p.size * 0.42;

    ctx.beginPath();
    let rot = (Math.PI / 2) * 3;
    let x = 0;
    let y = 0;
    const step = Math.PI / spikes;

    ctx.moveTo(0, -outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = Math.cos(rot) * outerRadius;
      y = Math.sin(rot) * outerRadius;
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
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, innerRadius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  };

  const drawHeart = (ctx: CanvasRenderingContext2D, p: FlowerParticle) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.size / 18, p.size / 18);
    ctx.rotate(p.rotation * 0.2);
    ctx.globalAlpha = p.alpha;

    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.bezierCurveTo(-9, -15, -18, -4, -18, 5);
    ctx.bezierCurveTo(-18, 14, -9, 21, 0, 26);
    ctx.bezierCurveTo(9, 21, 18, 14, 18, 5);
    ctx.bezierCurveTo(18, -4, 9, -15, 0, -4);
    ctx.closePath();

    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 14;
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

  // Helper to draw corner reticles L-brackets
  const drawCornerBrackets = (
    ctx: CanvasRenderingContext2D,
    quad: Point[],
    time: number,
    color: string
  ) => {
    const bracketLen = 22;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.8;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;

    // Corner 0: Top-Left (right, down)
    ctx.beginPath();
    ctx.moveTo(quad[0].x, quad[0].y + bracketLen);
    ctx.lineTo(quad[0].x, quad[0].y);
    ctx.lineTo(quad[0].x + bracketLen, quad[0].y);
    ctx.stroke();

    // Corner 1: Top-Right (left, down)
    ctx.beginPath();
    ctx.moveTo(quad[1].x - bracketLen, quad[1].y);
    ctx.lineTo(quad[1].x, quad[1].y);
    ctx.lineTo(quad[1].x, quad[1].y + bracketLen);
    ctx.stroke();

    // Corner 2: Bottom-Right (left, up)
    ctx.beginPath();
    ctx.moveTo(quad[2].x, quad[2].y - bracketLen);
    ctx.lineTo(quad[2].x, quad[2].y);
    ctx.lineTo(quad[2].x - bracketLen, quad[2].y);
    ctx.stroke();

    // Corner 3: Bottom-Left (right, up)
    ctx.beginPath();
    ctx.moveTo(quad[3].x + bracketLen, quad[3].y);
    ctx.lineTo(quad[3].x, quad[3].y);
    ctx.lineTo(quad[3].x, quad[3].y - bracketLen);
    ctx.stroke();

    ctx.restore();
  };

  // Helper to draw illuminated fingertip dots (Index and Thumb)
  const drawFingertipDots = (
    ctx: CanvasRenderingContext2D,
    pts: Point[],
    time: number,
    color: string,
    labels?: string[]
  ) => {
    ctx.save();
    pts.forEach((q, idx) => {
      // Solid white circular dot (matching YouTube Short screenshot)
      ctx.beginPath();
      ctx.arc(q.x, q.y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.fill();

      // Soft glowing concentric halo ring
      const ringPulse = 9 + Math.sin(time * 6 + idx) * 2.5;
      ctx.beginPath();
      ctx.arc(q.x, q.y, ringPulse, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      if (labels && labels[idx]) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '9px monospace font-bold';
        ctx.fillText(labels[idx], q.x + 8, q.y - 8);
      }
    });
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
      const isUserFacing = facingRef.current === 'user';
      const mode = playModeRef.current;
      const palette = paletteRef.current;
      const style = styleRef.current;
      const isClosed = isClosedRef.current;
      const quad = quadRef.current;
      const condition = conditionRef.current;
      const tf = trackedFingersRef.current;

      // 1. Draw Camera video (mirrored for selfie)
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      if (isUserFacing) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }

      // If style is Color Pop Spotlight, desaturate the background
      if (style.id === 'color-pop' && isClosed && quad) {
        ctx.filter = 'grayscale(100%) brightness(80%)';
      }
      ctx.drawImage(video, 0, 0, w, h);
      ctx.filter = 'none';
      ctx.restore();

      const mx = (l: { x: number }) => (isUserFacing ? 1 - l.x : l.x) * w;
      const my = (l: { y: number }) => l.y * h;

      // 2. Draw Hand Landmark Skeleton HUD if enabled
      if (showSkeletonRef.current && lastHandsRef.current.length > 0) {
        ctx.save();
        lastHandsRef.current.forEach((hand) => {
          // Strictly highlight only first finger (Index 8) and Thumb (4)
          [4, 8].forEach((lmIdx) => {
            const lm = hand[lmIdx];
            if (!lm) return;
            const x = mx(lm);
            const y = my(lm);
            ctx.beginPath();
            ctx.arc(x, y, 9, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = palette.colors[0];
            ctx.shadowBlur = 14;
            ctx.fill();
            ctx.strokeStyle = palette.colors[1];
            ctx.lineWidth = 2;
            ctx.stroke();
          });
        });
        ctx.restore();
      }

      // 3. FINGER FRAME RENDERING (ACCORDING TO CONDITION)
      if (mode === 'frame') {
        if (isClosed && quad && quad.length === 4) {
          const xs = quad.map((q) => q.x);
          const ys = quad.map((q) => q.y);
          const bounds: Bounds = {
            x: Math.min(...xs),
            y: Math.min(...ys),
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys),
          };

          const [p0, p1, p2, p3] = quad; // [Top-Left, Top-Right, Bottom-Right, Bottom-Left]

          const createQuadPath = () => {
            ctx.beginPath();
            quad.forEach((q, idx) => {
              if (idx === 0) ctx.moveTo(q.x, q.y);
              else ctx.lineTo(q.x, q.y);
            });
            ctx.closePath();
          };

          // Render live shader clipped inside the shape
          ctx.save();
          createQuadPath();
          ctx.clip();
          try {
            style.render(
              ctx,
              bounds,
              time / 1000,
              palette.colors,
              canvas,
              quad,
              video,
              isUserFacing,
              condition
            );
          } catch (e) {
            console.error('Style render error:', e);
          }
          ctx.restore();

          // ========================================================
          // RENDER LINES ACCORDING TO CONDITION
          // ========================================================

          // CONDITION A: UPSIDE-DOWN (MATCHING YOUTUBE SHORT SCREENSHOT)
          if (condition === 'upside_down') {
            ctx.save();
            ctx.setLineDash([5, 5]); // Delicate white dotted lines
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.0;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
            ctx.shadowBlur = 6;

            // 1. Line along Left hand: p0 to p3
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.stroke();

            // 2. Line along Right hand: p1 to p2
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // 3. Diagonal line crossing down-right: p0 to p2
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // 4. Diagonal line crossing up-right: p3 to p1
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();

            // 5. Top horizontal line: p0 to p1
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();

            // 6. Bottom horizontal line: p3 to p2
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            ctx.restore();

            // Draw central intersection reticle where diagonals cross
            if (tf.centerPt) {
              ctx.save();
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = '#ffffff';
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.arc(tf.centerPt.x, tf.centerPt.y, 4, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.arc(tf.centerPt.x, tf.centerPt.y, 9, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }

            // Draw white glowing dots on all 4 fingertips
            drawFingertipDots(
              ctx,
              quad,
              time / 1000,
              palette.colors[1],
              ['L-INDEX', 'R-THUMB', 'R-INDEX', 'L-THUMB']
            );
          }

          // CONDITION B: PINCH ATTACHED (FINGERS CONNECTED)
          else if (condition === 'pinch_attached') {
            // Continuous solid neon laser line
            ctx.save();
            ctx.setLineDash([]);
            createQuadPath();
            ctx.lineWidth = 4.0;
            ctx.strokeStyle = palette.colors[0];
            ctx.shadowColor = palette.colors[1];
            ctx.shadowBlur = 26;
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Inner white laser core
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#ffffff';
            ctx.shadowBlur = 4;
            ctx.stroke();
            ctx.restore();

            // Draw locked corner brackets
            drawCornerBrackets(ctx, quad, time / 1000, palette.colors[1]);
            drawFingertipDots(ctx, quad, time / 1000, palette.colors[0]);

            // Sparkling pinch lock rings at pinch contacts
            ctx.save();
            const pinchCenter = { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 };
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '10px monospace font-extrabold';
            ctx.fillText('🔒 PINCH LOCKED', bounds.x + 8, bounds.y + bounds.h - 8);
            ctx.restore();
          }

          // CONDITION C: APART QUAD (UPRIGHT HANDS APART)
          else {
            ctx.save();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.2;
            ctx.shadowColor = palette.colors[0];
            ctx.shadowBlur = 12;
            createQuadPath();
            ctx.stroke();
            ctx.restore();

            drawCornerBrackets(ctx, quad, time / 1000, palette.colors[1]);
            drawFingertipDots(
              ctx,
              quad,
              time / 1000,
              palette.colors[1],
              ['INDEX', 'INDEX', 'THUMB', 'THUMB']
            );
          }
        }
      }

      // 4. WAND GARDEN PARTICLES & TRAILS RENDERING
      if (mode !== 'frame') {
        const trails = trailsRef.current;
        const trailLifetime = 600;
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

        if (lastHandsRef.current.length > 0) {
          ctx.save();
          lastHandsRef.current.forEach((hand) => {
            const tip = hand[8];
            if (!tip) return;
            const x = mx(tip);
            const y = my(tip);

            const wandPulse = Math.sin(time / 150) * 4 + 14;
            ctx.beginPath();
            ctx.arc(x, y, wandPulse, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = palette.colors[0];
            ctx.shadowBlur = 18;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          });
          ctx.restore();
        }

        const particles = particlesRef.current;
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.age++;
          if (p.size < p.targetSize) {
            p.size += (p.targetSize - p.size) * 0.12;
          }
          p.rotation += p.rotationSpeed;
          if (p.vx) p.x += p.vx;
          if (p.vy) p.y += p.vy;

          if (p.age > p.maxAge - 30) {
            p.alpha = Math.max(0, (p.maxAge - p.age) / 30);
          }

          if (p.age >= p.maxAge) {
            particles.splice(i, 1);
            continue;
          }

          if (p.type === 'flower') drawFlower(ctx, p);
          else if (p.type === 'star') drawStar(ctx, p);
          else if (p.type === 'heart') drawHeart(ctx, p);
          else if (p.type === 'bubble') drawBubble(ctx, p);
          else drawSparkle(ctx, p);
        }
      }

      reqAnimRef.current = requestAnimationFrame(renderFrame);
    },
    [drawFlower, drawStar, drawHeart, drawSparkle, drawBubble]
  );

  // Setup Camera and loop
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setHasStarted(true);
            setErrorMessage(null);
            onStatusChange('forming', 'Raise hands to frame face', false);
          };
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setErrorMessage('Unable to access camera. Please grant camera permission.');
        onStatusChange('error', 'Camera blocked', false);
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facing, onStatusChange]);

  // Request hand inference frames
  useEffect(() => {
    let animId: number;

    const sendFrameToHands = async () => {
      const video = videoRef.current;
      const hands = handsInstanceRef.current;

      if (video && hands && video.readyState >= 2 && !busyRef.current) {
        busyRef.current = true;
        try {
          await hands.send({ image: video });
        } catch {
          busyRef.current = false;
        }
      }
      animId = requestAnimationFrame(sendFrameToHands);
    };

    animId = requestAnimationFrame(sendFrameToHands);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Start Canvas Render Animation
  useEffect(() => {
    reqAnimRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (reqAnimRef.current) {
        cancelAnimationFrame(reqAnimRef.current);
      }
    };
  }, [renderFrame]);

  // PHOTO CAPTURE
  const executeSnap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setFlashActive(true);
    playShutterSound();
    setTimeout(() => setFlashActive(false), 200);

    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.8 },
      colors: paletteRef.current.colors,
    });

    canvas.toBlob((blob) => {
      if (blob) {
        onMediaCaptured(blob, 'photo');
      }
    }, 'image/jpeg', 0.95);
  }, [onMediaCaptured]);

  const triggerSnap = useCallback(() => {
    if (photoTimer > 0) {
      setCountdown(photoTimer);
      let count = photoTimer;
      playCountdownTick(false);

      const timerId = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
          playCountdownTick(false);
        } else {
          clearInterval(timerId);
          setCountdown(null);
          playCountdownTick(true);
          executeSnap();
        }
      }, 1000);
    } else {
      executeSnap();
    }
  }, [photoTimer, executeSnap]);

  triggerSnapRef.current = triggerSnap;

  // VIDEO RECORDING
  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const canvasStream = canvas.captureStream(30);

      if (micEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          micStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
        } catch (e) {
          console.warn('Microphone access denied:', e);
        }
      }

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 3000000,
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const durationSec = Math.round((Date.now() - recordStartTimeRef.current) / 1000);
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        onMediaCaptured(blob, 'video', durationSec);

        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
        }
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      recordStartTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingTime(0);
      playRecordStart();

      recTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordStartTimeRef.current) / 1000);
        setRecordingTime(elapsed);
      }, 1000);
    } catch (e) {
      console.error('Failed to start recording:', e);
      setIsRecording(false);
    }
  }, [micEnabled, onMediaCaptured, setIsRecording, setRecordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      playRecordStop();
    }
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    setIsRecording(false);
  }, [setIsRecording]);

  triggerRecordRef.current = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
      {/* Hidden Video for MediaPipe Stream */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
        autoPlay
      />

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain pointer-events-auto"
      />

      {/* Photo Flash Overlay */}
      <div
        className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-200 z-40 ${
          flashActive ? 'opacity-95' : 'opacity-0'
        }`}
      />

      {/* Countdown Timer Display */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="w-28 h-28 rounded-full bg-black/60 border-2 border-white/80 backdrop-blur-md flex items-center justify-center animate-ping">
            <span className="text-6xl font-black text-white font-mono">{countdown}</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/90 z-50">
          <div className="max-w-md p-6 bg-red-950/60 border border-red-500/50 rounded-2xl text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Camera Access Required</h3>
            <p className="text-sm text-neutral-300">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Condition Indicator Pill */}
      {playMode === 'frame' && hasStarted && (
        <div className="absolute top-3 left-3 z-30 pointer-events-none flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-lg">
            {conditionRef.current === 'upside_down' && (
              <>
                <span className="text-amber-400">⏳</span>
                <span className="text-amber-200">UPSIDE-DOWN TREND</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 font-mono">
                  CROSSING
                </span>
              </>
            )}
            {conditionRef.current === 'pinch_attached' && (
              <>
                <span className="text-cyan-400">🔒</span>
                <span className="text-cyan-200">PINCH ATTACHED</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-200 font-mono">
                  LOCKED
                </span>
              </>
            )}
            {conditionRef.current === 'apart_quad' && (
              <>
                <span className="text-purple-400">✨</span>
                <span className="text-purple-200">FINGERS APART</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 font-mono">
                  QUAD
                </span>
              </>
            )}
            {conditionRef.current === 'single_l' && (
              <>
                <span className="text-pink-400">👆</span>
                <span className="text-pink-200">1-HAND VIEWFINDER</span>
              </>
            )}
            {conditionRef.current === 'none' && (
              <>
                <span className="text-neutral-400">📐</span>
                <span className="text-neutral-300">Raise Hands to Frame</span>
              </>
            )}
          </div>
          <span className="text-[9px] text-white/50 font-mono pl-2">
            First Finger &amp; Thumb Only
          </span>
        </div>
      )}
    </div>
  );
};
