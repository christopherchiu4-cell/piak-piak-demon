"use client";

import { useState } from "react";
import { topicsForSubject, type Subject } from "@/content/topics";

export type ActivityOption = { key: string; version: number; title: string; subject: Subject; topicIds: string[]; questionCount: number };

export function ContentPicker({ activities, initialSubject = "MATH", initialTopic = "" }: { activities: ActivityOption[]; initialSubject?: Subject; initialTopic?: string }) {
  const [subject, setSubject] = useState<Subject>(initialSubject);
  const [topic, setTopic] = useState(topicsForSubject(initialSubject).some((item) => item.id === initialTopic) ? initialTopic : "");
  const choices = activities.filter((item) => item.subject === subject && (!topic || item.topicIds.includes(topic)));
  return <>
    <div className="filter-pair"><label>Subject<select value={subject} onChange={(event) => { setSubject(event.target.value as Subject); setTopic(""); }}><option value="MATH">Mathematics</option><option value="ENGLISH">English</option></select></label>
      <label>Topic<select value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">All topics</option>{topicsForSubject(subject).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
    <label>Activity<select name="content" required key={`${subject}-${topic}`} defaultValue=""><option value="" disabled>{choices.length ? "Choose an activity" : "No activities in this topic yet"}</option>{choices.map((item) => <option key={`${item.key}@${item.version}`} value={`${item.key}@${item.version}`}>{item.title} · {item.questionCount} questions · v{item.version}</option>)}</select></label>
    {!choices.length && <p className="hint">This topic is ready for new activities. Choose another topic to assign existing work.</p>}
  </>;
}
