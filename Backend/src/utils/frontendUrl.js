// Builds absolute links into the public frontend (FRONTEND_PUBLIC_URL) for emails.
export function getFrontendBaseUrl(environment = process.env) {
  const baseUrl = environment.FRONTEND_PUBLIC_URL;
  if (!baseUrl) return null;

  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("FRONTEND_PUBLIC_URL must be an absolute URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("FRONTEND_PUBLIC_URL must use HTTP or HTTPS.");
  }
  if (environment.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("FRONTEND_PUBLIC_URL must use HTTPS in production.");
  }
  return url;
}

export function frontendUrl(path, params = {}, environment = process.env) {
  const base = getFrontendBaseUrl(environment);
  if (!base) return null;
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}
