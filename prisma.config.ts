import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || ""
  },
  migrations: {
    seed: "tsx prisma/seed.ts"
  }
});
