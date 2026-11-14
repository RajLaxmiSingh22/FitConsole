import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { galleryUploadKind } from "../src/controllers/galleryController.js";
import { avatarFolder, cloudinaryConfig, galleryFolder, signParams } from "../src/services/cloudinary.js";
import { directUploadRequestSchema, galleryCreateSchema, galleryReorderSchema, galleryUpdateSchema } from "../src/validation/index.js";

test("gallery uploads are planned from the declared type and size", () => {
  assert.deepEqual(galleryUploadKind("image/jpeg", 1000), { kind: "gallery-image", mediaType: "image" });
  assert.deepEqual(galleryUploadKind("video/quicktime", 50 * 1024 * 1024), { kind: "gallery-video", mediaType: "video" });
  assert.ok(galleryUploadKind("image/svg+xml", 10).error);
  assert.ok(galleryUploadKind("image/gif", 10).error);
  assert.equal(galleryUploadKind("image/png", 10 * 1024 * 1024 + 1).status, 413);
  assert.equal(galleryUploadKind("video/mp4", 100 * 1024 * 1024 + 1).status, 413);
  assert.equal(galleryUploadKind("video/mp4", 0).status, 413);
});

test("cloudinary folders follow the documented layout", () => {
  assert.equal(avatarFolder("fitconsole", "trainer", "u1"), "fitconsole/users/avatars/trainer/u1");
  assert.equal(avatarFolder("fitconsole", "admin", "u1"), "fitconsole/users/avatars/other/u1");
  assert.equal(galleryFolder("fitconsole", "video"), "fitconsole/gallery/videos");
  assert.equal(galleryFolder("fitconsole", "image"), "fitconsole/gallery/images");
});

test("cloudinary config needs all three credentials and trims the root folder", () => {
  assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "c", CLOUDINARY_API_KEY: "k" }), null);
  assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "c", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "s", CLOUDINARY_ROOT_FOLDER: "/gym/" }).root, "gym");
});

test("cloudinary signatures sort params and skip empty values", () => {
  const expected = createHash("sha1").update("folder=a/b&public_id=x&timestamp=10secret").digest("hex");
  assert.equal(signParams({ timestamp: 10, public_id: "x", folder: "a/b", empty: "" }, "secret"), expected);
});

test("gallery request schemas", () => {
  const publicId = "fitconsole/gallery/images/0b8e2f4e-1c3a-4d5e-8f60-123456789abc";
  assert.equal(galleryCreateSchema.validate({ publicId, mediaType: "image", title: " Mats " }).value.published, true);
  assert.ok(galleryCreateSchema.validate({ publicId, mediaType: "image" }).error);
  assert.ok(galleryCreateSchema.validate({ publicId: "https://evil.example/x.jpg", mediaType: "image", title: "Mats" }).error);
  assert.ok(directUploadRequestSchema.validate({ mimeType: "image/png" }).error);
  assert.ok(galleryUpdateSchema.validate({}).error);
  assert.ok(galleryUpdateSchema.validate({ sortOrder: -1 }).error);
  assert.equal(galleryUpdateSchema.validate({ isPublished: false, url: "x" }).value.url, undefined);
  assert.ok(galleryReorderSchema.validate({ ids: ["nope"] }).error);
});

test("cloudinary config reads CLOUDINARY_URL", () => {
  const config = cloudinaryConfig({ CLOUDINARY_URL: "cloudinary://key123:sec%2Fret@democloud" });
  assert.deepEqual([config.cloudName, config.apiKey, config.apiSecret, config.root], ["democloud", "key123", "sec/ret", "fitconsole"]);
  assert.equal(cloudinaryConfig({ CLOUDINARY_URL: "not a url" }), null);
});
