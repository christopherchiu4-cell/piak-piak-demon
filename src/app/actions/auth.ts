"use server";

import { redirect } from "next/navigation";
import { authenticate, endSession } from "@/lib/auth";

export async function signIn(formData: FormData) {
  const role = formData.get("role") === "TEACHER" ? "TEACHER" : "STUDENT";
  const login = String(formData.get("login") ?? "");
  const credential = String(formData.get("credential") ?? "");
  const valid = await authenticate(login, credential, role);
  if (!valid) redirect("/login?error=1");
  redirect(role === "TEACHER" ? "/teacher" : "/student");
}

export async function signOut() {
  await endSession();
  redirect("/login");
}
