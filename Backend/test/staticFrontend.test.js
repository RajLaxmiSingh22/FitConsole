import assert from "node:assert/strict";
import { once } from "node:events";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { app } from "../src/app.js";

const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");

test("serves the frontend shell and built assets without swallowing API 404s", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const origin = `http://127.0.0.1:${server.address().port}`;
  const home = await fetch(`${origin}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type") ?? "", /text\/html/);
  assert.match(await home.text(), /<div id="root"><\/div>/);

  const page = await fetch(`${origin}/dashboard/owner`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type") ?? "", /text\/html/);

  const cssFile = (await readdir(path.join(publicDirectory, "assets"))).find((file) => file.endsWith(".css"));
  assert.ok(cssFile, "the frontend build should include a CSS asset");
  const asset = await fetch(`${origin}/assets/${cssFile}`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("content-type") ?? "", /text\/css/);

  const missingApiRoute = await fetch(`${origin}/api/route-that-does-not-exist`);
  assert.equal(missingApiRoute.status, 404);
  assert.match(missingApiRoute.headers.get("content-type") ?? "", /application\/json/);
});
