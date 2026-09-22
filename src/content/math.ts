import type { ActivityContent } from "./schema";

export const mathHomework: ActivityContent = {
  key: "numbers-foundations",
  version: 1,
  title: "Numbers: foundations",
  subject: "MATH",
  summary: "Number families, roots, factors, and mathematical reasoning.",
  instructions: "Work through each question. Use paper for your working. Written explanations will be reviewed by your tutor.",
  questions: [
    {
      id: "classify-negative-12", type: "choice", topic: "Number classification", points: 1,
      prompt: "What is the most specific number set that contains −12?",
      options: [
        { id: "natural", text: "Natural numbers" }, { id: "whole", text: "Whole numbers" },
        { id: "integer", text: "Integers" }, { id: "irrational", text: "Irrational numbers" },
      ],
      correctOptionId: "integer",
      explanation: "−12 is an integer. It can also be written as −12/1, so it is rational, but integer is the most specific correct choice.",
    },
    {
      id: "root-90", type: "choice", topic: "Estimating roots", points: 1,
      prompt: "Between which consecutive whole numbers does √90 lie?",
      options: [
        { id: "8-9", text: "8 and 9" }, { id: "9-10", text: "9 and 10" },
        { id: "10-11", text: "10 and 11" }, { id: "44-45", text: "44 and 45" },
      ],
      correctOptionId: "9-10",
      explanation: "9² = 81 and 10² = 100, so 9 < √90 < 10.",
    },
    {
      id: "number-line", type: "choice", topic: "Number lines", points: 1,
      prompt: "Which point on the number line represents −5/4?",
      numberLine: { min: -2, max: 0, ticks: [-2, -1.5, -1, -0.5, 0], points: [
        { label: "A", value: -1.75 }, { label: "B", value: -1.25 },
        { label: "C", value: -0.75 }, { label: "D", value: -0.25 },
      ] },
      options: [
        { id: "a", text: "A" }, { id: "b", text: "B" },
        { id: "c", text: "C" }, { id: "d", text: "D" },
      ],
      correctOptionId: "b",
      explanation: "−5 ÷ 4 = −1.25. Point B lies halfway between −1.5 and −1.",
    },
    {
      id: "sqrt-576", type: "number", topic: "Roots by prime factorisation", points: 1,
      prompt: "Given 576 = 2⁶ × 3², find √576.", acceptedAnswers: ["24"],
      explanation: "√(2⁶ × 3²) = 2³ × 3 = 24.",
    },
    {
      id: "square-roots-reasoning", type: "written", topic: "Mathematical reasoning", points: 3,
      prompt: "A student says, “Every square root is irrational.” Use √36 and √30 to explain why this is wrong.",
      rubric: ["Identify √36 = 6 as rational.", "Identify √30 as irrational.", "Explain why the examples disprove the claim."],
      explanation: "√36 = 6, which is rational. Since 30 is not a perfect square, √30 is irrational. A square-root symbol alone does not determine the number family.",
    },
  ],
};

export const mathClasswork: ActivityContent = {
  key: "factors-classwork",
  version: 1,
  title: "Factors and multiples in class",
  subject: "MATH",
  summary: "A short class activity on GCF and LCM.",
  instructions: "Show your working on paper, then enter your answers.",
  questions: [
    { id: "gcf-18-30", type: "number", topic: "GCF", points: 1,
      prompt: "Find the greatest common factor of 18 and 30.", acceptedAnswers: ["6"],
      explanation: "18 = 2 × 3² and 30 = 2 × 3 × 5. Their shared prime factors give 2 × 3 = 6." },
    { id: "lcm-8-12", type: "number", topic: "LCM", points: 1,
      prompt: "Find the least common multiple of 8 and 12.", acceptedAnswers: ["24"],
      explanation: "24 is the first positive number divisible by both 8 and 12." },
  ],
};
