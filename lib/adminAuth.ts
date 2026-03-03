import type { NextApiRequest } from "next";

export type AdminRole = "admin" | "editor" | "none";

type Creds = { user: string; pass: string } | null;

function parseBasicAuth(req: NextApiRequest): Creds {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Basic ")) return null;
  const decoded = Buffer.from(auth.replace("Basic ", ""), "base64").toString("utf8");
  const [user, pass] = decoded.split(":");
  if (!user || !pass) return null;
  return { user, pass };
}

export function resolveRole(req: NextApiRequest): AdminRole {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  const editorUser = process.env.EDITOR_USER;
  const editorPass = process.env.EDITOR_PASS;
  const adminToken = process.env.ADMIN_TOKEN;

  if (adminToken) {
    const header = req.headers["x-admin-token"];
    if (header === adminToken) return "admin";
  }

  const basic = parseBasicAuth(req);
  if (basic && adminUser && adminPass && basic.user === adminUser && basic.pass === adminPass) {
    return "admin";
  }

  if (basic && editorUser && editorPass && basic.user === editorUser && basic.pass === editorPass) {
    return "editor";
  }

  return "none";
}

export function canRead(role: AdminRole) {
  return role === "admin" || role === "editor";
}

export function canWrite(role: AdminRole) {
  return role === "admin";
}
