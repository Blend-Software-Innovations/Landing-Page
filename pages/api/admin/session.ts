import type { NextApiRequest, NextApiResponse } from "next";
import { resolveRole } from "../../../lib/adminAuth";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = resolveRole(req);
  return res.status(200).json({ role });
}
