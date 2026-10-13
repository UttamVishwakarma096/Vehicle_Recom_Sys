import crypto from "node:crypto";
import util from "node:util";

const argon2Async = util.promisify(crypto.argon2);

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

// Argon2id parameters tuned for interactive login
const DEFAULT_MEMORY = 65536; // 64 MiB
const DEFAULT_PASSES = 3;
const DEFAULT_PARALLELISM = 1;
const TAG_LENGTH = 32;

export function validatePasswordPolicy(password) {
  if (typeof password !== "string") {
    return { valid: false, message: "Password must be a string." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`,
    };
  }
  return { valid: true };
}

export async function hashPassword(password) {
  const policy = validatePasswordPolicy(password);
  if (!policy.valid) {
    throw new Error(policy.message);
  }

  const nonce = crypto.randomBytes(16);
  const tag = await argon2Async("argon2id", {
    message: password,
    nonce,
    parallelism: DEFAULT_PARALLELISM,
    tagLength: TAG_LENGTH,
    memory: DEFAULT_MEMORY,
    passes: DEFAULT_PASSES,
  });

  return [
    "argon2id",
    DEFAULT_MEMORY,
    DEFAULT_PASSES,
    DEFAULT_PARALLELISM,
    nonce.toString("base64url"),
    tag.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || typeof storedHash !== "string") {
    return false;
  }

  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "argon2id") {
    return false;
  }

  const [, memoryStr, passesStr, parallelismStr, nonceStr, tagStr] = parts;
  const memory = Number(memoryStr);
  const passes = Number(passesStr);
  const parallelism = Number(parallelismStr);

  if (
    !Number.isSafeInteger(memory) ||
    !Number.isSafeInteger(passes) ||
    !Number.isSafeInteger(parallelism)
  ) {
    return false;
  }

  try {
    const nonce = Buffer.from(nonceStr, "base64url");
    const expectedTag = Buffer.from(tagStr, "base64url");
    if (nonce.length !== 16 || expectedTag.length !== TAG_LENGTH) {
      return false;
    }

    const tag = await argon2Async("argon2id", {
      message: password,
      nonce,
      parallelism,
      tagLength: expectedTag.length,
      memory,
      passes,
    });

    return crypto.timingSafeEqual(tag, expectedTag);
  } catch {
    return false;
  }
}
