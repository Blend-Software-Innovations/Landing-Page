import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import os from "os";
import fs from "fs";
import path from "path";
import { uploadImage } from "../../lib/uploads";

export const config = {
  api: { bodyParser: false }
};

const dataPath = path.join(process.cwd(), "data", "manual-payments.jsonl");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({
    multiples: false,
    uploadDir: os.tmpdir(),
    keepExtensions: true,
    maxFileSize: 6 * 1024 * 1024
  });

  form.parse(req, async (err: unknown, fields: Record<string, any>, files: Record<string, any>) => {
    if (err) return res.status(400).json({ error: "Invalid upload" });
    const proofFile = files.paymentProof as any;
    const file = Array.isArray(proofFile) ? proofFile[0] : proofFile;
    if (!file) return res.status(400).json({ error: "Missing file" });

    try {
      const payloadRaw = String(fields.payload || "{}");
      const payload = JSON.parse(payloadRaw);
      const upload = await uploadImage(file.filepath, file.originalFilename || "payment-proof.jpg", "public");
      const record = { ...payload, proofUrl: upload.url, createdAt: new Date().toISOString() };
      fs.mkdirSync(path.dirname(dataPath), { recursive: true });
      fs.appendFileSync(dataPath, `${JSON.stringify(record)}\n`);
      return res.status(200).json({ status: "ok", url: upload.url });
    } catch (uploadError) {
      console.error("Payment proof upload failed", uploadError);
      return res.status(500).json({ error: "Upload failed" });
    }
  });
}
