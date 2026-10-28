import jwt from "jsonwebtoken";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Op } from "sequelize";
import { RefreshToken } from "./models/index.js";

export const ACCESS_COOKIE = "fc_access";
export const REFRESH_COOKIE = "fc_refresh";
export const CSRF_COOKIE = "fc_csrf";
export const CSRF_HEADER = "x-csrf-token";
const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function assertJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a secret of at least 32 characters.");
  }
}

function getJwtSecret() {
  assertJwtSecret();
  return process.env.JWT_SECRET;
}

export function createAuthToken(user) {
  return jwt.sign({ ver: user.tokenVersion ?? 0 }, getJwtSecret(), {
    subject: user.id,
    algorithm: "HS256",
    expiresIn: ACCESS_TTL_MS / 1000,
  });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function tokensMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function cookieOptions(overrides = {}) {
  // Secure cookies are required in production; COOKIE_SECURE=false allows plain-HTTP local development.
  const secure = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production";
  return { secure, sameSite: "strict", ...overrides };
}

async function createRefreshToken(user, transaction) {
  const rawToken = randomBytes(48).toString("base64url");
  const record = await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  }, { transaction });
  return { rawToken, record };
}

function setSessionCookies(res, user, refreshToken) {
  const csrfToken = randomBytes(32).toString("base64url");
  res.cookie(ACCESS_COOKIE, createAuthToken(user), cookieOptions({ httpOnly: true, path: "/api", maxAge: ACCESS_TTL_MS }));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions({ httpOnly: true, path: "/api/auth", maxAge: REFRESH_TTL_MS }));
  // Readable by the page for the double-submit check; also returned in the body for cross-subdomain frontends.
  res.cookie(CSRF_COOKIE, csrfToken, cookieOptions({ httpOnly: false, path: "/", maxAge: REFRESH_TTL_MS }));
  return csrfToken;
}

export async function startSession(res, user, transaction) {
  const { rawToken } = await createRefreshToken(user, transaction);
  return setSessionCookies(res, user, rawToken);
}

// Rotates a refresh token. Reuse of a revoked token revokes every session for that user.
export async function rotateSession(res, rawToken, loadUser) {
  if (!rawToken) return null;
  return RefreshToken.sequelize.transaction(async (transaction) => {
    const existing = await RefreshToken.findOne({
      where: { tokenHash: hashToken(rawToken) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!existing) return null;
    if (existing.revokedAt) {
      await revokeUserSessions(existing.userId, transaction);
      return null;
    }
    if (existing.expiresAt <= new Date()) return null;
    const user = await loadUser(existing.userId, transaction);
    if (!user) {
      await existing.update({ revokedAt: new Date() }, { transaction });
      return null;
    }
    const { rawToken: nextToken, record } = await createRefreshToken(user, transaction);
    await existing.update({ revokedAt: new Date(), replacedById: record.id }, { transaction });
    return { user, csrfToken: setSessionCookies(res, user, nextToken) };
  });
}

export async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { tokenHash: hashToken(rawToken), revokedAt: null } },
  );
}

export async function revokeUserSessions(userId, transaction) {
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { userId, revokedAt: null }, transaction },
  );
}

export async function pruneExpiredRefreshTokens(now = new Date()) {
  return RefreshToken.destroy({ where: { expiresAt: { [Op.lt]: now } } });
}

export function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE, cookieOptions({ httpOnly: true, path: "/api" }));
  res.clearCookie(REFRESH_COOKIE, cookieOptions({ httpOnly: true, path: "/api/auth" }));
  res.clearCookie(CSRF_COOKIE, cookieOptions({ path: "/" }));
}
