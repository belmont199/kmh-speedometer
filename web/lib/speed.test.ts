import { test } from "node:test";
import assert from "node:assert/strict";
import { addFix, averageSpeed, emptyTrip, formatDuration, haversineMeters, MS_TO_KMH, MS_TO_MPH, type Fix } from "./speed.ts";

test("unit factors", () => {
  assert.equal(Math.round(20 / MS_TO_MPH * MS_TO_KMH), 32); // 20 mph ≈ 32 km/h
  assert.equal(Math.round((100 / 3.6) * MS_TO_MPH), 62); // 100 km/h ≈ 62 mph
});

test("haversine: 0.001° of latitude ≈ 111 m", () => {
  const d = haversineMeters({ lat: 41.7, lon: 44.8 }, { lat: 41.701, lon: 44.8 });
  assert.ok(Math.abs(d - 111.2) < 0.5, String(d));
});

test("a 60-second drive at 50 km/h", () => {
  const v = 50 / 3.6;
  const degPerMeter = 1 / 111195;
  let s = emptyTrip;
  for (let i = 0; i <= 60; i++) {
    const f: Fix = { lat: 41.7 + i * v * degPerMeter, lon: 44.8, speed: v, accuracy: 5, time: i * 1000 };
    s = addFix(s, f);
  }
  assert.equal(Math.round(s.speed * MS_TO_KMH), 50);
  assert.ok(Math.abs(s.distance - v * 60) < 2, String(s.distance)); // ≈ 833 m
  assert.equal(s.movingMs, 60000);
  assert.equal(Math.round(averageSpeed(s) * MS_TO_KMH), 50);
  assert.equal(Math.round(s.maxSpeed * MS_TO_KMH), 50);
});

test("standing still with GPS jitter adds no distance and shows 0", () => {
  let s = emptyTrip;
  for (let i = 0; i < 30; i++) {
    s = addFix(s, { lat: 41.7 + (i % 2) * 0.00002, lon: 44.8, speed: 0.2, accuracy: 8, time: i * 1000 });
  }
  assert.equal(s.speed, 0);
  assert.equal(s.distance, 0);
});

test("falls back to distance/time when the device gives no speed", () => {
  let s = addFix(emptyTrip, { lat: 41.7, lon: 44.8, speed: null, accuracy: 5, time: 0 });
  s = addFix(s, { lat: 41.7 + 10 / 111195, lon: 44.8, speed: null, accuracy: 5, time: 1000 });
  assert.equal(s.speed, 0); // first "moving" reading from standstill is held back
  s = addFix(s, { lat: 41.7 + 20 / 111195, lon: 44.8, speed: null, accuracy: 5, time: 2000 });
  assert.equal(Math.round(s.speed * MS_TO_KMH), 36); // 10 m/s = 36 km/h
  assert.equal(s.quality, "poor");
});

test("inaccurate fixes and long gaps are not counted", () => {
  let s = addFix(emptyTrip, { lat: 41.7, lon: 44.8, speed: 10, accuracy: 5, time: 0 });
  s = addFix(s, { lat: 41.71, lon: 44.8, speed: 10, accuracy: 200, time: 1000 });
  assert.equal(s.distance, 0);
  s = addFix(s, { lat: 41.72, lon: 44.8, speed: 10, accuracy: 5, time: 60000 });
  assert.equal(s.distance, 0);
});

test("close fixes without device speed are skipped, not spiked", () => {
  let s = addFix(emptyTrip, { lat: 41.7, lon: 44.8, speed: null, accuracy: 5, time: 0 });
  s = addFix(s, { lat: 41.7 + 20 / 111195, lon: 44.8, speed: null, accuracy: 5, time: 1000 });
  s = addFix(s, { lat: 41.7 + 40 / 111195, lon: 44.8, speed: null, accuracy: 5, time: 1100 });
  assert.ok(s.maxSpeed * MS_TO_KMH < 80, String(s.maxSpeed * MS_TO_KMH));
});

test("a good device speed is shown immediately, without lag", () => {
  let s = addFix(emptyTrip, { lat: 41.7, lon: 44.8, speed: 10, accuracy: 5, time: 0 });
  s = addFix(s, { lat: 41.7 + 10 / 111195, lon: 44.8, speed: 10, accuracy: 5, time: 1000 });
  s = addFix(s, { lat: 41.7 + 20 / 111195, lon: 44.8, speed: 10, accuracy: 5, time: 2000 });
  assert.equal(Math.round(s.speed * MS_TO_KMH), 36);
  s = addFix(s, { lat: 41.7 + 40 / 111195, lon: 44.8, speed: 20, accuracy: 5, time: 3000 });
  assert.equal(Math.round(s.speed * MS_TO_KMH), 72); // jumps straight to the new speed
  assert.equal(s.quality, "good");
  s = addFix(s, { lat: 41.7 + 50 / 111195, lon: 44.8, speed: 10, accuracy: 30, time: 4000 });
  assert.equal(s.quality, "fair");
  assert.equal(Math.round(s.speed * MS_TO_KMH), Math.round((20 * 0.3 + 10 * 0.7) * 3.6));
});

test("parked: a phone reporting 20 km/h while the position barely moves shows 0", () => {
  let s = emptyTrip;
  for (let i = 0; i < 10; i++) {
    const jitter = (i % 3) * 2 / 111195; // a few meters of drift
    s = addFix(s, { lat: 41.7 + jitter, lon: 44.8, speed: 5.6, accuracy: 7, time: i * 1000 });
  }
  assert.equal(s.speed, 0);
  assert.equal(s.distance < 20, true);
});

test("a single spike from standstill is ignored", () => {
  let s = addFix(emptyTrip, { lat: 41.7, lon: 44.8, speed: 0, accuracy: 5, time: 0 });
  s = addFix(s, { lat: 41.7, lon: 44.8, speed: 6, accuracy: 5, time: 1000 });
  assert.equal(s.speed, 0);
  s = addFix(s, { lat: 41.7, lon: 44.8, speed: 0, accuracy: 5, time: 2000 });
  assert.equal(s.speed, 0);
});

test("slow real driving (10 km/h) is still shown", () => {
  const v = 10 / 3.6;
  let s = emptyTrip;
  for (let i = 0; i <= 8; i++) s = addFix(s, { lat: 41.7 + (i * v) / 111195, lon: 44.8, speed: v, accuracy: 7, time: i * 1000 });
  assert.equal(Math.round(s.speed * MS_TO_KMH), 10);
});

test("duration format", () => {
  assert.equal(formatDuration(65000), "01:05");
  assert.equal(formatDuration(3723000), "1:02:03");
});
