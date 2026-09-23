import React from 'react';
import { X, Flower2, Wand2, Star, Frame, Camera, Video, Sparkles } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#110f1c] border border-purple-700/50 rounded-2xl p-6 shadow-2xl overflow-hidden text-neutral-100 max-h-[90vh] overflow-y-auto">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-900/40">
          <div className="flex items-center gap-2">
            <Flower2 className="w-5 h-5 text-pink-400" />
            <h3 className="text-lg font-extrabold text-white">How to Use Flower Wand Garden</h3>
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
          {/* Step 1: Wand Mode */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-300 font-bold flex items-center justify-center shrink-0">
              🌸
            </div>
            <div>
              <h4 className="font-bold text-pink-300 mb-1">Flower Wand & Gestures</h4>
              <p className="text-neutral-300 text-xs leading-relaxed">
                Hold up your hand and point your <strong>index finger</strong>. As you move it across the camera screen like a magic wand, living flowers, stars, or bubbles will bloom in your path with magical chimes! You can use both hands simultaneously.
              </p>
            </div>
          </div>

          {/* Step 2: Finger Frame Mode */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">
              📐
            </div>
            <div>
              <h4 className="font-bold text-cyan-300 mb-1">Director Finger Frame</h4>
              <p className="text-neutral-300 text-xs leading-relaxed">
                Switch to <strong>Finger Frame</strong> mode and make an &quot;L&quot; shape with both hands. Bring your fingertips together to form a rectangle to see dynamic shaders (Neon Grid, Halftone, Cyber Plasma).
              </p>
            </div>
          </div>

          {/* Step 3: Capture & Record */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-300 font-bold flex items-center justify-center shrink-0">
              🎥
            </div>
            <div>
              <h4 className="font-bold text-red-300 mb-1">Snap Photos & Record Videos</h4>
              <p className="text-neutral-300 text-xs leading-relaxed">
                Click the white shutter button (or press <strong>Spacebar</strong>) to snap high-res photos with a countdown timer. Click the red <strong>REC VIDEO</strong> button (or press <strong>R</strong>) to record video clips with your microphone audio!
              </p>
            </div>
          </div>

          {/* Step 4: Palettes & Styles */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800/30">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-300 font-bold flex items-center justify-center shrink-0">
              ✨
            </div>
            <div>
              <h4 className="font-bold text-yellow-300 mb-1">Palettes & Shapes</h4>
              <p className="text-neutral-300 text-xs leading-relaxed">
                Try the different modes: <strong>Flower Garden</strong>, <strong>Magic Stars</strong>, <strong>Heart Sparks</strong>, and <strong>Bubble Wand</strong>. Customize flower and trail colors with the palette swatches!
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-purple-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold text-xs hover:opacity-95 transition-opacity"
          >
            Got it, let&apos;s bloom!
          </button>
        </div>
      </div>
    </div>
  );
};
