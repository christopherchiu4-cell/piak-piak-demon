"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { topics } from "@/content/topics";

type Subject = "MATH" | "ENGLISH";

/**
 * The editor is otherwise stateless, but subject has to be reactive: both the
 * topic checkboxes and every per-question topic suggestion depend on it, and a
 * server-rendered `defaultValue` cannot update either when the select changes.
 *
 * The provider wraps the whole form so question blocks — which are server
 * rendered and sit far below the Details card — still see the live value.
 */
const SubjectContext = createContext<{ subject: Subject; setSubject: (value: Subject) => void }>({
  subject: "MATH", setSubject: () => {},
});

export function SubjectProvider({ initial, children }: { initial: Subject; children: ReactNode }) {
  const [subject, setSubject] = useState<Subject>(initial);
  return <SubjectContext.Provider value={{ subject, setSubject }}>{children}</SubjectContext.Provider>;
}

/** Subject select plus the topic checkboxes it filters, kept in sync. */
export function SubjectField({ selectedTopicIds }: { selectedTopicIds: string[] }) {
  const { subject, setSubject } = useContext(SubjectContext);
  const available = topics.filter((topic) => topic.subject === subject);
  const dropped = selectedTopicIds.filter((id) => !available.some((topic) => topic.id === id));

  return <>
    <label className="field">Subject
      <select name="subject" value={subject} onChange={(event) => setSubject(event.target.value as Subject)}>
        <option value="MATH">Math</option>
        <option value="ENGLISH">English</option>
      </select>
    </label>
    <fieldset className="option-list"><legend>Topics covered</legend>
      <div className="topic-checks">{available.map((topic) => <label className="checkbox-field" key={topic.id}>
        <input type="checkbox" name="topicIds" value={topic.id} defaultChecked={selectedTopicIds.includes(topic.id)} /> {topic.title}
      </label>)}</div>
      {dropped.length > 0 && <p className="hint">{dropped.length} topic{dropped.length === 1 ? "" : "s"} from the other subject will be cleared when you save.</p>}
    </fieldset>
  </>;
}

/** Both lists render once; the input points at whichever matches the live subject. */
export function TopicSuggestions() {
  return <>{(["MATH", "ENGLISH"] as Subject[]).map((subject) => <datalist id={`topics-${subject}`} key={subject}>
    {topics.filter((topic) => topic.subject === subject).flatMap((topic) => topic.skills.map((skill) => <option key={`${topic.id}-${skill}`} value={skill} />))}
  </datalist>)}</>;
}

export function TopicInput({ name, defaultValue }: { name: string; defaultValue: string }) {
  const { subject } = useContext(SubjectContext);
  return <input name={name} defaultValue={defaultValue} list={`topics-${subject}`} placeholder="e.g. Estimating roots" />;
}
