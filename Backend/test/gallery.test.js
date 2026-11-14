import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { classifyGalleryUpload, detectVideoType } from "../src/controllers/galleryController.js";
import { avatarFolder, cloudinaryConfig, galleryFolder, signParams } from "../src/services/cloudinary.js";
import { galleryReorderSchema, galleryUpdateSchema, galleryUploadQuerySchema } from "../src/validation/index.js";

const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from("ftypisom"), Buffer.alloc(16)]);
const mov = Buffer.concat([Buffer.from([0, 0, 0, 0x14]), Buffer.from("ftypqt  "), Buffer.alloc(16)]);
const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(16)]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);

test("gallery videos are identified by signature", () => {
  assert.equal(detectVideoType(mp4), "video/mp4");
  assert.equal(detectVideoType(mov), "video/quicktime");
  assert.equal(detectVideoType(webm), "video/webm");
  assert.equal(detectVideoType(jpeg), null);
});

test("gallery uploads must match their declared type", () => {
  assert.deepEqual(classifyGalleryUpload(jpeg, "image/jpeg"), { mediaType: "image", mimeType: "image/jpeg" });
  assert.equal(classifyGalleryUpload(mp4, "video/mp4").mediaType, "video");
  assert.equal(classifyGalleryUpload(mov, "video/mp4").mimeType, "video/quicktime");
  assert.ok(classifyGalleryUpload(jpeg, "video/mp4").error);
  assert.ok(classifyGalleryUpload(mp4, "image/png").error);
  assert.ok(classifyGalleryUpload(webm, "video/mp4").error);
  assert.ok(classifyGalleryUpload(Buffer.from("<svg>-------"), "image/svg+xml").error);
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
  assert.equal(galleryUploadQuerySchema.validate({ title: " Mats " }).value.published, true);
  assert.ok(galleryUploadQuerySchema.validate({}).error);
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
