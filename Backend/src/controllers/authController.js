import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { Op } from "sequelize";
import {
  REFRESH_COOKIE,
  clearSessionCookies,
  revokeRefreshToken,
  revokeUserSessions,
  rotateSession,
  startSession,
} from "../auth.js";
import { loadActiveUser } from "../middleware/requireAuthentication.js";
import { sequelize } from "../database.js";
import { loginFailureLimiter } from "../middleware/loginFailureLimit.js";
import { Client, Member, PasswordResetToken, User, UserStatus } from "../models/index.js";

// Verified when the email is unknown so response time does not reveal which accounts exist.
const dummyPasswordHash = argon2.hash(randomBytes(32).toString("hex"));

function publicUser(user) {
  return { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
}

function randomDelay(minMs = 100, maxMs = 400) {
  return new Promise((resolve) => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)));
}

function getPasswordResetConfiguration() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  const baseUrl = process.env.FRONTEND_PUBLIC_URL;
  if (!apiKey || !from || !baseUrl) return null;

  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("FRONTEND_PUBLIC_URL must be an absolute URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("FRONTEND_PUBLIC_URL must use HTTP or HTTPS.");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("FRONTEND_PUBLIC_URL must use HTTPS in production.");
  }
  return { apiKey, from, resetBase: new URL("/reset-password", url).toString() };
}

export async function register(req, res) {
  try {
    const value = req.validated.body;
    const user = await sequelize.transaction(async (transaction) => {
      const createdUser = await User.create({
        fullName: value.fullName,
        email: value.email,
        passwordHash: await argon2.hash(value.password),
        role: "client",
      }, { transaction });
      await Promise.all([
        Client.create({ userId: createdUser.id }, { transaction }),
        Member.create({ userId: createdUser.id }, { transaction }),
      ]);
      return createdUser;
    });

    const csrfToken = await startSession(res, user);
    return res.status(201).json({
      status: "success",
      data: { user: publicUser(user), csrfToken },
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ status: "error", message: "An account with this email already exists." });
    }
    console.error("Account registration failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to create account." });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.validated.body;
    const retryAfter = loginFailureLimiter.retryAfterSeconds(email);
    if (retryAfter) {
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ status: "error", message: "Too many failed sign-in attempts. Please try again later." });
    }
    const user = await User.findOne({ where: { email } });
    const configuredOwnerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
    const status = user ? await UserStatus.findByPk(user.id) : null;
    const passwordMatches = await argon2.verify(user?.passwordHash ?? await dummyPasswordHash, password);
    if (!user || !passwordMatches || status?.active === false ||
      (user.role === "owner" && user.email !== configuredOwnerEmail)) {
      loginFailureLimiter.recordFailure(email);
      return res.status(401).json({ status: "error", message: "Invalid email or password." });
    }
    loginFailureLimiter.reset(email);

    const csrfToken = await startSession(res, user);
    return res.json({ status: "success", data: { user: publicUser(user), csrfToken } });
  } catch (error) {
    console.error("Login failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to log in." });
  }
}

export async function refreshSession(req, res) {
  try {
    const session = await rotateSession(
      res,
      req.cookies?.[REFRESH_COOKIE],
      (userId, transaction) => loadActiveUser(userId, { transaction }),
    );
    if (!session) {
      clearSessionCookies(res);
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }
    return res.json({ status: "success", data: { user: publicUser(session.user), csrfToken: session.csrfToken } });
  } catch (error) {
    console.error("Session refresh failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to refresh session." });
  }
}

export async function logout(req, res) {
  try {
    await revokeRefreshToken(req.cookies?.[REFRESH_COOKIE]);
  } catch (error) {
    console.error("Refresh token revocation failed:", error);
  }
  clearSessionCookies(res);
  return res.json({ status: "success", message: "Signed out." });
}

export async function getCurrentUser(req, res) {
  return res.json({
    status: "success",
    data: {
      user: {
        id: req.user.id,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
}

export async function changePassword(req, res) {
  try {
    const value = req.validated.body;
    const user = await User.findByPk(req.user.id);
    if (!user || !(await argon2.verify(user.passwordHash, value.currentPassword))) {
      return res.status(401).json({ status: "error", message: "Current password is incorrect." });
    }
    const csrfToken = await sequelize.transaction(async (transaction) => {
      user.passwordHash = await argon2.hash(value.newPassword);
      user.tokenVersion += 1;
      await user.save({ transaction });
      await revokeUserSessions(user.id, transaction);
      // Every other session is revoked; this one continues with a fresh session.
      return startSession(res, user, transaction);
    });
    return res.json({ status: "success", message: "Password changed.", data: { csrfToken } });
  } catch (error) {
    console.error("Password change failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to change password." });
  }
}

export async function requestPasswordReset(req, res) {
  let configuration;
  try {
    configuration = getPasswordResetConfiguration();
  } catch (error) {
    console.error("Password reset configuration is invalid:", error);
    return res.status(503).json({ status: "error", message: "Password reset is not configured." });
  }
  if (!configuration) {
    return res.status(503).json({ status: "error", message: "Password reset is not configured." });
  }

  try {
    const email = req.validated.body.email;
    const user = await User.findOne({ where: { email }, attributes: ["id"] });
    if (!user) {
      await randomDelay();
      return res.status(202).json({
        status: "success",
        message: "If an account exists for that email, password reset instructions have been sent.",
      });
    }
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await PasswordResetToken.destroy({ where: { userId: user.id, usedAt: null } });
    await PasswordResetToken.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    const resetUrl = new URL(configuration.resetBase);
    resetUrl.searchParams.set("token", rawToken);
    const delivery = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: configuration.from,
        to: [email],
        subject: "FitConsole password reset request",
        text: `A password reset was requested for this email address. If it is linked to a FitConsole account, use this one-time link within 30 minutes:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      }),
    });
    if (!delivery.ok) {
      await PasswordResetToken.destroy({ where: { tokenHash } });
      console.error("Password reset email delivery failed with HTTP status:", delivery.status);
      return res.status(502).json({ status: "error", message: "Unable to deliver password reset email." });
    }

    return res.status(202).json({
      status: "success",
      message: "If an account exists for that email, password reset instructions have been sent.",
    });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to request a password reset." });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.validated.body;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const reset = await PasswordResetToken.findOne({ where: { tokenHash, usedAt: null } });
    if (!reset || reset.expiresAt <= new Date()) {
      return res.status(400).json({ status: "error", message: "This password reset link is invalid or expired." });
    }

    await sequelize.transaction(async (transaction) => {
      const locked = await PasswordResetToken.findOne({
        where: { id: reset.id, usedAt: null, expiresAt: { [Op.gt]: new Date() } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!locked) throw new Error("PASSWORD_RESET_TOKEN_INVALID");
      const user = await User.findByPk(locked.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) throw new Error("PASSWORD_RESET_TOKEN_INVALID");
      await user.update({
        passwordHash: await argon2.hash(newPassword),
        tokenVersion: user.tokenVersion + 1,
      }, { transaction });
      await locked.update({ usedAt: new Date() }, { transaction });
      await revokeUserSessions(user.id, transaction);
      await PasswordResetToken.destroy({
        where: { userId: user.id, id: { [Op.ne]: locked.id } },
        transaction,
      });
    });
    return res.json({ status: "success", message: "Password reset successfully. Please sign in again." });
  } catch (error) {
    if (error.message === "PASSWORD_RESET_TOKEN_INVALID") {
      return res.status(400).json({ status: "error", message: "This password reset link is invalid or expired." });
    }
    console.error("Password reset failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to reset password." });
  }
}
