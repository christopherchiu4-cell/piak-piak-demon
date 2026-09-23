import { ContentBrowser } from "@/components/content-browser";
import { activities, plans } from "@/content/catalog";
import { requireRole } from "@/lib/auth";
import { PageHeading, Badge } from "@/components/ui";

export default async function ContentPage() {
  await requireRole("TEACHER");
  return <><PageHeading eyebrow="Plan with purpose" title="Your teaching library">Browse by subject and topic. Preview activities, explore textbook references, and choose what comes next.</PageHeading>
    <ContentBrowser activities={activities} />
    <section className="section"><h2>Class plans</h2><div className="card-grid">{plans.map((plan) => <article className="card" key={`${plan.key}@${plan.version}`}><Badge tone="green">Class plan</Badge><h3>{plan.title}</h3><p className="muted">{plan.summary}</p><p className="hint">Version {plan.version}</p><details><summary>Preview plan</summary><h4>Math</h4><ul>{plan.math.map((item) => <li key={item}>{item}</li>)}</ul><h4>English</h4><ul>{plan.english.map((item) => <li key={item}>{item}</li>)}</ul></details></article>)}</div></section>
  </>;
}
