import { Op } from "sequelize";
import { addDaysToDateString, todayInGymTz } from "../utils/dates.js";
import { sequelize } from "../database.js";
import { Client, DietTracker, DietTrackerAuthor } from "../models/index.js";
import { canAccessClient } from "../utils/access.js";

export async function createDietEntry(req, res) {
  try {
    const value = req.validated.body;
    if (!(await canAccessClient(req.user, req.params.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const client = await Client.findByPk(req.params.id);
    const entry = await sequelize.transaction(async (transaction) => {
      const entry = await DietTracker.create({
        ...value,
        clientId: client.id,
      }, { transaction });
      await DietTrackerAuthor.create({
        dietTrackerId: entry.id,
        userId: req.user.id,
      }, { transaction });
      return entry;
    });
    return res.status(201).json({ status: "success", data: entry });
  } catch (error) {
    console.error("Diet entry creation failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to create diet entry." });
  }
}

export async function listDietEntries(req, res) {
  try {
    const value = req.validated.query;
    if (!(await canAccessClient(req.user, req.params.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const where = { clientId: req.params.id };
    if (value.from || value.to) {
      where.recordedOn = {};
      if (value.from) where.recordedOn[Op.gte] = value.from.toISOString().slice(0, 10);
      if (value.to) where.recordedOn[Op.lte] = value.to.toISOString().slice(0, 10);
    }
    const entries = await DietTracker.findAll({ where, order: [["recordedOn", "DESC"]] });
    return res.json({ status: "success", data: entries });
  } catch (error) {
    console.error("Diet entry list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve diet entries." });
  }
}

export async function updateDietEntry(req, res) {
  try {
    const value = req.validated.body;
    const entry = await DietTracker.findByPk(req.params.entryId);
    const author = entry && await DietTrackerAuthor.findOne({
      where: { dietTrackerId: entry.id, userId: req.user.id },
    });
    if (!entry || !author) {
      return res.status(404).json({ status: "error", message: "Diet entry not found." });
    }
    await entry.update(value);
    return res.json({ status: "success", data: entry });
  } catch (error) {
    console.error("Diet entry update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update diet entry." });
  }
}

export async function deleteDietEntry(req, res) {
  try {
    const entry = await DietTracker.findByPk(req.params.entryId);
    const author = entry && await DietTrackerAuthor.findOne({
      where: { dietTrackerId: entry.id, userId: req.user.id },
    });
    if (!entry || !author) return res.status(404).json({ status: "error", message: "Diet entry not found." });
    await entry.destroy();
    return res.json({ status: "success", message: "Diet entry deleted." });
  } catch (error) {
    console.error("Diet entry deletion failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to delete diet entry." });
  }
}

export async function getDietSummary(req, res) {
  try {
    if (!(await canAccessClient(req.user, req.params.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const twoWeeksAgo = addDaysToDateString(todayInGymTz(), -14);
    const entries = await DietTracker.findAll({
      where: { clientId: req.params.id, weightKg: { [Op.ne]: null } },
      order: [["recordedOn", "DESC"]],
    });
    const latest = entries[0] ?? null;
    const previous = entries.find((entry) => entry.recordedOn <= twoWeeksAgo) ?? null;
    return res.json({
      status: "success",
      data: {
        latestWeightKg: latest?.weightKg ?? null,
        latestRecordedOn: latest?.recordedOn ?? null,
        weightChangeOverTwoWeeksKg: latest && previous
          ? Number((Number(latest.weightKg) - Number(previous.weightKg)).toFixed(2))
          : null,
        history: entries.slice(0, 30),
      },
    });
  } catch (error) {
    console.error("Diet summary failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve diet summary." });
  }
}
