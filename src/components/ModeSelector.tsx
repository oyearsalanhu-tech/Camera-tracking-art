import React from 'react';
import { PlayMode } from '../types/fingerFrame';
import { Flower2, Frame, Star, Heart, Sparkles, Trash2, Zap } from 'lucide-react';

interface ModeSelectorProps {
  playMode: PlayMode;
  onSelectMode: (mode: PlayMode) => void;
  onClearParticles: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  playMode,
  onSelectMode,
  onClearParticles,
}) => {
  const modes: Array<{
    id: PlayMode;
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
    badge?: string;
  }> = [
    {
      id: 'frame',
      label: 'Finger Frame',
      icon: <Frame className="w-4 h-4 text-cyan-400" />,
      color: 'from-cyan-500/25 to-fuchsia-500/25 text-cyan-200 border-cyan-400',
      description: 'Hands apart to form floating 3D wireframe / neon screen (Reel)',
      badge: 'REEL FOCUS',
    },
    {
      id: 'wand',
      label: 'Flower Wand',
      icon: <Flower2 className="w-4 h-4 text-pink-400" />,
      color: 'from-pink-500/20 to-rose-500/20 text-pink-300 border-pink-400',
      description: 'Draw with your fingertip to bloom living flowers',
    },
    {
      id: 'stars',
      label: 'Magic Stars',
      icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />,
      color: 'from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-400',
      description: 'Spawn shimmering starlight constellations',
    },
    {
      id: 'hearts',
      label: 'Heart Sparks',
      icon: <Heart className="w-4 h-4 text-red-400 fill-red-400/20" />,
      color: 'from-red-500/20 to-rose-500/20 text-rose-300 border-rose-400',
      description: 'Finger wand creates floating neon hearts',
    },
    {
      id: 'bubbles',
      label: 'Bubble Wand',
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-400',
      description: 'Blow floating iridescent soap bubbles',
    },
  ];

  return (
    <div className="w-full flex items-center justify-between px-3 pt-2 pb-1 gap-2 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 shrink-0">
        {modes.map((mode) => {
          const isSelected = playMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              title={mode.description}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                isSelected
                  ? `bg-gradient-to-r ${mode.color} shadow-[0_0_15px_rgba(0,240,255,0.25)] scale-[1.03]`
                  : 'bg-[#141220] text-purple-200/60 border-purple-900/40 hover:bg-[#1e1a30] hover:text-white hover:border-purple-700/60'
              }`}
            >
              {mode.icon}
              <span>{mode.label}</span>
              {mode.badge && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 tracking-wider">
                  {mode.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {playMode !== 'frame' && (
        <button
          onClick={onClearParticles}
          title="Clear all blooming flowers and particles"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-950/30 text-red-300 border border-red-800/40 hover:bg-red-900/50 transition-all shrink-0 active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden sm:inline">Clear Canvas</span>
        </button>
      )}
    </div>
  );
};
