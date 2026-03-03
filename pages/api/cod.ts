import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const dataPath = path.join(process.cwd(), "data", "cod.jsonl");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = req.body || {};
  const record = {
    ...payload,
    createdAt: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.appendFileSync(dataPath, `${JSON.stringify(record)}\n`);
  return res.status(200).json({ status: "ok" });
}
