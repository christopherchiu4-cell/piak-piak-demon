# Content authoring

Read `../../context/README.md` before generating new Math or English activities. It indexes the user's local textbooks and explains how to find relevant chapters.

- Use topic IDs from `topics.ts` and include `topicIds` in every activity. Keep topics consistent across publishers. Add a topic centrally if genuinely needed.
- Keep per-question `topic` labels specific enough for skill-level progress reports.
- Read the relevant source pages before creating source-based exercises. Textbook contents pages establish broad coverage, not the details or answers of individual exercises.
- Preserve existing published question content and versions; add new versions for instructional changes. Register new activities in `catalog.ts`.
- Keep full textbooks local in `context/`; do not bundle them into student pages. No uploads or object storage are part of this app.
- Keep answer keys and explanations out of the active student payload. Written work uses an explicit rubric and teacher review.
- Add reading passages as text in `passage`, with paragraphs separated by blank lines. The student reading panel handles its own scrolling.
- Run content validation tests and a production build after adding content.
