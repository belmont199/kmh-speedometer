/** Weather from Open-Meteo (free, no key, CC BY 4.0) and a place name from BigDataCloud. Pure helpers only. */

export interface CurrentWeather {
  time: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  wind: number; // km/h
  precipitation: number; // mm
  code: number;
  isDay: boolean;
}

export interface HourWeather {
  time: string;
  temp: number;
  code: number;
  rainChance: number | null;
}

export interface DayWeather {
  date: string;
  max: number;
  min: number;
  code: number;
  rainChance: number | null;
  sunrise: string;
  sunset: string;
}

export interface Weather {
  fetchedAt: number;
  lat: number;
  lon: number;
  place: string | null;
  current: CurrentWeather;
  hours: HourWeather[];
  days: DayWeather[];
}

export function forecastUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day,precipitation",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    timezone: "auto",
    forecast_days: "7",
    wind_speed_unit: "kmh",
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

export function placeUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({ latitude: lat.toFixed(3), longitude: lon.toFixed(3), localityLanguage: "en" });
  return `https://api.bigdatacloud.net/data/reverse-geocode-client?${p}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export function parsePlace(json: Json): string | null {
  const city = json?.city || json?.locality || json?.principalSubdivision;
  const country = json?.countryName;
  if (!city && !country) return null;
  return [city, country].filter(Boolean).join(", ");
}

/** Turn an Open-Meteo response into our shape. Throws if it isn't one. */
export function parseForecast(json: Json, lat: number, lon: number, now = Date.now()): Omit<Weather, "place"> {
  if (!json || json.error || !json.current || !json.hourly || !json.daily) {
    throw new Error(json?.reason || "Unexpected weather response");
  }
  const c = json.current;
  const current: CurrentWeather = {
    time: c.time,
    temp: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    wind: c.wind_speed_10m,
    precipitation: c.precipitation ?? 0,
    code: c.weather_code,
    isDay: c.is_day === 1,
  };

  // The next 24 hours, starting with the hour that contains "now" (times are local, without offset).
  const h = json.hourly;
  const start = Math.max(0, (h.time as string[]).findIndex((t) => t.slice(0, 13) >= String(c.time).slice(0, 13)));
  const hours: HourWeather[] = (h.time as string[]).slice(start, start + 24).map((time, i) => ({
    time,
    temp: h.temperature_2m[start + i],
    code: h.weather_code[start + i],
    rainChance: h.precipitation_probability?.[start + i] ?? null,
  }));

  const d = json.daily;
  const days: DayWeather[] = (d.time as string[]).map((date, i) => ({
    date,
    max: d.temperature_2m_max[i],
    min: d.temperature_2m_min[i],
    code: d.weather_code[i],
    rainChance: d.precipitation_probability_max?.[i] ?? null,
    sunrise: d.sunrise[i],
    sunset: d.sunset[i],
  }));

  return { fetchedAt: now, lat, lon, current, hours, days };
}

/** WMO weather interpretation codes, as used by Open-Meteo. */
const CODES: Record<number, [string, string, string?]> = {
  0: ["Clear", "☀️", "🌙"],
  1: ["Mostly clear", "🌤️", "🌙"],
  2: ["Partly cloudy", "⛅", "☁️"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Icy fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Violent showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm, hail", "⛈️"],
  99: ["Thunderstorm, hail", "⛈️"],
};

export function describe(code: number, isDay = true): { label: string; icon: string } {
  const entry = CODES[code];
  if (!entry) return { label: "Unknown", icon: "🌡️" };
  const [label, day, night] = entry;
  return { label, icon: !isDay && night ? night : day };
}

/** Road-safety hint for the driver, or null. */
export function roadWarning(current: CurrentWeather): string | null {
  const icy = [56, 57, 66, 67].includes(current.code) || (current.temp <= 1 && current.precipitation > 0);
  if (icy) return "Possible ice on the road";
  if (current.temp <= 3) return "Near freezing: watch for ice";
  if ([45, 48].includes(current.code)) return "Fog: reduced visibility";
  if ([65, 82, 95, 96, 99].includes(current.code)) return "Heavy rain or storm";
  if ([73, 75, 86].includes(current.code)) return "Snow on the road";
  return null;
}

export const round = (n: number) => Math.round(n === 0 ? 0 : n) || 0;
