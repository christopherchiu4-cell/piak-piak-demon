import { mathSegments } from "@/lib/math";

/** Renders TeX delimited by $...$ or $$...$$ with accessible KaTeX MathML. */
export function MathText({ children }: { children: string }) {
  return <>{mathSegments(children).map((segment, index) => segment.type === "text"
    ? segment.value
    : <span
        className={segment.display ? "math-display" : "math-inline"}
        dangerouslySetInnerHTML={{ __html: segment.html }}
        key={`${index}-${segment.source}`}
      />)}</>;
}
