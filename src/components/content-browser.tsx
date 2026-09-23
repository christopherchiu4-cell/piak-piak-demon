"use client";

import { useState } from "react";
import { topicsForSubject, referenceBooks, type Subject } from "@/content/topics";
import type { ActivityContent } from "@/content/schema";
import Link from "./pending-link";

export function ContentBrowser({ activities }: { activities: ActivityContent[] }) {
  const [subject, setSubject] = useState<Subject>("MATH");
  const [topic, setTopic] = useState("");
  const groups = topicsForSubject(subject).filter((item) => !topic || item.id === topic);
  return <>
    <div className="catalog-toolbar card"><div><p className="eyebrow">Your teaching library</p><h2>Find the right activity.</h2></div><div className="filter-pair"><label>Subject<select value={subject} onChange={(event) => { setSubject(event.target.value as Subject); setTopic(""); }}><option value="MATH">Mathematics</option><option value="ENGLISH">English</option></select></label><label>Topic<select value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">All topics</option>{topicsForSubject(subject).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div></div>
    <div className="topic-collection" key={`${subject}-${topic}`}>{groups.map((group) => {
      const matches = activities.filter((activity) => activity.topicIds.includes(group.id));
      return <details className="topic-folder" key={group.id} open={!!topic || matches.length > 0}>
        <summary><span className="folder-symbol" aria-hidden="true">{subject === "MATH" ? "∑" : "Aa"}</span><span className="folder-title"><strong>{group.title}</strong><small>{group.description}</small></span><span className="badge neutral">{matches.length} {matches.length === 1 ? "activity" : "activities"}</span></summary>
        <div className="folder-content"><div className="skill-tags">{group.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          {matches.length ? <div className="card-grid">{matches.map((activity) => <article className="activity-preview" key={`${activity.key}@${activity.version}`}><p className="eyebrow">{activity.questions.length} questions · {activity.questions.reduce((sum, q) => sum + q.points, 0)} points</p><h3>{activity.title}</h3><p className="muted">{activity.summary}</p><details className="question-preview"><summary>Preview questions & answers</summary>{activity.passage && <p className="preview-passage">{activity.passage}</p>}<ol>{activity.questions.map((question) => <li key={question.id}><strong>{question.prompt}</strong><p>{question.explanation}</p></li>)}</ol></details><Link className="small-link" href={`/teacher/assignments?subject=${subject}&topic=${group.id}`}>Assign from this topic →</Link></article>)}</div> : <p className="empty-topic">No activities yet. This topic is ready for your next lesson.</p>}
          {group.references.length > 0 && <details className="source-references"><summary>Textbook references</summary><ul>{group.references.map((reference) => <li key={reference.sourceId}><strong>{referenceBooks.find((book) => book.id === reference.sourceId)?.publisher}</strong> · {reference.chapters}</li>)}</ul></details>}
        </div>
      </details>;
    })}</div>
    <section className="section reference-library"><h2>{subject === "MATH" ? "Reference library" : "English topic framework"}</h2>{subject === "MATH" ? <div className="reference-grid">{referenceBooks.map((book) => <article className="card" key={book.id}><p className="eyebrow">{book.publisher}</p><h3>{book.title}</h3><p className="hint">Indexed by chapter for future activities.</p></article>)}</div> : <p className="muted">Reading, literature study, and writing topics are organised around your tutoring programme. English reference books can be added to this structure as they arrive.</p>}</section>
  </>;
}
