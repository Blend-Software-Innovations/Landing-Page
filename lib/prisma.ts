import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { pgSsl, pgConnectionString } from "./db";

let prisma: PrismaClient | null = null;

export function getPrisma() {
  if (!prisma) {
    const url = process.env.DATABASE_URL || "";
    const adapter = new PrismaPg({ connectionString: pgConnectionString(url), ssl: pgSsl(url) });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}
