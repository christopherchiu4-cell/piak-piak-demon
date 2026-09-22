import { redirect } from "next/navigation";
import { signIn } from "@/app/actions/auth";
import { currentUser } from "@/lib/auth";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (user) redirect(user.role === "TEACHER" ? "/teacher" : "/student");
  const error = (await searchParams).error;
  return <main className="login-wrap">
    <div className="login-intro"><span className="brand-icon">∑</span><p className="eyebrow">Tutor Desk</p><h1>Learning, all in one place.</h1><p>Class plans, practice, feedback, and progress for Math and English.</p></div>
    <div className="login-grid">
      {error && <p className="alert" role="alert">The login or code was not accepted. Please try again.</p>}
      <form action={signIn} className="card login-card"><input type="hidden" name="role" value="STUDENT" /><p className="eyebrow">Student portal</p><h2>Welcome back</h2><p className="muted">Open your plans, classwork, and homework.</p><label>Username<input name="login" autoComplete="username" required /></label><label>Private code<input name="credential" type="password" autoComplete="current-password" required /></label><button className="button primary" type="submit">Sign in as student</button></form>
      <form action={signIn} className="card login-card"><input type="hidden" name="role" value="TEACHER" /><p className="eyebrow">Teacher portal</p><h2>Manage tutoring</h2><p className="muted">Plan lessons, assign work, and review results.</p><label>Email<input name="login" type="email" autoComplete="username" required /></label><label>Password<input name="credential" type="password" autoComplete="current-password" required /></label><button className="button secondary" type="submit">Sign in as teacher</button></form>
    </div>
  </main>;
}
