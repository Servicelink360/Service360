import Layout from '@app/components/layout/Layout';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import urlConfig from '@app/config/site.config';
import { callAPIAsync } from '@app/library/helpers/api';
import { userType } from '@app/constants/statusUser';
import { CloseOutlined } from '@ant-design/icons';
import { message } from 'antd';
import {
  ConnectionQuality,
  ConnectionState,
  LocalAudioTrack,
  LocalVideoTrack,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';
import React, { useEffect, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';

type ChatLine = { id: string; name: string; text: string };
type FloatNote = { id: number; emoji: string; name: string };
type Person = { id: number; name: string; email: string; type: number; invited: boolean };
type Phase = 'ready' | 'connecting' | 'live' | 'error';

function isAndroidPhone() {
  return /Android/i.test(typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
}

function isApplePhone() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * iPhone↔iPhone works on H.264.
 * Android Chrome H.264 often will not decode on iPhone Safari — publish VP8 from Android only.
 */
function cameraPublishOptions() {
  const android = isAndroidPhone();
  return {
    simulcast: false,
    backupCodec: false as const,
    videoCodec: (android ? 'vp8' : 'h264') as 'vp8' | 'h264',
    red: false,
    videoEncoding: { maxBitrate: 700_000, maxFramerate: 24 },
    source: Track.Source.Camera,
  };
}

function buildRoomOptions() {
  const publish = cameraPublishOptions();
  return {
    singlePeerConnection: false,
    disconnectOnPageLeave: false,
    dynacast: false,
    adaptiveStream: false,
    autoSubscribe: true,
    publishDefaults: {
      simulcast: publish.simulcast,
      backupCodec: publish.backupCodec,
      videoCodec: publish.videoCodec,
      red: publish.red,
      videoEncoding: publish.videoEncoding,
    },
    videoCaptureDefaults: {
      resolution: { width: 960, height: 540, frameRate: 24 },
    },
  };
}

function profileType() {
  try {
    const raw = localStorage.getItem('profile');
    return raw ? +JSON.parse(raw).type : 0;
  } catch {
    return 0;
  }
}

function postMeeting(path: string, id: string | number) {
  const base = String(urlConfig.orderApiURL || '').replace(/\/?$/, '/');
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Bearer ' + (localStorage.getItem('id_token') || ''),
    },
    body: JSON.stringify({ id: +id }),
    keepalive: true,
  }).catch(() => undefined);
}

function cameraErrorText(error: any) {
  const name = error?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Allow the camera and microphone in the browser prompt, then join again.';
  }
  if (name === 'NotReadableError') {
    return 'Another app is using the camera. Close it, then join again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'This computer has no camera or microphone plugged in.';
  }
  return '';
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function qualityLabel(value?: string) {
  if (value === ConnectionQuality.Excellent || value === ConnectionQuality.Good) return 'Good connection';
  if (value === ConnectionQuality.Poor) return 'Weak connection';
  if (value === ConnectionQuality.Lost) return '';
  return '';
}

function sendCameraOnFirstConnection(room: Room, video?: MediaStreamTrack, audio?: MediaStreamTrack) {
  const engine = (room as Room & { engine?: any }).engine;
  if (!engine || engine.__svcFirstOffer) return;
  engine.__svcFirstOffer = true;
  const original = engine.configure.bind(engine);
  engine.configure = async function (...args: unknown[]) {
    const result = await original(...args);
    const publisher = engine.pcManager?.publisher;
    if (publisher && video && video.readyState === 'live') {
      publisher.addTransceiver(video, { direction: 'sendonly' });
    }
    if (publisher && audio && audio.readyState === 'live') {
      publisher.addTransceiver(audio, { direction: 'sendonly' });
    }
    const manager = engine.pcManager;
    if (manager && !manager.__svcReuse) {
      manager.__svcReuse = true;
      const add = manager.addPublisherTransceiver.bind(manager);
      manager.addPublisherTransceiver = (mediaTrack: MediaStreamTrack, init: RTCRtpTransceiverInit) => {
        const existing = manager.publisher.getTransceivers().find((item: RTCRtpTransceiver) => item.sender.track === mediaTrack);
        if (existing) return existing;
        return add(mediaTrack, init);
      };
    }
    return result;
  };
  const negotiate = engine.negotiate.bind(engine);
  engine.negotiate = async () => {
    if (engine.__svcSkipNegotiate) return undefined;
    return negotiate();
  };
}

function holdConnection(room: Room) {
  const engine = (room as Room & {
    engine?: { peerConnectionTimeout?: number; pcManager?: { peerConnectionTimeout?: number } };
  }).engine;
  if (!engine) return;
  engine.peerConnectionTimeout = 60000;
  if (engine.pcManager) engine.pcManager.peerConnectionTimeout = 60000;
}

function hasPicture(track?: Track | null) {
  const media = track?.mediaStreamTrack;
  return !!track && !track.isMuted && !!media && media.readyState !== 'ended';
}

function CameraPicture({ track, mirror }: { track: Track; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const mediaId = track.mediaStreamTrack?.id;
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    track.attach(el);
    // iPhone will not paint a remote Android stream without muted + playsInline + play().
    el.muted = true;
    el.defaultMuted = true;
    el.autoplay = true;
    el.playsInline = true;
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    const play = () => {
      void el.play().catch(() => undefined);
    };
    play();
    el.addEventListener('loadedmetadata', play);
    el.addEventListener('canplay', play);
    return () => {
      el.removeEventListener('loadedmetadata', play);
      el.removeEventListener('canplay', play);
      track.detach(el);
    };
  }, [track, mediaId]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      style={{
        width: '100%',
        height: '100%',
        objectFit: track.source === Track.Source.ScreenShare ? 'contain' : 'cover',
        background: '#000',
        transform: mirror ? 'scaleX(-1)' : undefined,
      }}
    />
  );
}

