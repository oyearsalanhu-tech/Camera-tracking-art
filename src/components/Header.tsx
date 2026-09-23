import React from 'react';
import { Volume2, VolumeX, HelpCircle, Film, Sparkles } from 'lucide-react';
import { GestureStatus } from '../types/fingerFrame';

interface HeaderProps {
  status: GestureStatus;
  statusText: string;
  isClosed: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenTutorial: () => void;
  galleryCount: number;
  onOpenGallery: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  statusText,
  isClosed,
  soundEnabled,
  onToggleSound,
  onOpenTutorial,
  galleryCount,
  onOpenGallery,
}) => {
  return (
    <header className="relative z-20 flex items-center justify-between px-4 py-3 sm:px-6 bg-[#0c0b12]/80 backdrop-blur-md border-b border-purple-900/30 select-none">
      {/* Brand title */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-fuchsia-500 p-[2px] shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-[#0d0c14] rounded-[10px] flex items-center justify-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 font-extrabold text-base tracking-tighter">
              FF
            </span>
          </div>
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
            Finger Frame
            <span className="hidden sm:inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Interactive
            </span>
          </h1>
          <p className="hidden md:block text-[11px] text-purple-300/60 font-medium">
            Gesture-controlled optical camera & FX synthesizer
          </p>
        </div>
      </div>

      {/* Center Status Pill */}
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 border ${
            isClosed
              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-lg shadow-emerald-500/20 animate-pulse'
              : status === 'forming'
              ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
              : status === 'one_hand'
              ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
              : 'bg-white/5 border-purple-900/40 text-purple-200/70'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isClosed
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : status === 'forming'
                ? 'bg-amber-400 animate-ping'
                : status === 'one_hand'
                ? 'bg-cyan-400'
                : 'bg-purple-400/50'
            }`}
          />
          <span className="max-w-[140px] sm:max-w-none truncate">{statusText}</span>
          {isClosed && <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          className={`p-2 rounded-lg border transition-all ${
            soundEnabled
              ? 'bg-purple-950/40 border-purple-700/50 text-purple-200 hover:bg-purple-900/50 hover:text-white'
              : 'bg-red-950/20 border-red-900/40 text-red-400/70 hover:bg-red-900/30'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenGallery}
          title="Open Captures Gallery"
          aria-label="Open Captures Gallery"
          className="relative p-2 rounded-lg bg-purple-950/40 border border-purple-700/50 text-purple-200 hover:bg-purple-900/50 hover:text-white transition-all flex items-center gap-1"
        >
          <Film className="w-4 h-4" />
          {galleryCount > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold bg-fuchsia-500 text-white rounded-full">
              {galleryCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenTutorial}
          title="Gesture Guide"
          aria-label="Gesture Guide"
          className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/50 hover:text-white transition-all"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
