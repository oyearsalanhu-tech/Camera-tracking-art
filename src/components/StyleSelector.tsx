import React from 'react';
import { STYLES, PALETTES } from '../utils/stylesAndPalettes';
import { Sparkles, Shuffle } from 'lucide-react';

interface StyleSelectorProps {
  currentStyleIndex: number;
  currentPaletteIndex: number;
  onSelectStyle: (index: number) => void;
  onSelectPalette: (index: number) => void;
  onRandomize: () => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  currentStyleIndex,
  currentPaletteIndex,
  onSelectStyle,
  onSelectPalette,
  onRandomize,
}) => {
  return (
    <div className="w-full flex flex-col gap-2.5 px-3 py-1 select-none">
      {/* Styles chips bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
        <button
          onClick={onRandomize}
          title="Surprise me! Randomize style and palette"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 hover:from-purple-600/50 hover:to-fuchsia-600/50 text-fuchsia-200 border border-fuchsia-500/40 shrink-0 transition-all active:scale-95 shadow-sm"
        >
          <Shuffle className="w-3.5 h-3.5 text-fuchsia-300" />
          <span>Randomize</span>
        </button>

        <div className="h-4 w-[1px] bg-purple-900/50 shrink-0" />

        {STYLES.map((style, idx) => {
          const isSelected = idx === currentStyleIndex;
          return (
            <button
              key={style.id}
              onClick={() => onSelectStyle(idx)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 border ${
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] scale-[1.03]'
                  : 'bg-[#151320] text-purple-200/70 border-purple-900/40 hover:bg-[#1f1c30] hover:text-white hover:border-purple-700/60'
              }`}
            >
              {isSelected && <Sparkles className="inline-block w-3 h-3 mr-1 text-cyan-400" />}
              {style.name}
            </button>
          );
        })}
      </div>

      {/* Palettes circular swatches */}
      <div className="flex items-center justify-center gap-2.5 overflow-x-auto pb-1">
        <span className="text-[11px] font-mono font-medium text-purple-300/60 mr-1 hidden sm:inline">
          PALETTES:
        </span>
        {PALETTES.map((pal, idx) => {
          const isSelected = idx === currentPaletteIndex;
          return (
            <button
              key={pal.id}
              onClick={() => onSelectPalette(idx)}
              title={`${pal.name} (${pal.colors[0]} & ${pal.colors[1]})`}
              aria-label={pal.name}
              className={`relative group p-0.5 rounded-full transition-transform shrink-0 ${
                isSelected
                  ? 'ring-2 ring-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                  : 'hover:scale-105 opacity-80 hover:opacity-100 ring-1 ring-white/20'
              }`}
            >
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden shadow-inner flex"
                style={{
                  background: `linear-gradient(135deg, ${pal.colors[0]} 50%, ${pal.colors[1]} 50%)`,
                }}
              />
              <span className="sr-only">{pal.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
