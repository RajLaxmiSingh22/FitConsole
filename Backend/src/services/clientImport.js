import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { createClientSchema } from "../validation/index.js";

export const IMPORT_MAX_ROWS = 500;

// Template columns, in order. `aliases` are other headers people commonly use for the same field.
export const IMPORT_COLUMNS = [
  { key: "fullName", header: "Full name *", aliases: ["name", "fullname", "clientname", "membername", "customername"] },
  { key: "email", header: "Email *", aliases: ["email", "emailaddress", "emailid", "mail"] },
  { key: "phone", header: "Phone", aliases: ["phone", "mobile", "phonenumber", "mobilenumber", "mobileno", "phoneno", "contactno", "contact", "contactnumber", "whatsapp"] },
  { key: "dateOfBirth", header: "Date of birth", aliases: ["dob", "dateofbirth", "birthdate", "birthday"] },
  { key: "gender", header: "Gender", aliases: ["gender", "sex"] },
  { key: "heightCm", header: "Height (cm)", aliases: ["height", "heightcm"] },
  { key: "weightKg", header: "Weight (kg)", aliases: ["weight", "weightkg"] },
  { key: "goal", header: "Goal", aliases: ["goal", "goals", "fitnessgoal"] },
  { key: "bloodGroup", header: "Blood group", aliases: ["bloodgroup", "blood"] },
  { key: "address", header: "Address", aliases: ["address", "city"] },
  { key: "emergencyContactPhone", header: "Emergency contact phone", aliases: ["emergencycontact", "emergencycontactphone", "emergencyphone", "emergencynumber"] },
  { key: "guardianName", header: "Guardian name", aliases: ["guardian", "guardianname", "parent", "parentname"] },
  { key: "healthIssues", header: "Health issues", aliases: ["healthissues", "health", "medicalconditions", "medical", "medicalhistory"] },
  { key: "injuries", header: "Injuries", aliases: ["injuries", "injury"] },
  { key: "trainer", header: "Trainer (name or email)", aliases: ["trainer", "trainername", "traineremail", "trainernameoremail", "coach", "assignedtrainer"] },
  { key: "joinedAt", header: "Joined (YYYY-MM-DD)", aliases: ["joined", "joinedat", "joindate", "joinedon", "joiningdate", "dateofjoining", "joinedyyyymmdd", "startdate"] },
];

const normalizeHeader = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const HEADER_LOOKUP = new Map(IMPORT_COLUMNS.flatMap((column) => [column.key.toLowerCase(), normalizeHeader(column.header), ...column.aliases].map((alias) => [alias, column.key])));
const DATE_KEYS = new Set(["dateOfBirth", "joinedAt"]);

const rowSchema = createClientSchema.fork(["password"], (schema) => schema.forbidden()).keys({
  joinedAt: createClientSchema.extract("dateOfBirth").max("now").messages({ "date.max": "\"joinedAt\" cannot be in the future" }),
});

const pad = (value) => String(value).padStart(2, "0");
const isoDate = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

// Excel cells can hold dates, numbers, hyperlinks, rich text or formulas; reduce each to plain text.
export function cellText(value, key) {
  if (value == null) return "";
  if (value instanceof Date) return isoDate(value);
  if (typeof value === "object") {
    if ("result" in value) return cellText(value.result, key);
    if ("text" in value) return cellText(value.text, key);
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("").trim();
    return "";
  }
  const text = String(value).trim();
  // Sheets usually store dates day-first in India: 05/11/2026 or 5-11-2026.
  if (DATE_KEYS.has(key)) {
    const dayFirst = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (dayFirst) return `${dayFirst[3]}-${pad(dayFirst[2])}-${pad(dayFirst[1])}`;
  }
  return text;
}

