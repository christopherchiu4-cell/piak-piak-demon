"use client";

import { useState } from "react";

function randomCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return [...bytes].map((value, index) => (index === 5 ? "-" : "") + alphabet[value % alphabet.length]).join("");
}

/** Access code input with a generator. Leaving it blank makes the server generate one. */
export function CodeField() {
  const [code, setCode] = useState("");
  return <div className="field">
    <label htmlFor="access-code">Access code</label>
    <div className="code-row">
      <input id="access-code" name="code" value={code} onChange={(event) => setCode(event.target.value)} minLength={8} autoComplete="off" spellCheck={false} placeholder="Leave blank to generate one" />
      <button type="button" className="button subtle" onClick={() => setCode(randomCode())}>Generate</button>
    </div>
    <p className="hint">Write it down now — you can look it up again from the student’s menu at any time.</p>
  </div>;
}
