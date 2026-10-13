import Layout from '@app/components/layout/Layout';
import endPoint from '@app/constants/endPoint';
import serviceType from '@app/constants/serviceType';
import { callAPIAsync } from '@app/library/helpers/api';
import { userType } from '@app/constants/statusUser';
import { message } from 'antd';
import {
  LocalAudioTrack,
  LocalVideoTrack,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';

type Tile = {
  id: string;
  name: string;
  micOn: boolean;
  camOn: boolean;
  local: boolean;
};

type Phase = 'ready' | 'connecting' | 'live' | 'error';

type Person = {
  id: number;
  name: string;
  email: string;
  type: number;
  invited: boolean;
};

function profileType() {
  try {
    const raw = localStorage.getItem('profile');
    return raw ? +JSON.parse(raw).type : 0;
  } catch {
    return 0;
  }
}

function InviteList({ meetingId }: { meetingId: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.MEETINGS_PEOPLE, 'GET', { id: meetingId });
      if (!cancelled && res?.code === 1 && Array.isArray(res.data)) {
        setPeople(res.data.map((row: Person) => ({ ...row, invited: !!row.invited })));
      }
    })();
    return () => { cancelled = true; };
  }, [meetingId]);

  const needle = query.trim().toLowerCase();
  const visible = people.filter((person) => {
    if (!needle) return true;
    return `${person.name} ${person.email}`.toLowerCase().includes(needle);
  });
  const staff = visible.filter((person) => +person.type === userType.STAFF);
  const clients = visible.filter((person) => +person.type === userType.CUSTOMER);

  const toggle = (id: number) => {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const send = async () => {
    if (!picked.length || sending) return;
    setSending(true);
    try {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.MEETINGS_INVITE, 'POST', {
        id: meetingId,
        userIds: picked,
      });
      if (res?.code !== 1) {
        message.error(res?.message || 'Could not send the invitation');
        return;
      }
      const sent = new Set(picked);
      setPeople((current) => current.map((person) => (
        sent.has(+person.id) ? { ...person, invited: true } : person
      )));
      setPicked([]);
      message.success(res?.message || 'Invitation sent');
    } finally {
      setSending(false);
    }
  };

  const group = (title: string, rows: Person[]) => (
    <div className="svc-meet__group">
      <div className="svc-meet__group-title">{title}</div>
      {rows.length ? rows.map((person) => (
        <label className="svc-meet__person" key={person.id}>
          <input
            type="checkbox"
            checked={picked.includes(+person.id) || person.invited}
            disabled={person.invited}
            onChange={() => toggle(+person.id)}
          />
          <span>
            <strong>{person.name}</strong>
            {person.email ? <em>{person.email}</em> : null}
            {person.invited ? <em>Invited</em> : null}
          </span>
        </label>
      )) : <p className="svc-meet__empty">None in this list.</p>}
    </div>
  );

  return (
    <div className="svc-meet__invite">
      <h2>Invite from the list</h2>
      <p>Choose staff or clients. They will see the meeting on their dashboard.</p>
      <input
        className="svc-meet__search"
        value={query}
        placeholder="Search name or email"
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="svc-meet__groups">
        {group('Staff', staff)}
        {group('Clients', clients)}
      </div>
      <button
        type="button"
        className="svc-meet__btn svc-meet__btn--green"
        onClick={() => void send()}
        disabled={sending || !picked.length}
      >
        {sending ? 'Sending…' : 'Send invitation'}
      </button>
    </div>
  );
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

