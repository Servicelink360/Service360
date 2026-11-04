/**
 * Meeting flip regression checks.
 *
 * Root cause of "flips to rear once, never back to front":
 * LiveKit LocalTrack.restart({ facingMode }) builds
 *   video: { deviceId: undefined, facingMode }
 * iOS Safari treats that badly after the first lens switch.
 *
 * Fix path: restartTrack, but intercept getUserMedia → openFacingSimple
 * (stop old lens first is done inside LiveKit.restart before that call).
 */

function phone({ exactFails, blockAfterGesture, stickyDeviceId }) {
  let gesture = true;
  let currentFacing = 'user';
  let deviceSeq = 1;
  let liveTrack = null;
  const calls = [];
  return {
    calls,
    expire() {
      gesture = false;
    },
    stopLive() {
      if (liveTrack) liveTrack.readyState = 'ended';
      liveTrack = null;
    },
    async getUserMedia(constraints) {
      calls.push({ gesture, constraints: JSON.parse(JSON.stringify(constraints)) });
      if (!gesture && blockAfterGesture) {
        const error = new Error('The request is not allowed by the user agent.');
        error.name = 'NotAllowedError';
        throw error;
      }
      const video = constraints.video || {};
      const askedFacing = (() => {
        const mode = video.facingMode;
        if (!mode) return '';
        if (typeof mode === 'string') return mode;
        return mode.exact || mode.ideal || '';
      })();
      // Simulate LiveKit restart bug: undefined deviceId + facingMode sticks on rear after first flip.
      if (Object.prototype.hasOwnProperty.call(video, 'deviceId') && video.deviceId == null && askedFacing) {
        if (currentFacing === 'environment' && askedFacing === 'user' && stickyDeviceId) {
          return {
            getVideoTracks() {
              return [{
                getSettings: () => ({ facingMode: 'environment', deviceId: 'rear-1' }),
                readyState: 'live',
                stop() {},
              }];
            },
            getTracks() {
              return this.getVideoTracks();
            },
          };
        }
      }
      // Concurrent open while another lens is live: soft facingMode returns the same camera.
      if (liveTrack && liveTrack.readyState === 'live' && askedFacing && !video.deviceId) {
        const mode = currentFacing;
        return {
          getVideoTracks() {
            return [{
              getSettings: () => ({ facingMode: mode, deviceId: `stuck-${mode}` }),
              readyState: 'live',
              stop() {},
            }];
          },
          getTracks() {
            return this.getVideoTracks();
          },
        };
      }
      if (video.facingMode && typeof video.facingMode === 'object' && video.facingMode.exact && exactFails) {
        const error = new Error('Overconstrained');
        error.name = 'OverconstrainedError';
        throw error;
      }
      const mode = askedFacing || 'user';
      currentFacing = mode;
      const deviceId = mode === 'user' ? `front-${deviceSeq++}` : `rear-${deviceSeq++}`;
      const track = {
        getSettings: () => ({ facingMode: mode, deviceId }),
        readyState: 'live',
        stop() {
          this.readyState = 'ended';
        },
      };
      liveTrack = track;
      return {
        getVideoTracks() {
          return [track];
        },
        getTracks() {
          return this.getVideoTracks();
        },
      };
    },
  };
}

async function openFacingSimple(media, facing) {
  const attempts = [
    { audio: false, video: { facingMode: { ideal: facing } } },
    { audio: false, video: { facingMode: { exact: facing } } },
    { audio: false, video: { facingMode: facing } },
  ];
  let lastError;
  for (const constraints of attempts) {
    try {
      return await media.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/** Broken LiveKit restart shape */
async function livekitRestartShape(media, facing) {
  return media.getUserMedia({
    audio: false,
    video: { deviceId: undefined, facingMode: { ideal: facing } },
  });
}

/**
 * Meeting fix: stop old lens inside the tap (sync), then openFacingSimple.
 * LiveKit.restartTrack awaits a mutex first — that drops the iOS gesture on re-flip.
 */
async function flipLikeMeeting(media, facing) {
  media.stopLive();
  return openFacingSimple(media, facing);
}

const sticky = phone({ exactFails: false, blockAfterGesture: false, stickyDeviceId: true });
await sticky.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
const stuck = await livekitRestartShape(sticky, 'user');
const stuckMode = stuck.getVideoTracks()[0].getSettings().facingMode;
if (stuckMode !== 'environment') {
  console.error('FAIL expected LiveKit restart shape to stick on rear when simulating iOS bug', stuckMode);
  process.exit(1);
}

const concurrent = phone({ exactFails: false, blockAfterGesture: false, stickyDeviceId: false });
await concurrent.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
const sameLens = await concurrent.getUserMedia({ audio: false, video: { facingMode: { ideal: 'user' } } });
if (sameLens.getVideoTracks()[0].getSettings().facingMode !== 'environment') {
  console.error('FAIL concurrent open should stick on the live lens');
  process.exit(1);
}

const working = phone({ exactFails: true, blockAfterGesture: true, stickyDeviceId: false });
working.expire();
let delayedRejected = false;
try {
  await new Promise((r) => setTimeout(r, 20));
  await openFacingSimple(working, 'environment');
} catch (error) {
  delayedRejected = error.name === 'NotAllowedError';
}
if (!delayedRejected) {
  console.error('FAIL delayed flip should be rejected once the tap has expired');
  process.exit(1);
}

const ok = phone({ exactFails: true, blockAfterGesture: false, stickyDeviceId: false });
await ok.getUserMedia({ audio: false, video: { facingMode: { ideal: 'user' } } });
const rear = await flipLikeMeeting(ok, 'environment');
const front = await flipLikeMeeting(ok, 'user');
const rearAgain = await flipLikeMeeting(ok, 'environment');
const rearMode = rear.getVideoTracks()[0].getSettings().facingMode;
const frontMode = front.getVideoTracks()[0].getSettings().facingMode;
const rearAgainMode = rearAgain.getVideoTracks()[0].getSettings().facingMode;
const cleanConstraints = ok.calls.every((call) => !Object.prototype.hasOwnProperty.call(call.constraints.video || {}, 'deviceId'));

if (rearMode !== 'environment' || frontMode !== 'user' || rearAgainMode !== 'environment' || !cleanConstraints) {
  console.error('FAIL stop-then-openFacingSimple did not re-flip both ways', {
    rearMode,
    frontMode,
    rearAgainMode,
    cleanConstraints,
    calls: ok.calls,
  });
  process.exit(1);
}

console.log('PASS flip smoke: LiveKit restart shape sticks; concurrent open sticks; stop+openFacingSimple re-flips repeatedly');
