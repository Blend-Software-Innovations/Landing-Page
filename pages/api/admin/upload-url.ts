import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { isRateLimited } from "../../../lib/rateLimit";
import { adminRateLimitPerMin } from "../../../lib/env";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function sanitizeName(input: string) {
  return input.replace(/[^\w.-]+/g, "-").toLowerCase();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-upload-url:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }

  if (!hasPermission(role, "media:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  if (!requireCsrf(req, res)) return;

  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    return res.status(400).json({ error: "S3 not configured." });
  }

  const body = req.body as { filename?: string; contentType?: string };
  const filename = body?.filename ? sanitizeName(body.filename) : `upload-${Date.now()}.jpg`;
  const contentType = body?.contentType || "application/octet-stream";
  const key = `uploads/${Date.now()}-${filename}`;

  const client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ACL: "public-read" });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 });
  const publicBase = process.env.S3_PUBLIC_URL || `https://${bucket}.s3.${region}.amazonaws.com`;

  return res.status(200).json({ uploadUrl, publicUrl: `${publicBase}/${key}` });
}

