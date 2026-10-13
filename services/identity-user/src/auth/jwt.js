import crypto from "node:crypto";

export const ISSUER = "urn:vehicle:identity-user";
export const AUDIENCE = "urn:vehicle:services";
export const ACCESS_TOKEN_LIFETIME_SECONDS = 15 * 60; // 15 minutes

export class TokenService {
  constructor({ privateKey, publicKey, keyId = "identity-key-1" } = {}) {
    this.keyId = keyId;
    if (privateKey && publicKey) {
      this.privateKey =
        typeof privateKey === "string"
          ? crypto.createPrivateKey(privateKey)
          : privateKey;
      this.publicKey =
        typeof publicKey === "string"
          ? crypto.createPublicKey(publicKey)
          : publicKey;
    } else {
      const generated = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
      });
      this.privateKey = generated.privateKey;
      this.publicKey = generated.publicKey;
    }

    const jwk = this.publicKey.export({ format: "jwk" });
    this.jwks = {
      keys: [
        {
          kty: jwk.kty,
          n: jwk.n,
          e: jwk.e,
          alg: "RS256",
          use: "sig",
          kid: this.keyId,
        },
      ],
    };
  }

  getJwks() {
    return this.jwks;
  }

  signAccessToken(user, { expiresInSeconds = ACCESS_TOKEN_LIFETIME_SECONDS } = {}) {
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: "RS256",
      typ: "JWT",
      kid: this.keyId,
    };

    const payload = {
      sub: String(user.id || user._id),
      email: user.email,
      role: user.role,
      iss: ISSUER,
      aud: AUDIENCE,
      iat: now,
      exp: now + expiresInSeconds,
      jti: crypto.randomUUID(),
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
      .sign("sha256", Buffer.from(dataToSign), this.privateKey)
      .toString("base64url");

    return `${dataToSign}.${signature}`;
  }

  verifyAccessToken(token) {
    if (typeof token !== "string") {
      throw new Error("Token must be a string.");
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Malformed JWT format.");
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    let header;
    try {
      header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf-8"));
    } catch {
      throw new Error("Invalid JWT header.");
    }

    if (header.alg !== "RS256") {
      throw new Error(`Unsupported token algorithm: ${header.alg}`);
    }

    const dataToVerify = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, "base64url");
    const isValid = crypto.verify(
      "sha256",
      Buffer.from(dataToVerify),
      this.publicKey,
      signature,
    );

    if (!isValid) {
      throw new Error("Invalid token signature.");
    }

    let payload;
    try {
      payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    } catch {
      throw new Error("Invalid JWT payload.");
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp <= now) {
      throw new Error("Token has expired.");
    }

    if (payload.iss !== ISSUER) {
      throw new Error(`Invalid token issuer: ${payload.iss}`);
    }

    if (payload.aud !== AUDIENCE) {
      throw new Error(`Invalid token audience: ${payload.aud}`);
    }

    return payload;
  }
}
