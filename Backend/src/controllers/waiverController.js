import { sequelize } from "../database.js";
import { Client, User, WaiverAcceptance, WaiverAudit } from "../models/index.js";
import { canAccessClient } from "../utils/access.js";

export function getCurrentWaiver(_req, res) {
  return res.json({
    status: "success",
    data: {
      version: process.env.WAIVER_VERSION ?? "1",
      text: process.env.WAIVER_TEXT ?? "",
    },
  });
}

export async function acceptWaiver(req, res) {
  try {
    const value = req.validated.body;
    const client = await Client.findOne({ where: { userId: req.user.id } });
    if (!client) return res.status(404).json({ status: "error", message: "Client profile not found." });
    const acceptance = await sequelize.transaction(async (transaction) => {
      const [acceptance, created] = await WaiverAcceptance.findOrCreate({
        where: { clientId: client.id, agreementVersion: process.env.WAIVER_VERSION ?? "1" },
        defaults: {
          acceptedAt: new Date(),
          documentReference: value.documentReference || null,
        },
        transaction,
      });
      if (created) {
        await WaiverAudit.create({
          waiverAcceptanceId: acceptance.id,
          ipAddress: req.ip,
        }, { transaction });
      }
      return { acceptance, created };
    });
    return res.status(acceptance.created ? 201 : 200).json({ status: "success", data: acceptance.acceptance });
  } catch (error) {
    console.error("Waiver acceptance failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to record waiver acceptance." });
  }
}

export async function listClientWaivers(req, res) {
  try {
    if (!(await canAccessClient(req.user, req.params.id))) {
      return res.status(404).json({ status: "error", message: "Client not found." });
    }
    const waivers = await WaiverAcceptance.findAll({
      where: { clientId: req.params.id },
      include: [{ model: Client, include: [{ model: User, attributes: ["id", "fullName"] }] }],
      order: [["acceptedAt", "DESC"]],
    });
    return res.json({ status: "success", data: waivers });
  } catch (error) {
    console.error("Client waiver lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve waivers." });
  }
}
