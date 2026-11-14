// Route audit: `npm run audit:routes`
//
// 1. Creates a throwaway database (fitconsole_audit_<timestamp>) next to the one in .env; the real
//    database is never touched.
// 2. Starts the API on AUDIT_PORT (default 9020) against it with email, Cloudinary, Cashfree and
//    Gemini switched off, applies migrations and runs the demo seeds.
// 3. Lists every route from the Express routers (not from docs), works out authentication and allowed
//    roles from each route's own middleware, and calls every route as no login, owner, trainer, client
//    and the demo account. Writes are sent with and without the X-CSRF-Token header.
// 4. Writes ../route-audit-<date>.md (git-ignored), stops the server and drops the database.
//
// Exit code 0 when every check passes, 1 otherwise.
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { discoverRoutes } from "./lib/routes.mjs";

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(backend, ".env") });
const env = { ...process.env };
const PORT = Number(process.env.AUDIT_PORT ?? 9020);
const BASE = `http://localhost:${PORT}`;
const DB = `fitconsole_audit_${Date.now()}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Integrations are switched off so the audit never emails, uploads, charges or calls an AI model.
const auditEnv = {
  ...process.env, DB_NAME: DB, PORT: String(PORT), NODE_ENV: "development", DEMO_MODE_ENABLED: "true",
  SMTP_HOST: "", SMTP_USER: "", SMTP_PASS: "", SMTP_PASSWORD: "", SMTP_PORT: "",
  CLOUDINARY_URL: "", CLOUDINARY_CLOUD_NAME: "", CLOUDINARY_API_KEY: "", CLOUDINARY_API_SECRET: "",
  CASHFREE_APP_ID: "", CASHFREE_SECRET_KEY: "", Cashfree_ID: "", Cashfree_Secret_Key: "",
  GEMINI_API_KEY: "", GEMINI_MODEL: "",
};

const admin = () => new pg.Client({ host: env.DB_HOST ?? "localhost", port: Number(env.DB_PORT ?? 5432), user: env.DB_USER, password: env.DB_PASSWORD, database: "postgres" });
async function adminQuery(sql) { const client = admin(); await client.connect(); try { await client.query(sql); } finally { await client.end(); } }

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: backend, env: auditEnv, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("exit", (code) => (code === 0 ? resolve(output) : reject(new Error(`${args.join(" ")} failed:\n${output}`))));
  });
}

// ---------- calls ----------
async function login(pathname, body) {
  const response = await fetch(`${BASE}${pathname}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await response.json();
  if (!json.data?.csrfToken) throw new Error(`Login failed (${pathname}): ${JSON.stringify(json)}`);
  return { cookie: response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; "), csrf: json.data.csrfToken };
}

const UUID = "00000000-0000-4000-8000-000000000000";
// Documented exceptions to the { status, data } envelope.
const NON_ENVELOPE = new Set(["GET /api/health"]);
// Routes that end or rotate the session run last, each with fresh sessions.
const SESSION_ENDING = new Set(["POST /api/auth/logout", "POST /api/auth/refresh", "PATCH /api/auth/password"]);

