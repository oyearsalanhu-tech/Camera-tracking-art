import React, { useState } from 'react';
import { CapturedMedia } from '../types/fingerFrame';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  MessageCircle,
  Send,
  ExternalLink,
  Sparkles,
  Smartphone,
  Mail,
  Film,
  Camera,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface ShareModalProps {
  media: CapturedMedia | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (item: CapturedMedia) => void;
}

// Generate universally compatible file with exact matching MIME and extension
function getAccurateMediaFile(media: CapturedMedia): { file: File; ext: string; mime: string } {
  if (media.type === 'photo') {
    const isPng = media.blob.type === 'image/png';
    const mime = isPng ? 'image/png' : 'image/jpeg';
    const ext = isPng ? 'png' : 'jpg';
    const file = new File([media.blob], `finger-frame-${media.timestamp}.${ext}`, {
      type: mime,
    });
    return { file, ext, mime };
  } else {
    const isMp4 = media.blob.type.includes('mp4');
    const mime = isMp4 ? 'video/mp4' : 'video/webm';
    const ext = isMp4 ? 'mp4' : 'webm';
    const file = new File([media.blob], `finger-frame-${media.timestamp}.${ext}`, {
      type: mime,
    });
    return { file, ext, mime };
  }
}

export const ShareModal: React.FC<ShareModalProps> = ({
  media,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen || !media) return null;

  const defaultCaption = `Check out this viral finger frame camera capture! 📐✨ #FingerFrame #CreativeLens #ViralTrend`;
  const { file, ext, mime } = getAccurateMediaFile(media);
  const isVideo = media.type === 'video';

  // Native Web Share API (Mobile OS Share Sheet - WhatsApp, Instagram, Messages, AirDrop, etc.)
  const handleNativeShare = async () => {
    setIsSharing(true);
    try {
      // NOTE: On mobile (Android & iOS), passing ONLY files without conflicting text/urls
      // prevents WhatsApp and Instagram from throwing "Can't compress this file or can't be shared"
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Finger Frame',
        });
        setCopiedStatus('Shared successfully!');
        setTimeout(() => setCopiedStatus(null), 3000);
      } else {
        // Fallback: download media to device photos and copy caption
        onDownload(media);
        await navigator.clipboard.writeText(defaultCaption);
        setCopiedStatus('Saved to device photos/files & caption copied!');
        setTimeout(() => setCopiedStatus(null), 3500);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Automatically save to device so user can pick it from gallery without compression error
        onDownload(media);
        setCopiedStatus('Saved to device! Pick from gallery in WhatsApp / Instagram');
        setTimeout(() => setCopiedStatus(null), 4000);
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Direct Clipboard Copy (for Discord, Slack, WhatsApp Web, Messages)
  const handleCopyImageToClipboard = async () => {
    try {
      if (media.type === 'photo') {
        // Standard PNG blob for clipboard
        let pngBlob = media.blob;
        if (media.blob.type !== 'image/png') {
          const img = new Image();
          img.src = media.url;
          await new Promise((res) => {
            img.onload = res;
          });

          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 1280;
          canvas.height = img.naturalHeight || 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            pngBlob = await new Promise<Blob>((res) => {
              canvas.toBlob((b) => res(b || media.blob), 'image/png');
            });
          }
        }

        if (navigator.clipboard && (window as any).ClipboardItem) {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({
              'image/png': pngBlob,
            }),
          ]);
          setCopiedStatus('Photo copied to clipboard! Paste (Ctrl+V) anywhere');
          setTimeout(() => setCopiedStatus(null), 3500);
          return;
        }
      }

      // If video or clipboard write not supported, copy caption + download
      await navigator.clipboard.writeText(defaultCaption);
      onDownload(media);
      setCopiedStatus('Saved to device & caption copied!');
      setTimeout(() => setCopiedStatus(null), 3500);
    } catch (err) {
      console.warn('Clipboard write error:', err);
      onDownload(media);
      setCopiedStatus('Downloaded to device!');
      setTimeout(() => setCopiedStatus(null), 3000);
    }
  };

  // WhatsApp Share Workflow (Download file with universal extension + open chat)
  const handleShareWhatsApp = () => {
    onDownload(media);
    const text = encodeURIComponent(`${defaultCaption}\n${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    setCopiedStatus('Saved to device! Attach from gallery in WhatsApp');
    setTimeout(() => setCopiedStatus(null), 4500);
  };

  // Telegram Share
  const handleShareTelegram = () => {
    onDownload(media);
    const text = encodeURIComponent(defaultCaption);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    setCopiedStatus('Saved to device! Send in Telegram');
    setTimeout(() => setCopiedStatus(null), 4000);
  };

  // Twitter / X Share
  const handleShareTwitter = () => {
    onDownload(media);
    const text = encodeURIComponent(defaultCaption);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    setCopiedStatus('Saved to device! Post on X / Twitter');
    setTimeout(() => setCopiedStatus(null), 4000);
  };

  // Instagram / TikTok Workflow (Save to device camera roll & open app)
  const handleShareInstagram = (platform: 'instagram' | 'tiktok') => {
    onDownload(media);
    navigator.clipboard?.writeText(defaultCaption);
    setCopiedStatus(
      `Saved to camera roll! Opening ${platform === 'instagram' ? 'Instagram' : 'TikTok'}...`
    );
    setTimeout(() => {
      const url =
        platform === 'instagram'
          ? 'https://www.instagram.com/'
          : 'https://www.tiktok.com/upload';
      window.open(url, '_blank');
      setCopiedStatus(null);
    }, 1200);
  };

  // Email Share
  const handleShareEmail = () => {
    const subject = encodeURIComponent('Finger Frame Camera Creation');
    const body = encodeURIComponent(`${defaultCaption}\n\nCreated with Finger Frame.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-md bg-[#12101f] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-purple-900/40 relative z-10">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold text-white">Share &amp; Save</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {copiedStatus && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
            <Check className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{copiedStatus}</span>
          </div>
        )}

        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 relative z-10">
          {/* Media Preview Box */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black/70 border border-purple-800/40 shadow-inner flex items-center justify-center">
            {media.type === 'photo' ? (
              <img
                src={media.url}
                alt="Capture Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={media.url}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            )}
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 backdrop-blur-md text-white border border-white/10">
                {media.type === 'photo' ? 'PHOTO' : `VIDEO ${media.duration ? `${media.duration}s` : ''}`}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                {ext.toUpperCase()}
              </span>
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono text-neutral-300 bg-black/70">
              {media.formattedDate}
            </div>
          </div>

          {/* Social Compression Helper Callout */}
          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-xs text-neutral-300 flex items-start gap-2 leading-relaxed">
            <span className="text-sm shrink-0">💡</span>
            <p className="text-[11px] text-neutral-300">
              <strong className="text-white">Compression Tip:</strong> If WhatsApp or Instagram says <em>&quot;Can&apos;t compress file&quot;</em>, tap <strong className="text-cyan-300">Save to Device</strong> below. It saves directly into your camera roll so you can select it cleanly!
            </p>
          </div>

          {/* Primary Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {/* 1. Native OS Share Sheet */}
            <button
              onClick={handleNativeShare}
              disabled={isSharing}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Smartphone className="w-4 h-4" />
              <span>Share to Apps</span>
            </button>

            {/* 2. Download directly to device */}
            <button
              onClick={() => {
                onDownload(media);
                setCopiedStatus('Saved to camera roll / downloads!');
                setTimeout(() => setCopiedStatus(null), 3000);
              }}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 text-purple-200 hover:text-white text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Save to Device</span>
            </button>
          </div>

          {/* Copy to Clipboard Direct Button for Photos */}
          {media.type === 'photo' && (
            <button
              onClick={handleCopyImageToClipboard}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#1b172e] hover:bg-[#25203d] border border-cyan-500/30 text-cyan-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4 text-cyan-400" />
              <span>Copy Photo to Clipboard (Paste anywhere)</span>
            </button>
          )}

          {/* Social Platform Direct Shortcuts */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              Share to Platform
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#171426] hover:bg-[#201c36] border border-green-500/30 text-green-300 hover:text-green-200 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-[11px] font-semibold">WhatsApp</span>
              </button>

              {/* Instagram */}
              <button
                onClick={() => handleShareInstagram('instagram')}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#171426] hover:bg-[#201c36] border border-pink-500/30 text-pink-300 hover:text-pink-200 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4 text-pink-400" />
                </div>
                <span className="text-[11px] font-semibold">Instagram</span>
              </button>

              {/* TikTok */}
              <button
                onClick={() => handleShareInstagram('tiktok')}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#171426] hover:bg-[#201c36] border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Film className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-[11px] font-semibold">TikTok</span>
              </button>

              {/* Twitter / X */}
              <button
                onClick={handleShareTwitter}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#171426] hover:bg-[#201c36] border border-blue-500/30 text-blue-300 hover:text-blue-200 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-[11px] font-semibold">X / Twitter</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Telegram */}
              <button
                onClick={handleShareTelegram}
                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-[#151224] hover:bg-[#1e1933] border border-purple-900/40 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-sky-400" />
                <span>Telegram</span>
              </button>

              {/* Email */}
              <button
                onClick={handleShareEmail}
                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-[#151224] hover:bg-[#1e1933] border border-purple-900/40 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Email</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer with Dismiss */}
        <div className="p-3 border-t border-purple-900/40 bg-[#0d0c17] flex items-center justify-between">
          <span className="text-[10px] text-neutral-400 font-mono">
            Saved permanently in device storage
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
