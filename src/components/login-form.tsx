"use client";

import { useState, type KeyboardEvent } from "react";
import { signIn } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "./action-form";

type Portal = "STUDENT" | "TEACHER";

export function LoginForm({ initialRole, error }: { initialRole: Portal; error: boolean }) {
  const [role, setRole] = useState(initialRole);
  const teacher = role === "TEACHER";

  function switchWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? "STUDENT" : event.key === "End" ? "TEACHER" : teacher ? "STUDENT" : "TEACHER";
    setRole(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  return <ActionForm action={signIn} className="login-form" successMessage="">
    <div className="portal-toggle" role="tablist" aria-label="Choose your portal" onKeyDown={switchWithKeyboard}>
      {(["STUDENT", "TEACHER"] as const).map((portal) => <button type="button" role="tab" id={`tab-${portal}`} key={portal} aria-selected={role === portal} aria-controls="login-panel" tabIndex={role === portal ? 0 : -1} onClick={() => setRole(portal)}>{portal === "STUDENT" ? "Student" : "Teacher"}</button>)}
    </div>
    <div role="tabpanel" id="login-panel" aria-labelledby={`tab-${role}`} className="login-panel" key={role}>
      <input type="hidden" name="role" value={role} />
      <div className="login-greeting"><p className="eyebrow">{teacher ? "Your teaching space" : "Your learning space"}</p><h2>{teacher ? "Good to see you." : "Ready for what’s next?"}</h2><p className="muted">{teacher ? "Plan a lesson, set practice, and see how your student is growing." : "Your lessons, practice, and feedback are waiting for you."}</p></div>
      {error && role === initialRole && <p className="alert" role="alert">Your username or {teacher ? "password" : "code"} wasn’t accepted. Please try again.</p>}
      <label htmlFor="login-username">Username<input id="login-username" name="login" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={teacher ? "Your teacher username" : "Your student username"} required /></label>
      <label htmlFor="login-credential">{teacher ? "Password" : "Private code"}<input id="login-credential" name="credential" type="password" autoComplete="current-password" placeholder={teacher ? "Enter your password" : "Enter your private code"} required /></label>
      <SubmitButton className="button primary full login-submit" pendingLabel="Signing in…">Sign in as {teacher ? "teacher" : "student"}<span aria-hidden="true">↗</span></SubmitButton>
      <p className="login-help">{teacher ? "Use the username and password for your teacher account." : "Use the username and private code shared by your teacher."}</p>
    </div>
  </ActionForm>;
}
