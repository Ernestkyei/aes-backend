import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

// Force load from config/config.env
dotenv.config({ path: "./config/config.env" });

export default defineConfig({
  schema: "prisma",  // ← Points to the FOLDER containing models/
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});