function personInitials(name: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function InviteList({ meetingId, onClose }: { meetingId: string; onClose: () => void }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'staff' | 'clients'>('staff');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.MEETINGS_PEOPLE, 'GET', { id: meetingId });
      if (!cancelled && res?.code === 1 && Array.isArray(res.data)) {
        setPeople(res.data.map((row: Person) => ({ ...row, invited: !!row.invited })));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [meetingId]);

  const needle = query.trim().toLowerCase();
  const visible = people.filter((person) => !needle || `${person.name} ${person.email}`.toLowerCase().includes(needle));
  const staff = visible.filter((person) => +person.type === userType.STAFF);
  const clients = visible.filter((person) => +person.type === userType.CUSTOMER);
  const rows = tab === 'staff' ? staff : clients;
  const toggle = (id: number) => {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };
  const send = async () => {
    if (!picked.length || sending) return;
    setSending(true);
    try {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.MEETINGS_INVITE, 'POST', { id: meetingId, userIds: picked });
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not send the invitation');
        return;
      }
      const sent = new Set(picked);
      setPeople((current) => current.map((person) => (sent.has(+person.id) ? { ...person, invited: true } : person)));
      setPicked([]);
      message.success(res?.message || 'Invitation sent');
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="svc-meet__invite-sheet" onClick={onClose} role="presentation">
      <div className="svc-meet__invite" onClick={(event) => event.stopPropagation()} role="dialog" aria-label="Invite people">
        <div className="svc-meet__invite-handle" aria-hidden="true" />
        <div className="svc-meet__invite-top">
          <div>
            <h2>Invite people</h2>
            <p>They will see the meeting on their dashboard.</p>
          </div>
          <button type="button" className="svc-meet__invite-close" onClick={onClose} aria-label="Close invite">Close</button>
        </div>
        <div className="svc-meet__invite-search-wrap">
          <input
            className="svc-meet__search"
            value={query}
            placeholder="Search name or email"
            inputMode="search"
            autoCapitalize="off"
            autoCorrect="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="svc-meet__invite-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'staff'} className={tab === 'staff' ? 'is-on' : ''} onClick={() => setTab('staff')}>
            Staff{staff.length ? ` · ${staff.length}` : ''}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'clients'} className={tab === 'clients' ? 'is-on' : ''} onClick={() => setTab('clients')}>
            Clients{clients.length ? ` · ${clients.length}` : ''}
          </button>
        </div>
        <div className="svc-meet__invite-list">
          {loading ? (
            <p className="svc-meet__empty">Loading people…</p>
          ) : rows.length ? rows.map((person) => {
            const selected = picked.includes(+person.id) || person.invited;
            return (
              <button
                type="button"
                key={person.id}
                className={`svc-meet__person ${selected ? 'is-on' : ''} ${person.invited ? 'is-invited' : ''}`}
                disabled={person.invited}
                onClick={() => toggle(+person.id)}
              >
                <span className="svc-meet__person-avatar" aria-hidden="true">{personInitials(person.name)}</span>
                <span className="svc-meet__person-meta">
                  <strong>{person.name}</strong>
                  {person.email ? <em>{person.email}</em> : null}
                </span>
                <span className="svc-meet__person-mark" aria-hidden="true">
                  {person.invited ? 'Invited' : selected ? '✓' : ''}
                </span>
              </button>
            );
          }) : (
            <p className="svc-meet__empty">{needle ? 'No matches.' : `No ${tab} in this list.`}</p>
          )}
        </div>
        <div className="svc-meet__invite-foot">
          <p className="svc-meet__invite-count">{picked.length ? `${picked.length} selected` : 'Select people to invite'}</p>
          <button type="button" className="svc-meet__btn svc-meet__btn--green svc-meet__invite-send" onClick={() => void send()} disabled={sending || !picked.length}>
            {sending ? 'Sending…' : picked.length ? `Send invitation (${picked.length})` : 'Send invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}

const MeetingPage: React.FC = () => {
  const params = useParams<{ meetingId: string }>();
  const meetingId = params.meetingId || (window.location.pathname.match(/\/meetings\/(\d+)/) || [])[1] || '';
  const history = useHistory();
  const roomRef = useRef<Room | null>(null);
  const leavingRef = useRef(false);
  const joinedRef = useRef(false);
  const hostRef = useRef(false);
  const reconnectsRef = useRef(0);
  const sessionRef = useRef<{ url: string; token: string } | null>(null);
  const audioHost = useRef<HTMLDivElement | null>(null);
  const facingRef = useRef<'user' | 'environment'>('user');
  const flipLock = useRef(false);
  const soundRef = useRef(true);
  const camWanted = useRef(true);
  const micWanted = useRef(true);
  const speakersRef = useRef<string[]>([]);
  const handsRef = useRef<string[]>([]);
  const admin = profileType() === userType.ADMIN;

  const [phase, setPhase] = useState<Phase>('ready');
  const [notice, setNotice] = useState('');
  const [tick, setTick] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [hostName, setHostName] = useState('');
  const [facingUser, setFacingUser] = useState(true);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [clock, setClock] = useState('00:00');
  const [linkQuality, setLinkQuality] = useState('');
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [chatText, setChatText] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [handUp, setHandUp] = useState(false);
  const [floats, setFloats] = useState<FloatNote[]>([]);
  const [needsTap, setNeedsTap] = useState(false);
  const [selfVideo, setSelfVideo] = useState<LocalVideoTrack | null>(null);
  const selfVideoRef = useRef<LocalVideoTrack | null>(null);
  const devicesRef = useRef<Promise<MediaStream> | null>(null);

  const bump = () => setTick((value) => value + 1);

  useEffect(() => {
    if (phase !== 'live' || !startedAt) return undefined;
    const tickClock = () => {
      const sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setClock(`${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`);
    };
    tickClock();
    const timer = window.setInterval(tickClock, 1000);
    return () => window.clearInterval(timer);
  }, [phase, startedAt]);

  useEffect(() => () => {
    const room = roomRef.current;
    roomRef.current = null;
    room?.disconnect();
    if (joinedRef.current && meetingId) postMeeting(endPoint.MEETINGS_LEAVE, meetingId);
  }, [meetingId]);

  const keepSelfVideo = (track: LocalVideoTrack | null) => {
    selfVideoRef.current = track;
    setSelfVideo(track);
  };

  const join = async () => {
    if (phase === 'connecting') return;
    if (!meetingId) {
      setPhase('error');
      setNotice('This meeting link is not valid. Open the invitation again.');
      return;
    }
    setPhase('connecting');
    setNotice('Joining the meeting…');
    const room = new Room(buildRoomOptions());
    roomRef.current = room;
    void room.startVideo().catch(() => setNeedsTap(true));
    void room.startAudio().catch(() => setNeedsTap(true));
    const devices = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: { ideal: 'user' } } })
      : Promise.reject(new Error('This phone has no camera'));
    devicesRef.current = devices;
    const bumpRoom = () => {
      bump();
      if (room.remoteParticipants.size > 0) setNotice('');
    };
    room.on(RoomEvent.ParticipantConnected, bumpRoom);
    room.on(RoomEvent.ParticipantDisconnected, bumpRoom);
    room.on(RoomEvent.TrackMuted, bumpRoom);
    room.on(RoomEvent.TrackUnmuted, bumpRoom);
    room.on(RoomEvent.LocalTrackPublished, bumpRoom);
    room.on(RoomEvent.TrackPublished, (publication) => {
      if (publication.kind === Track.Kind.Video && !publication.isSubscribed) publication.setSubscribed(true);
      bumpRoom();
    });
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio && audioHost.current) {
        const el = track.attach();
        el.autoplay = true;
        el.muted = !soundRef.current;
        audioHost.current.appendChild(el);
        void (el as HTMLMediaElement).play?.().catch(() => setNeedsTap(true));
      }
      if (track.kind === Track.Kind.Video) {
        void room.startVideo().catch(() => setNeedsTap(true));
      }
      bumpRoom();
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove());
      bumpRoom();
    });
    room.on(RoomEvent.ActiveSpeakersChanged, (people) => {
      speakersRef.current = people.map((person) => person.identity);
      bump();
    });
    room.on(RoomEvent.ConnectionQualityChanged, (quality, person) => {
      if (person?.isLocal) setLinkQuality(qualityLabel(quality));
    });
    room.on(RoomEvent.ChatMessage, (msg: { id?: string; message?: string }, person) => {
      const text = String(msg?.message || '').trim();
      if (!text) return;
      setChatLines((lines) => [...lines, { id: msg.id || `${Date.now()}`, name: person?.name || 'Someone', text }].slice(-80));
    });
    room.on(RoomEvent.DataReceived, (payload, person, _kind, topic) => {
      if (topic !== 'svc-meet' || !person) return;
      let signal: { type?: string; emoji?: string; up?: boolean } = {};
      try { signal = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (signal.type === 'reaction' && signal.emoji) {
        const note = { id: Date.now() + Math.random(), emoji: signal.emoji, name: person.name || 'Someone' };
        setFloats((current) => [...current, note].slice(-8));
        window.setTimeout(() => setFloats((current) => current.filter((item) => item.id !== note.id)), 2500);
      }
      if (signal.type === 'hand') {
        const next = new Set(handsRef.current);
        if (signal.up) next.add(person.identity);
        else next.delete(person.identity);
        handsRef.current = Array.from(next);
        bump();
      }
    });
    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      if (publication.source === Track.Source.ScreenShare) setScreenOn(false);
      bumpRoom();
    });
    room.on(RoomEvent.Reconnected, () => {
      reconnectsRef.current = 0;
      setNotice('');
      bump();
    });
    room.on(RoomEvent.Disconnected, () => {
      if (leavingRef.current || roomRef.current !== room) return;
      setNotice('The call dropped. Tap Join again.');
      setPhase('ready');
    });
    try {
      const res = await withTimeout(
        callAPIAsync(serviceType.COMMON, endPoint.MEETINGS_JOIN, 'POST', { id: +meetingId }),
        20000,
        'The meeting server did not answer. Tap Join again.',
      );
      if (res?.code !== 1 || !res?.data?.token || !res?.data?.url) {
        devices.then((stream) => stream.getTracks().forEach((track) => track.stop())).catch(() => undefined);
        room.disconnect();
        roomRef.current = null;
        setPhase('error');
        setNotice(res?.message || 'Could not join the meeting');
        return;
      }
      hostRef.current = !!res.data.host;
      joinedRef.current = true;
      setIsHost(!!res.data.host);
      setHostName(String(res.data.hostName || '').trim());
      sessionRef.current = { url: res.data.url, token: res.data.token };
      setNotice('Connecting…');
      let videoTrack: LocalVideoTrack | undefined;
      let audioTrack: LocalAudioTrack | undefined;
      let rawVideo: MediaStreamTrack | undefined;
      let rawAudio: MediaStreamTrack | undefined;
      try {
        const stream = await devices;
        rawVideo = stream.getVideoTracks()[0];
        rawAudio = stream.getAudioTracks()[0];
        if (rawVideo) {
          videoTrack = new LocalVideoTrack(rawVideo, { facingMode: 'user' }, true);
          videoTrack.source = Track.Source.Camera;
          keepSelfVideo(videoTrack);
          camWanted.current = true;
          setCamOn(true);
        }
        if (rawAudio) {
          audioTrack = new LocalAudioTrack(rawAudio, undefined, true);
          audioTrack.source = Track.Source.Microphone;
          micWanted.current = true;
          setMicOn(true);
        }
      } catch (error: any) {
        camWanted.current = false;
        setCamOn(false);
        message.error(cameraErrorText(error) || 'The camera did not start');
      }
      // First-offer inject is iPhone-only (keeps Join gesture). On Android it can send a
      // raw H.264 path that iPhone Safari cannot paint — so Android uses normal publish (VP8).
      if (isApplePhone()) {
        sendCameraOnFirstConnection(room, rawVideo, rawAudio);
      }
      await withTimeout(
        room.connect(res.data.url, res.data.token, { peerConnectionTimeout: 60000 }),
        20000,
        'The video connection did not start. Tap Join again.',
      );
      holdConnection(room);
      setPhase('live');
      setStartedAt(Date.now());
      setNotice(room.remoteParticipants.size > 0 ? '' : 'You are in the meeting. Waiting for the other person.');
      bump();
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      holdConnection(room);
      if (isApplePhone()) {
        const engine = (room as Room & { engine?: { __svcSkipNegotiate?: boolean } }).engine;
        if (engine) engine.__svcSkipNegotiate = true;
      }
      if (videoTrack && room.state === ConnectionState.Connected) {
        try {
          const pub = await room.localParticipant.publishTrack(videoTrack, cameraPublishOptions());
          if (pub?.isMuted) await pub.unmute();
          if (videoTrack.isMuted) await videoTrack.unmute();
          if (videoTrack.mediaStreamTrack) videoTrack.mediaStreamTrack.enabled = true;
        } catch (error: any) {
          try {
            // Fallback codec if the preferred one fails on this phone.
            const fallback = isAndroidPhone()
              ? { ...cameraPublishOptions(), videoCodec: 'h264' as const }
              : { ...cameraPublishOptions(), videoCodec: 'vp8' as const };
            const pub = await room.localParticipant.publishTrack(videoTrack, fallback);
            if (pub?.isMuted) await pub.unmute();
            if (videoTrack.isMuted) await videoTrack.unmute();
            if (videoTrack.mediaStreamTrack) videoTrack.mediaStreamTrack.enabled = true;
          } catch (fallbackError: any) {
            message.error(cameraErrorText(fallbackError || error) || 'The camera did not start');
          }
        }
      }
      if (audioTrack && room.state === ConnectionState.Connected) {
        try {
          const mic = await room.localParticipant.publishTrack(audioTrack, {
            source: Track.Source.Microphone,
            red: false,
          });
          if (mic?.isMuted) await mic.unmute();
          setMicOn(true);
          micWanted.current = true;
        } catch (error: any) {
          setMicOn(false);
          micWanted.current = false;
          message.error(cameraErrorText(error) || 'The microphone did not start');
        }
      } else if (!audioTrack) {
        setMicOn(false);
        micWanted.current = false;
      }
      room.remoteParticipants.forEach((person) => {
        person.trackPublications.forEach((publication) => {
          if (publication.kind === Track.Kind.Video && !publication.isSubscribed) publication.setSubscribed(true);
        });
      });
      bump();
    } catch (error: any) {
      devices.then((stream) => stream.getTracks().forEach((track) => track.stop())).catch(() => undefined);
      keepSelfVideo(null);
      room.disconnect();
      roomRef.current = null;
      setPhase('error');
      setNotice(cameraErrorText(error) || error?.message || 'Could not join the meeting');
    }
  };

  const localCamera = () => (
    roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined
  ) || selfVideoRef.current || undefined;

  const localMic = () => (
    roomRef.current?.localParticipant.getTrackPublication(Track.Source.Microphone)?.track as LocalAudioTrack | undefined
  );

  const toggleMic = async () => {
    const next = !micOn;
    setMicOn(next);
    micWanted.current = next;
    soundRef.current = next;
    audioHost.current?.querySelectorAll('audio').forEach((el) => { el.muted = !next; });
    try {
      const mic = localMic();
      if (mic) {
        if (next) await mic.unmute();
        else await mic.mute();
      } else if (next) {
        await roomRef.current?.localParticipant.setMicrophoneEnabled(true);
      }
    } catch {
      message.error('Could not switch the microphone');
    }
    bump();
  };

  const toggleCam = async () => {
    const next = !camOn;
    setCamOn(next);
    camWanted.current = next;
    try {
      const camera = localCamera();
      if (camera) {
        if (next) await camera.unmute();
        else await camera.mute();
      } else if (next) {
        await roomRef.current?.localParticipant.setCameraEnabled(true, { facingMode: facingRef.current });
      }
    } catch {
      message.error('Could not switch the camera');
    }
    bump();
  };

  const toggleShare = async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setScreenShareEnabled(!screenOn, { audio: false }, {
        simulcast: false,
        backupCodec: false,
        videoCodec: 'h264',
      });
      setScreenOn(!screenOn);
      bump();
    } catch (error: any) {
      message.error(cameraErrorText(error) || 'This phone cannot share the screen');
    }
  };

  const sendSignal = (signal: { type: string; emoji?: string; up?: boolean }) => {
    const room = roomRef.current;
    if (!room) return;
    void room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(signal)), { reliable: true, topic: 'svc-meet' });
  };

  const react = (emoji: string) => {
    const note = { id: Date.now() + Math.random(), emoji, name: 'You' };
    setFloats((current) => [...current, note].slice(-8));
    window.setTimeout(() => setFloats((current) => current.filter((item) => item.id !== note.id)), 2500);
    sendSignal({ type: 'reaction', emoji });
  };

  const toggleHand = () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !handUp;
    setHandUp(next);
    const handsNow = new Set(handsRef.current);
    if (next) handsNow.add(room.localParticipant.identity);
    else handsNow.delete(room.localParticipant.identity);
    handsRef.current = Array.from(handsNow);
    bump();
    sendSignal({ type: 'hand', up: next });
  };

  const sendChat = async () => {
    const text = chatText.trim();
    const room = roomRef.current;
    if (!text || !room) return;
    setChatText('');
    try {
      await room.localParticipant.sendChatMessage(text);
    } catch {
      message.error('Could not send the message');
    }
  };

  const showVideo = async () => {
    const room = roomRef.current;
    try { await room?.startVideo(); } catch { /* the plays below still try */ }
    try { await room?.startAudio(); } catch { /* audio may already be open */ }
    document.querySelectorAll('.svc-meet video, .svc-meet audio').forEach((node) => {
      const el = node as HTMLMediaElement;
      if (el.tagName === 'VIDEO') el.muted = true;
      void el.play().catch(() => undefined);
    });
    setNeedsTap(false);
  };

  const flipCamera = async () => {
    if (flipLock.current) return;
    const local = localCamera();
    if (!local) {
      message.error('Turn the camera on, then flip it');
      return;
    }
    flipLock.current = true;
    const next = facingRef.current === 'user' ? 'environment' : 'user';
    const restart = (local as LocalVideoTrack & { restart?: (constraints?: MediaTrackConstraints) => Promise<unknown> }).restart;
    try {
      if (!restart) throw new Error('Could not flip the camera');
      await restart.call(local, { facingMode: { ideal: next } });
      if (local.isMuted) await local.unmute();
      facingRef.current = next;
      setFacingUser(next === 'user');
      setCamOn(true);
      camWanted.current = true;
      bump();
    } catch (error: any) {
      try {
        await restart?.call(local, { facingMode: { exact: next } });
        if (local.isMuted) await local.unmute();
        facingRef.current = next;
        setFacingUser(next === 'user');
        setCamOn(true);
        camWanted.current = true;
        bump();
      } catch (again: any) {
        message.error(cameraErrorText(again) || cameraErrorText(error) || 'Could not flip the camera');
      }
    } finally {
      flipLock.current = false;
    }
  };

  const clearMeetings = async () => {
    if (!window.confirm('Clear every team meeting, invitation, and the meeting history?')) return;
    const res = await callAPIAsync(serviceType.COMMON, endPoint.MEETINGS_CLEAR, 'POST', {});
    if (!res || res.code !== 1) {
      message.error((res && res.message) || 'Could not clear meetings');
      return;
    }
    leavingRef.current = true;
    selfVideoRef.current?.stop();
    devicesRef.current?.then((stream) => stream.getTracks().forEach((track) => track.stop())).catch(() => undefined);
    keepSelfVideo(null);
    roomRef.current?.disconnect();
    roomRef.current = null;
    message.success('All meetings cleared');
    history.push('/dashboard');
  };

  const leave = async () => {
    leavingRef.current = true;
    if (meetingId) {
      await postMeeting(endPoint.MEETINGS_LEAVE, meetingId);
      if (hostRef.current) await postMeeting(endPoint.MEETINGS_END, meetingId);
    }
    selfVideoRef.current?.stop();
    devicesRef.current?.then((stream) => stream.getTracks().forEach((track) => track.stop())).catch(() => undefined);
    keepSelfVideo(null);
    roomRef.current?.disconnect();
    roomRef.current = null;
    history.push('/dashboard');
  };

  const roomNow = tick >= 0 ? roomRef.current : null;
  const people = roomNow ? [roomNow.localParticipant, ...Array.from(roomNow.remoteParticipants.values())] : [];
  const speaking = new Set(speakersRef.current);
  const hands = new Set(handsRef.current);

  return (
    <Layout title="Meeting">
      <div className="svc-meet">
        <style>{`
          .svc-meet { position: relative; min-height: calc(100vh - 120px); background: #0b0b0b; color: #fff; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
          .svc-meet__bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; flex-shrink: 0; }
          .svc-meet__bar-actions { display: flex; gap: 8px; flex-shrink: 0; }
          .svc-meet__title { font-size: 15px; font-weight: 700; color: #fff; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
          .svc-meet__stage { flex: 1; display: flex; flex-direction: column; padding: 8px 12px 12px; overflow: auto; min-height: 0; }
          .svc-meet__grid { width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; flex: 1; align-content: start; }
          .svc-meet__tile { position: relative; background: #1c1c1c; border-radius: 14px; min-height: 220px; overflow: hidden; }
          .svc-meet__tile--speak { box-shadow: inset 0 0 0 3px #7CFF6B; }
          .svc-meet__name { position: absolute; left: 10px; bottom: 10px; z-index: 2; background: rgba(0,0,0,0.55); border-radius: 8px; padding: 4px 8px; font-size: 13px; font-weight: 600; }
          .svc-meet__floats { position: absolute; right: 12px; bottom: 78px; z-index: 3; display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
          .svc-meet__float { background: rgba(0,0,0,0.55); border-radius: 12px; padding: 6px 10px; font-size: 22px; }
          .svc-meet__panel { width: min(720px, 100%); background: #1c1c1c; border-radius: 12px; padding: 12px; margin: 0 auto 10px; }
          .svc-meet__chat-line { margin: 0 0 8px; font-size: 15px; }
          .svc-meet__chat-line strong { display: block; font-size: 13px; color: #c8c8c8; }
          .svc-meet__chat-box { max-height: 160px; overflow: auto; margin-bottom: 8px; }
          .svc-meet__row { display: flex; gap: 8px; }
          .svc-meet__row input { flex: 1; height: 44px; border: 0; border-radius: 10px; padding: 0 12px; font-size: 16px; }
          .svc-meet__wait { position: relative; width: min(460px, 100%); text-align: center; background: #1a1a1a; color: #f0f0f0; border: 1px solid #333333; border-radius: 16px; padding: 20px 16px; margin: 0 auto; box-shadow: 0 12px 40px rgba(0,0,0,0.55); }
          .svc-meet__wait h2 { color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 8px; padding-right: 36px; }
          .svc-meet__wait p { color: #bfbfbf; font-size: 15px; line-height: 1.45; margin: 0 0 14px; }
          .svc-meet__wait-close { position: absolute; top: 12px; right: 12px; width: 36px; height: 36px; min-width: 36px; padding: 0; border-radius: 50%; border: 2px solid rgba(255,255,255,0.85); background: rgba(0,0,0,0.45); color: #ffffff; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.45); -webkit-tap-highlight-color: transparent; }
          .svc-meet__wait-close:hover { background: rgba(0,0,0,0.65); border-color: #ffffff; }
          .svc-meet__wait-close .anticon { font-size: 16px; color: #ffffff; }
          .svc-meet__btn { height: 44px; padding: 0 14px; border-radius: 12px; border: 0; font-size: 14px; font-weight: 700; cursor: pointer; -webkit-tap-highlight-color: transparent; }
          .svc-meet__btn--light { background: #fff; color: #143d24; }
          .svc-meet__btn--green { background: #1f6b3a; color: #fff; }
          .svc-meet__btn--dark { background: #2a2a2a; color: #fff; }
          .svc-meet__btn--danger { background: #8b1e1e; color: #fff; }
          .svc-meet__btn:disabled { opacity: 0.6; cursor: default; }
          .svc-meet__controls { display: flex; gap: 8px; justify-content: center; align-items: center; padding: 10px 10px calc(10px + env(safe-area-inset-bottom, 0px)); flex-wrap: nowrap; flex-shrink: 0; background: linear-gradient(180deg, rgba(11,11,11,0) 0%, rgba(11,11,11,0.92) 28%, #0b0b0b 100%); }
          .svc-meet__controls .svc-meet__btn { flex: 1; min-width: 0; max-width: 160px; padding: 0 6px; font-size: 13px; }
          .svc-meet__sheet { position: absolute; inset: 0; z-index: 6; background: rgba(0,0,0,0.35); display: flex; align-items: flex-end; justify-content: center; padding: 12px; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
          .svc-meet__sheet-card { width: min(420px, 100%); background: rgba(22,22,22,0.88); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .svc-meet__sheet-card .svc-meet__btn { width: 100%; height: 44px; margin: 0; font-size: 13px; }
          .svc-meet__sheet-card .svc-meet__btn--wide { grid-column: 1 / -1; }
          .svc-meet__sheet-label { grid-column: 1 / -1; text-align: center; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #9ca3af; margin: 0 0 2px; }
          .svc-meet__invite-sheet { position: absolute; inset: 0; z-index: 8; background: rgba(0,0,0,0.55); display: flex; align-items: flex-end; justify-content: center; padding: 0; }
          .svc-meet__invite { width: min(560px, 100%); max-height: min(92vh, 760px); text-align: left; background: #141414; border-radius: 22px 22px 0 0; padding: 0; margin: 0; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 -8px 40px rgba(0,0,0,0.45); }
          .svc-meet__invite-handle { width: 42px; height: 4px; border-radius: 999px; background: rgba(255,255,255,0.22); margin: 10px auto 4px; flex-shrink: 0; }
          .svc-meet__invite-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 8px 16px 4px; flex-shrink: 0; }
          .svc-meet__invite h2 { color: #fff; font-size: 20px; font-weight: 800; margin: 0 0 4px; line-height: 1.25; }
          .svc-meet__invite-top p { color: #a3a3a3; font-size: 13px; line-height: 1.4; margin: 0; }
          .svc-meet__invite-close { flex-shrink: 0; height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: #2a2a2a; color: #fff; font-size: 13px; font-weight: 700; }
          .svc-meet__invite-search-wrap { padding: 10px 16px 0; flex-shrink: 0; }
          .svc-meet__search { width: 100%; height: 48px; border-radius: 14px; border: 0; padding: 0 14px; font-size: 16px; background: #222; color: #fff; outline: none; }
          .svc-meet__search::placeholder { color: #8a8a8a; }
          .svc-meet__invite-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 16px 8px; flex-shrink: 0; }
          .svc-meet__invite-tabs button { height: 42px; border: 0; border-radius: 12px; background: #222; color: #cfcfcf; font-size: 14px; font-weight: 700; }
          .svc-meet__invite-tabs button.is-on { background: #1f6b3a; color: #fff; }
          .svc-meet__invite-list { flex: 1; min-height: 0; overflow: auto; -webkit-overflow-scrolling: touch; padding: 4px 10px 12px; }
          .svc-meet__empty { color: #a3a3a3; font-size: 14px; text-align: center; padding: 28px 12px; margin: 0; }
          .svc-meet__person { width: 100%; display: flex; gap: 12px; align-items: center; padding: 12px; margin: 0 0 6px; color: #fff; font-size: 15px; text-align: left; background: #1c1c1c; border: 1px solid transparent; border-radius: 14px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
          .svc-meet__person.is-on { border-color: rgba(124,255,107,0.45); background: #1a2a1d; }
          .svc-meet__person.is-invited { opacity: 0.72; cursor: default; }
          .svc-meet__person:disabled { cursor: default; }
          .svc-meet__person-avatar { width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; background: #2d4a36; color: #dff5e4; font-size: 13px; font-weight: 800; letter-spacing: 0.02em; }
          .svc-meet__person-meta { flex: 1; min-width: 0; }
          .svc-meet__person strong { display: block; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .svc-meet__person em { display: block; color: #a8a8a8; font-style: normal; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
          .svc-meet__person-mark { flex-shrink: 0; min-width: 28px; text-align: right; font-size: 13px; font-weight: 800; color: #7CFF6B; }
          .svc-meet__person.is-invited .svc-meet__person-mark { color: #9ca3af; font-size: 12px; font-weight: 700; }
          .svc-meet__invite-foot { flex-shrink: 0; padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid rgba(255,255,255,0.08); background: #121212; }
          .svc-meet__invite-count { margin: 0 0 8px; color: #a3a3a3; font-size: 13px; font-weight: 600; text-align: center; }
          .svc-meet__invite-send { width: 100%; height: 50px; font-size: 16px; }
          .svc-meet__notice { color: #fff; font-size: 14px; font-weight: 700; margin: 0; padding: 8px 10px; background: rgba(31,107,58,0.35); border-radius: 10px; }
          @media (max-width: 700px) {
            .svc-meet__tile { aspect-ratio: auto; min-height: 42vh; }
            .svc-meet__grid { grid-template-columns: 1fr; }
            .svc-meet__invite { max-height: 94vh; border-radius: 20px 20px 0 0; }
          }
          @media (min-width: 701px) {
            .svc-meet__tile { aspect-ratio: 16 / 10; min-height: 280px; }
            .svc-meet__invite-sheet { align-items: center; padding: 24px; }
            .svc-meet__invite { border-radius: 18px; max-height: min(80vh, 720px); }
            .svc-meet__invite-handle { display: none; }
          }
        `}</style>
        <div ref={audioHost} style={{ display: 'none' }} />
        <div className="svc-meet__bar">
          <div className="svc-meet__title">
            {`Team Meeting ${meetingId}`}
            {hostName ? ` · ${hostName}` : ''}
            {phase === 'live' ? ` · ${clock}` : ''}
            {linkQuality ? ` · ${linkQuality}` : ''}
          </div>
          {phase === 'live' ? (
            <div className="svc-meet__bar-actions">
              {admin ? <button type="button" className="svc-meet__btn svc-meet__btn--dark" onClick={() => setShowInvite(true)}>Invite</button> : null}
              <button type="button" className="svc-meet__btn svc-meet__btn--dark" onClick={() => void navigator.clipboard.writeText(window.location.href).then(() => message.success('Meeting link copied')).catch(() => message.error('Could not copy the meeting link'))}>Copy</button>
            </div>
          ) : null}
        </div>
        <div className="svc-meet__stage">
          {phase === 'live' ? (
            <>
              <div className="svc-meet__floats">
                {floats.map((note) => <div className="svc-meet__float" key={note.id}>{note.emoji}</div>)}
              </div>
              {showPeople ? (
                <div className="svc-meet__panel">
                  {people.map((person) => (
                    <p className="svc-meet__chat-line" key={person.identity}>
                      <strong>{person.isLocal ? 'You' : (person.name || 'Someone')}</strong>
                      {hands.has(person.identity) ? 'Hand up' : person.isCameraEnabled ? 'Camera on' : 'Camera off'}
                      {person.isMicrophoneEnabled ? '' : ' · muted'}
                    </p>
                  ))}
                </div>
              ) : null}
              {showChat ? (
                <div className="svc-meet__panel">
                  <div className="svc-meet__chat-box">
                    {chatLines.length ? chatLines.map((line) => (
                      <p className="svc-meet__chat-line" key={line.id}><strong>{line.name}</strong>{line.text}</p>
                    )) : <p className="svc-meet__empty">No messages yet.</p>}
                  </div>
                  <form className="svc-meet__row" onSubmit={(event) => { event.preventDefault(); void sendChat(); }}>
                    <input value={chatText} placeholder="Message" onChange={(event) => setChatText(event.target.value)} />
                    <button type="submit" className="svc-meet__btn svc-meet__btn--green">Send</button>
                  </form>
                </div>
              ) : null}
              {notice ? <p className="svc-meet__notice" style={{ marginBottom: 8 }}>{notice}</p> : null}
              <div className="svc-meet__grid">
                {people.map((person) => {
                  const camera = person.getTrackPublication(Track.Source.Camera);
                  const share = person.getTrackPublication(Track.Source.ScreenShare);
                  const cameraTrack = (person.isLocal ? (camera?.track || selfVideo) : camera?.track) as Track | undefined;
                  const tiles = [
                    { key: person.identity, track: cameraTrack, share: false },
                    ...(share?.track ? [{ key: `${person.identity}:share`, track: share.track as Track, share: true }] : []),
                  ];
                  return tiles.map((tile) => {
                    const show = hasPicture(tile.track);
                    const cameraOff = !show && (tile.share || (person.isLocal ? !camOn : camera?.isMuted === true));
                    return (
                    <div className={speaking.has(person.identity) && !tile.share ? 'svc-meet__tile svc-meet__tile--speak' : 'svc-meet__tile'} key={tile.key}>
                      {show && tile.track ? (
                        <CameraPicture key={tile.track.mediaStreamTrack?.id || tile.key} track={tile.track} mirror={person.isLocal && !tile.share && facingUser} />
                      ) : cameraOff ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Camera off</p>
                        </div>
                      ) : null}
                      <div className="svc-meet__name">
                        {person.isLocal && !tile.share ? 'You' : (tile.share ? `${person.name || 'Someone'} · screen` : (person.name || 'Someone'))}
                        {hands.has(person.identity) && !tile.share ? ' · hand up' : ''}
                        {(person.isLocal ? micOn : person.isMicrophoneEnabled) || tile.share ? '' : ' · muted'}
                      </div>
                    </div>
                    );
                  });
                })}
              </div>
            </>
          ) : (
            <>
              <div className="svc-meet__wait">
                <button
                  type="button"
                  className="svc-meet__wait-close"
                  aria-label="Close"
                  title="Close"
                  onClick={() => {
                    if (phase === 'connecting') return;
                    history.push('/dashboard');
                  }}
                  disabled={phase === 'connecting'}
                >
                  <CloseOutlined />
                </button>
                <h2>{phase === 'connecting' ? 'Joining the meeting' : `Join Team Meeting ${meetingId}`}</h2>
                <p>{notice || 'Tap Join and allow the camera and microphone when the phone asks.'}</p>
                <button type="button" className="svc-meet__btn svc-meet__btn--green" onClick={() => void join()} disabled={phase === 'connecting'} style={{ width: '100%', fontSize: 18 }}>
                  {phase === 'connecting' ? 'Joining…' : 'Join'}
                </button>
                {admin ? (
                  <button type="button" className="svc-meet__btn svc-meet__btn--dark" onClick={() => setShowInvite(true)} style={{ width: '100%', marginTop: 10 }}>
                    Invite people
                  </button>
                ) : null}
                {admin ? (
                  <button type="button" className="svc-meet__btn svc-meet__btn--dark" onClick={() => void clearMeetings()} style={{ width: '100%', marginTop: 10 }}>
                    Clear all meetings
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
        {admin && showInvite ? (
          <InviteList meetingId={meetingId || ''} onClose={() => setShowInvite(false)} />
        ) : null}
        {phase === 'live' && showSettings ? (
          <div className="svc-meet__sheet" onClick={() => setShowSettings(false)}>
            <div className="svc-meet__sheet-card" onClick={(event) => event.stopPropagation()}>
              <p className="svc-meet__sheet-label">Meeting controls</p>
              <button type="button" className="svc-meet__btn svc-meet__btn--light" onClick={() => void toggleMic()}>{micOn ? 'Mute' : 'Unmute'}</button>
              <button type="button" className="svc-meet__btn svc-meet__btn--light" onClick={() => void toggleCam()}>{camOn ? 'Camera off' : 'Camera on'}</button>
              <button type="button" className="svc-meet__btn svc-meet__btn--light svc-meet__btn--wide" onClick={() => void flipCamera()}>Flip camera</button>
              {typeof navigator.mediaDevices?.getDisplayMedia === 'function' ? (
                <button type="button" className="svc-meet__btn svc-meet__btn--light" onClick={() => void toggleShare()}>{screenOn ? 'Stop share' : 'Share screen'}</button>
              ) : null}
              <button type="button" className="svc-meet__btn svc-meet__btn--light" onClick={toggleHand}>{handUp ? 'Lower hand' : 'Raise hand'}</button>
              <button type="button" className="svc-meet__btn svc-meet__btn--light" onClick={() => react('👏')}>Clap</button>
              <button type="button" className="svc-meet__btn svc-meet__btn--dark" onClick={() => { setShowPeople((open) => !open); setShowSettings(false); }}>
                People ({people.length})
              </button>
              <button type="button" className="svc-meet__btn svc-meet__btn--dark svc-meet__btn--wide" onClick={() => setShowSettings(false)}>Close</button>
            </div>
          </div>
        ) : null}
        {phase === 'live' ? (
          <div className="svc-meet__controls">
            {needsTap ? <button type="button" className="svc-meet__btn svc-meet__btn--green" onClick={() => void showVideo()}>Show video</button> : null}
            <button type="button" className="svc-meet__btn svc-meet__btn--light" onClick={() => react('👍')}>Like</button>
            <button type="button" className="svc-meet__btn svc-meet__btn--dark" onClick={() => setShowChat((open) => !open)}>Chat</button>
            <button type="button" className="svc-meet__btn svc-meet__btn--light" onClick={() => void flipCamera()}>Flip</button>
            <button type="button" className="svc-meet__btn svc-meet__btn--dark" onClick={() => setShowSettings((open) => !open)}>Settings</button>
            <button type="button" className={`svc-meet__btn ${isHost ? 'svc-meet__btn--danger' : 'svc-meet__btn--green'}`} onClick={() => void leave()}>{isHost ? 'End' : 'Leave'}</button>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default MeetingPage;
