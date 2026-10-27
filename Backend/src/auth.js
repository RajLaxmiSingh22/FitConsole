import jwt from "jsonwebtoken";

export function assertJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a secret of at least 32 characters.");
  }
}

function getJwtSecret() {
  assertJwtSecret();
  return process.env.JWT_SECRET;
}

export function createAuthToken(user) {
  return jwt.sign({}, getJwtSecret(), {
    subject: user.id,
    algorithm: "HS256",
    expiresIn: "1h",
  });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}
