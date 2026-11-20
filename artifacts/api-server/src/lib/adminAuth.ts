import type { Request, Response, NextFunction } from "express";

/**
 * Simple shared-secret gate for admin endpoints.
 *
 * The admin UI sends the configured ADMIN_PASSWORD as a Bearer token
 * (`Authorization: Bearer <ADMIN_PASSWORD>`). When ADMIN_PASSWORD is not set
 * on the server, every admin route is locked down (403) so the panel can never
 * be reached unprotected.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    res.status(403).json({ error: "Admin access is not configured" });
    return;
  }

  const header = req.headers["authorization"];
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token || token !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
