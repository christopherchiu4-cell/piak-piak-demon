import { englishReading, englishWriting } from "./english";
import { mathClasswork, mathHomework } from "./math";
import { numbersAndReadingPlan } from "./plans";
import { planSchema, validateActivity } from "./schema";

export const activities = [mathHomework, mathClasswork, englishReading, englishWriting].map(validateActivity);
export const plans = [numbersAndReadingPlan].map((item) => planSchema.parse(item));

export function activityId(key: string, version: number) { return `${key}@${version}`; }
export function getActivity(key: string, version: number) {
  return activities.find((item) => item.key === key && item.version === version);
}
export function getPlan(key: string, version: number) {
  return plans.find((item) => item.key === key && item.version === version);
}
