import assert from "node:assert/strict";
import test from "node:test";
import { AutosaveQueue, type SaveStatus } from "../src/lib/autosave";

test("rapid edits debounce to the latest answer", async () => {
  const writes: string[] = [];
  const queue = new AutosaveQueue(async (_id, answer) => { writes.push(answer); return { saved: true }; }, () => {}, 15);
  queue.enqueue("q1", "a");
  queue.enqueue("q1", "ab");
  queue.enqueue("q1", "abc");
  assert.deepEqual(writes, []);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.deepEqual(writes, ["abc"]);
  assert.equal(queue.hasPending, false);
  queue.dispose();
});

test("slow saves are serialized and newer edits win", async () => {
  const writes: string[] = [];
  const states: SaveStatus[] = [];
  let release!: () => void;
  const slow = new Promise<void>((resolve) => { release = resolve; });
  const queue = new AutosaveQueue(async (_id, answer) => {
    writes.push(answer);
    if (answer === "old") await slow;
    return { saved: true };
  }, (state) => states.push(state));
  queue.enqueue("q1", "old");
  const running = queue.flush();
  queue.enqueue("q1", "intermediate");
  queue.enqueue("q1", "latest");
  assert.deepEqual(writes, ["old"]);
  assert.equal(states.includes("saved"), false);
  release();
  await running;
  assert.deepEqual(writes, ["old", "latest"]);
  assert.equal(states.at(-1), "saved");
  queue.dispose();
});

test("save failure retains changes and supports retry", async () => {
  let fail = true;
  const states: SaveStatus[] = [];
  const writes: string[] = [];
  const queue = new AutosaveQueue(async (_id, answer) => {
    if (fail) throw new Error("offline");
    writes.push(answer);
    return { saved: true };
  }, (state) => states.push(state));
  queue.enqueue("q1", "draft");
  await queue.flush();
  assert.equal(states.at(-1), "error");
  assert.equal(queue.hasPending, true);
  fail = false;
  await queue.flush();
  assert.deepEqual(writes, ["draft"]);
  assert.equal(queue.hasPending, false);
  queue.dispose();
});

test("submission waits for the active save and cancels queued drafts", async () => {
  const writes: string[] = [];
  let release!: () => void;
  const slow = new Promise<void>((resolve) => { release = resolve; });
  const queue = new AutosaveQueue(async (_id, answer) => { writes.push(answer); await slow; return { saved: true }; }, () => {});
  queue.enqueue("q1", "old");
  void queue.flush();
  queue.enqueue("q1", "latest");
  let ready = false;
  const submission = queue.cancelPending().then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(ready, false);
  release();
  await submission;
  assert.deepEqual(writes, ["old"]);
  assert.equal(queue.hasPending, false);
  queue.dispose();
});

test("leaving the page flushes debounced edits without notifying unmounted UI", async () => {
  const writes: string[] = [];
  const states: SaveStatus[] = [];
  const queue = new AutosaveQueue(async (_id, answer) => { writes.push(answer); return { saved: true }; }, (state) => states.push(state));
  queue.enqueue("q1", "last edit");
  queue.enqueue("q2", "another edit");
  const priorStates = [...states];
  await queue.finishPending();
  assert.deepEqual(writes, ["last edit", "another edit"]);
  assert.deepEqual(states, priorStates);
  assert.equal(queue.hasPending, false);
});
