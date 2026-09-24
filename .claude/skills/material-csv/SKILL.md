---
name: material-csv
description: Write a CSV that Tutor Desk can import as a class plan or homework. Use when asked to create, draft or convert tutoring questions, a worksheet, a lesson plan or a homework set for this portal, or whenever a "material CSV" is mentioned.
---

# Writing a material CSV

The format is documented in `docs/material-csv.md` in this repository. **Read that
file first** — it is the single source of truth for the columns, the `|` and `;`
separators, and the rules that cause a row to be rejected. Do not rely on memory
of the format; it changes with the app.

## How to work

1. Read `docs/material-csv.md`.
2. Ask the user what you do not know, in one go:
   - class plan or homework?
   - subject, and the student's level or year?
   - the topic, and roughly how many questions?
   - anything to avoid, or a passage they want used?
3. Write the file. Prefer a mix: a short `text` instruction, then questions that
   build in difficulty. Reading work should open with a `passage` block so the
   text stays pinned beside the questions.
4. Save it as a `.csv` next to wherever the user asked, and tell them to upload it
   from **Homework → Import CSV** or **Class plans → Import CSV**.

## Self-check before handing it over

Run through the checklist at the end of `docs/material-csv.md`. In particular:

- every question row has a `topic`, or the student's progress breakdown is empty;
- every `mcq` has two or more `options` and a `correct` that matches one exactly
  (by its text, or by its 1-based number);
- every `fill` has exactly as many `accepted` groups as `{{n}}` markers;
- cells containing a comma or a newline are wrapped in double quotes;
- `|` separates items and `;` separates alternatives — never a comma for either.

## Writing good questions

- `short` answers are marked by hand, so use them where reasoning matters and
  keep them few. `mcq` and `fill` mark themselves.
- Give every question an `explanation`. The student sees it immediately after
  submitting, so it is the main teaching moment in a homework.
- For `fill`, list the forms a student might reasonably write: `4;four`. Numbers
  are already compared numerically, so `24` also accepts `24.0`.
