import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashCredential } from "../src/lib/credentials";

const login = process.env.TEACHER_LOGIN?.trim().toLowerCase();
const password = process.env.TEACHER_PASSWORD;
const url = process.env.DATABASE_URL;
if (!login || !password || password.length < 10 || !url) {
  throw new Error("Set DATABASE_URL, TEACHER_LOGIN, and a TEACHER_PASSWORD of at least 10 characters.");
}
async function main(login: string, password: string, url: string) {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const existing = await db.user.findUnique({ where: { login } });
    if (existing) {
      if (existing.role !== "TEACHER") throw new Error("Teacher login belongs to a student.");
      process.stdout.write("Teacher account already exists. No credentials changed.\n");
    } else {
      await db.user.create({ data: {
        login, displayName: "Teacher", role: "TEACHER", credentialHash: await hashCredential(password),
      } });
      process.stdout.write("Teacher account created.\n");
    }
  } finally {
    await db.$disconnect();
  }
}

main(login, password, url).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
