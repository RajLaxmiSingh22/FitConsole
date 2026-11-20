import { access, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendDist = path.join(repositoryRoot, "Frontend", "dist");
const backendPublic = path.join(repositoryRoot, "Backend", "public");

try {
  await access(path.join(frontendDist, "index.html"));
} catch {
  throw new Error("Frontend/dist/index.html is missing; build the frontend before packaging it.");
}

await rm(backendPublic, { recursive: true, force: true });
await rename(frontendDist, backendPublic);
console.log("Moved the frontend build into Backend/public.");
