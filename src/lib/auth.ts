import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { createToken, hashToken, verifyCredential } from "./credentials";

const cookieName = "tutoring_session";
const sessionLengthMs = 14 * 24 * 60 * 60 * 1000;

export const currentUser = cache(async () => {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const session = await db.loginSession.findUnique({
    where: { tokenHash: hashToken(token) }, include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  return session.user;
});

export async function requireRole(role: "TEACHER" | "STUDENT") {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(user.role === "TEACHER" ? "/teacher" : "/student");
  return user;
}

export async function authenticate(login: string, credential: string, role: "TEACHER" | "STUDENT") {
  const user = await db.user.findUnique({ where: { login: login.trim().toLowerCase() } });
  if (!user || user.role !== role || !user.active || (user.lockedUntil && user.lockedUntil > new Date())) return false;
  const valid = await verifyCredential(credential, user.credentialHash);
  if (!valid) {
    const failures = user.failedLogins + 1;
    await db.user.update({ where: { id: user.id }, data: {
      failedLogins: failures >= 5 ? 0 : failures,
      lockedUntil: failures >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
    } });
    return false;
  }
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  const token = createToken();
  await db.loginSession.create({ data: {
    userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + sessionLengthMs),
  } });
  (await cookies()).set(cookieName, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: sessionLengthMs / 1000,
  });
  return true;
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db.loginSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(cookieName);
}
