import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { Op } from "sequelize";
import { sequelize } from "../database.js";
import { Client, Member, Trainer, User } from "../models/index.js";
import { IMPORT_COLUMNS, IMPORT_MAX_ROWS, checkRows, readSpreadsheet, summarize, trainerResolver } from "../services/clientImport.js";
import { buildWorkbook } from "./exportController.js";

export async function downloadImportTemplate(_req, res) {
  try {
    const workbook = buildWorkbook(
      IMPORT_COLUMNS.map((column) => ({ header: column.header, key: column.key, width: Math.max(14, column.header.length + 4) })),
      [{ fullName: "Example Member", email: "member@example.com", phone: "9876543210", dateOfBirth: "1998-04-21", gender: "Female", heightCm: 165, weightKg: 60, goal: "Build strength", joinedAt: "2026-01-15" }],
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=\"clients-import-template.xlsx\"");
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("Import template failed:", error);
    if (!res.headersSent) return res.status(500).json({ status: "error", message: "Unable to build the import template." });
    return res.end();
  }
}

// Checks an uploaded sheet; with ?commit=true also creates every "ready" row in one transaction.
export async function importClients(req, res) {
  if (!Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(400).json({ status: "error", message: "Upload an .xlsx or .csv file." });
  }
  let sheet;
  try {
    sheet = await readSpreadsheet(req.body);
  } catch {
    return res.status(400).json({ status: "error", message: "That file could not be read. Save it as .xlsx or .csv and try again." });
  }
  if (!sheet.headers.includes("fullName") || !sheet.headers.includes("email")) {
    return res.status(400).json({ status: "error", message: "The first row must include a name column and an email column. Download the template to see the expected headers." });
  }
  if (!sheet.rows.length) return res.status(400).json({ status: "error", message: "The file has no client rows under the header." });
  if (sheet.rows.length > IMPORT_MAX_ROWS) {
    return res.status(400).json({ status: "error", message: `Import up to ${IMPORT_MAX_ROWS} clients at a time; this file has ${sheet.rows.length}.` });
  }
  try {
    const emails = [...new Set(sheet.rows.map((row) => row.values.email?.trim().toLowerCase()).filter(Boolean))];
    const [existing, trainers] = await Promise.all([
      User.findAll({ where: { email: { [Op.in]: emails } }, attributes: ["email"] }),
      Trainer.findAll({ attributes: ["id"], include: [{ model: User, attributes: ["fullName", "email"] }] }),
    ]);
    const results = checkRows(sheet.rows, {
      existingEmails: new Set(existing.map((user) => user.email.toLowerCase())),
      resolveTrainer: trainerResolver(trainers.map((trainer) => ({ id: trainer.id, fullName: trainer.User?.fullName, email: trainer.User?.email }))),
    });
    const ready = results.filter((row) => row.status === "ready");
    const commit = req.query.commit === "true";
    if (commit && ready.length) {
      // Imported members get no usable password: one hash of a discarded secret. They set one via "Forgot password".
      const passwordHash = await argon2.hash(randomBytes(32).toString("hex"));
      await sequelize.transaction(async (transaction) => {
        for (const row of ready) {
          const { fullName, email, ...profile } = row.data;
          const user = await User.create({ fullName, email, passwordHash, role: "client" }, { transaction });
          await Client.create({ ...profile, userId: user.id }, { transaction });
          await Member.create({ userId: user.id, phone: profile.phone, dateOfBirth: profile.dateOfBirth }, { transaction });
        }
      });
    }
    return res.status(commit ? 201 : 200).json({
      status: "success",
      data: {
        committed: commit,
        summary: { ...summarize(results), imported: commit ? ready.length : 0 },
        unknownHeaders: sheet.unknownHeaders,
        rows: results.map(({ data: _data, ...row }) => row),
      },
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ status: "error", message: "Some emails were registered while importing. Check the file again and retry." });
    }
    console.error("Client import failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to import clients. Nothing was saved." });
  }
}
