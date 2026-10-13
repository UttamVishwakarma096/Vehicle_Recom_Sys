import crypto from "node:crypto";
import { HttpError } from "../foundation.js";

const REFRESH_SESSION_DAYS = 7;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class SessionService {
  constructor({ SessionModel, getSessionModel }) {
    this._SessionModel = SessionModel;
    this._getSessionModel = getSessionModel;
  }

  get Session() {
    if (this._getSessionModel) {
      return this._getSessionModel();
    }
    return this._SessionModel;
  }

  async createSession(userId) {
    const rawRefreshToken = crypto.randomBytes(32).toString("base64url");
    const csrfToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(
      Date.now() + REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000,
    );

    const session = await this.Session.create({
      userId,
      tokenHash,
      csrfToken,
      expiresAt,
    });

    return {
      refreshToken: rawRefreshToken,
      csrfToken,
      session,
    };
  }

  async rotateSession(rawRefreshToken) {
    if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid or missing refresh token.");
    }

    const tokenHash = hashToken(rawRefreshToken);
    const existing = await this.Session.findOneAndDelete({ tokenHash });

    if (!existing || existing.expiresAt <= new Date()) {
      throw new HttpError(
        401,
        "SESSION_EXPIRED",
        "The session has expired or been revoked.",
      );
    }

    return this.createSession(existing.userId);
  }

  async revokeSession(rawRefreshToken) {
    if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
      return false;
    }
    const tokenHash = hashToken(rawRefreshToken);
    const result = await this.Session.findOneAndDelete({ tokenHash });
    return Boolean(result);
  }

  async revokeAllUserSessions(userId) {
    await this.Session.deleteMany({ userId });
  }

  async findSessionByToken(rawRefreshToken) {
    if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
      return null;
    }
    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.Session.findOne({ tokenHash });
    if (!session || session.expiresAt <= new Date()) {
      return null;
    }
    return session;
  }
}
