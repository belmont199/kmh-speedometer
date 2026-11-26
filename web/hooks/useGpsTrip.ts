"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addFix, emptyTrip, type TripState } from "@/lib/speed";

export type GpsStatus = "idle" | "searching" | "live" | "weak" | "lost" | "denied" | "unsupported";

export interface GpsError {
  code: number;
  message: string;
}

const LOST_AFTER_MS = 10000;

export function useGpsTrip() {
  const [trip, setTrip] = useState<TripState>(emptyTrip);
  const [status, setStatus] = useState<GpsStatus>("idle");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<GpsError | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const watchId = useRef<number | null>(null);
  const lostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const startedAt = useRef<number | null>(null);
  const banked = useRef(0);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) wakeLock.current = await navigator.wakeLock.request("screen");
    } catch {
      /* not supported or refused: the screen may sleep */
    }
  }, []);

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    if (lostTimer.current) clearTimeout(lostTimer.current);
    if (startedAt.current !== null) banked.current += Date.now() - startedAt.current;
    startedAt.current = null;
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
    setStatus("idle");
    setTrip((t) => ({ ...t, speed: 0, last: null }));
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined" || !window.isSecureContext || !("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setError(null);
    setStatus("searching");
    startedAt.current = Date.now();
    requestWakeLock();

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (lostTimer.current) clearTimeout(lostTimer.current);
        lostTimer.current = setTimeout(() => {
          setStatus("lost");
          setTrip((t) => ({ ...t, speed: 0 }));
        }, LOST_AFTER_MS);

        const { latitude, longitude, speed, accuracy: acc } = pos.coords;
        setAccuracy(acc);
        setStatus(acc <= 35 ? "live" : "weak");
        setTrip((t) =>
          addFix(t, { lat: latitude, lon: longitude, speed, accuracy: acc, time: pos.timestamp || Date.now() }),
        );
      },
      (err) => {
        setError({ code: err.code, message: err.message || "" });
        if (err.code === err.PERMISSION_DENIED) {
          if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
          if (startedAt.current !== null) banked.current += Date.now() - startedAt.current;
          startedAt.current = null;
          setStatus("denied");
        } else {
          setStatus("searching");
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }, [requestWakeLock]);

  const reset = useCallback(() => {
    banked.current = 0;
    if (startedAt.current !== null) startedAt.current = Date.now();
    setElapsedMs(0);
    setTrip((t) => ({ ...emptyTrip, speed: t.speed, last: t.last }));
  }, []);

  // Trip clock.
  useEffect(() => {
    const id = setInterval(() => {
      setElapsedMs(banked.current + (startedAt.current !== null ? Date.now() - startedAt.current : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // The wake lock is dropped when the page is hidden; take it again on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && watchId.current !== null) requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [requestWakeLock]);

  useEffect(() => () => stop(), [stop]);

  const running = status !== "idle" && status !== "denied" && status !== "unsupported";
  return { trip, status, accuracy, error, elapsedMs, running, start, stop, reset };
}
