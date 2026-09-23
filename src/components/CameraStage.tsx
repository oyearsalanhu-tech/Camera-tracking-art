import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Point, Bounds, ColorPalette, FrameStyle, GestureStatus } from '../types/fingerFrame';
import { playShutterSound, playFrameLockSound, playRecordStart, playRecordStop, playCountdownTick } from '../utils/audioSynth';
import confetti from 'canvas-confetti';
import { Camera, AlertCircle, Video as VideoIcon, RefreshCw, Zap } from 'lucide-react';

// Declarations for MediaPipe Hands injected via script tag
declare global {
  interface Window {
    Hands: new (config: { locateFile: (file: string) => string }) => {
      setOptions: (options: {
        maxNumHands?: number;
        modelComplexity?: number;
        minDetectionConfidence?: number;
        minTrackingConfidence?: number;
      }) => void;
      onResults: (callback: (results: MediaPipeHandsResults) => void) => void;
      send: (data: { image: HTMLVideoElement }) => Promise<void>;
      close?: () => void;
    };
  }
}

interface MediaPipeHandsResults {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>;
}

interface CameraStageProps {
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
  onStageReady?: () => void;
  triggerSnapRef: React.MutableRefObject<(() => void) | null>;
  triggerRecordRef: React.MutableRefObject<(() => void) | null>;
}

