import { getPrisma } from "./prisma";

export type FraudResult = {
  flags: string[];
  score: number;
};

export async function detectFraud(meta: {
  phone?: string;
  deviceFingerprint?: string;
  transactionId?: string;
}) {
  const prisma = getPrisma() as any;
  const flags: string[] = [];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (meta.transactionId) {
    const dup = await prisma.order.findFirst({
      where: { transactionId: meta.transactionId }
    });
    if (dup) flags.push("txn_duplicate");
  }

  if (meta.phone) {
    const count = await prisma.order.count({
      where: { phone: meta.phone, createdAt: { gte: since } }
    });
    if (count >= 3) flags.push("phone_repeat");
  }

  if (meta.deviceFingerprint) {
    const count = await prisma.order.count({
      where: { deviceFingerprint: meta.deviceFingerprint, createdAt: { gte: since } }
    });
    if (count >= 3) flags.push("device_repeat");
  }

  const score = flags.length * 20;
  return { flags, score } as FraudResult;
}
