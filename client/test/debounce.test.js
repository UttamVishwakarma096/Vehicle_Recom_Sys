import assert from "node:assert/strict";
import { test } from "node:test";
import { debounce } from "../src/hooks/useDebounce.js";

test("debounce delays execution until delay period elapses", async () => {
  let callCount = 0;
  let lastArg = "";
  const fn = debounce((arg) => {
    callCount += 1;
    lastArg = arg;
  }, 40);

  fn("a");
  fn("b");
  fn("c");

  assert.equal(callCount, 0);

  await new Promise((resolve) => setTimeout(resolve, 70));

  assert.equal(callCount, 1);
  assert.equal(lastArg, "c");
});

test("debounce cancel aborts pending execution", async () => {
  let callCount = 0;
  const fn = debounce(() => {
    callCount += 1;
  }, 40);

  fn();
  fn.cancel();

  await new Promise((resolve) => setTimeout(resolve, 70));

  assert.equal(callCount, 0);
});
