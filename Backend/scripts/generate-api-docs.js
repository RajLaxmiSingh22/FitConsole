// Generates Frontend/src/docs/endpoints.json for the owner /docs "Endpoint directory" from the real
// Express routes. `npm run docs:generate` writes the file; `npm run docs:check` (part of npm test)
// fails when the file is out of date or a route has no description in src/routes/routeDescriptions.js.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CSRF_EXEMPT_PATHS } from "../src/middleware/csrfProtection.js";
import { routeDescriptions } from "../src/routes/routeDescriptions.js";
import { discoverRoutes, ROLES } from "./lib/routes.mjs";

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(backend, "../Frontend/src/docs/endpoints.json");
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

function access(route) {
  if (!route.auth) return route.optionalAuth ? "Public (more for signed-in users)" : "Public";
  if (ROLES.every((role) => route.roles.includes(role))) return "Any signed-in user";
  return capitalise(route.roles.join(", "));
}

// "yes": the X-CSRF-Token header is required. "if signed in": public route, checked only when a session
// cookie is sent. "no": reads, sign-in/session routes, and routers mounted before the CSRF check.
function csrf(route) {
  if (SAFE.has(route.method) || !route.csrfChecked || CSRF_EXEMPT_PATHS.has(route.path)) return "no";
  return route.auth ? "yes" : "if signed in";
}

export async function buildEndpoints() {
  const routes = await discoverRoutes(backend);
  const missing = routes.filter((route) => !routeDescriptions[`${route.method} ${route.path}`]);
  if (missing.length) {
    throw new Error(`Add a description to src/routes/routeDescriptions.js for:\n${missing.map((route) => `  "${route.method} ${route.path}"`).join("\n")}`);
  }
  const known = new Set(routes.map((route) => `${route.method} ${route.path}`));
  const stale = Object.keys(routeDescriptions).filter((key) => !known.has(key));
  if (stale.length) throw new Error(`Remove descriptions for routes that no longer exist:\n${stale.map((key) => `  "${key}"`).join("\n")}`);
  const endpoints = routes.map((route) => ({
    method: route.method,
    path: route.path,
    access: access(route),
    csrf: csrf(route),
    // The demo member account is read-only: the server refuses its changes on every route.
    demoReadOnly: !SAFE.has(route.method) && route.auth && route.roles.includes("client"),
    description: routeDescriptions[`${route.method} ${route.path}`],
  }));
  // One endpoint per line keeps diffs readable.
  return `[\n${endpoints.map((endpoint) => `  ${JSON.stringify(endpoint)}`).join(",\n")}\n]\n`;
}

async function main() {
  const json = await buildEndpoints();
  if (process.argv.includes("--check")) {
    const current = await readFile(output, "utf8").catch(() => "");
    if (current !== json) {
      console.error("Frontend/src/docs/endpoints.json is out of date with the API routes. Run `npm run docs:generate`, update the /docs page and docs/CHANGELOG.md, then commit.");
      process.exit(1);
    }
    console.log(`API docs are up to date (${JSON.parse(json).length} endpoints).`);
    return;
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, json);
  console.log(`Wrote ${JSON.parse(json).length} endpoints to Frontend/src/docs/endpoints.json.`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
