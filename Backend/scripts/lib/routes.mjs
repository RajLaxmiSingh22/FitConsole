// Lists every API route from the Express routers mounted in src/app.js, and works out who may call
// each one from its own middleware. Shared by the route audit and the API docs generator.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const ROLES = ["owner", "trainer", "client"];

function roleGuardRoles(fn) {
  if (Array.isArray(fn.allowedRoles)) {
    return ROLES.filter((role) => fn.allowedRoles.includes(role));
  }
  if (!fn.toString().includes("roles.includes")) return null;
  return ROLES.filter((role) => {
    let passed = false;
    fn({ user: { id: "x", role } }, { status() { return this; }, json() { return this; } }, () => { passed = true; });
    return passed;
  });
}

function importInfo(appSource) {
  return Object.fromEntries(
    [...appSource.matchAll(/import (\w+)(?:, \{ (\w+) \})? from "\.\/routes\/(\w+)\.js";/g)]
      .flatMap(([, defaultName, namedName, file]) => [
        [defaultName, [file, "default"]],
        ...(namedName ? [[namedName, [file, namedName]]] : []),
      ]),
  );
}

function mountedRouters(appSource) {
  const csrfMount = appSource.indexOf("app.use(csrfProtection)");
  return [...appSource.matchAll(/app\.use\("([^"]+)", (\w+)\);/g)].map((match) => ({
    prefix: match[1],
    name: match[2],
    csrfChecked: csrfMount >= 0 && match.index > csrfMount,
  }));
}

// Returns [{ method, path, auth, optionalAuth, roles, csrfChecked }] in mount order.
export async function discoverRoutes(backend) {
  const appSource = await readFile(path.join(backend, "src/app.js"), "utf8");
  const imports = importInfo(appSource);
  const routes = [];
  for (const { prefix, name, csrfChecked } of mountedRouters(appSource)) {
    const [file, exportName] = imports[name];
    const router = (await import(pathToFileURL(path.join(backend, "src/routes", `${file}.js`))))[exportName];
    let routerAuth = false; let routerRoles = null;
    for (const layer of router.stack) {
      if (!layer.route) {
        if (layer.handle.name === "requireAuthentication") routerAuth = true;
        const roles = roleGuardRoles(layer.handle);
        if (roles) routerRoles = routerRoles ? routerRoles.filter((role) => roles.includes(role)) : roles;
        continue;
      }
      let roles = routerRoles;
      for (const item of layer.route.stack) {
        const guard = roleGuardRoles(item.handle);
        if (guard) roles = roles ? roles.filter((role) => guard.includes(role)) : guard;
      }
      const names = layer.route.stack.map((item) => item.handle?.name || item.name);
      for (const method of Object.keys(layer.route.methods)) {
        routes.push({
          method: method.toUpperCase(),
          path: `${prefix}${layer.route.path === "/" ? "" : layer.route.path}`,
          auth: routerAuth || names.includes("requireAuthentication"),
          optionalAuth: names.includes("optionalAuthentication"),
          roles: roles ?? ROLES,
          csrfChecked,
        });
      }
    }
  }
  return routes;
}
