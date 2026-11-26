"use client";

import { useState } from "react";
import { Gauge } from "@/components/Gauge";
import { useGpsTrip, type GpsStatus } from "@/hooks/useGpsTrip";
import { averageSpeed, formatDuration, MS_TO_KMH, MS_TO_MPH } from "@/lib/speed";

const STATUS_TEXT: Record<GpsStatus, string> = {
  idle: "Ready",
  searching: "Searching GPS…",
  live: "GPS",
  weak: "Weak GPS",
  lost: "GPS lost",
  denied: "Location blocked",
  unsupported: "Not supported",
};

export default function Home() {
  const { trip, status, accuracy, error, elapsedMs, running, start, stop, reset } = useGpsTrip();
  const [hud, setHud] = useState(false);

  const kmh = trip.speed * MS_TO_KMH;
  const shown = status === "live" || status === "weak" ? Math.round(kmh) : null;
  const mph = Math.round(trip.speed * MS_TO_MPH);
  const km = trip.distance / 1000;

  return (
    <main className={hud ? "app hud" : "app"}>
      <header className="topbar">
        <span className={`pill pill-${status}`}>
          <span className="dot" />
          {STATUS_TEXT[status]}
          {accuracy !== null && (status === "live" || status === "weak") && ` ±${Math.round(accuracy)} m`}
        </span>
        <button
          className={hud ? "chip chip-on" : "chip"}
          onClick={() => setHud((h) => !h)}
          aria-pressed={hud}
          title="Mirror the display so it reads correctly as a reflection in the windshield"
        >
          HUD
        </button>
      </header>

      <section className="speed">
        <Gauge kmh={shown ?? 0}>
          <div className={shown === null ? "digits digits-empty" : "digits"} aria-live="polite">
            {shown ?? "--"}
          </div>
          <div className="unit">km/h</div>
          <div className="mph">{shown === null ? "— mph" : `${mph} mph`}</div>
        </Gauge>
      </section>

      <section className="stats" aria-label="Trip">
        <Stat label="Trip" value={km < 10 ? km.toFixed(2) : km.toFixed(1)} unit="km" />
        <Stat label="Time" value={formatDuration(elapsedMs)} />
        <Stat label="Avg" value={String(Math.round(averageSpeed(trip) * MS_TO_KMH))} unit="km/h" />
        <Stat label="Max" value={String(Math.round(trip.maxSpeed * MS_TO_KMH))} unit="km/h" />
      </section>

      {status === "denied" && (
        <section className="help" role="alert">
          <strong>Location is blocked{error ? ` (code ${error.code})` : ""}.</strong>
          <ol>
            <li>Settings → Privacy &amp; Security → Location Services → <b>Safari Websites</b> → While Using the App, Precise on.</li>
            <li>In Safari, tap ☰ in the address bar → Website Settings → Location → Allow.</li>
            <li>Close this tab, open the page again, and tap Start.</li>
          </ol>
          {error?.message && <small>Browser says: {error.message}</small>}
        </section>
      )}
      {status === "unsupported" && (
        <section className="help" role="alert">
          <strong>This browser can’t read GPS here.</strong> Open the page in Safari or Chrome over https.
        </section>
      )}

      <footer className="controls">
        {running ? (
          <button className="btn btn-stop" onClick={stop}>
            Stop
          </button>
        ) : (
          <button className="btn btn-start" onClick={start}>
            Start
          </button>
        )}
        <button className="btn btn-ghost" onClick={reset} disabled={trip.distance === 0 && elapsedMs === 0}>
          Reset trip
        </button>
      </footer>
    </main>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
    </div>
  );
}
