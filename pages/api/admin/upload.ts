import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import os from "os";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { isRateLimited } from "../../../lib/rateLimit";
import { adminRateLimitPerMin } from "../../../lib/env";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";
import { uploadImage } from "../../../lib/uploads";

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-upload:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many uploads. Please try again shortly." });
  }

  if (!hasPermission(role, "media:write")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  if (!requireCsrf(req, res)) return;

  const form = formidable({
    multiples: false,
    uploadDir: os.tmpdir(),
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024
  });

  form.parse(req, async (err: unknown, _fields: Record<string, unknown>, files: Record<string, unknown>) => {
    if (err) return res.status(400).json({ error: "Invalid upload" });
    const proofFile = files.file as any;
    const file = Array.isArray(proofFile) ? proofFile[0] : proofFile;
    if (!file) return res.status(400).json({ error: "Missing file" });
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Only image uploads are allowed." });
    }

    try {
      const result = await uploadImage(file.filepath, file.originalFilename || "upload.jpg", "public");
      return res.status(200).json({ url: result.url, provider: result.provider });
    } catch (uploadError) {
      console.error("Upload failed", uploadError);
      return res.status(500).json({ error: "Upload failed. Check storage configuration." });
    }
  });
}

