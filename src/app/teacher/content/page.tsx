import { activities, plans } from "@/content/catalog";
import { requireRole } from "@/lib/auth";
import { PageHeading, Badge } from "@/components/ui";

export default async function ContentPage() {
  await requireRole("TEACHER");
  return <><PageHeading eyebrow="Deployed content" title="Content catalog">New or changed content appears here after a code deployment. Preview it before assigning.</PageHeading>
    <section className="section"><h2>Activities</h2><div className="card-grid">{activities.map((item) => <article className="card" key={`${item.key}@${item.version}`}><div className="row-between"><Badge tone="blue">{item.subject === "MATH" ? "Math" : "English"}</Badge><small>Version {item.version}</small></div><h3>{item.title}</h3><p className="muted">{item.summary}</p><p className="hint">{item.questions.length} questions · {item.questions.reduce((sum, question) => sum + question.points, 0)} points</p><details><summary>Preview questions and answers</summary><ol className="preview-list">{item.questions.map((question) => <li key={question.id}><strong>{question.prompt}</strong><p>{question.explanation}</p></li>)}</ol></details></article>)}</div></section>
    <section className="section"><h2>Class plans</h2><div className="card-grid">{plans.map((plan) => <article className="card" key={`${plan.key}@${plan.version}`}><Badge tone="green">Class plan</Badge><h3>{plan.title}</h3><p className="muted">{plan.summary}</p><p className="hint">Version {plan.version}</p><details><summary>Preview plan</summary><h4>Math</h4><ul>{plan.math.map((item) => <li key={item}>{item}</li>)}</ul><h4>English</h4><ul>{plan.english.map((item) => <li key={item}>{item}</li>)}</ul></details></article>)}</div></section>
  </>;
}
