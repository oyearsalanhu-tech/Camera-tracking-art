import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { CameraStage } from './components/CameraStage';
import { ModeSelector } from './components/ModeSelector';
import { ConditionSelector } from './components/ConditionSelector';
import { StyleSelector } from './components/StyleSelector';
import { ControlsBar } from './components/ControlsBar';
import { GalleryDrawer } from './components/GalleryDrawer';
import { ShareModal } from './components/ShareModal';
import { TutorialModal } from './components/TutorialModal';
import { STYLES, PALETTES } from './utils/stylesAndPalettes';
import { GestureStatus, CapturedMedia, PlayMode, FrameCondition } from './types/fingerFrame';
import { setSoundEnabled } from './utils/audioSynth';
import {
  saveMediaToStorage,
  loadMediaFromStorage,
  deleteMediaFromStorage,
  clearAllMediaFromStorage,
} from './utils/mediaStorage';
import { Play, Share2 } from 'lucide-react';

export default function App() {
  const [playMode, setPlayMode] = useState<PlayMode>('frame');
  const [conditionMode, setConditionMode] = useState<'auto' | 'upside_down' | 'apart_quad' | 'pinch_attached'>('auto');
  const [activeCondition, setActiveCondition] = useState<FrameCondition>('none');
  const [gestureStatus, setGestureStatus] = useState<GestureStatus>('idle');
  const [statusText, setStatusText] = useState<string>('Raise hands to frame');
  const [isClosed, setIsClosed] = useState<boolean>(false);

  const [currentStyleIndex, setCurrentStyleIndex] = useState<number>(0);
  const [currentPaletteIndex, setCurrentPaletteIndex] = useState<number>(0);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [autoCycle, setAutoCycle] = useState<boolean>(true);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [photoTimer, setPhotoTimer] = useState<number>(0);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [hdEnhance, setHdEnhance] = useState<boolean>(true);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);

  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);

  // Sharing state across platforms
  const [shareMediaItem, setShareMediaItem] = useState<CapturedMedia | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // References to trigger snap, record, and flower clearing
  const triggerSnapRef = useRef<(() => void) | null>(null);
  const triggerRecordRef = useRef<(() => void) | null>(null);
  const onClearFlowersRef = useRef<(() => void) | null>(null);

  // Load persistently stored media on app mount
  useEffect(() => {
    loadMediaFromStorage().then((saved) => {
      if (saved && saved.length > 0) {
        setCapturedMedia(saved);
      }
    });
  }, []);

  // Status callback from camera solver
  const handleStatusChange = useCallback(
    (status: GestureStatus, text: string, closed: boolean) => {
      setGestureStatus(status);
      setStatusText(text);
      setIsClosed(closed);
    },
    []
  );

  // Cycle to next style & palette
  const handleCycleNext = useCallback(() => {
    setCurrentStyleIndex((prev) => (prev + 1) % STYLES.length);
    setCurrentPaletteIndex((prev) => (prev + 1) % PALETTES.length);
  }, []);

  // Randomize style and palette
  const handleRandomize = useCallback(() => {
    const nextStyle = Math.floor(Math.random() * STYLES.length);
    const nextPal = Math.floor(Math.random() * PALETTES.length);
    setCurrentStyleIndex(nextStyle);
    setCurrentPaletteIndex(nextPal);
  }, []);

  // Handle new captured photo or video: save to IndexedDB & trigger Instant Share Modal
  const handleMediaCaptured = useCallback(
    (blob: Blob, type: 'photo' | 'video', duration?: number) => {
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const formattedDate = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      const newMedia: CapturedMedia = {
        id: `capture-${Date.now()}`,
        type,
        url,
        blob,
        timestamp: Date.now(),
        formattedDate,
        duration,
      };

      // Store permanently in IndexedDB so media persists across reloads/sessions
      saveMediaToStorage(newMedia);

      setCapturedMedia((prev) => [newMedia, ...prev]);

      // Automatically open the Share Modal so media can be immediately shared across platforms
      setShareMediaItem(newMedia);
      setIsShareModalOpen(true);
    },
    []
  );

  // Download media helper with matching MIME and extension
  const handleDownloadMedia = useCallback((item: CapturedMedia) => {
    const a = document.createElement('a');
    a.href = item.url;
    const isMp4 = item.blob.type.includes('mp4');
    const isPng = item.blob.type === 'image/png';
    const ext = item.type === 'photo' ? (isPng ? 'png' : 'jpg') : (isMp4 ? 'mp4' : 'webm');
    a.download = `finger-frame-${item.timestamp}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // Delete an item
  const handleDeleteItem = useCallback((id: string) => {
    deleteMediaFromStorage(id);
    setCapturedMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  // Clear all items
  const handleClearAll = useCallback(() => {
    if (window.confirm('Delete all captured photos and videos from storage?')) {
      clearAllMediaFromStorage();
      capturedMedia.forEach((m) => URL.revokeObjectURL(m.url));
      setCapturedMedia([]);
    }
  }, [capturedMedia]);

  // Flip camera front/back
  const handleFlipCamera = useCallback(() => {
    setFacing((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Toggle sound
  const handleToggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }, [soundOn]);

  // Global keyboard shortcuts (F for flip, C for auto-cycle)
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'f' || e.key === 'F') {
        handleFlipCamera();
      } else if (e.key === 'c' || e.key === 'C') {
        setAutoCycle((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [handleFlipCamera]);

  const currentStyle = STYLES[currentStyleIndex] || STYLES[0];
  const currentPalette = PALETTES[currentPaletteIndex] || PALETTES[0];

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-screen bg-[#09080f] text-neutral-100 overflow-hidden font-sans">
      {/* Top Header & Status Bar */}
      <Header
        status={gestureStatus}
        statusText={statusText}
        isClosed={isClosed}
        playMode={playMode}
        soundEnabled={soundOn}
        onToggleSound={handleToggleSound}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        galleryCount={capturedMedia.length}
        onOpenGallery={() => setIsGalleryOpen(true)}
      />

      {/* Main Interactive Stage */}
      <main className="flex-1 flex flex-col items-center justify-between min-h-0 w-full relative">
        <CameraStage
          playMode={playMode}
          currentStyle={currentStyle}
          currentPalette={currentPalette}
          facing={facing}
          autoCycle={autoCycle}
          onCycleNext={handleCycleNext}
          showSkeleton={showSkeleton}
          micEnabled={micEnabled}
          photoTimer={photoTimer}
          conditionMode={conditionMode}
          onConditionChange={(cond) => setActiveCondition(cond)}
          onStatusChange={handleStatusChange}
          onMediaCaptured={handleMediaCaptured}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          recordingTime={recordingTime}
          setRecordingTime={setRecordingTime}
          triggerSnapRef={triggerSnapRef}
          triggerRecordRef={triggerRecordRef}
          onClearFlowersRef={onClearFlowersRef}
          hdEnhance={hdEnhance}
        />

        {/* Bottom Interactive Dashboard */}
        <div className="w-full bg-[#0d0c14]/95 backdrop-blur-md border-t border-purple-900/30 flex flex-col items-center z-10 pb-1">
          {/* Mode Selector (Finger Frame, Flower Wand, Stars, Hearts, Bubbles) */}
          <ModeSelector
            playMode={playMode}
            onSelectMode={(mode) => {
              setPlayMode(mode);
              if (mode === 'frame') {
                setStatusText('Raise hands to frame');
              } else {
                setStatusText('Move finger wand to bloom');
              }
            }}
            onClearParticles={() => onClearFlowersRef.current?.()}
          />

          {/* Condition Selector for Finger Frame Mode (Upside Down, Pinch Attached, Fingers Apart) */}
          {playMode === 'frame' && (
            <ConditionSelector
              conditionMode={conditionMode}
              onSelectConditionMode={setConditionMode}
              activeCondition={activeCondition}
            />
          )}

          {/* Frame Style & Palette Pickers (Available in both modes for palettes, style for frame mode) */}
          <StyleSelector
            currentStyleIndex={currentStyleIndex}
            currentPaletteIndex={currentPaletteIndex}
            onSelectStyle={setCurrentStyleIndex}
            onSelectPalette={setCurrentPaletteIndex}
            onRandomize={handleRandomize}
          />

          {/* Primary Controls Bar (Photo Shutter & Video Recorder) */}
          <ControlsBar
            onFlipCamera={handleFlipCamera}
            onTakePhoto={() => triggerSnapRef.current?.()}
            isRecording={isRecording}
            recordingTime={recordingTime}
            onStartRecording={() => triggerRecordRef.current?.()}
            onStopRecording={() => triggerRecordRef.current?.()}
            autoCycle={autoCycle}
            onToggleAutoCycle={() => setAutoCycle((prev) => !prev)}
            showSkeleton={showSkeleton}
            onToggleSkeleton={() => setShowSkeleton((prev) => !prev)}
            micEnabled={micEnabled}
            onToggleMic={() => setMicEnabled((prev) => !prev)}
            photoTimer={photoTimer}
            onSetPhotoTimer={setPhotoTimer}
            isCountingDown={false}
            hdEnhance={hdEnhance}
            onToggleHdEnhance={() => setHdEnhance((prev) => !prev)}
          />

          {/* Quick Recent Captures Filmstrip (when gallery is closed) */}
          {capturedMedia.length > 0 && (
            <div className="w-full px-4 pb-1 pt-1 flex items-center justify-between border-t border-purple-950/40">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[11px] font-mono text-purple-400 font-bold shrink-0">
                  CAPTURES:
                </span>
                {capturedMedia.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="relative w-12 h-9 rounded-lg overflow-hidden border border-purple-700/50 hover:border-cyan-400 shrink-0 cursor-pointer shadow-sm group"
                  >
                    <div
                      onClick={() => {
                        setShareMediaItem(item);
                        setIsShareModalOpen(true);
                      }}
                      className="w-full h-full"
                    >
                      {item.type === 'photo' ? (
                        <img
                          src={item.url}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="relative w-full h-full bg-black">
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Play className="w-3 h-3 text-white fill-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick share button overlay on thumbnail */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareMediaItem(item);
                        setIsShareModalOpen(true);
                      }}
                      title="Share across platforms"
                      className="absolute bottom-0 right-0 p-1 bg-black/80 text-cyan-300 hover:text-white rounded-tl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Share2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0 pl-2">
                <button
                  onClick={() => setIsGalleryOpen(true)}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/40 cursor-pointer"
                >
                  View all ({capturedMedia.length})
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Multi-Platform Share & Save Modal */}
      <ShareModal
        media={shareMediaItem}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onDownload={handleDownloadMedia}
      />

      {/* Fullscreen Captures Gallery Drawer */}
      <GalleryDrawer
        items={capturedMedia}
        onDeleteItem={handleDeleteItem}
        onClearAll={handleClearAll}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onShareItem={(item) => {
          setShareMediaItem(item);
          setIsShareModalOpen(true);
        }}
      />

      {/* How to Play / Gesture Guide Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
}
