import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkbook } from "../src/controllers/exportController.js";
import { formatInvoiceNumber, getGstRate, splitGstInclusive } from "../src/utils/gst.js";

test("GST-inclusive amounts split into taxable value and equal halves that sum exactly", () => {
  assert.deepEqual(splitGstInclusive(1180, 18), { taxable: 1000, cgst: 90, sgst: 90, total: 1180 });
  const odd = splitGstInclusive(999.99, 18);
  assert.equal(Math.round((odd.taxable + odd.cgst + odd.sgst) * 100), 99999);
  assert.ok(Math.abs(odd.cgst - odd.sgst) <= 0.01);
  assert.deepEqual(splitGstInclusive(500, 0), { taxable: 500, cgst: 0, sgst: 0, total: 500 });
});

test("GST rate defaults to 18 and rejects invalid values", () => {
  assert.equal(getGstRate({}), 18);
  assert.equal(getGstRate({ GST_RATE: "5" }), 5);
  assert.throws(() => getGstRate({ GST_RATE: "abc" }));
  assert.throws(() => getGstRate({ GST_RATE: "40" }));
});

test("invoice numbers are zero-padded", () => {
  assert.equal(formatInvoiceNumber(42), "FC-000042");
});

test("workbooks freeze the header and format currency columns in rupees", () => {
  const workbook = buildWorkbook(
    [{ header: "Course", key: "course" }, { header: "Total", key: "total", currency: true }],
    [{ course: "MMA", total: 1500 }],
  );
  const sheet = workbook.getWorksheet("Report");
  assert.deepEqual(sheet.views[0], { state: "frozen", ySplit: 1 });
  assert.equal(sheet.getCell("B2").numFmt, '"₹" #,##0.00');
  assert.equal(sheet.getCell("A2").numFmt, undefined);
  assert.equal(sheet.getCell("B1").value, "Total");
});
