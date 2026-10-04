# Writing a material CSV for Tutor Desk

A CSV creates **one** class plan or one homework. Each row is one block: a
heading, a paragraph, a reading passage, or a question. You upload it from
**Class plans → Import CSV** or **Homework → Import CSV**.

Title, summary and subject are typed into the upload form, so they do **not**
belong in the file. The import always creates something new — it never edits or
overwrites an existing plan or homework — and opens it in the editor so you can
check it before assigning.

## The two separators

- `|` separates **items** — the options of a question, the blanks in a sentence, the points in a rubric.
- `;` separates **alternatives within one item** — different spellings or forms that should all be marked correct.

Commas are *not* used for this. A comma inside a cell has to be wrapped in
quotes, and a forgotten quote is the single most common way one of these files
breaks. Use `;` and you never have to think about it.

## Mathematical notation

Tutor Desk renders KaTeX-compatible TeX in every heading, instruction, passage,
question, option, rubric and explanation:

- use `$...$` for inline notation, such as `$x^2 + 3x - 4 = 0$`;
- use `$$...$$` for display notation, such as `$$\frac{a}{b} = \frac{c}{d}$$`;
- write a literal dollar sign as `\$`;
- do not use a raw `|` inside TeX because CSV uses it to separate options,
  blanks and rubric points; use `\lvert`, `\rvert` or `\mid` instead.

Keep each `{{n}}` fill marker outside a math delimiter. For example, write
`Solve $x+3=7$. $x =$ {{1}}`, not `$x+3={{1}}$`. This lets the app preserve the
input field while rendering the surrounding notation correctly.

## Columns

The first row must be a header. Names are case-insensitive and may appear in any
order. Extra columns are ignored, and you are told which were skipped.

| Column | Used by | Meaning |
|---|---|---|
| `type` | every row | `heading`, `text`, `passage`, `mcq`, `short`, or `fill` |
| `text` | heading, text, passage | the heading words, the paragraph, or the passage body |
| `title` | passage | optional heading shown above the passage |
| `prompt` | mcq, short, fill | the question itself |
| `topic` | questions | what the question practises, e.g. `Estimating roots`. Drives the student's progress breakdown, so fill it in |
| `points` | questions | whole number, defaults to `1` |
| `options` | mcq | the choices, separated by `\|` |
| `correct` | mcq | the correct option's exact text, or its number (`1` is the first) |
| `accepted` | fill | one group per blank separated by `\|`; alternatives inside a blank separated by `;` |
| `case_sensitive` | fill | `yes` to require exact capitalisation. Defaults to no |
| `rubric` | short | what you look for when marking, separated by `\|` |
| `explanation` | questions | shown to the student after they submit |

## The block types

- **`heading`** — a section title. Put the words in `text`.
- **`text`** — a paragraph of instructions or lesson notes. Put it in `text`.
- **`passage`** — a reading extract. Body in `text`, optional `title`. It is
  pinned beside the questions while the student works, so one passage can serve
  several questions.
- **`mcq`** — multiple choice, exactly one right answer. Marked automatically.
- **`fill`** — fill in the blank. Write `{{1}}`, `{{2}}` in the `prompt` where
  the gaps go, and give one `accepted` group per gap in the same order. With no
  `{{n}}` markers the gap goes at the end. Marked automatically, with partial
  credit per blank. Numbers are compared as numbers, so `24` also accepts `24.0`.
- **`short`** — a written answer. **Not** marked automatically; it goes into the
  teacher's grading queue.

## A complete homework

```csv
type,prompt,text,title,topic,points,options,correct,accepted,rubric,explanation
heading,,Part A: number sense,,,,,,,,
text,,"Show your working on paper, then enter each answer.",,,,,,,,
mcq,What is the most specific set containing -12?,,,Number classification,1,Natural numbers|Whole numbers|Integers|Irrational numbers,Integers,,,-12 is an integer.
mcq,Between which whole numbers does the square root of 90 lie?,,,Estimating roots,1,8 and 9|9 and 10|10 and 11,2,,,81 < 90 < 100.
fill,Two plus two is {{1}} and three plus three is {{2}}.,,,Arithmetic,2,,,4;four|6;six,,Four and six.
short,Explain why not every square root is irrational.,,,Reasoning,3,,,,Identifies a rational example|Explains the counterexample,Root 36 is 6.
```

## A complete class plan

A class plan is usually prose, and may end with a question or two to work
through together.

```csv
type,prompt,text,title,topic,points,options,correct,accepted,rubric,explanation
heading,,This week: ratios and close reading,,,,,,,,
text,,"Two hours of Math, then one hour of English.",,,,,,,,
heading,,Math,,,,,,,,
text,,"Review equivalent ratios. Practise scaling recipes up and down.",,,,,,,,
heading,,English,,,,,,,,
text,,"Read the passage together and find one inference with evidence.",,,,,,,,
passage,,"The lighthouse stood alone on the point.

Nobody had lit it for thirty years.",The lighthouse,,,,,,,
short,What does the passage suggest about the town?,,,Inference,3,,,,Makes an inference|Quotes evidence,Neglect is implied.
```

## What gets rejected

The importer refuses the file outright if:

- the first row is not a header, or has no `type` column;
- the file is empty, or has nothing after the header;
- the file is larger than 500KB — split it into several sets.

Everything else is reported as a fixable problem, and the material is still
created as a draft so you can correct it in the editor. Common ones:

- a `type` that is not one of the six names;
- an `mcq` with fewer than two `options`;
- a `correct` value matching none of the options;
- a `fill` with no `accepted` answers;
- a `fill` whose `{{n}}` marker count differs from its number of `accepted` groups;
- a non-numeric `points` value, which falls back to `1`.

A homework cannot be assigned to a student until it has no problems left. The
editor shows a green **Ready to assign** badge when it is clean.

## Before you hand the file over

1. Every question row has a `topic` — progress tracking is useless without it.
2. Every `mcq` has at least two options and a `correct` that matches one exactly.
3. Every `fill` has as many `accepted` groups as it has `{{n}}` markers.
4. Any cell containing a comma or a line break is wrapped in double quotes.
5. `|` separates items, `;` separates alternatives — no commas used for either.
6. TeX delimiters are balanced, fill markers sit outside them, and TeX does not
   contain a raw `|` separator.
