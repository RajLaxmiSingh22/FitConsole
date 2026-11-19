export function requireRole(...roles) {
  const guard = (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden",
      });
    }

    return next();
  };
  guard.allowedRoles = [...roles];
  return guard;
}
