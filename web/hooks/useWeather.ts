"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { forecastUrl, parseForecast, parsePlace, placeUrl, type Weather } from "@/lib/weather";
import { haversineMeters } from "@/lib/speed";

const CACHE_KEY = "kmh.weather";
const STALE_MS = 15 * 60 * 1000; // refresh every 15 minutes
const MOVED_M = 10000; // or after driving 10 km

function loadCache(): Weather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Weather) : null;
  } catch {
    return null;
  }
}

function saveCache(w: Weather) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(w));
  } catch {
    /* fine: it just won't survive a reload */
  }
}

/** Weather for where the car is. `fix` is the latest GPS position from the speedometer, if it's running. */
export function useWeather(fix: { lat: number; lon: number } | null) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const lastPos = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    const cached = loadCache();
    if (cached) setWeather(cached);
  }, []);

  const fetchFor = useCallback(async (lat: number, lon: number) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const [forecastRes, placeRes] = await Promise.allSettled([
        fetch(forecastUrl(lat, lon)).then((r) => r.json()),
        fetch(placeUrl(lat, lon)).then((r) => r.json()),
      ]);
      if (forecastRes.status === "rejected") throw new Error("No internet connection");
      const base = parseForecast(forecastRes.value, lat, lon);
      const place = placeRes.status === "fulfilled" ? parsePlace(placeRes.value) : null;
      const next: Weather = { ...base, place };
      setWeather(next);
      saveCache(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Weather unavailable");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);

  const needsUpdate = useCallback(
    (lat: number, lon: number, w: Weather | null) =>
      !w || Date.now() - w.fetchedAt > STALE_MS || haversineMeters({ lat, lon }, { lat: w.lat, lon: w.lon }) > MOVED_M,
    [],
  );

  // Follow the speedometer's GPS while it runs.
  useEffect(() => {
    if (!fix) return;
    lastPos.current = fix;
    if (needsUpdate(fix.lat, fix.lon, weather)) fetchFor(fix.lat, fix.lon);
  }, [fix, weather, needsUpdate, fetchFor]);

  /** Refresh now; asks for location if the speedometer isn't running. */
  const refresh = useCallback(
    (force = false) => {
      const pos = lastPos.current;
      if (pos) {
        if (force || needsUpdate(pos.lat, pos.lon, weather)) fetchFor(pos.lat, pos.lon);
        return;
      }
      if (!("geolocation" in navigator)) {
        setError("Location isn't available in this browser");
        return;
      }
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (p) => {
          lastPos.current = { lat: p.coords.latitude, lon: p.coords.longitude };
          setLoading(false);
          if (force || needsUpdate(p.coords.latitude, p.coords.longitude, weather))
            fetchFor(p.coords.latitude, p.coords.longitude);
        },
        (err) => {
          setLoading(false);
          setError(err.code === 1 ? "Location is blocked, so weather can't find you" : "Couldn't get your location");
        },
        { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 20000 },
      );
    },
    [weather, needsUpdate, fetchFor],
  );

  return { weather, loading, error, refresh };
}
