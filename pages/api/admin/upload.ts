import { logger } from "../../../lib/logger";
﻿import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import os from "os";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { adminRateLimitPerMin } from "../../../lib/env";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";
import { sniffImageType, uploadImage } from "../../../lib/uploads";

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-upload:${ip}`, adminRateLimitPerMin, 60_000)) {
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
    // The client-declared mimetype is attacker-controlled — sniff the actual bytes.
    // Only raster formats pass; SVG (stored XSS vector) is rejected by design.
    const type = sniffImageType(file.filepath);
    if (!type) {
      return res.status(400).json({ error: "Only JPEG, PNG or WebP image uploads are allowed." });
    }

    try {
      const result = await uploadImage(file.filepath, `upload.${type.ext}`, "public");
      return res.status(200).json({ url: result.url, provider: result.provider });
    } catch (uploadError) {
      logger.error({ err: uploadError }, "Upload failed");
      return res.status(500).json({ error: "Upload failed. Check storage configuration." });
    }
  });
}

