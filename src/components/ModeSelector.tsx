import React from 'react';
import { PlayMode } from '../types/fingerFrame';
import { Flower2, Frame, Star, Heart, Sparkles, Wand2 } from 'lucide-react';

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
  }> = [
    {
      id: 'wand',
      label: 'Flower Garden',
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
    {
      id: 'frame',
      label: 'Finger Frame',
      icon: <Frame className="w-4 h-4 text-purple-400" />,
      color: 'from-purple-500/20 to-fuchsia-500/20 text-purple-300 border-purple-400',
      description: 'Connect two hands into an L-frame',
    },
  ];

  return (
    <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 select-none">
      {/* Mode selection buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[11px] font-mono font-bold text-purple-300/60 uppercase mr-1 hidden sm:inline">
          INTERACTION:
        </span>
        {modes.map((m) => {
          const isSelected = playMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMode(m.id)}
              title={m.description}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                isSelected
                  ? `bg-gradient-to-r ${m.color} shadow-md shadow-pink-500/10 scale-105`
                  : 'bg-[#151320] text-purple-200/60 border-purple-900/40 hover:bg-[#1f1c30] hover:text-white'
              }`}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Clear Garden Button (for wand modes) */}
      {playMode !== 'frame' && (
        <button
          onClick={onClearParticles}
          title="Clear all blooming flowers and sparkles"
          className="text-[11px] font-medium text-purple-400 hover:text-pink-300 hover:bg-pink-950/30 px-2.5 py-1 rounded-full border border-purple-800/40 shrink-0 transition-colors"
        >
          Clear Canvas
        </button>
      )}
    </div>
  );
};
