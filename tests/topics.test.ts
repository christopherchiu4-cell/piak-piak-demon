import assert from "node:assert/strict";
import test from "node:test";
import { topics, referenceBooks, getTopic, topicsForSubject } from "../src/content/topics";

test("topic library uses distinct IDs and valid reference metadata", () => {
  assert.equal(new Set(topics.map((item) => item.id)).size, topics.length);
  assert.equal(topicsForSubject("MATH").length, 8);
  assert.equal(topicsForSubject("ENGLISH").length, 5);
  assert.equal(new Set(referenceBooks.map((source) => source.file)).size, referenceBooks.length);
  for (const source of referenceBooks) assert.ok(source.file.endsWith(".pdf"));
  for (const topic of topics) for (const ref of topic.references) assert.ok(referenceBooks.some((book) => book.id === ref.sourceId));
});

test("every topic belongs to exactly one subject and is retrievable by id", () => {
  for (const topic of topics) {
    assert.equal(getTopic(topic.id), topic);
    assert.ok(topic.subject === "MATH" || topic.subject === "ENGLISH");
    assert.ok(topic.skills.length > 0, `${topic.id} has no skills to offer the block editor`);
  }
  assert.equal(getTopic("unknown"), undefined);
});
