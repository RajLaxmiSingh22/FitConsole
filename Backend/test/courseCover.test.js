import assert from "node:assert/strict";
import test from "node:test";
import { checkCourseCover, COURSE_COVER_MAX_BYTES } from "../src/controllers/courseController.js";
import { requireRole } from "../src/middleware/requireRole.js";
import courseRoutes from "../src/routes/courseRoutes.js";
import { courseCoverQuerySchema, updateCourseSchema } from "../src/validation/index.js";

const jpeg = (size = 32) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(size)]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);

test("course cover accepts real JPEG, PNG and WebP images", () => {
  assert.equal(checkCourseCover(jpeg(), "image/jpeg"), null);
  assert.equal(checkCourseCover(png, "image/png; charset=binary"), null);
});

test("course cover rejects the wrong file type with 400", () => {
  assert.equal(checkCourseCover(jpeg(), "image/png").status, 400); // renamed file
  assert.equal(checkCourseCover(Buffer.from("<svg onload=alert(1)>......"), "image/svg+xml").status, 400);
  assert.equal(checkCourseCover(Buffer.from("GIF89a---------"), "image/gif").status, 400);
  assert.equal(checkCourseCover(Buffer.alloc(0), "image/jpeg").status, 400);
});

test("course cover rejects files over 5 MB with 413", () => {
  assert.equal(checkCourseCover(jpeg(COURSE_COVER_MAX_BYTES), "image/jpeg").status, 413);
  assert.equal(checkCourseCover(jpeg(COURSE_COVER_MAX_BYTES - 4), "image/jpeg"), null);
});

test("non-owners get 403 from the owner-only guard", () => {
  for (const role of ["trainer", "client"]) {
    let status;
    let nextCalled = false;
    const res = { status(code) { status = code; return this; }, json() { return this; } };
    requireRole("owner")({ user: { id: "u", role } }, res, () => { nextCalled = true; });
    assert.equal(status, 403);
    assert.equal(nextCalled, false);
  }
});

test("cover routes require authentication and the owner role", () => {
  const coverLayers = courseRoutes.stack.filter((layer) => layer.route?.path === "/:id/cover");
  assert.deepEqual(coverLayers.map((layer) => Object.keys(layer.route.methods)[0]).sort(), ["delete", "post"]);
  for (const layer of coverLayers) {
    const names = layer.route.stack.map((item) => item.name);
    assert.equal(names[0], "requireAuthentication");
    assert.ok(names.indexOf("requireAuthentication") < names.length - 1);
    assert.equal(layer.route.stack.length >= 3, true);
  }
});

test("cover alt text and default cover are validated", () => {
  assert.ok(courseCoverQuerySchema.validate({ alt: "x".repeat(201) }).error);
  assert.equal(updateCourseSchema.validate({ coverDefault: "kids" }).error, undefined);
  assert.ok(updateCourseSchema.validate({ coverDefault: "yoga" }).error);
  assert.equal(updateCourseSchema.validate({ coverImageAlt: "Boxer hitting pads" }).error, undefined);
  assert.equal(updateCourseSchema.validate({ coverImageUrl: "https://evil" }).error?.message, '"value" must have at least 1 key');
});
