import type { ActivityContent, Question } from "@/content/schema";

export function gradeQuestion(question: Question, answer: string): number | null {
  const value = answer.trim();
  if (!value) return 0;
  if (question.type === "written") return null;
  if (question.type === "choice") return value === question.correctOptionId ? question.points : 0;
  const numeric = Number(value.replace("−", "-"));
  if (!Number.isFinite(numeric)) return 0;
  return question.acceptedAnswers.some((accepted) => Number(accepted) === numeric) ? question.points : 0;
}

export type PublicQuestion = {
  id: string; type: Question["type"]; topic: string; prompt: string; points: number;
  options?: Array<{ id: string; text: string }>;
  numberLine?: { min: number; max: number; ticks: number[]; points: Array<{ label: string; value: number }> };
};

export type StudentActivity = {
  key: string; version: number; title: string; subject: ActivityContent["subject"];
  summary: string; instructions: string; passage?: string; questions: PublicQuestion[];
};

export function studentActivity(activity: ActivityContent): StudentActivity {
  return {
    key: activity.key, version: activity.version, title: activity.title,
    subject: activity.subject, summary: activity.summary,
    instructions: activity.instructions, passage: activity.passage,
    questions: activity.questions.map((question) => ({
      id: question.id, type: question.type, topic: question.topic,
      prompt: question.prompt, points: question.points,
      ...(question.type === "choice" ? { options: question.options, numberLine: question.numberLine } : {}),
    })),
  };
}

export function summaryByTopic(activity: ActivityContent, responses: Array<{ questionId: string; score: number | null }>) {
  const byId = new Map(responses.map((response) => [response.questionId, response]));
  const topics = new Map<string, { topic: string; earned: number; total: number; pending: number }>();
  for (const question of activity.questions) {
    const row = topics.get(question.topic) ?? { topic: question.topic, earned: 0, total: 0, pending: 0 };
    const score = byId.get(question.id)?.score;
    row.total += question.points;
    if (score == null) row.pending += question.points;
    else row.earned += score;
    topics.set(question.topic, row);
  }
  return [...topics.values()];
}
