import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { env } from "./env";
import { getPrisma } from "./prisma";

export type AppRole = "owner" | "admin" | "staff";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: AppRole;
};

const encoder = new TextEncoder();

// The Prisma AdminUser.role enum is uppercase (OWNER/ADMIN/STAFF) while the rest of the app
// (JWT payload, lib/adminAuth.ts permission table) uses lowercase. Map at this boundary so
// nothing downstream changes.
function toAppRole(dbRole: string): AppRole {
  return dbRole.toLowerCase() as AppRole;
}

function toDbRole(role: AppRole): string {
  return role.toUpperCase();
}

function toUserRecord(row: { id: string; email: string; passwordHash: string; role: string }): UserRecord {
  return { id: row.id, email: row.email, passwordHash: row.passwordHash, role: toAppRole(row.role) };
}

function requireAccessSecret() {
  if (!env.AUTH_JWT_SECRET) {
    throw new Error("Missing AUTH_JWT_SECRET");
  }
  return encoder.encode(env.AUTH_JWT_SECRET);
}

function requireRefreshSecret() {
  if (!env.AUTH_REFRESH_SECRET) {
    throw new Error("Missing AUTH_REFRESH_SECRET");
  }
  return encoder.encode(env.AUTH_REFRESH_SECRET);
}

export async function ensureAdminSeed() {
  if (!env.AUTH_ADMIN_EMAIL || !env.AUTH_ADMIN_PASSWORD) return;
  const prisma = getPrisma() as any;
  const existing = await prisma.adminUser.findUnique({ where: { email: env.AUTH_ADMIN_EMAIL } });
  if (existing) return;
  const passwordHash = await bcrypt.hash(env.AUTH_ADMIN_PASSWORD, 10);
  await prisma.adminUser.create({
    data: { email: env.AUTH_ADMIN_EMAIL, passwordHash, role: "OWNER" }
  });
}

export async function verifyCredentials(email: string, password: string) {
  const prisma = getPrisma() as any;
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? toUserRecord(user) : null;
}

export async function findUserById(id: string) {
  const prisma = getPrisma() as any;
  const user = await prisma.adminUser.findUnique({ where: { id } });
  return user ? toUserRecord(user) : null;
}

export async function listUsers() {
  const prisma = getPrisma() as any;
  const users = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  return users.map((u: any) => ({ id: u.id, email: u.email, role: toAppRole(u.role) }));
}

export async function updateUserRole(id: string, role: AppRole) {
  const prisma = getPrisma() as any;
  try {
    const user = await prisma.adminUser.update({
      where: { id },
      data: { role: toDbRole(role) as any }
    });
    return { id: user.id, email: user.email, role: toAppRole(user.role) };
  } catch {
    return null;
  }
}

export async function issueTokens(user: UserRecord) {
  const prisma = getPrisma() as any;
  const accessSecret = requireAccessSecret();
  const refreshSecret = requireRefreshSecret();
  const accessToken = await new SignJWT({ sub: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(accessSecret);

  const jti = nanoid();
  const refreshToken = await new SignJWT({ sub: user.id, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(refreshSecret);

  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revoked: false
    }
  });

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(token: string) {
  const prisma = getPrisma() as any;
  const refreshSecret = requireRefreshSecret();
  const { payload } = await jwtVerify(token, refreshSecret);
  const jti = payload.jti as string | undefined;
  const userId = payload.sub as string | undefined;
  if (!jti || !userId) return null;

  const record = await prisma.refreshToken.findUnique({ where: { id: jti } });
  if (!record || record.userId !== userId) return null;
  if (record.revoked) {
    // Reuse of an already-rotated token means it was stolen (or the legitimate session was) —
    // invalidate the whole token family so neither party can keep refreshing.
    await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
    return null;
  }
  if (record.expiresAt.getTime() < Date.now()) return null;

  await prisma.refreshToken.update({ where: { id: jti }, data: { revoked: true } });

  const user = await findUserById(userId);
  if (!user) return null;
  return issueTokens(user);
}

export async function revokeRefreshToken(token: string) {
  const prisma = getPrisma() as any;
  try {
    const refreshSecret = requireRefreshSecret();
    const { payload } = await jwtVerify(token, refreshSecret);
    const jti = payload.jti as string | undefined;
    if (!jti) return;
    await prisma.refreshToken.updateMany({ where: { id: jti }, data: { revoked: true } });
  } catch {
    // Invalid token — nothing to revoke.
  }
}

export async function createResetToken(email: string) {
  const prisma = getPrisma() as any;
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) return null;

  const token = nanoid(32);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prisma.passwordReset.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      used: false
    }
  });
  return token;
}

export async function validateAccessToken(token: string) {
  const accessSecret = requireAccessSecret();
  const { payload } = await jwtVerify(token, accessSecret);
  return payload;
}

export async function resetPassword(token: string, newPassword: string) {
  const prisma = getPrisma() as any;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordReset.findUnique({ where: { tokenHash } });
  if (!record || record.used) return false;
  if (record.expiresAt.getTime() < Date.now()) return false;

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.adminUser.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { tokenHash }, data: { used: true } }),
    // A password reset must terminate every existing session — otherwise an attacker
    // holding a stolen refresh token survives the victim's reset.
    prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revoked: true } })
  ]);
  return true;
}
