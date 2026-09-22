import type { ActivityContent } from "./schema";

export const englishReading: ActivityContent = {
  key: "reading-inference",
  version: 1,
  title: "Reading: evidence and inference",
  subject: "ENGLISH",
  summary: "Read a short passage and support an inference with evidence.",
  instructions: "Read the passage carefully. Use details from the text in your written answer.",
  passage: "Mara reached the library just as the rain began. She shook her umbrella by the door, then saw the empty display table where the town's old map had been. A small card remained: 'On loan for restoration.' Mara checked the return date twice. The history exhibition opened tomorrow, and she had promised to show the map to her grandfather. She took out her notebook and began listing other places she might find a copy.",
  questions: [
    { id: "map-location", type: "choice", topic: "Literal comprehension", points: 1,
      prompt: "Why is the old map missing from the display table?",
      options: [
        { id: "sold", text: "It was sold." }, { id: "restoration", text: "It is being restored." },
        { id: "lost", text: "It was lost." }, { id: "grandfather", text: "Her grandfather borrowed it." },
      ], correctOptionId: "restoration",
      explanation: "The card says the map is ‘On loan for restoration.’" },
    { id: "mara-feeling", type: "written", topic: "Inference and evidence", points: 4,
      prompt: "What does Mara's response suggest about her character? Support your idea with two details from the passage.",
      rubric: ["Make a plausible inference about Mara.", "Use one relevant detail.", "Use a second relevant detail.", "Explain how the details support the inference."],
      explanation: "Mara seems determined and resourceful. Although the map is unavailable, she checks its return date and immediately lists other places where she might find a copy." },
  ],
};

export const englishWriting: ActivityContent = {
  key: "persuasive-library",
  version: 1,
  title: "Persuasive writing: library hours",
  subject: "ENGLISH",
  summary: "Write a short argument with evidence and a counterargument.",
  instructions: "Write a persuasive response in paragraphs. Plan your argument before you begin.",
  questions: [
    { id: "persuasive-response", type: "written", topic: "Persuasive writing", points: 10,
      prompt: "Should the local library stay open later on school days? Write a persuasive response for the library manager.",
      rubric: ["Clear position and audience awareness.", "Reasons with specific supporting details.", "A considered counterargument and response.", "Logical paragraphs and effective conclusion.", "Clear sentences, spelling, and punctuation."],
      explanation: "A strong response states a position, supports it with specific reasons, addresses a possible objection, and closes with a clear request to the manager." },
  ],
};
