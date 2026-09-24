import React, { useState } from 'react';
import {
  RotateCcw,
  Camera,
  Video,
  Square,
  Mic,
  MicOff,
  Clock,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface ControlsBarProps {
  onFlipCamera: () => void;
  onTakePhoto: () => void;
  isRecording: boolean;
  recordingTime: number; // in seconds
  onStartRecording: () => void;
  onStopRecording: () => void;
  autoCycle: boolean;
  onToggleAutoCycle: () => void;
  showSkeleton: boolean;
  onToggleSkeleton: () => void;
  micEnabled: boolean;
  onToggleMic: () => void;
  photoTimer: number; // 0, 3, 5 seconds
  onSetPhotoTimer: (timer: number) => void;
  isCountingDown: boolean;
  disabled?: boolean;
  hdEnhance?: boolean;
  onToggleHdEnhance?: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  onFlipCamera,
  onTakePhoto,
  isRecording,
  recordingTime,
  onStartRecording,
  onStopRecording,
  autoCycle,
  onToggleAutoCycle,
  showSkeleton,
  onToggleSkeleton,
  micEnabled,
  onToggleMic,
  photoTimer,
  onSetPhotoTimer,
  isCountingDown,
  disabled = false,
  hdEnhance = true,
  onToggleHdEnhance,
}) => {
  const [showTimerMenu, setShowTimerMenu] = useState(false);

  // Format recording seconds into MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col items-center gap-3 py-2 px-4 select-none">
      {/* Primary Actions Row */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 w-full max-w-xl">
        {/* Flip camera */}
        <button
          onClick={onFlipCamera}
          disabled={disabled || isRecording}
          title="Switch front/back camera (Key: F)"
          aria-label="Switch camera"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#181525] border border-purple-800/40 text-purple-200 hover:text-white hover:bg-purple-900/40 hover:border-purple-600 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-95"
        >
          <RotateCcw className="w-5 h-5 text-purple-300" />
        </button>

        {/* Photo snapshot group with timer */}
        <div className="relative flex items-center">
          <button
            onClick={onTakePhoto}
            disabled={disabled || isRecording || isCountingDown}
            title={
              photoTimer > 0
                ? `Take photo with ${photoTimer}s timer (Spacebar)`
                : 'Take photo instantly (Spacebar)'
            }
            aria-label="Take photo"
            className="group relative w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white border-4 border-[#322d48] outline-2 outline-white/80 outline-offset-[-6px] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-white to-neutral-200 group-hover:from-cyan-100 group-hover:to-white flex items-center justify-center transition-colors">
              <Camera className="w-6 h-6 text-gray-800 group-hover:text-cyan-800 transition-colors" />
            </div>
            {photoTimer > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500 text-black shadow">
                {photoTimer}s
              </span>
            )}
          </button>

          {/* Timer dropdown button */}
          <button
            onClick={() => setShowTimerMenu(!showTimerMenu)}
            disabled={disabled || isRecording}
            title="Snapshot countdown timer"
            className="absolute -bottom-2 right-0 p-1.5 rounded-full bg-[#1a172a] border border-purple-700/60 text-purple-200 hover:text-white hover:bg-purple-800/60 shadow-lg text-[10px] font-bold flex items-center gap-0.5"
          >
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{photoTimer ? `${photoTimer}s` : '0s'}</span>
          </button>

          {/* Timer menu popover */}
          {showTimerMenu && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-[#1b172d] border border-purple-600/60 rounded-xl p-1 flex gap-1 shadow-2xl z-30 animate-in fade-in zoom-in-95">
              {[0, 3, 5].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    onSetPhotoTimer(t);
                    setShowTimerMenu(false);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all ${
                    photoTimer === t
                      ? 'bg-cyan-500 text-black shadow'
                      : 'text-purple-200 hover:bg-purple-800/40'
                  }`}
                >
                  {t === 0 ? 'Off' : `${t}s`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Video Recording Button (Highlighted Feature!) */}
        <div className="flex flex-col items-center">
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={disabled || isCountingDown}
            title={
              isRecording
                ? 'Stop recording video (Key: R)'
                : 'Start recording video clip (Key: R)'
            }
            aria-label={isRecording ? 'Stop recording video' : 'Start recording video'}
            className={`group relative w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 transition-all duration-300 flex items-center justify-center shadow-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
              isRecording
                ? 'bg-red-500/20 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)] animate-pulse'
                : 'bg-red-600/30 border-red-900/80 hover:border-red-500 hover:bg-red-600/40'
            }`}
          >
            {isRecording ? (
              <div className="w-6 h-6 rounded-md bg-red-500 flex items-center justify-center shadow-md animate-pulse">
                <Square className="w-4 h-4 text-white fill-white" />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 group-hover:scale-105 flex items-center justify-center shadow-lg transition-transform">
                <Video className="w-5 h-5 text-white" />
              </div>
            )}

            {/* Glowing recording indicator ring */}
            {isRecording && (
              <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-75" />
            )}
          </button>
          
          <div className="text-[10px] uppercase font-bold tracking-wider text-red-400 mt-1 flex items-center gap-1">
            {isRecording ? (
              <span className="flex items-center gap-1 font-mono text-xs text-red-300 font-extrabold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                {formatTime(recordingTime)}
              </span>
            ) : (
              <span>REC VIDEO</span>
            )}
          </div>
        </div>

        {/* Microphone audio capture toggle */}
        <button
          onClick={onToggleMic}
          disabled={disabled || isRecording}
          title={
            micEnabled
              ? 'Microphone is ON for video recordings'
              : 'Microphone is MUTED for video recordings'
          }
          aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border transition-all flex items-center justify-center disabled:opacity-40 shadow-md active:scale-95 ${
            micEnabled
              ? 'bg-cyan-950/40 border-cyan-600/60 text-cyan-300 hover:bg-cyan-900/50'
              : 'bg-[#181525] border-purple-800/40 text-purple-400 hover:bg-purple-900/30'
          }`}
        >
          {micEnabled ? <Mic className="w-5 h-5 text-cyan-300" /> : <MicOff className="w-5 h-5 text-purple-400" />}
        </button>
      </div>

      {/* Auxiliary Settings Bar */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-purple-300/80 mt-1">
        {/* Auto-cycle on close */}
        <label className="flex items-center gap-2 cursor-pointer hover:text-white select-none transition-colors">
          <input
            type="checkbox"
            checked={autoCycle}
            onChange={onToggleAutoCycle}
            className="w-4 h-4 rounded border-purple-700 bg-purple-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 focus:ring-1 cursor-pointer accent-cyan-400"
          />
          <span className="flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Auto-change on frame close
          </span>
        </label>

        {/* HD Video Enhance & Anti-Glitch Toggle */}
        {onToggleHdEnhance && (
          <button
            onClick={onToggleHdEnhance}
            title={hdEnhance ? 'HD Clarity & Anti-Glitch ON (Enhanced 6Mbps, Vibrant contrast, Smooth FPS)' : 'HD Clarity is OFF (Standard)'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
              hdEnhance
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20'
                : 'bg-transparent border-purple-900/40 text-purple-400/70 hover:text-purple-300 hover:border-purple-700'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${hdEnhance ? 'text-cyan-300 animate-pulse' : 'text-purple-400/60'}`} />
            <span className="font-semibold text-[11px]">{hdEnhance ? 'HD Enhance ON' : 'HD Enhance OFF'}</span>
          </button>
        )}

        {/* Hand Landmark Overlay Toggle */}
        <button
          onClick={onToggleSkeleton}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
            showSkeleton
              ? 'bg-purple-600/20 border-purple-500 text-purple-200'
              : 'bg-transparent border-purple-900/40 text-purple-400/70 hover:text-purple-300 hover:border-purple-700'
          }`}
        >
          {showSkeleton ? (
            <>
              <Eye className="w-3.5 h-3.5 text-purple-400" />
              <span>Skeleton HUD ON</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Skeleton HUD OFF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
