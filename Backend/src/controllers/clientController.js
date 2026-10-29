import argon2 from "argon2";
import { sequelize } from "../database.js";
import { canAccessClient } from "../utils/access.js";
import { Client, Member, Trainer, User, UserStatus } from "../models/index.js";
import { getPagination, paginatedData, searchCondition } from "../utils/pagination.js";

export async function listClients(req, res) {
  try {
    const value = req.validated?.query ?? {};
    const pagination = getPagination(value);
    const where = {};
    // Trainers always see only their own roster; owners may filter by trainer.
    if (req.user.role === "trainer") {
      where.trainerId = (await Trainer.findByPk(req.user.id, { attributes: ["id"] }))?.id ?? null;
    } else if (value.trainerId) {
      where.trainerId = value.trainerId;
    }
    Object.assign(where, searchCondition(value.search, ["$User.full_name$", "$User.email$", "phone"]));
    const { rows, count } = await Client.findAndCountAll({
      where,
      include: [{ model: User, attributes: ["id", "fullName", "email"] }],
      order: [["createdAt", "DESC"]],
      ...(pagination ? { limit: pagination.limit, offset: pagination.offset } : {}),
    });
    return res.json({ status: "success", data: paginatedData(rows, count, pagination) });
  } catch (error) {
    console.error("Client list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve clients." });
  }
}

export async function getMyClient(req, res) {
  try {
    const client = await Client.findOne({
      where: { userId: req.user.id },
      include: [{ model: User, attributes: ["id", "fullName", "email"] }],
    });
    if (!client) {
      return res.status(404).json({ status: "error", message: "Client profile not found." });
    }
    return res.json({ status: "success", data: client });
  } catch (error) {
    console.error("Client profile lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve client profile." });
  }
}

export async function getClient(req, res) {
  try {
    const allowed = await canAccessClient(req.user, req.params.id);
    if (!allowed) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const client = await Client.findByPk(req.params.id, {
      include: [{ model: User, attributes: ["id", "fullName", "email"] }],
    });
    if (!client) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    return res.json({ status: "success", data: client });
  } catch (error) {
    console.error("Client lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve client." });
  }
}

export async function createClient(req, res) {
  const value = req.validated.body;
  try {
    const { user, client } = await sequelize.transaction(async (transaction) => {
      const user = await User.create({
        fullName: value.fullName,
        email: value.email,
        passwordHash: await argon2.hash(value.password),
        role: "client",
      }, { transaction });
      const {
        fullName: _fullName,
        email: _email,
        password: _password,
        ...profile
      } = value;
      const client = await Client.create({ ...profile, userId: user.id }, { transaction });
      await Member.create({ userId: user.id, phone: value.phone, dateOfBirth: value.dateOfBirth }, { transaction });
      return { user, client };
    });
    return res.status(201).json({
      status: "success",
      data: { ...client.toJSON(), user: { id: user.id, fullName: user.fullName, email: user.email, active: true } },
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ status: "error", message: "An account with this email already exists." });
    }
    console.error("Client creation failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to create client." });
  }
}

export async function updateMyClient(req, res) {
  try {
    const value = req.validated.body;
    const client = await Client.findOne({ where: { userId: req.user.id } });
    if (!client) {
      return res.status(404).json({ status: "error", message: "Client profile not found." });
    }
    await client.update(value);
    return res.json({ status: "success", data: client });
  } catch (error) {
    console.error("Client profile update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update client profile." });
  }
}

export async function updateClient(req, res) {
  try {
    const value = req.validated.body;
    if (req.user.role === "trainer") {
      const allowedKeys = ["goal", "goalCategory", "dietPreference", "allergies", "healthIssues", "injuries"];
      if (Object.keys(value).some((key) => !allowedKeys.includes(key))) {
        return res.status(403).json({ status: "error", message: "Trainers may only update health and goal fields." });
      }
      if (!(await canAccessClient(req.user, req.params.id))) {
        return res.status(404).json({ status: "error", message: "Client not found." });
      }
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    await client.update(value);
    return res.json({ status: "success", data: client });
  } catch (error) {
    console.error("Client update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update client." });
  }
}

export async function assignClientTrainer(req, res) {
  try {
    const value = req.validated.body;
    const client = await Client.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    if (value.trainerId) {
      const [trainer, status] = await Promise.all([
        Trainer.findOne({ where: { userId: value.trainerId } }),
        UserStatus.findByPk(value.trainerId),
      ]);
      if (!trainer || status?.active === false) {
        return res.status(404).json({ status: "error", message: "Active trainer not found." });
      }
      value.trainerId = trainer.id;
    }
    await client.update({ trainerId: value.trainerId });
    return res.json({ status: "success", data: client });
  } catch (error) {
    console.error("Trainer assignment failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to assign trainer." });
  }
}

export async function updateClientIdProof(req, res) {
  try {
    const value = req.validated.body;
    const clientId = req.params.id || (await Client.findOne({ where: { userId: req.user.id } }))?.id;
    if (!clientId || !(await canAccessClient(req.user, clientId))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const client = await Client.findByPk(clientId);
    if (!client) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    await client.update({ idProofReference: value.reference });
    return res.json({ status: "success", data: { id: client.id, idProofReference: client.idProofReference } });
  } catch (error) {
    console.error("Client ID proof update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update ID proof reference." });
  }
}
