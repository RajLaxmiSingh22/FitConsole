const publicPaths = ["/", "/about", "/trainers", "/programs", "/schedule", "/gallery", "/memberships", "/pricing", "/contact", "/trial", "/faq", "/privacy", "/terms", "/waiver", "/waiver-info", "/agreement", "/forgot-password", "/reset-password"];

export const publicPathAliases = { "/pricing": "/memberships", "/waiver": "/agreement", "/waiver-info": "/agreement" };

export function isPublicPath(path) {
  return publicPaths.includes(path) || path.startsWith("/reset-password/");
}

export function isDocsPath(path) {
  return path === "/docs" || path.startsWith("/docs/");
}
