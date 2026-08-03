import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveActor, resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { requireCsrf } from "../../../lib/csrf";
import { findUserById, listUsers, updateUserRole } from "../../../lib/auth";
import { getPrisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "users:read")) return res.status(401).json({ error: "Unauthorized" });
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-users:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  if (req.method === "GET") {
    const users = await listUsers();
    return res.status(200).json({ users });
  }

  if (req.method === "POST") {
    if (!hasPermission(role, "users:write")) return res.status(403).json({ error: "Forbidden" });
    if (!requireCsrf(req, res)) return;
    const body = req.body as { id?: string; role?: "owner" | "admin" | "staff" };
    if (!body.id || !body.role) return res.status(400).json({ error: "Missing data" });

    const target = await findUserById(body.id);
    if (!target) return res.status(404).json({ error: "User not found" });

    const { actor, sub } = await resolveActor(req);
    // An admin must never change their own role (self-escalation / self-lockout).
    const isSelf = (sub && sub === target.id) || (actor !== "unknown" && actor === target.email);
    if (isSelf) return res.status(400).json({ error: "You cannot change your own role" });

    const prisma = getPrisma() as any;

    // Never demote the last remaining owner — that would orphan the admin panel.
    if (target.role === "owner" && body.role !== "owner") {
      const ownerCount = await prisma.adminUser.count({ where: { role: "OWNER" } });
      if (ownerCount <= 1) {
        return res.status(400).json({ error: "Cannot demote the last remaining owner" });
      }
    }

    const user = await updateUserRole(body.id, body.role);
    if (!user) return res.status(400).json({ error: "Role update failed" });

    await prisma.auditLog.create({
      data: {
        actor: actor || null,
        role,
        action: "user.role.update",
        data: { targetId: target.id, targetEmail: target.email, from: target.role, to: body.role }
      }
    });

    return res.status(200).json({ user });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
