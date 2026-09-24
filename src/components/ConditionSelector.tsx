import React from 'react';
import { FrameCondition } from '../types/fingerFrame';
import { Sparkles, Lock, ArrowDownUp, RefreshCw } from 'lucide-react';

interface ConditionSelectorProps {
  conditionMode: 'auto' | 'upside_down' | 'apart_quad' | 'pinch_attached';
  onSelectConditionMode: (mode: 'auto' | 'upside_down' | 'apart_quad' | 'pinch_attached') => void;
  activeCondition: FrameCondition;
}

export const ConditionSelector: React.FC<ConditionSelectorProps> = ({
  conditionMode,
  onSelectConditionMode,
  activeCondition,
}) => {
  const options: Array<{
    id: 'auto' | 'upside_down' | 'apart_quad' | 'pinch_attached';
    label: string;
    icon: React.ReactNode;
    desc: string;
    badge?: string;
  }> = [
    {
      id: 'auto',
      label: 'Auto Condition',
      icon: <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />,
      desc: 'Smart real-time gesture switching (Upside Down / Attached / Apart)',
      badge: 'SMART',
    },
    {
      id: 'upside_down',
      label: 'Upside Down',
      icon: <ArrowDownUp className="w-3.5 h-3.5 text-amber-400" />,
      desc: 'Viral Short trend: one hand inverted with crossing dotted hourglass',
      badge: 'VIRAL',
    },
    {
      id: 'pinch_attached',
      label: 'Pinch Attached',
      icon: <Lock className="w-3.5 h-3.5 text-rose-400" />,
      desc: 'Fingers touching/pinched from the two hands to lock frame',
      badge: 'LOCKED',
    },
    {
      id: 'apart_quad',
      label: 'Fingers Apart',
      icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
      desc: 'Hands separated upright framing face with dotted bounds',
    },
  ];

  return (
    <div className="w-full flex items-center justify-center px-3 py-1 bg-[#100d1c]/80 border-b border-purple-900/30 overflow-x-auto no-scrollbar gap-1.5">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mr-1 hidden sm:inline">
          Condition:
        </span>
        {options.map((opt) => {
          const isSelected = conditionMode === opt.id;
          const isLive = conditionMode === 'auto' && activeCondition === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => onSelectConditionMode(opt.id)}
              title={opt.desc}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 border cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                  : isLive
                  ? 'bg-amber-500/15 text-amber-200 border-amber-400/40'
                  : 'bg-[#151224] text-neutral-300 hover:text-white border-purple-900/40 hover:bg-[#1f1a35]'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
              {opt.badge && (
                <span className="text-[8px] font-extrabold px-1 py-0.2 rounded bg-white/10 text-white font-mono">
                  {opt.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
