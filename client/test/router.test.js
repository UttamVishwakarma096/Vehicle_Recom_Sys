import assert from "node:assert/strict";
import { test } from "node:test";
import { matchRoute, parseLocation } from "../src/router/matcher.js";

test("matchRoute matches static routes with exact path", () => {
  const result = matchRoute("/compare", "/compare");
  assert.equal(result.matches, true);
  assert.deepEqual(result.params, {});
});

test("matchRoute matches static routes when currentPath has query strings", () => {
  const result = matchRoute(
    "/compare",
    "/compare?ids=69dd1a4eb8a676b97b0a8863,69dd1a4eb8a676b97b0a8864",
  );
  assert.equal(result.matches, true);
  assert.deepEqual(result.params, {});
});

test("matchRoute matches static routes when currentPath has hash fragments", () => {
  const result = matchRoute("/vehicles", "/vehicles#specs");
  assert.equal(result.matches, true);
  assert.deepEqual(result.params, {});
});

test("matchRoute matches parameterized routes with query strings", () => {
  const result = matchRoute(
    "/vehicles/:id",
    "/vehicles/69dd1a4eb8a676b97b0a8863?tab=pricing",
  );
  assert.equal(result.matches, true);
  assert.deepEqual(result.params, { id: "69dd1a4eb8a676b97b0a8863" });
});

test("matchRoute rejects different pathnames even with query strings", () => {
  const result = matchRoute("/compare", "/vehicles?search=suv");
  assert.equal(result.matches, false);
});

test("parseLocation parses pathname, search, and hash accurately", () => {
  const loc = parseLocation("/compare?ids=123,456#matrix");
  assert.equal(loc.pathname, "/compare");
  assert.equal(loc.search, "?ids=123,456");
  assert.equal(loc.hash, "#matrix");
});

test("parseLocation handles empty search and hash", () => {
  const loc = parseLocation("/vehicles");
  assert.equal(loc.pathname, "/vehicles");
  assert.equal(loc.search, "");
  assert.equal(loc.hash, "");
});
