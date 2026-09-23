export type SaveStatus = "idle" | "waiting" | "saving" | "saved" | "error" | "closed";

// Coalesce edits and serialize saves so a slow, older response cannot overwrite
// a newer one. Failed answers stay queued for an explicit retry.
export class AutosaveQueue {
  private answers = new Map<string, string>();
  private timer?: ReturnType<typeof setTimeout>;
  private running: Promise<void> | null = null;
  private disposed = false;

  constructor(
    private save: (questionId: string, answer: string) => Promise<{ saved: boolean }>,
    private notify: (status: SaveStatus) => void,
    private delay = 600,
  ) {}

  get hasPending() { return this.answers.size > 0 || this.running !== null; }

  enqueue(questionId: string, answer: string) {
    if (this.disposed) return;
    this.answers.set(questionId, answer);
    clearTimeout(this.timer);
    this.notify(this.running ? "saving" : "waiting");
    this.timer = setTimeout(() => { void this.flush(); }, this.delay);
  }

  flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.running) return this.running;
    if (this.disposed || !this.answers.size) return Promise.resolve();
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }

  private async drain() {
    this.notify("saving");
    while (this.answers.size && !this.disposed) {
      const [questionId, answer] = this.answers.entries().next().value!;
      this.answers.delete(questionId);
      try {
        const result = await this.save(questionId, answer);
        if (!result.saved) {
          this.answers.clear();
          if (!this.disposed) this.notify("closed");
          return;
        }
      } catch {
        if (!this.answers.has(questionId)) this.answers.set(questionId, answer);
        clearTimeout(this.timer);
        if (!this.disposed) this.notify("error");
        return;
      }
    }
    if (!this.disposed) this.notify("saved");
  }

  // Submission carries a full answer snapshot. Wait for the save already sent,
  // then let submission own the final write instead of sending queued drafts.
  async cancelPending() {
    clearTimeout(this.timer);
    this.answers.clear();
    await this.running;
    this.answers.clear();
  }

  finishPending() {
    // A route change must not discard the student's last debounced edits.
    // Complete them without sending state updates to an unmounted component.
    this.notify = () => {};
    return this.flush().finally(() => this.dispose());
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
    this.answers.clear();
  }
}
