/**
 * Minimal RFC 4180 reader. Hand-rolled because the project carries no CSV
 * dependency and a question file needs nothing beyond quoting and newlines.
 */
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  let index = 0;

  function endValue() { row.push(value); value = ""; }
  function endRow() {
    endValue();
    // A trailing newline produces one empty cell; that is not a row.
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    row = [];
  }

  while (index < input.length) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') { value += '"'; index += 2; continue; }
        quoted = false; index += 1; continue;
      }
      value += char; index += 1; continue;
    }
    if (char === '"') { quoted = true; index += 1; continue; }
    if (char === ",") { endValue(); index += 1; continue; }
    if (char === "\r") { index += 1; continue; }
    if (char === "\n") { endRow(); index += 1; continue; }
    value += char; index += 1;
  }
  endRow();
  return rows;
}
