import crypto from "crypto";
import { nanoid } from "nanoid";
import { getPrisma } from "./prisma";

function hash(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomCode(length: number) {
  const digits = "0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += digits[crypto.randomInt(0, digits.length)];
  }
  return out;
}

async function pruneExpired(prisma: any) {
  const now = new Date();
  await prisma.otpCode.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.otpSession.deleteMany({ where: { expiresAt: { lt: now } } });
}

export async function requestOtp(phone: string, ttlMinutes = 5, length = 6) {
  const prisma = getPrisma() as any;
  await pruneExpired(prisma);

  const throttle = await prisma.otpThrottle.findUnique({ where: { phone } });
  const now = Date.now();
  if (throttle?.lockedUntil && throttle.lockedUntil.getTime() > now) {
    return { otpId: "", code: "", blockedUntil: throttle.lockedUntil.toISOString() };
  }
  if (throttle?.cooldownUntil && throttle.cooldownUntil.getTime() > now) {
    return { otpId: "", code: "", blockedUntil: throttle.cooldownUntil.toISOString() };
  }

  const code = randomCode(length);
  const entry = await prisma.otpCode.create({
    data: {
      id: nanoid(),
      phone,
      codeHash: hash(code),
      expiresAt: new Date(now + ttlMinutes * 60 * 1000),
      used: false,
      attempts: 0
    }
  });
  return { otpId: entry.id, code };
}

export async function getOtpMetrics() {
  const prisma = getPrisma() as any;
  const entries: any[] = await prisma.otpCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 500
  });
  const throttles: any[] = await prisma.otpThrottle.findMany();

  const byPhone: Record<
    string,
    {
      lastRequested?: string;
      attempts: number;
      pending: number;
      cooldownUntil?: string;
      lockedUntil?: string;
    }
  > = {};

  const now = Date.now();
  entries.forEach((entry) => {
    const key = entry.phone;
    if (!byPhone[key]) byPhone[key] = { attempts: 0, pending: 0 };
    const current = byPhone[key];
    current.attempts += entry.attempts || 0;
    if (!entry.used && entry.expiresAt.getTime() > now) current.pending += 1;
    const created = entry.createdAt.toISOString();
    if (!current.lastRequested || created > current.lastRequested) {
      current.lastRequested = created;
    }
  });

  throttles.forEach((t) => {
    if (!byPhone[t.phone]) byPhone[t.phone] = { attempts: 0, pending: 0 };
    if (t.cooldownUntil) byPhone[t.phone].cooldownUntil = t.cooldownUntil.toISOString();
    if (t.lockedUntil) byPhone[t.phone].lockedUntil = t.lockedUntil.toISOString();
  });

  return Object.entries(byPhone)
    .map(([phone, data]) => ({ phone, ...data }))
    .sort((a, b) => (b.lastRequested || "").localeCompare(a.lastRequested || ""))
    .slice(0, 100);
}

export async function clearOtpLock(phone: string) {
  const prisma = getPrisma() as any;
  await prisma.otpThrottle.updateMany({ where: { phone }, data: { lockedUntil: null } });
  return true;
}

export async function clearOtpCooldown(phone: string) {
  const prisma = getPrisma() as any;
  await prisma.otpThrottle.updateMany({ where: { phone }, data: { cooldownUntil: null } });
  return true;
}

export async function setOtpCooldown(phone: string, cooldownSeconds: number) {
  const prisma = getPrisma() as any;
  const cooldownUntil = new Date(Date.now() + cooldownSeconds * 1000);
  await prisma.otpThrottle.upsert({
    where: { phone },
    create: { phone, cooldownUntil },
    update: { cooldownUntil }
  });
}

export async function lockOtp(phone: string, minutes: number) {
  const prisma = getPrisma() as any;
  const lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
  await prisma.otpThrottle.upsert({
    where: { phone },
    create: { phone, lockedUntil },
    update: { lockedUntil }
  });
  return { lockedUntil: lockedUntil.toISOString() };
}

export async function verifyOtp(
  otpId: string,
  phone: string,
  code: string,
  sessionTtlMinutes = 30,
  maxAttempts = 5,
  lockoutMinutes = 10
) {
  const prisma = getPrisma() as any;
  const now = Date.now();

  const throttle = await prisma.otpThrottle.findUnique({ where: { phone } });
  if (throttle?.lockedUntil && throttle.lockedUntil.getTime() > now) return null;

  const entry = await prisma.otpCode.findFirst({ where: { id: otpId, phone, used: false } });
  if (!entry) return null;
  if (entry.expiresAt.getTime() < now) return null;

  if (entry.codeHash !== hash(code)) {
    const attempts = (entry.attempts || 0) + 1;
    await prisma.otpCode.update({ where: { id: entry.id }, data: { attempts } });
    if (attempts >= maxAttempts) {
      await lockOtp(phone, lockoutMinutes);
    }
    return null;
  }

  await prisma.otpCode.update({ where: { id: entry.id }, data: { used: true } });
  const token = nanoid(32);
  await prisma.otpSession.create({
    data: {
      token,
      phone,
      expiresAt: new Date(now + sessionTtlMinutes * 60 * 1000)
    }
  });
  return token;
}

export async function validateOtpToken(token: string, phone: string) {
  const prisma = getPrisma() as any;
  const match = await prisma.otpSession.findUnique({ where: { token } });
  if (!match || match.phone !== phone) return false;
  if (match.expiresAt.getTime() < Date.now()) return false;
  return true;
}
