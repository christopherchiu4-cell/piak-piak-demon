# Teaching reference library

These local textbooks are sources for future question generation. Their contents pages have been reviewed and indexed; individual exercises have not been imported into the app. PDFs remain local reference material and are not served to students or stored in PostgreSQL.

## Verified sources

| Source ID | Local file | Evidence reviewed |
| --- | --- | --- |
| `haese-myp2` | Mathematics 7 MYP2 [BCIS Using].pdf | 496 PDF pages. Haese & Harris, Mathematics for the International Student 7 (MYP 2), 2008. Contents: PDF pages 6–8. |
| `pearson-myp2` | Mathematics for the MYP Year 2 - Pearson 2021.pdf | 448 PDF pages. Pearson, Mathematics for the IB Middle Years Programme, Year 2, 2021. Contents/course structure: PDF pages 3–5. |
| `oxford-myp2` | Mathematics - 2 - Weber, Kunkel, Martinez and Shultis - Second Edition - Oxford 2021.pdf | 338 scanned PDF pages. Contents visually checked on PDF page 4. The filename says 2021/second edition, but the included copyright page (PDF page 3) says 2018. Use the actual local copy when locating exercises. |

No separate Edexcel textbook or English textbook was present when this index was created. Pearson is recorded under the publisher shown inside the supplied book.

## Chapter map

| App topic ID | Haese chapters | Pearson chapters | Oxford chapters (printed opening page) |
| --- | --- | --- | --- |
| `math-number` | 1, 3, 4, 6 | 1, number review | 3, Integers (90) |
| `math-ratio` | 7, 12, 22 | 2 | 1, Ratios and proportions (4); 6, Rates (226) |
| `math-algebra` | 5, 8, 10, 13, 16, 23 | 3–4 | 4, Algebraic expressions and equations (140) |
| `math-graphs` | 12, 17 | 5 | No separate chapter indexed |
| `math-geometry` | 2, 14–15 | 6, 8 | 5, 2D and 3D geometry (186) |
| `math-measurement` | 9, 11, 18 | 7, 9 | 5, 2D and 3D geometry (186) |
| `math-statistics` | 20 | 10 | 7, Univariate data (258) |
| `math-probability` | 19, 21 | 1 (sets review), 11 | 2, Probability (44) |

The canonical topic IDs, labels, skills, and source references live in `src/content/topics.ts`. The UI derives its dropdowns and topic folders from that file.

## Future content workflow

1. Select a subject, topic ID, skill, difficulty, and question count from the teaching request.
2. Consult the mapped textbook chapters. Read/render the relevant pages before using their exercises or citing specific page numbers. The Oxford scan needs visual inspection or OCR.
3. Create and check the requested activity in `src/content/`, with at least one `topicIds` entry. Record any specific source chapter/page used in the author's notes; do not claim an exercise was checked from the contents page alone.
4. Preserve every existing published question and version. Add a new version for changes to prompts, answers, passages, or scoring. Topic classification metadata can be refined separately.
5. Register the activity in the catalog, validate, preview, and deploy. The teacher then chooses Subject → Topic → Activity.

English starts with a tutor-defined framework: `english-reading`, `english-literature`, `english-persuasion`, `english-creative`, and `english-language`. The initial priorities are comprehension, book-study responses, and persuasive writing. Add references to these groups when English source material is supplied.
