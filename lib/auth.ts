import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { env } from "./env";

const dataDir = process.env.AUTH_DATA_DIR || path.join(process.cwd(), "data");
const usersPath = path.join(dataDir, "users.json");
const refreshPath = path.join(dataDir, "refresh.jsonl");
const resetPath = path.join(dataDir, "password-resets.jsonl");

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: "owner" | "admin" | "staff";
};

type RefreshRecord = {
  jti: string;
  userId: string;
  expiresAt: string;
  revoked: boolean;
};

type ResetRecord = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  used: boolean;
};

const encoder = new TextEncoder();
const accessSecret = encoder.encode(env.AUTH_JWT_SECRET);
const refreshSecret = encoder.encode(env.AUTH_REFRESH_SECRET);

function readUsers(): UserRecord[] {
  if (!fs.existsSync(usersPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(usersPath, "utf8")) as UserRecord[];
  } catch {
    return [];
  }
}

function writeUsers(users: UserRecord[]) {
  fs.mkdirSync(path.dirname(usersPath), { recursive: true });
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), "utf8");
}

export async function ensureAdminSeed() {
  if (!env.AUTH_ADMIN_EMAIL || !env.AUTH_ADMIN_PASSWORD) return;
  const users = readUsers();
  const existing = users.find((u) => u.email === env.AUTH_ADMIN_EMAIL);
  if (existing) return;
  const passwordHash = await bcrypt.hash(env.AUTH_ADMIN_PASSWORD, 10);
  const newUser: UserRecord = {
    id: nanoid(),
    email: env.AUTH_ADMIN_EMAIL,
    passwordHash,
    role: "owner"
  };
  users.push(newUser);
  writeUsers(users);
}

export async function verifyCredentials(email: string, password: string) {
  const users = readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export function findUserById(id: string) {
  const users = readUsers();
  return users.find((u) => u.id === id) || null;
}

export async function issueTokens(user: UserRecord) {
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

  const record: RefreshRecord = {
    jti,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    revoked: false
  };
  fs.mkdirSync(path.dirname(refreshPath), { recursive: true });
  fs.appendFileSync(refreshPath, `${JSON.stringify(record)}\n`);

  return { accessToken, refreshToken };
}

function readRefresh(): RefreshRecord[] {
  if (!fs.existsSync(refreshPath)) return [];
  const raw = fs.readFileSync(refreshPath, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RefreshRecord);
}

function writeRefresh(records: RefreshRecord[]) {
  fs.mkdirSync(path.dirname(refreshPath), { recursive: true });
  fs.writeFileSync(refreshPath, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
}

export async function rotateRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, refreshSecret);
  const jti = payload.jti as string | undefined;
  const userId = payload.sub as string | undefined;
  if (!jti || !userId) return null;

  const records = readRefresh();
  const record = records.find((r) => r.jti === jti && r.userId === userId && !r.revoked);
  if (!record) return null;
  if (new Date(record.expiresAt).getTime() < Date.now()) return null;

  record.revoked = true;
  writeRefresh(records);

  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  return issueTokens(user);
}

export function revokeRefreshToken(token: string) {
  try {
    const decoded = jwtVerify(token, refreshSecret);
    return decoded.then(({ payload }) => {
      const jti = payload.jti as string | undefined;
      if (!jti) return;
      const records = readRefresh();
      const record = records.find((r) => r.jti === jti);
      if (record) {
        record.revoked = true;
        writeRefresh(records);
      }
    });
  } catch {
    return Promise.resolve();
  }
}

export async function createResetToken(email: string) {
  const users = readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return null;

  const token = nanoid(32);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record: ResetRecord = {
    tokenHash,
    userId: user.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    used: false
  };
  fs.mkdirSync(path.dirname(resetPath), { recursive: true });
  fs.appendFileSync(resetPath, `${JSON.stringify(record)}\n`);
  return token;
}

export async function resetPassword(token: string, newPassword: string) {
  if (!fs.existsSync(resetPath)) return false;
  const raw = fs.readFileSync(resetPath, "utf8");
  const items = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ResetRecord);

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = items.find((r) => r.tokenHash === tokenHash && !r.used);
  if (!record) return false;
  if (new Date(record.expiresAt).getTime() < Date.now()) return false;

  const users = readUsers();
  const user = users.find((u) => u.id === record.userId);
  if (!user) return false;

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  record.used = true;
  writeUsers(users);
  fs.writeFileSync(resetPath, items.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  return true;
}
