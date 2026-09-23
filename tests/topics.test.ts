import assert from "node:assert/strict";
import test from "node:test";
import { activities } from "../src/content/catalog";
import { topics, referenceBooks, getTopic, topicsForSubject } from "../src/content/topics";
import { validateActivity } from "../src/content/schema";

test("topic library uses distinct IDs and valid reference metadata", () => {
  assert.equal(new Set(topics.map((item) => item.id)).size, topics.length);
  assert.equal(topicsForSubject("MATH").length, 8);
  assert.equal(topicsForSubject("ENGLISH").length, 5);
  assert.equal(new Set(referenceBooks.map((source) => source.file)).size, referenceBooks.length);
  for (const source of referenceBooks) assert.ok(source.file.endsWith(".pdf"));
  for (const topic of topics) for (const ref of topic.references) assert.ok(referenceBooks.some((book) => book.id === ref.sourceId));
});

test("all published activities appear under a topic for the correct subject", () => {
  for (const activity of activities) {
    assert.ok(activity.topicIds.length);
    for (const topic of activity.topicIds) assert.equal(getTopic(topic)?.subject, activity.subject);
  }
});

test("invalid or cross-subject activity tags are rejected", () => {
  const math = activities.find((item) => item.subject === "MATH")!;
  assert.throws(() => validateActivity({ ...math, topicIds: [] }));
  assert.throws(() => validateActivity({ ...math, topicIds: ["unknown"] }));
  assert.throws(() => validateActivity({ ...math, topicIds: ["english-reading"] }));
  assert.throws(() => validateActivity({ ...math, topicIds: ["math-number", "math-number"] }));
});
