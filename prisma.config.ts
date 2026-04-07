import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js stores secrets in .env.local; dotenv defaults to .env
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
