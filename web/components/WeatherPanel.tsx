"use client";

import { useEffect } from "react";
import { describe, roadWarning, round, type Weather } from "@/lib/weather";

interface Props {
  weather: Weather | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onClose: () => void;
}

const hourOf = (t: string) => t.slice(11, 16);
const clock = (t: string) => t.slice(11, 16);
const dayName = (date: string, i: number) =>
  i === 0 ? "Today" : new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short" });
const isDayAt = (t: string, w: Weather) => {
  const d = w.days.find((x) => x.date === t.slice(0, 10));
  return d ? t >= d.sunrise && t < d.sunset : true;
};

function updatedAgo(ms: number) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : "over a day ago";
}

export function WeatherPanel({ weather, loading, error, onRefresh, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const now = weather ? describe(weather.current.code, weather.current.isDay) : null;
  const warning = weather ? roadWarning(weather.current) : null;
  const weekMin = weather ? Math.min(...weather.days.map((d) => d.min)) : 0;
  const weekMax = weather ? Math.max(...weather.days.map((d) => d.max)) : 1;
  const span = Math.max(1, weekMax - weekMin);

  return (
    <div className="wx" role="dialog" aria-modal="true" aria-label="Weather">
      <header className="wx-top">
        <div className="wx-place">
          <strong>{weather?.place ?? (weather ? "Your location" : "Weather")}</strong>
          <span>
            {loading ? "Updating…" : weather ? `Updated ${updatedAgo(weather.fetchedAt)}` : ""}
          </span>
        </div>
        <button className="wx-icon-btn" onClick={onRefresh} aria-label="Refresh weather" disabled={loading}>
          ↻
        </button>
        <button className="wx-icon-btn" onClick={onClose} aria-label="Close weather">
          ✕
        </button>
      </header>

      {error && <p className="wx-error">{error}</p>}

      {!weather && !error && <p className="wx-empty">{loading ? "Finding your location…" : "No weather yet."}</p>}

      {weather && now && (
        <div className="wx-body">
          <div className="wx-col">
          <section className="wx-now">
            <div className="wx-now-icon" aria-hidden="true">
              {now.icon}
            </div>
            <div className="wx-now-temp">
              {round(weather.current.temp)}
              <span>°C</span>
            </div>
            <div className="wx-now-label">{now.label}</div>
            <div className="wx-now-range">
              Feels like {round(weather.current.feelsLike)}° · H {round(weather.days[0].max)}° L{" "}
              {round(weather.days[0].min)}°
            </div>
          </section>

          {warning && <div className="wx-warning">⚠️ {warning}</div>}

          <section className="wx-metrics">
            <Metric label="Humidity" value={`${round(weather.current.humidity)}%`} />
            <Metric label="Wind" value={`${round(weather.current.wind)} km/h`} />
            <Metric label="Rain" value={weather.days[0].rainChance === null ? "—" : `${weather.days[0].rainChance}%`} />
            <Metric label="Sunset" value={clock(weather.days[0].sunset)} />
          </section>
          </div>

          <div className="wx-col">
          <section className="wx-card">
            <h3>Next 24 hours</h3>
            <div className="wx-hours">
              {weather.hours.map((h, i) => {
                const d = describe(h.code, isDayAt(h.time, weather));
                return (
                  <div className="wx-hour" key={h.time}>
                    <span className="wx-hour-time">{i === 0 ? "Now" : hourOf(h.time)}</span>
                    <span className="wx-hour-icon" aria-label={d.label}>
                      {d.icon}
                    </span>
                    <span className="wx-hour-temp">{round(h.temp)}°</span>
                    <span className="wx-hour-rain">{h.rainChance ? `${h.rainChance}%` : ""}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="wx-card">
            <h3>7 days</h3>
            <ul className="wx-days">
              {weather.days.map((d, i) => {
                const info = describe(d.code);
                return (
                  <li key={d.date}>
                    <span className="wx-day-name">{dayName(d.date, i)}</span>
                    <span className="wx-day-icon" aria-label={info.label}>
                      {info.icon}
                    </span>
                    <span className="wx-day-rain">{d.rainChance ? `${d.rainChance}%` : ""}</span>
                    <span className="wx-day-min">{round(d.min)}°</span>
                    <span className="wx-bar" aria-hidden="true">
                      <span
                        style={{
                          left: `${((d.min - weekMin) / span) * 100}%`,
                          right: `${((weekMax - d.max) / span) * 100}%`,
                        }}
                      />
                    </span>
                    <span className="wx-day-max">{round(d.max)}°</span>
                  </li>
                );
              })}
            </ul>
          </section>
          </div>

          <p className="wx-credit">
            Weather data by{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo.com
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="wx-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
