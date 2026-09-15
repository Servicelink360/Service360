/** Returns "lat,lng" from browser geolocation, or null if unavailable. */
export type GeolocationResult = {
  location: string | null;
  error?: string;
};

export function getStaffLocationDetailed(): Promise<GeolocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ location: null, error: 'GPS is not supported on this device.' });
      return;
    }
    // Browsers block geolocation on insecure origins (except localhost).
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      resolve({
        location: null,
        error:
          'GPS needs a secure connection (HTTPS). Open the app via https://, not http:// on the phone.',
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          location: `${pos.coords.latitude},${pos.coords.longitude}`,
        }),
      (err) => {
        let error = 'Could not get GPS location.';
        if (err?.code === 1) {
          error =
            'Location permission denied. In phone Settings, allow Location for Safari/Chrome, then try Capture again.';
        } else if (err?.code === 2) {
          error = 'Location unavailable. Turn on Location Services / GPS and try again.';
        } else if (err?.code === 3) {
          error = 'GPS timed out. Move outdoors or near a window and try again.';
        }
        resolve({ location: null, error });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  });
}

/** Returns "lat,lng" from browser geolocation, or null if unavailable. */
export function getStaffLocation(): Promise<string | null> {
  return getStaffLocationDetailed().then((r) => r.location);
}