// Reads the first worksheet of an .xlsx (or a .csv) into { headers, unknownHeaders, rows: [{ line, values }] }.
export async function readSpreadsheet(buffer) {
  const workbook = new ExcelJS.Workbook();
  const isZip = buffer.length > 3 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  let sheet;
  if (isZip) {
    await workbook.xlsx.load(buffer);
    sheet = workbook.worksheets.find((candidate) => candidate.actualRowCount > 0) ?? workbook.worksheets[0];
  } else {
    sheet = await workbook.csv.read(Readable.from(buffer.toString("utf8").replace(/^﻿/, "")));
  }
  if (!sheet) return { headers: [], unknownHeaders: [], rows: [] };
  const columns = new Map();
  const unknownHeaders = [];
  sheet.getRow(1).eachCell((cell, index) => {
    const label = cellText(cell.value);
    const key = HEADER_LOOKUP.get(normalizeHeader(label));
    if (key && ![...columns.values()].includes(key)) columns.set(index, key);
    else if (label) unknownHeaders.push(label);
  });
  const rows = [];
  sheet.eachRow((row, line) => {
    if (line === 1) return;
    const values = {};
    for (const [index, key] of columns) {
      const text = cellText(row.getCell(index).value, key);
      if (text) values[key] = text;
    }
    if (Object.keys(values).length) rows.push({ line, values });
  });
  return { headers: [...columns.values()], unknownHeaders, rows };
}

// Matches a trainer cell against trainer emails and full names, case-insensitively.
export function trainerResolver(trainers) {
  const lookup = new Map();
  for (const trainer of trainers) {
    if (trainer.email) lookup.set(trainer.email.toLowerCase(), trainer.id);
    if (trainer.fullName) lookup.set(trainer.fullName.trim().toLowerCase(), trainer.id);
  }
  return (value) => lookup.get(String(value).trim().toLowerCase()) ?? null;
}

const LABELS = new Map(IMPORT_COLUMNS.map((column) => [column.key, column.header.replace(/\s*[*(].*$/, "")]));
// Joi messages name the field key ("heightCm must be ..."); show the sheet's column name instead.
function readableError(detail) {
  const key = detail.context?.key;
  const message = detail.message.replace(/"/g, "");
  return LABELS.has(key) ? message.replace(key, LABELS.get(key)) : message;
}

// Validates each row; returns per-row results without touching the database.
export function checkRows(rows, { existingEmails = new Set(), resolveTrainer = () => null } = {}) {
  const seen = new Map();
  return rows.map(({ line, values }) => {
    const { trainer, ...fields } = values;
    // "o +ve", "B positive", "ab-" → "O+", "B+", "AB-".
    if (fields.bloodGroup) fields.bloodGroup = fields.bloodGroup.toUpperCase().replace(/\s+/g, "").replace(/^(A|B|AB|O)(\+|-)?(VE|POSITIVE|NEGATIVE)?$/, (match, type, sign, word) => (sign || word ? type + (sign ?? (word === "NEGATIVE" ? "-" : "+")) : match));
    if (fields.email) fields.email = fields.email.toLowerCase();
    const errors = [];
    const { value, error } = rowSchema.validate(fields, { abortEarly: false, convert: true });
    if (error) errors.push(...error.details.map(readableError));
    let trainerId = null;
    if (trainer) {
      trainerId = resolveTrainer(trainer);
      if (!trainerId) errors.push(`trainer "${trainer}" not found`);
    }
    const base = { line, fullName: fields.fullName ?? "", email: fields.email ?? "", trainer: trainer ?? "" };
    if (errors.length) return { ...base, status: "error", errors };
    if (existingEmails.has(value.email)) return { ...base, status: "duplicate", errors: ["an account with this email already exists"] };
    if (seen.has(value.email)) return { ...base, status: "duplicate", errors: [`same email as row ${seen.get(value.email)}`] };
    seen.set(value.email, line);
    return { ...base, status: "ready", errors: [], data: { ...value, trainerId } };
  });
}

export function summarize(results) {
  const count = (status) => results.filter((row) => row.status === status).length;
  return { total: results.length, ready: count("ready"), duplicate: count("duplicate"), error: count("error") };
}
