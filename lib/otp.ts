import crypto from "crypto";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

type OtpEntry = {
  id: string;
  phone: string;
  codeHash: string;
  expiresAt: string;
  used: boolean;
  attempts: number;
  createdAt: string;
};

type OtpSession = {
  token: string;
  phone: string;
  expiresAt: string;
};

type OtpLock = {
  phone: string;
  lockedUntil: string;
};

const dataDir = path.join(process.cwd(), "data");
const otpPath = path.join(dataDir, "otp.json");
const sessionPath = path.join(dataDir, "otp-sessions.json");
const cooldownPath = path.join(dataDir, "otp-cooldown.json");
const lockoutPath = path.join(dataDir, "otp-lockout.json");

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(file: string, data: T) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function hash(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomCode(length: number) {
  const digits = "0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += digits[Math.floor(Math.random() * digits.length)];
  }
  return out;
}

export function requestOtp(phone: string, ttlMinutes = 5, length = 6) {
  const cooldowns = readJson<Record<string, string>>(cooldownPath, {});
  const locked = readJson<OtpLock[]>(lockoutPath, []);
  const lock = locked.find((item) => item.phone === phone);
  if (lock && new Date(lock.lockedUntil).getTime() > Date.now()) {
    return { otpId: "", code: "", blockedUntil: lock.lockedUntil };
  }
  const until = cooldowns[phone];
  if (until && new Date(until).getTime() > Date.now()) {
    return { otpId: "", code: "", blockedUntil: until };
  }
  const code = randomCode(length);
  const entry: OtpEntry = {
    id: nanoid(),
    phone,
    codeHash: hash(code),
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
    used: false,
    attempts: 0,
    createdAt: new Date().toISOString()
  };
  const current = readJson<OtpEntry[]>(otpPath, []);
  writeJson(otpPath, [entry, ...current].slice(0, 200));
  return { otpId: entry.id, code };
}

export function getOtpMetrics() {
  const entries = readJson<OtpEntry[]>(otpPath, []);
  const cooldowns = readJson<Record<string, string>>(cooldownPath, {});
  const locks = readJson<OtpLock[]>(lockoutPath, []);
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

  entries.forEach((entry) => {
    const key = entry.phone;
    if (!byPhone[key]) {
      byPhone[key] = { attempts: 0, pending: 0 };
    }
    const current = byPhone[key];
    current.attempts += entry.attempts || 0;
    if (!entry.used && new Date(entry.expiresAt).getTime() > Date.now()) {
      current.pending += 1;
    }
    if (!current.lastRequested || new Date(entry.createdAt).getTime() > new Date(current.lastRequested).getTime()) {
      current.lastRequested = entry.createdAt;
    }
  });

  Object.entries(cooldowns).forEach(([phone, until]) => {
    if (!byPhone[phone]) byPhone[phone] = { attempts: 0, pending: 0 };
    byPhone[phone].cooldownUntil = until;
  });

  locks.forEach((lock) => {
    if (!byPhone[lock.phone]) byPhone[lock.phone] = { attempts: 0, pending: 0 };
    byPhone[lock.phone].lockedUntil = lock.lockedUntil;
  });

  return Object.entries(byPhone)
    .map(([phone, data]) => ({ phone, ...data }))
    .sort((a, b) => (b.lastRequested || "").localeCompare(a.lastRequested || ""))
    .slice(0, 100);
}

export function clearOtpLock(phone: string) {
  const locks = readJson<OtpLock[]>(lockoutPath, []);
  const next = locks.filter((item) => item.phone !== phone);
  writeJson(lockoutPath, next);
  return true;
}

export function clearOtpCooldown(phone: string) {
  const cooldowns = readJson<Record<string, string>>(cooldownPath, {});
  if (cooldowns[phone]) {
    delete cooldowns[phone];
    writeJson(cooldownPath, cooldowns);
  }
  return true;
}

export function setOtpCooldown(phone: string, cooldownSeconds: number) {
  const data = readJson<Record<string, string>>(cooldownPath, {});
  data[phone] = new Date(Date.now() + cooldownSeconds * 1000).toISOString();
  writeJson(cooldownPath, data);
}

export function lockOtp(phone: string, minutes: number) {
  const items = readJson<OtpLock[]>(lockoutPath, []);
  const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  const next = items.filter((item) => item.phone !== phone);
  next.push({ phone, lockedUntil: until });
  writeJson(lockoutPath, next);
  return { lockedUntil: until };
}

export function verifyOtp(
  otpId: string,
  phone: string,
  code: string,
  sessionTtlMinutes = 30,
  maxAttempts = 5,
  lockoutMinutes = 10
) {
  const locked = readJson<OtpLock[]>(lockoutPath, []);
  const lock = locked.find((item) => item.phone === phone);
  if (lock && new Date(lock.lockedUntil).getTime() > Date.now()) return null;
  const items = readJson<OtpEntry[]>(otpPath, []);
  const entry = items.find((item) => item.id === otpId && item.phone === phone && !item.used);
  if (!entry) return null;
  if (new Date(entry.expiresAt).getTime() < Date.now()) return null;
  if (entry.codeHash !== hash(code)) {
    entry.attempts += 1;
    writeJson(otpPath, items);
    if (entry.attempts >= maxAttempts) {
      lockOtp(phone, lockoutMinutes);
    }
    return null;
  }
  entry.used = true;
  writeJson(otpPath, items);
  const session: OtpSession = {
    token: nanoid(32),
    phone,
    expiresAt: new Date(Date.now() + sessionTtlMinutes * 60 * 1000).toISOString()
  };
  const sessions = readJson<OtpSession[]>(sessionPath, []);
  writeJson(sessionPath, [session, ...sessions].slice(0, 200));
  return session.token;
}

export function validateOtpToken(token: string, phone: string) {
  const sessions = readJson<OtpSession[]>(sessionPath, []);
  const match = sessions.find((s) => s.token === token && s.phone === phone);
  if (!match) return false;
  if (new Date(match.expiresAt).getTime() < Date.now()) return false;
  return true;
}
