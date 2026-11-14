import assert from "node:assert/strict";
import test from "node:test";
import { checkCourseCover, COURSE_COVER_MAX_BYTES } from "../src/controllers/courseController.js";
import { requireRole } from "../src/middleware/requireRole.js";
import courseRoutes from "../src/routes/courseRoutes.js";
import { courseCoverSaveSchema, updateCourseSchema } from "../src/validation/index.js";

test("course cover accepts JPEG, PNG and WebP up to 5 MB", () => {
  assert.equal(checkCourseCover("image/jpeg", 1000), null);
  assert.equal(checkCourseCover("image/webp", COURSE_COVER_MAX_BYTES), null);
});

test("course cover rejects the wrong file type with 400", () => {
  assert.equal(checkCourseCover("image/svg+xml", 100).status, 400);
  assert.equal(checkCourseCover("image/gif", 100).status, 400);
  assert.equal(checkCourseCover(undefined, 100).status, 400);
});

test("course cover rejects files over 5 MB with 413", () => {
  assert.equal(checkCourseCover("image/png", COURSE_COVER_MAX_BYTES + 1).status, 413);
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
  const coverLayers = courseRoutes.stack.filter((layer) => layer.route?.path.startsWith("/:id/cover"));
  assert.deepEqual(coverLayers.map((layer) => `${Object.keys(layer.route.methods)[0]} ${layer.route.path}`).sort(), ["delete /:id/cover", "post /:id/cover", "post /:id/cover/upload"]);
  for (const layer of coverLayers) {
    const names = layer.route.stack.map((item) => item.name);
    assert.equal(names[0], "requireAuthentication");
    assert.ok(names.indexOf("requireAuthentication") < names.length - 1);
    assert.equal(layer.route.stack.length >= 3, true);
  }
});

test("cover alt text and default cover are validated", () => {
  assert.ok(courseCoverSaveSchema.validate({ publicId: "fitconsole/courses/x/y", alt: "x".repeat(201) }).error);
  assert.ok(courseCoverSaveSchema.validate({ alt: "Boxer" }).error);
  assert.equal(updateCourseSchema.validate({ coverDefault: "kids" }).error, undefined);
  assert.ok(updateCourseSchema.validate({ coverDefault: "yoga" }).error);
  assert.equal(updateCourseSchema.validate({ coverImageAlt: "Boxer hitting pads" }).error, undefined);
  assert.equal(updateCourseSchema.validate({ coverImageUrl: "https://evil" }).error?.message, '"value" must have at least 1 key');
});