async function main() {
  const { CSRF_EXEMPT_PATHS } = await import(pathToFileURL(path.join(backend, "src/middleware/csrfProtection.js")));
  const routes = await discoverRoutes(backend);

  console.log(`Creating ${DB} …`);
  await adminQuery(`CREATE DATABASE "${DB}"`);
  let server;
  try {
    server = spawn(process.execPath, ["src/server.js"], { cwd: backend, env: auditEnv, stdio: ["ignore", "pipe", "pipe"] });
    let serverLog = "";
    server.stdout.on("data", (chunk) => { serverLog += chunk; });
    server.stderr.on("data", (chunk) => { serverLog += chunk; });
    for (let i = 0; i < 60 && !serverLog.includes("listening"); i += 1) await sleep(500);
    if (!serverLog.includes("listening")) throw new Error(`API did not start:\n${serverLog}`);
    console.log("Seeding demo data …");
    await runNode(["src/seeds/demoClient.js"]);
    await runNode(["src/seeds/demoGym.js"]);

    const ids = await (async () => {
      const client = new pg.Client({ host: env.DB_HOST ?? "localhost", port: Number(env.DB_PORT ?? 5432), user: env.DB_USER, password: env.DB_PASSWORD, database: DB });
      await client.connect();
      const member = (await client.query("select email from users where role = 'client' and email like '%@demo.fitconsole.example.com' and email <> lower($1) order by email limit 1", [env.DEMO_CLIENT_EMAIL ?? ""])).rows[0];
      const row = (await client.query("select (select id from courses limit 1) course, (select id from clients limit 1) client, (select id from memberships limit 1) membership, (select id from payments limit 1) payment")).rows[0];
      await client.end();
      return { ...row, memberEmail: member?.email };
    })();
    const fill = (route) => route.replace(/:(\w+)/g, (_, key) => {
      if (/order/i.test(key)) return "fitconsole_audit_missing";
      if (/date/i.test(key)) return "2026-01-01";
      return ({ id: ids.course, clientId: ids.client, paymentId: ids.payment, membershipId: ids.membership })[key] ?? UUID;
    });

    const freshSessions = async () => ({
      none: null,
      owner: await login("/api/auth/login", { email: env.OWNER_EMAIL, password: env.OWNER_PASSWORD }),
      trainer: await login("/api/auth/login", { email: env.TRAINER_1_EMAIL, password: env.TRAINER_1_PASSWORD }),
      client: await login("/api/auth/login", { email: ids.memberEmail, password: env.DEMO_GYM_PASSWORD }),
      demo: await login("/api/auth/demo-login"),
    });
    let sessions = await freshSessions();

    async function call(route, who, csrf) {
      const session = sessions[who];
      const headers = { "Content-Type": "application/json" };
      const write = route.method !== "GET";
      if (session) headers.Cookie = session.cookie;
      if (session && write && csrf) headers["X-CSRF-Token"] = session.csrf;
      const response = await fetch(`${BASE}${fill(route.path)}`, { method: route.method, headers, body: write ? "{}" : undefined, redirect: "manual" });
      const type = response.headers.get("content-type") ?? "";
      let shape = "file"; let message = "";
      if (type.includes("json")) {
        const body = await response.json().catch(() => null);
        message = body?.message ?? "";
        const key = `${route.method} ${route.path}`;
        if (NON_ENVELOPE.has(key)) shape = body?.status === "ok" ? "ok (health exception)" : "BAD";
        else shape = body && ((body.status === "success" && ("data" in body || "message" in body)) || (body.status === "error" && typeof body.message === "string")) ? "ok" : "BAD";
      } else await response.arrayBuffer();
      return { status: response.status, shape, message };
    }

    // What each caller should get. "allowed" means: not 401/403 and no 5xx (400/404 from dummy input is fine).
    function expected(route, who) {
      const key = `${route.method} ${route.path}`;
      if (route.path.endsWith("/cashfree/webhook")) return { text: "401 (unsigned webhook)", check: (r) => r.status === 401 };
      if (key === "POST /api/auth/refresh" && who === "none") return { text: "401 (no refresh cookie)", check: (r) => r.status === 401 };
      if (!route.auth) return { text: "allowed", check: (r) => ![401, 403].includes(r.status) && r.status < 500 };
      if (who === "none") return { text: "401", check: (r) => r.status === 401 };
      const role = who === "demo" ? "client" : who;
      if (!route.roles.includes(role)) return { text: "403", check: (r) => r.status === 403 };
      if (who === "demo" && route.method !== "GET") return { text: "403 demo read-only", check: (r) => r.status === 403 };
      // A switched-off integration answers 503 "not configured", which is the correct response here.
      return { text: "allowed", check: (r) => ![401, 403].includes(r.status) && (r.status < 500 || (r.status === 503 && /not (configured|set up)/i.test(r.message))) };
    }

    const rows = [];
    const ordered = [...routes.filter((r) => !SESSION_ENDING.has(`${r.method} ${r.path}`)), ...routes.filter((r) => SESSION_ENDING.has(`${r.method} ${r.path}`))];
    for (const route of ordered) {
      if (SESSION_ENDING.has(`${route.method} ${route.path}`)) sessions = await freshSessions();
      const write = route.method !== "GET";
      for (const who of ["none", "owner", "trainer", "client", "demo"]) {
        const expectation = expected(route, who);
        const actual = await call(route, who, true);
        const pass = (expectation.check(actual) || (actual.status === 429 && !route.auth)) && actual.shape !== "BAD";
        rows.push({ route, who, csrf: write ? "with" : "-", expected: expectation.text, actual, pass });
        const allowed = expectation.text === "allowed";
        if (write && who !== "none" && allowed && !route.path.endsWith("/webhook")) {
          const exempt = CSRF_EXEMPT_PATHS.has(route.path);
          const noCsrf = await call(route, who, false);
          const csrfBlocked = noCsrf.status === 403 && /csrf/i.test(noCsrf.message);
          rows.push({ route, who, csrf: "without", expected: exempt ? "CSRF-exempt" : "403 CSRF", actual: noCsrf, pass: exempt ? !csrfBlocked : csrfBlocked });
        }
      }
    }

    const fails = rows.filter((row) => !row.pass);
    const report = [
      `# Route audit ${new Date().toISOString().slice(0, 10)}`, "",
      `${routes.length} routes · ${rows.length} checks · ${rows.length - fails.length} pass · ${fails.length} fail`, "",
      "| route | method | role | csrf | expected | actual | result |", "|---|---|---|---|---|---|---|",
      ...rows.map((row) => `| ${row.route.path} | ${row.route.method} | ${row.who} | ${row.csrf} | ${row.expected} | ${row.actual.status}${row.actual.message ? ` ${row.actual.message.slice(0, 50).replaceAll("|", "/")}` : ""} | ${row.pass ? "PASS" : "**FAIL**"} |`),
    ].join("\n");
    const file = path.join(backend, "..", `route-audit-${new Date().toISOString().slice(0, 10)}.md`);
    await writeFile(file, `${report}\n`);
    console.log(`${routes.length} routes · ${rows.length} checks · ${rows.length - fails.length} pass · ${fails.length} fail`);
    for (const row of fails) console.log(`FAIL ${row.route.method} ${row.route.path} [${row.who}, csrf ${row.csrf}] expected ${row.expected}, got ${row.actual.status} ${row.actual.message} (shape ${row.actual.shape})`);
    const serverErrors = serverLog.split("\n").filter((line) => /error|failed/i.test(line));
    if (serverErrors.length) console.log(`Server logged ${serverErrors.length} error line(s):\n${serverErrors.slice(0, 10).join("\n")}`);
    console.log(`Report: ${file}`);
    process.exitCode = fails.length || serverErrors.length ? 1 : 0;
  } finally {
    server?.kill();
    await sleep(1000);
    await adminQuery(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
    console.log(`Dropped ${DB}.`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
