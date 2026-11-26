import { test } from "node:test";
import assert from "node:assert/strict";
import { mpgToKmPerLiter, mpgToLitersPer100Km, parseMpg } from "./fuel.ts";

test("13.7 MPG from the Kona dashboard", () => {
  assert.equal(mpgToKmPerLiter(13.7).toFixed(2), "5.82");
  assert.equal(mpgToLitersPer100Km(13.7).toFixed(1), "17.2");
});

test("30 MPG", () => {
  assert.equal(mpgToKmPerLiter(30).toFixed(2), "12.75");
});

test("parsing", () => {
  assert.equal(parseMpg("13,7"), 13.7);
  assert.equal(parseMpg(" 25 "), 25);
  assert.equal(parseMpg(""), null);
  assert.equal(parseMpg("abc"), null);
  assert.equal(parseMpg("0"), null);
});
