import katex from "katex";

export type MathSegment =
  | { type: "text"; value: string }
  | { type: "math"; source: string; html: string; display: boolean };

const mathPattern = /(\$\$[\s\S]+?\$\$|(?<!\\)\$(?:\\.|[^$\n])+(?<!\\)\$)/g;

/** Parse $inline$ and $$display$$ TeX while leaving ordinary text untouched. */
export function mathSegments(value: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let cursor = 0;

  for (const match of value.matchAll(mathPattern)) {
    const start = match.index;
    if (start > cursor) segments.push({ type: "text", value: value.slice(cursor, start).replaceAll("\\$", "$") });

    const token = match[0];
    const display = token.startsWith("$$");
    const source = token.slice(display ? 2 : 1, display ? -2 : -1).trim();
    segments.push({
      type: "math",
      source,
      display,
      html: katex.renderToString(source, {
        displayMode: display,
        output: "htmlAndMathml",
        strict: "warn",
        throwOnError: false,
        trust: false,
      }),
    });
    cursor = start + token.length;
  }

  if (cursor < value.length) segments.push({ type: "text", value: value.slice(cursor).replaceAll("\\$", "$") });
  return segments.length ? segments : [{ type: "text", value: value.replaceAll("\\$", "$") }];
}
