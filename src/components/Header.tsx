import React from 'react';
import { Volume2, VolumeX, HelpCircle, Film, Sparkles, Flower2, Wand2 } from 'lucide-react';
import { GestureStatus, PlayMode } from '../types/fingerFrame';

interface HeaderProps {
  status: GestureStatus;
  statusText: string;
  isClosed: boolean;
  playMode: PlayMode;
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
  playMode,
  soundEnabled,
  onToggleSound,
  onOpenTutorial,
  galleryCount,
  onOpenGallery,
}) => {
  return (
    <header className="relative z-20 flex items-center justify-between px-3 py-2.5 sm:px-6 bg-[#0c0b12]/85 backdrop-blur-md border-b border-purple-900/30 select-none">
      {/* Brand title */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 p-[2px] shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-[#0d0c14] rounded-[10px] flex items-center justify-center">
            {playMode === 'frame' ? (
              <Sparkles className="w-4 h-4 text-cyan-400" />
            ) : playMode === 'wand' ? (
              <Flower2 className="w-4 h-4 text-pink-400" />
            ) : (
              <Wand2 className="w-4 h-4 text-cyan-400" />
            )}
          </div>
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
            <span>Finger Frame Lens</span>
            <span className="hidden sm:inline-flex items-center text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
              Reel Focus
            </span>
          </h1>
          <p className="hidden md:block text-[11px] text-purple-300/60 font-medium">
            Hands apart finger tracking • 3D wireframe grid & neon contour
          </p>
        </div>
      </div>

      {/* Center Status Pill */}
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 border ${
            status === 'wand_active'
              ? 'bg-pink-500/20 border-pink-400/60 text-pink-300 shadow-md shadow-pink-500/20 animate-pulse'
              : isClosed
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
              status === 'wand_active'
                ? 'bg-pink-400 animate-ping'
                : isClosed
                ? 'bg-emerald-400 animate-ping'
                : status === 'forming'
                ? 'bg-amber-400'
                : status === 'one_hand'
                ? 'bg-cyan-400'
                : 'bg-purple-400/50'
            }`}
          />
          <span className="truncate max-w-[140px] sm:max-w-none">{statusText}</span>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Audio Mute/Unmute */}
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          className="p-2 rounded-full bg-[#181525] border border-purple-800/40 hover:bg-purple-900/40 text-purple-300 transition-colors"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-cyan-300" />
          ) : (
            <VolumeX className="w-4 h-4 text-neutral-400" />
          )}
        </button>

        {/* Gallery Drawer Button */}
        <button
          onClick={onOpenGallery}
          title="Open Captures Gallery"
          aria-label="Open Captures Gallery"
          className="relative p-2 rounded-full bg-[#181525] border border-purple-800/40 hover:bg-purple-900/40 text-purple-300 transition-colors"
        >
          <Film className="w-4 h-4 text-purple-300" />
          {galleryCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-500 text-black text-[10px] font-extrabold shadow-sm">
              {galleryCount}
            </span>
          )}
        </button>

        {/* How to Guide */}
        <button
          onClick={onOpenTutorial}
          title="How to play"
          aria-label="How to play"
          className="p-2 rounded-full bg-[#181525] border border-purple-800/40 hover:bg-purple-900/40 text-purple-300 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
