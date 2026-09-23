import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { currentUser } from "@/lib/auth";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; role?: string }> }) {
  const user = await currentUser();
  if (user) redirect(user.role === "TEACHER" ? "/teacher" : "/student");
  const query = await searchParams;
  const role = query.role === "teacher" ? "TEACHER" : "STUDENT";
  return <main className="login-page">
    <div className="login-brand"><span className="brand-icon">∑</span><span>Tutor Desk</span></div>
    <div className="login-layout">
      <section className="login-story"><p className="eyebrow">A little practice. A lot of possibility.</p><h1>Small steps.<br /><em>Brighter minds.</em></h1><p className="login-description">A space to explore ideas, build confidence, and make progress. One lesson at a time.</p>
        <div className="study-illustration" aria-hidden="true"><div className="study-orbit" /><div className="study-math"><span>01 / MATH</span><strong>Every problem<br />has a way in.</strong><div className="study-equation">x² + curiosity</div><div className="study-rule" /></div><div className="study-english"><span>02 / ENGLISH</span><strong>Find your<br /><em>own voice.</em></strong><div className="study-lines"><i /><i /><i /></div></div><span className="study-spark">✳</span></div>
        <p className="login-story-footer"><span />Math & English, with room to grow.</p>
      </section>
      <section className="login-card"><LoginForm key={`${role}-${query.error ?? ""}`} initialRole={role} error={!!query.error} /></section>
    </div>
    <footer className="login-footer">Your next chapter starts here.</footer>
  </main>;
}
