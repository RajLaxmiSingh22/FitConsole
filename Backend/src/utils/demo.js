// One-click public demo account (DEMO_MODE_ENABLED). Credentials live only in the backend environment.
export function getDemoConfig(environment = process.env) {
  const enabled = environment.DEMO_MODE_ENABLED === "true";
  const email = environment.DEMO_CLIENT_EMAIL?.trim().toLowerCase();
  const password = environment.DEMO_CLIENT_PASSWORD;
  return { enabled: Boolean(enabled && email && password), email, password };
}

// The demo account is recognised by its configured email, whether or not demo mode is currently enabled.
export function isDemoUser(user, environment = process.env) {
  const email = environment.DEMO_CLIENT_EMAIL?.trim().toLowerCase();
  return Boolean(email && user?.role === "client" && user.email === email);
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Shared demo data must not be changed by visitors: every state-changing request is refused server-side.
export function demoWriteBlocked(user, method, environment = process.env) {
  return isDemoUser(user, environment) && !SAFE_METHODS.has(method);
}
