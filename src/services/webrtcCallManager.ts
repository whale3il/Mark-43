import type { SupportCallSignalPayload, SupportCallType } from '../types/support';

export interface WebRtcCallEvents {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionState?: (state: 'connecting' | 'connected' | 'disconnected' | 'failed') => void;
  onSignal: (signal: Omit<SupportCallSignalPayload, 'callId'>) => void;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export class WebRtcCallManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private disposed = false;

  constructor(
    private readonly conversationId: string,
    private readonly callType: SupportCallType,
    private readonly events: WebRtcCallEvents,
    private readonly iceServers?: RTCIceServer[]
  ) {}

  public async initPeer(acquireMedia = true): Promise<MediaStream | null> {
    if (this.disposed) return null;
    if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
      throw new Error('WebRTC is not supported in this browser environment.');
    }

    if (acquireMedia && !this.localStream) {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser media capture API is unavailable.');
      }
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.callType === 'video',
      });
      this.events.onLocalStream?.(this.localStream);
    }

    if (!this.pc) {
      const pc = new RTCPeerConnection({
        iceServers: this.iceServers?.length ? this.iceServers : DEFAULT_ICE_SERVERS,
      });

      this.remoteStream = new MediaStream();
      this.events.onRemoteStream?.(this.remoteStream);

      if (this.localStream) {
        for (const track of this.localStream.getTracks()) {
          pc.addTrack(track, this.localStream);
        }
      }

      pc.ontrack = (event) => {
        if (this.disposed) return;
        const stream = this.remoteStream || new MediaStream();
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((t) => {
            if (!stream.getTracks().some((existing) => existing.id === t.id)) {
              stream.addTrack(t);
            }
          });
        } else if (event.track) {
          stream.addTrack(event.track);
        }
        this.remoteStream = stream;
        this.events.onRemoteStream?.(stream);
      };

      pc.onicecandidate = (event) => {
        if (this.disposed || !event.candidate) return;
        this.events.onSignal({
          conversationId: this.conversationId,
          signalType: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      };

      pc.onconnectionstatechange = () => {
        if (this.disposed) return;
        const st = pc.connectionState;
        if (st === 'connected') {
          this.events.onConnectionState?.('connected');
        } else if (st === 'connecting' || st === 'new') {
          this.events.onConnectionState?.('connecting');
        } else if (st === 'disconnected') {
          this.events.onConnectionState?.('disconnected');
        } else if (st === 'failed' || st === 'closed') {
          this.events.onConnectionState?.('failed');
        }
      };

      this.pc = pc;
    }

    return this.localStream;
  }

  public async createAndSendOffer(): Promise<void> {
    await this.initPeer(true);
    if (!this.pc || this.disposed) return;
    this.events.onConnectionState?.('connecting');
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.callType === 'video',
    });
    await this.pc.setLocalDescription(offer);
    this.events.onSignal({
      conversationId: this.conversationId,
      signalType: 'offer',
      sdp: offer,
    });
  }

  public async handleSignal(signal: SupportCallSignalPayload): Promise<void> {
    if (this.disposed) return;

    if (signal.signalType === 'offer' && signal.sdp) {
      await this.initPeer(true);
      if (!this.pc || this.disposed) return;
      this.events.onConnectionState?.('connecting');
      await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      await this.flushCandidates();
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.events.onSignal({
        conversationId: this.conversationId,
        signalType: 'answer',
        sdp: answer,
      });
      return;
    }

    if (signal.signalType === 'answer' && signal.sdp) {
      if (!this.pc) return;
      await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      await this.flushCandidates();
      return;
    }

    if (signal.signalType === 'ice-candidate' && signal.candidate) {
      if (!this.pc || !this.pc.remoteDescription) {
        this.pendingCandidates.push(signal.candidate);
        return;
      }
      await this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }

  private async flushCandidates(): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) return;
    const queued = [...this.pendingCandidates];
    this.pendingCandidates = [];
    for (const c of queued) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        // Ignore stale ICE candidates
      }
    }
  }

  public setMuted(muted: boolean): void {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  public setVideoEnabled(enabled: boolean): void {
    if (!this.localStream) return;
    this.localStream.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  public dispose(): void {
    this.disposed = true;
    this.pendingCandidates = [];
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => t.stop());
      this.remoteStream = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {
        // Safe cleanup
      }
      this.pc = null;
    }
  }
}