export const CameraStage: React.FC<CameraStageProps> = ({
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

  // Tracking state refs for render loop
  const quadRef = useRef<Point[] | null>(null);
  const isClosedRef = useRef<boolean>(false);
  const lastHandsRef = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const missingRef = useRef<number>(0);
  const busyRef = useRef<boolean>(false);
  const reqAnimRef = useRef<number | null>(null);
  const fpsRef = useRef<number>(60);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // Store props in refs so render loop always has latest without re-subscribing
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

  // Initialize MediaPipe Hands
  const handsInstanceRef = useRef<{
    send: (data: { image: HTMLVideoElement }) => Promise<void>;
  } | null>(null);

  useEffect(() => {
    let hands: any = null;
    const initHands = () => {
      if (typeof window !== 'undefined' && window.Hands) {
        hands = new window.Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.5,
        });
        hands.onResults((results: MediaPipeHandsResults) => {
          lastHandsRef.current = results.multiHandLandmarks || [];
          solveHands();
        });
        handsInstanceRef.current = hands;
      }
    };

    if (window.Hands) {
      initHands();
    } else {
      // Poll briefly for script loading
      const interval = setInterval(() => {
        if (window.Hands) {
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

  // Hand gesture solver algorithm
  const solveHands = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const hands = lastHandsRef.current;
    if (hands.length === 0) {
      missingRef.current++;
      if (missingRef.current > 4) {
        setClosedState(false, 'no_hands', 'Show both hands');
      }
      return;
    }

    if (hands.length === 1) {
      missingRef.current++;
      if (missingRef.current > 4) {
        setClosedState(false, 'one_hand', 'Show second hand');
      }
      return;
    }

    missingRef.current = 0;

    // Coordinate mapping
    const isUserFacing = facingRef.current === 'user';
    const mx = (l: { x: number }) => (isUserFacing ? 1 - l.x : l.x) * canvas.width;
    const my = (l: { y: number }) => l.y * canvas.height;
    const P = (l: { x: number; y: number }) => ({ x: mx(l), y: my(l) });
    const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

    // Landmark 2: thumb_mcp, 5: index_finger_mcp, 4: thumb_tip, 8: index_finger_tip
    const [A, B] = hands.map((h) => ({
      v: mid(P(h[2]), P(h[5])), // corner of L
      t: P(h[4]), // thumb tip
      i: P(h[8]), // index tip
    }));

    const diag = dist(A.v, B.v);

    // Pair tips between hand A and hand B
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

    // Frame condition: hands sufficiently separated, fingertips touching or close
    const isSeparated = diag > canvas.width * 0.14;
    const isTouching = gap < diag * 0.48;
    const isFrameClosed = isSeparated && isTouching;

    // Smooth corner points with lerp
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
  }, []);

  const setClosedState = (
    closed: boolean,
    status: GestureStatus,
    statusText: string
  ) => {
    if (closed && !isClosedRef.current) {
      // Just locked!
      playFrameLockSound();
      if (autoCycleRef.current) {
        onCycleNextRef.current();
      }
    }
    isClosedRef.current = closed;
    onStatusChange(status, statusText, closed);
  };

  // Render animation frame loop
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

      // Adjust canvas internal dimensions to match video stream
      if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) {
        reqAnimRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw base video feed (mirrored for user-facing camera)
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      if (facingRef.current === 'user') {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      const quad = quadRef.current;
      const isClosed = isClosedRef.current;
      const palette = paletteRef.current;
      const style = styleRef.current;

      // 2. Draw Hand Landmark Skeleton HUD if enabled
      if (showSkeletonRef.current && lastHandsRef.current.length > 0) {
        const isUserFacing = facingRef.current === 'user';
        const mx = (l: { x: number }) => (isUserFacing ? 1 - l.x : l.x) * w;
        const my = (l: { y: number }) => l.y * h;

        ctx.save();
        lastHandsRef.current.forEach((hand) => {
          // Connect joints
          const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8], // Index
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

          // Draw neon joint dots
          hand.forEach((lm, idx) => {
            const x = mx(lm);
            const y = my(lm);
            ctx.beginPath();
            ctx.arc(x, y, idx === 4 || idx === 8 ? 6 : 3.5, 0, Math.PI * 2);
            ctx.fillStyle = idx === 4 || idx === 8 ? palette.colors[1] : palette.colors[0];
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
          });
        });
        ctx.restore();
      }

      // 3. Render Framed Area with Visual Shaders & Glow Outline
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
          // Fallback if custom render encounters error
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

        // Viewfinder corner marks on quad corners
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        quad.forEach((q, idx) => {
          const size = 16;
          ctx.beginPath();
          ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = palette.colors[1];
          ctx.fill();
        });
        ctx.restore();
      }

      // 4. Send video to MediaPipe if not busy
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

  // Start WebRTC Camera
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
      setClosedState(false, 'no_hands', 'Show both hands');

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

    // Trigger flash animation
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 350);

    // Audio click
    playShutterSound();

    // Confetti celebration
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.8 },
      });
    } catch {
      // Ignore
    }

    // Export canvas as PNG
    canvas.toBlob((blob) => {
      if (blob) {
        onMediaCaptured(blob, 'photo');
      }
    }, 'image/png');
  }, [onMediaCaptured]);

  // Photo snap trigger (with optional countdown)
  const takePhoto = useCallback(() => {
    if (countdown !== null) return; // already counting down

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
      // Capture canvas stream at 30fps
      const canvasStream = canvas.captureStream(30);

      // If mic is enabled, get audio track and combine
      if (micEnabled) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          const audioTrack = micStream.getAudioTracks()[0];
          if (audioTrack) {
            canvasStream.addTrack(audioTrack);
          }
        } catch (audioErr) {
          console.warn('Microphone permission denied or not available, recording video only.');
        }
      }

      // Check supported MIME types
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

        // Release mic stream if held
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
        }

        setIsRecording(false);
        setRecordingTime(0);
        playRecordStop();

        // Confetti for video finish
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

      recorder.start(250); // collect chunks every 250ms
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

  // Video Recording: Stop Recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Expose triggers to parent via refs
  useEffect(() => {
    triggerSnapRef.current = takePhoto;
    triggerRecordRef.current = isRecording ? stopRecording : startRecording;
  }, [takePhoto, isRecording, stopRecording, startRecording, triggerSnapRef, triggerRecordRef]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input
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
      {/* Hidden processing video element */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* Main Canvas Display with glowing frame border */}
      <div className="relative max-h-full max-w-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl bg-black border border-purple-900/40">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="max-w-full max-h-[66vh] sm:max-h-[70vh] w-auto h-auto object-contain block rounded-2xl"
        />

        {/* Viewfinder Decorative Corner Reticles */}
        {hasStarted && (
          <div className="absolute inset-4 pointer-events-none opacity-40">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400" />
          </div>
        )}

        {/* Shutter Flash Animation */}
        <div
          className={`absolute inset-0 bg-white pointer-events-none transition-opacity ${
            flashActive ? 'flash-active' : 'opacity-0'
          }`}
        />

        {/* Countdown Number Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
            <div className="text-8xl sm:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-fuchsia-400 animate-bounce drop-shadow-[0_10px_20px_rgba(0,240,255,0.6)]">
              {countdown}
            </div>
          </div>
        )}

        {/* Live Recording HUD Badge */}
        {isRecording && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-mono font-bold shadow-lg backdrop-blur-sm border border-red-400/50 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>REC</span>
            <span>{formatRecTime(recordingTime)}</span>
          </div>
        )}

        {/* FPS & Shader Badge (bottom left) */}
        {hasStarted && (
          <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-mono text-purple-200/80">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>{fpsRef.current} FPS</span>
            <span>•</span>
            <span className="text-cyan-300">{currentStyle.name}</span>
          </div>
        )}

        {/* Camera Start Screen / Hero Overlay */}
        {!hasStarted && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-[#0c0b14]/95 text-center backdrop-blur-xl">
            {/* Glowing Logo Icon */}
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 via-purple-600 to-fuchsia-500 p-[2px] shadow-[0_0_40px_rgba(6,182,212,0.4)] animate-pulse">
                <div className="w-full h-full bg-[#100e1a] rounded-[22px] flex items-center justify-center">
                  <Camera className="w-10 h-10 text-cyan-400" />
                </div>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Frame the World with Your Hands
            </h2>

            <p className="max-w-md text-sm text-purple-200/80 leading-relaxed mb-6">
              Make an <strong>&quot;L&quot;</strong> with each hand and touch your fingertips together.
              Watch dynamic synthwave visual shaders react instantly, record glowing video clips, and snap photos!
            </p>

            <button
              onClick={openCamera}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold text-base transition-all shadow-[0_0_25px_rgba(6,182,212,0.5)] active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Camera className="w-5 h-5 text-black" />
              <span>Start Camera</span>
            </button>

            {errorMessage && (
              <div className="mt-4 flex items-center gap-2 text-xs text-red-300 bg-red-950/40 border border-red-800/50 px-3 py-2 rounded-lg max-w-sm">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="mt-6 flex items-center gap-4 text-xs text-purple-400/60 font-medium">
              <span className="flex items-center gap-1">🔒 Local client-side processing</span>
              <span>•</span>
              <span className="flex items-center gap-1">🎥 HD video & photo capture</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
