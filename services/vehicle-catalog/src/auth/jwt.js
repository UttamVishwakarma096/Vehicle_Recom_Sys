import crypto from "node:crypto";

export const ISSUER = "urn:vehicle:identity-user";
export const AUDIENCE = "urn:vehicle:services";

export class TokenVerifier {
  constructor({
    publicKey,
    jwks,
    jwksUri,
    issuer = ISSUER,
    audience = AUDIENCE,
  } = {}) {
    this.issuer = issuer;
    this.audience = audience;
    this.publicKey = null;
    this.jwks = jwks || null;
    this.jwksUri = jwksUri || null;

    if (publicKey) {
      this.publicKey =
        typeof publicKey === "string"
          ? crypto.createPublicKey(publicKey)
          : publicKey;
    }
  }

  async refreshJwks() {
    if (!this.jwksUri) return;
    try {
      const response = await fetch(this.jwksUri);
      if (response.ok) {
        this.jwks = await response.json();
      }
    } catch {
      // Best-effort background fetch; failures handled on resolution
    }
  }

  async resolvePublicKey(kid) {
    if (this.publicKey) {
      return this.publicKey;
    }

    if (!this.jwks?.keys?.length && this.jwksUri) {
      await this.refreshJwks();
    }

    if (this.jwks?.keys?.length) {
      let match = kid
        ? this.jwks.keys.find((k) => k.kid === kid)
        : this.jwks.keys[0];

      if (!match && this.jwksUri) {
        await this.refreshJwks();
        match = kid
          ? this.jwks.keys.find((k) => k.kid === kid)
          : this.jwks.keys[0];
      }

      if (match) {
        return crypto.createPublicKey({ key: match, format: "jwk" });
      }
    }

    throw new Error("No matching public key found for token verification.");
  }

  async verifyAccessToken(token) {
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
      header = JSON.parse(
        Buffer.from(headerB64, "base64url").toString("utf-8"),
      );
    } catch {
      throw new Error("Invalid JWT header.");
    }

    if (header.alg !== "RS256") {
      throw new Error(`Unsupported token algorithm: ${header.alg}`);
    }

    const key = await this.resolvePublicKey(header.kid);
    const dataToVerify = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, "base64url");
    const isValid = crypto.verify(
      "sha256",
      Buffer.from(dataToVerify),
      key,
      signature,
    );

    if (!isValid) {
      throw new Error("Invalid token signature.");
    }

    let payload;
    try {
      payload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf-8"),
      );
    } catch {
      throw new Error("Invalid JWT payload.");
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp <= now) {
      throw new Error("Token has expired.");
    }

    if (payload.iss !== this.issuer) {
      throw new Error(`Invalid token issuer: ${payload.iss}`);
    }

    if (payload.aud !== this.audience) {
      throw new Error(`Invalid token audience: ${payload.aud}`);
    }

    return payload;
  }
}
