import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { cellText, checkRows, readSpreadsheet, summarize, trainerResolver } from "../src/services/clientImport.js";

async function xlsx(rows) {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Members").addRows(rows);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test("common header names map to client fields; unknown headers are reported", async () => {
  const sheet = await readSpreadsheet(await xlsx([
    ["Name", "E-mail", "Mobile No.", "DOB", "Coach", "Locker"],
    ["Asha Rao", { text: "Asha@Example.com", hyperlink: "mailto:asha@example.com" }, 9876543210, new Date(Date.UTC(1999, 3, 2)), "Vikram Singh", "A12"],
    [],
  ]));
  assert.deepEqual(sheet.headers, ["fullName", "email", "phone", "dateOfBirth", "trainer"]);
  assert.deepEqual(sheet.unknownHeaders, ["Locker"]);
  assert.equal(sheet.rows.length, 1);
  assert.deepEqual(sheet.rows[0], { line: 2, values: { fullName: "Asha Rao", email: "Asha@Example.com", phone: "9876543210", dateOfBirth: "1999-04-02", trainer: "Vikram Singh" } });
});

test("csv files are read too", async () => {
  const sheet = await readSpreadsheet(Buffer.from("﻿Full name,Email,Joined\nRavi K,ravi@example.com,05/11/2025\n"));
  assert.deepEqual(sheet.rows[0].values, { fullName: "Ravi K", email: "ravi@example.com", joinedAt: "2025-11-05" });
});

test("day-first dates are converted only for date columns", () => {
  assert.equal(cellText("5/1/2026", "joinedAt"), "2026-01-05");
  assert.equal(cellText("5/1/2026", "goal"), "5/1/2026");
  assert.equal(cellText({ formula: "A1", result: 42 }), "42");
});

test("rows are classified as ready, duplicate or error", () => {
  const resolveTrainer = trainerResolver([{ id: "t-1", fullName: "Vikram Singh", email: "vikram@example.com" }]);
  const results = checkRows([
    { line: 2, values: { fullName: "Asha Rao", email: "ASHA@example.com", trainer: "vikram singh", bloodGroup: "o +ve", heightCm: "165" } },
    { line: 3, values: { fullName: "Asha Again", email: "asha@example.com" } },
    { line: 4, values: { fullName: "Old Member", email: "old@example.com" } },
    { line: 5, values: { fullName: "No Email" } },
    { line: 6, values: { fullName: "Bad Coach", email: "c@example.com", trainer: "Nobody" } },
    { line: 7, values: { fullName: "Future", email: "f@example.com", joinedAt: "2999-01-01" } },
  ], { existingEmails: new Set(["old@example.com"]), resolveTrainer });
  assert.deepEqual(results.map((row) => row.status), ["ready", "duplicate", "duplicate", "error", "error", "error"]);
  assert.equal(results[0].data.trainerId, "t-1");
  assert.equal(results[0].data.bloodGroup, "O+");
  assert.equal(results[0].data.heightCm, 165);
  assert.match(results[1].errors[0], /row 2/);
  assert.match(results[4].errors[0], /Nobody/);
  assert.match(results[5].errors.join(), /future/);
  assert.deepEqual(summarize(results), { total: 6, ready: 1, duplicate: 2, error: 3 });
});

test("import rows can never set a password", () => {
  const [row] = checkRows([{ line: 2, values: { fullName: "Asha Rao", email: "a@example.com", password: "hunter2hunter2" } }]);
  assert.equal(row.status, "error");
});
