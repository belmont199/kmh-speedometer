/** Pure speed / trip math. No browser APIs here, so it can be unit-tested in Node. */

export const MS_TO_KMH = 3.6;
export const MS_TO_MPH = 2.2369362920544;

/** A single GPS reading, reduced to what the trip math needs. */
export interface Fix {
  lat: number;
  lon: number;
  /** Speed reported by the device in m/s, or null when the device gives none. */
  speed: number | null;
  /** Horizontal accuracy in meters. */
  accuracy: number;
  /** Timestamp in ms. */
  time: number;
}

export interface TripState {
  /** Smoothed current speed in m/s. */
  speed: number;
  maxSpeed: number;
  /** Distance travelled in meters. */
  distance: number;
  /** Time spent moving, in ms. */
  movingMs: number;
  last: Fix | null;
}

export const emptyTrip: TripState = { speed: 0, maxSpeed: 0, distance: 0, movingMs: 0, last: null };

/** Below this speed (m/s, about 2 km/h) the car is treated as standing still, which hides GPS jitter. */
export const STANDSTILL = 0.55;
/** Fixes less accurate than this (m) are not used for distance. */
export const MAX_ACCURACY = 35;
/** Gaps longer than this (ms) are not bridged, e.g. after a tunnel. */
export const MAX_GAP_MS = 15000;

export function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371008.8;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Fold one new GPS fix into the trip. */
export function addFix(state: TripState, fix: Fix): TripState {
  const prev = state.last;
  const dt = prev ? fix.time - prev.time : 0;
  if (prev && dt <= 0) return state; // duplicate or out-of-order fix
  // Without a device speed, very close fixes give a noisy distance/time spike: wait for the next one.
  const hasDeviceSpeed = fix.speed !== null && Number.isFinite(fix.speed) && fix.speed >= 0;
  if (prev && !hasDeviceSpeed && dt < 800) return state;

  const step = prev ? haversineMeters(prev, fix) : 0;
  const usableGap = prev !== null && dt <= MAX_GAP_MS;

  // Prefer the device's Doppler speed; fall back to distance over time.
  let raw: number;
  if (hasDeviceSpeed) raw = fix.speed as number;
  else if (usableGap) raw = step / (dt / 1000);
  else raw = 0;

  // Light smoothing: responsive, but steadier digits.
  const smoothed = prev ? state.speed * 0.35 + raw * 0.65 : raw;
  const speed = smoothed < STANDSTILL ? 0 : smoothed;

  const moving = raw >= STANDSTILL;
  const accurate = fix.accuracy <= MAX_ACCURACY;
  const countIt = usableGap && moving && accurate;

  return {
    speed,
    maxSpeed: accurate ? Math.max(state.maxSpeed, speed) : state.maxSpeed,
    distance: state.distance + (countIt ? step : 0),
    movingMs: state.movingMs + (countIt ? dt : 0),
    last: accurate || !prev ? fix : prev,
  };
}

/** Average moving speed in m/s. */
export function averageSpeed(state: TripState): number {
  return state.movingMs > 0 ? state.distance / (state.movingMs / 1000) : 0;
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
