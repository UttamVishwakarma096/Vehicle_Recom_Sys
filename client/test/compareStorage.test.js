import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import {
  getStoredCompareIds,
  saveStoredCompareIds,
  clearStoredCompareIds,
  addVehicleToCompare,
  removeVehicleFromCompare,
} from "../src/services/compareStorage.js";

// Mock localStorage in Node test environment
const mockStorage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (mockStorage.has(key) ? mockStorage.get(key) : null),
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
  },
};

beforeEach(() => {
  mockStorage.clear();
});

test("getStoredCompareIds returns empty array when nothing is stored", () => {
  assert.deepEqual(getStoredCompareIds(), []);
});

test("saveStoredCompareIds saves valid array of IDs", () => {
  saveStoredCompareIds(["id1", "id2"]);
  assert.deepEqual(getStoredCompareIds(), ["id1", "id2"]);
});

test("saveStoredCompareIds deduplicates and enforces max 4 limit", () => {
  saveStoredCompareIds(["id1", "id2", "id1", "id3", "id4", "id5"]);
  assert.deepEqual(getStoredCompareIds(), ["id1", "id2", "id3", "id4"]);
});

test("saveStoredCompareIds removes key when empty", () => {
  saveStoredCompareIds(["id1"]);
  assert.deepEqual(getStoredCompareIds(), ["id1"]);
  saveStoredCompareIds([]);
  assert.deepEqual(getStoredCompareIds(), []);
});

test("clearStoredCompareIds clears storage", () => {
  saveStoredCompareIds(["id1", "id2"]);
  clearStoredCompareIds();
  assert.deepEqual(getStoredCompareIds(), []);
});

test("addVehicleToCompare adds new vehicle up to cap", () => {
  addVehicleToCompare("id1");
  addVehicleToCompare("id2");
  addVehicleToCompare("id3");
  addVehicleToCompare("id4");
  const result = addVehicleToCompare("id5");
  assert.deepEqual(result, ["id1", "id2", "id3", "id4"]);
});

test("removeVehicleFromCompare removes vehicle", () => {
  saveStoredCompareIds(["id1", "id2", "id3"]);
  const result = removeVehicleFromCompare("id2");
  assert.deepEqual(result, ["id1", "id3"]);
  assert.deepEqual(getStoredCompareIds(), ["id1", "id3"]);
});
