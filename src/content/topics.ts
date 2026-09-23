export type Subject = "MATH" | "ENGLISH";
export type Topic = {
  id: string;
  subject: Subject;
  title: string;
  description: string;
  skills: string[];
  references: Array<{ sourceId: string; chapters: string }>;
};

export const referenceBooks = [
  { id: "haese-myp2", title: "Mathematics for the International Student 7 (MYP 2)", publisher: "Haese & Harris", year: "2008", file: "Mathematics 7 MYP2 [BCIS Using].pdf", contentsPages: "PDF pages 6–8", note: "BCIS reference. Contents and publication details verified." },
  { id: "pearson-myp2", title: "Mathematics for the IB Middle Years Programme, Year 2", publisher: "Pearson", year: "2021", file: "Mathematics for the MYP Year 2 - Pearson 2021.pdf", contentsPages: "PDF pages 3–5", note: "Contents and course structure verified." },
  { id: "oxford-myp2", title: "MYP Mathematics 2", publisher: "Oxford", year: "2018 (copyright page)", file: "Mathematics - 2 - Weber, Kunkel, Martinez and Shultis - Second Edition - Oxford 2021.pdf", contentsPages: "PDF page 4", note: "Scanned PDF. Contents visually verified; filename says 2021, while the included copyright page says 2018." },
];

export const topics: Topic[] = [
  { id: "math-number", subject: "MATH", title: "Number & arithmetic", description: "Build confidence with numbers and how they work.", skills: ["Number sets and integers", "Factors, multiples, GCF and LCM", "Powers and roots", "Fractions and decimals", "Estimation and order of operations"], references: [{ sourceId: "haese-myp2", chapters: "Chapters 1, 3, 4, 6" }, { sourceId: "pearson-myp2", chapters: "Chapter 1: number review" }, { sourceId: "oxford-myp2", chapters: "Chapter 3: integers, printed p. 90" }] },
  { id: "math-ratio", subject: "MATH", title: "Ratio, percentages & rates", description: "Compare quantities and solve proportional problems.", skills: ["Equivalent ratios and proportion", "Percentage change", "Scale drawings", "Unit rates and speed", "Financial applications"], references: [{ sourceId: "haese-myp2", chapters: "Chapters 7, 12, 22" }, { sourceId: "pearson-myp2", chapters: "Chapter 2" }, { sourceId: "oxford-myp2", chapters: "Chapters 1 and 6, printed pp. 4 and 226" }] },
  { id: "math-algebra", subject: "MATH", title: "Algebra & patterns", description: "Find patterns, express relationships, and solve unknowns.", skills: ["Sequences and patterns", "Expressions and substitution", "Expansion and factorisation", "Equations and inequalities", "Formulae and algebraic fractions"], references: [{ sourceId: "haese-myp2", chapters: "Chapters 5, 8, 10, 13, 16, 23" }, { sourceId: "pearson-myp2", chapters: "Chapters 3–4" }, { sourceId: "oxford-myp2", chapters: "Chapter 4, printed p. 140" }] },
  { id: "math-graphs", subject: "MATH", title: "Coordinates & graphs", description: "Represent and interpret relationships visually.", skills: ["Cartesian coordinates", "Linear graphs", "Gradient", "Travel and conversion graphs"], references: [{ sourceId: "haese-myp2", chapters: "Chapters 12 and 17" }, { sourceId: "pearson-myp2", chapters: "Chapter 5" }] },
  { id: "math-geometry", subject: "MATH", title: "Geometry & reasoning", description: "Explore shapes and explain why their properties hold.", skills: ["Angles and parallel lines", "Triangles and polygons", "Congruence and constructions", "Solids and nets", "Geometric reasoning"], references: [{ sourceId: "haese-myp2", chapters: "Chapters 2, 14–15" }, { sourceId: "pearson-myp2", chapters: "Chapters 6 and 8" }, { sourceId: "oxford-myp2", chapters: "Chapter 5, printed p. 186" }] },
  { id: "math-measurement", subject: "MATH", title: "Measurement", description: "Measure the world in two and three dimensions.", skills: ["Units and conversions", "Perimeter and area", "Circles and circumference", "Surface area and volume", "Capacity, mass and time"], references: [{ sourceId: "haese-myp2", chapters: "Chapters 9, 11, 18" }, { sourceId: "pearson-myp2", chapters: "Chapters 7 and 9" }, { sourceId: "oxford-myp2", chapters: "Chapter 5, printed p. 186" }] },
  { id: "math-statistics", subject: "MATH", title: "Statistics & data", description: "Collect, describe, and make sense of data.", skills: ["Surveys and sampling", "Tables and charts", "Mean, median and mode", "Spread and comparing distributions"], references: [{ sourceId: "haese-myp2", chapters: "Chapter 20" }, { sourceId: "pearson-myp2", chapters: "Chapter 10" }, { sourceId: "oxford-myp2", chapters: "Chapter 7, printed p. 258" }] },
  { id: "math-probability", subject: "MATH", title: "Probability & sets", description: "Reason about chance, outcomes, and overlapping groups.", skills: ["Probability language and scale", "Experimental and theoretical probability", "Sample spaces and tree diagrams", "Sets and Venn diagrams"], references: [{ sourceId: "haese-myp2", chapters: "Chapters 19 and 21" }, { sourceId: "pearson-myp2", chapters: "Chapters 1 and 11" }, { sourceId: "oxford-myp2", chapters: "Chapter 2, printed p. 44" }] },
  { id: "english-reading", subject: "ENGLISH", title: "Reading comprehension", description: "Read closely and support interpretations with evidence.", skills: ["Literal understanding", "Inference and evidence", "Vocabulary in context", "Main ideas and summary", "Purpose, tone and viewpoint"], references: [] },
  { id: "english-literature", subject: "ENGLISH", title: "Literature & book study", description: "Explore how stories work and write thoughtful responses.", skills: ["Character and relationships", "Theme and setting", "Plot and narrative perspective", "Language and imagery", "Literature response paragraphs"], references: [] },
  { id: "english-persuasion", subject: "ENGLISH", title: "Persuasive writing", description: "Develop a convincing argument for a clear audience.", skills: ["Claims and supporting evidence", "Audience and purpose", "Counterarguments", "Persuasive techniques", "Structure and conclusions"], references: [] },
  { id: "english-creative", subject: "ENGLISH", title: "Creative & descriptive writing", description: "Use detail, structure, and voice to shape original writing.", skills: ["Planning and narrative structure", "Description and imagery", "Dialogue and character voice", "Drafting and revision"], references: [] },
  { id: "english-language", subject: "ENGLISH", title: "Language & editing", description: "Make writing clear, accurate, and purposeful.", skills: ["Sentence structure", "Grammar and punctuation", "Vocabulary and word choice", "Paragraph cohesion", "Proofreading"], references: [] },
];

export function getTopic(id: string) { return topics.find((topic) => topic.id === id); }
export function topicsForSubject(subject: Subject) { return topics.filter((topic) => topic.subject === subject); }
