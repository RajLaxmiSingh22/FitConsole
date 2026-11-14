import { sequelize } from "../database.js";
import { Client, User, WaiverAcceptance, WaiverAudit, WaiverDocument } from "../models/index.js";
import { canAccessClient } from "../utils/access.js";
import { getCurrentWaiver as loadCurrentWaiver, getCurrentWaiverVersion, nextWaiverVersion } from "../utils/waiver.js";

export async function getCurrentWaiver(_req, res) {
  try {
    const waiver = await loadCurrentWaiver();
    return res.json({
      status: "success",
      data: {
        version: waiver?.version ?? getCurrentWaiverVersion(),
        text: waiver?.text ?? "",
        configured: Boolean(waiver),
        // "app" (owner published), "environment" (WAIVER_TEXT) or "default" (built-in standard agreement).
        source: waiver?.source ?? null,
        publishedAt: waiver?.publishedAt ?? null,
      },
    });
  } catch (error) {
    console.error("Current waiver lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve the gym agreement." });
  }
}

export async function acceptWaiver(req, res) {
  try {
    const value = req.validated.body;
    const waiver = await loadCurrentWaiver();
    if (!waiver) {
      return res.status(503).json({
        status: "error",
        message: "The gym agreement has not been set up yet. Please contact the gym.",
        code: "WAIVER_NOT_CONFIGURED",
      });
    }
    const client = await Client.findOne({ where: { userId: req.user.id } });
    if (!client) return res.status(404).json({ status: "error", message: "Client profile not found." });
    const acceptance = await sequelize.transaction(async (transaction) => {
      const [acceptance, created] = await WaiverAcceptance.findOrCreate({
        where: { clientId: client.id, agreementVersion: waiver.version },
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

// Owner: every published version, newest first, plus the current one (which may come from the environment).
export async function listWaiverVersions(_req, res) {
  try {
    const [current, versions] = await Promise.all([
      loadCurrentWaiver(),
      WaiverDocument.findAll({
        attributes: ["id", "version", "text", "createdAt"],
        include: [{ model: User, as: "publisher", attributes: ["id", "fullName"] }],
        order: [["createdAt", "DESC"]],
      }),
    ]);
    return res.json({ status: "success", data: { current, versions } });
  } catch (error) {
    console.error("Waiver version list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve agreement versions." });
  }
}

// Owner: publishes a new agreement version; members accept it before their next enrolment, check-in or payment.
export async function publishWaiver(req, res) {
  try {
    const text = req.validated.body.text;
    const document = await sequelize.transaction(async (transaction) => {
      await sequelize.query("SELECT pg_advisory_xact_lock(hashtext('fitconsole:waiver-publish'))", { transaction });
      const current = await loadCurrentWaiver({ transaction });
      // Re-publishing the built-in text is allowed: it makes it the gym's own, versioned agreement.
      if (current?.source !== "default" && current?.text === text) return null;
      const existing = await WaiverDocument.findAll({ attributes: ["version"], transaction });
      return WaiverDocument.create({
        version: nextWaiverVersion(existing.map((row) => row.version), current),
        text,
        publishedBy: req.user.id,
      }, { transaction });
    });
    if (!document) {
      return res.status(409).json({ status: "error", message: "This text is already the current agreement." });
    }
    return res.status(201).json({ status: "success", data: { version: document.version, text: document.text, publishedAt: document.createdAt } });
  } catch (error) {
    console.error("Waiver publish failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to publish the agreement." });
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
