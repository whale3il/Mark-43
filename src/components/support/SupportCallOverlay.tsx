import React, { useEffect, useRef, useState } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  ShieldCheck,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { SupportCallSession } from '../../types/support';

export type CallOverlayPhase =
  | 'outgoing_ringing'
  | 'incoming_ringing'
  | 'connecting'
  | 'active'
  | 'ended'
  | 'rejected'
  | 'error';

interface SupportCallOverlayProps {
  call: SupportCallSession | null;
  phase: CallOverlayPhase;
  peerName: string;
  errorDetail?: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept?: () => void;
  onReject?: () => void;
  onEnd: () => void;
  onDismiss: () => void;
  onToggleMute: (muted: boolean) => void;
  onToggleVideo: (enabled: boolean) => void;
  theme?: 'dark' | 'light';
}

export const SupportCallOverlay: React.FC<SupportCallOverlayProps> = ({
  call,
  phase,
  peerName,
  errorDetail,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  onDismiss,
  onToggleMute,
  onToggleVideo,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMuted(false);
    setVideoEnabled(true);
    setElapsedSeconds(0);
  }, [call?.id]);

  useEffect(() => {
    if (phase !== 'active') return;
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, phase]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, phase]);

  if (!call) return null;

  const isVideo = call.type === 'video';
  const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const secs = String(elapsedSeconds % 60).padStart(2, '0');
  const isTerminal = phase === 'ended' || phase === 'rejected' || phase === 'error';

  const handleMuteToggle = () => {
    const next = !muted;
    setMuted(next);
    onToggleMute(next);
  };

  const handleVideoToggle = () => {
    const next = !videoEnabled;
    setVideoEnabled(next);
    onToggleVideo(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full ${
          isVideo && (phase === 'active' || phase === 'connecting') ? 'max-w-2xl' : 'max-w-md'
        } rounded-2xl border overflow-hidden shadow-2xl flex flex-col max-h-[90dvh] ${
          isLight
            ? 'border-slate-200 bg-white text-slate-900'
            : 'border-neutral-800 bg-neutral-900 text-neutral-100'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between gap-2 shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/70'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-semibold truncate">
                {isVideo ? 'Encrypted Video Consultation' : 'Encrypted Voice Call'}
              </h4>
              <p className="text-[11px] font-mono text-neutral-400 truncate">
                {peerName} · WebRTC P2P
              </p>
            </div>
          </div>

          {isTerminal && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close call dialog"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Media / Status Stage */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {!isVideo && <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />}

          {isVideo && (phase === 'connecting' || phase === 'active') ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {localStream && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-3 right-3 w-28 sm:w-36 aspect-video rounded-lg object-cover border border-emerald-500/50 bg-neutral-900 shadow-lg"
                />
              )}
              {phase === 'connecting' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-xs text-neutral-200">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Negotiating encrypted WebRTC media channel...</span>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`p-5 rounded-xl border text-center space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/70 border-neutral-800'
              }`}
            >
              <div
                className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center border ${
                  phase === 'error' || phase === 'rejected'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : phase === 'active'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                }`}
              >
                {phase === 'error' || phase === 'rejected' ? (
                  <AlertCircle className="w-6 h-6" />
                ) : phase === 'connecting' ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isVideo ? (
                  <Video className="w-6 h-6" />
                ) : (
                  <Phone className="w-6 h-6" />
                )}
              </div>

              <div className="space-y-1">
                <div className="text-sm font-semibold">{peerName}</div>
                <div className="text-xs font-mono text-emerald-500">
                  {phase === 'outgoing_ringing' && 'Calling... waiting for acceptance'}
                  {phase === 'incoming_ringing' && 'Incoming encrypted call...'}
                  {phase === 'connecting' && 'Establishing WebRTC media connection...'}
                  {phase === 'active' && `Connected · ${mins}:${secs}`}
                  {phase === 'rejected' && 'Call declined'}
                  {phase === 'ended' && 'Call ended'}
                  {phase === 'error' && 'Call unavailable'}
                </div>
                {errorDetail && (
                  <p className="text-xs text-rose-400 leading-relaxed pt-1">{errorDetail}</p>
                )}
              </div>
            </div>
          )}

          {/* Active call duration badge for video */}
          {isVideo && phase === 'active' && (
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Media Active · {mins}:{secs}</span>
            </div>
          )}

          {/* Call Controls */}
          <div className="flex items-center justify-center gap-3 pt-1">
            {phase === 'incoming_ringing' ? (
              <>
                <button
                  type="button"
                  onClick={onReject}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Decline</span>
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Accept Call</span>
                </button>
              </>
            ) : isTerminal ? (
              <button
                type="button"
                onClick={onDismiss}
                className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            ) : (
              <>
                {(phase === 'connecting' || phase === 'active') && (
                  <button
                    type="button"
                    onClick={handleMuteToggle}
                    title={muted ? 'Unmute microphone' : 'Mute microphone'}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer ${
                      muted
                        ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                        : isLight
                        ? 'border-slate-200 bg-slate-100 text-slate-700'
                        : 'border-neutral-700 bg-neutral-800 text-neutral-200'
                    }`}
                  >
                    {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}

                {isVideo && (phase === 'connecting' || phase === 'active') && (
                  <button
                    type="button"
                    onClick={handleVideoToggle}
                    title={videoEnabled ? 'Turn camera off' : 'Turn camera on'}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer ${
                      !videoEnabled
                        ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                        : isLight
                        ? 'border-slate-200 bg-slate-100 text-slate-700'
                        : 'border-neutral-700 bg-neutral-800 text-neutral-200'
                    }`}
                  >
                    {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onEnd}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>{phase === 'outgoing_ringing' ? 'Cancel' : 'End Call'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
