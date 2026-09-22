import { z } from "zod";

const baseQuestion = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  prompt: z.string().min(1),
  points: z.number().int().positive(),
  explanation: z.string().min(1),
});

const numberLine = z.object({
  min: z.number(),
  max: z.number(),
  ticks: z.array(z.number()),
  points: z.array(z.object({ label: z.string(), value: z.number() })),
});

export const questionSchema = z.discriminatedUnion("type", [
  baseQuestion.extend({
    type: z.literal("choice"),
    options: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
    correctOptionId: z.string(),
    numberLine: numberLine.optional(),
  }),
  baseQuestion.extend({
    type: z.literal("number"),
    acceptedAnswers: z.array(z.string()).min(1),
  }),
  baseQuestion.extend({
    type: z.literal("written"),
    rubric: z.array(z.string()).min(1),
  }),
]);

export const activitySchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  version: z.number().int().positive(),
  title: z.string().min(1),
  subject: z.enum(["MATH", "ENGLISH"]),
  summary: z.string().min(1),
  instructions: z.string().min(1),
  passage: z.string().optional(),
  questions: z.array(questionSchema).min(1),
});

export const planSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  version: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string().min(1),
  math: z.array(z.string()).min(1),
  english: z.array(z.string()).min(1),
  preparation: z.array(z.string()),
});

export type Question = z.infer<typeof questionSchema>;
export type ActivityContent = z.infer<typeof activitySchema>;
export type PlanContent = z.infer<typeof planSchema>;

export function validateActivity(value: unknown): ActivityContent {
  const activity = activitySchema.parse(value);
  const ids = new Set<string>();
  for (const question of activity.questions) {
    if (ids.has(question.id)) throw new Error(`Duplicate question ID: ${question.id}`);
    ids.add(question.id);
    if (question.type === "choice" && !question.options.some((option) => option.id === question.correctOptionId)) {
      throw new Error(`Missing correct option for ${question.id}`);
    }
    if (question.type === "choice" && new Set(question.options.map((option) => option.id)).size !== question.options.length) {
      throw new Error(`Duplicate options for ${question.id}`);
    }
    if (question.type === "choice" && question.numberLine && question.numberLine.min >= question.numberLine.max) {
      throw new Error(`Invalid number line for ${question.id}`);
    }
  }
  return activity;
}