const MeetingPage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const history = useHistory();
  const roomRef = useRef<Room | null>(null);
  const videoHosts = useRef<Record<string, HTMLDivElement | null>>({});
  const audioHost = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [notice, setNotice] = useState('');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const admin = profileType() === userType.ADMIN;

  const paintTiles = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const people = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
    setTiles(people.map((person) => ({
      id: person.identity,
      name: person.name || person.identity,
      micOn: person.isMicrophoneEnabled,
      camOn: person.isCameraEnabled,
      local: person.isLocal,
    })));
  }, []);

  const attachMedia = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const people = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
    people.forEach((person) => {
      const host = videoHosts.current[person.identity];
      if (!host) return;
      const publication = person.getTrackPublication(Track.Source.Camera);
      const track = publication?.track;
      host.replaceChildren();
      if (!track || publication.isMuted) return;
      const el = track.attach() as HTMLVideoElement;
      el.autoplay = true;
      el.playsInline = true;
      el.muted = true;
      host.appendChild(el);
    });
  }, []);

  useEffect(() => {
    if (phase === 'live') attachMedia();
  }, [tiles, phase, attachMedia]);

  useEffect(() => () => {
    const room = roomRef.current;
    roomRef.current = null;
    room?.disconnect();
  }, []);

  const join = async () => {
    if (!meetingId || phase === 'connecting') return;
    setPhase('connecting');
    setNotice('');
    let stream: MediaStream | null = null;
    let withCamera = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (error: any) {
      const blocked = cameraErrorText(error);
      if (blocked) {
        setPhase('error');
        setNotice(blocked);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        withCamera = false;
        setCamOn(false);
        message.warning('No camera was found. You are joining with the microphone.');
      } catch (audioError: any) {
        setPhase('error');
        setNotice(cameraErrorText(audioError) || 'Allow the microphone to join this meeting.');
        return;
      }
    }

    try {
      const res = await callAPIAsync(serviceType.COMMON, endPoint.MEETINGS_JOIN, 'POST', { id: meetingId });
      if (res?.code !== 1 || !res?.data?.token || !res?.data?.url) {
        stream.getTracks().forEach((track) => track.stop());
        setPhase('error');
        setNotice(res?.message || 'Could not join the meeting');
        return;
      }
      const room = new Room();
      roomRef.current = room;
      const onChange = () => paintTiles();
      room.on(RoomEvent.ParticipantConnected, onChange);
      room.on(RoomEvent.ParticipantDisconnected, onChange);
      room.on(RoomEvent.TrackMuted, onChange);
      room.on(RoomEvent.TrackUnmuted, onChange);
      room.on(RoomEvent.LocalTrackPublished, onChange);
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio && audioHost.current) {
          const el = track.attach();
          audioHost.current.appendChild(el);
        }
        onChange();
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
        onChange();
      });
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current === room) setPhase('ready');
      });
      await room.connect(res.data.url, res.data.token);
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (videoTrack) {
        await room.localParticipant.publishTrack(new LocalVideoTrack(videoTrack), {
          source: Track.Source.Camera,
        });
      }
      if (audioTrack) {
        await room.localParticipant.publishTrack(new LocalAudioTrack(audioTrack), {
          source: Track.Source.Microphone,
        });
      }
      setMicOn(true);
      setCamOn(withCamera);
      setPhase('live');
      paintTiles();
    } catch (error: any) {
      stream.getTracks().forEach((track) => track.stop());
      roomRef.current?.disconnect();
      roomRef.current = null;
      setPhase('error');
      setNotice(error?.message || 'Could not connect the camera');
    }
  };

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
    paintTiles();
  };

  const toggleCam = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !camOn;
    try {
      await room.localParticipant.setCameraEnabled(next);
      setCamOn(next);
      paintTiles();
    } catch (error: any) {
      message.error(cameraErrorText(error) || 'Could not switch the camera');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      message.success('Meeting link copied');
    } catch {
      message.error('Could not copy the meeting link');
    }
  };

  const leave = () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    history.push('/');
  };

  return (
    <Layout title="Meeting">
      <div className="svc-meet">
        <style>{`
          .svc-meet { min-height: calc(100vh - 120px); background: #111; color: #fff; border-radius: 12px; display: flex; flex-direction: column; }
          .svc-meet__bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; }
          .svc-meet__title { font-size: 18px; font-weight: 700; }
          .svc-meet__stage { flex: 1; display: flex; align-items: center; justify-content: center; padding: 12px 18px 24px; }
          .svc-meet__grid { width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
          .svc-meet__tile { position: relative; background: #1c1c1c; border-radius: 12px; min-height: 220px; overflow: hidden; }
          .svc-meet__video { position: absolute; inset: 0; }
          .svc-meet__video video { width: 100%; height: 100%; object-fit: cover; }
          .svc-meet__name { position: absolute; left: 10px; bottom: 10px; background: rgba(0,0,0,0.55); border-radius: 8px; padding: 4px 8px; font-size: 14px; font-weight: 600; }
          .svc-meet__wait { max-width: 460px; text-align: center; }
          .svc-meet__wait h2 { color: #fff; font-size: 22px; margin-bottom: 8px; }
          .svc-meet__wait p { color: #d7d7d7; font-size: 16px; line-height: 1.45; }
          .svc-meet__btn { height: 48px; padding: 0 18px; border-radius: 10px; border: 0; font-size: 16px; font-weight: 700; cursor: pointer; }
          .svc-meet__btn--light { background: #fff; color: #143d24; }
          .svc-meet__btn--green { background: #1f6b3a; color: #fff; }
          .svc-meet__btn--dark { background: #2a2a2a; color: #fff; }
          .svc-meet__btn:disabled { opacity: 0.6; cursor: default; }
          .svc-meet__controls { display: flex; gap: 10px; justify-content: center; padding: 0 18px 18px; flex-wrap: wrap; }
          .svc-meet__invite { width: min(720px, 100%); text-align: left; background: #1c1c1c; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
          .svc-meet__invite h2 { color: #fff; font-size: 20px; margin: 0 0 6px; }
          .svc-meet__invite p, .svc-meet__empty { color: #d7d7d7; font-size: 15px; }
          .svc-meet__search { width: 100%; height: 44px; border-radius: 10px; border: 0; padding: 0 12px; font-size: 16px; margin: 8px 0 12px; }
          .svc-meet__groups { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-height: 320px; overflow: auto; }
          .svc-meet__group-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
          .svc-meet__person { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; color: #fff; font-size: 15px; }
          .svc-meet__person input { width: 18px; height: 18px; margin-top: 3px; }
          .svc-meet__person strong { display: block; font-weight: 700; }
          .svc-meet__person em { display: block; color: #c8c8c8; font-style: normal; font-size: 13px; }
          @media (max-width: 700px) { .svc-meet__groups { grid-template-columns: 1fr; } }
        `}</style>
        <div ref={audioHost} style={{ display: 'none' }} />
        <div className="svc-meet__bar">
          <div className="svc-meet__title">Meeting</div>
          {phase === 'live' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {admin ? (
                <button type="button" className="svc-meet__btn svc-meet__btn--dark" onClick={() => setShowInvite((open) => !open)}>
                  Invite
                </button>
              ) : null}
              <button type="button" className="svc-meet__btn svc-meet__btn--dark" onClick={() => void copyLink()}>
                Copy link
              </button>
            </div>
          ) : null}
        </div>
        <div className="svc-meet__stage" style={admin && phase !== 'live' ? { alignItems: 'stretch', flexDirection: 'column' } : undefined}>
          {admin && (phase !== 'live' || showInvite) ? <InviteList meetingId={meetingId || ''} /> : null}
          {phase === 'live' ? (
            <div className="svc-meet__grid">
              {tiles.map((tile) => (
                <div className="svc-meet__tile" key={tile.id}>
                  <div
                    className="svc-meet__video"
                    ref={(node) => { videoHosts.current[tile.id] = node; }}
                  />
                  {!tile.camOn ? (
                    <div className="svc-meet__wait" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p>Camera off</p>
                    </div>
                  ) : null}
                  <div className="svc-meet__name">
                    {tile.local ? 'You' : tile.name}
                    {tile.micOn ? '' : ' · muted'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="svc-meet__wait">
              <h2>Join with your camera</h2>
              <p>
                On a desktop, Chrome, Edge, Firefox, and Safari use the computer webcam.
                The browser will ask you to allow the camera and microphone.
              </p>
              {notice ? <p>{notice}</p> : null}
              <button
                type="button"
                className="svc-meet__btn svc-meet__btn--green"
                onClick={() => void join()}
                disabled={phase === 'connecting'}
              >
                {phase === 'connecting' ? 'Opening the camera…' : 'Join'}
              </button>
            </div>
          )}
        </div>
        {phase === 'live' ? (
          <div className="svc-meet__controls">
            <button type="button" className="svc-meet__btn svc-meet__btn--light" onClick={() => void toggleMic()}>
              {micOn ? 'Mute' : 'Unmute'}
            </button>
            <button type="button" className="svc-meet__btn svc-meet__btn--light" onClick={() => void toggleCam()}>
              {camOn ? 'Camera off' : 'Camera on'}
            </button>
            <button type="button" className="svc-meet__btn svc-meet__btn--green" onClick={leave}>
              Leave
            </button>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default MeetingPage;
