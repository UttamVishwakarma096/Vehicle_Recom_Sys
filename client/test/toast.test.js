import assert from "node:assert/strict";
import { test } from "node:test";
import { formatToastArgs } from "../src/context/toastFormatter.js";

test("formatToastArgs handles string message and custom title", () => {
  const result = formatToastArgs("Welcome back!", "Authentication Successful", "Success");
  assert.deepEqual(result, {
    title: "Authentication Successful",
    description: "Welcome back!",
  });
});

test("formatToastArgs handles short string without custom title as title", () => {
  const result = formatToastArgs("Vehicle record deleted.", undefined, "Info");
  assert.deepEqual(result, {
    title: "Vehicle record deleted.",
  });
});

test("formatToastArgs handles long message without title by defaulting title", () => {
  const longMsg = "This is a detailed error message explaining that the requested operation cannot be executed at this time.";
  const result = formatToastArgs(longMsg, undefined, "Error");
  assert.deepEqual(result, {
    title: "Error",
    description: longMsg,
  });
});

test("formatToastArgs preserves direct Sileo options object", () => {
  const customOpts = {
    title: "Payment Received",
    description: "Invoice #1042 marked as paid",
    duration: 5000,
  };
  const result = formatToastArgs(customOpts, undefined, "Success");
  assert.deepEqual(result, {
    title: "Payment Received",
    description: "Invoice #1042 marked as paid",
    duration: 5000,
  });
});

test("formatToastArgs passes through extraOpts", () => {
  const result = formatToastArgs("Quick notice", "Heads up", "Info", { position: "top-center" });
  assert.deepEqual(result, {
    title: "Heads up",
    description: "Quick notice",
    position: "top-center",
  });
});
