import {
  TRACKING_WATCH_MAX_AGE_MS,
  TRACKING_WATCH_TIMEOUT_MS,
} from "@/lib/tracking/constants";

export type BrowserLocationFix = {
  ok: true;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  recordedAt: number;
};

export type BrowserLocationFailure = {
  ok: false;
  reason: "denied" | "unavailable" | "timeout" | "unsupported";
};

export type BrowserLocationResult = BrowserLocationFix | BrowserLocationFailure;

export type WatchHandle = {
  stop: () => void;
};

function mapGeolocationError(error: GeolocationPositionError): BrowserLocationFailure["reason"] {
  if (error.code === error.PERMISSION_DENIED) {
    return "denied";
  }
  if (error.code === error.TIMEOUT) {
    return "timeout";
  }
  return "unavailable";
}

function fixFromPosition(position: GeolocationPosition): BrowserLocationFix {
  const { latitude, longitude, accuracy, heading, speed } = position.coords;
  return {
    ok: true,
    latitude,
    longitude,
    recordedAt: position.timestamp,
    ...(Number.isFinite(accuracy) ? { accuracy } : {}),
    ...(heading !== null && Number.isFinite(heading) ? { heading } : {}),
    ...(speed !== null && Number.isFinite(speed) && speed >= 0 ? { speed } : {}),
  };
}

export function readBrowserLocation(
  options: PositionOptions = {
    enableHighAccuracy: false,
    timeout: 10_000,
    maximumAge: 60_000,
  },
): Promise<BrowserLocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: "unsupported" });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(fixFromPosition(position));
      },
      (error) => {
        resolve({ ok: false, reason: mapGeolocationError(error) });
      },
      options,
    );
  });
}

export function watchBrowserLocation(
  onResult: (result: BrowserLocationResult) => void,
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: TRACKING_WATCH_TIMEOUT_MS,
    maximumAge: TRACKING_WATCH_MAX_AGE_MS,
  },
): WatchHandle {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onResult({ ok: false, reason: "unsupported" });
    return { stop() {} };
  }
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onResult(fixFromPosition(position));
    },
    (error) => {
      onResult({ ok: false, reason: mapGeolocationError(error) });
    },
    options,
  );
  return {
    stop() {
      navigator.geolocation.clearWatch(watchId);
    },
  };
}

export function geolocationMessage(reason: BrowserLocationFailure["reason"]) {
  if (reason === "denied") {
    return "Location permission was denied.";
  }
  if (reason === "timeout") {
    return "Could not read your location in time.";
  }
  if (reason === "unsupported") {
    return "This browser cannot share a location.";
  }
  return "Your location is unavailable.";
}
