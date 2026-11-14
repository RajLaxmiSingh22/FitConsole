import assert from "node:assert/strict";
import test from "node:test";
import { DIRECT_UPLOAD_KINDS, signDirectUpload, signParams, verifyDirectUpload } from "../src/services/cloudinary.js";

const config = { cloudName: "democloud", apiKey: "key123", apiSecret: "secret456", root: "fitconsole" };
const courseId = "11111111-1111-4111-8111-111111111111";
const uuid = "0b8e2f4e-1c3a-4d5e-8f60-123456789abc";

// Fake Admin API: answers a resource lookup with `asset` (or 404 when null) and records the URL.
function fakeCloudinary(asset) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, auth: options.headers.Authorization });
    if (!asset) return { status: 404, ok: false, json: async () => ({ error: { message: "not found" } }) };
    return { status: 200, ok: true, json: async () => asset };
  };
  return { fetchImpl, calls };
}
const imageAsset = (publicId, overrides = {}) => ({ public_id: publicId, resource_type: "image", type: "upload", format: "jpg", bytes: 2048, width: 1600, height: 900, secure_url: `https://res.cloudinary.com/democloud/image/upload/v1/${publicId}.jpg`, ...overrides });

test("signed uploads are locked to one folder, a random name and allowed formats", () => {
  const signed = signDirectUpload({ kind: "gallery-video" }, { config, now: 1_700_000_000_000 });
  assert.equal(signed.uploadUrl, "https://api.cloudinary.com/v1_1/democloud/video/upload");
  assert.equal(signed.fields.folder, "fitconsole/gallery/videos");
  assert.match(signed.fields.public_id, /^[0-9a-f-]{36}$/);
  assert.equal(signed.fields.allowed_formats, "mp4,mov,webm");
  assert.equal(signed.fields.overwrite, "false");
  assert.equal(signed.fields.api_key, "key123");
  const { api_key: _key, signature, ...signedParams } = signed.fields;
  assert.equal(signature, signParams(signedParams, "secret456"));
  assert.equal(JSON.stringify(signed).includes("secret456"), false, "the API secret never leaves the server");
  assert.equal(signed.maxBytes, 100 * 1024 * 1024);
});

test("course cover signatures include the 16:9 WebP transformation and the course folder", () => {
  const signed = signDirectUpload({ kind: "course-cover", courseId }, { config });
  assert.equal(signed.fields.folder, `fitconsole/courses/${courseId}`);
  assert.equal(signed.fields.transformation, "c_fill,g_auto,w_1200,h_675,f_webp");
  assert.equal(signed.fields.format, "webp");
  assert.equal(signed.publicIdPrefix, `fitconsole/courses/${courseId}/`);
});

test("a verified upload uses Cloudinary's own URL and size from our account", async () => {
  const publicId = `fitconsole/gallery/images/${uuid}`;
  const cloud = fakeCloudinary(imageAsset(publicId));
  const result = await verifyDirectUpload({ kind: "gallery-image", publicId }, { config, fetchImpl: cloud.fetchImpl });
  assert.equal(result.error, undefined);
  assert.equal(result.asset.url, imageAsset(publicId).secure_url);
  assert.equal(result.asset.bytes, 2048);
  assert.equal(cloud.calls[0].url, `https://api.cloudinary.com/v1_1/democloud/resources/image/upload/fitconsole/gallery/images/${uuid}`);
  assert.equal(cloud.calls[0].auth, `Basic ${Buffer.from("key123:secret456").toString("base64")}`);
});

test("uploads outside our folder are refused without asking Cloudinary", async () => {
  const cloud = fakeCloudinary(null);
  for (const publicId of [
    `someone-else/gallery/images/${uuid}`,
    `fitconsole/gallery/videos/${uuid}`,
    `fitconsole/gallery/images/../users/avatars/owner/${uuid}`,
    `fitconsole/gallery/images/${uuid}/extra`,
    "fitconsole/gallery/images/not-a-uuid",
    `fitconsole/gallery/imagesX/${uuid}`,
  ]) {
    const result = await verifyDirectUpload({ kind: "gallery-image", publicId }, { config, fetchImpl: cloud.fetchImpl });
    assert.equal(result.status, 400, publicId);
  }
  assert.equal(cloud.calls.length, 0);
  const otherCourse = await verifyDirectUpload({ kind: "course-cover", courseId, publicId: `fitconsole/courses/22222222-2222-4222-8222-222222222222/${uuid}` }, { config, fetchImpl: cloud.fetchImpl });
  assert.equal(otherCourse.status, 400);
});

test("missing, oversized or wrong-format uploads are refused (and the bad file removed)", async () => {
  const publicId = `fitconsole/gallery/images/${uuid}`;
  const missing = await verifyDirectUpload({ kind: "gallery-image", publicId }, { config, fetchImpl: fakeCloudinary(null).fetchImpl });
  assert.deepEqual([missing.status, missing.remove], [400, undefined]);
  const tooBig = await verifyDirectUpload({ kind: "gallery-image", publicId }, { config, fetchImpl: fakeCloudinary(imageAsset(publicId, { bytes: DIRECT_UPLOAD_KINDS["gallery-image"].maxBytes + 1 })).fetchImpl });
  assert.deepEqual([tooBig.status, tooBig.remove], [413, true]);
  const gif = await verifyDirectUpload({ kind: "gallery-image", publicId }, { config, fetchImpl: fakeCloudinary(imageAsset(publicId, { format: "gif" })).fetchImpl });
  assert.deepEqual([gif.status, gif.remove], [400, true]);
  const wrongType = await verifyDirectUpload({ kind: "gallery-image", publicId }, { config, fetchImpl: fakeCloudinary(imageAsset(publicId, { resource_type: "raw" })).fetchImpl });
  assert.equal(wrongType.status, 400);
});

test("a course cover must have been converted to WebP by the signed transformation", async () => {
  const publicId = `fitconsole/courses/${courseId}/${uuid}`;
  const png = await verifyDirectUpload({ kind: "course-cover", courseId, publicId }, { config, fetchImpl: fakeCloudinary(imageAsset(publicId, { format: "png" })).fetchImpl });
  assert.deepEqual([png.status, png.remove], [400, true]);
  const webp = await verifyDirectUpload({ kind: "course-cover", courseId, publicId }, { config, fetchImpl: fakeCloudinary(imageAsset(publicId, { format: "webp" })).fetchImpl });
  assert.equal(webp.error, undefined);
});

test("a 100 MB video limit is enforced from Cloudinary's real byte count", async () => {
  const publicId = `fitconsole/gallery/videos/${uuid}`;
  const video = (bytes) => ({ public_id: publicId, resource_type: "video", type: "upload", format: "mp4", bytes, secure_url: `https://res.cloudinary.com/democloud/video/upload/v1/${publicId}.mp4` });
  const ok = await verifyDirectUpload({ kind: "gallery-video", publicId }, { config, fetchImpl: fakeCloudinary(video(90 * 1024 * 1024)).fetchImpl });
  assert.equal(ok.asset.posterUrl, `https://res.cloudinary.com/democloud/video/upload/v1/${publicId}.jpg`);
  const big = await verifyDirectUpload({ kind: "gallery-video", publicId }, { config, fetchImpl: fakeCloudinary(video(101 * 1024 * 1024)).fetchImpl });
  assert.equal(big.status, 413);
});
