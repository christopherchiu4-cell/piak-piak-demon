import type { PlanContent } from "./schema";

export const numbersAndReadingPlan: PlanContent = {
  key: "numbers-and-reading",
  version: 1,
  title: "Numbers and reading inference",
  summary: "A three-hour tutoring session: two hours of Math and one hour of English.",
  preparation: ["Bring your Math notebook.", "Read the class plan before the lesson."],
  math: ["Review number families and rational versus irrational numbers.", "Use number lines to compare negative values.", "Practise GCF, LCM, and estimating roots."],
  english: ["Read a short passage closely.", "Make an inference and support it with text evidence."],
};
