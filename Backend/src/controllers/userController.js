import argon2 from "argon2";
import { sequelize } from "../database.js";
import { revokeUserSessions } from "../auth.js";
import { Trainer, TrainerDetails, User, UserStatus } from "../models/index.js";

export async function createTrainer(req, res) {
  const value = req.validated.body;

  try {
    const { user, trainer } = await sequelize.transaction(async (transaction) => {
      const user = await User.create({
        fullName: value.fullName,
        email: value.email,
        passwordHash: await argon2.hash(value.password),
        role: "trainer",
      }, { transaction });
      const trainer = await Trainer.create({
        userId: user.id,
        phone: value.phone,
        certification: value.certification,
      }, { transaction });
      await TrainerDetails.create({
        userId: user.id,
        experienceYears: value.experienceYears,
      }, { transaction });
      return { user, trainer };
    });
    return res.status(201).json({
      status: "success",
      data: {
        user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, active: true },
        trainer,
      },
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ status: "error", message: "An account with this email already exists." });
    }
    console.error("Trainer provisioning failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to create trainer." });
  }
}

export async function listUsers(req, res) {
  try {
    const value = req.validated.query;
    const users = await User.findAll({
      where: value.role ? { role: value.role } : {},
      attributes: ["id", "fullName", "email", "role", "createdAt"],
      order: [["createdAt", "DESC"]],
    });
    const statuses = await UserStatus.findAll({ where: { userId: users.map((user) => user.id) } });
    const inactiveIds = new Set(statuses.filter((status) => !status.active).map((status) => status.userId));
    return res.json({
      status: "success",
      data: users.map((user) => ({ ...user.toJSON(), active: !inactiveIds.has(user.id) })),
    });
  } catch (error) {
    console.error("User list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve users." });
  }
}

export async function updateUserStatus(req, res) {
  try {
    const value = req.validated.body;
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found." });
    }
    if (user.id === req.user.id && !value.active) {
      return res.status(400).json({ status: "error", message: "You cannot deactivate your own account." });
    }
    if (user.role === "owner" && user.email !== process.env.OWNER_EMAIL?.trim().toLowerCase() && value.active) {
      return res.status(403).json({ status: "error", message: "Only the configured owner account can have owner access." });
    }
    await sequelize.transaction(async (transaction) => {
      await UserStatus.upsert({ userId: user.id, active: value.active }, { transaction });
      if (!value.active) {
        await user.increment("tokenVersion", { transaction });
        await revokeUserSessions(user.id, transaction);
      }
    });
    return res.json({
      status: "success",
      data: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, active: value.active },
    });
  } catch (error) {
    console.error("User status update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update user status." });
  }
}
