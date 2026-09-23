import React from 'react';
import { X, Hand, Sparkles, Video, Camera, Keyboard } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#110f1c] border border-purple-700/50 rounded-2xl p-6 shadow-2xl overflow-hidden text-neutral-100">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-900/40">
          <div className="flex items-center gap-2">
            <Hand className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-extrabold text-white">How to Use Finger Frame</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 py-4 text-sm">
          {/* Step 1: The Gesture */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h4 className="font-bold text-cyan-300 mb-1">Make the Classic Director Frame</h4>
              <p className="text-neutral-300 text-xs leading-relaxed">
                Extend your thumb and index finger on each hand into an <strong>&quot;L&quot; shape</strong>.
                Bring the fingertips together (left index meets right thumb, left thumb meets right index) to enclose a box in front of your camera.
              </p>
            </div>
          </div>

          {/* Step 2: Visual Magic */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30">
            <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 text-fuchsia-300 font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h4 className="font-bold text-fuchsia-300 mb-1">Visual Shaders & Auto-Cycle</h4>
              <p className="text-neutral-300 text-xs leading-relaxed">
                The framed area will immediately glow and animate with dynamic retro shaders (Neon Grid, Halftone, Cyber Plasma, etc.). With <strong>Auto-change on close</strong> active, every time you open and re-close the frame, it cycles to a fresh look!
              </p>
            </div>
          </div>

          {/* Step 3: Capture & Record */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-300 font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <h4 className="font-bold text-red-300 mb-1">Snap Photos & Record Videos</h4>
              <p className="text-neutral-300 text-xs leading-relaxed">
                Click the white shutter button to snap photos (supports 3s/5s countdown timer), or click the red <strong>REC VIDEO</strong> button to record high-fps video clips with optional microphone voice audio!
              </p>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-neutral-300 mb-1">
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span>Keyboard Shortcuts</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-neutral-400 font-mono text-[11px]">
              <div><kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-white/20 text-cyan-300">Space</kbd> : Take Photo</div>
              <div><kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-white/20 text-red-400">R</kbd> : Record Video</div>
              <div><kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-white/20 text-purple-300">F</kbd> : Flip Camera</div>
              <div><kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-white/20 text-emerald-300">C</kbd> : Auto-Cycle</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-black font-extrabold text-sm transition-all shadow-lg active:scale-95"
          >
            Got it, Let&apos;s Frame!
          </button>
        </div>
      </div>
    </div>
  );
};
