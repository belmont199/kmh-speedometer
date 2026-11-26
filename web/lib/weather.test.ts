import { test } from "node:test";
import assert from "node:assert/strict";
import { describe, forecastUrl, parseForecast, parsePlace, roadWarning, round } from "./weather.ts";

const sample = {
  current: {
    time: "2026-11-26T20:45",
    temperature_2m: 7.6,
    apparent_temperature: 4.9,
    relative_humidity_2m: 81,
    weather_code: 3,
    wind_speed_10m: 11.2,
    is_day: 0,
    precipitation: 0,
  },
  hourly: {
    time: ["2026-11-26T19:00", "2026-11-26T20:00", "2026-11-26T21:00", "2026-11-26T22:00"],
    temperature_2m: [8.1, 7.7, 7.2, 6.8],
    weather_code: [3, 3, 61, 61],
    precipitation_probability: [10, 15, 40, 55],
  },
  daily: {
    time: ["2026-11-26", "2026-11-27"],
    temperature_2m_max: [11.2, 9.4],
    temperature_2m_min: [4.1, 2.0],
    weather_code: [3, 63],
    precipitation_probability_max: [55, 80],
    sunrise: ["2026-11-26T07:48", "2026-11-27T07:49"],
    sunset: ["2026-11-26T17:15", "2026-11-27T17:15"],
  },
};

test("URL asks for metric weather with local time", () => {
  const u = new URL(forecastUrl(41.7151, 44.8271));
  assert.equal(u.hostname, "api.open-meteo.com");
  assert.equal(u.searchParams.get("latitude"), "41.715");
  assert.equal(u.searchParams.get("timezone"), "auto");
  assert.equal(u.searchParams.get("wind_speed_unit"), "kmh");
});

test("parses current, hourly from the current hour, and daily", () => {
  const w = parseForecast(sample, 41.7, 44.8, 123);
  assert.equal(w.current.temp, 7.6);
  assert.equal(w.current.isDay, false);
  assert.equal(w.hours[0].time, "2026-11-26T20:00");
  assert.equal(w.hours.length, 3);
  assert.equal(w.hours[1].rainChance, 40);
  assert.equal(w.days[1].min, 2.0);
  assert.equal(w.fetchedAt, 123);
});

test("rejects an error response", () => {
  assert.throws(() => parseForecast({ error: true, reason: "limit" }, 0, 0), /limit/);
});

test("place name", () => {
  assert.equal(parsePlace({ city: "Tbilisi", countryName: "Georgia" }), "Tbilisi, Georgia");
  assert.equal(parsePlace({ locality: "Mtskheta", countryName: "Georgia" }), "Mtskheta, Georgia");
  assert.equal(parsePlace({}), null);
});

test("weather codes and road warnings", () => {
  assert.equal(describe(0, false).icon, "🌙");
  assert.equal(describe(63).label, "Rain");
  assert.equal(describe(1234).label, "Unknown");
  assert.equal(roadWarning({ ...parseForecast(sample, 0, 0).current, temp: 0.5, precipitation: 0.3 }), "Possible ice on the road");
  assert.equal(roadWarning(parseForecast(sample, 0, 0).current), null);
  assert.equal(round(-0.4), 0);
});
