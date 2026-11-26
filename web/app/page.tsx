"use client";

import { useEffect, useState } from "react";
import { Gauge } from "@/components/Gauge";
import { useGpsTrip, type GpsStatus } from "@/hooks/useGpsTrip";
import { formatDuration, MS_TO_KMH, MS_TO_MPH } from "@/lib/speed";
import { KM_PER_MILE, mpgToKmPerLiter, mpgToLitersPer100Km, parseMpg } from "@/lib/fuel";

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
  const miles = km / KM_PER_MILE;
  const fmt = (n: number) => (n < 10 ? n.toFixed(2) : n.toFixed(1));

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
        <Stat label="Trip" value={fmt(km)} unit="km" sub={`${fmt(miles)} mi`} />
        <Stat label="Time" value={formatDuration(elapsedMs)} sub="h:mm:ss" />
        <FuelCard />
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

function Stat({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

const MPG_KEY = "kmh.mpg";

/** Fuel economy: the driver types the MPG shown on the car's dashboard; we show km/L, MPG and L/100 km. */
function FuelCard() {
  const [mpg, setMpg] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      const saved = parseMpg(localStorage.getItem(MPG_KEY) ?? "");
      if (saved !== null) setMpg(saved);
    } catch {
      /* storage unavailable: start empty */
    }
  }, []);

  const open = () => {
    setDraft(mpg === null ? "" : String(mpg));
    setEditing(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseMpg(draft);
    setMpg(value);
    try {
      if (value === null) localStorage.removeItem(MPG_KEY);
      else localStorage.setItem(MPG_KEY, String(value));
    } catch {
      /* not saved between visits, still shown now */
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <form className="stat stat-fuel stat-edit" onSubmit={save}>
        <label className="stat-label" htmlFor="mpg-input">
          Car MPG
        </label>
        <input
          id="mpg-input"
          className="mpg-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="13.7"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
        <button className="mpg-done" type="submit">
          Done
        </button>
      </form>
    );
  }

  return (
    <button className="stat stat-fuel" onClick={open} aria-label="Enter the MPG shown on your car">
      <span className="stat-label">Fuel ✎</span>
      {mpg === null ? (
        <>
          <span className="stat-value stat-empty">Tap</span>
          <span className="stat-sub">enter MPG</span>
        </>
      ) : (
        <>
          <span className="stat-value">
            {mpgToKmPerLiter(mpg).toFixed(1)}
            <small>km/L</small>
          </span>
          <span className="stat-sub">{mpg} MPG</span>
          <span className="stat-sub">{mpgToLitersPer100Km(mpg).toFixed(1)} L/100 km</span>
        </>
      )}
    </button>
  );
}
