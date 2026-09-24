import React, { useState } from 'react';
import { CapturedMedia } from '../types/fingerFrame';
import {
  Download,
  Trash2,
  Play,
  X,
  ExternalLink,
  Share2,
  ChevronLeft,
  ChevronRight,
  Film,
  Camera,
} from 'lucide-react';

interface GalleryDrawerProps {
  items: CapturedMedia[];
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  isOpen: boolean;
  onClose: () => void;
  onShareItem?: (item: CapturedMedia) => void;
}

export const GalleryDrawer: React.FC<GalleryDrawerProps> = ({
  items,
  onDeleteItem,
  onClearAll,
  isOpen,
  onClose,
  onShareItem,
}) => {
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const selectedItem = selectedItemIndex !== null ? items[selectedItemIndex] : null;

  const downloadMedia = (item: CapturedMedia, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const a = document.createElement('a');
    a.href = item.url;
    const isMp4 = item.blob.type.includes('mp4');
    const isPng = item.blob.type === 'image/png';
    const ext = item.type === 'photo' ? (isPng ? 'png' : 'jpg') : (isMp4 ? 'mp4' : 'webm');
    a.download = `finger-frame-${item.timestamp}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async (item: CapturedMedia, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onShareItem) {
      onShareItem(item);
      return;
    }

    const isMp4 = item.blob.type.includes('mp4');
    const isPng = item.blob.type === 'image/png';
    const ext = item.type === 'photo' ? (isPng ? 'png' : 'jpg') : (isMp4 ? 'mp4' : 'webm');
    const mime = item.type === 'photo' ? (isPng ? 'image/png' : 'image/jpeg') : (isMp4 ? 'video/mp4' : 'video/webm');
    const file = new File([item.blob], `finger-frame-${item.timestamp}.${ext}`, {
      type: mime,
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Finger Frame Capture',
        });
      } catch {
        downloadMedia(item);
      }
    } else {
      downloadMedia(item);
    }
  };

  const nextItem = () => {
    if (selectedItemIndex !== null && selectedItemIndex < items.length - 1) {
      setSelectedItemIndex(selectedItemIndex + 1);
    }
  };

  const prevItem = () => {
    if (selectedItemIndex !== null && selectedItemIndex > 0) {
      setSelectedItemIndex(selectedItemIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-md transition-opacity select-none">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Drawer Panel */}
      <div className="relative z-10 w-full max-h-[85vh] bg-[#0f0e18] border-t border-purple-800/50 rounded-t-2xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-purple-900/30">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Captures Gallery</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 font-mono">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-red-400/80 hover:text-red-300 hover:bg-red-950/30 px-2.5 py-1 rounded-lg border border-red-900/30 transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gallery Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
          {items.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-purple-300/60 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-center">
                <Camera className="w-7 h-7 text-purple-400" />
              </div>
              <p className="font-semibold text-neutral-200">No photos or videos yet</p>
              <p className="text-xs max-w-sm text-neutral-400">
                Close your hands into a frame and press the White Shutter or Red Record button to capture footage!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemIndex(idx)}
                  className="group relative aspect-video bg-black/60 rounded-xl overflow-hidden border border-purple-900/40 hover:border-cyan-400 cursor-pointer shadow-md hover:shadow-cyan-500/20 transition-all hover:scale-[1.02]"
                >
                  {item.type === 'photo' ? (
                    <img
                      src={item.url}
                      alt={`Capture ${item.id}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-red-600/80 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Badge top-left */}
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 backdrop-blur-sm text-white">
                    {item.type === 'photo' ? 'PHOTO' : `VID ${item.duration ? `${item.duration}s` : ''}`}
                  </div>

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                    <span className="text-[10px] text-neutral-300 font-mono">
                      {item.formattedDate}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleShare(item, e)}
                        title="Share Across Platforms"
                        className="p-1 rounded bg-black/60 text-purple-300 hover:text-white hover:bg-purple-600 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => downloadMedia(item, e)}
                        title="Download"
                        className="p-1 rounded bg-black/60 text-cyan-300 hover:text-white hover:bg-cyan-600 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(item.id);
                        }}
                        title="Delete"
                        className="p-1 rounded bg-black/60 text-red-400 hover:text-white hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Media Player Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-lg animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white z-20">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-bold">
                {selectedItem.type}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {selectedItem.formattedDate}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => handleShare(selectedItem, e)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/40 border border-purple-700/50 hover:bg-purple-800 text-xs font-semibold transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Share</span>
              </button>
              <button
                onClick={(e) => downloadMedia(selectedItem, e)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
              <button
                onClick={() => setSelectedItemIndex(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Media Viewer with Prev/Next buttons */}
          <div className="relative flex-1 flex items-center justify-center max-h-[80vh] my-4">
            {selectedItemIndex !== null && selectedItemIndex > 0 && (
              <button
                onClick={prevItem}
                className="absolute left-2 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {selectedItem.type === 'photo' ? (
              <img
                src={selectedItem.url}
                alt="Selected capture"
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
              />
            ) : (
              <video
                src={selectedItem.url}
                controls
                autoPlay
                loop
                playsInline
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl bg-black"
              />
            )}

            {selectedItemIndex !== null && selectedItemIndex < items.length - 1 && (
              <button
                onClick={nextItem}
                className="absolute right-2 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Bar Info */}
          <div className="flex items-center justify-between text-xs text-neutral-400 px-4">
            <span>
              {selectedItemIndex! + 1} of {items.length}
            </span>
            <button
              onClick={() => {
                onDeleteItem(selectedItem.id);
                setSelectedItemIndex(null);
              }}
              className="flex items-center gap-1 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete capture</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
