import argon2 from "argon2";
import { createAuthToken } from "../auth.js";
import { Client, Member, User, UserStatus } from "../models/index.js";
import { sequelize } from "../database.js";
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

    res.status(201).json({
      status: "success",
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
        token: createAuthToken(user),
      },
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        status: "error",
        message: "An account with this email already exists.",
      });
    }

    console.error("Account registration failed:", error);
    res.status(500).json({
      status: "error",
      message: "Unable to create account.",
    });
  }
}

export async function login(req, res) {
  try {
    const value = req.validated.body;
    const { email, password } = value;
    const user = await User.findOne({ where: { email } });
    const configuredOwnerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();

    const status = user ? await UserStatus.findByPk(user.id) : null;
    if (!user || status?.active === false ||
      (user.role === "owner" && user.email !== configuredOwnerEmail) ||
      !(await argon2.verify(user.passwordHash, password))) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password.",
      });
    }

    res.json({
      status: "success",
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
        token: createAuthToken(user),
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({
      status: "error",
      message: "Unable to log in.",
    });
  }
}

export async function getCurrentUser(req, res) {
  try {
    res.json({
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
  } catch (error) {
    console.error("Current user lookup failed:", error);
    res.status(500).json({
      status: "error",
      message: "Unable to retrieve user.",
    });
  }
}

export async function changePassword(req, res) {
  try {
    const value = req.validated.body;

    const user = await User.findByPk(req.user.id);
    if (!user || !(await argon2.verify(user.passwordHash, value.currentPassword))) {
      return res.status(401).json({ status: "error", message: "Current password is incorrect." });
    }
    user.passwordHash = await argon2.hash(value.newPassword);
    await user.save();
    return res.json({ status: "success", message: "Password changed." });
  } catch (error) {
    console.error("Password change failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to change password." });
  }
}
