import React from 'react';
import { X, Frame, Camera, Video, Sparkles, Zap, Flower2 } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#110f1c] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl overflow-hidden text-neutral-100 max-h-[90vh] overflow-y-auto">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-900/40">
          <div className="flex items-center gap-2">
            <Frame className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-extrabold text-white">How to Use Reel Finger Frame</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-3.5 py-4 text-sm">
          {/* Feature 1: Viral Short Upside-Down Trend */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 shadow-inner">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-base">
              ⏳
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <h4 className="font-extrabold text-amber-300">Viral Upside-Down Trend (YouTube Short Effect)</h4>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200">
                  VIRAL SHORT
                </span>
              </div>
              <p className="text-neutral-300 text-xs leading-relaxed">
                Hold your <strong>left hand upright</strong> (index finger pointing up) and turn your <strong>right hand upside-down</strong> (index pointing down, thumb up). Focuses <em>only on the first finger and thumb</em> to create the exact viral crossing hourglass dotted frame with illuminated fingertip dots!
              </p>
            </div>
          </div>

          {/* Feature 2: Pinch Attached Frame */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-cyan-950/30 border border-cyan-700/40">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-base">
              🔒
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <h4 className="font-bold text-cyan-300">Pinch Attached Frame (Fingers Touching)</h4>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-200">
                  SNAP LOCK
                </span>
              </div>
              <p className="text-neutral-300 text-xs leading-relaxed">
                Bring your hands together so the <strong>index and thumb fingers touch or pinch</strong>. The frame automatically snaps into a solid, vibrant glowing laser frame with lock audio feedback!
              </p>
            </div>
          </div>

          {/* Feature 3: Fingers Apart */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center shrink-0 text-base">
              ✨
            </div>
            <div>
              <h4 className="font-bold text-purple-300 mb-1">Fingers Apart Framing (Instagram Reel Effect)</h4>
              <p className="text-neutral-300 text-xs leading-relaxed">
                Raise both hands in &quot;L&quot; shapes with your <strong>fingers separated</strong> away from each other. The rectangular viewfinder tracks your first finger and thumb with dotted lines.
              </p>
            </div>
          </div>

          {/* Feature 4: Capture & Record */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30">
            <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-300 font-bold flex items-center justify-center shrink-0 text-base">
              🎥
            </div>
            <div>
              <h4 className="font-bold text-red-300 mb-1">Snap Photos &amp; Record HD Videos</h4>
              <p className="text-neutral-300 text-xs leading-relaxed">
                Click the white shutter button (or press <strong>Spacebar</strong>) to capture high-res photos. Click the red <strong>REC VIDEO</strong> button (or press <strong>R</strong>) to record video clips with your microphone audio!
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-purple-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 text-white font-extrabold text-xs hover:opacity-95 transition-opacity cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            Got it, let&apos;s frame!
          </button>
        </div>
      </div>
    </div>
  );
};
